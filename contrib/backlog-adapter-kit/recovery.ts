import { AdapterFailure } from './errors.ts';
/** Reference mutation journal. A real adapter must durably bind keys to scoped
 * operation/input and reconcile the provider, not rely on this in-memory map. */
export type Reconciled<T> = { state: 'applied'; result: T } | { state: 'absent' | 'unknown' };
export type MutationScope = { provider: string; backlog: string; repository: string; actor: string; session: string };
export class MutationJournal {
  entries: Map<string, { input: string; result: unknown }>;
  private prefix: string;
  constructor(scope: MutationScope, entries = new Map<string, { input: string; result: unknown }>()) {
    this.prefix = JSON.stringify([scope.provider, scope.backlog, scope.repository, scope.actor, scope.session]);
    this.entries = entries;
  }
  apply<T>(key: string, input: unknown, effect: () => T, loseResponse = false): T {
    key = `${this.prefix}:${key}`;
    const prior = this.entries.get(key);
    if (prior) {
      if (prior.input !== JSON.stringify(input)) throw new Error('invalid_request: mutation key rebound');
      return structuredClone(prior.result) as T;
    }
    const result = effect();
    this.entries.set(key, { input: JSON.stringify(input), result: structuredClone(result) });
    if (loseResponse) throw new AdapterFailure('unknown_outcome', 'unknown', 'response lost');
    return result;
  }
  read<T>(key: string): Reconciled<T> {
    const entry = this.entries.get(`${this.prefix}:${key}`);
    return entry ? { state: 'applied', result: structuredClone(entry.result) as T } : { state: 'absent' };
  }
}
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
