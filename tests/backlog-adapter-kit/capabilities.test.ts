import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireCapability, readyWork, Relationships } from '../../contrib/backlog-adapter-kit/capabilities.ts';
test('unknown capability stops required step', () => assert.throws(() => requireCapability({}, 'blockers'), /unsupported/));
import type { Candidate } from '../../contrib/backlog-adapter-kit/capabilities.ts';
const make = (id: string, patch: Partial<Candidate> = {}): Candidate => ({ identity: { provider: 'fake', backlog: 'b', id }, reference: id, title: id, body: '', metadata: { Kind: 'Story', Priority: 'Must', Size: 'S', Status: 'Todo' }, owners: [], repository: 'r', blockers: { complete: true, open: [] }, ...patch });
test('ready selection excludes ineligible work', () => {
  const items = [make('eligible'), make('other', { repository: 'other' }), make('owned', { owners: ['a'] }), make('blocked', { blockers: { complete: true, open: [make('x').identity] } }), ...[['Kind', 'Epic'], ['Priority', 'Wont'], ['Status', 'Done']].map(([key, value]) => { const item = make(value); (item.metadata as any)[key] = value; return item; })];
  assert.deepEqual(readyWork(items, 'r').map(item => item.reference), ['eligible']);
});
test('incomplete blockers stop selection', () => {
  assert.throws(() => readyWork([make('x', { blockers: { complete: false, open: [] } })], 'r'), /unsupported.*blocker/);
});
test('ready ranking uses priority then stable scoped ID', () => {
  const should = make('a'); should.metadata.Priority = 'Should';
  assert.deepEqual(readyWork([should, make('z'), make('b')], 'r').map(item => item.reference), ['b', 'z', 'a']);
});
for (const support of ['native', 'emulated'] as const) {
  test(`${support} blocker preserves direction`, () => {
    const links = new Relationships({ blockers: { support, limits: 'simulation' }, hierarchy: { support, limits: 'simulation' } });
    const a = make('a').identity; const b = make('b').identity;
    links.write(a, b, 'blocked_by', true);
    links.write(a, b, 'related', true);
    assert.deepEqual(links.list(a, 'blocked_by'), [b]);
    assert.deepEqual(links.list(b, 'blocked_by'), []);
  });
}
test('parent relationship can be read from child', () => {
  const links = new Relationships({ hierarchy: { support: 'native', limits: '' } });
  const parent = make('p').identity; const child = make('c').identity;
  links.write(parent, child, 'child', true);
  assert.deepEqual(links.list(child, 'parent'), [parent]);
});
test('unsupported hierarchy prevents any edge write', () => {
  const links = new Relationships({});
  assert.throws(() => links.write(make('p').identity, make('c').identity, 'child', true), /unsupported/);
  assert.deepEqual(links.edges, []);
});
test('claim capability requires an explicit guarantee', () => {
  assert.throws(() => requireCapability({ claims: { support: 'native', limits: '' } }, 'claims'), /guarantee/);
});
test('mixed GitHub references have one order across permutations', () => {
  const a = make('z'); a.identity.provider = 'github'; a.reference = '#2';
  const b = make('a'); b.identity.provider = 'github'; b.reference = '#10';
  const c = make('m'); c.identity.provider = 'github'; c.reference = 'draft';
  for (const permutation of [[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]]) assert.deepEqual(readyWork(permutation, 'r').map(item => item.reference), ['#2', '#10', 'draft']);
});
test('opaque ID ordering compares raw code points', () => {
  assert.deepEqual(readyWork(['a!', '\u{10000}', 'a', '\uE000'].map(id => make(id)), 'r').map(item => item.reference), ['a', 'a!', '\uE000', '\u{10000}']);
});
