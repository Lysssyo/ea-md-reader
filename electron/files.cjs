const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { fileURLToPath } = require('node:url');

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.mdx']);
const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.bmp': 'image/bmp', '.ico': 'image/x-icon' };

function fileArguments(argv, cwd) {
  const args = argv.slice(process.defaultApp ? 2 : 1);
  let literal = false;
  return args.flatMap((arg) => {
    if (arg === '--') { literal = true; return []; }
    if (!literal && arg.startsWith('-')) return [];
    return [arg.startsWith('file:') ? fileURLToPath(arg) : path.resolve(cwd, arg)];
  });
}

async function readDocument(filePath) {
  if (!MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase())) throw new Error('请选择 Markdown 文件（.md、.markdown、.mdown、.mkd、.mkdn、.mdx）。');
  const canonicalPath = await fs.realpath(filePath);
  const bytes = await fs.readFile(canonicalPath);
  // Fail explicitly for non-UTF-8 input instead of silently changing its contents.
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return { id: randomUUID(), path: canonicalPath, name: path.basename(canonicalPath), text, bytes };
}

function publicDocument(document) {
  const { bytes, ...result } = document;
  return result;
}

async function saveDocument(document, destination) {
  const original = await fs.stat(document.path);
  const target = await fs.stat(destination).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (target && original.dev === target.dev && original.ino === target.ino) {
    throw new Error('只读文件不能覆盖自身，请选择另一个位置。');
  }
  // Save the bytes that were opened, including BOM, frontmatter and CRLF.
  await fs.writeFile(destination, document.bytes);
}

module.exports = { fileArguments, readDocument, publicDocument, saveDocument, IMAGE_TYPES };
