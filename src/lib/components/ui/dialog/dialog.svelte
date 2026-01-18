<script lang="ts">
import { type Dialog, Dialog as DialogPrimitive } from "bits-ui";

let { open = $bindable(false), ...restProps }: Dialog.RootProps = $props();
</script>

<DialogPrimitive.Root bind:open {...restProps} />
