import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withAdapter, runWorkflow, story } from './fixtures/adapter.ts';
test('shared executable lifecycle satisfies contract outcomes', () => runWorkflow());
for (const provider of ['github', 'jira', 'linear', 'beads']) {
  test(`${provider} variation preserves metadata and identity`, () => withAdapter(async ({ call, state }) => {
    const { item } = await call('item.create', story, 'create');
    assert.equal(item.identity.provider, provider);
    assert.equal(item.url === undefined, provider === 'beads');
    assert.equal(Array.isArray(Object.values(state().items).map((entry: any) => entry.data)[0].labels), provider === 'linear' || provider === 'beads');
    if (provider === 'github') assert.match(item.reference, /^#\d+$/);
    await call('item.update', { item: item.identity, patch: { metadata: { Size: 'M' } } }, 'update');
    assert.deepEqual((await call('item.read', { item: item.identity })).item.metadata, { ...story.metadata, Size: 'M' });
  }, provider));
}
for (const [fault, outcome] of [['duplicate', /duplicate creation/], ['ignore-blocker', /blocker silently ignored/], ['overstate-claim', /declared claim guarantee/], ['overwrite-owner', /another session/], ['erase-unrelated', /unrelated provider data/]] as const) {
  test(`conformance detects ${fault} fixture`, () => assert.rejects(runWorkflow(fault), outcome));
}
