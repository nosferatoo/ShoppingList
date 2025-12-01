# instructions.md — How to Use with Claude Code

## Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ installed
- **npm** or **pnpm** package manager
- **Git** for version control
- **Supabase account** (free tier is sufficient)
- **Vercel account** (free tier for hosting)
- **Claude Code** CLI installed

---

## Step 1: Create Project Directory

```bash
mkdir lists-app
cd lists-app
```

Place all documentation files in the root:
- `CLAUDE.md`
- `REQUIREMENTS.md`
- `DATABASE.md`
- `UI-SPEC.md`
- `SYNC.md`

---

## Step 2: Initialize SvelteKit Project

```bash
npm create svelte@latest .
```

When prompted, select:
- **Template**: Skeleton project
- **Type checking**: Yes, using TypeScript syntax
- **Additional options**: ESLint, Prettier

Then install dependencies:

```bash
npm install
```

---

## Step 3: Set Up Supabase

### 3.1 Create Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose organization, name your project (e.g., "lists-app")
4. Set a strong database password (save it somewhere safe)
5. Select region closest to your users (EU for your case)
6. Click "Create new project"

### 3.2 Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire SQL schema from `DATABASE.md`
4. Click **Run** (or Cmd/Ctrl + Enter)
5. Verify tables created in **Table Editor**

### 3.3 Create Users

1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Enter email and password for User 1
4. Repeat for User 2
5. Note down both user UUIDs (visible in the users list)

### 3.4 Set Up Sharing (Optional)

To share a list between users, run in SQL Editor:

```sql
-- First, create a list (or note the ID of an existing list)
-- Then share it with the other user:
INSERT INTO public.list_shares (list_id, user_id)
VALUES (1, 'paste-user-2-uuid-here');
```

### 3.5 Enable Realtime

1. Go to **Database** → **Replication**
2. Under "Realtime", ensure `lists` and `items` tables are enabled
3. If not, click the table and toggle "Enable Realtime"

### 3.6 Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

---

## Step 4: Configure Environment Variables

Create `.env` file in project root:

```env
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Add to `.gitignore`:

```
.env
.env.*
!.env.example
```

Create `.env.example` for reference:

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

---

## Step 5: Install Additional Dependencies

```bash
# Supabase client
npm install @supabase/supabase-js @supabase/ssr

# Local database (IndexedDB)
npm install dexie

# Gestures for mobile swipe
npm install svelte-gestures

