import { AdapterFailure } from './errors.ts';
import type { Identity } from './protocol.ts';
import type { Item } from './items.ts';
export type Capability = {
  support: 'native' | 'emulated' | 'unsupported';
  limits: string;
  guarantee?: 'atomic' | 'best-effort';
};
export type Capabilities = Record<string, Capability>;
export function requireCapability(capabilities: Capabilities, name: string): Capability {
  const capability = capabilities[name];
  if (!capability || capability.support === 'unsupported')
    throw new AdapterFailure('unsupported', 'none', `required capability ${name}`);
  if (
    !['native', 'emulated'].includes(capability.support) ||
    typeof capability.limits !== 'string' ||
    (capability.support === 'emulated' && !capability.limits)
  )
    throw new AdapterFailure('invalid_request', 'none', `invalid capability ${name}`);
  if (name === 'claims' && !['atomic', 'best-effort'].includes(capability.guarantee as string))
    throw new AdapterFailure('invalid_request', 'none', 'invalid claims guarantee');
  return capability;
}
export type Candidate = Item & {
  repository: string;
  blockers: { complete: boolean; open: Identity[] };
};
export function readyWork(items: Candidate[], repository: string): Candidate[] {
  if (items.some((item) => item.repository === repository && !item.blockers.complete))
    throw new AdapterFailure('unsupported', 'none', 'incomplete blocker enumeration');
  return items
    .filter(
      (item) =>
        item.repository === repository &&
        item.metadata.Status === 'Todo' &&
        item.metadata.Kind !== 'Epic' &&
        ['Must', 'Should', 'Could'].includes(item.metadata.Priority) &&
        item.owners.length === 0 &&
        item.blockers.open.length === 0,
    )
    .sort((a, b) => {
      const priority = ['Must', 'Should', 'Could'];
      const rank =
        priority.indexOf(a.metadata.Priority) - priority.indexOf(b.metadata.Priority);
      if (rank) return rank;
      for (const field of ['provider', 'backlog'] as const) {
        const comparison = compareText(a.identity[field], b.identity[field]);
        if (comparison) return comparison;
      }
      if (a.identity.provider === 'github') {
        const numericA = /^#?\d+$/.test(a.reference);
        const numericB = /^#?\d+$/.test(b.reference);
        if (numericA !== numericB) return numericA ? -1 : 1;
        if (numericA) {
          const left = BigInt(a.reference.replace('#', ''));
          const right = BigInt(b.reference.replace('#', ''));
          if (left !== right) return left < right ? -1 : 1;
        }
      }
      return compareText(a.identity.id, b.identity.id);
    });
}
function compareText(left: string, right: string): number {
  const a = Array.from(left, (character) => character.codePointAt(0)!);
  const b = Array.from(right, (character) => character.codePointAt(0)!);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
