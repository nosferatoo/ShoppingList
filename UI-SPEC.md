# UI-SPEC.md — User Interface Specification

## Design System

### Color Palette

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a;      /* Near black - main background */
  --bg-secondary: #141414;    /* Cards, elevated surfaces */
  --bg-tertiary: #1f1f1f;     /* Inputs, hover states */
  --bg-hover: #262626;        /* Interactive hover */
  
  /* Accent Colors */
  --accent-primary: #f97316;  /* Orange - primary actions, highlights */
  --accent-hover: #fb923c;    /* Orange hover state */
  --accent-muted: #c2410c;    /* Orange pressed/muted */
  
  /* Blues */
  --blue-dark: #1e3a5f;       /* Subtle accents, borders */
  --blue-medium: #2563eb;     /* Links, secondary actions */
  --blue-light: #3b82f6;      /* Hover states */
  
  /* Text */
  --text-primary: #fafafa;    /* Primary text */
  --text-secondary: #a3a3a3;  /* Checked items, secondary text */
  --text-muted: #525252;      /* Placeholders, disabled */
  --text-inverse: #0a0a0a;    /* Text on light backgrounds */
  
  /* Semantic */
  --success: #22c55e;         /* Success states */
  --error: #ef4444;           /* Error states, delete actions */
  --warning: #f59e0b;         /* Warning states */
  
  /* Borders */
  --border-subtle: #262626;   /* Subtle dividers */
  --border-default: #404040;  /* Default borders */
  --border-focus: #f97316;    /* Focus rings */
}
```

### Typography

```css
/* Fonts - loaded via Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@600;700&display=swap');

:root {
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-heading: 'Montserrat', var(--font-body);
  
  /* Font Sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  
  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}

/* Base styles */
body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background-color: var(--bg-primary);
}

h1, h2, h3 {
  font-family: var(--font-heading);
  font-weight: var(--font-semibold);
}
```

### Spacing Scale

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
}
```

### Border Radius

```css
:root {
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-full: 9999px;  /* Pill shape */
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5);
}
```

### Transitions

```css
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}
```

---

## Component Specifications

### Header

```
┌─────────────────────────────────────────────────────────────────┐
│  [List Name]                                            ⚙️     │
│  or [App Logo] on desktop                               (gear) │
└─────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Height: 56px (mobile), 64px (desktop)
- Background: `--bg-secondary`
- Position: Fixed top
- Z-index: 50
- Padding: `--space-4` horizontal
- Border bottom: 1px `--border-subtle`

**Elements:**
- **Title**: `--text-lg`, `--font-semibold`, `--text-primary`
- **Settings icon**: 24px, `--text-secondary`, hover: `--text-primary`

---

### List Card (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  🛒 Groceries                                         [Shared]  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Add item...                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  □ Apples                                                       │
│  □ Bread                                                        │
│  □ Milk                                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  ☑ Butter                                          (dimmed)    │
│  ☑ Eggs                                            (dimmed)    │
└─────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Background: `--bg-secondary`
- Border radius: `--radius-lg`
- Min width: 300px
- Max width: 400px
- Shadow: `--shadow-md`
- Padding: `--space-4`

**Header section:**
- Icon: 20px, `--text-secondary`
- Title: `--text-lg`, `--font-semibold`
- Badge: `--text-xs`, `--bg-tertiary`, `--radius-sm`, padding `--space-1` `--space-2`

---

### List Item

```
┌─────────────────────────────────────────────────────────────────┐
│  ☐  Item text here                                    ✏️  🗑️   │
└─────────────────────────────────────────────────────────────────┘
     │                                                   │
     └─ Checkbox (24px)                                  └─ Actions (hover/swipe)
```

**Specifications:**
- Height: 48px minimum (for touch targets)
- Padding: `--space-3` vertical, `--space-4` horizontal
- Border bottom: 1px `--border-subtle`
- Transition: `--transition-fast`

**States:**
- **Unchecked**: `--text-primary`
- **Checked**: `--text-secondary`, no strikethrough
- **Hover**: `--bg-hover`
- **Swiped (mobile)**: Reveals action buttons

**Checkbox:**
- Size: 24px × 24px
- Border: 2px `--border-default`
- Checked: `--accent-primary` background, white checkmark
- Border radius: `--radius-sm`

**Action Buttons (revealed on swipe/hover):**
- Edit: `--blue-medium` background, pencil icon
- Delete: `--error` background, trash icon
- Size: 48px × 48px (full height of item)

---

### Input Field

```
┌─────────────────────────────────────────────────────────────────┐
│  Add item...                                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Height: 44px
- Background: `--bg-tertiary`
- Border: 1px `--border-subtle`
- Border radius: `--radius-md`
- Padding: `--space-3` horizontal
- Font size: `--text-base`

