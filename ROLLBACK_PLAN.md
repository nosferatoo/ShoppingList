# Rollback Plan - Mobile Scroll Fix

**Date:** 2025-12-16
**Task:** Fix mobile scrolling - make CardHeader and add-item-form sticky

## Files to be Modified

1. `src/lib/components/ListCard.svelte`
2. `src/routes/+page.svelte` (minor adjustment if needed)

## Current State (Before Changes)

### ListCard.svelte - Current mobile styles:

**CardHeader (line ~294-297):**
```css
@media (max-width: 1023px) {
  :global(.card-header) {
    display: none;
  }
}
```

**items-container (line ~447-452):**
```css
/* Mobile: Parent handles scrolling */
@media (max-width: 1023px) {
  .items-container {
    overflow: visible;
  }
}

/* Mobile: let items container take natural height */
@media (max-width: 1023px) {
  .items-container {
    overflow-y: visible;
    height: auto;
    max-height: none;
    min-height: auto;
    flex-shrink: 1;
  }
}
```

### +page.svelte - Current mobile styles:

**list-slide (line ~1320-1333):**
```css
.list-slide {
  /* Layout */
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;

  /* Spacing - bottom padding for pagination dots */
  padding-bottom: calc(var(--space-12) + env(safe-area-inset-bottom, 0px));

  /* Smooth scrolling */
  -webkit-overflow-scrolling: touch;
}
```

## Rollback Commands

If changes need to be reverted:

```bash
# Option 1: Revert specific files to last commit
git checkout HEAD -- src/lib/components/ListCard.svelte
git checkout HEAD -- src/routes/+page.svelte

# Option 2: Revert to specific commit (use commit hash)
git log --oneline -5  # Find commit hash before changes
git checkout <commit-hash> -- src/lib/components/ListCard.svelte src/routes/+page.svelte

# Option 3: Manual rollback
# Restore the styles documented in "Current State" section above
```

## Testing Checklist After Changes

### Mobile Only (Desktop must remain unchanged):
- [ ] CardHeader is visible on mobile (list title, count, badge)
- [ ] CardHeader stays fixed at top when scrolling items
- [ ] "Add item..." input stays fixed below CardHeader when scrolling
- [ ] Only list items scroll (under the sticky header and input)
- [ ] No visual styling changes (colors, spacing, fonts remain same)
- [ ] Pagination dots remain fixed at bottom
- [ ] App header remains fixed at top

### Desktop (Must remain exactly as before):
- [ ] CardHeader visible and scrolls normally (NOT sticky)
- [ ] All existing desktop behavior unchanged
- [ ] No visual changes

## Implementation Plan

1. ✅ Create rollback documentation
2. ⏳ Remove `display: none` from CardHeader on mobile
3. ⏳ Add `position: sticky` to CardHeader on mobile
4. ⏳ Add `position: sticky` to add-item-form on mobile
5. ⏳ Revert items-container overflow changes
6. ⏳ Set proper z-index and backgrounds for sticky elements
7. ⏳ Test on mobile
8. ⏳ Verify desktop unchanged
