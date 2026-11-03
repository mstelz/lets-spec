import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const [source, out] = process.argv.slice(2);
if (!source || !out) throw new Error('usage: build.mjs <repository> <output>');
for (const path of ['contrib/backlog-adapter-kit', 'tests/backlog-adapter-kit']) {
  mkdirSync(join(out, path), { recursive: true });
  cpSync(join(source, path), join(out, path), { recursive: true });
}
mkdirSync(join(out, 'docs'), { recursive: true });
cpSync(join(source, 'docs/backlog-adapter-contract.md'), join(out, 'docs/backlog-adapter-contract.md'));
