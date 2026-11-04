import { PROTOCOL, validateResponse } from './protocol.ts';
import { AdapterFailure } from './errors.ts';
/** Caller example: reconcile uncertain provider writes; never retry blindly. */
export type Reconciled<T> = { state: 'applied'; result: T } | { state: 'absent' | 'unknown' };
export async function recoverMutation<T>(apply: () => T | Promise<T>, reconcile: () => Reconciled<T> | Promise<Reconciled<T>>, operation: string): Promise<T> {
  const checked = (result: T): T => {
    validateResponse({ protocol: PROTOCOL, ok: true, result }, 0, operation);
    return result;
  };
  const state = await reconcile();
  if (state.state === 'applied') return checked(state.result);
  if (state.state !== 'absent') throw new AdapterFailure('unknown_outcome', 'unknown', 'reconciliation required');
  try { return checked(await apply()); }
  catch (error) {
    if ((error as { category?: string }).category !== 'unknown_outcome') throw error;
    const after = await reconcile();
    if (after.state === 'applied') return checked(after.result);
    throw new AdapterFailure('unknown_outcome', 'unknown', 'reconcile before retry');
  }
}
