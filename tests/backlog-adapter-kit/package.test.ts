import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
test('release kit runs conformance without repository dependencies', () => {
  mkdirSync('.workspace', { recursive: true }); const out = mkdtempSync(join(process.cwd(), '.workspace/kit-release-'));
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  try {
    const built = spawnSync(process.execPath, ['contrib/backlog-adapter-kit/build.mjs', process.cwd(), out], { encoding: 'utf8' });
    assert.equal(built.status, 0, built.stderr);
    assert.ok(existsSync(join(out, 'docs/backlog-adapter-contract.md')));
    const checked = spawnSync(process.execPath, ['--test', join(out, 'tests/backlog-adapter-kit/providers.test.ts')], { cwd: out, encoding: 'utf8', env });
    assert.equal(checked.status, 0, checked.stdout + checked.stderr);
    assert.match(checked.stdout, /beads representative executable/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
