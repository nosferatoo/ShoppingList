# PWA Icon Setup Guide

Quick guide to generate and install PWA icons for the Shopping & To-Do Lists app.

## TL;DR - Quick Start

### Method 1: Browser-Based (Easiest - No Dependencies)

1. Open `scripts/generate-icons.html` in your browser
2. Customize colors if needed
3. Click "Download Both"
4. Save files as `icon-192.png` and `icon-512.png`
5. Move to `static/icons/` directory
6. Done! ✅

### Method 2: Node.js Script (With Sharp - Best Quality)

```bash
# Install Sharp (optional, for PNG generation)
npm install sharp

# Generate icons
npm run icons

# Icons created in static/icons/
```

### Method 3: Node.js Script (Without Sharp - SVG Output)

```bash
# Generate SVG icons
npm run icons

# Convert SVG to PNG manually:
# - Use online converter (cloudconvert.com/svg-to-png)
# - Or ImageMagick: convert icon-192.svg icon-192.png
```

## Current Configuration

### Manifest (`static/manifest.json`)

```json
{
  "name": "Shopping & To-Do Lists",
  "short_name": "Lists",
  "theme_color": "#f97316",        // Orange accent
  "background_color": "#0a0a0a",   // Dark background
  "display": "standalone",
  "icons": [...]
}
```

### Theme Colors

The manifest uses your app's color scheme:

| Property | Color | Usage |
|----------|-------|-------|
| `background_color` | #0a0a0a | Dark background (app shell) |
| `theme_color` | #f97316 | Orange accent (status bar, browser UI) |

