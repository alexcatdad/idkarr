# idkarr Foundation Setup - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up the idkarr project foundation with Bun, Biome, Convex, SvelteKit, and shadcn-svelte.

**Architecture:** Monorepo with SvelteKit frontend connecting to Convex backend. Convex handles database, real-time subscriptions, auth, and serverless functions. SvelteKit serves the PWA with shadcn-svelte components.

**Tech Stack:** Bun (runtime), Biome (lint/format), Convex (backend), SvelteKit (frontend), shadcn-svelte (UI), Tailwind CSS (styling)

---

## Task 1: Initialize Project Root

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Create root package.json**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
```

Create `package.json`:
```json
{
  "name": "idkarr",
  "version": "0.1.0",
  "private": true,
  "description": "Unified media manager - TV, Movies, Anime, Music",
  "type": "module",
  "scripts": {
    "dev": "bun run --cwd src/app dev",
    "build": "bun run --cwd src/app build",
    "preview": "bun run --cwd src/app preview",
    "check": "biome check .",
    "check:fix": "biome check --write .",
    "format": "biome format --write .",
    "lint": "biome lint .",
    "convex:dev": "bun run --cwd src/app convex dev",
    "convex:deploy": "bun run --cwd src/app convex deploy"
  },
  "keywords": ["media", "sonarr", "radarr", "lidarr", "anime"],
  "author": "",
  "license": "MIT"
}
```

**Step 2: Update .gitignore**

Create/update `.gitignore`:
```gitignore
# Dependencies
node_modules/

# Build outputs
.svelte-kit/
build/
dist/

# Environment
.env
.env.*
!.env.example

# Convex
.convex/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test coverage
coverage/

# Biome
.biome/
```

**Step 3: Verify files exist**

Run: `ls -la /Users/alex/REPOS/alexcatdad/idkarr/package.json /Users/alex/REPOS/alexcatdad/idkarr/.gitignore`
Expected: Both files listed

**Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: initialize project root with package.json"
```

---

## Task 2: Set Up Biome

**Files:**
- Create: `biome.json`

**Step 1: Install Biome**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
bun add -d @biomejs/biome
```

Expected: Package added to devDependencies

**Step 2: Create biome.json configuration**

Create `biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error",
        "noVar": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "json": {
    "formatter": {
      "indentStyle": "tab"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      ".svelte-kit",
      "build",
      "dist",
      ".convex",
      "*.min.js"
    ]
  },
  "overrides": [
    {
      "include": ["*.svelte"],
      "linter": {
        "rules": {
          "style": {
            "useConst": "off"
          }
        }
      }
    }
  ]
}
```

**Step 3: Verify Biome works**

Run: `bunx biome check .`
Expected: No errors (may show info about no files to check yet)

**Step 4: Commit**

```bash
git add biome.json bun.lockb package.json
git commit -m "chore: add Biome for linting and formatting"
```

---

## Task 3: Create SvelteKit App

**Files:**
- Create: `src/app/` directory with SvelteKit structure

**Step 1: Create SvelteKit project**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
mkdir -p src
cd src
bunx sv create app --template minimal --types ts --no-add-ons --no-install
```

When prompted:
- Template: SvelteKit minimal
- Type checking: TypeScript
- Additional options: None

**Step 2: Install dependencies**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun install
```

Expected: Dependencies installed successfully

**Step 3: Verify SvelteKit structure**

Run: `ls -la /Users/alex/REPOS/alexcatdad/idkarr/src/app/src/routes/`
Expected: `+page.svelte` file exists

**Step 4: Test dev server starts**

Run: `cd /Users/alex/REPOS/alexcatdad/idkarr/src/app && bun run dev &`
Wait 5 seconds, then:
Run: `curl -s http://localhost:5173 | head -20`
Expected: HTML response
Run: `pkill -f "vite"` (stop dev server)

**Step 5: Commit**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
git add src/app/
git commit -m "feat: add SvelteKit app scaffold"
```

---

## Task 4: Set Up Convex

**Files:**
- Create: `src/app/convex.json`
- Create: `src/app/src/convex/` directory
- Modify: `src/app/package.json`

**Step 1: Install Convex packages**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun add convex convex-svelte
```

Expected: Packages added to dependencies

