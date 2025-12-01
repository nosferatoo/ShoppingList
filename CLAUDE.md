# CLAUDE.md — Shopping & To-Do Lists App

## Project Overview

A private, offline-first shopping list and to-do list PWA for 2 users. The app runs on iOS Safari (optimized for iPhone 12 Pro Max) and desktop browsers, with different UX patterns for each platform.

### Core Principles

- **KISS**: Keep it simple, avoid over-engineering
- **YAGNI**: Don't add features not explicitly specified
- **Offline-first**: App must work without network; sync when online
- **Mobile-first**: Design for iPhone first, enhance for desktop

## Tech Stack

| Component | Technology | Version/Notes |
|-----------|------------|---------------|
| Framework | SvelteKit | Latest stable, use Svelte 5 runes |
| Language | TypeScript | Strict mode enabled |
| Styling | Tailwind CSS | v4 with custom theme |
| Components | shadcn-svelte | Copy components, don't install as dependency |
| Database | Supabase | PostgreSQL + Auth + Realtime |
| Local Storage | Dexie.js | IndexedDB wrapper for offline cache |
| Gestures | svelte-gestures | Swipe detection for mobile |
| Hosting | Vercel | Free tier, adapter-auto |

## File Structure

```
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn-svelte components
│   │   │   ├── ListCard.svelte  # Single list display
│   │   │   ├── ListItem.svelte  # Single item with actions
│   │   │   ├── Header.svelte    # App header with settings
│   │   │   ├── Settings.svelte  # Settings panel/modal
│   │   │   ├── EditLists.svelte # Full-screen list management
│   │   │   └── Toast.svelte     # Notification toasts
│   │   ├── stores/
│   │   │   ├── lists.svelte.ts  # Lists state (Svelte 5 runes)
│   │   │   ├── auth.svelte.ts   # Auth state
│   │   │   └── sync.svelte.ts   # Sync status state
│   │   ├── db/
│   │   │   ├── supabase.ts      # Supabase client
│   │   │   ├── local.ts         # Dexie.js IndexedDB setup
│   │   │   └── sync.ts          # Sync logic (LWW)
│   │   ├── types.ts             # TypeScript types
│   │   └── utils.ts             # Helper functions
│   ├── routes/
│   │   ├── +layout.svelte       # Root layout, auth check
│   │   ├── +layout.server.ts    # Session handling
│   │   ├── +page.svelte         # Main app (lists view)
│   │   ├── login/
│   │   │   └── +page.svelte     # Login page
│   │   └── lists/
│   │       └── edit/
│   │           └── +page.svelte # Edit lists page
│   ├── app.css                  # Tailwind + custom properties
│   ├── app.html                 # HTML template with PWA meta
│   └── service-worker.ts        # PWA service worker
├── static/
│   ├── manifest.json            # PWA manifest
│   ├── icons/                   # PWA icons (192, 512)
│   └── fonts/                   # Inter, Montserrat (optional, can use Google Fonts)
├── supabase/
│   └── schema.sql               # Database schema
├── REQUIREMENTS.md              # Functional requirements
├── DATABASE.md                  # Database schema documentation
├── UI-SPEC.md                   # UI specifications
├── SYNC.md                      # Offline sync documentation
└── README.md                    # Setup instructions
```

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

### Tailwind Classes

- Use design tokens defined in `app.css`
- Order: layout → spacing → sizing → colors → effects
- Example: `flex items-center gap-2 p-4 bg-bg-secondary rounded-lg`

### File Naming

- Components: `PascalCase.svelte`
- Stores/utils: `camelCase.ts`
- Routes: SvelteKit conventions (`+page.svelte`, `+layout.ts`)

## Key Implementation Notes

### Authentication

- Email/password only (no OAuth, no magic links)
- Users pre-created by admin in Supabase dashboard
- Session persisted via Supabase Auth cookies
- Protected routes redirect to `/login` if not authenticated

### Lists & Items

- Lists: id (serial), title, type ('shopping'|'todo'), owner_id, is_shared
- Items: id (serial), list_id, text, is_checked, timestamps
- Soft delete via `deleted_at` timestamp (required for sync)
- Duplicate prevention: case-insensitive unique constraint per list

### Offline Behavior

| Action | Offline | Online |
|--------|---------|--------|
| View lists/items | ✅ From IndexedDB | ✅ Live |
| Check/uncheck | ✅ Queued | ✅ Immediate |
| Edit item | ✅ Queued | ✅ Immediate |
| Delete item | ✅ Queued | ✅ Immediate |
| Create item | ❌ Requires online | ✅ Server assigns ID |
| Create list | ❌ Requires online | ✅ Server assigns ID |

### Sync Strategy

- **Last Write Wins (LWW)**: Compare `updated_at` timestamps
- **Auto-sync triggers**: `visibilitychange`, `online` events
- **Manual sync**: Button in settings menu
- **Notification**: Only show toast when other user's changes detected

### Mobile vs Desktop UX

| Feature | Mobile | Desktop |
|---------|--------|---------|
| List navigation | Swipe left/right | All visible in grid |
| Item actions | Swipe to reveal | Hover to show |
| Layout | Single list view | Multi-column grid |
| Settings | Full-screen slide | Modal/dropdown |

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

# Generate Supabase types
npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts
```

## Environment Variables

```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
```

## Related Documentation

- [REQUIREMENTS.md](./REQUIREMENTS.md) — Functional requirements
- [DATABASE.md](./DATABASE.md) — Database schema and RLS policies
- [UI-SPEC.md](./UI-SPEC.md) — UI components and design tokens
- [SYNC.md](./SYNC.md) — Offline sync architecture

## External References

- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/$state)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Dexie.js](https://dexie.org/)
- [svelte-gestures](https://github.com/Rezi/svelte-gestures)
