/** Reference mutation journal. A real adapter must durably bind keys to scoped
 * operation/input and reconcile the provider, not rely on this in-memory map. */
export type Reconciled<T> = { state: 'applied'; result: T } | { state: 'absent' | 'unknown' };
export class MutationJournal {
  entries = new Map<string, { input: string; result: unknown }>();
  apply<T>(key: string, input: unknown, effect: () => T, loseResponse = false): T {
    const prior = this.entries.get(key);
    if (prior) {
      if (prior.input !== JSON.stringify(input)) throw new Error('invalid_request: mutation key rebound');
      return structuredClone(prior.result) as T;
    }
    const result = effect();
    this.entries.set(key, { input: JSON.stringify(input), result: structuredClone(result) });
    if (loseResponse) throw new Error('unknown_outcome: response lost');
    return result;
  }
  read<T>(key: string): Reconciled<T> {
    const entry = this.entries.get(key);
    return entry ? { state: 'applied', result: structuredClone(entry.result) as T } : { state: 'absent' };
  }
}
export async function recoverMutation<T>(apply: () => T | Promise<T>, reconcile: () => Reconciled<T> | Promise<Reconciled<T>>): Promise<T> {
  const state = await reconcile();
  if (state.state === 'applied') return state.result;
  if (state.state !== 'absent') throw new Error('unknown_outcome: reconciliation required');
  try { return await apply(); }
  catch (error) {
    if ((error as { category?: string }).category !== 'unknown_outcome') throw error;
    const after = await reconcile();
    if (after.state === 'applied') return after.result;
    throw new Error('unknown_outcome: reconcile before retry');
  }
}
