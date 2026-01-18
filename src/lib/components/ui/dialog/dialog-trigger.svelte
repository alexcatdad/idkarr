<script lang="ts">
import { type Dialog, Dialog as DialogPrimitive } from "bits-ui";

let { ref = $bindable(null), ...restProps }: Dialog.TriggerProps = $props();
</script>

<DialogPrimitive.Trigger bind:ref data-slot="dialog-trigger" {...restProps} />
