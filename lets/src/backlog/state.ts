import { object, validateResponse, OPERATIONS } from './protocol.ts';
import { validateItem } from './items.ts';
import type { Item } from './items.ts';
import type { Claim, LinkedBacklog } from './types.ts';
import type { Identity } from './protocol.ts';

export type StoredItem = {
  item: Omit<Item, 'reference'> & { displayReference: string };
  data: Record<string, unknown>;
  repository: string;
  pullRequestReference?: string;
  completionEffects?: number;
};
export type JournalEntry = {
  fingerprint: string;
  partial?: boolean;
  result?: Record<string, unknown>;
};
export type SimulationState = {
  items: Record<string, StoredItem>;
  edges: { item: Identity; target: Identity; kind: string }[];
  claims: Record<string, Claim>;
  journal: Record<string, JournalEntry>;
  count: number;
  backlogs: (LinkedBacklog & { repository: string })[];
};
export function emptyState(): SimulationState {
  return { items: {}, edges: [], claims: {}, journal: {}, count: 0, backlogs: [] };
}
function text(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`invalid stored ${name}`);
}
// Disposable simulation storage is external data too. Validate before casting.
export function readState(value: unknown): SimulationState {
  const state = object(value, 'simulation');
  if (!Number.isSafeInteger(state.count) || (state.count as number) < 0) {
    throw new Error('invalid stored count');
  }
  for (const value of Object.values(object(state.items, 'items'))) {
    const record = object(value, 'stored item');
    const item = object(record.item, 'stored item.item');
    text(item.displayReference, 'display reference');
    const { displayReference, ...fields } = item;
    validateItem({ ...fields, reference: displayReference });
    object(record.data, 'stored item.data');
    text(record.repository, 'repository');
    if (record.pullRequestReference !== undefined)
      text(record.pullRequestReference, 'pull request reference');
    if (
      record.completionEffects !== undefined &&
      (!Number.isSafeInteger(record.completionEffects) ||
        (record.completionEffects as number) < 0)
    ) {
      throw new Error('invalid stored completion effects');
    }
  }
  if (!Array.isArray(state.edges) || !Array.isArray(state.backlogs)) {
    throw new Error('invalid stored collections');
  }
  for (const edge of state.edges) {
    const value = object(edge, 'edge');
    validateResponse(
      {
        protocol: 1,
        ok: true,
        result: {
          items: [
            { identity: value.item, status: 'Todo' },
            { identity: value.target, status: 'Todo' },
          ],
          complete: true,
          nextCursor: null,
        },
      },
      0,
      'relationship.list',
    );
    if (!['child', 'blocked_by', 'related'].includes(value.kind as string))
      throw new Error('invalid stored edge kind');
  }
  for (const backlog of state.backlogs) {
    const value = object(backlog, 'backlog');
    text(value.repository, 'backlog repository');
    const { repository, ...linked } = value;
    validateResponse(
      {
        protocol: 1,
        ok: true,
        result: {
          items: [linked],
          complete: true,
          nextCursor: null,
        },
      },
      0,
      'backlog.list',
    );
  }
  for (const claim of Object.values(object(state.claims, 'claims'))) {
    validateResponse({ protocol: 1, ok: true, result: { claim } }, 0, 'claim.read');
  }
  for (const entry of Object.values(object(state.journal, 'journal'))) {
    const value = object(entry, 'journal entry');
    text(value.fingerprint, 'fingerprint');
    const original = object(JSON.parse(value.fingerprint), 'fingerprint');
    if (!(OPERATIONS as readonly unknown[]).includes(original.operation))
      throw new Error('invalid stored operation');
    object(original.input, 'stored input');
    if (value.partial !== undefined && value.partial !== true)
      throw new Error('invalid partial marker');
    if (!value.partial)
      validateResponse(
        { protocol: 1, ok: true, result: value.result },
        0,
        original.operation as string,
      );
  }
  return state as SimulationState;
}