# shadcn-svelte CLI
npx shadcn-svelte@latest init
```

When prompted by shadcn-svelte:
- **Style**: Default
- **Base color**: Slate (we'll customize later)
- **Global CSS**: `src/app.css`
- **CSS variables**: Yes
- **Tailwind config**: `tailwind.config.js`
- **Components location**: `$lib/components`
- **Utils location**: `$lib/utils`

---

## Step 6: Start Claude Code

Navigate to your project directory and start Claude Code:

```bash
cd lists-app
claude
```

Claude Code will automatically read `CLAUDE.md` for project context.

---

## Step 7: Suggested Prompts for Claude Code

Use these prompts in sequence to build the app:

### Initial Setup

```
Set up the project structure as defined in CLAUDE.md. Create all the 
necessary directories and placeholder files.
```

```
Configure Tailwind CSS with the custom design tokens from UI-SPEC.md. 
Update app.css with all CSS custom properties.
```

```
Set up Google Fonts (Inter and Montserrat) in app.html.
```

### Database & Auth

```
Create the Supabase client in src/lib/db/supabase.ts following the 
SvelteKit SSR pattern with @supabase/ssr.
```

```
Create TypeScript types for all database tables in src/lib/types.ts 
based on DATABASE.md schema.
```

```
Implement the Dexie.js local database schema in src/lib/db/local.ts 
as specified in SYNC.md.
```

```
Create the authentication store in src/lib/stores/auth.svelte.ts 
using Svelte 5 runes.
```

### Core Components

```
Create the Header component per UI-SPEC.md with the settings icon.
```

```
Create the ListItem component with checkbox, text, and swipe-to-reveal 
actions (edit/delete) for mobile, hover actions for desktop.
```

```
Create the ListCard component that displays a single list with its 
items, input field, and proper sorting.
```

```
Create the Toast component for notifications with undo support.
```

### Pages & Routing

```
Implement the login page at src/routes/login/+page.svelte with the 
styled form matching our dark theme.
```

```
Set up the root layout with authentication check, redirecting 
unauthenticated users to /login.
```

```
Create the main page that displays lists - swipeable on mobile, 
grid on desktop.
```

```
Create the Edit Lists page at src/routes/lists/edit/+page.svelte 
with drag-to-reorder functionality.
```

### Offline & Sync

```
Implement the sync manager in src/lib/db/sync.ts with LWW conflict 
resolution as documented in SYNC.md.
```

```
Set up realtime subscriptions for lists and items changes.
```

```
Create the service worker for PWA offline support.
```

```
Create the PWA manifest.json with app icons and theme colors.
```

### Polish

```
Add the mobile swipe navigation between lists using svelte-gestures.
```

```
Implement the Settings menu/panel with user info, edit lists link, 
sync button, and logout.
```

```
Add the sync status indicator in the header.
```

```
Add the first-use swipe hint for mobile users.
```

---

## Step 8: Testing

### Local Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Test Checklist

- [ ] Login with both user accounts
- [ ] Create a list (online)
- [ ] Add items to list
- [ ] Check/uncheck items
- [ ] Edit item text
- [ ] Delete item (verify undo toast)
- [ ] Swipe between lists (mobile)
- [ ] Reorder lists in Edit Lists page
- [ ] Test offline mode (DevTools → Network → Offline)
- [ ] Verify sync when coming back online
- [ ] Test shared list updates between users

### Mobile Testing

For iOS testing:
1. Run `npm run build && npm run preview`
2. Access from iPhone on same network via local IP
3. Or deploy to Vercel and test via HTTPS URL

---

## Step 9: Deploy to Vercel

### 9.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/lists-app.git
git push -u origin main
```

### 9.2 Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel auto-detects SvelteKit

### 9.3 Configure Environment Variables

In Vercel project settings → Environment Variables, add:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

### 9.4 Deploy

Click "Deploy" — Vercel will build and deploy automatically.

Your app will be available at: `https://your-project.vercel.app`

### 9.5 Configure PWA

After first deploy, update `manifest.json` with your production URL if needed.

---

## Step 10: Add to Home Screen (iOS)

1. Open your deployed app URL in Safari on iPhone
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"

The app will now appear as an icon on your home screen and launch in full-screen mode.

---

## Troubleshooting

### "Cannot find module" errors

```bash
npm install
```

### Supabase connection issues

- Verify environment variables are set correctly
- Check Supabase project is not paused (free tier pauses after inactivity)
- Ensure RLS policies are correctly applied

### Offline mode not working

- Verify service worker is registered (DevTools → Application → Service Workers)
- Check IndexedDB has data (DevTools → Application → IndexedDB)
- Ensure you're accessing via HTTPS (required for service workers)

### Realtime not updating

- Check Realtime is enabled for tables in Supabase dashboard
- Verify subscription is set up correctly in browser console
- Check for RLS policy issues blocking realtime access

### PWA not installable

- Must be served over HTTPS
- `manifest.json` must be valid and linked in `app.html`
- Service worker must be registered
- iOS requires Safari (not Chrome/Firefox)

---

## Project Maintenance

### Update Dependencies

```bash
npm update
```

### Generate TypeScript Types from Supabase

```bash
npx supabase gen types typescript --project-id your-project-id > src/lib/types/database.ts
```

### Clear Local Database (for testing)

In browser DevTools console:
```javascript
indexedDB.deleteDatabase('ListsApp');
```

---

## Documentation Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project overview, tech stack, coding conventions |
| `REQUIREMENTS.md` | Functional requirements and specifications |
| `DATABASE.md` | Supabase schema, SQL, RLS policies |
| `UI-SPEC.md` | Design system, components, layouts |
| `SYNC.md` | Offline architecture, sync logic |
