# REQUIREMENTS.md — Functional Requirements

## 1. Overview

A private shopping list and to-do list app for 2 users with offline-first capabilities, real-time sync, and optimized mobile/desktop experiences.

## 2. User Authentication

### 2.1 Login

- **Method**: Email and password only
- **User creation**: Manual by admin in Supabase dashboard (no self-registration)
- **Session**: Persisted via cookies, survives browser close
- **Login page**: Styled to match app theme (dark, orange accents)

### 2.2 Protected Routes

- All routes except `/login` require authentication
- Unauthenticated users redirected to `/login`
- After login, redirect to main app (`/`)

### 2.3 Logout

- Available in settings menu
- Clears session and local IndexedDB cache
- Redirects to `/login`

## 3. Lists

### 3.1 List Properties

| Property | Type | Description |
|----------|------|-------------|
| id | integer | Auto-increment primary key |
| title | string | User-defined name |
| type | enum | `'shopping'` or `'todo'` |
| owner_id | uuid | User who created the list |
| is_shared | boolean | Whether shared with other user |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last modification (for sync) |
| deleted_at | timestamp | Soft delete (null if active) |

### 3.2 List Types

- **Shopping list**: Indicated by cart icon (🛒)
- **To-do list**: Indicated by checkmark icon (✓)
- Visual difference: Icon only, no color difference

### 3.3 Shared Lists

- Shared lists indicated by text badge: "Shared"
- Shared lists visible to both owner and shared user
- Both users can add, edit, delete items
- Each user has independent sort order for lists

### 3.4 List Operations

| Operation | Location | Details |
|-----------|----------|---------|
| Create | Edit Lists page | Title, type, shared toggle |
| Rename | Edit Lists page | Inline edit or modal |
| Delete | Edit Lists page | Swipe or delete button |
| Reorder | Edit Lists page | Drag handle (⋮⋮) |

### 3.5 List Ordering

- Each user has their own list order (stored in `user_list_settings`)
- Order persists across sessions
- New lists appear at the end
- Reordering via drag-and-drop on Edit Lists page

## 4. Items

### 4.1 Item Properties

| Property | Type | Description |
|----------|------|-------------|
| id | integer | Auto-increment primary key |
| list_id | integer | Parent list FK |
| text | string | Item content |
| is_checked | boolean | Checked/unchecked state |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last modification (for sync) |
| deleted_at | timestamp | Soft delete (null if active) |

### 4.2 Item Display

- **Sort order**: Unchecked first (alphabetical), then checked (alphabetical)
- **Checked items**: Displayed with dimmed text color (`text-secondary`)
- **Unchecked items**: Full brightness (`text-primary`)

### 4.3 Adding Items

- Text input field at top of each list
- Placeholder: "Add item..."
- Press Enter to add
- Duplicate check: Case-insensitive within same list
- If duplicate exists: No action, no error (silent)
- **Requires online**: Item creation needs server to assign ID

### 4.4 Filtering Items

- Same input field used for filtering
- As user types, list filters to matching items
- Filter is case-insensitive, matches anywhere in text
- If Enter pressed and no exact match: Add as new item
- If Enter pressed and exact match exists: Clear input, do nothing

### 4.5 Item Actions

#### Mobile (Touch)

- **Swipe left on item**: Reveals action buttons
  - Edit button (pencil icon, neutral/blue)
  - Delete button (trash icon, orange/red)
- **Tap checkbox**: Toggle checked state
- **Swipe back or tap elsewhere**: Dismiss action buttons

#### Desktop (Mouse)

- **Hover on item**: Fade in edit/delete icons on right
- **Click checkbox**: Toggle checked state
- **Click icon**: Trigger action

### 4.6 Editing Items

- Tapping edit opens inline edit mode (or small modal)
- Existing text pre-filled in input
- Press Enter or tap outside to save
- Press Escape to cancel (desktop)
- **Duplicate handling**: If edited text matches existing item, silently cancel edit

### 4.7 Deleting Items

- Immediate removal from view (optimistic UI)
- Undo toast appears for 5 seconds
- Toast text: `"[Item text]" deleted` with `UNDO` button
- If undo tapped: Restore item
- If toast dismissed: Deletion final, synced to server
- Actual deletion is soft delete (`deleted_at` set)

### 4.8 First-Use Hint (Mobile)

- On first app launch, show animated hint on first list item
- Animation: Subtle left arrow or swipe indicator
- Text: "Swipe for options"
- Shown once, stored in localStorage as seen

