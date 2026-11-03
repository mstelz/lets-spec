import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invoke } from './process.ts';
import { validateItem } from './items.ts';
import { requireCapability } from './capabilities.ts';
export type AdapterCall = (operation: string, input: Record<string, unknown>, mutationId?: string) => Promise<Record<string, any>>;
/** Reusable workflow checks. Call only against a disposable acceptance backlog. */
export async function workflowOutcomes(call: AdapterCall, provider: string): Promise<void> {
  const caps = (await call('capability.read', {})).capabilities;
  for (const name of ['hierarchy', 'blockers', 'claims', 'metadata', 'references', 'completion']) requireCapability(caps, name);
  const metadata = { Kind: 'Story', Priority: 'Must', Size: 'S', Status: 'Todo' };
  const first = (await call('item.create', { title: 'Contract parent', body: 'packet', metadata }, 'create-parent')).item;
  validateItem(first);
  const again = (await call('item.create', { title: 'Contract parent', body: 'packet', metadata }, 'create-parent')).item;
  assert.deepEqual(again.identity, first.identity, 'duplicate creation on retry');
  const child = (await call('item.create', { title: 'Contract child', body: '', metadata }, 'create-child')).item;
  validateItem(child);
  if (provider === 'beads') assert.equal(child.url, undefined, 'local item must work without URL');
  const updated = (await call('item.update', { item: child.identity, patch: { metadata: { Size: 'M' } } }, 'update')).item;
  assert.deepEqual(updated.metadata, { ...metadata, Size: 'M' });
  await call('relationship.write', { item: first.identity, target: child.identity, kind: 'child', present: true }, 'parent');
  assert.deepEqual((await call('relationship.list', { item: child.identity, kind: 'parent' })).items.map((edge: any) => edge.identity), [first.identity]);
  await call('relationship.write', { item: child.identity, target: first.identity, kind: 'blocked_by', present: true }, 'block');
  assert.deepEqual((await call('relationship.list', { item: child.identity, kind: 'blocked_by' })).items.map((edge: any) => edge.identity), [first.identity], 'blocker silently ignored');
  assert.deepEqual((await call('relationship.list', { item: first.identity, kind: 'blocked_by' })).items, []);
  await call('relationship.write', { item: child.identity, target: first.identity, kind: 'related', present: true }, 'related');
  assert.equal((await call('relationship.list', { item: child.identity, kind: 'blocked_by' })).items.length, 1);
  const claim = (await call('claim.acquire', { item: child.identity }, 'claim')).claim;
  assert.equal(claim.status, 'In Progress'); assert.equal(claim.token, 'claim');
  assert.deepEqual((await call('claim.read', { item: child.identity })).claim, claim);
  await call('reference.write', { item: child.identity, reference: 'fake-host/pr/1' }, 'ref');
  await assert.rejects(call('completion.write', { item: child.identity, merge: { reference: 'fake-host/pr/1', merged: false, commit: '' } }, 'not-merged'));
  assert.equal((await call('item.read', { item: child.identity })).item.metadata.Status, 'In Progress');
  assert.equal((await call('completion.write', { item: child.identity, merge: { reference: 'fake-host/pr/1', merged: true, commit: 'merge-sha' } }, 'done')).status, 'Done');
  assert.equal((await call('completion.write', { item: child.identity, merge: { reference: 'fake-host/pr/1', merged: true, commit: 'merge-sha' } }, 'done-again')).status, 'Done');
}
export async function runProfile(provider: string, fault?: string): Promise<true> {
  mkdirSync('.workspace', { recursive: true });
  const cwd = mkdtempSync(join(process.cwd(), '.workspace/backlog-conformance-'));
  const context = { cwd, provider, backlog: 'acceptance', repository: 'fixture', actor: 'me', session: 'worker' };
  const call: AdapterCall = async (operation, input, mutationId) => {
    const response = await invoke(process.execPath, { protocol: 1, operation, context, input, ...(mutationId ? { mutationId } : {}) }, { args: [fileURLToPath(new URL('./fake.ts', import.meta.url)), ...(fault ? [fault] : [])] });
    if (!response.ok) throw new Error(`${response.error.category}: ${response.error.message}`);
    return response.result;
  };
  try { await workflowOutcomes(call, provider); return true; }
  finally { rmSync(cwd, { recursive: true, force: true }); }
}
