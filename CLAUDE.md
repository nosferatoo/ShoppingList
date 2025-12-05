# CLAUDE.md — Shopping & To-Do Lists App

## Project Overview

A private, offline-first shopping list and to-do list PWA for 2 users. The app runs on iOS Safari (optimized for iPhone 12 Pro Max) and desktop browsers, with different UX patterns for each platform.

### Core Principles

- **KISS**: Keep it simple, avoid over-engineering
- **YAGNI**: Don't add features not explicitly specified
- **Offline-first**: Full sync strategy - all data cached locally, works offline
- **Mobile-first**: Design for iPhone first, enhance for desktop
- **Last Write Wins (LWW)**: Simple conflict resolution using timestamps

## Tech Stack

| Component | Technology | Version/Notes |
|-----------|------------|---------------|
| Framework | SvelteKit | Latest stable with Svelte 5 runes |
| Language | TypeScript | Strict mode enabled |
| Styling | Tailwind CSS | v4 with custom OKLCH theme system |
| Components | shadcn-svelte (bits-ui) | Copy components, don't install as dependency |
| Database | Supabase | PostgreSQL + Auth + SSR (@supabase/ssr) |
| Local Storage | Dexie.js | IndexedDB wrapper for offline cache |
| Gestures | svelte-gestures | Swipe detection for mobile list items |
| UI Icons | lucide-svelte | Consistent icon system |
| Notifications | svelte-sonner | Toast notifications |
| Carousel | embla-carousel-svelte | Desktop list carousel |
| Theme Toggle | mode-watcher | Dark/light mode management |
| Hosting | Vercel | Free tier, adapter-auto |

## File Structure

```
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/                      # shadcn-svelte components (bits-ui based)
│   │   │   │   ├── button/              # Button component
│   │   │   │   ├── card/                # Card components
│   │   │   │   ├── carousel/            # Embla carousel wrapper
│   │   │   │   ├── checkbox/            # Checkbox component
│   │   │   │   ├── dialog/              # Dialog/modal components
│   │   │   │   ├── dropdown-menu/       # Dropdown menu components
│   │   │   │   ├── input/               # Input component
│   │   │   │   ├── label/               # Label component
│   │   │   │   ├── separator/           # Separator component
│   │   │   │   ├── sonner/              # Toast wrapper
│   │   │   │   └── switch/              # Toggle switch
│   │   │   ├── ListCard.svelte          # Single list display with items
│   │   │   ├── ListItem.svelte          # Individual item with swipe/hover actions
│   │   │   ├── Header.svelte            # Mobile header with navigation
│   │   │   ├── Settings.svelte          # Settings panel (mobile slide-in)
│   │   │   ├── EditListsModal.svelte    # List management modal
│   │   │   ├── EditItemDialog.svelte    # Item edit dialog
│   │   │   ├── ConfirmDialog.svelte     # Delete confirmation dialog
│   │   │   ├── SwipeHint.svelte         # First-use swipe hint
│   │   │   ├── Toast.svelte             # Toast notification (legacy, sonner used now)
│   │   │   ├── InstallAppButton.svelte  # PWA install prompt
│   │   │   └── PWAUpdateBanner.svelte   # Service worker update banner
│   │   ├── stores/
│   │   │   ├── lists.svelte.ts          # Lists state (Svelte 5 runes) - NOT USED
│   │   │   ├── auth.svelte.ts           # Auth state (user, session)
│   │   │   ├── sync.svelte.ts           # Sync status and triggers
│   │   │   └── toast.svelte.ts          # Toast notification state
│   │   ├── db/
│   │   │   ├── supabase.ts              # Supabase client setup (browser & server)
│   │   │   ├── local.ts                 # Dexie.js IndexedDB schema & helpers
│   │   │   ├── sync.ts                  # Full sync logic (push → full pull)
│   │   │   └── syncEvents.ts            # Custom events for sync coordination
│   │   ├── types.ts                     # All TypeScript types & type guards
│   │   └── utils.ts                     # Helper functions
│   ├── routes/
│   │   ├── +layout.svelte               # Root layout with auth & sync init
│   │   ├── +layout.server.ts            # SSR session handling
│   │   ├── +page.svelte                 # Main app (mobile swipe / desktop carousel)
│   │   ├── +page.server.ts              # Load lists on SSR
│   │   └── login/
│   │       └── +page.svelte             # Login page
│   ├── app.css                          # Tailwind v4 + OKLCH theme + custom vars
│   └── app.html                         # HTML template with PWA meta
├── static/
│   ├── manifest.json                    # PWA manifest
│   └── icons/                           # App icons (generated)
├── supabase/
│   └── schema.sql                       # Complete database schema with RLS
├── scripts/
│   └── generate-icons.js                # Icon generation script
└── CLAUDE.md                            # This file (project instructions)

## Coding Conventions

### Svelte 5 Runes

Always use Svelte 5 runes syntax:

```typescript
// ✅ Correct
let count = $state(0);
let doubled = $derived(count * 2);

