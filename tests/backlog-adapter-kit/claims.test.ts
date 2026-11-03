import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Claims } from '../../contrib/backlog-adapter-kit/claims.ts';
test('existing owner blocks a claim', () => {
  const claims = new Claims('best-effort');
  claims.acquire('a', 'session-a', 'token-a');
  assert.throws(() => claims.acquire('b', 'session-b', 'token-b'), /conflict/);
  assert.equal(claims.read().actor, 'a');
});
for (const guarantee of ['atomic', 'best-effort'] as const) {
  test(`${guarantee} claim retains session identity`, () => {
    const claims = new Claims(guarantee);
    assert.equal(claims.acquire('me', 'one', 'key').guarantee, guarantee);
    assert.throws(() => claims.acquire('me', 'two', 'other'), /conflict/);
  });
}
test('release cannot remove another session ownership', () => {
  const claims = new Claims('best-effort'); claims.acquire('me', 'one', 'key');
  assert.throws(() => claims.release('me', 'two', 'key'), /conflict/);
  assert.equal(claims.read().session, 'one');
});
test('lost claim response requires reconciliation', () => {
  const claims = new Claims('best-effort');
  assert.throws(() => claims.acquire('me', 'one', 'key', 'lost'), /unknown_outcome/);
  assert.equal(claims.reconcile('me', 'one', 'key'), true);
});
test('partial claim cannot authorize build', () => {
  const claims = new Claims('best-effort');
  assert.throws(() => claims.acquire('me', 'one', 'key', 'status'), /partial/);
  assert.equal(claims.reconcile('me', 'one', 'key'), false);
  assert.equal(claims.read().actor, 'me');
});
