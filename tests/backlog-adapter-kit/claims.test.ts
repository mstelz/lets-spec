import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withAdapter, story } from './fixtures/adapter.ts';
test('lost acquire is reconciled against current ownership', () => withAdapter(async ({ call }) => {
  const item = (await call('item.create', story, 'create')).item.identity;
  await assert.rejects(call('claim.acquire', { item }, 'claim', { fault: 'error-unknown_outcome' }), /unknown_outcome/);
  assert.equal((await call('mutation.read', { mutationId: 'claim' })).state, 'applied');
  const { claim } = await call('claim.read', { item });
  assert.equal(claim.session, 'worker'); assert.equal(claim.status, 'In Progress');
  await assert.rejects(call('claim.acquire', { item }, 'other', { context: { session: 'other' } }), /conflict/);
}));
test('another session cannot release a partial claim', () => withAdapter(async ({ call }) => {
  const item = (await call('item.create', story, 'create')).item.identity;
  await assert.rejects(call('claim.acquire', { item }, 'claim', { fault: 'partial-claim' }), (error: any) => error.category === 'unknown_outcome' && error.effects === 'partial');
  assert.equal((await call('mutation.read', { mutationId: 'claim' })).state, 'unknown');
  const { claim } = await call('claim.read', { item });
  assert.equal(claim.status, 'Todo'); assert.equal(claim.session, 'worker');
  await assert.rejects(call('claim.release', { item, token: claim.token }, 'release', { context: { session: 'other' } }), /conflict/);
  assert.equal((await call('claim.release', { item, token: claim.token }, 'release-own')).released, true);
}));