## 5. User Interface

### 5.1 Header

- **Left**: List name (mobile) or App name (desktop)
- **Right**: Settings icon (gear)
- Fixed position, always visible

### 5.2 Settings Menu

Opens when gear icon tapped. Contains:

1. **User info**: Logged-in user's email/name
2. **Edit lists**: Link to Edit Lists page
3. **Sync now**: Manual sync trigger
4. **Logout**: End session

### 5.3 Edit Lists Page

- Full-screen page (not modal)
- Shows all user's lists (owned + shared)
- Each list item shows:
  - Drag handle (⋮⋮) on left
  - Type icon (🛒 or ✓)
  - Title
  - "Shared" badge if shared
- Actions:
  - **Tap list**: Edit title
  - **Drag handle**: Reorder
  - **Swipe left** (mobile) or **hover** (desktop): Delete button
- **Add list button**: At bottom, opens create form
- **Back button**: Return to main view

### 5.4 Empty States

- **Empty list**: Show text "No items yet"
- **No lists**: Show text "No lists yet" with prompt to create

### 5.5 Sync Status Indicator

- Location: Header (global)
- Shows only when there are pending changes
- Icon: Cloud with sync indicator
- Text: "Syncing..." or sync icon animation

### 5.6 Sync Notification

- Toast notification
- Only shown when other user's changes are detected
- Text: "List updated" or similar
- Auto-dismiss after 3 seconds

## 6. Mobile Experience (iOS Safari)

### 6.1 Target Device

- Optimized for iPhone 12 Pro Max
- Screen: 428 x 926 points (6.7" display)
- Safe areas respected (notch, home indicator)

### 6.2 Navigation

- **Swipe left**: Go to next list
- **Swipe right**: Go to previous list
- Pagination dots at bottom showing current position
- Smooth animation during swipe

### 6.3 Touch Targets

- Minimum 44x44 points for all interactive elements
- Adequate spacing between actions to prevent mis-taps

### 6.4 PWA Features

- Add to Home Screen support
- App icon (custom, not default Safari)
- Splash screen with app name/logo
- Full-screen mode (no Safari chrome)
- Theme color matches app background

## 7. Desktop Experience

### 7.1 Layout

- Responsive grid layout
- Lists displayed as cards side-by-side
- Auto-fit columns based on viewport width
- Minimum card width: ~300px
- Maximum columns: 4-5 depending on screen

### 7.2 Interactions

- Standard mouse interactions
- Hover states for interactive elements
- Keyboard support (Tab, Enter, Escape)

## 8. Offline Functionality

### 8.1 Capabilities When Offline

| Feature | Supported |
|---------|-----------|
| View all lists | ✅ |
| View all items | ✅ |
| Check/uncheck items | ✅ |
| Edit item text | ✅ |
| Delete items | ✅ |
| Reorder lists | ✅ |
| Create new items | ❌ |
| Create new lists | ❌ |

### 8.2 Offline Indicators

- **Creating item while offline**: Toast "You're offline. Item will be added when back online."
- **Pending changes**: Global indicator in header (not per-item)

### 8.3 Data Persistence

- All data cached in IndexedDB via Dexie.js
- Cache updated after each successful sync
- Cache survives app close/reopen

## 9. Sync Behavior

### 9.1 Automatic Sync Triggers

- App becomes visible (`visibilitychange` event)
- Device comes online (`online` event)
- After any data mutation (immediate if online)

### 9.2 Manual Sync

- "Sync now" button in settings menu
- Triggers full sync regardless of pending changes

### 9.3 Conflict Resolution

- **Strategy**: Last Write Wins (LWW)
- **Comparison**: `updated_at` timestamps
- **Newer wins**: Server or client, whichever has later timestamp

### 9.4 Sync Notifications

- **Silent**: Normal sync, no notification
- **Toast**: Only when other user's changes pulled
- Text: "Lists updated from [other user]" or "Changes synced"

## 10. Non-Functional Requirements

### 10.1 Performance

- Initial load: < 2 seconds on 4G
- Interaction response: < 100ms
- Sync: Background, non-blocking

### 10.2 Security

- All data access controlled via Supabase RLS
- No sensitive data in localStorage (use IndexedDB)
- HTTPS only

### 10.3 Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Sufficient color contrast (WCAG AA)
- Touch targets minimum 44x44 points

### 10.4 Browser Support

- iOS Safari 16.4+ (PWA features)
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
