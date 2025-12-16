<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import BottomSheetOverlay from "./bottom-sheet-overlay.svelte";
	import BottomSheetPortal from "./bottom-sheet-portal.svelte";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import type { ComponentProps, Snippet } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		...restProps
	}: ComponentProps<DialogPrimitive.Content> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof BottomSheetPortal>>;
		children?: Snippet;
	} = $props();
</script>

<BottomSheetPortal {...portalProps}>
	<BottomSheetOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="bottom-sheet-content"
		class={cn(
			"fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-[20px] border border-border bg-background shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</DialogPrimitive.Content>
</BottomSheetPortal>