// ❌ Wrong (Svelte 4 syntax)
let count = 0;
$: doubled = count * 2;
```

### TypeScript

- Enable strict mode
- Define interfaces for all data structures
- Use type inference where obvious
- Export types from `$lib/types.ts`

### Component Style

```svelte
<script lang="ts">
  // 1. Imports
  import { Button } from '$lib/components/ui/button';
  
  // 2. Props (Svelte 5 syntax)
  interface Props {
    title: string;
    onSave?: () => void;
  }
  let { title, onSave }: Props = $props();
  
  // 3. State
  let isOpen = $state(false);
  
  // 4. Derived
  let isValid = $derived(title.length > 0);
  
  // 5. Functions
  function handleClick() {
    // ...
  }
</script>

<!-- Template -->
<div class="...">
  {title}
</div>

<style>
  /* Scoped styles only if needed, prefer Tailwind */
</style>
```

### Tailwind Classes & Styling

- **Tailwind CSS v4** with custom OKLCH-based color system
- Design tokens defined in `app.css` using CSS custom properties
- **Theme system**: Uses OKLCH color space for perceptually uniform colors
  - Dark mode (default): Warm orange accents (#f97316) with cyan highlights
  - Light mode: Fresh teal accents on light background
- Order: layout → spacing → sizing → colors → effects
- Example: `flex items-center gap-2 p-4 bg-bg-secondary rounded-lg`
- **Custom variables available**:
  - Backgrounds: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-hover`
  - Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
  - Accents: `--accent-primary`, `--accent-hover`, `--success`, `--error`, `--warning`
  - Spacing: `--space-1` through `--space-12` (4px to 48px scale)
  - Border radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`
  - Shadows: `--shadow-xs` through `--shadow-2xl`
  - Transitions: `--transition-fast` (150ms), `--transition-normal` (200ms), `--transition-slow` (300ms)

### File Naming

- Components: `PascalCase.svelte`
- Stores/utils: `camelCase.ts`
- Routes: SvelteKit conventions (`+page.svelte`, `+layout.ts`)

## Key Implementation Notes

### Authentication

- **Email/password only** (no OAuth, no magic links)
- Users pre-created by admin in Supabase dashboard
- Session managed via **@supabase/ssr** with cookies
- Protected routes redirect to `/login` if not authenticated
- Auth state managed in `auth.svelte.ts` store (Svelte 5 runes)

### Database Schema

**Tables:**
- `lists`: id, title, type ('shopping'|'todo'), owner_id, is_shared, created_at, updated_at, deleted_at
- `items`: id, list_id, text, is_checked, created_at, updated_at, deleted_at
- `list_shares`: id, list_id, user_id, created_at (for sharing lists between users)
- `user_list_settings`: id, user_id, list_id, position, created_at, updated_at (for custom list ordering)

**Key features:**
- Soft delete via `deleted_at` timestamp (required for sync)
- Row Level Security (RLS) enabled on all tables
- Server-side functions for optimized queries:
  - `get_user_lists_with_items()`: Returns all lists with items for current user
  - `sync_items(p_items)`: Batch sync with LWW conflict resolution
  - `save_list_positions(p_positions)`: Update list ordering

### Offline-First Architecture

**Current Implementation (Full Sync):**
1. **All data cached locally** in IndexedDB using Dexie.js
2. **Offline operations**: Only reading works offline (no pending queue)
3. **Online requirement**: All mutations (create, update, delete) require online connection
4. **Sync strategy**: Full sync - push pending changes, then replace local state with server state
5. **Last Write Wins (LWW)**: Server resolves conflicts using `updated_at` timestamps

**IndexedDB Structure (Dexie.js):**
```typescript
stores: {
  lists: 'id, owner_id, is_shared, type, deleted_at',
  items: 'id, list_id, is_checked, deleted_at',
  listShares: 'id, list_id, user_id',
  userListSettings: 'id, user_id, list_id, position',
  syncMeta: 'key' // Stores last sync timestamp
}
```

### Sync Strategy (Full Sync)

**Sync Process:**
1. **Push**: Send modified items to server via `sync_items()` function
2. **Pull**: Fetch all user data via `get_user_lists_with_items()`
3. **Replace**: Clear and replace all local data with server data
4. **Conflict Resolution**: Server-side LWW using `updated_at` timestamps

**Sync Triggers:**
- Auto-sync on `visibilitychange` event (tab becomes visible)
- Auto-sync on `online` event (network reconnects)
- Manual sync button (desktop floating controls)
- "Clear cache and sync" option (forces full refresh)

**Remote Change Detection:**
- Custom event system (`syncEvents.ts`) for coordination
- Dispatch `remote-change` event when other user's changes detected
- Dispatch `sync-complete` event when sync finishes
- UI automatically reloads from IndexedDB on these events

### Mobile vs Desktop UX

| Feature | Mobile (< 1024px) | Desktop (≥ 1024px) |
|---------|-------------------|-------------------|
| Layout | Single list, swipe to navigate | Carousel with all lists visible |
| List navigation | Swipe left/right between lists | Carousel prev/next buttons or dots |
| Item actions | Long-press or swipe to show actions | Always visible on hover |
| Header | Fixed header with list info | Hidden, replaced by floating controls |
| User menu | Settings panel slide-in | Floating controls (top-left) |
| Sync button | In settings panel | Floating split button (top-right) |
| List management | Via settings panel | Floating "Edit lists" button (top-right) |
| Background | Clean solid color | Aurora gradient effect with smooth animation |

### State Management

**Pattern: Local component state + Svelte stores**
- **No global lists store**: Lists passed as props from server load
- **Auth store** (`auth.svelte.ts`): User session, ID, email
- **Sync store** (`sync.svelte.ts`): Sync status, online state, last sync time
- **Toast store** (`toast.svelte.ts`): Notification messages
- **Component state**: Uses Svelte 5 `$state()` rune for local reactivity
- **Derived state**: Uses `$derived()` and `$derived.by()` for computed values
- **Effects**: Uses `$effect()` for side effects and subscriptions

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Watch mode type checking
npm run check:watch

# Format code
npm run format

# Lint code
npm run lint

# Generate app icons
npm run icons

# Generate Supabase types (manual)
npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts
```

