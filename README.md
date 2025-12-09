# Shopping & To-Do Lists

A modern, offline-first Progressive Web App for managing shopping lists and to-do lists. Works seamlessly across mobile and desktop with automatic sync between users.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Svelte](https://img.shields.io/badge/svelte-5-ff3e00)
![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6)
![shadcn-svelte](https://img.shields.io/badge/shadcn--svelte-ui-000000)
![Supabase](https://img.shields.io/badge/supabase-backend-3ECF8E)
![PostgreSQL](https://img.shields.io/badge/postgresql-database-4169E1)

## Features

- **Offline-First** - Full functionality without internet connection
- **Real-time Sync** - Automatic synchronization when back online
- **Multi-User** - Share lists between users
- **Mobile & Desktop** - Optimized UX for both platforms
- **PWA Ready** - Install on any device for a native app experience
- **Dark/Light Themes** - Beautiful color system with automatic theme switching

## Tech Stack

**Frontend:** SvelteKit, Svelte 5, TypeScript, Tailwind CSS v4
**Backend:** Supabase (PostgreSQL + Auth)
**Storage:** IndexedDB (Dexie.js) for offline support
**UI:** shadcn-svelte components

## Installation

1. **Clone and install:**
   ```bash
   git clone https://github.com/yourusername/shopping-list.git
   cd shopping-list
   npm install
   ```

2. **Set up Supabase:**
   - Create a Supabase project (free tier)
   - Run `supabase/schema.sql` in the SQL editor
   - Create user accounts in Authentication section

3. **Configure environment:**
   ```env
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Start developing:**
   ```bash
   npm run dev
   ```

## Usage

**Mobile:** Swipe between lists, tap to check items, long-press for actions
**Desktop:** Carousel navigation with hover actions and floating controls

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run check    # Type check
```

## License

MIT License - See LICENSE file for details
