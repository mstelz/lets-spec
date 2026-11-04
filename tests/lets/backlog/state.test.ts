import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, readState } from '../../../lets/src/backlog/state.ts';

test('simulation storage validates an empty state', () => {
  assert.deepEqual(readState(emptyState()), emptyState());
});
for (const [field, invalid] of [
  ['count', -1],
  ['items', []],
  ['edges', {}],
  ['claims', { x: {} }],
  ['journal', { x: { fingerprint: '{' } }],
  ['backlogs', [{}]],
] as const) {
  test(`simulation storage rejects invalid ${field}`, () => {
    assert.throws(() => readState({ ...emptyState(), [field]: invalid }));
  });
}