**States:**
- **Placeholder**: `--text-muted`
- **Focus**: Border `--border-focus`, outline none
- **Filled**: `--text-primary`

---

### Settings Menu

```
┌─────────────────────────────────────────────────────────────────┐
│  user@example.com                                               │
├─────────────────────────────────────────────────────────────────┤
│  📝  Edit lists                                            →   │
├─────────────────────────────────────────────────────────────────┤
│  🔄  Sync now                                                   │
├─────────────────────────────────────────────────────────────────┤
│  🚪  Log out                                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Mobile**: Full-screen slide from right
**Desktop**: Dropdown menu from settings icon

**Specifications:**
- Background: `--bg-secondary`
- Border radius: `--radius-lg` (desktop only)
- Shadow: `--shadow-lg` (desktop only)
- Item height: 52px
- Item padding: `--space-4`
- Divider: 1px `--border-subtle`

---

### Edit Lists Page

```
┌─────────────────────────────────────────────────────────────────┐
│  ←  Edit Lists                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ⋮⋮  🛒  Groceries                              [Shared]   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ⋮⋮  ✓   Home Tasks                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ⋮⋮  ✓   Work Tasks                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              + Add new list                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**List item in edit mode:**
- Drag handle: `⋮⋮` icon, `--text-muted`, 24px
- Tap anywhere on row: Opens rename modal/inline edit
- Swipe left (mobile) or hover (desktop): Reveals delete button

**Add button:**
- Full width
- Border: 2px dashed `--border-default`
- Text: `--text-secondary`
- Hover: Border `--accent-primary`, text `--accent-primary`

---

### Toast Notification

```
┌─────────────────────────────────────────────────────────────────┐
│  "Milk" deleted                                      [ UNDO ]   │
└─────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Position: Fixed bottom, centered
- Margin bottom: `--space-6` + safe area
- Background: `--bg-secondary`
- Border: 1px `--border-default`
- Border radius: `--radius-lg`
- Padding: `--space-3` `--space-4`
- Shadow: `--shadow-lg`
- Animation: Slide up + fade in

**Undo button:**
- Text: `--accent-primary`
- Font weight: `--font-semibold`
- Uppercase

**Auto-dismiss**: 5 seconds

---

### Sync Indicator

```
Location: Right side of header, left of settings icon

States:
- Hidden: No pending changes
- Syncing: Cloud icon with rotating arrows, "Syncing..."
- Pending: Cloud icon with small badge, "{n} pending"
```

**Specifications:**
- Icon size: 20px
- Text: `--text-xs`, `--text-secondary`
- Gap: `--space-1` between icon and text

---

### Pagination Dots (Mobile)

```
                    ● ○ ○ ○ ○
```

**Purpose:** Indicates which **list** is currently visible when swiping between lists horizontally. NOT for paginating items within a list.

- 4 dots = user has 4 lists
- Filled dot = currently visible list
- Swipe left/right to navigate between lists

**Specifications:**
- Position: Fixed bottom, centered
- Margin bottom: `--space-4` + safe area
- Dot size: 8px
- Gap: `--space-2`
- Active: `--accent-primary`
- Inactive: `--text-muted`

---

### Login Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                         🛒 Lists                                │
│                                                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Email                                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Password                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Sign In                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Center-aligned content
- Max width: 320px
- Logo/title: `--text-2xl`, `--font-heading`, `--font-bold`
- Inputs: Standard input field style
- Button: Full width, `--accent-primary` background, `--text-inverse`
- Error state: Red border on inputs, error message below

---

## Responsive Breakpoints

```css
/* Mobile first */
/* Default: Mobile (< 640px) */

/* Tablet */
@media (min-width: 640px) { /* sm */ }

/* Desktop */
@media (min-width: 1024px) { /* lg */ }

