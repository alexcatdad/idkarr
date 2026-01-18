import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// Queries
// ============================================================================

// List all tags
export const list = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("tags").collect();
	},
});

// Get a single tag by ID
export const get = query({
	args: { id: v.id("tags") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

// Get tag by name
export const getByName = query({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("tags")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new tag
export const add = mutation({
	args: {
		name: v.string(),
	},
	handler: async (ctx, args) => {
		// Validate name is not empty
		const trimmedName = args.name.trim();
		if (!trimmedName) {
			throw new Error("Tag name cannot be empty");
		}

		// Check for duplicate name (case-insensitive)
		const existing = await ctx.db
			.query("tags")
			.withIndex("by_name", (q) => q.eq("name", trimmedName))
			.first();

		if (existing) {
			throw new Error(`A tag with name "${trimmedName}" already exists`);
		}

		const now = Date.now();
		return await ctx.db.insert("tags", {
			name: trimmedName,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update an existing tag
export const update = mutation({
	args: {
		id: v.id("tags"),
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const tag = await ctx.db.get(args.id);
		if (!tag) {
			throw new Error("Tag not found");
		}

		const trimmedName = args.name.trim();
		if (!trimmedName) {
			throw new Error("Tag name cannot be empty");
		}

		// Check for duplicate name if changing
		if (trimmedName !== tag.name) {
			const existing = await ctx.db
				.query("tags")
				.withIndex("by_name", (q) => q.eq("name", trimmedName))
				.first();

			if (existing) {
				throw new Error(`A tag with name "${trimmedName}" already exists`);
			}
		}

		const now = Date.now();
		await ctx.db.patch(args.id, {
			name: trimmedName,
			updatedAt: now,
		});

		return await ctx.db.get(args.id);
	},
});

// Remove a tag
export const remove = mutation({
	args: { id: v.id("tags") },
	handler: async (ctx, args) => {
		const tag = await ctx.db.get(args.id);
		if (!tag) {
			throw new Error("Tag not found");
		}

		// Check if any restrictions use this tag
		const restrictions = await ctx.db.query("restrictions").collect();
		const restrictionsUsingTag = restrictions.filter((r) => r.tagIds.includes(args.id));

		if (restrictionsUsingTag.length > 0) {
			throw new Error(
				`Cannot delete tag - it is used by ${restrictionsUsingTag.length} restriction(s)`,
			);
		}

		// TODO: Check other tables that reference tags (indexers, download clients, media, etc.)

		await ctx.db.delete(args.id);
	},
});

// ============================================================================
// Bulk Operations
// ============================================================================

// Get or create tags by names (useful for bulk imports)
export const getOrCreateByNames = mutation({
	args: {
		names: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const results: Array<{ name: string; id: string; created: boolean }> = [];
		const now = Date.now();

		for (const name of args.names) {
			const trimmedName = name.trim();
			if (!trimmedName) continue;

			const existing = await ctx.db
				.query("tags")
				.withIndex("by_name", (q) => q.eq("name", trimmedName))
				.first();

			if (existing) {
				results.push({ name: trimmedName, id: existing._id, created: false });
			} else {
				const id = await ctx.db.insert("tags", {
					name: trimmedName,
					createdAt: now,
					updatedAt: now,
				});
				results.push({ name: trimmedName, id, created: true });
			}
		}

		return results;
	},
});
