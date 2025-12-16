# Mobile Scrolling Layout - Visualization Options

**Purpose:** Confirm understanding before implementation
**Scope:** Mobile view only (desktop unchanged)

---

## Current Implementation (INCORRECT)

```
┌─────────────────────────────────────┐
│  Master  [Lists]  Meals        ⚙️   │ ← Fixed App Header
├─────────────────────────────────────┤
│                                     │
│  🛒 Spar                            │ ← All content scrolls together
│  35 of 37 completed  [Shared...]   │    (WRONG - everything moves)
│                                     │
│  Add item...                    +   │
│                                     │
│  ☐ Francoska                        │
│  ☐ Kruh                             │
│  ─────────────────────────────      │
│  ☑ Avokadovo olje            x5     │
│  ☑ Čebula                    x2     │
│  ☑ Citronska                        │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│        • • • • • • • •              │ ← Fixed Pagination Dots
└─────────────────────────────────────┘
```

**Issue:** The entire content area scrolls, including list header and "Add item..." input.

---

## OPTION A: Sticky Card Header (Show existing CardHeader on mobile)

```
┌─────────────────────────────────────┐
│  Master  [Lists]  Meals        ⚙️   │ ← Fixed App Header
├─────────────────────────────────────┤
│                                     │
│  🛒 Spar                            │ ← STICKY (CardHeader visible)
│  35 of 37 completed  [Shared...]   │    Always visible, doesn't scroll
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Add item...                    +   │ ← STICKY (add-item-form)
│                                     │    Always visible, doesn't scroll
├═════════════════════════════════════┤
│║                                   ║│
│║ ☐ Francoska                      ║│ ← SCROLLABLE AREA
│║ ☐ Kruh                           ║│    Only this section scrolls
│║ ─────────────────────────────    ║│
│║ ☑ Avokadovo olje            x5   ║│
│║ ☑ Čebula                    x2   ║│
│║ ☑ Citronska                      ║│
│║ ☑ Čokoladne kapljice             ║│
│║ ☑ Deo Petra                      ║│
│║ ☑ Dorina                    x2   ║│
│║ ☑ Kakav za peko                  ║│
│║ ☑ Kisla smetana                  ║│
│║ ☑ Korenje                        ║│
│║ ☑ Majoneza                       ║│
│║ ...                              ║│
│║                                   ║│
│╚═══════════════════════════════════╝│
│                                     │
├─────────────────────────────────────┤
│        • • • • • • • •              │ ← Fixed Pagination Dots
└─────────────────────────────────────┘
```

**Layout:**
- Fixed: App Header
- Sticky: List info (icon, title, count, badge) - CardHeader component
- Sticky: Add item input
- Scrollable: Items list only
- Fixed: Pagination dots

**Pros:**
- Uses existing CardHeader component
- Consistent styling (desktop and mobile use same component)

**Cons:**
- CardHeader includes some desktop-specific elements that may need hiding

---

## OPTION B: New Mobile Header (Create mobile-specific sticky section)

```
┌─────────────────────────────────────┐
│  Master  [Lists]  Meals        ⚙️   │ ← Fixed App Header
├─────────────────────────────────────┤
│                                     │
│  🛒 Spar                            │ ← STICKY (New mobile header)
│  35 of 37 completed  [Shared...]   │    Always visible, doesn't scroll
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Add item...                    +   │ ← STICKY (add-item-form)
│                                     │    Always visible, doesn't scroll
├═════════════════════════════════════┤
│║                                   ║│
│║ ☐ Francoska                      ║│ ← SCROLLABLE AREA
│║ ☐ Kruh                           ║│    Only this section scrolls
│║ ─────────────────────────────    ║│
│║ ☑ Avokadovo olje            x5   ║│
│║ ☑ Čebula                    x2   ║│
│║ ☑ Citronska                      ║│
│║ ☑ Čokoladne kapljice             ║│
│║ ☑ Deo Petra                      ║│
│║ ☑ Dorina                    x2   ║│
│║ ☑ Kakav za peko                  ║│
│║ ☑ Kisla smetana                  ║│
│║ ☑ Korenje                        ║│
│║ ☑ Majoneza                       ║│
│║ ...                              ║│
│║                                   ║│
│╚═══════════════════════════════════╝│
│                                     │
├─────────────────────────────────────┤
│        • • • • • • • •              │ ← Fixed Pagination Dots
└─────────────────────────────────────┘
```

**Layout:**
- Fixed: App Header
- Sticky: New mobile-specific header (list info)
- Sticky: Add item input
- Scrollable: Items list only
- Fixed: Pagination dots

**Pros:**
- Clean mobile-specific implementation
- Full control over mobile header layout
- No need to modify CardHeader visibility logic

**Cons:**
- Duplicate code (CardHeader for desktop, new header for mobile)
- Need to maintain two header implementations

---

## CLARIFICATION: "Not in red rectangle"

Based on your comment that list name/badge/count should be "fixed on top of card, but NOT in red rectangle", I interpret this as:

**Interpretation 1:** List info should be ABOVE the red rectangle area (outside scrolling zone)
```
┌─────────────────────────────────────┐
│  Master  [Lists]  Meals        ⚙️   │ ← Fixed App Header
├─────────────────────────────────────┤
│  🛒 Spar                            │ ← STICKY - Outside red rectangle
│  35 of 37 completed  [Shared...]   │    (Not part of scrollable area)
├─────────────────────────────────────┤ ← This is where red rectangle starts
│  Add item...                    +   │ ← STICKY - Top of scrollable card
├═════════════════════════════════════┤
│║ ☐ Francoska                      ║│ ← SCROLLABLE - Inside scrollable card
│║ ☐ Kruh                           ║│
│║ ...                              ║│
```

**Interpretation 2:** Red rectangle should only include the scrollable items area
```
┌─────────────────────────────────────┐
│  Master  [Lists]  Meals        ⚙️   │ ← Fixed App Header
├─────────────────────────────────────┤
│  🛒 Spar                            │ ← STICKY - Not in red rect
│  35 of 37 completed  [Shared...]   │
│                                     │
│  Add item...                    +   │ ← STICKY - Not in red rect
├═[RED RECTANGLE STARTS]═════════════┤
│║ ☐ Francuska                      ║│ ← SCROLLABLE - Red rect area
│║ ☐ Kruh                           ║│
│║ ...                              ║│
│╚═[RED RECTANGLE ENDS]═══════════════╝
├─────────────────────────────────────┤
│        • • • • • • • •              │ ← Fixed Pagination Dots
```

---

## Questions for Approval

1. **Which OPTION do you prefer?**
   - [ ] Option A: Make existing CardHeader visible and sticky on mobile
   - [ ] Option B: Create new mobile-specific sticky header

2. **Which INTERPRETATION of "not in red rectangle" is correct?**
   - [ ] Interpretation 1: List info is separate from card (above red rectangle area)
   - [ ] Interpretation 2: Red rectangle only covers the scrollable items (list info is sticky but part of card structure)

3. **Should styling remain EXACTLY as it looks now?**
   - [ ] Yes - Only change scroll behavior, keep all visual styling identical
   - [ ] No - Minor styling adjustments are acceptable

Please review and approve one option from each question, and I'll proceed with implementation.
