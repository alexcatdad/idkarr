# Deep Architecture: Sonarr Rebuild - Modern Tech Stack

## Table of Contents
1. [Technology Stack Selection](#technology-stack-selection)
2. [Frontend vs Backend Separation](#frontend-vs-backend-separation)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Feature Parity Matrix](#feature-parity-matrix)
6. [Integration Libraries](#integration-libraries)
7. [Best Practices & Patterns](#best-practices--patterns)

---

## Technology Stack Selection

### Backend Stack (Bun Runtime)

#### Core Framework: **Hono v4** ⭐ Best Choice
**Why Hono:**
- **Performance**: 2x faster than Express, 30% faster than Fastify
- **Type Safety**: 100% TypeScript, Zod schema validation built-in
- **Middleware**: Best middleware ecosystem in Node/Bun ecosystem
- **Standards**: Follows Web Standards (Request, Response, Headers)
- **Small**: 14KB minified (vs Express 57KB)
- **Bun Native**: Full support for Bun's performance benefits

**Alternatives Considered:**
- **Elysia v1**: Great, but Hono has better middleware ecosystem
- **Fastify**: Excellent, but requires polyfills on Bun
- **Express**: Mature, but slower and less type-safe

#### ORM: **Drizzle ORM v0.32** ⭐ Best Choice
**Why Drizzle:**
- **Performance**: 2-3x faster than Prisma for complex queries
- **Type Safety**: Excellent TypeScript inference, no codegen needed
- **SQL Control**: Full SQL access when needed
- **Bundle Size**: <50KB vs Prisma's 3MB+
- **Bun Native**: No extra compilation steps needed
- **Migrations**: Simple migration system

**Alternatives Considered:**
- **Prisma v6**: Great DX, but slower and larger bundle
- **Kysely**: Excellent, but Drizzle has better migrations
- **TypeORM**: Too heavy, poor TypeScript support

#### Real-Time: **Bun Native WebSockets** ⭐ Best Choice
**Why Bun WebSockets:**
- **Performance**: Native, no dependencies
- **Type Safety**: Full TypeScript support
- **Simplicity**: Simple API, no learning curve
- **Built-in**: No extra library needed

**Alternatives Considered:**
- **Socket.IO**: Too heavy, protocol overhead
- **WS**: Good, but Bun's native is better
- **Pusher**: Good for multi-server, but expensive

#### Task Queue: **BullMQ v5** ⭐ Best Choice
**Why BullMQ:**
- **Performance**: Redis-based, handles millions of jobs
- **Features**: Rate limiting, retries, delays, priorities
- **TypeScript**: Full TypeScript support
- **Distributed**: Supports multiple workers
- **Monitoring**: Built-in dashboard with Bull Board

**Alternatives Considered:**
- **Graphile Worker**: Great, but PostgreSQL-specific
- **Faktory**: Good, but BullMQ has better ecosystem
- **Bun Native**: Limited features

#### Authentication: **Lucia v3** ⭐ Best Choice
**Why Lucia:**
- **Type Safety**: Best TypeScript auth library
- **Flexibility**: Works with any database
- **Session Management**: Built-in session handling
- **Small**: <10KB bundle
- **Standards**: Follows Web Crypto API
- **Modern**: Designed for modern apps, not legacy

**Alternatives Considered:**
- **Auth.js (NextAuth)**: Great for Next.js, but framework-agnostic is better
- **Clerk**: Excellent, but expensive and SaaS
- **Supabase Auth**: Good, but vendor lock-in

#### Validation: **Zod v4** ⭐ Best Choice
**Why Zod:**
- **Type Safety**: Infer TypeScript types from schemas
- **Performance**: Fastest validation library
- **Composition**: Compose schemas easily
- **Bun Native**: No extra setup
- **Ecosystem**: Integrations with everything (Hono, Drizzle, etc.)

**Alternatives Considered:**
- **Yup**: Slower, less type-safe
- **Joi**: Older, less maintained
- **class-validator**: Class-based, less modern

#### File Upload: **@uploadthing/react v7** ⭐ Best Choice
**Why Uploadthing:**
- **Type Safety**: Full TypeScript support
- **Storage**: Built-in S3/R2/Uploadthing storage
- **File Processing**: Image resizing, optimization
- **Preview**: File previews built-in
- **Components**: React components ready to use
- **Bun Compatible**: Works with Bun

**Alternatives Considered:**
- **Multer**: Express-specific, older
- **Formidable**: Good, but less feature-rich
- **Uppy**: Powerful, but complex setup

#### Media Processing: **fluent-ffmpeg v2.1** ⭐ Best Choice
**Why fluent-ffmpeg:**
- **FFmpeg Wrapper**: Node/Bun wrapper for FFmpeg
- **Type Safety**: Full TypeScript support
- **Streams**: Stream-based processing
- **Cross-platform**: Works on all platforms

#### Email: **Resend v4** ⭐ Best Choice
**Why Resend:**
- **Modern**: Email API for developers
- **React Components**: Email templates in React
- **Analytics**: Built-in email analytics
- **Spam Filter**: Built-in spam filtering
- **Type Safety**: Full TypeScript

**Alternatives Considered:**
- **SendGrid**: Good, but expensive
- **Postmark**: Excellent, but less features
- **Nodemailer**: Low-level, more work

#### Logging: **Pino v9** ⭐ Best Choice
**Why Pino:**
- **Performance**: Fastest logging library
- **JSON Structured**: Easy to parse and analyze
- **Transports**: Many built-in transports
- **Bun Native**: Works perfectly
- **Child Loggers**: Scoped logging

#### Environment Config: **T3 Env v0.10** ⭐ Best Choice
**Why T3 Env:**
- **Type Safety**: Validate env vars at runtime and build time
- **Zod Integration**: Uses Zod for validation
- **Dotenv**: Supports .env files
- **Documentation**: Auto-generates env var documentation

---

### Frontend Stack (Next.js 15 App Router)

#### Framework: **Next.js 15 App Router** ⭐ Best Choice
**Why Next.js 15:**
- **Performance**: Server Components, partial prerendering
- **RSC**: React Server Components for better performance
- **App Router**: Modern file-based routing
- **API Routes**: Server actions for mutations
- **Image Optimization**: Built-in image optimization
- **Type Safety**: Full TypeScript support
- **Ecosystem**: Largest ecosystem, best DX

**Alternatives Considered:**
- **SvelteKit 5**: Excellent, but smaller ecosystem
- **Solid Start**: Great, but less mature
- **Remix**: Great, but Next.js has more features

#### UI Components: **shadcn/ui + Radix UI** ⭐ Best Choice
**Why shadcn/ui:**
- **Copy-Paste**: Components are your code, fully customizable
- **Radix Primitives**: Unstyled, accessible primitives
- **Tailwind**: Tailwind CSS based, easy to style
- **Type Safety**: Full TypeScript support
- **Modern**: Latest React patterns
- **Accessibility**: WCAG AA compliant out of box

**Alternatives Considered:**
- **MUI**: Heavy, opinionated
- **Chakra UI**: Good, but Tailwind is more popular
- **Park UI**: Good, but shadcn/ui is more popular

#### Styling: **Tailwind CSS v4** ⭐ Best Choice
**Why Tailwind v4:**
- **Performance**: Zero runtime, CSS variables
- **Developer Experience**: Best DX, IntelliSense
- **Bundle Size**: Only includes used styles
- **Dark Mode**: Built-in dark mode support
- **Responsive**: Mobile-first responsive design
- **Customization**: Easy to customize

#### State Management: **Zustand v5** ⭐ Best Choice
**Why Zustand:**
- **Simplicity**: Simple API, no boilerplate
- **Performance**: No unnecessary re-renders
- **Type Safety**: Full TypeScript support
- **Bundle Size**: <1KB
- **DevTools**: Built-in devtools
- **Middleware**: Persist, devtools, immer middleware

**Alternatives Considered:**
- **Jotai**: Excellent, but Zustand is simpler
- **TanStack Store**: Great, but less mature
- **Redux**: Too much boilerplate

#### Data Fetching: **TanStack Query v5** ⭐ Best Choice
**Why TanStack Query:**
- **Caching**: Intelligent caching and invalidation
- **Background Updates**: Automatic background refetching
- **Optimistic Updates**: Built-in optimistic updates
- **Type Safety**: Full TypeScript support
- **DevTools**: Excellent devtools
- **Pagination**: Built-in pagination and infinite scroll

**Alternatives Considered:**
- **SWR**: Good, but TanStack Query has more features
- **React Query**: Same as TanStack Query
- **Apollo GraphQL**: Overkill for REST

#### Forms: **React Hook Form v7 + Zod** ⭐ Best Choice
**Why React Hook Form:**
- **Performance**: Minimal re-renders
- **Type Safety**: Full TypeScript support
- **Validation**: Integrates with Zod, Yup, etc.
- **Bundle Size**: <10KB
- **Accessibility**: Built-in accessibility

**Alternatives Considered:**
- **Conform v1**: Excellent, but less mature
- **Formik**: Slower, more boilerplate
- **React Final Form**: Less maintained

#### Date Handling: **date-fns v4** ⭐ Best Choice
**Why date-fns:**
- **Modular**: Import only what you need
- **Immutable**: Pure functions
- **Type Safety**: Full TypeScript support
- **Time Zones**: Time zone support with date-fns-tz
- **Bundle Size**: Tree-shakeable

**Alternatives Considered:**
- **Day.js**: Good, but less feature-rich
- **Luxon**: Heavier, slower
- **Moment.js**: Deprecated

#### Icons: **Lucide React v0.454** ⭐ Best Choice
**Why Lucide React:**
- **Consistency**: Consistent icon style
- **Tree-shakeable**: Import only icons you use
- **Type Safety**: Full TypeScript support
- **SVG**: SVG-based, scalable
- **Modern**: Modern, clean design
- **Updates**: Regular updates

**Alternatives Considered:**
- **Radix Icons**: Good, but fewer icons
- **Heroicons**: Good, but Tailwind-specific
- **Phosphor Icons**: Good, but less popular

#### Charts: **Recharts v2** ⭐ Best Choice
**Why Recharts:**
- **Declarative**: Declarative components
- **Type Safety**: Full TypeScript support
- **Responsive**: Built-in responsive design
- **Animations**: Smooth animations
- **Customizable**: Easy to customize

**Alternatives Considered:**
- **Chart.js**: Good, but imperative API
- **Victory**: Good, but less popular
- **Nivo**: Excellent, but heavier

#### Animations: **Framer Motion v12** ⭐ Best Choice
**Why Framer Motion:**
- **Declarative**: Declarative animations
- **Gestures**: Gesture support
- **Type Safety**: Full TypeScript support
- **Performance**: Hardware accelerated
- **Variants**: Variant-based animations

**Alternatives Considered:**
- **React Spring**: Good, but less type-safe
- **Auto Animate**: Great, but less control
- **Motion One**: Good, but less mature

#### PDF Generation: **@react-pdf/renderer v4** ⭐ Best Choice
**Why @react-pdf/renderer:**
- **React**: Build PDFs with React components
- **Type Safety**: Full TypeScript support
- **Streaming**: Stream PDFs
- **Styling**: Flexbox-based styling

#### File Input: **React Dropzone v14** ⭐ Best Choice
**Why React Dropzone:**
- **Type Safety**: Full TypeScript support
- **Drag & Drop**: Built-in drag & drop
- **Accessibility**: Accessible
- **Customizable**: Highly customizable

#### Virtualization: **@tanstack/react-window v3** ⭐ Best Choice
**Why TanStack Virtual:**
- **Performance**: Virtualize large lists
- **Type Safety**: Full TypeScript support
- **Flexible**: Grid, list, and dynamic virtualization
- **Smooth**: Smooth scrolling

#### Toast Notifications: **Sonner v2** ⭐ Best Choice
**Why Sonner:**
- **Type Safety**: Full TypeScript support
- **Animations**: Smooth animations
- **Positioning**: Multiple positions
- **Dismissal**: Auto-dismissal

---

### DevOps & Infrastructure

#### Container Runtime: **Bun Docker** ⭐ Best Choice
**Why Bun Docker:**
- **Performance**: Fast container builds
- **Size**: Small base images
- **Multi-stage**: Multi-stage builds

#### Process Manager: **PM2** (Production) or **bun run --watch** (Dev)

#### Reverse Proxy: **Caddy v2** ⭐ Best Choice
**Why Caddy:**
- **Automatic HTTPS**: Let's Encrypt built-in
- **Simple**: Simple configuration
- **Performance**: Fast

#### Database: **PostgreSQL 16** ⭐ Best Choice
**Why PostgreSQL 16:**
- **Performance**: Latest performance improvements
- **Features**: JSON, Full-text search, arrays
- **Extensions**: PostGIS, pg_trgm, etc.
- **Reliability**: Most reliable database

#### Cache: **Redis 8** ⭐ Best Choice
**Why Redis 8:**
- **Performance**: Fastest in-memory database
- **Features**: Pub/Sub, Streams, Transactions
- **Persistence**: AOF + RDB persistence
- **Scaling**: Clustering support

#### Monitoring: **Sentry v8** ⭐ Best Choice
**Why Sentry:**
- **Error Tracking**: Best error tracking
- **Performance Monitoring**: Performance monitoring
- **Type Safety**: TypeScript source maps
- **Bun Support**: Full Bun support

#### Logging: **Logtail v2** (Cloudflare) ⭐ Best Choice
**Why Logtail:**
- **Performance**: Fast log delivery
- **Search**: Powerful search
- **Type Safety**: Structured logging
- **Bun Support**: Full Bun support

#### CI/CD: **GitHub Actions** ⭐ Best Choice
**Why GitHub Actions:**
- **Free**: Free for public repos
- **Ecosystem**: Largest action ecosystem
- **Bun Support**: Full Bun support
- **Speed**: Fast workflows

---

## Frontend vs Backend Separation

### Clear Boundary Definition

#### Backend Responsibilities (Bun + Hono)
- **Business Logic**: All business rules and validations
- **Data Access**: Database operations via Drizzle
- **External APIs**: Third-party API integrations (TVDB, TMDB)
- **Authentication**: Auth tokens, sessions, permissions
- **File Operations**: File uploads, deletions, moves
- **Background Jobs**: Scheduled tasks, queue processing
- **Real-time**: WebSocket connections, broadcasts
- **Data Transformation**: Parsing, formatting, aggregation
- **Caching**: Redis caching strategies
- **Logging**: Application logging
- **Monitoring**: Health checks, metrics

#### Frontend Responsibilities (Next.js)
- **UI Rendering**: All UI components and layouts
- **User Input**: Forms, buttons, interactions
- **State Management**: Local UI state (modals, drawers, filters)
- **Routing**: Page navigation
- **Data Fetching**: API calls via TanStack Query
- **Real-time Updates**: WebSocket listeners
- **Optimistic Updates**: UI updates before API response
- **Client-side Validation**: Form validation before submission
- **User Preferences**: Theme, language, UI settings
- **Accessibility**: Keyboard navigation, screen readers

#### Shared Responsibilities
- **Type Definitions**: TypeScript interfaces/models
- **Validation Schemas**: Zod schemas (used both sides)
- **Error Codes**: Consistent error codes
- **API Contracts**: Request/response formats
- **Constants**: Shared constants (e.g., quality types)

---

## Backend Architecture

### Directory Structure

```
backend/
├── src/
│   ├── app/                      # Hono app setup
│   │   ├── index.ts             # Hono app entry
│   │   ├── routes/              # Route handlers
│   │   │   ├── index.ts
│   │   │   ├── api/            # API routes
│   │   │   │   ├── v3/
│   │   │   │   │   ├── series/
│   │   │   │   │   ├── episodes/
│   │   │   │   │   ├── queue/
│   │   │   │   │   ├── release/
│   │   │   │   │   ├── indexer/
│   │   │   │   │   ├── download/
│   │   │   │   │   ├── history/
│   │   │   │   │   ├── calendar/
│   │   │   │   │   ├── wanted/
│   │   │   │   │   ├── settings/
│   │   │   │   │   ├── system/
│   │   │   │   │   └── import/
│   │   │   │   └── ws/          # WebSocket routes
│   │   │   └── health/
│   │   ├── middleware/          # Hono middleware
│   │   │   ├── auth.ts
│   │   │   ├── cors.ts
│   │   │   ├── logging.ts
│   │   │   ├── error.ts
│   │   │   ├── ratelimit.ts
│   │   │   └── validation.ts
│   │   └── websocket/          # WebSocket handler
│   │       ├── server.ts
│   │       ├── rooms.ts
│   │       └── broadcasts.ts
│   │
│   ├── core/                     # Domain logic (no HTTP)
│   │   ├── tv/                  # Series, Episode, Season
│   │   │   ├── services/
│   │   │   │   ├── series.service.ts
│   │   │   │   ├── episode.service.ts
│   │   │   │   ├── season.service.ts
│   │   │   │   └── add-series.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── series.repository.ts
│   │   │   │   ├── episode.repository.ts
│   │   │   │   └── season.repository.ts
│   │   │   ├── parsers/
│   │   │   │   ├── title.parser.ts
│   │   │   │   └── metadata.parser.ts
│   │   │   └── schemas/
│   │   │       ├── series.schema.ts
│   │   │       ├── episode.schema.ts
│   │   │       └── season.schema.ts
│   │   │
│   │   ├── indexer/             # RSS/Torrent indexers
│   │   │   ├── services/
│   │   │   │   ├── indexer.service.ts
│   │   │   │   ├── rss.service.ts
│   │   │   │   └── torznab.service.ts
│   │   │   ├── clients/
│   │   │   │   ├── broadcasthenet.client.ts
│   │   │   │   ├── filelist.client.ts
│   │   │   │   └── ...
│   │   │   ├── repositories/
│   │   │   │   └── indexer.repository.ts
│   │   │   ├── parsers/
│   │   │   │   ├── rss.parser.ts
│   │   │   │   ├── release.parser.ts
│   │   │   │   └── quality.parser.ts
│   │   │   └── schemas/
│   │   │       └── indexer.schema.ts
│   │   │
│   │   ├── download/            # Download clients
│   │   │   ├── services/
│   │   │   │   ├── download-client.service.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   └── completed-download.service.ts
│   │   │   ├── clients/
│   │   │   │   ├── base.client.ts
│   │   │   │   ├── sabnzbd.client.ts
│   │   │   │   ├── nzbget.client.ts
│   │   │   │   ├── qBittorrent.client.ts
│   │   │   │   └── transmission.client.ts
│   │   │   ├── repositories/
│   │   │   │   └── download-client.repository.ts
│   │   │   └── schemas/
│   │   │       └── download-client.schema.ts
│   │   │
│   │   ├── parser/              # Release/Episode parsing
│   │   │   ├── services/
│   │   │   │   ├── parser.service.ts
│   │   │   │   ├── quality-parser.service.ts
│   │   │   │   ├── language-parser.service.ts
│   │   │   │   └── series-parser.service.ts
│   │   │   ├── patterns/
│   │   │   │   ├── quality.patterns.ts
│   │   │   │   ├── language.patterns.ts
│   │   │   │   ├── season.patterns.ts
│   │   │   │   └── anime.patterns.ts
│   │   │   └── models/
│   │   │       ├── parsed-release.ts
│   │   │       ├── parsed-quality.ts
│   │   │       └── parsed-episode.ts
│   │   │
│   │   ├── decision-engine/     # Release scoring
│   │   │   ├── services/
│   │   │   │   ├── decision.service.ts
│   │   │   │   ├── scoring.service.ts
│   │   │   │   ├── prioritization.service.ts
│   │   │   │   └── rejection.service.ts
│   │   │   ├── specifications/
│   │   │   │   ├── quality.spec.ts
│   │   │   │   ├── protocol.spec.ts
│   │   │   │   ├── language.spec.ts
│   │   │   │   ├── size.spec.ts
│   │   │   │   └── custom-format.spec.ts
│   │   │   └── models/
│   │   │       ├── decision.ts
│   │   │       └── rejection.ts
│   │   │
│   │   ├── custom-format/       # Custom formats
│   │   │   ├── services/
│   │   │   │   └── custom-format.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── custom-format.repository.ts
│   │   │   ├── specifications/
│   │   │   │   ├── release-title.spec.ts
│   │   │   │   ├── release-group.spec.ts
│   │   │   │   ├── indexer-flag.spec.ts
│   │   │   │   └── language.spec.ts
│   │   │   └── schemas/
│   │   │       └── custom-format.schema.ts
│   │   │
│   │   ├── quality/             # Quality profiles
│   │   │   ├── services/
│   │   │   │   └── quality-profile.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── quality-profile.repository.ts
│   │   │   └── schemas/
│   │   │       └── quality-profile.schema.ts
│   │   │
│   │   ├── media-files/         # File operations
│   │   │   ├── services/
│   │   │   │   ├── media-file.service.ts
│   │   │   │   ├── episode-file.service.ts
│   │   │   │   ├── import.service.ts
│   │   │   │   ├── scan.service.ts
│   │   │   │   └── upgrade.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── episode-file.repository.ts
│   │   │   ├── processors/
│   │   │   │   ├── ffprobe.processor.ts
│   │   │   │   └── video-validator.processor.ts
│   │   │   └── schemas/
│   │   │       └── episode-file.schema.ts
│   │   │
│   │   ├── organizer/           # File renaming
│   │   │   ├── services/
│   │   │   │   ├── organizer.service.ts
│   │   │   │   ├── naming-config.service.ts
│   │   │   │   └── renaming.service.ts
│   │   │   ├── formatters/
│   │   │   │   ├── naming.formatter.ts
│   │   │   │   ├── season-folder.formatter.ts
│   │   │   │   └── series-folder.formatter.ts
│   │   │   └── schemas/
│   │   │       └── naming-config.schema.ts
│   │   │
│   │   ├── notifications/        # Notifications
│   │   │   ├── services/
│   │   │   │   └── notification.service.ts
│   │   │   ├── clients/
│   │   │   │   ├── base.client.ts
│   │   │   │   ├── discord.client.ts
│   │   │   │   ├── telegram.client.ts
│   │   │   │   ├── email.client.ts
│   │   │   │   ├── gotify.client.ts
│   │   │   │   ├── join.client.ts
│   │   │   │   └── apprise.client.ts
│   │   │   ├── repositories/
│   │   │   │   └── notification.repository.ts
│   │   │   └── schemas/
│   │   │       └── notification.schema.ts
│   │   │
│   │   ├── metadata/            # TVDB/TMDB metadata
│   │   │   ├── services/
│   │   │   │   ├── metadata.service.ts
│   │   │   │   ├── tvdb.service.ts
│   │   │   │   ├── tmdb.service.ts
│   │   │   │   └── refresh.service.ts
│   │   │   ├── clients/
│   │   │   │   ├── tvdb.client.ts
│   │   │   │   └── tmdb.client.ts
│   │   │   ├── parsers/
│   │   │   │   ├── series.parser.ts
│   │   │   │   ├── episode.parser.ts
│   │   │   │   └── image.parser.ts
│   │   │   └── repositories/
│   │   │       └── metadata.repository.ts
│   │   │
│   │   ├── import-list/         # Import lists
│   │   │   ├── services/
│   │   │   │   ├── import-list.service.ts
│   │   │   │   └── sync.service.ts
│   │   │   ├── clients/
│   │   │   │   ├── trakt.client.ts
│   │   │   │   ├── imdb.client.ts
│   │   │   │   ├── plex.client.ts
│   │   │   │   └── tmdb.client.ts
│   │   │   └── repositories/
│   │   │       └── import-list.repository.ts
│   │   │
│   │   ├── history/             # History
│   │   │   ├── services/
│   │   │   │   └── history.service.ts
│   │   │   └── repositories/
│   │   │       └── history.repository.ts
│   │   │
│   │   ├── blocklist/           # Blocklist
│   │   │   ├── services/
│   │   │   │   └── blocklist.service.ts
│   │   │   └── repositories/
│   │   │       └── blocklist.repository.ts
│   │   │
│   │   ├── tags/                # Tags
│   │   │   ├── services/
│   │   │   │   └── tag.service.ts
│   │   │   └── repositories/
│   │   │       └── tag.repository.ts
│   │   │
│   │   ├── root-folder/         # Root folders
│   │   │   ├── services/
│   │   │   │   ├── root-folder.service.ts
│   │   │   │   └── disk-space.service.ts
│   │   │   └── repositories/
│   │   │       └── root-folder.repository.ts
│   │   │
│   │   ├── system/              # System
│   │   │   ├── services/
│   │   │   │   ├── health.service.ts
│   │   │   │   ├── backup.service.ts
│   │   │   │   └── update.service.ts
│   │   │   └── repositories/
│   │   │       └── config.repository.ts
│   │   │
│   │   └── shared/              # Shared domain logic
│   │       ├── models/          # Domain models
│   │       │   ├── series.model.ts
│   │       │   ├── episode.model.ts
│   │       │   ├── quality.model.ts
│   │       │   └── language.model.ts
│   │       ├── types/           # Shared types
│   │       │   ├── quality.types.ts
│   │       │   ├── language.types.ts
│   │       │   └── release.types.ts
│   │       └── utils/           # Domain utils
│   │           ├── date.util.ts
│   │           ├── format.util.ts
│   │           └── string.util.ts
│   │
│   ├── jobs/                     # Background jobs (BullMQ)
│   │   ├── workers/
│   │   │   ├── rss.worker.ts
│   │   │   ├── import.worker.ts
│   │   │   ├── organize.worker.ts
│   │   │   ├── refresh.worker.ts
│   │   │   └── health.worker.ts
│   │   ├── queues/
│   │   │   ├── rss.queue.ts
│   │   │   ├── import.queue.ts
│   │   │   ├── organize.queue.ts
│   │   │   └── notification.queue.ts
│   │   ├── processors/
│   │   │   ├── rss.processor.ts
│   │   │   ├── import.processor.ts
│   │   │   └── organize.processor.ts
│   │   └── schedulers/
│   │       ├── rss.scheduler.ts
│   │       ├── refresh.scheduler.ts
│   │       └── cleanup.scheduler.ts
│   │
│   ├── db/                       # Database layer (Drizzle)
│   │   ├── schema/              # Drizzle schema
│   │   │   ├── series.schema.ts
│   │   │   ├── episode.schema.ts
│   │   │   ├── quality.schema.ts
│   │   │   ├── indexer.schema.ts
│   │   │   ├── download.schema.ts
│   │   │   ├── history.schema.ts
│   │   │   ├── notification.schema.ts
│   │   │   └── tag.schema.ts
│   │   ├── migrations/           # Database migrations
│   │   │   ├── 0001_initial.sql
│   │   │   ├── 0002_add_custom_formats.sql
│   │   │   └── ...
│   │   ├── seed/
│   │   │   ├── qualities.seed.ts
│   │   │   ├── languages.seed.ts
│   │   │   └── quality-profiles.seed.ts
│   │   ├── client.ts            # Drizzle client
│   │   └── connection.ts        # DB connection
│   │
│   ├── cache/                    # Cache layer (Redis)
│   │   ├── client.ts            # Redis client
│   │   ├── repositories/
│   │   │   ├── cache.repository.ts
│   │   │   ├── series.cache.ts
│   │   │   └── indexer.cache.ts
│   │   └── keys/                # Cache key constants
│   │       └── cache-keys.ts
│   │
│   ├── lib/                      # Infrastructure
│   │   ├── config/              # Configuration
│   │   │   ├── index.ts
│   │   │   ├── database.config.ts
│   │   │   ├── redis.config.ts
│   │   │   └── app.config.ts
│   │   ├── logger/              # Logging (Pino)
│   │   │   ├── index.ts
│   │   │   └── formatters.ts
│   │   ├── validation/          # Validation (Zod)
│   │   │   ├── index.ts
│   │   │   └── validators.ts
│   │   ├── errors/              # Custom errors
│   │   │   ├── index.ts
│   │   │   ├── http-error.ts
│   │   │   └── business-error.ts
│   │   ├── storage/             # File storage
│   │   │   ├── local.storage.ts
│   │   │   ├── s3.storage.ts
│   │   │   └── r2.storage.ts
│   │   └── pubsub/              # Pub/Sub (Redis)
│   │       └── publisher.ts
│   │
│   ├── workers/                  # Bun workers
│   │   ├── parser.worker.ts     # Release parsing
│   │   ├── decision.worker.ts   # Decision engine
│   │   └── import.worker.ts     # File import
│   │
│   └── types/                    # Shared types
│       ├── api/                 # API types
│       │   ├── series.api.ts
│       │   ├── episode.api.ts
│       │   └── queue.api.ts
│       ├── models/              # Database models
│       │   ├── series.model.ts
│       │   └── episode.model.ts
│       └── index.ts
│
├── drizzle.config.ts             # Drizzle config
├── env.d.ts                      # Environment types
├── package.json
└── tsconfig.json
```

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js 15 App Router
│   │   ├── (dashboard)/         # Dashboard layout group
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── series/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── edit/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── add/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── delete/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── season-pass/
│   │   │   │       └── page.tsx
│   │   │   ├── episodes/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── calendar/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── week/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── month/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── day/
│   │   │   │       └── page.tsx
│   │   │   ├── activity/
│   │   │   │   ├── queue/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── history/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── blocklist/
│   │   │   │       └── page.tsx
│   │   │   ├── wanted/
│   │   │   │   ├── missing/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── cutoff/
│   │   │   │       └── page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── media-management/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── profiles/
│   │   │   │   │   ├── quality/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── edit/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── delay/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── edit/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── custom-formats/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── edit/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   └── index/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── connect/
│   │   │   │   │   ├── indexer/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── edit/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── download-client/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── edit/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── import-list/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── edit/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   └── notification/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       ├── [id]/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       ├── new/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       └── edit/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── general/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── ui/
│   │   │   │       └── page.tsx
│   │   │   ├── system/
│   │   │   │   ├── status/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── tasks/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── backup/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── logs/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── files/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── updates/
│   │   │   │       └── page.tsx
│   │   │   └── add-series/
│   │   │       ├── page.tsx
│   │   │       ├── import/
│   │   │       │   └── page.tsx
│   │   │       └── new/
│   │   │           └── page.tsx
│   │   │
│   │   ├── (settings)/          # Settings layout group
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/                  # API routes (server actions)
│   │   │   ├── v3/
│   │   │   │   ├── series/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── episodes/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── queue/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── release/
│   │   │   │   │   └── route.ts
│   │   │   │   └── ...
│   │   │   ├── trpc/
│   │   │   │   └── [...trpc]/route.ts
│   │   │   └── websocket/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   ├── error.tsx            # Error page
│   │   ├── not-found.tsx         # Not found page
│   │   └── loading.tsx           # Loading page
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── form.tsx
│   │   │   ├── label.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── command.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── resizable.tsx
│   │   │   ├── data-table.tsx
│   │   │   └── date-picker.tsx
│   │   │
│   │   ├── series/              # Series components
│   │   │   ├── series-card.tsx
│   │   │   ├── series-list.tsx
│   │   │   ├── series-grid.tsx
│   │   │   ├── series-details.tsx
│   │   │   ├── series-editor.tsx
│   │   │   ├── series-poster.tsx
│   │   │   ├── series-search.tsx
│   │   │   ├── series-badges.tsx
│   │   │   ├── season-pass.tsx
│   │   │   ├── season-row.tsx
│   │   │   └── add-series-modal.tsx
│   │   │
│   │   ├── episode/             # Episode components
│   │   │   ├── episode-list.tsx
│   │   │   ├── episode-row.tsx
│   │   │   ├── episode-details.tsx
│   │   │   ├── episode-editor.tsx
│   │   │   ├── episode-search.tsx
│   │   │   ├── episode-badges.tsx
│   │   │   └── episode-status.tsx
│   │   │
│   │   ├── queue/               # Queue components
│   │   │   ├── queue-list.tsx
│   │   │   ├── queue-row.tsx
│   │   │   ├── queue-status.tsx
│   │   │   ├── queue-progress.tsx
│   │   │   ├── queue-actions.tsx
│   │   │   └── queue-filter.tsx
│   │   │
│   │   ├── calendar/            # Calendar components
│   │   │   ├── calendar-view.tsx
│   │   │   ├── calendar-day.tsx
│   │   │   ├── calendar-week.tsx
│   │   │   ├── calendar-month.tsx
│   │   │   ├── calendar-event.tsx
│   │   │   └── calendar-filter.tsx
│   │   │
│   │   ├── activity/            # Activity components
│   │   │   ├── history-list.tsx
│   │   │   ├── history-row.tsx
│   │   │   ├── blocklist-list.tsx
│   │   │   └── blocklist-row.tsx
│   │   │
│   │   ├── wanted/              # Wanted components
│   │   │   ├── missing-list.tsx
│   │   │   ├── missing-row.tsx
│   │   │   ├── cutoff-list.tsx
│   │   │   └── cutoff-row.tsx
│   │   │
│   │   ├── settings/            # Settings components
│   │   │   ├── indexer-settings.tsx
│   │   │   ├── download-client-settings.tsx
│   │   │   ├── quality-profile-editor.tsx
│   │   │   ├── delay-profile-editor.tsx
│   │   │   ├── custom-format-editor.tsx
│   │   │   ├── notification-settings.tsx
│   │   │   ├── import-list-settings.tsx
│   │   │   ├── naming-settings.tsx
│   │   │   ├── media-management-settings.tsx
│   │   │   └── ui-settings.tsx
│   │   │
│   │   ├── system/              # System components
│   │   │   ├── status-dashboard.tsx
│   │   │   ├── task-list.tsx
│   │   │   ├── log-viewer.tsx
│   │   │   ├── backup-list.tsx
│   │   │   └── update-checker.tsx
│   │   │
│   │   ├── shared/              # Shared components
│   │   │   ├── page-header.tsx
│   │   │   ├── page-content.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── loading-state.tsx
│   │   │   ├── error-state.tsx
│   │   │   ├── icon.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── image.tsx
│   │   │   ├── tag-badge.tsx
│   │   │   ├── quality-badge.tsx
│   │   │   ├── language-badge.tsx
│   │   │   ├── status-badge.tsx
│   │   │   ├── date-display.tsx
│   │   │   ├── file-size-display.tsx
│   │   │   ├── search-input.tsx
│   │   │   ├── filter-bar.tsx
│   │   │   ├── sort-bar.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── keyboard-shortcuts.tsx
│   │   │   └── command-palette.tsx
│   │   │
│   │   ├── layout/              # Layout components
│   │   │   ├── app-layout.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── main.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── command-palette-trigger.tsx
│   │   │
│   │   └── charts/              # Chart components
│   │       ├── stats-chart.tsx
│   │       ├── storage-chart.tsx
│   │       ├── activity-chart.tsx
│   │       └── indexer-chart.tsx
│   │
│   ├── lib/                      # Infrastructure
│   │   ├── api/                 # API client
│   │   │   ├── client.ts        # Fetch client
│   │   │   ├── series.ts
│   │   │   ├── episode.ts
│   │   │   ├── queue.ts
│   │   │   ├── release.ts
│   │   │   ├── indexer.ts
│   │   │   ├── download-client.ts
│   │   │   ├── quality-profile.ts
│   │   │   ├── custom-format.ts
│   │   │   ├── notification.ts
│   │   │   ├── import-list.ts
│   │   │   ├── history.ts
│   │   │   ├── blocklist.ts
│   │   │   ├── calendar.ts
│   │   │   ├── system.ts
│   │   │   └── websocket.ts
│   │   │
│   │   ├── trpc/                # tRPC client
│   │   │   └── client.ts
│   │   │
│   │   ├── websocket/            # WebSocket client
│   │   │   ├── client.ts
│   │   │   ├── hooks.ts
│   │   │   └── events.ts
│   │   │
│   │   ├── query/                # TanStack Query
│   │   │   ├── client.ts        # Query client
│   │   │   ├── series.query.ts
│   │   │   ├── episode.query.ts
│   │   │   ├── queue.query.ts
│   │   │   └── cache.ts
│   │   │
│   │   ├── stores/               # Zustand stores
│   │   │   ├── series.store.ts
│   │   │   ├── ui.store.ts
│   │   │   ├── settings.store.ts
│   │   │   ├── filter.store.ts
│   │   │   ├── sort.store.ts
│   │   │   └── keyboard.store.ts
│   │   │
│   │   ├── hooks/                # Custom hooks
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-throttle.ts
│   │   │   ├── use-media-query.ts
│   │   │   ├── use-local-storage.ts
│   │   │   ├── use-keyboard-shortcuts.ts
│   │   │   ├── use-websocket.ts
│   │   │   ├── use-command-palette.ts
│   │   │   └── use-prefers-reduced-motion.ts
│   │   │
│   │   ├── utils/                # Utilities
│   │   │   ├── date.ts
│   │   │   ├── format.ts
│   │   │   ├── string.ts
│   │   │   ├── number.ts
│   │   │   ├── file.ts
│   │   │   ├── quality.ts
│   │   │   ├── language.ts
│   │   │   └── cn.ts            # Classnames utility
│   │   │
│   │   ├── constants/            # Constants
│   │   │   ├── quality.ts
│   │   │   ├── language.ts
│   │   │   ├── index.ts
│   │   │   └── routes.ts
│   │   │
│   │   └── validators/          # Zod validators
│   │       ├── series.validator.ts
│   │       ├── episode.validator.ts
│   │       └── settings.validator.ts
│   │
│   ├── types/                    # TypeScript types
│   │   ├── api/                 # API response types
│   │   │   ├── series.api.ts
│   │   │   ├── episode.api.ts
│   │   │   ├── queue.api.ts
│   │   │   └── index.ts
│   │   ├── models/              # Model types
│   │   │   ├── series.model.ts
│   │   │   ├── episode.model.ts
│   │   │   ├── quality.model.ts
│   │   │   └── index.ts
│   │   ├── components/          # Component props
│   │   │   ├── series.ts
│   │   │   ├── episode.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── config/                   # Configuration
│   │   ├── site.ts              # Site config
│   │   └── env.ts               # Env config
│   │
│   └── styles/                  # Styles
│       └── globals.css          # Tailwind imports
│
├── public/                      # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── drizzle.config.ts             # Drizzle config (shared)
├── next.config.ts               # Next.js config
├── tailwind.config.ts           # Tailwind config
├── tsconfig.json                # TypeScript config
├── components.json              # shadcn/ui config
└── package.json
```

---

## Feature Parity Matrix

| Feature | Sonarr v5 | Implementation Priority | Backend | Frontend |
|---------|-----------|------------------------|---------|----------|
| **TV Management** |
| Series CRUD | ✅ | P0 | Series Service | Series Pages |
| Series Metadata Sync | ✅ | P0 | TVDB/TMDB Service | Series Details |
| Episode List | ✅ | P0 | Episode Service | Episode Pages |
| Episode Monitoring | ✅ | P0 | Episode Service | Episode Toggle |
| Season Management | ✅ | P0 | Season Service | Season Pass |
| Season Folder | ✅ | P0 | Organizer Service | Settings |
| Series Statistics | ✅ | P1 | Stats Service | Series Details |
| Series Search | ✅ | P0 | Search Service | Add Series |
| Series Images | ✅ | P0 | Media Service | Series Posters |
| Series Renaming | ✅ | P1 | Organizer Service | Series Settings |
| Series Move | ✅ | P1 | Organizer Service | Series Edit |
| Series Deletion | ✅ | P0 | Series Service | Series Actions |
| Episode Deletion | ✅ | P0 | Episode Service | Episode Actions |
| Episode File Import | ✅ | P0 | Import Service | Auto |
| Episode File Upgrade | ✅ | P1 | Upgrade Service | Auto |
| Episode Manual Search | ✅ | P0 | Release Search | Episode Page |
| Episode Automatic Search | ✅ | P0 | RSS Worker | Auto |
| Episode Rescue | ✅ | P2 | Rescue Service | Episode Actions |
| **Indexers** |
| RSS Feed Polling | ✅ | P0 | RSS Worker | Settings |
| Torznab/Newznab Protocol | ✅ | P0 | Torznab Service | Settings |
| Torrent Trackers | ✅ | P0 | Tracker Clients | Settings |
| Usenet Indexers | ✅ | P0 | Usenet Clients | Settings |
| Indexer Rate Limiting | ✅ | P0 | Rate Limiter | Auto |
| Indexer Status Tracking | ✅ | P1 | Indexer Service | Settings |
| Release Parsing | ✅ | P0 | Parser Service | Auto |
| Quality Parsing | ✅ | P0 | Quality Parser | Auto |
| Language Parsing | ✅ | P0 | Language Parser | Auto |
| Scene Numbering | ✅ | P1 | Scene Parser | Settings |
| Anime Parsing | ✅ | P2 | Anime Parser | Settings |
| **Download Clients** |
| SABnzbd Integration | ✅ | P0 | SABnzbd Client | Settings |
| NZBGet Integration | ✅ | P0 | NZBGet Client | Settings |
| qBittorrent Integration | ✅ | P0 | qBittorrent Client | Settings |
| Transmission Integration | ✅ | P0 | Transmission Client | Settings |
| uTorrent Integration | ✅ | P0 | uTorrent Client | Settings |
| Deluge Integration | ✅ | P0 | Deluge Client | Settings |
| rTorrent Integration | ✅ | P0 | rTorrent Client | Settings |
| Download Status Tracking | ✅ | P0 | Queue Service | Queue Page |
| Download Progress | ✅ | P0 | Queue Service | Queue Progress |
| Download Speed Display | ✅ | P1 | Queue Service | Queue Row |
| ETA Calculation | ✅ | P1 | Queue Service | Queue Row |
| Failed Download Handling | ✅ | P0 | Download Service | Auto |
| Automatic Import | ✅ | P0 | Import Worker | Auto |
| Manual Import | ✅ | P0 | Import Service | Import Page |
| Interactive Import | ✅ | P1 | Import Service | Import Page |
| Import History | ✅ | P1 | History Service | History Page |
| **Decision Engine** |
| Quality Profile Matching | ✅ | P0 | Decision Service | Quality Settings |
| Custom Format Matching | ✅ | P0 | Decision Service | Custom Formats |
| Release Scoring | ✅ | P0 | Scoring Service | Auto |
| Release Prioritization | ✅ | P1 | Priority Service | Auto |
| Release Rejection | ✅ | P0 | Rejection Service | Auto |
| Protocol Preference | ✅ | P1 | Decision Service | Settings |
| Propers/Repacks Handling | ✅ | P1 | Decision Service | Settings |
| Size Constraints | ✅ | P1 | Decision Service | Settings |
| Season Pack Handling | ✅ | P1 | Decision Service | Settings |
| Language Preference | ✅ | P0 | Decision Service | Settings |
| Indexer Preference | ✅ | P1 | Decision Service | Settings |
| **Quality Profiles** |
| Quality Definition Management | ✅ | P0 | Quality Service | Quality Settings |
| Quality Profile CRUD | ✅ | P0 | Quality Service | Quality Settings |
| Cutoff Quality | ✅ | P0 | Quality Service | Quality Settings |
| Upgrade Logic | ✅ | P0 | Upgrade Service | Quality Settings |
| Quality Size Limits | ✅ | P1 | Quality Service | Quality Settings |
| **Custom Formats** |
| Custom Format CRUD | ✅ | P0 | Custom Format Service | Custom Format Settings |
| Format Specifications | ✅ | P0 | Specification Service | Format Editor |
| Release Title Matching | ✅ | P0 | Title Spec | Format Editor |
| Release Group Matching | ✅ | P0 | Group Spec | Format Editor |
| Indexer Flag Matching | ✅ | P0 | Flag Spec | Format Editor |
| Language Matching | ✅ | P0 | Language Spec | Format Editor |
| Format Testing | ✅ | P1 | Test Service | Format Editor |
| Format Scoring | ✅ | P0 | Scoring Service | Auto |
| **Naming & Organization** |
| Naming Pattern Editor | ✅ | P0 | Naming Service | Naming Settings |
| Series Naming | ✅ | P0 | Organizer Service | Auto |
| Season Naming | ✅ | P0 | Organizer Service | Auto |
| Episode Naming | ✅ | P0 | Organizer Service | Auto |
| File Renaming | ✅ | P0 | Organizer Service | Auto |
| File Moving | ✅ | P0 | Organizer Service | Auto |
| Season Folder Creation | ✅ | P0 | Organizer Service | Auto |
| Root Folder Management | ✅ | P0 | Root Folder Service | Settings |
| Disk Space Monitoring | ✅ | P1 | Disk Service | Settings |
| **Notifications** |
| Discord Notifications | ✅ | P0 | Discord Client | Settings |
| Telegram Notifications | ✅ | P0 | Telegram Client | Settings |
| Email Notifications | ✅ | P0 | Email Client | Settings |
| Gotify Notifications | ✅ | P1 | Gotify Client | Settings |
| Join Notifications | ✅ | P1 | Join Client | Settings |
| Pushover Notifications | ✅ | P1 | Pushover Client | Settings |
| Slack Notifications | ✅ | P2 | Slack Client | Settings |
| Notifiarr Notifications | ✅ | P2 | Notifiarr Client | Settings |
| Webhook Notifications | ✅ | P1 | Webhook Client | Settings |
| Apprise Notifications | ✅ | P0 | Apprise Client | Settings |
| Notification on Grab | ✅ | P0 | Notification Service | Settings |
| Notification on Import | ✅ | P0 | Notification Service | Settings |
| Notification on Failure | ✅ | P1 | Notification Service | Settings |
| **History & Tracking** |
| Download History | ✅ | P0 | History Service | History Page |
| History Filtering | ✅ | P1 | History Service | History Page |
| History Statistics | ✅ | P2 | History Service | History Page |
| Blocklist | ✅ | P0 | Blocklist Service | Blocklist Page |
| Blocklist CRUD | ✅ | P0 | Blocklist Service | Blocklist Page |
| Queue | ✅ | P0 | Queue Service | Queue Page |
| Queue Filtering | ✅ | P1 | Queue Service | Queue Page |
| Queue Actions | ✅ | P0 | Queue Service | Queue Page |
| **Calendar** |
| Calendar View | ✅ | P0 | Calendar Service | Calendar Pages |
| Month View | ✅ | P0 | Calendar Service | Calendar Page |
| Week View | ✅ | P1 | Calendar Service | Calendar Page |
| Day View | ✅ | P1 | Calendar Service | Calendar Page |
| Calendar Filtering | ✅ | P1 | Calendar Service | Calendar Page |
| Calendar Export | ✅ | P2 | Calendar Service | Calendar Page |
| **Wanted** |
| Missing Episodes | ✅ | P0 | Wanted Service | Wanted Pages |
| Cutoff Unmet Episodes | ✅ | P0 | Wanted Service | Wanted Pages |
| Manual Search | ✅ | P0 | Search Service | Wanted Pages |
| Automatic Search | ✅ | P0 | RSS Worker | Auto |
| **Import Lists** |
| Trakt Integration | ✅ | P0 | Trakt Client | Settings |
| IMDB Integration | ✅ | P0 | IMDB Client | Settings |
| Plex Integration | ✅ | P0 | Plex Client | Settings |
| TVMaze Integration | ✅ | P0 | TVMaze Client | Settings |
| Import List Sync | ✅ | P0 | Sync Service | Auto |
| Import List CRUD | ✅ | P0 | Import List Service | Settings |
| **Tags** |
| Tag CRUD | ✅ | P0 | Tag Service | Tag Settings |
| Tag Assignment | ✅ | P0 | Tag Service | Series Editor |
| Tag Filtering | ✅ | P1 | Tag Service | Series List |
| **System** |
| Health Checks | ✅ | P0 | Health Service | System Page |
| Task Scheduling | ✅ | P0 | Scheduler Service | Tasks Page |
| Backup/Restore | ✅ | P1 | Backup Service | Backup Page |
| Log Viewing | ✅ | P1 | Log Service | Logs Page |
| Log Files | ✅ | P1 | Log Service | Logs Page |
| Update Checking | ✅ | P1 | Update Service | Updates Page |
| Config Management | ✅ | P0 | Config Service | Settings |
| **User Interface** |
| Dark Mode | ✅ | P0 | - | UI Store |
| Responsive Design | ✅ | P0 | - | Layout |
| Keyboard Shortcuts | ✅ | P1 | - | Keyboard Hook |
| Search (Cmd+K) | ✅ | P1 | Search API | Command Palette |
| Dashboard | ✅ | P1 | - | Dashboard Page |
| Series Grid/List | ✅ | P0 | - | Series Page |
| Filtering | ✅ | P0 | - | Filter Components |
| Sorting | ✅ | P0 | - | Sort Components |
| Pagination | ✅ | P0 | - | Pagination Component |
| Real-time Updates | ✅ | P1 | WebSocket | WebSocket Hook |
| **Metadata Sources** |
| TVDB Integration | ✅ | P0 | TVDB Client | Settings |
| TMDB Integration | ✅ | P0 | TMDB Client | Settings |
| Fanart Integration | ✅ | P1 | Fanart Client | Auto |
| **Advanced** |
| API Keys | ✅ | P0 | Auth Service | Settings |
| Multi-user | ✅ | P2 | - | - |
| Permissions | ✅ | P2 | - | - |
| Profiles | ✅ | P2 | - | - |

**Priority Legend:**
- P0: Core functionality, required for MVP
- P1: Important features, nice to have in first release
- P2: Advanced features, can be added later

---

## Integration Libraries

### Metadata Sources

#### TVDB API v4
**Library**: `@tvd/api-sdk` (Unofficial) or Custom Client
**Purpose**: Primary metadata source for series and episodes
**Features**:
- Series information
- Episode information
- Images (posters, fanart)
- Artwork
**Usage**:
```typescript
import { TVDBClient } from '@/core/metadata/clients/tvdb.client';

const client = new TVDBClient({ apiKey: process.env.TVDB_API_KEY });
const series = await client.getSeries(tvdbId);
```

#### TMDB API v3
**Library**: `moviedb-promise` or Custom Client
**Purpose**: Secondary metadata source, artwork
**Features**:
- Series information
- Images (high quality posters, backdrops)
- Trailers
**Usage**:
```typescript
import { TMDBClient } from '@/core/metadata/clients/tmdb.client';

const client = new TMDBClient({ apiKey: process.env.TMDB_API_KEY });
const images = await client.getImages(tvdbId);
```

### Download Clients

#### SABnzbd
**Library**: Custom client using `fetch`
**API**: SABnzbd API v1.2
**Features**: Queue, history, pause, resume, priority

#### NZBGet
**Library**: Custom client using `fetch`
**API**: NZBGet RPC
**Features**: Queue, history, pause, resume, post-processing

#### qBittorrent
**Library**: `qbittorrent-api-v2` or Custom client
**API**: qBittorrent Web API v2
**Features**: Torrent management, priorities, categories

#### Transmission
**Library**: `transmission-client` or Custom client
**API**: Transmission RPC
**Features**: Torrent management, priorities, queue

### Notification Services

#### Discord
**Library**: `discord.js` or `@discordjs/rest`
**API**: Discord Webhook API
**Features**: Rich embeds, webhooks

#### Telegram
**Library**: `node-telegram-bot-api`
**API**: Telegram Bot API
**Features**: Messages, markdown, buttons

#### Email
**Library**: `resend`
**API**: SMTP / Email API
**Features**: HTML emails, attachments

#### Gotify
**Library**: Custom client using `fetch`
**API**: Gotify REST API
**Features**: Push notifications, priority

#### Join
**Library`: `@joingroup/join-api` or Custom client
**API**: Join REST API
**Features**: Push notifications, SMS, voice

#### Slack
**Library**: `@slack/web-api`
**API**: Slack Webhook API
**Features**: Messages, attachments

#### Apprise
**Library**: `apprise-api-promise`
**API**: Apprise REST API
**Features**: 80+ notification services

### Import Lists

#### Trakt
**Library**: `trakt.tv` or Custom client
**API**: Trakt API v2
**Features**: Lists, watchlist, collection

#### IMDB
**Library**: `@mark.probst/imdb-api` or Custom client
**API**: IMDB Data API
**Features**: Lists, ratings

#### Plex
**Library**: `@jellyfin/sdk` (similar API) or Custom client
**API**: Plex Media Server API
**Features**: Library, watchlist

### Torrent Trackers

#### BroadcastHeNet
**Library**: Custom client using `fetch`
**Protocol**: Torrent
**Features**: RSS, search, API

#### FileList
**Library**: Custom client using `fetch`
**Protocol**: Torrent
**Features**: RSS, search, API

#### HDBits
**Library**: Custom client using `fetch`
**Protocol**: Torrent
**Features**: RSS, search, API

#### Others
- Gazelle
- REDacted
- Orpheus
- PassThePopcorn
- BTN
---

## Best Practices & Patterns

### Backend Best Practices

#### 1. Dependency Injection
Use constructor injection for services, avoid global state.

```typescript
// Good
class SeriesService {
  constructor(
    private readonly repository: SeriesRepository,
    private readonly metadataService: MetadataService,
    private readonly logger: Logger,
  ) {}

  async getById(id: number) {
    this.logger.info({ id }, 'Getting series');
    const series = await this.repository.findById(id);
    return series;
  }
}

// Bad
class SeriesService {
  private repository = new SeriesRepository();
  private logger = new Logger();

  async getById(id: number) {
    // ...
  }
}
```

#### 2. Repository Pattern
Separate data access logic from business logic.

```typescript
// Repository
export class SeriesRepository {
  async findById(id: number): Promise<Series | null> {
    const result = await db.query.series.findFirst({
      where: eq(series.id, id),
      with: {
        episodes: true,
        qualityProfile: true,
      },
    });
    return result || null;
  }

  async findAll(): Promise<Series[]> {
    return db.query.series.findMany();
  }
}

// Service
export class SeriesService {
  async getById(id: number): Promise<SeriesDto> {
    const series = await this.repository.findById(id);
    if (!series) {
      throw new NotFoundError('Series not found', 'series', id);
    }
    return this.toDto(series);
  }
}
```

#### 3. Error Handling
Use typed errors and consistent error responses.

```typescript
// Custom errors
export class NotFoundError extends HttpError {
  constructor(
    message: string,
    public readonly resource: string,
    public readonly id: number,
  ) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends HttpError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

// Error middleware
export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof HttpError) {
      return c.json(
        {
          error: error.name,
          message: error.message,
          details: error.details,
        },
        error.status,
      );
    }

    logger.error('Unhandled error', { error });

    return c.json(
      {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
};
```

#### 4. Validation
Use Zod for validation, validate at boundaries.

```typescript
// Schemas
export const createSeriesSchema = z.object({
  tvdbId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  qualityProfileId: z.number().int().positive(),
  rootFolderPath: z.string().min(1),
  path: z.string().optional(),
  monitored: z.boolean().default(true),
  seasonFolder: z.boolean().default(true),
  tags: z.array(z.number()).default([]),
});

export type CreateSeriesDto = z.infer<typeof createSeriesSchema>;

// Route handler
export async function createSeriesHandler(c: Context) {
  const body = await c.req.json();

  // Validate
  const result = createSeriesSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid request data', result.error);
  }

  const dto = result.data;

  // Business logic
  const series = await seriesService.create(dto);

  return c.json({ data: series }, 201);
}
```

#### 5. Background Jobs
Use BullMQ for background processing.

```typescript
// Queue setup
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

export const rssQueue = new Queue('rss', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const rssWorker = new Worker(
  'rss',
  async (job) => {
    const { indexerId } = job.data;
    logger.info({ indexerId, jobId: job.id }, 'Processing RSS job');

    const releases = await rssService.fetch(indexerId);

    // Process releases
    await processReleases(releases);

    logger.info({ indexerId, jobId: job.id }, 'RSS job completed');
  },
  {
    connection,
    concurrency: 5,
  },
);

// Add job
await rssQueue.add('fetch', { indexerId: 1 }, {
  repeat: { every: 15 * 60 * 1000 }, // Every 15 minutes
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});
```

#### 6. Caching
Use Redis for caching, cache aggressively.

```typescript
// Cache repository
export class SeriesCache {
  private readonly TTL = 60 * 60 * 24; // 24 hours

  async get(id: number): Promise<Series | null> {
    const key = `series:${id}`;
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  async set(id: number, series: Series): Promise<void> {
    const key = `series:${id}`;
    await redis.setex(key, this.TTL, JSON.stringify(series));
  }

  async invalidate(id: number): Promise<void> {
    const key = `series:${id}`;
    await redis.del(key);
  }
}

// Cached repository
export class CachedSeriesRepository {
  async findById(id: number): Promise<Series | null> {
    const cached = await seriesCache.get(id);
    if (cached) {
      logger.debug({ id }, 'Cache hit for series');
      return cached;
    }

    const series = await seriesRepository.findById(id);
    if (series) {
      await seriesCache.set(id, series);
    }

    return series;
  }

  async update(id: number, data: Partial<Series>): Promise<Series> {
    const series = await seriesRepository.update(id, data);
    await seriesCache.invalidate(id);
    return series;
  }
}
```

#### 7. Event-Driven Architecture
Use Redis pub/sub for events.

```typescript
// Publisher
export class EventPublisher {
  async publish(event: DomainEvent): Promise<void> {
    const channel = 'events';
    const message = JSON.stringify(event);
    await redis.publish(channel, message);
    logger.info({ event }, 'Published event');
  }
}

// Subscriber
export class EventSubscriber {
  async subscribe(): Promise<void> {
    const subscriber = redis.duplicate();
    await subscriber.subscribe('events');

    subscriber.on('message', (channel, message) => {
      const event = JSON.parse(message);
      this.handle(event);
    });
  }

  private async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case 'SeriesCreated':
        await notificationService.send(event);
        break;
      case 'EpisodeImported':
        await websocketService.broadcast(event);
        break;
    }
  }
}
```

#### 8. WebSocket
Use Bun WebSockets for real-time.

```typescript
// WebSocket server
export class WebSocketServer {
  private rooms = new Map<string, Set<WebSocket>>();

  handleUpgrade(req: Request): Response | undefined {
    const upgrade = req.headers.get('upgrade');
    if (upgrade !== 'websocket') {
      return;
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      this.handleConnection(socket);
    };

    socket.onmessage = (event) => {
      this.handleMessage(socket, event.data);
    };

    socket.onclose = () => {
      this.handleDisconnection(socket);
    };

    socket.onerror = (error) => {
      logger.error({ error }, 'WebSocket error');
    };

    return response;
  }

  handleConnection(socket: WebSocket) {
    logger.info('WebSocket connected');
  }

  handleMessage(socket: WebSocket, data: string) {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'subscribe':
        this.subscribe(socket, message.room);
        break;
      case 'unsubscribe':
        this.unsubscribe(socket, message.room);
        break;
    }
  }

  subscribe(socket: WebSocket, room: string) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(socket);
    logger.info({ room }, 'Subscribed to room');
  }

  broadcast(room: string, message: unknown) {
    const clients = this.rooms.get(room);
    if (!clients) return;

    const data = JSON.stringify(message);
    for (const client of clients) {
      client.send(data);
    }

    logger.info({ room, clients: clients.size }, 'Broadcasted message');
  }
}
```

### Frontend Best Practices

#### 1. Server Components
Use Server Components for initial data, Client Components for interactivity.

```typescript
// Server Component
import { getSeries } from '@/lib/api/series';
import { SeriesList } from './series-list';

export default async function SeriesPage() {
  const series = await getSeries();

  return (
    <div>
      <h1>Series</h1>
      <SeriesList series={series} />
    </div>
  );
}

// Client Component
'use client';

import { useState } from 'react';

interface SeriesListProps {
  series: Series[];
}

export function SeriesList({ series }: SeriesListProps) {
  const [filter, setFilter] = useState('');

  const filtered = series.filter(s =>
    s.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter series"
      />
      <ul>
        {filtered.map(s => (
          <li key={s.id}>{s.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### 2. TanStack Query
Use TanStack Query for server state, avoid manual useEffect for data fetching.

```typescript
// Query hook
export function useSeries(id: number) {
  return useQuery({
    queryKey: ['series', id],
    queryFn: () => getSeries(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSeriesList() {
  return useQuery({
    queryKey: ['series'],
    queryFn: () => getSeries(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Mutation
export function useUpdateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateSeriesParams) => updateSeries(id, data),
    onSuccess: (data, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['series', id] });
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
  });
}

// Component
export function SeriesDetails({ id }: { id: number }) {
  const { data: series, isLoading, error } = useSeries(id);
  const updateSeries = useUpdateSeries();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      <h1>{series.title}</h1>
      <button
        onClick={() => updateSeries.mutate({ id, data: { monitored: !series.monitored } })}
      >
        {series.monitored ? 'Unmonitor' : 'Monitor'}
      </button>
    </div>
  );
}
```

#### 3. Optimistic Updates
Update UI immediately, rollback on error.

```typescript
export function useToggleMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seriesId, monitored }: ToggleMonitorParams) => toggleMonitor(seriesId, monitored),
    onMutate: async ({ seriesId, monitored }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['series', seriesId] });

      // Snapshot previous value
      const previousSeries = queryClient.getQueryData<Series>(['series', seriesId]);

      // Optimistically update
      queryClient.setQueryData<Series>(['series', seriesId], (old) => ({
        ...old!,
        monitored,
      }));

      return { previousSeries };
    },
    onError: (error, { seriesId }, context) => {
      // Rollback on error
      queryClient.setQueryData(['series', seriesId], context.previousSeries);
    },
    onSettled: (data, error, { seriesId }) => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] });
    },
  });
}
```

#### 4. WebSocket Hook
Use custom hook for WebSocket connections.

```typescript
export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ws');

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const subscribe = useCallback((room: string) => {
    if (socket && connected) {
      socket.send(JSON.stringify({ type: 'subscribe', room }));
    }
  }, [socket, connected]);

  const onMessage = useCallback((callback: (event: MessageEvent) => void) => {
    if (socket) {
      socket.onmessage = callback;
    }
  }, [socket]);

  return { socket, connected, subscribe, onMessage };
}
```

#### 5. Form Handling
Use React Hook Form + Zod.

```typescript
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  qualityProfileId: z.number().min(1, 'Quality profile is required'),
  monitored: z.boolean(),
  tags: z.array(z.number()),
});

