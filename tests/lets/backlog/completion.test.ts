import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withAdapter, story } from './fixtures/adapter.ts';
const merge = { reference: 'host/pr/1', merged: true, commit: 'merge-sha' };
test('unmerged reference cannot complete an item', () =>
  withAdapter(async ({ call }) => {
    const item = (await call('item.create', story, 'create')).item.identity;
    await call('claim.acquire', { item }, 'claim');
    await call('reference.write', { item, reference: merge.reference }, 'reference');
    await assert.rejects(
      call('completion.write', { item, merge: { ...merge, merged: false } }, 'done'),
      /unmerged/,
    );
    assert.equal((await call('item.read', { item })).item.metadata.Status, 'In Progress');
  }));
test('lost completion response is retried without duplicate effects', () =>
  withAdapter(async ({ call, state }) => {
    const item = (await call('item.create', story, 'create')).item.identity;
    await call('reference.write', { item, reference: merge.reference }, 'reference');
    await assert.rejects(
      call('completion.write', { item, merge }, 'done', { fault: 'error-unknown_outcome' }),
      /unknown_outcome/,
    );
    await call('completion.write', { item, merge }, 'done');
    await call('completion.write', { item, merge }, 'already-done');
    assert.equal((await call('item.read', { item })).item.metadata.Status, 'Done');
    assert.equal(
      Object.values(state().items).reduce(
        (sum, entry) => sum + (entry.completionEffects ?? 0),
        0,
      ),
      1,
    );
  }));
for (const evidence of [
  { merged: true, commit: 'x' },
  { ...merge, merged: 'no' },
  { ...merge, commit: 1 },
]) {
  test(`completion rejects malformed merge ${JSON.stringify(evidence)}`, () =>
    withAdapter(async ({ call }) => {
      const item = (await call('item.create', story, 'create')).item.identity;
      await assert.rejects(call('completion.write', { item, merge: evidence }, 'done'));
      assert.equal((await call('item.read', { item })).item.metadata.Status, 'Todo');
    }));
}
