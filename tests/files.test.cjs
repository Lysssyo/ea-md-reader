const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { readDocument, saveDocument, fileArguments } = require('../electron/files.cjs');

test('UTF-8 原始字节另存为，禁止覆盖源文件及其硬链接', async () => {
  const directory = await fs.mkdtemp(path.join(os.homedir(), '.pi/work/emd-files-'));
  try {
    const source = path.join(directory, '有 空格.md');
    const bytes = Buffer.from('\ufeff---\r\ntitle: 示例\r\n---\r\n# 标题\r\n');
    await fs.writeFile(source, bytes);
    const document = await readDocument(source);
    const destination = path.join(directory, '副本.md');
    await saveDocument(document, destination);
    assert.deepEqual(await fs.readFile(destination), bytes);
    await assert.rejects(saveDocument(document, source), /不能覆盖自身/);
    const alias = path.join(directory, '别名.md');
    await fs.link(source, alias);
    await assert.rejects(saveDocument(document, alias), /不能覆盖自身/);
    assert.deepEqual(await fs.readFile(source), bytes);
    await fs.writeFile(path.join(directory, 'invalid.md'), Buffer.from([0xff]));
    await assert.rejects(readDocument(path.join(directory, 'invalid.md')), /encoded data/);
    await assert.rejects(readDocument(path.join(directory, 'missing.md')), /ENOENT/);
    await assert.rejects(readDocument(path.join(directory, 'file.txt')), /Markdown/);
    assert.deepEqual(fileArguments(['emd', '--flag', '有 空格.md', '--', '-literal.md'], directory), [source, path.join(directory, '-literal.md')]);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
