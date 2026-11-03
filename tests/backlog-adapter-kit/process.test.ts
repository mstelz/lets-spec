import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { invoke } from '../../contrib/backlog-adapter-kit/process.ts';
const request = { protocol: 1, operation: 'backlog.check', context: { cwd: process.cwd(), provider: 'fake', backlog: 'b', repository: 'r', actor: 'a', session: 's' }, input: {} };
const fixture = fileURLToPath(new URL('./fixtures/process.ts', import.meta.url));
test('executable can return conforming result', async () => {
  const result = await invoke(process.execPath, request, { args: [fixture, 'ok'] });
  assert.equal((result.result as any).valid, true);
});
for (const mode of ['malformed', 'version', 'exit']) {
  test(`process rejects ${mode}`, async () => {
    await assert.rejects(invoke(process.execPath, request, { args: [fixture, mode] }));
  });
}
test('process terminates on timeout', async () => {
  await assert.rejects(invoke(process.execPath, request, { args: [fixture, 'timeout'], timeoutMs: 100 }), /unknown_outcome.*timeout/);
});
test('process bounds output', async () => {
  await assert.rejects(invoke(process.execPath, request, { args: [fixture, 'overflow'], maxBytes: 100 }), /output limit/);
});
