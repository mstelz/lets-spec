import { AdapterFailure } from './errors.ts';
/** Executable representative simulation. No provider SDK, credentials or network. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateRequest, ERRORS } from './protocol.ts';
import { profile } from './profiles.ts';
import { identityKey, updateMapped, readMapped, validateItem } from './items.ts';
import { requireCapability } from './capabilities.ts';
let text = ''; for await (const chunk of process.stdin) text += chunk;
try {
  const request = JSON.parse(text); validateRequest(request);
  const { context, input, operation, mutationId } = request;
  const { capabilities, mappings } = profile(context.provider);
  const fault = process.argv[2];
  if (['error-authentication', 'error-permission', 'error-transient'].includes(fault)) throw new Error(`${fault.slice(6)}: simulated provider failure`);
  if (fault === 'emulated-blockers') capabilities.blockers.support = 'emulated';
  if (fault === 'unsupported-hierarchy') capabilities.hierarchy.support = 'unsupported';
  if (fault === 'overstate-claim') capabilities.claims.guarantee = 'atomic';
  const path = join(context.cwd, 'simulation.json');
  const state: any = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { items: {}, edges: [], claims: {}, journal: {}, count: 0, backlogs: [] };
  if (context.backlog !== undefined && !state.backlogs.some((backlog: any) => backlog.id === context.backlog && backlog.provider === context.provider && backlog.repository === context.repository)) throw new Error('not_found: selected backlog');
  const scope = JSON.stringify([context.provider, context.backlog, context.repository, context.actor, context.session]);
  const key = `${scope}:${mutationId}`;
  const fingerprint = JSON.stringify({ operation, input });
  const find = (identity: any) => {
    if (identity.provider !== context.provider || identity.backlog !== context.backlog) throw new Error('invalid_request: item outside selected scope');
    const found = state.items[identityKey(identity)];
    if (!found || found.repository !== context.repository) throw new Error('not_found: item'); return found;
  };
  const normalized = (record: any) => ({ ...record.item, metadata: readMapped(record.data, mappings) });
  const verifyClaimReplay = (entry: any) => {
    const original = JSON.parse(entry.fingerprint);
    if (original.operation !== 'claim.acquire') return;
    const record = find(original.input.item);
    const current = state.claims[identityKey(original.input.item)];
    if (!current || current.actor !== context.actor || current.session !== context.session || current.token !== entry.result.claim.token || normalized(record).metadata.Status !== 'In Progress') throw new Error('conflict: claim replay no longer has current ownership');
  };
  const page = (items: unknown[]) => ({ items, complete: true, nextCursor: null });
  let result: any;
  if (mutationId && state.journal[key] && fault !== 'duplicate') {
    if (state.journal[key].fingerprint !== fingerprint) throw new Error('invalid_request: mutation key rebound');
    if (state.journal[key].partial) throw new AdapterFailure('unknown_outcome', 'partial', 'reconcile partial claim before retry');
    verifyClaimReplay(state.journal[key]);
    result = state.journal[key].result;
  } else {
    switch (operation) {
      case 'capability.read': result = { capabilities }; break;
      case 'backlog.list': result = page(state.backlogs.filter((backlog: any) => backlog.provider === context.provider && backlog.repository === context.repository).map(({ repository, ...backlog }: any) => backlog)); break;
      case 'backlog.create': {
        const id = `backlog-${++state.count}`;
        state.backlogs.push({ id, title: input.title, provider: context.provider, repository: context.repository });
        result = { backlog: id }; break;
      }
      case 'backlog.check': result = { valid: true, gaps: [] }; break;
      case 'item.create': {
        const number = ++state.count;
        const identity = { provider: context.provider, backlog: context.backlog, id: `${context.provider}-${number}` };
        const item = { identity, reference: context.provider === 'github' ? `#${number}` : identity.id, title: input.title, body: input.body, metadata: input.metadata, owners: [], ...(context.provider === 'beads' ? {} : { url: `https://example.invalid/items/${number}` }) };
        validateItem(item);
        const data = updateMapped({ ...(context.provider === 'linear' || context.provider === 'beads' ? { labels: ['unrelated'] } : {}), custom: 'preserved' }, input.metadata, mappings);
        state.items[identityKey(identity)] = { item, data, repository: context.repository }; result = { item }; break;
      }
      case 'item.read': result = { item: normalized(find(input.item)) }; break;
      case 'item.update': {
        const record = find(input.item);
        for (const field of Object.keys(input.patch)) if (!['title', 'body', 'metadata'].includes(field)) throw new Error('invalid_request: unknown patch field');
        if (fault === 'erase-unrelated') delete record.data.custom;
        if (input.patch.metadata) record.data = updateMapped(record.data, input.patch.metadata, mappings);
        for (const field of ['title', 'body']) if (input.patch[field] !== undefined) record.item[field] = input.patch[field];
        result = { item: normalized(record) }; validateItem(result.item); break;
      }
      case 'item.search': case 'candidate.list': result = page(Object.values(state.items).filter((record: any) => record.repository === context.repository && record.item.identity.provider === context.provider && record.item.identity.backlog === context.backlog).map(normalized)); break;
      case 'relationship.write': case 'relationship.list': {
        find(input.item);
        requireCapability(capabilities, ['child', 'parent'].includes(input.kind) ? 'hierarchy' : 'blockers');
        if (!['child', 'parent', 'blocked_by', 'related'].includes(input.kind)) throw new Error('invalid_request: relationship kind');
        const kind = input.kind === 'parent' ? 'child' : input.kind;
        const matches = (edge: any) => edge.kind === kind && identityKey(input.kind === 'parent' ? edge.target : edge.item) === identityKey(input.item);
        if (operation === 'relationship.write') {
          find(input.target);
          if (fault !== 'ignore-blocker' || kind !== 'blocked_by') {
            state.edges = state.edges.filter((edge: any) => !(matches(edge) && identityKey(input.kind === 'parent' ? edge.item : edge.target) === identityKey(input.target)));
            if (input.present) state.edges.push({ item: input.kind === 'parent' ? input.target : input.item, target: input.kind === 'parent' ? input.item : input.target, kind });
          }
          result = { present: input.present };
        } else result = page(state.edges.filter(matches).map((edge: any) => {
          const identity = input.kind === 'parent' ? edge.item : edge.target;
          return { identity, status: normalized(find(identity)).metadata.Status };
        }));
        break;
      }
      case 'claim.acquire': case 'claim.read': case 'claim.release': {
        const record = find(input.item); const id = identityKey(input.item);
        let claim = { actor: null, session: null, token: null, guarantee: 'best-effort', ...state.claims[id], status: normalized(record).metadata.Status };
        if (operation !== 'claim.read' && claim.status === 'Done') throw new Error('conflict: completed item cannot be claimed or released');
        if (operation === 'claim.acquire') {
          if (claim.actor && fault !== 'overwrite-owner') throw new Error('conflict: existing ownership');
          claim = { ...claim, actor: context.actor, session: context.session, token: mutationId, status: fault === 'partial-claim' ? 'Todo' : 'In Progress' };
        } else if (operation === 'claim.release') {
          if (claim.actor !== context.actor || claim.session !== context.session || claim.token !== input.token) throw new Error('conflict: release requires original actor, session and token');
          claim = { ...claim, actor: null, session: null, token: null, status: 'Todo' };
        }
        result = operation === 'claim.release' ? { released: true } : { claim };
        if (operation !== 'claim.read') {
          state.claims[id] = claim; record.item.owners = claim.actor ? [claim.actor] : [];
          record.data = updateMapped(record.data, { Status: claim.status }, mappings);
          if (operation === 'claim.acquire' && fault === 'partial-claim') {
            state.journal[key] = { fingerprint, partial: true }; writeFileSync(path, JSON.stringify(state));
            throw new AdapterFailure('unknown_outcome', 'partial', 'assignment persisted without status transition');
          }
        }
        break;
      }
      case 'reference.write': { const record = find(input.item); record.reference = input.reference; result = { reference: input.reference }; break; }
      case 'completion.write': {
        const record = find(input.item);
        if (record.reference !== input.merge.reference) throw new Error('invalid_request: merge reference not associated');
        if (input.merge.merged !== true || !input.merge.commit) throw new Error('unmerged code-host evidence');
        if (normalized(record).metadata.Status !== 'Done') {
          record.data = updateMapped(record.data, { Status: 'Done' }, mappings);
          record.completionEffects = (record.completionEffects ?? 0) + 1;
        }
        result = { status: 'Done' }; break;
      }
      case 'mutation.read': { const entry = state.journal[`${scope}:${input.mutationId}`]; if (entry && !entry.partial) verifyClaimReplay(entry); result = entry?.partial ? { state: 'unknown' } : entry ? { state: 'applied', result: entry.result } : { state: 'absent' }; break; }
      default: throw new Error('unsupported: operation');
    }
    if (mutationId) state.journal[key] = { fingerprint, result };
    if (mutationId) writeFileSync(path, JSON.stringify(state));
    if (mutationId && fault === 'error-unknown_outcome') throw new Error('unknown_outcome: response lost after persisted mutation');
  }
  process.stdout.write(JSON.stringify({ protocol: 1, ok: true, result }));
} catch (error) {
  const message = String(error);
  const category = ERRORS.find(category => message.includes(category)) ?? 'invalid_request';
  process.stdout.write(JSON.stringify({ protocol: 1, ok: false, error: { category, message, effects: error instanceof AdapterFailure ? error.effects : category === 'unknown_outcome' ? 'unknown' : 'none' } })); process.exitCode = 1;
}
