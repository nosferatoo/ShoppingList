# New Approach: CSS Grid Layout (No Sticky/Fixed)

## Problem
`position: sticky` and `position: fixed` aren't working reliably in this nested structure.

## Solution: CSS Grid
Use Grid to create three rows:
1. CardHeader (non-scrolling)
2. Add-item-form (non-scrolling)
3. Items-container (scrollable)

## Implementation

### On Mobile:
```css
.list-card {
  display: grid;
  grid-template-rows: auto auto 1fr;
  height: 100%;
  overflow: hidden;
}

.card-header {
  grid-row: 1;
  /* Stays in place */
}

.card-content {
  grid-row: 2 / 4;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}

.add-item-form {
  grid-row: 1;
  /* Stays in place */
}

.items-container {
  grid-row: 2;
  overflow-y: auto;
  /* Only this scrolls */
}
```

This way:
- No sticky/fixed positioning
- Simple grid layout
- Reliable scrolling behavior
- Only items scroll, header and input stay in place