**Step 2: Create convex.json configuration**

Create `src/app/convex.json`:
```json
{
  "functions": "src/convex/"
}
```

**Step 3: Create Convex directory structure**

```bash
mkdir -p /Users/alex/REPOS/alexcatdad/idkarr/src/app/src/convex
```

**Step 4: Initialize Convex (creates backend)**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bunx convex dev --once
```

When prompted:
- Sign in with GitHub
- Create new project: "idkarr"
- Accept defaults

Expected: `.env.local` created with `CONVEX_URL` and `convex/_generated/` files created

**Step 5: Create initial schema**

Create `src/app/src/convex/schema.ts`:
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - will be populated by auth
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("limited")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Media table - unified for all media types
  media: defineTable({
    mediaType: v.union(
      v.literal("tv"),
      v.literal("movie"),
      v.literal("anime"),
      v.literal("music")
    ),
    title: v.string(),
    sortTitle: v.string(),
    year: v.optional(v.number()),
    overview: v.optional(v.string()),
    status: v.string(),
    monitored: v.boolean(),
    path: v.optional(v.string()),
    // External IDs
    tmdbId: v.optional(v.number()),
    tvdbId: v.optional(v.number()),
    imdbId: v.optional(v.string()),
    // Timestamps
    added: v.number(),
    lastInfoSync: v.optional(v.number()),
  })
    .index("by_type", ["mediaType"])
    .index("by_title", ["sortTitle"])
    .index("by_tmdb", ["tmdbId"])
    .index("by_tvdb", ["tvdbId"]),
});
```

**Step 6: Push schema to Convex**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bunx convex dev --once
```

Expected: Schema synced, no errors

**Step 7: Commit**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
git add src/app/convex.json src/app/src/convex/ src/app/package.json src/app/bun.lockb
git commit -m "feat: add Convex backend with initial schema"
```

Note: Do NOT commit `.env.local` - it contains your Convex deployment URL

---

## Task 5: Connect SvelteKit to Convex

**Files:**
- Create: `src/app/.env.example`
- Modify: `src/app/src/routes/+layout.svelte`
- Create: `src/app/src/convex/media.ts`
- Modify: `src/app/src/routes/+page.svelte`

**Step 1: Create .env.example**

Create `src/app/.env.example`:
```bash
# Convex
PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

**Step 2: Update layout to initialize Convex**

Replace `src/app/src/routes/+layout.svelte`:
```svelte
<script lang="ts">
	import { PUBLIC_CONVEX_URL } from "$env/static/public";
	import { setupConvex } from "convex-svelte";

	const { children } = $props();

	setupConvex(PUBLIC_CONVEX_URL);
</script>

