import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withAdapter, story } from './fixtures/adapter.ts';
test('creation establishes a selection that discovery can find', () => withAdapter(async ({ call }) => {
  const context = { backlog: undefined };
  assert.deepEqual((await call('backlog.list', {}, undefined, { context })).items, []);
  const created = await call('backlog.create', { title: 'New backlog' }, 'new-backlog', { context });
  assert.ok(created.backlog);
  assert.deepEqual((await call('backlog.list', {}, undefined, { context })).items.map((item: any) => item.id), [created.backlog]);
}, 'beads', false));
for (const context of [{ backlog: 'other' }, { repository: 'other' }, { provider: 'jira' }]) {
  test(`enumeration excludes other scope ${JSON.stringify(context)}`, () => withAdapter(async ({ call }) => {
    await call('item.create', story, 'create');
    const { backlog } = await call('backlog.create', { title: 'Other scope' }, 'other-backlog', { context: { ...context, backlog: undefined } });
    for (const operation of ['candidate.list', 'item.search']) assert.deepEqual((await call(operation, operation === 'item.search' ? { query: 'Contract' } : {}, undefined, { context: { ...context, backlog } })).items, []);
  }));
}
test('item reads cannot cross repository scope', () => withAdapter(async ({ call }) => {
  const { item } = await call('item.create', story, 'create');
  await assert.rejects(call('item.read', { item: item.identity }, undefined, { context: { repository: 'other' } }), /not_found/);
}));
test('lost backlog creation is reconciled before selecting it', () => withAdapter(async ({ call }) => {
  const context = { backlog: undefined };
  const input = { title: 'Created once' };
  await assert.rejects(call('backlog.create', input, 'new', { context, fault: 'error-unknown_outcome' }), /unknown_outcome/);
  const recovered = await call('mutation.read', { mutationId: 'new' }, undefined, { context });
  assert.equal(recovered.state, 'applied');
  assert.ok(recovered.result.backlog);
  assert.deepEqual(await call('backlog.create', input, 'new', { context }), recovered.result);
  await assert.rejects(call('backlog.create', input, 'new', { context: { backlog: recovered.result.backlog } }), /backlog.*omit/);
  assert.equal((await call('backlog.list', {}, undefined, { context })).items.length, 1);
}, 'beads', false));
for (const operation of ['backlog.check', 'item.create']) {
  test(`${operation} rejects a nonexistent selection`, () => withAdapter(async ({ call }) => {
    await assert.rejects(call(operation, operation === 'item.create' ? story : {}, operation === 'item.create' ? 'create' : undefined, { context: { backlog: 'nonexistent' } }), /not_found.*backlog/);
  }));
}
