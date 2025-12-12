// Convert custom icon.svg to PNG files
// Run: node scripts/convert-icon.js

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '../static/icons');
const SIZES = [192, 512];

async function convertIcon() {
  console.log('Converting icon.svg to PNG...\n');

  // Read the SVG file
  const svgPath = path.join(ICONS_DIR, 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Created ${outputPath}`);
  }

  console.log('\n✅ All PNG icons generated successfully!');
}

// Run
convertIcon().catch(err => {
  console.error('Error converting icons:', err);
  process.exit(1);
});
