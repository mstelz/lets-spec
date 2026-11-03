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
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
for (const category of ['authentication', 'permission', 'transient', 'unknown_outcome']) {
  test(`representative executable reports ${category}`, async () => {
    mkdirSync('.workspace', { recursive: true }); const cwd = mkdtempSync(join(process.cwd(), '.workspace/error-profile-'));
    try {
      const simulated = { protocol: 1, operation: 'item.create', mutationId: 'write', context: { ...request.context, cwd, provider: 'beads' }, input: { title: 'x', body: '', metadata: { Kind: 'Story', Priority: 'Must', Size: 'S', Status: 'Todo' } } };
      await assert.rejects(invoke(process.execPath, simulated, { args: [fileURLToPath(new URL('../../contrib/backlog-adapter-kit/fake.ts', import.meta.url)), `error-${category}`] }), (error: any) => {
        assert.equal(error.category, category);
        assert.equal(error.effects, category === 'unknown_outcome' ? 'unknown' : 'none');
        return true;
      });
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
}
test('signal termination rejects even a valid failure envelope', async () => {
  await assert.rejects(invoke(process.execPath, request, { args: [fixture, 'signal'] }), /signal/);
});
import { recoverMutation } from '../../contrib/backlog-adapter-kit/recovery.ts';
test('transport timeout reaches mutation reconciliation', async () => {
  let reads = 0;
  const result = await recoverMutation<unknown>(() => invoke(process.execPath, request, { args: [fixture, 'timeout'], timeoutMs: 100 }), () => ++reads === 1 ? { state: 'absent' } : { state: 'applied', result: 'reconciled' });
  assert.equal(result, 'reconciled'); assert.equal(reads, 2);
});
test('adapter-reported unknown outcome reaches reconciliation', async () => {
  mkdirSync('.workspace', { recursive: true }); const cwd = mkdtempSync(join(process.cwd(), '.workspace/reconcile-profile-'));
  try {
    let reads = 0;
    const simulated = { protocol: 1, operation: 'item.create', mutationId: 'write', context: { ...request.context, cwd, provider: 'beads' }, input: { title: 'x', body: '', metadata: { Kind: 'Story', Priority: 'Must', Size: 'S', Status: 'Todo' } } };
    const result = await recoverMutation<unknown>(() => invoke(process.execPath, simulated, { args: [fileURLToPath(new URL('../../contrib/backlog-adapter-kit/fake.ts', import.meta.url)), 'error-unknown_outcome'] }), () => ++reads === 1 ? { state: 'absent' } : { state: 'applied', result: 'reconciled' });
    assert.equal(result, 'reconciled'); assert.equal(reads, 2);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
