// Generate simple PNG icons for the Chrome extension
const sharp = require('sharp')
const path = require('path')

const ICONS = [16, 48, 128]
const OUTPUT_DIR = path.join(__dirname, '..', 'chrome-extension', 'icons')

// Generate a simple icon: green rounded square with "DS" text
async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
      <text x="50%" y="50%" dy=".35em" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="${size * 0.45}"
            font-weight="bold" fill="white">DS</text>
    </svg>
  `
  const outputPath = path.join(OUTPUT_DIR, `icon${size}.png`)
  await sharp(Buffer.from(svg)).png().toFile(outputPath)
  console.log(`Generated: ${outputPath}`)
}

async function main() {
  for (const size of ICONS) {
    await generateIcon(size)
  }
  console.log('All icons generated')
}

main().catch(console.error)
