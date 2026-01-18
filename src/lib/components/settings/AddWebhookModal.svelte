<script lang="ts">
import { useConvexClient } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { api } from "../../../convex/_generated/api";

interface Props {
	open: boolean;
	onClose: () => void;
}

let { open = $bindable(), onClose }: Props = $props();

const client = useConvexClient();

// Form state
let name = $state("");
let url = $state("");
let enabled = $state(true);
let selectedEvents = $state<Set<string>>(new Set());
let isSubmitting = $state(false);
let error = $state<string | null>(null);

// Available webhook events (from webhooks.ts schema)
const webhookEvents = [
	{ id: "onGrab", label: "On Grab", description: "When a release is grabbed" },
	{ id: "onDownload", label: "On Download", description: "When download completes" },
	{ id: "onUpgrade", label: "On Upgrade", description: "When media is upgraded" },
	{ id: "onRename", label: "On Rename", description: "When files are renamed" },
	{ id: "onDelete", label: "On Delete", description: "When media is deleted" },
	{ id: "onHealthIssue", label: "Health Issue", description: "When a health issue occurs" },
	{ id: "onHealthRestored", label: "Health Restored", description: "When health is restored" },
	{ id: "onApplicationUpdate", label: "Application Update", description: "When app is updated" },
	{ id: "onRequestCreated", label: "Request Created", description: "When a request is created" },
	{ id: "onRequestApproved", label: "Request Approved", description: "When a request is approved" },
	{ id: "onRequestDenied", label: "Request Denied", description: "When a request is denied" },
	{
		id: "onRequestAvailable",
		label: "Request Available",
		description: "When requested media is available",
	},
] as const;

type WebhookEventId = (typeof webhookEvents)[number]["id"];

function toggleEvent(eventId: string) {
	const newSet = new Set(selectedEvents);
	if (newSet.has(eventId)) {
		newSet.delete(eventId);
	} else {
		newSet.add(eventId);
	}
	selectedEvents = newSet;
}

async function handleSubmit() {
	// Validation
	if (!name.trim()) {
		error = "Webhook name is required";
		return;
	}
	if (!url.trim()) {
		error = "Webhook URL is required";
		return;
	}
	if (selectedEvents.size === 0) {
		error = "At least one event must be selected";
		return;
	}

	// Validate URL format
	try {
		new URL(url);
	} catch {
		error = "Invalid URL format";
		return;
	}

	isSubmitting = true;
	error = null;

	try {
		await client.mutation(api.webhooks.add, {
			name: name.trim(),
			url: url.trim(),
			enabled,
			events: Array.from(selectedEvents) as WebhookEventId[],
		});
		resetForm();
		onClose();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to add webhook";
	} finally {
		isSubmitting = false;
	}
}

function resetForm() {
	name = "";
	url = "";
	enabled = true;
	selectedEvents = new Set();
	error = null;
}

function handleOpenChange(isOpen: boolean) {
	if (!isOpen) {
		resetForm();
		onClose();
	}
}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Webhook</Dialog.Title>
			<Dialog.Description>
				Configure a webhook to receive notifications for events.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
			<!-- Name -->
			<div>
				<label for="webhook-name" class="text-sm font-medium">Name</label>
				<input
					id="webhook-name"
					type="text"
					bind:value={name}
					placeholder="e.g., Discord Notifications"
					class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			<!-- URL -->
			<div>
				<label for="webhook-url" class="text-sm font-medium">URL</label>
				<input
					id="webhook-url"
					type="url"
					bind:value={url}
					placeholder="https://example.com/webhook"
					class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			<!-- Enabled Toggle -->
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium">Enabled</p>
					<p class="text-xs text-muted-foreground">Webhook will receive notifications when enabled</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={enabled}
					aria-label="Toggle webhook enabled"
					onclick={() => (enabled = !enabled)}
					class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {enabled
						? 'bg-primary'
						: 'bg-muted'}"
				>
					<span
						class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform {enabled
							? 'translate-x-[22px]'
							: 'translate-x-[2px]'}"
					></span>
				</button>
			</div>

			<!-- Events Multi-select -->
			<div>
				<p class="text-sm font-medium mb-2">Events</p>
				<p class="text-xs text-muted-foreground mb-3">Select which events should trigger this webhook</p>
				<div class="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto rounded-lg border p-3">
					{#each webhookEvents as event}
						<label
							class="flex items-start gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
						>
							<input
								type="checkbox"
								checked={selectedEvents.has(event.id)}
								onchange={() => toggleEvent(event.id)}
								class="mt-0.5 h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary"
							/>
							<div class="text-sm">
								<p class="font-medium">{event.label}</p>
								<p class="text-xs text-muted-foreground">{event.description}</p>
							</div>
						</label>
					{/each}
				</div>
				{#if selectedEvents.size > 0}
					<p class="text-xs text-muted-foreground mt-2">
						{selectedEvents.size} event{selectedEvents.size === 1 ? "" : "s"} selected
					</p>
				{/if}
			</div>

			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => handleOpenChange(false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Adding..." : "Add Webhook"}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
