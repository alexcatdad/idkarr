import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { downloadClientTypeValidator } from "./schema";

// ============================================================================
// Queries
// ============================================================================

// List all download clients
export const list = query({
	args: {
		enabled: v.optional(v.boolean()),
		type: v.optional(downloadClientTypeValidator),
	},
	handler: async (ctx, args) => {
		let clients = await ctx.db.query("downloadClients").collect();

		if (args.enabled !== undefined) {
			clients = clients.filter((c) => c.enabled === args.enabled);
		}

		const { type } = args;
		if (type !== undefined) {
			clients = clients.filter((c) => c.type === type);
		}

		// Enrich with tags
		const enrichedClients = await Promise.all(
			clients.map(async (client) => {
				const tags = await Promise.all(client.tagIds.map((id) => ctx.db.get(id)));
				return {
					...client,
					tags: tags.filter(Boolean),
				};
			}),
		);

		return enrichedClients.sort((a, b) => a.priority - b.priority);
	},
});

// Get a single download client by ID
export const get = query({
	args: { id: v.id("downloadClients") },
	handler: async (ctx, args) => {
		const client = await ctx.db.get(args.id);
		if (!client) return null;

		const tags = await Promise.all(client.tagIds.map((id) => ctx.db.get(id)));

		return {
			...client,
			tags: tags.filter(Boolean),
		};
	},
});

// Get download clients by tag
export const getByTag = query({
	args: { tagId: v.id("tags") },
	handler: async (ctx, args) => {
		const clients = await ctx.db
			.query("downloadClients")
			.withIndex("by_enabled", (q) => q.eq("enabled", true))
			.collect();

		// Filter to clients with the specified tag
		const matchingClients = clients.filter((c) => c.tagIds.includes(args.tagId));

		return matchingClients.sort((a, b) => a.priority - b.priority);
	},
});

