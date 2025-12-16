# Implementation Plan - UI/UX Improvements

## Overview
This document outlines the implementation plan for 7 key UI/UX improvements across mobile and desktop modes.

---

## Task Breakdown

### 1. Prevent Text Selection Throughout the App
**Goal:** Disable text selection everywhere except in editable input/textarea fields

**Implementation:**
- Add global CSS rule `user-select: none` to app container (already exists in +page.svelte line 1109)
- Add override rule to allow selection in input/textarea elements: `input, textarea { user-select: text }`
- Test on mobile and desktop to ensure:
  - List item names cannot be selected
  - Button text cannot be selected
  - Input fields and textareas CAN be selected

**Files to modify:**
- `src/app.css` or `src/routes/+page.svelte` styles

---

### 2. Mobile Header - Add Space Between Icon and Text
**Goal:** Increase gap between icons and text labels in the mobile header toggle buttons

**Current state:**
- Header.svelte line 192: `gap: var(--space-1-5)` in `.segment`

**Implementation:**
- Increase gap to `var(--space-2)` or `var(--space-2-5)` for better visual spacing

**Files to modify:**
- `src/lib/components/Header.svelte` (line 192)

---

### 3. Mobile Header - Reorder Toggle Buttons
**Goal:** Change button order from Lists/Master/Meals to Master/Lists/Meals

**Current order (Header.svelte lines 60-93):**
1. Lists
2. Master
3. Meals

**Implementation:**
- Reorder the button elements in the HTML to: Master, Lists, Meals
- Update any related logic if viewMode defaults or navigation depends on button order

**Files to modify:**
- `src/lib/components/Header.svelte` (lines 60-93)

---

### 4. Mobile - Fix Scrolling Area
**Goal:** Ensure only the main content area scrolls (marked in red rectangle in scrolling.png), NOT the header or footer/pagination dots

**Current state:**
- Header is fixed at top (line 115-119 in Header.svelte)
- Pagination dots are fixed at bottom (line 1335-1357 in +page.svelte)
- Main content should scroll in between

**Implementation:**
- Verify `.list-slide` (line 1320) has `overflow-y: auto`
- Ensure `.main-content` doesn't scroll - should be `overflow: hidden`
- Check that `.mobile-meals-view` also handles scrolling correctly (line 1292)
- Test on mobile to ensure header and dots stay fixed while content scrolls

**Files to modify:**
- `src/routes/+page.svelte` (styles section)
- Possibly `src/lib/components/ListCard.svelte` (need to investigate)

---

### 5. Desktop - Add Blur Effect to Modal Backgrounds
**Goal:** Apply backdrop blur effect to all modal overlays on desktop

**Implementation:**
- Find dialog/modal overlay component
- Add CSS `backdrop-filter: blur(8px)` or similar
- Apply to all modals:
  - Settings panel
  - Edit Lists modal
  - Dishes modal
  - Meal Planner modal
  - Edit Item dialog
  - Confirm dialog
  - Menu Confirmation dialog

**Files to investigate and modify:**
- `src/lib/components/ui/dialog/dialog-overlay.svelte`
- Individual modal components if they override overlay styles
- Check if modals use shadcn Dialog component or custom implementation

---

### 6. Meal Planner - Auto-Show Dish Selection on Add Day
**Goal:** When "+ add new day" is clicked, automatically display dish selection popup

**Implementation:**
- Find the "+ add new day" button handler in MealPlannerContent.svelte
- After the day is added, immediately trigger the dish selection UI
- This could be:
  - Opening a bottom sheet on mobile
  - Opening a dialog/dropdown on desktop
  - Inline selection component

**Files to investigate and modify:**
- `src/lib/components/MealPlannerContent.svelte` (find "+ add new day" button)
- Related dish selection components

**Questions to answer during implementation:**
- What component/UI is used for dish selection?
- How is it currently triggered?
- Does it need different handling for mobile vs desktop?

---

### 7. Review Shadcn Component Usage
**Goal:** Identify any custom HTML components that could be replaced with proper shadcn components

**Implementation:**
- Search for custom button implementations
- Check for custom dropdown/select implementations
- Look for custom dialog/modal implementations
- Identify form controls that aren't using shadcn
- Create a report of findings with recommendations

**Areas to review:**
- All components in `src/lib/components/`
- Page components in `src/routes/`
- Look for:
  - Custom `<button>` elements not using Button component
  - Custom dropdown menus not using DropdownMenu
  - Custom dialogs not using Dialog
  - Custom form inputs not using shadcn form components
  - Custom cards not using Card component

**Deliverable:**
- List of components that could be migrated
- Priority recommendations
- Get user approval before making changes

---

## Implementation Order

### Phase 1: Quick Fixes (Low Risk)
1. Task #2 - Header icon/text spacing
2. Task #3 - Header button reordering
3. Task #1 - Text selection prevention

### Phase 2: Scrolling & Layout (Medium Risk)
4. Task #4 - Mobile scrolling area

### Phase 3: Visual Enhancements (Low Risk)
5. Task #5 - Desktop modal blur effects

### Phase 4: Feature Enhancement (Medium Risk)
6. Task #6 - Meal planner auto-popup

### Phase 5: Code Review (No Changes Yet)
7. Task #7 - Shadcn component review & report

---

## Testing Checklist

### Mobile Testing
- [ ] Text selection works only in inputs
- [ ] Header spacing looks good
- [ ] Header buttons in correct order (Master/Lists/Meals)
- [ ] Only content area scrolls, not header/footer
- [ ] Meal planner auto-shows dish selector

### Desktop Testing
- [ ] Text selection works only in inputs
- [ ] All modals have blur effect on background
- [ ] Meal planner auto-shows dish selector
- [ ] No regressions in existing functionality

---

## Notes & Decisions

### Text Selection (Task #1)
- User confirmed: Only input/textarea fields should allow selection
- All other text (list items, labels, buttons) should not be selectable

### Scrolling Reference (Task #4)
- Reference image: `E:\Projekti\ShoppingList\scrolling.png`
- Red rectangle shows exact area that should scroll

### Meal Planner Popup (Task #6)
- User confirmed: Show dish selection IMMEDIATELY on click (not after day is added)
- Need to investigate current implementation to determine best approach

### Shadcn Review (Task #7)
- Report findings to user before making any changes
- User will decide which replacements to implement
- Priority: Components that improve accessibility or maintainability

---

## Questions for User (To be asked during implementation)

None at this time - all initial clarifications received.

---

## Timeline Estimate

**Note:** Providing task complexity, not time estimates per project instructions.

- **Phase 1:** Simple CSS/HTML changes - Low complexity
- **Phase 2:** Layout debugging - Medium complexity (may need trial/error)
- **Phase 3:** CSS enhancement - Low complexity
- **Phase 4:** Feature logic - Medium complexity (depends on existing structure)
- **Phase 5:** Code review - Low complexity (research/documentation)