**Theme Color Preview:**
- **iOS Safari**: Status bar will be orange (#f97316)
- **Android Chrome**: Address bar will be orange when app is open
- **Desktop**: Browser theme color in installed app window

### Icon Specifications

| Size | Purpose | Used For |
|------|---------|----------|
| 192×192 | Standard | Home screen icon, app drawer |
| 512×512 | High-res | Splash screen, high-DPI displays |

Both sizes support:
- `purpose: "any"` - Standard display
- `purpose: "maskable"` - Adapts to different shapes (circle, square, etc.)

## Detailed Instructions

### Using the Browser-Based Generator

1. **Open the generator**
   ```bash
   # Open in browser
   scripts/generate-icons.html
   ```

2. **Customize (optional)**
   - Background Color: Default #0a0a0a (dark)
   - Accent Color: Default #f97316 (orange)
   - Text Color: Default #fafafa (white)
   - Icon Text: Default "L" (for Lists)

3. **Download icons**
   - Click "Download Both" button
   - Two files will download:
     - `icon-192.png`
     - `icon-512.png`

4. **Install icons**
   ```bash
   # Move to icons directory
   mv icon-192.png static/icons/
   mv icon-512.png static/icons/
   ```

5. **Verify**
   ```bash
   # Check files exist
   ls -lh static/icons/
   # Should show:
   # icon-192.png (varies, ~5-15KB)
   # icon-512.png (varies, ~15-40KB)
   ```

### Using the Node.js Script

#### With Sharp (Recommended)

Sharp generates high-quality PNG files directly.

```bash
# Install Sharp
npm install sharp

# Generate icons
npm run icons

# Output:
# PWA Icon Generator
# =================
# Generating PNG icons with Sharp...
# ✓ Created static/icons/icon-192.png
# ✓ Created static/icons/icon-512.png
# ✅ All PNG icons generated successfully!
```

#### Without Sharp (SVG Fallback)

If Sharp is not installed, the script generates SVG files.

```bash
# Generate SVG icons
npm run icons

# Output:
# PWA Icon Generator
# =================
# Generating SVG icons (convert to PNG manually)...
# ✓ Created static/icons/icon-192.svg
# ✓ Created static/icons/icon-512.svg
```

Convert SVG to PNG using one of these methods:

**Option A: Online Converter**
1. Visit https://cloudconvert.com/svg-to-png
2. Upload `icon-192.svg` and `icon-512.svg`
3. Download converted PNGs
4. Move to `static/icons/`

**Option B: ImageMagick (if installed)**
```bash
convert static/icons/icon-192.svg static/icons/icon-192.png
convert static/icons/icon-512.svg static/icons/icon-512.png
```

**Option C: Inkscape (if installed)**
```bash
inkscape icon-192.svg --export-filename=icon-192.png
inkscape icon-512.svg --export-filename=icon-512.png
```

## Icon Design

### Current Placeholder Design

The generated icons feature:

```
┌─────────────────────────────────┐
│  Dark background (#0a0a0a)      │
│                                 │
│     ┌─────────────────┐         │
│     │                 │         │
│     │  Orange Circle  │         │
│     │   (#f97316)     │         │
│     │                 │         │
│     │    ✓ Check      │         │
│     │       +          │         │
│     │      "L"        │         │
│     └─────────────────┘         │
│                                 │
└─────────────────────────────────┘
```

### Customizing the Design

Edit `scripts/generate-icons.js` or `scripts/generate-icons.html` to change:

**In generate-icons.js:**
```javascript
// Line 13-15: Change colors
const BACKGROUND = '#0a0a0a';  // Dark background
const ACCENT = '#f97316';      // Orange accent
const TEXT = '#fafafa';        // White text

// createSVG() function: Modify design
// - Change shapes
// - Add/remove elements
// - Adjust sizes and positioning
```

**In generate-icons.html:**
```html
<!-- Line ~185: Default colors -->
const DEFAULT_COLORS = {
  bg: '#0a0a0a',
  accent: '#f97316',
  text: '#fafafa'
};

<!-- drawIcon() function: Modify design -->
<!-- - Line ~195: Background -->
<!-- - Line ~200: Circle -->
<!-- - Line ~205: Checkmark -->
<!-- - Line ~220: Text -->
```

## Testing Icons

### Test in Browser (DevTools)

1. **Chrome DevTools**
   ```
   F12 → Application → Manifest
   ```

2. **Verify icons**
   - Check "Icons" section
   - Icons should load without errors
   - Should show 192×192 and 512×512 sizes

3. **Check manifest**
   - No errors in manifest
   - All properties valid

### Test on Device

#### iOS (Safari)

1. Open app in Safari
2. Tap Share button (square with arrow)
3. Scroll down, tap "Add to Home Screen"
4. Check preview - icon should appear correctly
5. Add to home screen
6. Verify icon on home screen

#### Android (Chrome)

1. Open app in Chrome
2. Look for install banner or:
   - Tap menu (⋮)
   - Select "Install app"
3. Check preview - icon should appear correctly
4. Install
5. Verify icon in app drawer and home screen

#### Desktop (Chrome/Edge)

1. Open app
2. Look for install icon in address bar (⊕)
3. Click to install
4. Check preview window
5. Install
6. Verify icon in taskbar/dock and app window

### Lighthouse Audit

```bash
# Open DevTools
F12 → Lighthouse → Generate report

# Check PWA section:
✅ Installable
  ✅ Web app manifest meets installability requirements
  ✅ Provides a valid apple-touch-icon
  ✅ Manifest includes icons of appropriate sizes
```

## Troubleshooting

### Icons not showing

**Problem:** Icons don't appear in manifest or on device

**Solutions:**
1. Check file paths:
   ```bash
   # Files must be in static/icons/
   ls static/icons/icon-*.png
   ```

2. Check file names exactly match:
   - `icon-192.png` (not `icon_192.png` or `icon-192x192.png`)
   - `icon-512.png`

3. Clear browser cache:
   - Ctrl+Shift+Delete → Clear cache
   - Hard reload: Ctrl+Shift+R

4. Verify manifest paths:
   ```json
   "icons": [
     {
       "src": "/icons/icon-192.png",  // Must start with /
       ...
     }
   ]
   ```

### Icons appear pixelated or blurry

**Problem:** Icons look low quality on high-DPI displays

**Solutions:**
1. Ensure exact pixel dimensions:
   ```bash
   # Check with imagemagick
   identify static/icons/icon-192.png
   # Should output: icon-192.png PNG 192x192 ...
   ```

2. Regenerate with Sharp (best quality):
   ```bash
   npm install sharp
   npm run icons
   ```

3. Don't scale up smaller images - generate at exact size

### Wrong icon showing

**Problem:** Old icon still appears after update

**Solutions:**
1. Clear all caches:
   ```javascript
   // In DevTools console
   caches.keys().then(keys =>
     Promise.all(keys.map(key => caches.delete(key)))
   )
   ```

2. Unregister service worker:
   ```
   F12 → Application → Service Workers → Unregister
   ```

3. Clear browser data:
   - Settings → Privacy → Clear browsing data
   - Check "Cached images and files"

4. Reinstall app:
   - Uninstall PWA from device
   - Reload website
   - Reinstall

### Script errors

**Problem:** `npm run icons` fails

**Solutions:**

**Error: `sharp not found`**
```bash
# Install sharp
npm install sharp
# Or use browser generator instead
```

**Error: `Cannot find module 'fs'`**
```bash
# Ensure you're using Node.js
node --version
# Should be v14 or higher
```

**Error: `ENOENT: no such file or directory`**
```bash
# Create icons directory
mkdir -p static/icons
# Run script again
npm run icons
```

## Production Icons

### When to Replace Placeholders

Replace the placeholder icons before deploying to production:

**Why?**
- Placeholders are generic
- Production needs brand recognition
- App Store guidelines require custom icons
- Better user experience

**When?**
- Before public launch
- Before submitting to app stores
- When branding is finalized

### Design Guidelines

See `static/icons/README.md` for detailed design guidelines including:
- Safe area requirements (80% of canvas)
- Maskable icon specifications
- Platform-specific considerations
- Design best practices

### Professional Icon Design

**Option 1: Design yourself**
- Use Figma, Sketch, Adobe Illustrator
- Follow guidelines in `static/icons/README.md`
- Export at exact pixel sizes (192×192, 512×512)

**Option 2: Use icon generator**
- [PWABuilder Image Generator](https://www.pwabuilder.com/imageGenerator)
- Upload logo/artwork (1024×1024 minimum)
- Download generated package
- Extract 192 and 512 sizes

**Option 3: Hire designer**
- Provide brand guidelines and color scheme
- Request PWA icon package
- Ensure maskable versions included

## Summary

✅ **Manifest configured** with proper theme colors
✅ **Two generation methods** (browser + Node.js)
✅ **Easy customization** of colors and design
✅ **Clear installation** instructions
✅ **Testing guide** for all platforms
✅ **Troubleshooting** for common issues

**Next steps:**
1. Generate placeholder icons (5 minutes)
2. Test installation on device
3. Design production icons when ready

**Quick commands:**
```bash
# Browser method (easiest)
open scripts/generate-icons.html

# Node.js method (best quality)
npm install sharp
npm run icons

# Verify installation
ls -lh static/icons/*.png
```
