const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const iconsDir = path.join(__dirname, '../icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function drawIcon(size) {
  const png = new PNG({ width: size, height: size });

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Rounded rect bounds
      const cornerRadius = size * 0.22;
      let inCorner = false;
      
      // Check corners
      const corners = [
        [cornerRadius, cornerRadius],
        [size - cornerRadius, cornerRadius],
        [cornerRadius, size - cornerRadius],
        [size - cornerRadius, size - cornerRadius]
      ];

      let alpha = 255;
      if (x < cornerRadius && y < cornerRadius) {
        const dist = Math.hypot(x - cornerRadius, y - cornerRadius);
        if (dist > cornerRadius) alpha = 0;
      } else if (x > size - cornerRadius && y < cornerRadius) {
        const dist = Math.hypot(x - (size - cornerRadius), y - cornerRadius);
        if (dist > cornerRadius) alpha = 0;
      } else if (x < cornerRadius && y > size - cornerRadius) {
        const dist = Math.hypot(x - cornerRadius, y - (size - cornerRadius));
        if (dist > cornerRadius) alpha = 0;
      } else if (x > size - cornerRadius && y > size - cornerRadius) {
        const dist = Math.hypot(x - (size - cornerRadius), y - (size - cornerRadius));
        if (dist > cornerRadius) alpha = 0;
      }

      if (alpha === 0) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Modern Gradient background (Indigo #4F46E5 to Violet #8B5CF6)
      const t = (x + y) / (size * 2);
      const r = Math.round(79 + t * (139 - 79));
      const g = Math.round(70 + t * (92 - 70));
      const b = Math.round(229 + t * (246 - 229));

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = alpha;

      // Draw Markdown 'M' and Arrow '↓' representation
      // Normalize coords to 0..1
      const nx = x / size;
      const ny = y / size;

      // 'M' symbol in white
      let isWhite = false;

      // M left vertical leg
      if (nx >= 0.22 && nx <= 0.32 && ny >= 0.28 && ny <= 0.72) isWhite = true;
      // M right vertical leg
      if (nx >= 0.52 && nx <= 0.62 && ny >= 0.28 && ny <= 0.72) isWhite = true;
      // M left diagonal
      if (ny >= 0.28 && ny <= 0.52) {
        const diagLeft = 0.22 + (ny - 0.28) * 0.8;
        if (nx >= diagLeft - 0.04 && nx <= diagLeft + 0.04) isWhite = true;
      }
      // M right diagonal
      if (ny >= 0.28 && ny <= 0.52) {
        const diagRight = 0.62 - (ny - 0.28) * 0.8;
        if (nx >= diagRight - 0.04 && nx <= diagRight + 0.04) isWhite = true;
      }

      // Arrow Down (Down arrow on right side)
      // Stem
      if (nx >= 0.76 && nx <= 0.82 && ny >= 0.28 && ny <= 0.62) isWhite = true;
      // Arrow head
      if (ny >= 0.52 && ny <= 0.72) {
        const offset = (ny - 0.52) * 0.8;
        if (nx >= 0.79 - offset && nx <= 0.79 + offset) isWhite = true;
      }

      if (isWhite) {
        png.data[idx] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
        png.data[idx + 3] = alpha;
      }
    }
  }

  const filePath = path.join(iconsDir, `icon${size}.png`);
  if (fs.existsSync(filePath)) {
    console.log(`Preserving existing custom icon: ${filePath}`);
    return;
  }
  png.pack().pipe(fs.createWriteStream(filePath)).on('finish', () => {
    console.log(`Generated icon: ${filePath}`);
  });
}

[16, 48, 128].forEach(size => drawIcon(size));
