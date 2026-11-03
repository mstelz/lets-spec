import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConfiguration } from '../../contrib/backlog-adapter-kit/config.ts';
test('omitted selection defaults to GitHub', () => {
  assert.equal(checkConfiguration({}, process.cwd(), () => '/bin/adapter').provider, 'github');
});
for (const [name, document, finder] of [
  ['multiple backlogs', { lets: { backlog: [] } }, () => '/bin/fake'],
  ['missing executable', { lets: { backlog: { provider: 'linear', executable: 'missing', id: 'team' } } }, () => undefined],
  ['missing mappings', { lets: { backlog: { provider: 'jira', executable: 'jira', id: 'project' } } }, () => '/bin/fake'],
  ['committed secret', { lets: { backlog: { provider: 'github', executable: 'gh', token: 'fixture-placeholder' } } }, () => '/bin/fake'],
] as const) {
  test(`invalid selection rejects ${name}`, () => assert.throws(() => checkConfiguration(document, process.cwd(), finder), /config/));
}
import { METADATA } from '../../contrib/backlog-adapter-kit/items.ts';
const mappings = Object.fromEntries(Object.entries(METADATA).map(([field, values]) => [field, { field, values: Object.fromEntries(values.map(value => [value, value])) }]));
const local = { lets: { backlog: { provider: 'beads', executable: './bin/local', id: 'local', mappings, storage: { path: '.beads', tracking: 'ignored' } } } };
test('local selection resolves executable relative to repository', () => {
  let searched = '';
  checkConfiguration(local, '/repo', name => { searched = name; return name; });
  assert.equal(searched, '/repo/bin/local');
});
test('explicit missing executable never falls back', () => {
  assert.throws(() => checkConfiguration(local, '/repo', () => undefined), /no fallback/);
});
test('local selection requires tracking policy', () => {
  const bad = structuredClone(local) as any;
  delete bad.lets.backlog.storage.tracking;
  assert.throws(() => checkConfiguration(bad, '/repo', name => name), /tracking/);
});
