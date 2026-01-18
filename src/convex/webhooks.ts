import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalQuery, mutation, query } from "./_generated/server";

// Webhook event type validator
const webhookEventValidator = v.union(
	v.literal("onGrab"),
	v.literal("onDownload"),
	v.literal("onUpgrade"),
	v.literal("onRename"),
	v.literal("onDelete"),
	v.literal("onHealthIssue"),
	v.literal("onHealthRestored"),
	v.literal("onApplicationUpdate"),
	v.literal("onRequestCreated"),
	v.literal("onRequestApproved"),
	v.literal("onRequestDenied"),
	v.literal("onRequestAvailable"),
);

// ============================================================================
// Queries
// ============================================================================

// List all webhooks
export const list = query({
	args: {
		enabled: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		let webhooks = await ctx.db.query("webhooks").collect();

		if (args.enabled !== undefined) {
			webhooks = webhooks.filter((w) => w.enabled === args.enabled);
		}

		// Enrich with tag info
		const enrichedWebhooks = await Promise.all(
			webhooks.map(async (webhook) => {
				const tags = await Promise.all(webhook.tagIds.map((id) => ctx.db.get(id)));
				return {
					...webhook,
					tags: tags.filter(Boolean),
				};
			}),
		);

		return enrichedWebhooks;
	},
});

// Get a single webhook
export const get = query({
	args: { id: v.id("webhooks") },
	handler: async (ctx, args) => {
		const webhook = await ctx.db.get(args.id);
		if (!webhook) return null;

		const tags = await Promise.all(webhook.tagIds.map((id) => ctx.db.get(id)));

		return {
			...webhook,
			tags: tags.filter(Boolean),
		};
	},
});

// Get webhooks that should be triggered for an event
export const getForEvent = query({
	args: {
		event: webhookEventValidator,
		mediaId: v.optional(v.id("media")),
	},
	handler: async (ctx, args) => {
		const webhooks = await ctx.db
			.query("webhooks")
			.withIndex("by_enabled", (q) => q.eq("enabled", true))
			.collect();

		// Filter by event type
		let matchingWebhooks = webhooks.filter((w) => w.events.includes(args.event));

		// If mediaId provided, filter by tags
		if (args.mediaId) {
			const media = await ctx.db.get(args.mediaId);
			if (media?.tagIds && media.tagIds.length > 0) {
				const mediaTags = new Set(media.tagIds);
				matchingWebhooks = matchingWebhooks.filter(
					(w) => w.tagIds.length === 0 || w.tagIds.some((t) => mediaTags.has(t)),
				);
			}
		}

		return matchingWebhooks;
	},
});

