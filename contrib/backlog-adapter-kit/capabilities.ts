import type { Identity } from './protocol.ts';
import { identityKey } from './items.ts';
import type { Item } from './items.ts';
export type Capability = { support: 'native' | 'emulated' | 'unsupported'; limits: string; guarantee?: 'atomic' | 'best-effort' };
export type Capabilities = Record<string, Capability>;
export function requireCapability(capabilities: Capabilities, name: string): Capability {
  const capability = capabilities[name];
  if (!capability || capability.support === 'unsupported') throw new Error(`unsupported: required capability ${name}`);
  if (!['native', 'emulated'].includes(capability.support) || typeof capability.limits !== 'string' || (capability.support === 'emulated' && !capability.limits)) throw new Error(`invalid capability ${name}`);
  if (name === 'claims' && !['atomic', 'best-effort'].includes(capability.guarantee as string)) throw new Error('invalid claims guarantee');
  return capability;
}
export type Candidate = Item & { repository: string; blockers: { complete: boolean; open: Identity[] } };
export function readyWork(items: Candidate[], repository: string): Candidate[] {
  if (items.some(item => item.repository === repository && !item.blockers.complete)) throw new Error('unsupported: incomplete blocker enumeration');
  return items.filter(item => item.repository === repository && item.metadata.Status === 'Todo' && item.metadata.Kind !== 'Epic' && ['Must', 'Should', 'Could'].includes(item.metadata.Priority) && item.owners.length === 0 && item.blockers.open.length === 0).sort((a, b) => {
    const priority = ['Must', 'Should', 'Could'];
    const rank = priority.indexOf(a.metadata.Priority) - priority.indexOf(b.metadata.Priority);
    if (rank) return rank;
    for (const field of ['provider', 'backlog'] as const) {
      const comparison = compareText(a.identity[field], b.identity[field]);
      if (comparison) return comparison;
    }
    if (a.identity.provider === 'github') {
      const numericA = /^#?\d+$/.test(a.reference); const numericB = /^#?\d+$/.test(b.reference);
      if (numericA !== numericB) return numericA ? -1 : 1;
      if (numericA) {
        const left = BigInt(a.reference.replace('#', '')); const right = BigInt(b.reference.replace('#', ''));
        if (left !== right) return left < right ? -1 : 1;
      }
    }
    return compareText(a.identity.id, b.identity.id);
  }); }
function compareText(left: string, right: string): number {
  const a = Array.from(left, character => character.codePointAt(0)!);
  const b = Array.from(right, character => character.codePointAt(0)!);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
/** Reference simulation of directed relationships, not a provider implementation. */
export class Relationships {
  capabilities: Capabilities;
  constructor(capabilities: Capabilities) { this.capabilities = capabilities; }
  edges: { item: Identity; target: Identity; kind: string }[] = [];
  write(item: Identity, target: Identity, kind: string, present: boolean): void {
    requireCapability(this.capabilities, ['child', 'parent'].includes(kind) ? 'hierarchy' : 'blockers');
    if (!['child', 'parent', 'blocked_by', 'related'].includes(kind)) throw new Error('invalid relationship kind');
    if (kind === 'parent') { [item, target] = [target, item]; kind = 'child'; }
    const matches = (edge: { item: Identity; target: Identity; kind: string }) => identityKey(edge.item) === identityKey(item) && identityKey(edge.target) === identityKey(target) && edge.kind === kind;
    this.edges = this.edges.filter(edge => !matches(edge));
    if (present) this.edges.push({ item, target, kind });
  }
  list(item: Identity, kind: string): Identity[] {
    requireCapability(this.capabilities, ['child', 'parent'].includes(kind) ? 'hierarchy' : 'blockers');
    if (kind === 'parent') return this.edges.filter(edge => edge.kind === 'child' && identityKey(edge.target) === identityKey(item)).map(edge => edge.item);
    return this.edges.filter(edge => edge.kind === kind && identityKey(edge.item) === identityKey(item)).map(edge => edge.target);
  }
}