/* Large desktop */
@media (min-width: 1280px) { /* xl */ }
```

---

## Layout: Mobile

```
┌─────────────────────────────────────────┐
│             HEADER (fixed)              │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │  ← Sticky input
│  │         Add item...               │  │    (stays visible)
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │  ↑
│  │  □ Item 1                         │  │  │
│  ├───────────────────────────────────┤  │  │
│  │  □ Item 2                         │  │  │
│  ├───────────────────────────────────┤  │  │  Vertical scroll
│  │  □ Item 3                         │  │  │  for items
│  ├───────────────────────────────────┤  │  │  (no limit)
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  │  │
│  ├───────────────────────────────────┤  │  │
│  │  ☑ Item 4 (dimmed)                │  │  │
│  ├───────────────────────────────────┤  │  │
│  │  ☑ Item 5 (dimmed)                │  │  ↓
│  └───────────────────────────────────┘  │
│                                         │
│              ● ○ ○ ○                    │  ← List navigation dots
│                                         │     (swipe left/right
└─────────────────────────────────────────┘      between lists)
```

**List navigation:** Swipe LEFT/RIGHT to switch between different lists (Groceries → Tasks → etc.)

**Item scrolling:** Scroll UP/DOWN to see more items within the current list

**Sticky elements:**
- Header: Fixed at top
- Input field: Sticky below header (remains visible while scrolling items)
- Pagination dots: Fixed at bottom
```

---

## Layout: Desktop

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    HEADER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │  🛒 Groceries        │  │  ✓ Home Tasks        │  │  ✓ Work Tasks        │  │
│  ├──────────────────────┤  ├──────────────────────┤  ├──────────────────────┤  │
│  │  [Add item...]       │  │  [Add item...]       │  │  [Add item...]       │  │
│  ├──────────────────────┤  ├──────────────────────┤  ├──────────────────────┤  │
│  │  □ Milk              │  │  □ Fix sink          │  │  □ Review PR         │  │
│  │  □ Bread             │  │  □ Call plumber      │  │  □ Write docs        │  │
│  │  □ Eggs              │  │  ────────────        │  │  ────────────        │  │
│  │  ────────────        │  │  ☑ Mow lawn          │  │  ☑ Deploy            │  │
│  │  ☑ Butter            │  │                      │  │                      │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Grid specifications:**
- Container: Max width 1400px, centered
- Gap: `--space-6`
- Padding: `--space-6`
- Columns: `repeat(auto-fit, minmax(300px, 1fr))`
- Max columns: 4

---

## Icons

Use Lucide icons (available in shadcn-svelte):

| Purpose | Icon Name | Size |
|---------|-----------|------|
| Shopping list | `ShoppingCart` | 20px |
| To-do list | `CheckCircle` | 20px |
| Settings | `Settings` | 24px |
| Edit | `Pencil` | 18px |
| Delete | `Trash2` | 18px |
| Back | `ArrowLeft` | 24px |
| Add | `Plus` | 24px |
| Drag handle | `GripVertical` | 20px |
| Sync | `RefreshCw` | 20px |
| Cloud sync | `Cloud` | 20px |
| Offline | `CloudOff` | 20px |
| Logout | `LogOut` | 20px |
| Check | `Check` | 18px |

---

## Animations

### Swipe to Reveal (Mobile)

```css
.item-actions {
  transform: translateX(100%);
  transition: transform var(--transition-normal);
}

.item-swiped .item-actions {
  transform: translateX(0);
}
```

### Toast Entrance

```css
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toast {
  animation: toast-in var(--transition-normal);
}
```

### Hover Fade In (Desktop)

```css
.item-actions {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.item:hover .item-actions {
  opacity: 1;
}
```

### List Swipe Navigation (Mobile)

Horizontal swipe to navigate between different lists (not items).

```css
.lists-container {
  display: flex;
  overflow-x: hidden;
  scroll-snap-type: x mandatory;
}

.list-view {
  flex: 0 0 100%;
  scroll-snap-align: start;
}
```

### Item Vertical Scroll

Items within a list scroll vertically. Input field stays sticky.

```css
.list-content {
  display: flex;
  flex-direction: column;
  height: calc(100vh - header - dots);
  overflow: hidden;
}

.input-container {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-primary);
}

.items-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

---

## Accessibility

### Focus States

- All interactive elements have visible focus rings
- Focus ring: 2px `--border-focus` with 2px offset
- Tab order follows visual order

### Touch Targets

- Minimum size: 44px × 44px
- Adequate spacing between targets

### Color Contrast

- Text on backgrounds: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- Interactive elements: Clearly distinguishable

### Screen Reader

- Semantic HTML elements
- ARIA labels on icon buttons
- Status updates announced (sync complete, item deleted)