// Internal version for actions to call
export const getForEventInternal = internalQuery({
	args: {
		event: webhookEventValidator,
		mediaId: v.optional(v.id("media")),
	},
	handler: async (ctx, args) => {
		const webhooks = await ctx.db
			.query("webhooks")
			.withIndex("by_enabled", (q) => q.eq("enabled", true))
			.collect();

		let matchingWebhooks = webhooks.filter((w) => w.events.includes(args.event));

		if (args.mediaId) {
			const media = await ctx.db.get(args.mediaId);
			if (media?.tagIds && media.tagIds.length > 0) {
				const mediaTags = new Set(media.tagIds);
				matchingWebhooks = matchingWebhooks.filter(
					(w) => w.tagIds.length === 0 || w.tagIds.some((t) => mediaTags.has(t)),
				);
			}
		}

		return matchingWebhooks;
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new webhook
export const add = mutation({
	args: {
		name: v.string(),
		url: v.string(),
		enabled: v.optional(v.boolean()),
		events: v.array(webhookEventValidator),
		tagIds: v.optional(v.array(v.id("tags"))),
		authHeader: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check for duplicate name
		const existing = await ctx.db
			.query("webhooks")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();

		if (existing) {
			throw new Error(`Webhook "${args.name}" already exists`);
		}

		// Validate URL
		try {
			new URL(args.url);
		} catch {
			throw new Error("Invalid webhook URL");
		}

		if (args.events.length === 0) {
			throw new Error("At least one event must be selected");
		}

		const now = Date.now();
		return await ctx.db.insert("webhooks", {
			name: args.name,
			url: args.url,
			enabled: args.enabled ?? true,
			events: args.events,
			tagIds: args.tagIds ?? [],
			authHeader: args.authHeader,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update a webhook
export const update = mutation({
	args: {
		id: v.id("webhooks"),
		name: v.optional(v.string()),
		url: v.optional(v.string()),
		enabled: v.optional(v.boolean()),
		events: v.optional(v.array(webhookEventValidator)),
		tagIds: v.optional(v.array(v.id("tags"))),
		authHeader: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const webhook = await ctx.db.get(args.id);
		if (!webhook) {
			throw new Error("Webhook not found");
		}

		// Check for duplicate name if changing
		const { name } = args;
		if (name !== undefined && name !== webhook.name) {
			const existing = await ctx.db
				.query("webhooks")
				.withIndex("by_name", (q) => q.eq("name", name))
				.first();

			if (existing) {
				throw new Error(`Webhook "${name}" already exists`);
			}
		}

		// Validate URL if provided
		if (args.url) {
			try {
				new URL(args.url);
			} catch {
				throw new Error("Invalid webhook URL");
			}
		}

		if (args.events && args.events.length === 0) {
			throw new Error("At least one event must be selected");
		}

		const updates: Record<string, unknown> = { updatedAt: Date.now() };

		if (args.name !== undefined) updates.name = args.name;
		if (args.url !== undefined) updates.url = args.url;
		if (args.enabled !== undefined) updates.enabled = args.enabled;
		if (args.events !== undefined) updates.events = args.events;
		if (args.tagIds !== undefined) updates.tagIds = args.tagIds;
		if (args.authHeader !== undefined) updates.authHeader = args.authHeader;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Delete a webhook
export const remove = mutation({
	args: { id: v.id("webhooks") },
	handler: async (ctx, args) => {
		const webhook = await ctx.db.get(args.id);
		if (!webhook) {
			throw new Error("Webhook not found");
		}

		await ctx.db.delete(args.id);
	},
});

// Toggle enabled status
export const toggleEnabled = mutation({
	args: { id: v.id("webhooks") },
	handler: async (ctx, args) => {
		const webhook = await ctx.db.get(args.id);
		if (!webhook) {
			throw new Error("Webhook not found");
		}

		await ctx.db.patch(args.id, {
			enabled: !webhook.enabled,
			updatedAt: Date.now(),
		});

		return !webhook.enabled;
	},
});

// ============================================================================
// Actions (HTTP calls)
// ============================================================================

// Test a webhook
export const test = action({
	args: { id: v.id("webhooks") },
	handler: async (ctx, args) => {
		const webhook = await ctx.runQuery(api.webhooks.get, { id: args.id });
		if (!webhook) {
			throw new Error("Webhook not found");
		}

		const testPayload = {
			eventType: "test",
			timestamp: new Date().toISOString(),
			message: "This is a test notification from idkarr",
			data: {
				webhookName: webhook.name,
				events: webhook.events,
			},
		};

		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};

			if (webhook.authHeader) {
				const [headerName, ...headerValue] = webhook.authHeader.split(":");
				if (headerName && headerValue.length > 0) {
					headers[headerName.trim()] = headerValue.join(":").trim();
				}
			}

			const response = await fetch(webhook.url, {
				method: "POST",
				headers,
				body: JSON.stringify(testPayload),
			});

			return {
				success: response.ok,
				statusCode: response.status,
				statusText: response.statusText,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},
});

// Trigger webhooks for an event (internal use)
export const trigger = action({
	args: {
		event: webhookEventValidator,
		mediaId: v.optional(v.id("media")),
		data: v.object({
			title: v.optional(v.string()),
			message: v.optional(v.string()),
			quality: v.optional(v.string()),
			releaseGroup: v.optional(v.string()),
			downloadClient: v.optional(v.string()),
			indexer: v.optional(v.string()),
			customData: v.optional(v.string()),
		}),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		triggered: number;
		results: Array<{
			webhookId: Id<"webhooks">;
			webhookName: string;
			success: boolean;
			statusCode?: number;
			error?: string;
		}>;
	}> => {
		const webhooks = await ctx.runQuery(internal.webhooks.getForEventInternal, {
			event: args.event,
			mediaId: args.mediaId,
		});

		if (webhooks.length === 0) {
			return { triggered: 0, results: [] };
		}

		// Get media info if provided
		let mediaInfo: { id: Id<"media">; title: string; year?: number; mediaType: string } | null =
			null;
		if (args.mediaId) {
			const media = await ctx.runQuery(api.media.get, { id: args.mediaId });
			if (media) {
				mediaInfo = {
					id: media._id,
					title: media.title,
					year: media.year,
					mediaType: media.mediaType,
				};
			}
		}

		const payload = {
			eventType: args.event,
			timestamp: new Date().toISOString(),
			media: mediaInfo,
			...args.data,
		};

		const results = await Promise.all(
			webhooks.map(async (webhook: Doc<"webhooks">) => {
				try {
					const headers: Record<string, string> = {
						"Content-Type": "application/json",
					};

					if (webhook.authHeader) {
						const [headerName, ...headerValue] = webhook.authHeader.split(":");
						if (headerName && headerValue.length > 0) {
							headers[headerName.trim()] = headerValue.join(":").trim();
						}
					}

					const response = await fetch(webhook.url, {
						method: "POST",
						headers,
						body: JSON.stringify(payload),
					});

					return {
						webhookId: webhook._id,
						webhookName: webhook.name,
						success: response.ok,
						statusCode: response.status,
					};
				} catch (error) {
					return {
						webhookId: webhook._id,
						webhookName: webhook.name,
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			}),
		);

		return {
			triggered: webhooks.length,
			results,
		};
	},
});

// ============================================================================
// Statistics
// ============================================================================

export const getStats = query({
	args: {},
	handler: async (ctx) => {
		const webhooks = await ctx.db.query("webhooks").collect();

		const enabledCount = webhooks.filter((w) => w.enabled).length;

		// Count event subscriptions
		const eventCounts: Record<string, number> = {};
		for (const webhook of webhooks) {
			for (const event of webhook.events) {
				eventCounts[event] = (eventCounts[event] ?? 0) + 1;
			}
		}

		return {
			totalCount: webhooks.length,
			enabledCount,
			disabledCount: webhooks.length - enabledCount,
			eventSubscriptions: eventCounts,
		};
	},
});
