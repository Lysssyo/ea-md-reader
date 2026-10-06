import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'assets/emd.svg');
const directory = join(root, 'assets/icons');
await mkdir(directory, { recursive: true });
const svg = await readFile(source, 'utf8');
async function render(size, destination) {
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render();
  await writeFile(destination, image.asPng());
}
for (const size of [16, 24, 32, 48, 64, 128, 256, 512]) {
  await render(size, join(directory, `${size}.png`));
}
await render(512, join(root, 'assets/emd.png'));
console.log('Rendered application icons from assets/emd.svg');
