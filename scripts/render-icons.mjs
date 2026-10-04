import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'assets/emd.svg');
const directory = join(root, 'assets/icons');
await mkdir(directory, { recursive: true });
for (const size of [16, 24, 32, 48, 64, 128, 256, 512]) {
  execFileSync('magick', ['-background', 'none', source, '-resize', `${size}x${size}`, `PNG32:${join(directory, `${size}.png`)}`]);
}
execFileSync('magick', ['-background', 'none', source, '-resize', '512x512', `PNG32:${join(root, 'assets/emd.png')}`]);
console.log('Rendered application icons from assets/emd.svg');
