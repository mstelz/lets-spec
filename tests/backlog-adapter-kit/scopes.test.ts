import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withAdapter, story } from './fixtures/adapter.ts';
test('creation establishes a selection that discovery can find', () => withAdapter(async ({ call }) => {
  const context = { backlog: undefined };
  assert.deepEqual((await call('backlog.list', {}, undefined, { context })).items, []);
  const created = await call('backlog.create', { title: 'New backlog' }, 'new-backlog', { context });
  assert.ok(created.backlog);
  assert.deepEqual((await call('backlog.list', {}, undefined, { context })).items.map((item: any) => item.id), [created.backlog]);
}));
for (const context of [{ backlog: 'other' }, { repository: 'other' }, { provider: 'jira' }]) {
  test(`enumeration excludes other scope ${JSON.stringify(context)}`, () => withAdapter(async ({ call }) => {
    await call('item.create', story, 'create');
    for (const operation of ['candidate.list', 'item.search']) assert.deepEqual((await call(operation, operation === 'item.search' ? { query: 'Contract' } : {}, undefined, { context })).items, []);
  }));
}
test('item reads cannot cross repository scope', () => withAdapter(async ({ call }) => {
  const { item } = await call('item.create', story, 'create');
  await assert.rejects(call('item.read', { item: item.identity }, undefined, { context: { repository: 'other' } }), /not_found/);
}));
