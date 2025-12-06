# Shopping & To-Do Lists

A modern, offline-first Progressive Web App for managing shopping lists and to-do lists. Built for simplicity and reliability, it works seamlessly across mobile and desktop with a beautiful, responsive interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Svelte](https://img.shields.io/badge/svelte-5-ff3e00)
![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6)

## Features

### Core Functionality
- **Dual List Types**: Separate shopping and to-do lists with tailored interfaces
- **Offline-First**: Full functionality without internet connection using IndexedDB
- **Real-time Sync**: Automatic synchronization when back online with Last Write Wins conflict resolution
- **Multi-User Support**: Share lists between users with granular permissions
- **Cross-Platform**: Optimized UX for both mobile (iOS Safari) and desktop browsers

### User Experience
- **Mobile-First Design**: Swipe navigation between lists, long-press for actions
- **Desktop Enhancement**: Carousel view with floating controls and aurora gradient background
- **Dark/Light Themes**: Beautiful OKLCH color system with warm orange accents (dark) or fresh teal (light)
- **Touch-Optimized**: Natural gestures for adding, editing, checking off, and deleting items
- **PWA Ready**: Install on any device for a native app experience

### Technical Highlights
- **Svelte 5 Runes**: Modern reactive framework with fine-grained reactivity
- **TypeScript Strict Mode**: Full type safety across the entire codebase
- **Tailwind CSS v4**: Utility-first styling with custom OKLCH design tokens
- **shadcn-svelte Components**: Polished, accessible UI components based on bits-ui
- **Supabase Backend**: PostgreSQL with Row Level Security and server-side functions
- **Dexie.js**: Robust IndexedDB wrapper for offline data persistence

## Screenshots

### Mobile (iPhone)
Swipe between lists, tap to check items, long-press for actions

### Desktop
Carousel view with all lists visible, hover actions, floating controls

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | SvelteKit with Svelte 5 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 with OKLCH colors |
| UI Components | shadcn-svelte (bits-ui) |
| Backend | Supabase (PostgreSQL + Auth + SSR) |
| Local Storage | Dexie.js (IndexedDB) |
| Gestures | svelte-gestures |
| Icons | lucide-svelte |
| Carousel | embla-carousel-svelte |
| Hosting | Vercel |

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works great)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/shopping-list.git
cd shopping-list
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:
```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Set up the database:

Run the SQL schema from `supabase/schema.sql` in your Supabase SQL editor. This creates:
- Tables for lists, items, list shares, and user settings
- Row Level Security (RLS) policies for data protection
- Server-side functions for optimized queries

5. Create users:

In the Supabase dashboard, manually create user accounts via the Authentication section.

6. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:5173` and log in with your created credentials.

### Building for Production

```bash
npm run build
npm run preview
```

## Usage

### Mobile
- **Swipe left/right** to navigate between lists
- **Tap** to check/uncheck items
- **Long-press** or **swipe** an item to reveal edit and delete actions
- **Tap the header** to access settings and list management
- **Pull to refresh** triggers sync

### Desktop
- **Click arrows** or **dots** to navigate the carousel
- **Hover** over items to see action buttons
- **Use floating controls** (top corners) for sync and list management
- **Drag items** to reorder (coming soon)

## Architecture

### Offline-First Strategy

The app uses a full sync approach:
1. **All data cached locally** in IndexedDB
2. **Offline reads** work instantly from cache
3. **Online writes** go directly to Supabase
4. **Automatic sync** on visibility change and network reconnection
5. **Server as source of truth** - local state refreshes after each sync

### Conflict Resolution

Uses **Last Write Wins (LWW)** based on `updated_at` timestamps. Simple and reliable for small teams.

### Data Model

```
lists
├── id (uuid)
├── title (text)
├── type ('shopping' | 'todo')
├── owner_id (uuid → auth.users)
├── is_shared (boolean)
└── deleted_at (timestamp, null for active)

items
├── id (uuid)
├── list_id (uuid → lists)
├── text (text)
├── is_checked (boolean)
└── deleted_at (timestamp, null for active)

list_shares
├── id (uuid)
├── list_id (uuid → lists)
└── user_id (uuid → auth.users)

user_list_settings
├── id (uuid)
├── user_id (uuid → auth.users)
├── list_id (uuid → lists)
└── position (integer, for custom ordering)
```

Soft deletes (`deleted_at`) enable sync without data loss.

## Development

### Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Type check
npm run check:watch  # Type check in watch mode
npm run format       # Format code with Prettier
npm run lint         # Lint code with ESLint
npm run icons        # Generate app icons
```

### Code Style

- **Svelte 5 Runes**: Always use `$state()`, `$derived()`, `$effect()` instead of Svelte 4 syntax
- **TypeScript**: Strict mode, explicit types for all interfaces
- **Components**: Props via `$props()`, keep focused and simple
- **Styling**: Tailwind utilities, use CSS custom properties from `app.css`
- **File naming**: PascalCase for components, camelCase for utilities

### Design Tokens

Custom OKLCH-based theme system defined in `app.css`:

```css
--bg-primary, --bg-secondary, --bg-tertiary
--text-primary, --text-secondary, --text-muted
--accent-primary, --accent-hover
--space-1 through --space-12
--radius-sm, --radius-md, --radius-lg
--shadow-xs through --shadow-2xl
```

## Contributing

This is a private project built for personal use, but suggestions and bug reports are welcome via issues.

### Development Principles

**Do:**
- Use Svelte 5 runes syntax
- Keep it simple (KISS)
- Write tests for critical paths
- Follow existing patterns
- Use semantic HTML

**Don't:**
- Over-engineer solutions
- Add features not explicitly needed (YAGNI)
- Bypass Row Level Security
- Mix Svelte 4 and Svelte 5 syntax

## Browser Support

**Primary target:** iOS Safari (iPhone 12 Pro and newer)
**Also supports:** Modern desktop browsers (Chrome, Firefox, Safari, Edge)

Requires support for:
- CSS Grid & Flexbox
- CSS Custom Properties
- IndexedDB
- Service Workers
- Touch events
- CSS `oklch()` colors

## License

MIT License - See LICENSE file for details

## Acknowledgments

Built with:
- [SvelteKit](https://kit.svelte.dev/) - The best way to build Svelte apps
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [shadcn-svelte](https://www.shadcn-svelte.com/) - Beautifully designed components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Dexie.js](https://dexie.org/) - Minimalistic wrapper for IndexedDB

---

**Note:** This app is designed for 2 users sharing lists privately. It's not intended for large-scale multi-tenant use.
