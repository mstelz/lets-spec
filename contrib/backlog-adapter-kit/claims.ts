/** Reference state machine. Its synchronous implementation is not evidence
 * that a real provider offers atomic claims. */
export type Claim = { actor: string | null; session: string | null; token: string | null; status: string; guarantee: 'atomic' | 'best-effort' };
export class Claims {
  state: Claim;
  constructor(guarantee: Claim['guarantee']) { this.state = { actor: null, session: null, token: null, status: 'Todo', guarantee }; }
  reconcile(actor: string, session: string, token: string): boolean {
    return this.state.actor === actor && this.state.session === session && this.state.token === token && this.state.status === 'In Progress';
  }
  release(actor: string, session: string, token: string): boolean {
    if (this.state.actor !== actor || this.state.session !== session || this.state.token !== token) throw new Error('conflict: release requires original actor, session and token');
    this.state = { ...this.state, actor: null, session: null, token: null, status: 'Todo' };
    return true;
  }
  read(): Claim { return structuredClone(this.state); }
  acquire(actor: string, session: string, token: string, fault?: 'lost' | 'status'): Claim {
    if (this.state.actor) throw new Error('conflict: existing ownership');
    this.state = { ...this.state, actor, session, token, status: fault === 'status' ? 'Todo' : 'In Progress' };
    if (fault === 'status') throw new Error('unknown_outcome: partial assignment; reconcile status before build');
    if (fault === 'lost') throw new Error('unknown_outcome: response lost');
    return this.read();
  }
}
