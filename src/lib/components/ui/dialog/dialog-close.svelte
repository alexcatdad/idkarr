<script lang="ts">
import { type Dialog, Dialog as DialogPrimitive } from "bits-ui";

let { ref = $bindable(null), ...restProps }: Dialog.CloseProps = $props();
</script>

<DialogPrimitive.Close bind:ref data-slot="dialog-close" {...restProps} />
