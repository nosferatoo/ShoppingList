// Generate placeholder PWA icons for development
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// Check if sharp is available (optional dependency)
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not available, will generate SVG icons instead');
}

const ICONS_DIR = path.join(__dirname, '../static/icons');
const SIZES = [192, 512];

// App colors from theme
const BACKGROUND = '#0a0a0a'; // Dark background
const ACCENT = '#f97316';      // Orange accent
const TEXT = '#fafafa';        // White text

/**
 * Create SVG icon
 */
function createSVG(size) {
  const padding = size * 0.1; // 10% padding
  const iconSize = size - (padding * 2);
  const fontSize = size * 0.35;
  const checkmarkSize = size * 0.25;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${BACKGROUND}"/>

  <!-- Orange accent circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${iconSize/2}" fill="${ACCENT}"/>

  <!-- Checkmark icon -->
  <g transform="translate(${size/2 - checkmarkSize/2}, ${size/2 - checkmarkSize/2})">
    <path
      d="M ${checkmarkSize * 0.2} ${checkmarkSize * 0.5} L ${checkmarkSize * 0.45} ${checkmarkSize * 0.75} L ${checkmarkSize * 0.85} ${checkmarkSize * 0.25}"
      stroke="${TEXT}"
      stroke-width="${checkmarkSize * 0.15}"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
  </g>

  <!-- Text "L" for Lists -->
  <text
    x="${size/2}"
    y="${size * 0.75}"
    font-family="Arial, sans-serif"
    font-size="${fontSize * 0.6}"
    font-weight="bold"
    fill="${TEXT}"
    text-anchor="middle"
  >L</text>
</svg>`;
}

/**
 * Generate icons using Sharp (if available)
 */
async function generateWithSharp() {
  console.log('Generating PNG icons with Sharp...');

  for (const size of SIZES) {
    const svg = createSVG(size);
    const outputPath = path.join(ICONS_DIR, `icon-${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✓ Created ${outputPath}`);
  }

  console.log('\n✅ All PNG icons generated successfully!');
}

/**
 * Generate SVG icons (fallback)
 */
function generateSVG() {
  console.log('Generating SVG icons (convert to PNG manually)...\n');

  for (const size of SIZES) {
    const svg = createSVG(size);
    const outputPath = path.join(ICONS_DIR, `icon-${size}.svg`);

    fs.writeFileSync(outputPath, svg);
    console.log(`✓ Created ${outputPath}`);
  }

  console.log('\n⚠️  SVG icons created. To convert to PNG:');
  console.log('\nOption 1: Use an online converter');
  console.log('  - Visit https://cloudconvert.com/svg-to-png');
  console.log('  - Upload icon-192.svg and icon-512.svg');
  console.log('  - Download and rename to icon-192.png and icon-512.png');
  console.log('\nOption 2: Install Sharp and re-run');
  console.log('  npm install sharp');
  console.log('  node scripts/generate-icons.js');
  console.log('\nOption 3: Use ImageMagick (if installed)');
  console.log('  convert static/icons/icon-192.svg static/icons/icon-192.png');
  console.log('  convert static/icons/icon-512.svg static/icons/icon-512.png');
}

/**
 * Main function
 */
async function main() {
  console.log('PWA Icon Generator\n');
  console.log('=================\n');

  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
    console.log(`✓ Created directory: ${ICONS_DIR}\n`);
  }

  if (sharp) {
    await generateWithSharp();
  } else {
    generateSVG();
  }

  console.log('\n📝 Note: These are placeholder icons for development.');
  console.log('   For production, design custom icons following the guidelines');
  console.log('   in static/icons/README.md\n');
}

// Run
main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
