import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// Queries
// ============================================================================

// List all restrictions
export const list = query({
	args: {},
	handler: async (ctx) => {
		const restrictions = await ctx.db.query("restrictions").collect();

		// Enrich with tag details
		const enrichedRestrictions = await Promise.all(
			restrictions.map(async (restriction) => {
				const tags = await Promise.all(restriction.tagIds.map((tagId) => ctx.db.get(tagId)));
				return {
					...restriction,
					tags: tags.filter(Boolean),
				};
			}),
		);

		return enrichedRestrictions;
	},
});

// Get a single restriction by ID
export const get = query({
	args: { id: v.id("restrictions") },
	handler: async (ctx, args) => {
		const restriction = await ctx.db.get(args.id);
		if (!restriction) return null;

		// Enrich with tag details
		const tags = await Promise.all(restriction.tagIds.map((tagId) => ctx.db.get(tagId)));

		return {
			...restriction,
			tags: tags.filter(Boolean),
		};
	},
});

// Get restriction by name
export const getByName = query({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("restrictions")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new restriction
export const add = mutation({
	args: {
		name: v.string(),
		mustContain: v.optional(v.array(v.string())),
		mustNotContain: v.optional(v.array(v.string())),
		tagIds: v.optional(v.array(v.id("tags"))),
	},
	handler: async (ctx, args) => {
		// Check for duplicate name
		const existing = await ctx.db
			.query("restrictions")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();

		if (existing) {
			throw new Error(`A restriction with name "${args.name}" already exists`);
		}

		// Validate tags exist if provided
		if (args.tagIds) {
			for (const tagId of args.tagIds) {
				const tag = await ctx.db.get(tagId);
				if (!tag) {
					throw new Error(`Tag ${tagId} not found`);
				}
			}
		}

		const now = Date.now();
		return await ctx.db.insert("restrictions", {
			name: args.name,
			mustContain: args.mustContain ?? [],
			mustNotContain: args.mustNotContain ?? [],
			tagIds: args.tagIds ?? [],
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update an existing restriction
export const update = mutation({
	args: {
		id: v.id("restrictions"),
		name: v.optional(v.string()),
		mustContain: v.optional(v.array(v.string())),
		mustNotContain: v.optional(v.array(v.string())),
		tagIds: v.optional(v.array(v.id("tags"))),
	},
	handler: async (ctx, args) => {
		const restriction = await ctx.db.get(args.id);
		if (!restriction) {
			throw new Error("Restriction not found");
		}

		// Check for duplicate name if changing
		const { name } = args;
		if (name !== undefined && name !== restriction.name) {
			const existing = await ctx.db
				.query("restrictions")
				.withIndex("by_name", (q) => q.eq("name", name))
				.first();

			if (existing) {
				throw new Error(`A restriction with name "${name}" already exists`);
			}
		}

		// Validate tags exist if provided
		if (args.tagIds) {
			for (const tagId of args.tagIds) {
				const tag = await ctx.db.get(tagId);
				if (!tag) {
					throw new Error(`Tag ${tagId} not found`);
				}
			}
		}

		const now = Date.now();
		const updates: Record<string, unknown> = { updatedAt: now };

		if (args.name !== undefined) updates.name = args.name;
		if (args.mustContain !== undefined) updates.mustContain = args.mustContain;
		if (args.mustNotContain !== undefined) updates.mustNotContain = args.mustNotContain;
		if (args.tagIds !== undefined) updates.tagIds = args.tagIds;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Remove a restriction
export const remove = mutation({
	args: { id: v.id("restrictions") },
	handler: async (ctx, args) => {
		const restriction = await ctx.db.get(args.id);
		if (!restriction) {
			throw new Error("Restriction not found");
		}

		await ctx.db.delete(args.id);
	},
});

// ============================================================================
// Testing Functions
// ============================================================================

// Test a release name against all restrictions
export const testReleaseName = query({
	args: {
		releaseName: v.string(),
		tagIds: v.optional(v.array(v.id("tags"))),
	},
	handler: async (ctx, args) => {
		const restrictions = await ctx.db.query("restrictions").collect();
		const results: Array<{
			restrictionId: string;
			restrictionName: string;
			passed: boolean;
			reason?: string;
		}> = [];

		for (const restriction of restrictions) {
			// Check if this restriction applies based on tags
			const restrictionAppliesToTags =
				restriction.tagIds.length === 0 || // No tags means applies to all
				(args.tagIds && restriction.tagIds.some((tagId) => args.tagIds?.includes(tagId)));

			if (!restrictionAppliesToTags) {
				// Skip this restriction - doesn't apply to the given tags
				continue;
			}

			// Check mustContain (OR logic - any match passes)
			const mustContainPassed =
				restriction.mustContain.length === 0 ||
				restriction.mustContain.some((term) =>
					args.releaseName.toLowerCase().includes(term.toLowerCase()),
				);

			// Check mustNotContain (any match fails)
			const failedMustNotContain = restriction.mustNotContain.find((term) =>
				args.releaseName.toLowerCase().includes(term.toLowerCase()),
			);

			const passed = mustContainPassed && !failedMustNotContain;

			let reason: string | undefined;
			if (!mustContainPassed) {
				reason = `Does not contain any of: ${restriction.mustContain.join(", ")}`;
			} else if (failedMustNotContain) {
				reason = `Contains forbidden term: ${failedMustNotContain}`;
			}

			results.push({
				restrictionId: restriction._id,
				restrictionName: restriction.name,
				passed,
				reason,
			});
		}

		// Overall result - all applicable restrictions must pass
		const overallPassed = results.every((r) => r.passed);
		const failedRestrictions = results.filter((r) => !r.passed);

		return {
			passed: overallPassed,
			results,
			failedRestrictions,
		};
	},
});

// Test a single restriction against a release name
export const testRestriction = query({
	args: {
		restrictionId: v.id("restrictions"),
		releaseName: v.string(),
	},
	handler: async (ctx, args) => {
		const restriction = await ctx.db.get(args.restrictionId);
		if (!restriction) {
			throw new Error("Restriction not found");
		}

		// Check mustContain (OR logic - any match passes)
		const mustContainMatches = restriction.mustContain.filter((term) =>
			args.releaseName.toLowerCase().includes(term.toLowerCase()),
		);
		const mustContainPassed = restriction.mustContain.length === 0 || mustContainMatches.length > 0;

		// Check mustNotContain (any match fails)
		const mustNotContainMatches = restriction.mustNotContain.filter((term) =>
			args.releaseName.toLowerCase().includes(term.toLowerCase()),
		);
		const mustNotContainPassed = mustNotContainMatches.length === 0;

		return {
			passed: mustContainPassed && mustNotContainPassed,
			mustContain: {
				terms: restriction.mustContain,
				matches: mustContainMatches,
				passed: mustContainPassed,
			},
			mustNotContain: {
				terms: restriction.mustNotContain,
				matches: mustNotContainMatches,
				passed: mustNotContainPassed,
			},
		};
	},
});
