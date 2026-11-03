import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoverMutation, MutationJournal } from '../../contrib/backlog-adapter-kit/recovery.ts';
test('lost create response reconciles before another creation', async () => {
  let creates = 0;
  const journal = new MutationJournal();
  const create = () => { creates++; return { id: 'created' }; };
  assert.throws(() => journal.apply('key', { title: 'one' }, create, true), /unknown_outcome/);
  const result = await recoverMutation(() => journal.apply('key', { title: 'one' }, create), () => journal.read('key'));
  assert.deepEqual(result, { id: 'created' }); assert.equal(creates, 1);
});
test('unknown reconciliation prohibits another mutation', async () => {
  let writes = 0;
  await assert.rejects(recoverMutation(() => ++writes, () => ({ state: 'unknown' })), /unknown_outcome/);
  assert.equal(writes, 0);
});
test('mutation key cannot be rebound to another input', () => {
  const journal = new MutationJournal(); journal.apply('key', { title: 'one' }, () => 1);
  assert.throws(() => journal.apply('key', { title: 'two' }, () => 2), /invalid_request/);
});
test('uncertain write is reconciled before progression', async () => {
  let applied = false; let writes = 0;
  const result = await recoverMutation(() => { writes++; applied = true; throw Object.assign(new Error('lost'), { category: 'unknown_outcome' }); }, () => applied ? { state: 'applied', result: 7 } : { state: 'absent' });
  assert.equal(result, 7); assert.equal(writes, 1);
});
for (const category of ['authentication', 'permission', 'transient']) {
  test(`${category} failure remains explicit`, async () => {
    let attempts = 0;
    await assert.rejects(recoverMutation(() => { attempts++; throw Object.assign(new Error(category), { category }); }, () => ({ state: 'absent' })), new RegExp(category));
    assert.equal(attempts, 1);
  });
}
for (const operation of ['item.update', 'relationship.write']) {
  test(`${operation} retry has one effect`, () => {
    const journal = new MutationJournal(); let effects = 0;
    const write = () => journal.apply(operation, { desired: true }, () => ++effects);
    assert.equal(write(), write()); assert.equal(effects, 1);
  });
}