// Get the best download client for a media item
export const getForMedia = query({
	args: { mediaId: v.id("media") },
	handler: async (ctx, args) => {
		const media = await ctx.db.get(args.mediaId);
		if (!media) return null;

		const enabledClients = await ctx.db
			.query("downloadClients")
			.withIndex("by_enabled", (q) => q.eq("enabled", true))
			.collect();

		if (enabledClients.length === 0) return null;

		// If media has tags, prefer clients with matching tags
		const mediaTags = new Set(media.tagIds ?? []);
		let matchingClients = enabledClients;

		if (mediaTags.size > 0) {
			const clientsWithMatchingTags = enabledClients.filter((c) =>
				c.tagIds.some((t) => mediaTags.has(t)),
			);

			// Only use tag-matched clients if any exist, otherwise fall back to all
			if (clientsWithMatchingTags.length > 0) {
				matchingClients = clientsWithMatchingTags;
			}
		}

		// Return the highest priority (lowest number) client
		matchingClients.sort((a, b) => a.priority - b.priority);
		return matchingClients[0] ?? null;
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new download client
export const add = mutation({
	args: {
		name: v.string(),
		type: downloadClientTypeValidator,
		enabled: v.optional(v.boolean()),
		host: v.string(),
		port: v.number(),
		useSsl: v.optional(v.boolean()),
		username: v.optional(v.string()),
		password: v.optional(v.string()),
		apiKey: v.optional(v.string()),
		priority: v.optional(v.number()),
		tagIds: v.optional(v.array(v.id("tags"))),
		category: v.optional(v.string()),
		directory: v.optional(v.string()),
		removeCompletedDownloads: v.optional(v.boolean()),
		removeFailedDownloads: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Check for duplicate name
		const existing = await ctx.db
			.query("downloadClients")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();

		if (existing) {
			throw new Error(`Download client "${args.name}" already exists`);
		}

		// Get next priority if not specified
		let priority = args.priority;
		if (priority === undefined) {
			const allClients = await ctx.db.query("downloadClients").collect();
			priority = allClients.length > 0 ? Math.max(...allClients.map((c) => c.priority)) + 1 : 1;
		}

		const now = Date.now();
		return await ctx.db.insert("downloadClients", {
			name: args.name,
			type: args.type,
			enabled: args.enabled ?? true,
			host: args.host,
			port: args.port,
			useSsl: args.useSsl ?? false,
			username: args.username,
			password: args.password,
			apiKey: args.apiKey,
			priority,
			tagIds: args.tagIds ?? [],
			category: args.category,
			directory: args.directory,
			removeCompletedDownloads: args.removeCompletedDownloads ?? true,
			removeFailedDownloads: args.removeFailedDownloads ?? true,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update a download client
export const update = mutation({
	args: {
		id: v.id("downloadClients"),
		name: v.optional(v.string()),
		type: v.optional(downloadClientTypeValidator),
		enabled: v.optional(v.boolean()),
		host: v.optional(v.string()),
		port: v.optional(v.number()),
		useSsl: v.optional(v.boolean()),
		username: v.optional(v.string()),
		password: v.optional(v.string()),
		apiKey: v.optional(v.string()),
		priority: v.optional(v.number()),
		tagIds: v.optional(v.array(v.id("tags"))),
		category: v.optional(v.string()),
		directory: v.optional(v.string()),
		removeCompletedDownloads: v.optional(v.boolean()),
		removeFailedDownloads: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const client = await ctx.db.get(args.id);
		if (!client) {
			throw new Error("Download client not found");
		}

		// Check for duplicate name if changing
		const { name } = args;
		if (name !== undefined && name !== client.name) {
			const existing = await ctx.db
				.query("downloadClients")
				.withIndex("by_name", (q) => q.eq("name", name))
				.first();

			if (existing) {
				throw new Error(`Download client "${name}" already exists`);
			}
		}

		const updates: Record<string, unknown> = { updatedAt: Date.now() };

		if (args.name !== undefined) updates.name = args.name;
		if (args.type !== undefined) updates.type = args.type;
		if (args.enabled !== undefined) updates.enabled = args.enabled;
		if (args.host !== undefined) updates.host = args.host;
		if (args.port !== undefined) updates.port = args.port;
		if (args.useSsl !== undefined) updates.useSsl = args.useSsl;
		if (args.username !== undefined) updates.username = args.username;
		if (args.password !== undefined) updates.password = args.password;
		if (args.apiKey !== undefined) updates.apiKey = args.apiKey;
		if (args.priority !== undefined) updates.priority = args.priority;
		if (args.tagIds !== undefined) updates.tagIds = args.tagIds;
		if (args.category !== undefined) updates.category = args.category;
		if (args.directory !== undefined) updates.directory = args.directory;
		if (args.removeCompletedDownloads !== undefined)
			updates.removeCompletedDownloads = args.removeCompletedDownloads;
		if (args.removeFailedDownloads !== undefined)
			updates.removeFailedDownloads = args.removeFailedDownloads;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Delete a download client
export const remove = mutation({
	args: { id: v.id("downloadClients") },
	handler: async (ctx, args) => {
		const client = await ctx.db.get(args.id);
		if (!client) {
			throw new Error("Download client not found");
		}

		// Check if any indexers reference this client
		const indexers = await ctx.db.query("indexers").collect();
		const referencingIndexers = indexers.filter((i) => i.downloadClientId === args.id);

		if (referencingIndexers.length > 0) {
			throw new Error(
				`Cannot delete: ${referencingIndexers.length} indexer(s) reference this download client`,
			);
		}

		// Check if any downloads reference this client
		const downloads = await ctx.db
			.query("downloadQueue")
			.withIndex("by_downloadClient", (q) => q.eq("downloadClientId", args.id))
			.collect();

		if (downloads.length > 0) {
			throw new Error(
				`Cannot delete: ${downloads.length} active download(s) reference this client`,
			);
		}

		await ctx.db.delete(args.id);
	},
});

// Toggle enabled status
export const toggleEnabled = mutation({
	args: { id: v.id("downloadClients") },
	handler: async (ctx, args) => {
		const client = await ctx.db.get(args.id);
		if (!client) {
			throw new Error("Download client not found");
		}

		await ctx.db.patch(args.id, {
			enabled: !client.enabled,
			updatedAt: Date.now(),
		});

		return !client.enabled;
	},
});

// Update priorities (batch)
export const updatePriorities = mutation({
	args: {
		updates: v.array(
			v.object({
				id: v.id("downloadClients"),
				priority: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		for (const update of args.updates) {
			await ctx.db.patch(update.id, {
				priority: update.priority,
				updatedAt: now,
			});
		}

		return { updated: args.updates.length };
	},
});

// ============================================================================
// Statistics
// ============================================================================

export const getStats = query({
	args: {},
	handler: async (ctx) => {
		const clients = await ctx.db.query("downloadClients").collect();

		const enabledCount = clients.filter((c) => c.enabled).length;
		const byType: Record<string, number> = {};

		for (const client of clients) {
			byType[client.type] = (byType[client.type] ?? 0) + 1;
		}

		return {
			totalCount: clients.length,
			enabledCount,
			disabledCount: clients.length - enabledCount,
			byType,
		};
	},
});
