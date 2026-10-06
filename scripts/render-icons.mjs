import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'assets/emd.svg');
const directory = join(root, 'assets/icons');
await mkdir(directory, { recursive: true });
const svg = process.platform === 'darwin' ? await readFile(source, 'utf8') : null;
const Resvg = svg ? (await import('@resvg/resvg-js')).Resvg : null;
async function render(size, destination) {
  if (Resvg) {
    const image = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render();
    await writeFile(destination, image.asPng());
  } else {
    execFileSync('magick', ['-background', 'none', source, '-resize', `${size}x${size}`, `PNG32:${destination}`]);
  }
}
for (const size of [16, 24, 32, 48, 64, 128, 256, 512]) {
  await render(size, join(directory, `${size}.png`));
}
await render(512, join(root, 'assets/emd.png'));
console.log('Rendered application icons from assets/emd.svg');
