import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdapterFailure } from '../../../lets/src/backlog/errors.ts';
import { withAdapter, story } from './fixtures/adapter.ts';

function failure(category: string, effects = 'none') {
  return (error: unknown) => {
    assert.ok(error instanceof AdapterFailure);
    assert.equal(error.category, category);
    assert.equal(error.effects, effects);
    return true;
  };
}
for (const [name, category] of [
  ['unmerged', 'invalid_request'],
  ['rebound', 'invalid_request'],
  ['scope', 'invalid_request'],
  ['patch', 'invalid_request'],
  ['relationship', 'invalid_request'],
  ['backlog', 'not_found'],
  ['item', 'not_found'],
  ['acquire', 'conflict'],
  ['release', 'conflict'],
  ['completed', 'conflict'],
  ['replay', 'conflict'],
  ['mapping', 'invalid_configuration'],
  ['capability', 'unsupported'],
  ['authentication', 'authentication'],
  ['permission', 'permission'],
  ['transient', 'transient'],
  ['partial', 'unknown_outcome'],
] as const) {
  test(`fake preserves category and effects for ${name}`, () =>
    withAdapter(async ({ call: send }) => {
      const call: typeof send = (operation, input, key, options) =>
        send(operation, input, key, { ...options, raw: true });
      const { item: created } = await call('item.create', story, 'create');
      const item = created.identity;
      let run: () => Promise<unknown>;
      switch (name) {
        case 'unmerged':
          await call('reference.write', { item, reference: 'host/pr/1' }, 'ref');
          run = () =>
            call(
              'completion.write',
              { item, merge: { reference: 'host/pr/1', merged: false, commit: '' } },
              'unmerged',
            );
          break;
        case 'rebound':
          run = () => call('item.create', { ...story, title: 'Other' }, 'create');
          break;
        case 'scope':
          run = () => call('item.read', { item: { ...item, backlog: 'other' } });
          break;
        case 'patch':
          run = () => call('item.update', { item, patch: { unknown: true } }, 'patch');
          break;
        case 'relationship':
          run = () =>
            call(
              'relationship.write',
              { item, target: item, kind: 'unknown', present: true },
              'edge',
            );
          break;
        case 'backlog':
          run = () =>
            call('backlog.check', {}, undefined, { context: { backlog: 'missing' } });
          break;
        case 'item':
          run = () => call('item.read', { item: { ...item, id: 'missing' } });
          break;
        case 'acquire':
          await call('claim.acquire', { item }, 'claim');
          run = () => call('claim.acquire', { item }, 'other');
          break;
        case 'release':
          run = () => call('claim.release', { item, token: 'wrong' }, 'release');
          break;
        case 'completed':
          await call('reference.write', { item, reference: 'host/pr/1' }, 'ref');
          await call(
            'completion.write',
            { item, merge: { reference: 'host/pr/1', merged: true, commit: 'sha' } },
            'done',
          );
          run = () => call('claim.acquire', { item }, 'claim');
          break;
        case 'replay': {
          const { claim } = await call('claim.acquire', { item }, 'claim');
          await call('claim.release', { item, token: claim.token }, 'release');
          run = () => call('mutation.read', { mutationId: 'claim' });
          break;
        }
        case 'mapping':
          run = () => call('item.read', { item }, undefined, { fault: 'invalid-mapping' });
          break;
        case 'capability':
          run = () =>
            call('relationship.list', { item, kind: 'child' }, undefined, {
              fault: 'unsupported-hierarchy',
            });
          break;
        case 'partial':
          run = () => call('claim.acquire', { item }, 'claim', { fault: 'partial-claim' });
          break;
        default:
          run = () => call('item.read', { item }, undefined, { fault: `error-${name}` });
      }
      await assert.rejects(run(), failure(category, name === 'partial' ? 'partial' : 'none'));
    }));
}

for (const category of ['conflict', 'permission', 'invalid_request']) {
  test(`unexpected programming errors cannot impersonate ${category}`, () =>
    withAdapter(async ({ call }) => {
      await assert.rejects(
        call('backlog.check', {}, undefined, {
          fault: `programming-${category}`,
        }),
        failure('unknown_outcome', 'unknown'),
      );
    }));
}
