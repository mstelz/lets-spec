import { test } from 'node:test';
import assert from 'node:assert/strict';
import { complete } from '../../contrib/backlog-adapter-kit/completion.ts';
const merged = { reference: 'host/repo/pull/1', merged: true, commit: 'merge-sha' };
test('ready unmerged PR leaves work In Progress', async () => {
  const item = { status: 'In Progress', completionEffects: 0 };
  await assert.rejects(complete(item, merged.reference, async () => ({ ...merged, merged: false })), /unmerged/);
  assert.equal(item.status, 'In Progress');
});
test('provider automation already completed work is idempotent', async () => {
  const item = { status: 'Done', completionEffects: 0 };
  assert.equal(await complete(item, merged.reference, async () => merged), 'Done');
  assert.equal(item.completionEffects, 0);
});
test('lost completion response can be retried without duplicate effects', async () => {
  const item = { status: 'In Progress', completionEffects: 0 };
  await assert.rejects(complete(item, merged.reference, async () => merged, true), /unknown_outcome/);
  assert.equal(await complete(item, merged.reference, async () => merged), 'Done');
  assert.equal(item.completionEffects, 1);
});
