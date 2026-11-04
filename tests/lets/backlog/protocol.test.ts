import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest } from '../../../lets/src/backlog/protocol.ts';
const context = {
  cwd: '/repo',
  provider: 'github',
  backlog: 'project',
  repository: 'owner/repo',
  actor: 'user',
  session: 'session',
};
test('request requires supported protocol', () => {
  assert.throws(
    () => validateRequest({ protocol: 99, operation: 'item.read', context, input: {} }),
    /protocol/,
  );
});
test('request rejects unknown operation', () => {
  assert.throws(
    () => validateRequest({ protocol: 1, operation: 'invented', context, input: {} }),
    /operation/,
  );
});
for (const field of ['cwd', 'provider', 'backlog', 'repository', 'actor', 'session']) {
  test(`request requires context ${field}`, () => {
    assert.throws(
      () =>
        validateRequest({
          protocol: 1,
          operation: 'item.read',
          context: { ...context, [field]: '' },
          input: {},
        }),
      new RegExp(field),
    );
  });
}
test('read request requires scoped identity', () => {
  assert.throws(
    () =>
      validateRequest({
        protocol: 1,
        operation: 'item.read',
        context,
        input: { item: { id: '1' } },
      }),
    /provider/,
  );
});
test('read request accepts URL-free scoped identity', () => {
  assert.doesNotThrow(() =>
    validateRequest({
      protocol: 1,
      operation: 'item.read',
      context,
      input: { item: { provider: 'beads', backlog: 'local', id: 'opaque' } },
    }),
  );
});
test('response requires matching protocol', async () => {
  const { validateResponse } = await import('../../../lets/src/backlog/protocol.ts');
  assert.throws(() => validateResponse({ protocol: 2, ok: true, result: {} }, 0), /protocol/);
});
for (const [ok, exit] of [
  [true, 1],
  [false, 0],
  ['yes', 0],
] as const) {
  test(`response rejects inconsistent result ${ok}/${exit}`, async () => {
    const { validateResponse } = await import('../../../lets/src/backlog/protocol.ts');
    assert.throws(() => validateResponse({ protocol: 1, ok, result: {} }, exit), /result/);
  });
}
test('mutation request requires reconciliation key', () => {
  assert.throws(
    () =>
      validateRequest({
        protocol: 1,
        operation: 'item.create',
        context,
        input: { title: 'Story', body: '' },
      }),
    /mutationId/,
  );
});
test('request checks operation input definition', () => {
  assert.throws(
    () =>
      validateRequest({
        protocol: 1,
        operation: 'relationship.write',
        mutationId: 'm',
        context,
        input: {},
      }),
    /input/,
  );
});
for (const response of [
  { protocol: 1, ok: true },
  { protocol: 1, ok: false, error: { category: 'oops' } },
  { protocol: 1, ok: false, error: { category: 'unknown_outcome', message: 'lost' } },
]) {
  test(`response validates envelope ${JSON.stringify(response)}`, async () => {
    const { validateResponse } = await import('../../../lets/src/backlog/protocol.ts');
    assert.throws(() => validateResponse(response, response.ok ? 0 : 1));
  });
}
test('enumeration response requires explicit completeness', async () => {
  const { validateResponse } = await import('../../../lets/src/backlog/protocol.ts');
  assert.throws(
    () =>
      validateResponse({ protocol: 1, ok: true, result: { items: [] } }, 0, 'candidate.list'),
    /complete/,
  );
});
test('read response validates normalized item fields', async () => {
  const { validateResponse } = await import('../../../lets/src/backlog/protocol.ts');
  assert.throws(
    () => validateResponse({ protocol: 1, ok: true, result: { item: {} } }, 0, 'item.read'),
    /item/,
  );
});
const identity = { provider: 'github', backlog: 'project', id: 'opaque' };
test('shared update rejects provider field escape hatch', () => {
  assert.throws(
    () =>
      validateRequest({
        protocol: 1,
        operation: 'item.update',
        context,
        mutationId: 'key',
        input: { item: identity, patch: { customField: 1 } },
      }),
    /patch/,
  );
});
test('metadata update rejects unrecognized shared meaning', () => {
  assert.throws(
    () =>
      validateRequest({
        protocol: 1,
        operation: 'item.update',
        context,
        mutationId: 'key',
        input: { item: identity, patch: { metadata: { Priority: 'Urgent' } } },
      }),
    /metadata/,
  );
});
for (const status of ['Done', 'In Progress', 'Todo']) {
  test(`generic update cannot set Status ${status}`, () => {
    assert.throws(
      () =>
        validateRequest({
          protocol: 1,
          operation: 'item.update',
          context,
          mutationId: 'm',
          input: { item: identity, patch: { metadata: { Status: status } } },
        }),
      /Status.*claim/,
    );
  });
}
for (const status of ['Done', 'In Progress']) {
  test(`create cannot start at Status ${status}`, () => {
    assert.throws(
      () =>
        validateRequest({
          protocol: 1,
          operation: 'item.create',
          context,
          mutationId: 'm',
          input: {
            title: 'x',
            body: '',
            metadata: { Kind: 'Story', Priority: 'Must', Size: 'S', Status: status },
          },
        }),
      /Todo/,
    );
  });
}
test('completion request requires associated reference', () => {
  assert.throws(
    () =>
      validateRequest({
        protocol: 1,
        operation: 'completion.write',
        context,
        mutationId: 'm',
        input: { item: identity, merge: { merged: true, commit: 'x' } },
      }),
    /reference/,
  );
});
for (const [operation, result] of [
  ['mutation.read', { state: 'done' }],
  ['mutation.read', { state: 'applied' }],
  [
    'relationship.list',
    { items: [{ identity: {}, status: 'Todo' }], complete: true, nextCursor: null },
  ],
  [
    'relationship.list',
    { items: [{ identity, status: 'open' }], complete: true, nextCursor: null },
  ],
  ['backlog.list', { items: [{}], complete: true, nextCursor: null }],
  ['claim.read', { claim: {} }],
  [
    'claim.read',
    {
      claim: {
        actor: null,
        session: null,
        token: null,
        status: 'unknown',
        guarantee: 'exclusive',
      },
    },
  ],
  ['capability.read', { capabilities: { claims: { support: 'native', limits: '' } } }],
] as const) {
  test(`response rejects malformed ${operation}: ${JSON.stringify(result)}`, async () => {
    const { validateResponse } = await import('../../../lets/src/backlog/protocol.ts');
    assert.throws(() => validateResponse({ protocol: 1, ok: true, result }, 0, operation));
  });
}
for (const operation of ['backlog.list', 'backlog.create']) {
  test(`${operation} accepts context before backlog selection`, () => {
    const { backlog, ...unselected } = context;
    assert.doesNotThrow(() =>
      validateRequest({
        protocol: 1,
        operation,
        context: unselected,
        input: operation === 'backlog.create' ? { title: 'New backlog' } : {},
        ...(operation === 'backlog.create' ? { mutationId: 'create-backlog' } : {}),
      }),
    );
  });
}
for (const [operation, input] of [
  ['claim.read', { item: identity }],
  ['candidate.list', {}],
  ['relationship.list', { item: identity, kind: 'blocked_by' }],
]) {
  test(`${operation} rejects a mutation key`, () => {
    assert.throws(
      () =>
        validateRequest({ protocol: 1, operation, input, context, mutationId: 'read-key' }),
      /mutationId.*read/,
    );
  });
}

import { realIo } from '../../../lets/src/io.ts';
import { fileURLToPath } from 'node:url';
for (const [input, category] of [
  ['{', 'invalid_request'],
  [JSON.stringify({ protocol: 99 }), 'unsupported'],
  [JSON.stringify({ protocol: 1, operation: 'invented' }), 'invalid_request'],
] as const) {
  test(`fake classifies raw request ${input}`, async () => {
    const result = await realIo().execFile(
      process.execPath,
      [fileURLToPath(new URL('../../../lets/src/backlog/fake.ts', import.meta.url))],
      { input, timeoutMs: 5000 },
    );
    assert.equal(result.code, 1);
    const response = JSON.parse(result.stdout);
    assert.equal(response.error.category, category);
    assert.equal(response.error.effects, 'none');
  });
}