{@render children()}
```

**Step 3: Create media query function**

Create `src/app/src/convex/media.ts`:
```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all media with optional filtering
export const list = query({
  args: {
    mediaType: v.optional(
      v.union(
        v.literal("tv"),
        v.literal("movie"),
        v.literal("anime"),
        v.literal("music")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.mediaType) {
      return await ctx.db
        .query("media")
        .withIndex("by_type", (q) => q.eq("mediaType", args.mediaType!))
        .collect();
    }
    return await ctx.db.query("media").collect();
  },
});

// Get single media item
export const get = query({
  args: { id: v.id("media") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Add new media
export const add = mutation({
  args: {
    mediaType: v.union(
      v.literal("tv"),
      v.literal("movie"),
      v.literal("anime"),
      v.literal("music")
    ),
    title: v.string(),
    year: v.optional(v.number()),
    overview: v.optional(v.string()),
    tmdbId: v.optional(v.number()),
    tvdbId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("media", {
      mediaType: args.mediaType,
      title: args.title,
      sortTitle: args.title.toLowerCase().replace(/^(the|a|an)\s+/i, ""),
      year: args.year,
      overview: args.overview,
      status: "active",
      monitored: true,
      tmdbId: args.tmdbId,
      tvdbId: args.tvdbId,
      added: now,
    });
  },
});

// Delete media
export const remove = mutation({
  args: { id: v.id("media") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

**Step 4: Update home page to show Convex connection**

Replace `src/app/src/routes/+page.svelte`:
```svelte
<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "../convex/_generated/api";

	const mediaQuery = useQuery(api.media.list, {});
</script>

<main class="p-8">
	<h1 class="text-3xl font-bold mb-4">idkarr</h1>
	<p class="text-gray-600 mb-8">Unified Media Manager</p>

	{#if $mediaQuery.isLoading}
		<p>Loading...</p>
	{:else if $mediaQuery.error}
		<p class="text-red-500">Error: {$mediaQuery.error.message}</p>
	{:else}
		<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
			✓ Connected to Convex
		</div>
		<p class="text-gray-600">
			Media items in library: {$mediaQuery.data?.length ?? 0}
		</p>
	{/if}
</main>
```

**Step 5: Sync Convex functions**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bunx convex dev --once
```

Expected: Functions synced successfully

**Step 6: Test the connection**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun run dev &
```

Wait 5 seconds, then open http://localhost:5173 in browser.
Expected: Page shows "✓ Connected to Convex" and "Media items in library: 0"

Stop dev server: `pkill -f "vite"`

**Step 7: Commit**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
git add src/app/.env.example src/app/src/
git commit -m "feat: connect SvelteKit to Convex backend"
```

---

## Task 6: Set Up Tailwind CSS

**Files:**
- Modify: `src/app/package.json`
- Create: `src/app/src/app.css`
- Modify: `src/app/svelte.config.js`
- Modify: `src/app/vite.config.ts`

**Step 1: Install Tailwind and dependencies**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun add -d tailwindcss postcss autoprefixer
bunx tailwindcss init -p
```

Expected: `tailwind.config.js` and `postcss.config.js` created

**Step 2: Configure Tailwind**

Replace `src/app/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Step 3: Create global CSS**

Create `src/app/src/app.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Import CSS in layout**

Update `src/app/src/routes/+layout.svelte`:
```svelte
<script lang="ts">
	import { PUBLIC_CONVEX_URL } from "$env/static/public";
	import { setupConvex } from "convex-svelte";
	import "../app.css";

	const { children } = $props();

	setupConvex(PUBLIC_CONVEX_URL);
</script>

{@render children()}
```

**Step 5: Verify Tailwind works**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun run dev &
```

Wait 5 seconds, open http://localhost:5173
Expected: Styling appears (font changes, padding works)

Stop dev server: `pkill -f "vite"`

**Step 6: Commit**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
git add src/app/
git commit -m "feat: add Tailwind CSS"
```

---

## Task 7: Set Up shadcn-svelte

**Files:**
- Create: `src/app/components.json`
- Create: `src/app/src/lib/utils.ts`
- Create: `src/app/src/lib/components/ui/`

**Step 1: Install shadcn-svelte dependencies**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun add bits-ui clsx tailwind-merge tailwind-variants
bun add -d @tailwindcss/typography
```

**Step 2: Initialize shadcn-svelte**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bunx shadcn-svelte@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Expected: `components.json` created, `tailwind.config.js` updated

**Step 3: Create utils file if not created**

Create `src/app/src/lib/utils.ts` (if not exists):
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
```

**Step 4: Add Button component**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bunx shadcn-svelte@latest add button
```

Expected: Button component added to `src/lib/components/ui/button/`

**Step 5: Add Card component**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bunx shadcn-svelte@latest add card
```

Expected: Card component added to `src/lib/components/ui/card/`

**Step 6: Add Input component**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bunx shadcn-svelte@latest add input
```

Expected: Input component added

**Step 7: Verify components work**

Update `src/app/src/routes/+page.svelte`:
```svelte
<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "../convex/_generated/api";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";

	const mediaQuery = useQuery(api.media.list, {});
</script>

<main class="min-h-screen bg-background p-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-4xl font-bold mb-2">idkarr</h1>
		<p class="text-muted-foreground mb-8">Unified Media Manager</p>

		{#if $mediaQuery.isLoading}
			<Card.Root>
				<Card.Content class="pt-6">
					<p>Loading...</p>
				</Card.Content>
			</Card.Root>
		{:else if $mediaQuery.error}
			<Card.Root class="border-destructive">
				<Card.Content class="pt-6">
					<p class="text-destructive">Error: {$mediaQuery.error.message}</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root class="mb-6">
				<Card.Header>
					<Card.Title>Status</Card.Title>
					<Card.Description>Backend connection status</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center gap-2 text-green-600">
						<span class="h-2 w-2 rounded-full bg-green-600"></span>
						Connected to Convex
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Library</Card.Title>
					<Card.Description>Your media collection</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground mb-4">
						{$mediaQuery.data?.length ?? 0} items in library
					</p>
					<Button>Add Media</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</main>
```

**Step 8: Test UI**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun run dev &
```

Wait 5 seconds, open http://localhost:5173
Expected: Styled cards with shadcn components visible

Stop dev server: `pkill -f "vite"`

**Step 9: Commit**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
git add src/app/
git commit -m "feat: add shadcn-svelte UI components"
```

---

## Task 8: Add Dark Mode Support

**Files:**
- Create: `src/app/src/lib/stores/theme.ts`
- Modify: `src/app/src/routes/+layout.svelte`
- Modify: `src/app/src/app.html`

**Step 1: Create theme store**

Create `src/app/src/lib/stores/theme.ts`:
```typescript
import { writable } from "svelte/store";
import { browser } from "$app/environment";

type Theme = "light" | "dark" | "system";

function createThemeStore() {
	const defaultTheme: Theme = "system";

	const stored = browser ? (localStorage.getItem("theme") as Theme) : null;
	const { subscribe, set, update } = writable<Theme>(stored ?? defaultTheme);

	return {
		subscribe,
		set: (value: Theme) => {
			if (browser) {
				localStorage.setItem("theme", value);
				applyTheme(value);
			}
			set(value);
		},
		toggle: () => {
			update((current) => {
				const next = current === "dark" ? "light" : "dark";
				if (browser) {
					localStorage.setItem("theme", next);
					applyTheme(next);
				}
				return next;
			});
		},
	};
}

function applyTheme(theme: Theme) {
	if (!browser) return;

	const root = document.documentElement;
	const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const isDark = theme === "dark" || (theme === "system" && systemDark);

	root.classList.toggle("dark", isDark);
}

export const theme = createThemeStore();

// Initialize theme on load
if (browser) {
	const stored = localStorage.getItem("theme") as Theme | null;
	applyTheme(stored ?? "system");
}
```

**Step 2: Update app.html for dark mode**

Replace `src/app/src/app.html`:
```html
<!doctype html>
<html lang="en" class="">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="%sveltekit.assets%/favicon.png" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>idkarr</title>
		<script>
			// Prevent flash of wrong theme
			(function () {
				const theme = localStorage.getItem("theme") ?? "system";
				const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
				const isDark = theme === "dark" || (theme === "system" && systemDark);
				if (isDark) document.documentElement.classList.add("dark");
			})();
		</script>
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover" class="min-h-screen bg-background text-foreground">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

**Step 3: Add theme toggle to page**

Update `src/app/src/routes/+page.svelte`:
```svelte
<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "../convex/_generated/api";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { theme } from "$lib/stores/theme";
</script>

<main class="min-h-screen bg-background p-8">
	<div class="max-w-4xl mx-auto">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-4xl font-bold">idkarr</h1>
				<p class="text-muted-foreground">Unified Media Manager</p>
			</div>
			<Button variant="outline" on:click={() => theme.toggle()}>
				{$theme === "dark" ? "☀️" : "🌙"}
			</Button>
		</div>

		{#if $mediaQuery.isLoading}
			<Card.Root>
				<Card.Content class="pt-6">
					<p>Loading...</p>
				</Card.Content>
			</Card.Root>
		{:else if $mediaQuery.error}
			<Card.Root class="border-destructive">
				<Card.Content class="pt-6">
					<p class="text-destructive">Error: {$mediaQuery.error.message}</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root class="mb-6">
				<Card.Header>
					<Card.Title>Status</Card.Title>
					<Card.Description>Backend connection status</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
						<span class="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400"></span>
						Connected to Convex
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Library</Card.Title>
					<Card.Description>Your media collection</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground mb-4">
						{$mediaQuery.data?.length ?? 0} items in library
					</p>
					<Button>Add Media</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</main>

<script lang="ts">
	const mediaQuery = useQuery(api.media.list, {});
</script>
```

Wait - that has a bug with duplicate script tags. Let me fix:

Replace `src/app/src/routes/+page.svelte`:
```svelte
<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "../convex/_generated/api";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { theme } from "$lib/stores/theme";

	const mediaQuery = useQuery(api.media.list, {});
</script>

<main class="min-h-screen bg-background p-8">
	<div class="max-w-4xl mx-auto">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-4xl font-bold">idkarr</h1>
				<p class="text-muted-foreground">Unified Media Manager</p>
			</div>
			<Button variant="outline" on:click={() => theme.toggle()}>
				{$theme === "dark" ? "☀️" : "🌙"}
			</Button>
		</div>

		{#if $mediaQuery.isLoading}
			<Card.Root>
				<Card.Content class="pt-6">
					<p>Loading...</p>
				</Card.Content>
			</Card.Root>
		{:else if $mediaQuery.error}
			<Card.Root class="border-destructive">
				<Card.Content class="pt-6">
					<p class="text-destructive">Error: {$mediaQuery.error.message}</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root class="mb-6">
				<Card.Header>
					<Card.Title>Status</Card.Title>
					<Card.Description>Backend connection status</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
						<span class="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400"></span>
						Connected to Convex
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Library</Card.Title>
					<Card.Description>Your media collection</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground mb-4">
						{$mediaQuery.data?.length ?? 0} items in library
					</p>
					<Button>Add Media</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</main>
```

**Step 4: Test dark mode**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun run dev &
```

Wait 5 seconds, open http://localhost:5173
Click the theme toggle button.
Expected: Theme switches between light and dark

Stop dev server: `pkill -f "vite"`

**Step 5: Commit**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
git add src/app/
git commit -m "feat: add dark mode support"
```

---

## Task 9: Run Biome Check and Fix

**Files:**
- Potentially modify any files with lint errors

**Step 1: Run Biome check**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
bunx biome check .
```

Note any errors reported.

**Step 2: Auto-fix issues**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
bunx biome check --write .
```

Expected: Issues auto-fixed where possible

**Step 3: Format all files**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
bunx biome format --write .
```

Expected: All files formatted

**Step 4: Verify no remaining issues**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
bunx biome check .
```

Expected: No errors (warnings acceptable)

**Step 5: Commit if changes**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
git add -A
git commit -m "style: apply Biome formatting"
```

---

## Task 10: Final Verification

**Step 1: Full dev server test**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun run dev &
```

Wait 5 seconds.

**Step 2: Verify all features**

Open http://localhost:5173 in browser.

Checklist:
- [ ] Page loads without errors
- [ ] "Connected to Convex" message shows
- [ ] Cards are styled correctly
- [ ] Theme toggle works (light/dark)
- [ ] No console errors

**Step 3: Stop dev server**

```bash
pkill -f "vite"
```

**Step 4: Verify build works**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr/src/app
bun run build
```

Expected: Build completes successfully

**Step 5: Final commit**

```bash
cd /Users/alex/REPOS/alexcatdad/idkarr
git add -A
git commit -m "feat: complete foundation setup

- Bun runtime
- Biome for linting/formatting
- SvelteKit frontend
- Convex backend with initial schema
- shadcn-svelte UI components
- Dark mode support
- Connected and working"
```

---

## Summary

After completing all tasks, you will have:

```
idkarr/
├── docs/                    # Existing documentation
├── src/
│   └── app/                 # SvelteKit application
│       ├── src/
│       │   ├── convex/      # Convex backend functions
│       │   │   ├── schema.ts
│       │   │   ├── media.ts
│       │   │   └── _generated/
│       │   ├── lib/
│       │   │   ├── components/ui/  # shadcn components
│       │   │   ├── stores/
│       │   │   └── utils.ts
│       │   ├── routes/
│       │   │   ├── +layout.svelte
│       │   │   └── +page.svelte
│       │   ├── app.css
│       │   └── app.html
│       ├── convex.json
│       ├── package.json
│       ├── svelte.config.js
│       ├── tailwind.config.js
│       └── vite.config.ts
├── biome.json
├── package.json
└── .gitignore
```

**Next Steps** (Phase 2):
1. Add Convex Auth for user authentication
2. Build media type pages (TV, Movies, Anime, Music)
3. Implement TMDB/TVDB metadata clients
4. Create add/edit media forms
