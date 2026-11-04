import { AdapterFailure } from '../../../lets/src/backlog/errors.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { invoke } from '../../../lets/src/backlog/process.ts';
const request = {
  protocol: 1,
  operation: 'backlog.check',
  context: {
    cwd: process.cwd(),
    provider: 'fake',
    backlog: 'b',
    repository: 'r',
    actor: 'a',
    session: 's',
  },
  input: {},
};
const fixture = fileURLToPath(new URL('./fixtures/process.ts', import.meta.url));
test('executable can return conforming result', async () => {
  const result = await invoke(process.execPath, request, { args: [fixture, 'ok'] });
  assert.equal((result.result as { valid: boolean }).valid, true);
});
for (const mode of ['malformed', 'version', 'exit']) {
  test(`process rejects ${mode}`, async () => {
    await assert.rejects(invoke(process.execPath, request, { args: [fixture, mode] }));
  });
}
test('process terminates on timeout', async () => {
  await assert.rejects(
    invoke(process.execPath, request, { args: [fixture, 'timeout'], timeoutMs: 100 }),
    /unknown_outcome.*timeout/,
  );
});
test('process bounds output', async () => {
  await assert.rejects(
    invoke(process.execPath, request, { args: [fixture, 'overflow'], maxBytes: 100 }),
    /output limit/,
  );
});
import { withAdapter, story } from './fixtures/adapter.ts';
for (const category of ['authentication', 'permission', 'transient', 'unknown_outcome']) {
  test(`representative executable reports ${category}`, () =>
    withAdapter(async ({ call }) => {
      await assert.rejects(
        call('item.create', story, 'write', { fault: `error-${category}` }),
        (error: unknown) => {
          assert.ok(error instanceof AdapterFailure);
          assert.equal(error.category, category);
          assert.equal(error.effects, category === 'unknown_outcome' ? 'unknown' : 'none');
          return true;
        },
      );
    }));
}
test('signal termination rejects even a valid failure envelope', async () => {
  await assert.rejects(
    invoke(process.execPath, request, { args: [fixture, 'signal'] }),
    /signal/,
  );
});
import { recoverMutation } from '../../../lets/src/backlog/recovery.ts';
test('transport timeout reaches mutation reconciliation', async () => {
  let reads = 0;
  const result = await recoverMutation<unknown>(
    () =>
      invoke(process.execPath, request, { args: [fixture, 'timeout'], timeoutMs: 100 }).then(
        (response) => response.result,
      ),
    () =>
      ++reads === 1
        ? { state: 'absent' }
        : { state: 'applied', result: { valid: true, gaps: [] } },
    'backlog.check',
  );
  assert.deepEqual(result, { valid: true, gaps: [] });
  assert.equal(reads, 2);
});

for (const [name, executable, input, options, category, effects] of [
  [
    'missing executable',
    '/missing-backlog-adapter',
    request,
    {},
    'unknown_outcome',
    'unknown',
  ],
  ['invalid request', process.execPath, {}, {}, 'invalid_request', 'none'],
  ['invalid limits', process.execPath, request, { timeoutMs: -1 }, 'invalid_request', 'none'],
] as const) {
  test(`invocation exposes structured ${name}`, async () => {
    await assert.rejects(invoke(executable, input, options), (error: unknown) => {
      assert.ok(error instanceof AdapterFailure);
      assert.equal(error.category, category);
      assert.equal(error.effects, effects);
      return true;
    });
  });
}
import type { ExecOptions } from '../../../lets/src/io.ts';
test('invocation uses only the supplied executable through shared I/O', async () => {
  const calls: string[] = [];
  const result = await invoke('chosen-adapter', request, {
    io: {
      async execFile(executable: string, args: string[], options?: ExecOptions) {
        calls.push(executable);
        assert.equal(options?.killSignal, 'SIGKILL');
        assert.equal(options?.maxBytes, 1024 * 1024);
        return {
          stdout: JSON.stringify({ protocol: 1, ok: true, result: { valid: true, gaps: [] } }),
          stderr: '',
          code: 0,
        };
      },
    },
  });
  assert.deepEqual(calls, ['chosen-adapter']);
  assert.deepEqual(result.result, { valid: true, gaps: [] });
});

test('large Unicode packets survive executable stdin chunk boundaries', () =>
  withAdapter(async ({ call }) => {
    const body = 'a'.repeat(65535) + 'é—😀'.repeat(20000);
    const { item } = await call('item.create', { ...story, body }, 'unicode');
    assert.equal(item.body, body);
  }));

test('timer-overflow deadlines are rejected before launching an adapter', async () => {
  let launched = false;
  await assert.rejects(invoke('unused', request, {
    timeoutMs: 3e9,
    io: { async execFile() {
      launched = true;
      return { stdout: '', stderr: '', code: 0 };
    } },
  }), (error: unknown) => {
    assert.ok(error instanceof AdapterFailure);
    assert.equal(error.category, 'invalid_request');
    assert.equal(error.effects, 'none');
    return true;
  });
  assert.equal(launched, false);
});
