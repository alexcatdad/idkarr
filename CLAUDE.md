# idkarr - Claude Agent Instructions

## What is idkarr?

A unified media management application replacing **Sonarr, Radarr, Lidarr, Prowlarr, and Overseerr** with a single modern TypeScript application.

## Vision Document

**Read this first:** [IDKARR-VISION-unified-media-manager-replacing-sonarr-radarr-lidarr-prowlarr-overseerr.md](./IDKARR-VISION-unified-media-manager-replacing-sonarr-radarr-lidarr-prowlarr-overseerr.md)

This is the authoritative product specification. All implementation decisions should align with this document.

## Tech Stack

- **Frontend**: SvelteKit 5 + Tailwind CSS v4 + shadcn-svelte
- **Backend**: Convex (database, real-time, auth, serverless functions)
- **Runtime**: Bun
- **Tooling**: Biome (lint/format)

## Project Status

**Stage**: Architecting and scaffolding

## Key Commands

```bash
# Development
bun run dev          # Start SvelteKit dev server
bun run convex:dev   # Start Convex dev server

# Quality
bun run check        # Type check + lint
bun run check:fix    # Auto-fix lint issues
bun run format       # Format code
```

## Architecture Principles

1. **One library per media type** - No separate instances for 4K vs HD
2. **Custom formats are central** - Language, availability, quality all scored through custom formats
3. **Tags route everything** - Indexers, clients, profiles, delays all controlled via tags
4. **Smart defaults** - Works out of the box, complexity reveals itself as needed
5. **OAuth/OIDC only** - No local password management
6. **Webhooks for notifications** - No built-in Discord/Email integrations
