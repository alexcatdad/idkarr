import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mediaTypeValidator } from "./schema";

// List all root folders, optionally filtered by media type
export const list = query({
	args: {
		mediaType: v.optional(mediaTypeValidator),
	},
	handler: async (ctx, args) => {
		const { mediaType } = args;
		if (mediaType) {
			return await ctx.db
				.query("rootFolders")
				.withIndex("by_mediaType", (q) => q.eq("mediaType", mediaType))
				.collect();
		}
		return await ctx.db.query("rootFolders").collect();
	},
});

// Get a single root folder by ID
export const get = query({
	args: { id: v.id("rootFolders") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

// Add a new root folder
export const add = mutation({
	args: {
		path: v.string(),
		mediaType: mediaTypeValidator,
		isDefault: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Validate path is absolute
		if (!args.path.startsWith("/")) {
			throw new Error("Root folder path must be absolute (start with /)");
		}

		// Check for duplicate path
		const existing = await ctx.db
			.query("rootFolders")
			.withIndex("by_path", (q) => q.eq("path", args.path))
			.first();

		if (existing) {
			throw new Error(`Root folder already exists at path: ${args.path}`);
		}

		const now = Date.now();
		const isDefault = args.isDefault ?? false;

		// If this is marked as default, unset any existing default for this media type
		if (isDefault) {
			const existingDefaults = await ctx.db
				.query("rootFolders")
				.withIndex("by_mediaType", (q) => q.eq("mediaType", args.mediaType))
				.filter((q) => q.eq(q.field("isDefault"), true))
				.collect();

			for (const folder of existingDefaults) {
				await ctx.db.patch(folder._id, { isDefault: false, updatedAt: now });
			}
		}

		return await ctx.db.insert("rootFolders", {
			path: args.path,
			mediaType: args.mediaType,
			isDefault,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update an existing root folder
export const update = mutation({
	args: {
		id: v.id("rootFolders"),
		path: v.optional(v.string()),
		isDefault: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error("Root folder not found");
		}

		const now = Date.now();
		const updates: Record<string, unknown> = { updatedAt: now };

		// Validate and update path if provided
		const { path } = args;
		if (path !== undefined) {
			if (!path.startsWith("/")) {
				throw new Error("Root folder path must be absolute (start with /)");
			}

			// Check for duplicate path (excluding current folder)
			const duplicate = await ctx.db
				.query("rootFolders")
				.withIndex("by_path", (q) => q.eq("path", path))
				.first();

			if (duplicate && duplicate._id !== args.id) {
				throw new Error(`Root folder already exists at path: ${path}`);
			}

			updates.path = path;
		}

		// Handle default flag
		if (args.isDefault !== undefined) {
			if (args.isDefault) {
				// Unset any existing default for this media type
				const existingDefaults = await ctx.db
					.query("rootFolders")
					.withIndex("by_mediaType", (q) => q.eq("mediaType", existing.mediaType))
					.filter((q) => q.eq(q.field("isDefault"), true))
					.collect();

				for (const folder of existingDefaults) {
					if (folder._id !== args.id) {
						await ctx.db.patch(folder._id, { isDefault: false, updatedAt: now });
					}
				}
			}
			updates.isDefault = args.isDefault;
		}

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Remove a root folder
export const remove = mutation({
	args: { id: v.id("rootFolders") },
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error("Root folder not found");
		}

		// TODO: Check if any media items are using this root folder before deletion
		// For now, just delete the folder
		await ctx.db.delete(args.id);
	},
});

// Get the default root folder for a media type
export const getDefault = query({
	args: {
		mediaType: mediaTypeValidator,
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("rootFolders")
			.withIndex("by_mediaType", (q) => q.eq("mediaType", args.mediaType))
			.filter((q) => q.eq(q.field("isDefault"), true))
			.first();
	},
});

// Update space information for a root folder (called by storage monitoring)
export const updateSpace = mutation({
	args: {
		id: v.id("rootFolders"),
		freeSpace: v.number(),
		totalSpace: v.number(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error("Root folder not found");
		}

		const now = Date.now();
		await ctx.db.patch(args.id, {
			freeSpace: args.freeSpace,
			totalSpace: args.totalSpace,
			updatedAt: now,
		});
	},
});
