const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const desktopDir = path.join(root, 'desktop');
const buildDir = path.join(desktopDir, 'build');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Generate resized PNGs with PowerShell System.Drawing
const psScript = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::FromFile('${path.join(buildDir, 'icon.png').replace(/\\/g, '\\\\')}')
$sizes = @(256, 128, 64, 48, 32, 16)
foreach ($sz in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $sz, $sz, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($src, 0, 0, $sz, $sz)
  $g.Dispose()
  $outPath = "${buildDir.replace(/\\/g, '\\\\')}\\icon_" + $sz + ".png"
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
$src.Dispose()
`;

execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], { stdio: 'inherit' });

const sizes = [256, 128, 64, 48, 32, 16];
const images = sizes.map(sz => {
  const file = path.join(buildDir, `icon_${sz}.png`);
  const buf = fs.readFileSync(file);
  fs.unlinkSync(file);
  return { size: sz === 256 ? 0 : sz, buffer: buf };
});

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // icon type
header.writeUInt16LE(images.length, 4); // count

const entries = [];
let offset = 6 + images.length * 16;

for (const img of images) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(img.size, 0); // width (0 = 256)
  entry.writeUInt8(img.size, 1); // height (0 = 256)
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(img.buffer.length, 8); // size
  entry.writeUInt32LE(offset, 12); // offset
  entries.push(entry);
  offset += img.buffer.length;
}

const icoBuffer = Buffer.concat([header, ...entries, ...images.map(img => img.buffer)]);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
fs.writeFileSync(path.join(desktopDir, 'icon.ico'), icoBuffer);
console.log('Successfully generated desktop/build/icon.ico (' + icoBuffer.length + ' bytes)');
