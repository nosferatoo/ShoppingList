<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { ComponentProps, Snippet } from "svelte";

	let {
		children,
		...restProps
	}: ComponentProps<DialogPrimitive.Portal> & {
		children?: Snippet;
	} = $props();
</script>

<DialogPrimitive.Portal {...restProps}>
	{@render children?.()}
</DialogPrimitive.Portal>
