/** Executable representative simulation. No provider SDK, credentials or network. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateRequest, ERRORS } from './protocol.ts';
import { profile } from './profiles.ts';
import { identityKey, updateMapped, readMapped, validateItem } from './items.ts';
import { Relationships } from './capabilities.ts';
import { Claims } from './claims.ts';
import { complete } from './completion.ts';
let text = ''; for await (const chunk of process.stdin) text += chunk;
try {
  const request = JSON.parse(text); validateRequest(request);
  const { context, input, operation, mutationId } = request;
  const { capabilities, mappings } = profile(context.provider);
  const fault = process.argv[2];
  if (['error-authentication', 'error-permission', 'error-transient'].includes(fault)) throw new Error(`${fault.slice(6)}: simulated provider failure`);
  if (fault === 'overstate-claim') capabilities.claims.guarantee = 'atomic';
  const path = join(context.cwd, 'simulation.json');
  const state: any = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { items: {}, edges: [], claims: {}, journal: {}, count: 0 };
  const scope = JSON.stringify([context.provider, context.backlog, context.repository, context.actor, context.session]);
  const key = `${scope}:${mutationId}`;
  const fingerprint = JSON.stringify({ operation, input });
  const find = (identity: any) => {
    if (identity.provider !== context.provider || identity.backlog !== context.backlog) throw new Error('invalid_request: item outside selected scope');
    const found = state.items[identityKey(identity)];
    if (!found) throw new Error('not_found: item'); return found;
  };
  const normalized = (record: any) => ({ ...record.item, metadata: readMapped(record.data, mappings) });
  const page = (items: unknown[]) => ({ items, complete: true, nextCursor: null });
  let result: any;
  if (mutationId && state.journal[key] && fault !== 'duplicate') {
    if (state.journal[key].fingerprint !== fingerprint) throw new Error('invalid_request: mutation key rebound');
    result = state.journal[key].result;
  } else {
    switch (operation) {
      case 'capability.read': result = { capabilities }; break;
      case 'backlog.list': result = page([{ provider: context.provider, id: context.backlog }]); break;
      case 'backlog.create': result = { backlog: context.backlog }; break;
      case 'backlog.check': result = { valid: true, gaps: [] }; break;
      case 'item.create': {
        const number = ++state.count;
        const identity = { provider: context.provider, backlog: context.backlog, id: `${context.provider}-${number}` };
        const item = { identity, reference: context.provider === 'github' ? `#${number}` : identity.id, title: input.title, body: input.body, metadata: input.metadata, owners: [], ...(context.provider === 'beads' ? {} : { url: `https://example.invalid/items/${number}` }) };
        validateItem(item);
        const data = updateMapped({ ...(context.provider === 'linear' || context.provider === 'beads' ? { labels: ['unrelated'] } : {}), custom: 'preserved' }, input.metadata, mappings);
        state.items[identityKey(identity)] = { item, data }; result = { item }; break;
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
      case 'item.search': case 'candidate.list': result = page(Object.values(state.items).map((record: any) => normalized(record))); break;
      case 'relationship.write': case 'relationship.list': {
        find(input.item);
        const relationships = new Relationships(capabilities); relationships.edges = state.edges;
        if (operation === 'relationship.write') {
          find(input.target);
          if (fault !== 'ignore-blocker' || input.kind !== 'blocked_by') relationships.write(input.item, input.target, input.kind, input.present);
          state.edges = relationships.edges; result = { present: input.present };
        } else result = page(relationships.list(input.item, input.kind).map(identity => ({ identity, status: normalized(find(identity)).metadata.Status })));
        break;
      }
      case 'claim.acquire': case 'claim.read': case 'claim.release': {
        const record = find(input.item); const id = identityKey(input.item);
        const claims = new Claims('best-effort');
        if (state.claims[id]) claims.state = state.claims[id];
        claims.state.status = normalized(record).metadata.Status;
        if (operation !== 'claim.read' && claims.state.status === 'Done') throw new Error('conflict: completed item cannot be claimed or released');
        if (fault === 'overwrite-owner' && operation === 'claim.acquire') claims.state.actor = null;
        if (operation === 'claim.acquire') result = { claim: claims.acquire(context.actor, context.session, mutationId) };
        else if (operation === 'claim.release') result = { released: claims.release(context.actor, context.session, input.token) };
        else result = { claim: claims.read() };
        if (operation !== 'claim.read') {
          state.claims[id] = claims.read(); record.item.owners = claims.state.actor ? [claims.state.actor] : [];
          record.data = updateMapped(record.data, { Status: claims.state.status }, mappings);
        }
        break;
      }
      case 'reference.write': { const record = find(input.item); record.reference = input.reference; result = { reference: input.reference }; break; }
      case 'completion.write': {
        const record = find(input.item);
        if (record.reference !== input.merge.reference) throw new Error('invalid_request: merge reference not associated');
        const completion = { status: normalized(record).metadata.Status, completionEffects: record.completionEffects ?? 0 };
        await complete(completion, record.reference, async () => input.merge);
        record.data = updateMapped(record.data, { Status: completion.status }, mappings);
        record.completionEffects = completion.completionEffects; result = { status: completion.status }; break;
      }
      case 'mutation.read': { const entry = state.journal[`${scope}:${input.mutationId}`]; result = entry ? { state: 'applied', result: entry.result } : { state: 'absent' }; break; }
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
  process.stdout.write(JSON.stringify({ protocol: 1, ok: false, error: { category, message, effects: category === 'unknown_outcome' ? 'unknown' : 'none' } })); process.exitCode = 1;
}