## Environment Variables

**Required:**
```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
```

**Note:** Keep credentials in `.env.local` (gitignored)

## Development Principles

### Do's ✅
- Use Svelte 5 runes syntax (`$state`, `$derived`, `$effect`)
- Keep components focused and simple
- Use TypeScript strict mode
- Prefer composition over inheritance
- Use semantic HTML
- Test across mobile and desktop viewports
- Use existing shadcn-svelte components before creating new ones
- Follow the established file structure
- Use CSS custom properties from `app.css`
- Implement proper loading states
- Handle errors gracefully with toast notifications
- Use Dexie.js for all IndexedDB operations
- Follow Last Write Wins (LWW) conflict resolution
- Always use Shadcn components, if available (if not available, prompt)
- Always use Tailwind styling

### Don'ts ❌
- Don't use Svelte 4 syntax (`$:`, `export let`)
- Don't over-engineer or add unnecessary features
- Don't create abstractions prematurely
- Don't bypass Row Level Security (RLS)
- Don't hardcode colors - use design tokens
- Don't create duplicate UI components
- Don't mix Tailwind with traditional CSS unnecessarily
- Don't ignore TypeScript errors
- Don't implement complex conflict resolution (keep LWW)
- Don't add features not specified in requirements

## Current Architecture Decisions

### Why Full Sync Instead of Incremental?
- **Simplicity**: Easier to reason about and debug
- **Reliability**: No risk of local state drift
- **Small dataset**: 2 users with limited lists/items
- **Fast enough**: Full sync completes in milliseconds
- **Conflict-free**: Server is always source of truth after sync

### Why No Offline Queue?
- **Current scope**: All mutations require online connection
- **Simpler code**: No need for complex queue management
- **Better UX**: Immediate server validation and feedback
- **Future-proof**: Can add queue later if needed

### Why Supabase Functions for Queries?
- **Performance**: Single RPC call vs multiple queries
- **Type safety**: Return types defined in TypeScript
- **Server-side logic**: LWW resolution happens on server
- **Reduced latency**: Less round trips to database

### Why Svelte 5 Runes?
- **Modern API**: Latest Svelte features
- **Better performance**: Fine-grained reactivity
- **TypeScript-first**: Better type inference
- **Cleaner syntax**: More explicit and readable

### Why OKLCH Colors?
- **Perceptual uniformity**: Colors look better across themes
- **Modern standard**: Future-proof color space
- **Better gradients**: Smoother color transitions
- **Accessibility**: Easier to maintain consistent contrast ratios

## Browser Support

**Primary target:** iOS Safari (iPhone 12 Pro Max and newer)
**Secondary:** Modern desktop browsers (Chrome, Firefox, Safari, Edge)

**Features used:**
- CSS Grid & Flexbox
- CSS Custom Properties
- IndexedDB (via Dexie.js)
- Service Workers (PWA)
- Touch events & gestures
- CSS backdrop-filter
- CSS oklch() colors