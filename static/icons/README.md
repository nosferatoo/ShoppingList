# PWA Icons

This directory contains the Progressive Web App (PWA) icons used for installation on mobile devices and desktops.

## Required Icons

You need to create **2 icon files** in this directory:

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

## Design Guidelines

### Size Requirements

| File | Size | Purpose |
|------|------|---------|
| icon-192.png | 192×192 | Android home screen, app drawer |
| icon-512.png | 512×512 | Splash screen, high-res displays |

### Design Specifications

- **Format**: PNG with transparency
- **Color space**: sRGB
- **Safe area**: Keep important content within 80% of the canvas (to accommodate different mask shapes)
- **Background**: Design should work on both light and dark backgrounds
- **Simplicity**: Icon should be recognizable at small sizes (48px)

### Visual Guidelines

```
┌─────────────────────────────────────┐
│  10% padding                        │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │    80% safe area            │   │
│   │    (your design here)       │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

#### Why Safe Area?
Different platforms mask icons into different shapes:
- **Android**: Circle, rounded square, or squircle
- **iOS**: Rounded rectangle
- **Windows**: Square

Keeping your design within the safe area ensures it looks good on all platforms.

## Creating Icons

### Option 1: Design from Scratch

**Recommended tool**: Figma, Sketch, Adobe Illustrator, or Inkscape

1. Create a new artboard: **512×512 pixels**
2. Add a **51.2px padding** on all sides (10%)
3. Design your icon in the **409.6×409.6px** safe area
4. Export as PNG:
   - `icon-512.png` at 512×512
   - `icon-192.png` at 192×192 (scaled down)

**Design Ideas for This App:**
- Shopping cart icon
- Checklist icon
- Combination of cart + checkmark
- Minimalist "L" for Lists
- Simple geometric shape with app colors

**Color Scheme:**
- Primary: `#0a0a0a` (dark)
- Accent: Choose a vibrant color for contrast
- Background: Can be transparent or solid

### Option 2: Use PWA Asset Generator

Visit [pwabuilder.com/imageGenerator](https://www.pwabuilder.com/imageGenerator)

1. Upload a single large icon (1024×1024 or larger)
2. Select "Generate"
3. Download the generated package
4. Extract `icon-192.png` and `icon-512.png` to this directory

### Option 3: Quick Placeholder (Development Only)

For development/testing, you can create simple placeholder icons using code:

#### Using ImageMagick:
```bash
# Create 192x192 icon
convert -size 192x192 xc:#0a0a0a -fill white -gravity center \
  -pointsize 80 -annotate +0+0 "L" icon-192.png

# Create 512x512 icon
convert -size 512x512 xc:#0a0a0a -fill white -gravity center \
  -pointsize 220 -annotate +0+0 "L" icon-512.png
```

#### Using Canvas API (in browser console):
```js
function createIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, size, size);

  // Text
  ctx.fillStyle = 'white';
  ctx.font = `${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('L', size / 2, size / 2);

  // Download
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icon-${size}.png`;
    a.click();
  });
}

// Run in console:
createIcon(192);
createIcon(512);
```

## Testing Icons

### Test in Browser

1. **Chrome DevTools**
   - F12 → Application → Manifest
   - Check "Icons" section
   - Icons should load without errors

2. **Lighthouse**
   - F12 → Lighthouse → Generate report
   - Check "Installable" section
   - Icons should pass all requirements

### Test on Device

1. **iOS**
   ```
   Safari → Share → Add to Home Screen
   Check: Icon appears correctly on home screen
   ```

2. **Android**
   ```
   Chrome → Menu → Install app
   Check: Icon appears in app drawer and home screen
   ```

3. **Desktop**
   ```
   Chrome → Install icon in address bar
   Check: Icon appears in taskbar/dock
   ```

## Icon Checklist

Before deploying to production, verify:

- [ ] Both `icon-192.png` and `icon-512.png` exist
- [ ] Files are exactly 192×192 and 512×512 pixels
- [ ] Icons are in PNG format
- [ ] Important content is within safe area (80%)
- [ ] Icon is visible on both light and dark backgrounds
- [ ] Icon is recognizable at small sizes (48px)
- [ ] No text is cut off or unclear
- [ ] Lighthouse "Installable" audit passes
- [ ] Icon displays correctly on test devices

## Examples of Good PWA Icons

**Characteristics:**
- Simple, bold design
- High contrast
- Recognizable at any size
- Consistent with brand
- Works in any shape

**Examples to Reference:**
- Twitter: Simple bird silhouette
- Slack: Geometric hash shape
- Notion: Solid "N" lettermark
- Todoist: Minimal checkmark

## Troubleshooting

### Icon not showing on home screen
- Check file names are exactly `icon-192.png` and `icon-512.png`
- Verify files are in `static/icons/` directory
- Clear browser cache and reinstall app
- Check manifest.json paths are correct

### Icon looks pixelated
- Ensure you're exporting at exact pixel dimensions
- Don't scale up a smaller image
- Use vector graphics in design tool, export as PNG

### Icon gets cropped
- Reduce design size to stay within 80% safe area
- Test with circular mask to see worst-case cropping
- Add more padding around main content

### Wrong icon showing
- Clear browser cache: Ctrl+Shift+Delete
- Uninstall app and reinstall
- Check no old icons cached in `static/icons/`
- Hard refresh: Ctrl+Shift+R

## Resources

- [PWA Icon Guidelines](https://web.dev/maskable-icon/)
- [Maskable.app](https://maskable.app/) - Test your icon with different masks
- [PWABuilder Image Generator](https://www.pwabuilder.com/imageGenerator)
- [Favicon Generator](https://realfavicongenerator.net/) - Also generates PWA icons
