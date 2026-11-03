import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoverMutation } from '../../contrib/backlog-adapter-kit/recovery.ts';
import { withAdapter, story } from './fixtures/adapter.ts';
test('lost creation is reconciled without creating another item', () => withAdapter(async ({ call }) => {
  const result = await recoverMutation(() => call('item.create', story, 'create', { fault: 'error-unknown_outcome' }), () => call('mutation.read', { mutationId: 'create' }) as any);
  assert.equal(result.item.title, story.title);
  assert.equal((await call('candidate.list')).items.length, 1);
}));
test('persisted mutation key cannot be rebound to different input', () => withAdapter(async ({ call }) => {
  await call('item.create', story, 'create');
  await assert.rejects(call('item.create', { ...story, title: 'Different' }, 'create'), /invalid_request/);
  assert.equal((await call('candidate.list')).items.length, 1);
}));
test('targeted update retry preserves provider data', () => withAdapter(async ({ call, state }) => {
  const { item } = await call('item.create', story, 'create');
  const patch = { item: item.identity, patch: { metadata: { Size: 'M' } } };
  await assert.rejects(call('item.update', patch, 'update', { fault: 'error-unknown_outcome' }), /unknown_outcome/);
  const before = state();
  await call('item.update', patch, 'update');
  assert.deepEqual(state(), before);
  assert.equal((await call('item.read', { item: item.identity })).item.metadata.Size, 'M');
}));
test('relationship retry leaves exactly one directional edge', () => withAdapter(async ({ call }) => {
  const a = (await call('item.create', story, 'a')).item.identity;
  const b = (await call('item.create', story, 'b')).item.identity;
  const input = { item: a, target: b, kind: 'blocked_by', present: true };
  await assert.rejects(call('relationship.write', input, 'edge', { fault: 'error-unknown_outcome' }), /unknown_outcome/);
  await call('relationship.write', input, 'edge');
  assert.deepEqual((await call('relationship.list', { item: a, kind: 'blocked_by' })).items.map((edge: any) => edge.identity), [b]);
}));
test('unresolved reconciliation prevents another write', async () => {
  let writes = 0;
  await assert.rejects(recoverMutation(() => ++writes, () => ({ state: 'unknown' })), /unknown_outcome/);
  assert.equal(writes, 0);
});
