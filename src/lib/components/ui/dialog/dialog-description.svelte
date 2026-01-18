<script lang="ts">
import { type Dialog, Dialog as DialogPrimitive } from "bits-ui";
import { cn } from "$lib/utils.js";

let { ref = $bindable(null), class: className, ...restProps }: Dialog.DescriptionProps = $props();
</script>

<DialogPrimitive.Description
	bind:ref
	data-slot="dialog-description"
	class={cn("text-muted-foreground text-sm", className)}
	{...restProps}
/>
