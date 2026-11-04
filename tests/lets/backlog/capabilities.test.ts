import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireCapability, readyWork } from '../../../lets/src/backlog/capabilities.ts';
test('unknown capability stops required step', () =>
  assert.throws(() => requireCapability({}, 'blockers'), /unsupported/));
import type { Candidate } from '../../../lets/src/backlog/capabilities.ts';
const make = (id: string, patch: Partial<Candidate> = {}): Candidate => ({
  identity: { provider: 'fake', backlog: 'b', id },
  reference: id,
  title: id,
  body: '',
  metadata: { Kind: 'Story', Priority: 'Must', Size: 'S', Status: 'Todo' },
  owners: [],
  repository: 'r',
  blockers: { complete: true, open: [] },
  ...patch,
});
test('ready selection excludes ineligible work', () => {
  const items = [
    make('eligible'),
    make('other', { repository: 'other' }),
    make('owned', { owners: ['a'] }),
    make('blocked', { blockers: { complete: true, open: [make('x').identity] } }),
    ...[
      ['Kind', 'Epic'],
      ['Priority', 'Wont'],
      ['Status', 'Done'],
    ].map(([key, value]) => {
      const item = make(value);
      (item.metadata as Record<string, string>)[key] = value;
      return item;
    }),
  ];
  assert.deepEqual(
    readyWork(items, 'r').map((item) => item.reference),
    ['eligible'],
  );
});
test('incomplete blockers stop selection', () => {
  assert.throws(
    () => readyWork([make('x', { blockers: { complete: false, open: [] } })], 'r'),
    /unsupported.*blocker/,
  );
});
test('ready ranking uses priority then stable scoped ID', () => {
  const should = make('a');
  should.metadata.Priority = 'Should';
  assert.deepEqual(
    readyWork([should, make('z'), make('b')], 'r').map((item) => item.reference),
    ['b', 'z', 'a'],
  );
});
test('claim capability requires an explicit guarantee', () => {
  assert.throws(
    () => requireCapability({ claims: { support: 'native', limits: '' } }, 'claims'),
    /guarantee/,
  );
});
test('mixed GitHub references have one order across permutations', () => {
  const a = make('z');
  a.identity.provider = 'github';
  a.reference = '#2';
  const b = make('a');
  b.identity.provider = 'github';
  b.reference = '#10';
  const c = make('m');
  c.identity.provider = 'github';
  c.reference = 'draft';
  for (const permutation of [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ])
    assert.deepEqual(
      readyWork(permutation, 'r').map((item) => item.reference),
      ['#2', '#10', 'draft'],
    );
});
test('opaque ID ordering compares raw code points', () => {
  assert.deepEqual(
    readyWork(
      ['a!', '\u{10000}', 'a', '\uE000'].map((id) => make(id)),
      'r',
    ).map((item) => item.reference),
    ['a', 'a!', '\uE000', '\u{10000}'],
  );
});
