<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { ComponentProps, Snippet } from "svelte";

	let {
		open = $bindable(false),
		onOpenChange,
		children,
		...restProps
	}: ComponentProps<DialogPrimitive.Root> & {
		children?: Snippet;
	} = $props();
</script>

<DialogPrimitive.Root bind:open {onOpenChange} {...restProps}>
	{@render children?.()}
</DialogPrimitive.Root>
