<script lang="ts">
import { type Dialog, Dialog as DialogPrimitive } from "bits-ui";

let { ...restProps }: Dialog.PortalProps = $props();
</script>

<DialogPrimitive.Portal {...restProps} />
