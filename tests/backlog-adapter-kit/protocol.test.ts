import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest } from '../../contrib/backlog-adapter-kit/protocol.ts';
const context = { cwd: '/repo', provider: 'github', backlog: 'project', repository: 'owner/repo', actor: 'user', session: 'session' };
test('request requires supported protocol', () => {
  assert.throws(() => validateRequest({ protocol: 99, operation: 'item.read', context, input: {} }), /protocol/);
});
test('request rejects unknown operation', () => {
  assert.throws(() => validateRequest({ protocol: 1, operation: 'invented', context, input: {} }), /operation/);
});
for (const field of ['cwd', 'provider', 'backlog', 'repository', 'actor', 'session']) {
  test(`request requires context ${field}`, () => {
    assert.throws(() => validateRequest({ protocol: 1, operation: 'item.read', context: { ...context, [field]: '' }, input: {} }), new RegExp(field));
  });
}
test('read request requires scoped identity', () => {
  assert.throws(() => validateRequest({ protocol: 1, operation: 'item.read', context, input: { item: { id: '1' } } }), /provider/);
});
test('read request accepts URL-free scoped identity', () => {
  assert.doesNotThrow(() => validateRequest({ protocol: 1, operation: 'item.read', context, input: { item: { provider: 'beads', backlog: 'local', id: 'opaque' } } }));
});
test('response requires matching protocol', async () => {
  const { validateResponse } = await import('../../contrib/backlog-adapter-kit/protocol.ts');
  assert.throws(() => validateResponse({ protocol: 2, ok: true, result: {} }, 0), /protocol/);
});
for (const [ok, exit] of [[true, 1], [false, 0], ['yes', 0]] as const) {
  test(`response rejects inconsistent result ${ok}/${exit}`, async () => {
    const { validateResponse } = await import('../../contrib/backlog-adapter-kit/protocol.ts');
    assert.throws(() => validateResponse({ protocol: 1, ok, result: {} }, exit), /result/);
  });
}
test('mutation request requires reconciliation key', () => {
  assert.throws(() => validateRequest({ protocol: 1, operation: 'item.create', context, input: { title: 'Story', body: '' } }), /mutationId/);
});
test('request checks operation input definition', () => {
  assert.throws(() => validateRequest({ protocol: 1, operation: 'relationship.write', mutationId: 'm', context, input: {} }), /input/);
});
for (const response of [
  { protocol: 1, ok: true },
  { protocol: 1, ok: false, error: { category: 'oops' } },
  { protocol: 1, ok: false, error: { category: 'unknown_outcome', message: 'lost' } },
]) {
  test(`response validates envelope ${JSON.stringify(response)}`, async () => {
    const { validateResponse } = await import('../../contrib/backlog-adapter-kit/protocol.ts');
    assert.throws(() => validateResponse(response, response.ok ? 0 : 1));
  });
}
test('enumeration response requires explicit completeness', async () => {
  const { validateResponse } = await import('../../contrib/backlog-adapter-kit/protocol.ts');
  assert.throws(() => validateResponse({ protocol: 1, ok: true, result: { items: [] } }, 0, 'candidate.list'), /complete/);
});
