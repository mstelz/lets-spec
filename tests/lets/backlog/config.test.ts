import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConfiguration } from '../../../lets/src/backlog/config.ts';
test('omitted selection defaults to GitHub', () => {
  assert.equal(checkConfiguration({}, process.cwd(), () => '/bin/adapter').provider, 'github');
});
for (const [name, document, finder] of [
  ['multiple backlogs', { lets: { backlog: [] } }, () => '/bin/fake'],
  [
    'missing executable',
    { lets: { backlog: { provider: 'linear', executable: 'missing', id: 'team' } } },
    () => undefined,
  ],
  [
    'missing mappings',
    { lets: { backlog: { provider: 'jira', executable: 'jira', id: 'project' } } },
    () => '/bin/fake',
  ],
  [
    'committed secret',
    {
      lets: {
        backlog: { provider: 'github', executable: 'gh', token: 'fixture-placeholder' },
      },
    },
    () => '/bin/fake',
  ],
] as const) {
  test(`invalid selection rejects ${name}`, () =>
    assert.throws(() => checkConfiguration(document, process.cwd(), finder), /config/));
}
import { METADATA } from '../../../lets/src/backlog/items.ts';
const mappings = Object.fromEntries(
  Object.entries(METADATA).map(([field, values]) => [
    field,
    {
      field,
      cardinality: 'one' as const,
      values: Object.fromEntries(values.map((value) => [value, value])),
    },
  ]),
);
const local = {
  lets: {
    backlog: {
      provider: 'beads',
      executable: './bin/local',
      id: 'local',
      mappings,
      storage: { path: '.beads', tracking: 'ignored' },
    },
  },
};
test('local selection resolves executable relative to repository', () => {
  let searched = '';
  checkConfiguration(local, '/repo', (name) => {
    searched = name;
    return name;
  });
  assert.equal(searched, '/repo/bin/local');
});
test('explicit missing executable never falls back', () => {
  assert.throws(() => checkConfiguration(local, '/repo', () => undefined), /no fallback/);
});
test('local selection requires tracking policy', () => {
  const bad = structuredClone(local);
  const { tracking, ...storage } = bad.lets.backlog.storage;
  const invalid = { lets: { backlog: { ...bad.lets.backlog, storage } } };
  assert.throws(() => checkConfiguration(invalid, '/repo', (name) => name), /tracking/);
});
test('validated selection retains backlog scope', () => {
  assert.equal(checkConfiguration(local, '/repo', (name) => name).backlog, 'local');
});