type FormData = z.infer<typeof schema>;

export function SeriesEditor({ series }: SeriesEditorProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: series.title,
      qualityProfileId: series.qualityProfileId,
      monitored: series.monitored,
      tags: series.tags,
    },
  });

  const updateSeries = useUpdateSeries();

  const onSubmit = async (data: FormData) => {
    await updateSeries.mutate({ id: series.id, data });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Series</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* More fields */}
            <Button type="submit">Save</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

#### 6. Error Boundaries
Use error boundaries for component-level error handling.

```typescript
'use client';

import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div>
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

#### 7. Performance
Use React.memo, useMemo, useCallback strategically.

```typescript
// React.memo for expensive components
export const SeriesCard = memo(function SeriesCard({ series }: { series: Series }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{series.title}</CardTitle>
      </CardHeader>
      <CardContent>{series.overview}</CardContent>
    </Card>
  );
});

// useMemo for expensive calculations
export function SeriesList({ series }: { series: Series[] }) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    return series.filter(s =>
      s.title.toLowerCase().includes(filter.toLowerCase())
    );
  }, [series, filter]);

  return (
    <div>
      {filtered.map(s => (
        <SeriesCard key={s.id} series={s} />
      ))}
    </div>
  );
}

// useCallback for callbacks passed to children
export function SeriesList({ series }: { series: Series[] }) {
  const [filter, setFilter] = useState('');

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value);
  }, []);

  const filtered = useMemo(() => {
    return series.filter(s =>
      s.title.toLowerCase().includes(filter.toLowerCase())
    );
  }, [series, filter]);

  return (
    <div>
      <FilterBar value={filter} onChange={handleFilterChange} />
      {filtered.map(s => (
        <SeriesCard key={s.id} series={s} />
      ))}
    </div>
  );
}
```

#### 8. Accessibility
Use semantic HTML, ARIA, and keyboard navigation.

```typescript
// Good - accessible
export function SeriesCard({ series, onSelect, onEdit }: SeriesCardProps) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(series.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(series.id);
        }
      }}
      aria-label={`Select ${series.title}`}
    >
      <img src={series.poster} alt={series.title} />
      <h2>{series.title}</h2>
      <p aria-label={`Status: ${series.status}`}>{series.status}</p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(series.id);
        }}
        aria-label={`Edit ${series.title}`}
      >
        Edit
      </button>
    </article>
  );
}

// Bad - not accessible
export function SeriesCard({ series, onSelect, onEdit }: SeriesCardProps) {
  return (
    <div onClick={() => onSelect(series.id)}>
      <img src={series.poster} alt="" />
      <h2>{series.title}</h2>
      <p>{series.status}</p>
      <button onClick={() => onEdit(series.id)}>Edit</button>
    </div>
  );
}
```

---

*This deep architecture document provides a comprehensive foundation for rebuilding Sonarr with modern technologies and best practices. Adjust as needed based on specific requirements and team preferences.*