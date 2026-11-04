import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withAdapter, story } from './fixtures/adapter.ts';
for (const support of ['native', 'emulated'] as const) {
  test(`${support} directional blocker survives its executable round trip`, () =>
    withAdapter(async ({ call }) => {
      const options = support === 'emulated' ? { fault: 'emulated-blockers' } : {};
      assert.equal(
        (await call('capability.read', {}, undefined, options)).capabilities.blockers.support,
        support,
      );
      const a = (await call('item.create', story, 'a')).item.identity;
      const b = (await call('item.create', story, 'b')).item.identity;
      await call(
        'relationship.write',
        { item: a, target: b, kind: 'blocked_by', present: true },
        'block',
        options,
      );
      await call(
        'relationship.write',
        { item: a, target: b, kind: 'related', present: true },
        'related',
        options,
      );
      assert.deepEqual(
        (
          await call('relationship.list', { item: a, kind: 'blocked_by' }, undefined, options)
        ).items.map((edge) => edge.identity),
        [b],
      );
      assert.deepEqual(
        (await call('relationship.list', { item: b, kind: 'blocked_by' }, undefined, options))
          .items,
        [],
      );
    }));
}
test('unsupported hierarchy stops before writing an edge', () =>
  withAdapter(async ({ call, state }) => {
    const a = (await call('item.create', story, 'a')).item.identity;
    const b = (await call('item.create', story, 'b')).item.identity;
    await assert.rejects(
      call(
        'relationship.write',
        { item: a, target: b, kind: 'child', present: true },
        'parent',
        { fault: 'unsupported-hierarchy' },
      ),
      /unsupported/,
    );
    assert.deepEqual(state().edges, []);
  }));
