# Mobile Scroll - Final Fix Strategy

## Current Problem (Line 520-525)

On mobile, `.items-container` has:
```css
height: calc(100vh - 208px);
overflow-y: auto; /* ← THIS is the scroll container */
```

**This is why sticky doesn't work** - sticky elements need to be inside the scroll container, but CardHeader and add-item-form are OUTSIDE `.items-container`!

## Solution

1. **Remove scrolling from `.items-container`** on mobile
2. **Let `.list-slide` be the scroll container** (it already has `overflow-y: auto`)
3. **Make CardHeader and add-item-form sticky** within `.list-slide`

## Implementation

### Step 1: Remove fixed height from items-container (mobile only)
```css
@media (max-width: 1023px) {
  .items-container {
    height: auto;
    overflow: visible;
  }
}
```

### Step 2: Show CardHeader and make it sticky
```css
@media (max-width: 1023px) {
  :global(.card-header) {
    display: flex; /* Show it */
    position: sticky;
    top: 0;
    background: var(--bg-primary);
    z-index: 10;
  }
}
```

### Step 3: Make add-item-form sticky below CardHeader
```css
@media (max-width: 1023px) {
  .add-item-form {
    position: sticky;
    top: 68px; /* Height of CardHeader */
    background: var(--bg-primary);
    z-index: 9;
  }
}
```

### Step 4: Ensure parent allows sticky
```css
@media (max-width: 1023px) {
  :global(.list-card) {
    overflow: visible;
  }
}
```
