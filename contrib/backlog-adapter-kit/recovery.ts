import { AdapterFailure } from './errors.ts';
/** Caller example: reconcile uncertain provider writes; never retry blindly. */
export type Reconciled<T> = { state: 'applied'; result: T } | { state: 'absent' | 'unknown' };
export async function recoverMutation<T>(apply: () => T | Promise<T>, reconcile: () => Reconciled<T> | Promise<Reconciled<T>>): Promise<T> {
  const state = await reconcile();
  if (state.state === 'applied') return state.result;
  if (state.state !== 'absent') throw new AdapterFailure('unknown_outcome', 'unknown', 'reconciliation required');
  try { return await apply(); }
  catch (error) {
    if ((error as { category?: string }).category !== 'unknown_outcome') throw error;
    const after = await reconcile();
    if (after.state === 'applied') return after.result;
    throw new AdapterFailure('unknown_outcome', 'unknown', 'reconcile before retry');
  }
}
