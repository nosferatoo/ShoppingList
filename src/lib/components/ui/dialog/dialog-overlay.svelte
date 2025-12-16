<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.OverlayProps = $props();
</script>

<DialogPrimitive.Overlay
	bind:ref
	data-slot="dialog-overlay"
	class={cn(
		"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 dialog-overlay-blur",
		className
	)}
	{...restProps}
/>

<style>
	/* Desktop only: Add backdrop blur effect to modal overlays */
	@media (min-width: 1024px) {
		:global(.dialog-overlay-blur) {
			backdrop-filter: blur(8px);
			-webkit-backdrop-filter: blur(8px);
		}
	}
</style>
