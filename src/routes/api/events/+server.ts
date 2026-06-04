import { error } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { RequestHandler } from './$types';

const encoder = new TextEncoder();
const activeControllers = new Set<ReadableStreamDefaultController>();

let listenPromise: ReturnType<typeof sql.listen> | null = null;

async function ensureListener() {
	if (listenPromise) return;

	listenPromise = sql.listen(
		'data_changed',
		() => {
			broadcast();
		},
		() => {
			// Postgres reconnected — events during the gap were lost, so broadcast to all
			broadcast();
		}
	);

	await listenPromise;
}

function broadcast() {
	const msg = encoder.encode('event: change\ndata: 1\n\n');
	for (const controller of activeControllers) {
		try {
			controller.enqueue(msg);
		} catch {
			activeControllers.delete(controller);
		}
	}
}

export const GET: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	try {
		await ensureListener();
	} catch {
		throw error(503, 'Database listener unavailable');
	}

	const stream = new ReadableStream({
		start(controller) {
			activeControllers.add(controller);

			// Immediate change event on connect
			controller.enqueue(encoder.encode('event: change\ndata: 1\n\n'));

			// Heartbeat every 25s
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keepalive\n\n'));
				} catch {
					clearInterval(heartbeat);
					activeControllers.delete(controller);
				}
			}, 25_000);

			// Cleanup on abort
			request.signal.addEventListener('abort', () => {
				clearInterval(heartbeat);
				activeControllers.delete(controller);
				try {
					controller.close();
				} catch {
					// already closed
				}
			});
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
