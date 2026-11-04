import assert from 'node:assert/strict';
import { test } from 'node:test';
import { realIo } from '../../lets/src/io.ts';

test('the real execFile survives a command that exits without reading its input', async () => {
  const io = realIo();
  assert.deepEqual(await io.execFile('true', [], { input: 'x'.repeat(1 << 20) }), {
    stdout: '',
    stderr: '',
    code: 0,
  });
  for (let i = 0; i < 20; i++) assert.equal((await io.execFile('true', [])).code, 0);
  assert.equal((await io.execFile('cat', [], { input: 'it\'s "q"\n' })).stdout, 'it\'s "q"\n');
});

test('the real execFile stops a command that runs past its deadline', async () => {
  const began = Date.now();
  const result = await realIo().execFile('sleep', ['30'], { timeoutMs: 200 });
  assert.equal(result.timedOut, true);
  assert.ok(Date.now() - began < 10000);
});

test('the real execFile returns at its deadline when a child of the command keeps its output open', async () => {
  const began = Date.now();
  const result = await realIo().execFile('sh', ['-c', '(sleep 30) & sleep 30'], {
    timeoutMs: 200,
  });
  assert.equal(result.timedOut, true);
  assert.ok(Date.now() - began < 10000);
});

test('the real execFile reports no timeout for a command that finishes in time', async () => {
  assert.deepEqual(await realIo().execFile('echo', ['hi'], { timeoutMs: 10000 }), {
    stdout: 'hi\n',
    stderr: '',
    code: 0,
  });
});

test('the real execFile runs in the env it is given', async () => {
  const { stdout } = await realIo().execFile('sh', ['-c', 'echo "$ONLY"'], {
    env: { ONLY: 'this', PATH: process.env.PATH },
  });
  assert.equal(stdout, 'this\n');
});

for (const [name, source, limit] of [
  [
    'combined streams',
    "process.stdout.write('x'.repeat(60)); process.stderr.write('x'.repeat(60));",
    100,
  ],
  ['stderr', "process.stderr.write('x'.repeat(200));", 100],
  ['multibyte', "process.stdout.write('😀'.repeat(30));", 100],
] as const) {
  test(`the real execFile bounds ${name}`, async () => {
    const result = await realIo().execFile(process.execPath, ['-e', source], {
      maxBytes: limit,
      killSignal: 'SIGKILL',
      timeoutMs: 5000,
    });
    assert.equal(result.outputLimitExceeded, true);
    assert.notEqual(result.code, null);
  });
}
test('the real execFile counts raw bytes before decoding', async () => {
  const result = await realIo().execFile(
    process.execPath,
    ['-e', 'process.stdout.write(Buffer.alloc(20, 255));'],
    { maxBytes: 20 },
  );
  assert.equal(result.code, 0);
  assert.equal(result.outputLimitExceeded, undefined);
});
test('the real execFile honors limits above its default buffer ceiling', async () => {
  const result = await realIo().execFile(
    process.execPath,
    ['-e', "process.stdout.write(Buffer.alloc(65 * 1024 * 1024, 'x'));"],
    { maxBytes: 66 * 1024 * 1024, timeoutMs: 10000 },
  );
  assert.equal(result.code, 0);
  assert.equal(result.stdout.length, 65 * 1024 * 1024);
});
test('the real execFile reports signal termination', async () => {
  const result = await realIo().execFile(process.execPath, [
    '-e',
    "process.kill(process.pid, 'SIGTERM');",
  ]);
  assert.equal(result.signal, 'SIGTERM');
});
for (const mode of ['deadline', 'overflow']) {
  test(`the real execFile kills SIGTERM-resistant children on ${mode}`, async () => {
    const source =
      "process.on('SIGTERM', () => {}); setTimeout(() => process.exit(0), 1500); " +
      (mode === 'overflow'
        ? "setInterval(() => process.stdout.write('x'.repeat(100)), 10);"
        : 'setInterval(() => {}, 1000);');
    const result = await realIo().execFile(process.execPath, ['-e', source], {
      timeoutMs: mode === 'deadline' ? 300 : 5000,
      maxBytes: 100,
      killSignal: 'SIGKILL',
    });
    assert.equal(mode === 'deadline' ? result.timedOut : result.outputLimitExceeded, true);
    assert.equal(result.signal, 'SIGKILL');
  });
}

test('the real execFile reports output decoding failures without escaping its callback', async (t) => {
  const original = Buffer.prototype.toString;
  const marker = Buffer.from('decode-failure-fixture');
  t.mock.method(Buffer.prototype, 'toString', function (
    this: Buffer, encoding?: BufferEncoding, start?: number, end?: number,
  ) {
    if (this.equals(marker)) throw new RangeError('simulated ERR_STRING_TOO_LONG');
    return original.call(this, encoding, start, end);
  });
  const result = await realIo().execFile(process.execPath, [
    '-e', "process.stdout.write('decode-failure-fixture');",
  ], { maxBytes: 1024, timeoutMs: 5000 });
  assert.equal(result.outputLimitExceeded, true);
  assert.notEqual(result.code, null);
});
