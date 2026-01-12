# UI/UX Specification

> **idkarr** - User interface and experience design specification

## Table of Contents

1. [Overview](#overview)
2. [Design System](#design-system)
3. [Layout Architecture](#layout-architecture)
4. [Navigation](#navigation)
5. [Page Specifications](#page-specifications)
6. [Component Library](#component-library)
7. [Interaction Patterns](#interaction-patterns)
8. [Responsive Design](#responsive-design)
9. [Accessibility](#accessibility)
10. [Theming](#theming)

---

## Overview

### Design Principles

1. **Clarity**: Information hierarchy should be immediately apparent
2. **Efficiency**: Common tasks should require minimal clicks
3. **Consistency**: Similar actions should behave similarly across the app
4. **Feedback**: Every action should provide clear visual feedback
5. **Progressive Disclosure**: Show essential info first, details on demand

### Technology Stack

```typescript
// Frontend stack
const uiStack = {
  framework: 'Next.js 15',
  styling: 'Tailwind CSS 4',
  components: 'shadcn/ui',
  icons: 'Lucide React',
  forms: 'React Hook Form + Zod',
  state: 'TanStack Query + Zustand',
  tables: 'TanStack Table',
  charts: 'Recharts',
  dnd: '@dnd-kit',
  virtualList: '@tanstack/react-virtual',
};
```

---

## Design System

### Color Palette

```typescript
const colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Semantic colors
  success: {
    light: '#dcfce7',
    default: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    light: '#fef3c7',
    default: '#f59e0b',
    dark: '#b45309',
  },
  error: {
    light: '#fee2e2',
    default: '#ef4444',
    dark: '#b91c1c',
  },
  info: {
    light: '#dbeafe',
    default: '#3b82f6',
    dark: '#1d4ed8',
  },

  // Status colors (quality-specific)
  quality: {
    bluray: '#9333ea',    // Purple
    webdl: '#3b82f6',     // Blue
    webrip: '#06b6d4',    // Cyan
    hdtv: '#22c55e',      // Green
    dvd: '#eab308',       // Yellow
    unknown: '#6b7280',   // Gray
  },

  // Background (dark mode)
  background: {
    primary: '#0f0f23',
    secondary: '#1a1a2e',
    tertiary: '#252538',
    elevated: '#2d2d44',
  },

  // Text
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
    disabled: '#475569',
  },
};
```

### Typography

```typescript
const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};
```

### Spacing Scale

```typescript
const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
};
```

### Shadows

```typescript
const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  card: '0 0 0 1px rgb(255 255 255 / 0.05), 0 4px 6px -1px rgb(0 0 0 / 0.2)',
  glow: '0 0 20px rgb(59 130 246 / 0.3)',
};
```

### Border Radius

```typescript
const borderRadius = {
  none: '0',
  sm: '0.125rem',  // 2px
  default: '0.25rem', // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  full: '9999px',
};
```

---

## Layout Architecture

### App Shell

```
┌──────────────────────────────────────────────────────────────┐
│  Header (64px)                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Logo   Navigation            Search    User    Notif   │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐ ┌─────────────────────────────────────────────┐ │
│  │         │ │  Page Header                                │ │
│  │ Sidebar │ │  ─────────────────────────────────────────  │ │
│  │ (240px) │ │                                             │ │
│  │         │ │  Main Content Area                          │ │
│  │  - TV   │ │                                             │ │
│  │  - Mov  │ │  (scrollable)                               │ │
│  │  - Cal  │ │                                             │ │
│  │  - Act  │ │                                             │ │
│  │  - Set  │ │                                             │ │
│  │         │ │                                             │ │
│  └─────────┘ └─────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Layout Component

```tsx
interface LayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-background-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Grid System

```typescript
const gridSystem = {
  // Container widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Grid columns
  columns: 12,
  gutter: '1.5rem', // 24px

  // Common layouts
  layouts: {
    poster: 'repeat(auto-fill, minmax(150px, 1fr))',
    card: 'repeat(auto-fill, minmax(300px, 1fr))',
    table: '1fr',
  },
};
```

---

## Navigation

### Primary Navigation

```tsx
interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
  children?: NavItem[];
}

const primaryNavigation: NavItem[] = [
  {
    id: 'tv',
    label: 'TV Series',
    icon: Tv,
    href: '/series',
    badge: 0,
    children: [
      { id: 'tv-library', label: 'Library', href: '/series' },
      { id: 'tv-add', label: 'Add New', href: '/series/add' },
      { id: 'tv-calendar', label: 'Calendar', href: '/series/calendar' },
    ],
  },
  {
    id: 'movies',
    label: 'Movies',
    icon: Film,
    href: '/movies',
    children: [
      { id: 'movies-library', label: 'Library', href: '/movies' },
      { id: 'movies-add', label: 'Add New', href: '/movies/add' },
      { id: 'movies-discover', label: 'Discover', href: '/movies/discover' },
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: Activity,
    href: '/activity',
    badge: 3, // Active downloads
    children: [
      { id: 'queue', label: 'Queue', href: '/activity/queue' },
      { id: 'history', label: 'History', href: '/activity/history' },
      { id: 'blocklist', label: 'Blocklist', href: '/activity/blocklist' },
    ],
  },
  {
    id: 'requests',
    label: 'Requests',
    icon: MessageSquare,
    href: '/requests',
    badge: 5, // Pending requests
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings',
  },
  {
    id: 'system',
    label: 'System',
    icon: Server,
    href: '/system',
    children: [
      { id: 'status', label: 'Status', href: '/system/status' },
      { id: 'tasks', label: 'Tasks', href: '/system/tasks' },
      { id: 'logs', label: 'Logs', href: '/system/logs' },
      { id: 'updates', label: 'Updates', href: '/system/updates' },
    ],
  },
];
```

### Breadcrumbs

```tsx
interface BreadcrumbItem {
  label: string;
  href?: string;
}

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-text-muted" />
          )}
          {item.href ? (
            <Link href={item.href} className="text-text-secondary hover:text-primary-500">
              {item.label}
            </Link>
          ) : (
            <span className="text-text-primary">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
```

---

## Page Specifications

### Series Library Page

```
┌──────────────────────────────────────────────────────────────┐
│  TV Series                                    [+ Add Series] │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search...   [Status ▼] [Quality ▼] [Tags ▼] [Sort ▼] │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Showing 156 series                                [⊞] [≡]  │
│                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │     │ │     │ │     │ │     │ │     │ │     │ │     │   │
│  │ IMG │ │ IMG │ │ IMG │ │ IMG │ │ IMG │ │ IMG │ │ IMG │   │
│  │     │ │     │ │     │ │     │ │     │ │     │ │     │   │
│  ├─────┤ ├─────┤ ├─────┤ ├─────┤ ├─────┤ ├─────┤ ├─────┤   │
│  │Title│ │Title│ │Title│ │Title│ │Title│ │Title│ │Title│   │
│  │ 5/10│ │10/10│ │ 3/8 │ │ 0/6 │ │12/12│ │ 8/24│ │ 4/4 │   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│                                                              │
│  [Load More]                                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Series Detail Page

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Library                                           │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  FANART BACKGROUND IMAGE                                │  │
│  │                                                         │  │
│  │  ┌─────────┐  Series Title (2024)                      │  │
│  │  │         │  ⭐ 8.5  |  🎭 Drama  |  📺 Netflix       │  │
│  │  │ POSTER  │                                            │  │
│  │  │         │  Series overview text goes here...         │  │
│  │  │         │                                            │  │
│  │  └─────────┘  [Monitored ✓] [Search] [⋮]               │  │
│  │                                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [Overview] [Episodes] [Files] [History] [Settings]          │
│  ═══════════════════════════════════════════════════════════ │
│                                                              │
│  Season 1  ────────────────────────────  [Select All] [🔍]   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ☐  01  │  Pilot            │  Jan 15  │ ✓ 1080p    │ ⋮│  │
│  │ ☐  02  │  Episode Two      │  Jan 22  │ ✓ 1080p    │ ⋮│  │
│  │ ☐  03  │  Episode Three    │  Jan 29  │ ⏳ Missing │ ⋮│  │
│  │ ☐  04  │  Episode Four     │  Feb 05  │ ⏳ Missing │ ⋮│  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Season 2  (Coming Soon)                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Activity Queue Page

```
┌──────────────────────────────────────────────────────────────┐
│  Activity > Queue                                            │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  Currently Processing: 3  │  Queued: 12  │  Paused: 2        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Series Name - S01E05 - Episode Title                   │  │
│  │ ████████████████████░░░░░░░░░░  75% @ 12.5 MB/s       │  │
│  │ Source: NZBgeek  │  Client: SABnzbd  │  ETA: 5m        │  │
│  │                                          [⏸] [✕] [⋮]  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Movie Name (2024)                                      │  │
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░  25% @ 8.2 MB/s        │  │
│  │ Source: Torznab  │  Client: qBittorrent  │  ETA: 45m   │  │
│  │                                          [⏸] [✕] [⋮]  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Queued ─────────────────────────────────────────────────    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Series Name - S02E01 - Episode Title      │ Waiting    │  │
│  │ Series Name - S02E02 - Episode Title      │ Waiting    │  │
│  │ Another Series - S01E12 - Finale          │ Waiting    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Settings Page Structure

```
┌──────────────────────────────────────────────────────────────┐
│  Settings                                                    │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  ┌──────────────┐  ┌──────────────────────────────────────┐  │
│  │              │  │  Media Management                    │  │
│  │ ▶ Media Mgmt │  │  ────────────────────────────────────│  │
│  │   Profiles   │  │                                      │  │
│  │   Quality    │  │  Root Folders                        │  │
│  │   Indexers   │  │  ┌────────────────────────────────┐  │  │
│  │   Download   │  │  │ /media/tv     │ 2.1 TB free   │  │  │
│  │   Import     │  │  │ /media/movies │ 1.8 TB free   │  │  │
│  │   Connect    │  │  └────────────────────────────────┘  │  │
│  │   Metadata   │  │  [+ Add Root Folder]                 │  │
│  │   Tags       │  │                                      │  │
│  │   General    │  │  File Management                     │  │
│  │   UI         │  │  ☑ Rename Episodes                   │  │
│  │              │  │  ☑ Replace Illegal Characters        │  │
│  │   ─────────  │  │  ☑ Create Empty Folders              │  │
│  │   Backup     │  │  ☐ Delete Empty Folders              │  │
│  │   Logs       │  │                                      │  │
│  │   About      │  │  [Save Changes]                      │  │
│  │              │  │                                      │  │
│  └──────────────┘  └──────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Library

### Button Variants

```tsx
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
}

// Usage examples
<Button variant="primary">Add Series</Button>
<Button variant="outline" leftIcon={Search}>Search</Button>
<Button variant="danger" loading>Delete</Button>
<Button variant="ghost" size="sm">Cancel</Button>
```

### Card Components

```tsx
interface MediaCardProps {
  title: string;
  year?: number;
  posterUrl?: string;
  progress?: { current: number; total: number };
  status?: 'continuing' | 'ended' | 'upcoming';
  quality?: QualityProfile;
  monitored?: boolean;
  onClick?: () => void;
}

function MediaCard({ title, posterUrl, progress, status }: MediaCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-background-secondary">
      {/* Poster */}
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={posterUrl ?? '/placeholder-poster.png'}
          alt={title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>

      {/* Overlay on hover */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex gap-2">
          <Button variant="primary" size="sm">View</Button>
          <Button variant="outline" size="sm">Edit</Button>
        </div>
      </div>

      {/* Status badge */}
      {status && (
        <Badge
          className="absolute right-2 top-2"
          variant={status === 'continuing' ? 'success' : 'secondary'}
        >
          {status}
        </Badge>
      )}

      {/* Progress bar */}
      {progress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-background-tertiary">
          <div
            className="h-full bg-primary-500 transition-all"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Title */}
      <div className="p-3">
        <h3 className="truncate text-sm font-medium">{title}</h3>
        {progress && (
          <p className="text-xs text-text-secondary">
            {progress.current}/{progress.total} episodes
          </p>
        )}
      </div>
    </div>
  );
}
```

### Data Table

```tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  pagination?: PaginationState;
  sorting?: SortingState;
  selection?: RowSelectionState;
  onPaginationChange?: (state: PaginationState) => void;
  onSortingChange?: (state: SortingState) => void;
  onSelectionChange?: (state: RowSelectionState) => void;
}

// Episode table columns example
const episodeColumns: ColumnDef<Episode>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
  },
  {
    accessorKey: 'episodeNumber',
    header: '#',
    cell: ({ row }) => (
      <span className="font-mono">{row.original.episodeNumber.toString().padStart(2, '0')}</span>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.original.title}</span>
        {row.original.unverifiedSceneNumbering && (
          <Tooltip content="Scene numbering may differ">
            <AlertCircle className="h-4 w-4 text-warning-default" />
          </Tooltip>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'airDateUtc',
    header: 'Air Date',
    cell: ({ row }) => formatDate(row.original.airDateUtc),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <EpisodeStatusBadge episode={row.original} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => <EpisodeActions episode={row.original} />,
  },
];
```

### Modal/Dialog

```tsx
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}

// Add Series Modal
function AddSeriesModal({ open, onOpenChange }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Add New Series</DialogTitle>
          <DialogDescription>
            Search for a TV series to add to your library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SearchInput
            placeholder="Search for series..."
            onSearch={handleSearch}
          />

          <div className="max-h-96 overflow-y-auto">
            {searchResults.map(series => (
              <SearchResultItem
                key={series.tvdbId}
                series={series}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAdd} disabled={!selected}>
            Add Series
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Toast Notifications

```tsx
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // ms, default 5000
}

// Usage
toast.success({
  title: 'Series Added',
  description: 'Breaking Bad has been added to your library',
  action: {
    label: 'View',
    onClick: () => router.push('/series/1'),
  },
});

toast.error({
  title: 'Download Failed',
  description: 'Unable to connect to download client',
});
```

---

## Interaction Patterns

### Loading States

```tsx
// Skeleton loading for cards
function MediaCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-lg bg-background-tertiary" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-background-tertiary" />
        <div className="h-3 w-1/2 rounded bg-background-tertiary" />
      </div>
    </div>
  );
}

// Inline loading spinner
function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size])} />
  );
}

// Full page loading
function PageLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}
```

### Empty States

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-background-tertiary p-4">
        <Icon className="h-8 w-8 text-text-muted" />
      </div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-2 max-w-sm text-text-secondary">{description}</p>
      {action && (
        <Button variant="primary" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Usage
<EmptyState
  icon={Tv}
  title="No Series Found"
  description="You haven't added any TV series to your library yet."
  action={{
    label: 'Add Series',
    onClick: () => setAddModalOpen(true),
  }}
/>
```

### Drag and Drop

```tsx
// Priority queue reordering
function QueueList({ items }: { items: QueueItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveId(event.active.id)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {items.map(item => (
          <SortableQueueItem key={item.id} item={item} />
        ))}
      </SortableContext>

      <DragOverlay>
        {activeId && (
          <QueueItemCard item={items.find(i => i.id === activeId)!} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

### Keyboard Navigation

```typescript
const keyboardShortcuts = {
  // Global
  '/': 'Focus search',
  'g h': 'Go to home',
  'g s': 'Go to series',
  'g m': 'Go to movies',
  'g a': 'Go to activity',
  '?': 'Show keyboard shortcuts',

  // Series/Movie pages
  'a': 'Add new',
  'f': 'Toggle filters',
  'v': 'Toggle view (grid/list)',

  // Detail pages
  'e': 'Edit',
  'm': 'Toggle monitored',
  's': 'Search for downloads',
  'r': 'Refresh metadata',

  // Tables
  'j': 'Move down',
  'k': 'Move up',
  'x': 'Select/deselect',
  'Shift+x': 'Select all',

  // Modals
  'Escape': 'Close modal',
  'Enter': 'Confirm/submit',
};
```

---

## Responsive Design

### Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
};
```

### Mobile Navigation

```tsx
function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-background-tertiary bg-background-primary px-4 lg:hidden">
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <Logo className="h-8" />
        <Button variant="ghost" size="sm">
          <Search className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile nav drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <nav className="flex flex-col gap-1 p-4">
            {primaryNavigation.map(item => (
              <MobileNavItem key={item.id} item={item} onSelect={() => setOpen(false)} />
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-background-tertiary bg-background-primary lg:hidden">
        <TabBarItem icon={Tv} label="TV" href="/series" />
        <TabBarItem icon={Film} label="Movies" href="/movies" />
        <TabBarItem icon={Activity} label="Activity" href="/activity" badge={3} />
        <TabBarItem icon={Settings} label="Settings" href="/settings" />
      </nav>
    </>
  );
}
```

### Responsive Grid

```tsx
// Poster grid with responsive columns
function PosterGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {children}
    </div>
  );
}

// Card grid
function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
```

---

## Accessibility

### ARIA Patterns

```tsx
// Accessible tabs
function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div role="tablist" aria-label="Content sections">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-2 text-sm font-medium',
            activeTab === tab.id
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Accessible modal
function AccessibleModal({ open, onClose, title, children }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <DialogHeader>
          <DialogTitle id="modal-title">{title}</DialogTitle>
        </DialogHeader>
        <div id="modal-description">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Focus Management

```typescript
const focusManagement = {
  // Focus trap in modals
  trapFocus: true,

  // Return focus on modal close
  returnFocus: true,

  // Skip links for keyboard users
  skipLinks: [
    { label: 'Skip to main content', target: '#main-content' },
    { label: 'Skip to navigation', target: '#main-nav' },
  ],

  // Focus indicators
  focusVisible: 'ring-2 ring-primary-500 ring-offset-2 ring-offset-background-primary',
};
```

### Screen Reader Support

```tsx
// Visually hidden text for screen readers
function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

// Usage in icon buttons
<Button variant="ghost" size="sm" aria-label="Delete episode">
  <Trash2 className="h-4 w-4" />
  <VisuallyHidden>Delete episode</VisuallyHidden>
</Button>

// Live regions for dynamic updates
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>
```

---

## Theming

### Theme Configuration

```typescript
type Theme = 'light' | 'dark' | 'system';

interface ThemeConfig {
  theme: Theme;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  reduceMotion: boolean;
}

const defaultThemeConfig: ThemeConfig = {
  theme: 'dark',
  accentColor: '#3b82f6',
  fontSize: 'medium',
  compactMode: false,
  reduceMotion: false,
};
```

### Theme Provider

```tsx
const ThemeContext = createContext<{
  config: ThemeConfig;
  setConfig: (config: Partial<ThemeConfig>) => void;
} | null>(null);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<ThemeConfig>(defaultThemeConfig);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('theme-config');
    if (saved) {
      setConfigState(JSON.parse(saved));
    }
  }, []);

  const setConfig = (partial: Partial<ThemeConfig>) => {
    const newConfig = { ...config, ...partial };
    setConfigState(newConfig);
    localStorage.setItem('theme-config', JSON.stringify(newConfig));
  };

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;

    if (config.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', config.theme === 'dark');
    }

    // Apply accent color
    root.style.setProperty('--accent-color', config.accentColor);

    // Apply font size
    const fontSizes = { small: '14px', medium: '16px', large: '18px' };
    root.style.setProperty('--base-font-size', fontSizes[config.fontSize]);

    // Reduce motion
    root.classList.toggle('reduce-motion', config.reduceMotion);
  }, [config]);

  return (
    <ThemeContext.Provider value={{ config, setConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### CSS Custom Properties

```css
:root {
  /* Light theme */
  --color-background-primary: #ffffff;
  --color-background-secondary: #f8fafc;
  --color-background-tertiary: #f1f5f9;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
}

.dark {
  /* Dark theme */
  --color-background-primary: #0f0f23;
  --color-background-secondary: #1a1a2e;
  --color-background-tertiary: #252538;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
}

/* Accent color */
:root {
  --color-primary-500: var(--accent-color, #3b82f6);
}

/* Reduce motion */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
```

---

## Related Documents

- [REST_API.md](./REST_API.md) - API endpoints for UI data
- [WEBSOCKET_EVENTS.md](./WEBSOCKET_EVENTS.md) - Real-time updates
- [ACCESSIBILITY.md](./ACCESSIBILITY.md) - Full accessibility guidelines
- [INTERNATIONALIZATION.md](./INTERNATIONALIZATION.md) - i18n support
