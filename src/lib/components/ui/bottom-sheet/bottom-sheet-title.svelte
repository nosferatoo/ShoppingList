<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import type { ComponentProps, Snippet } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		level = "h3",
		children,
		...restProps
	}: ComponentProps<DialogPrimitive.Title> & {
		level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
		children?: Snippet;
	} = $props();
</script>

<DialogPrimitive.Title
	bind:ref
	{level}
	data-slot="bottom-sheet-title"
	class={cn("text-base font-semibold leading-none tracking-tight", className)}
	{...restProps}
>
	{@render children?.()}
</DialogPrimitive.Title>
