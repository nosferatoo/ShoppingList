import postgres from 'postgres';
import { env } from '$env/dynamic/private';

export const sql = postgres(env.DATABASE_URL!, { max: 10 });

export async function withUser<T>(
	userId: string,
	fn: (tx: postgres.TransactionSql) => Promise<T>
): Promise<T> {
	return sql.begin(async (tx) => {
		await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId })}, true)`;
		return fn(tx);
	});
}
