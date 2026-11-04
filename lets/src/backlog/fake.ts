import { emptyState, readState } from './state.ts';
import type { StoredItem, JournalEntry, SimulationState } from './state.ts';
import type { Claim } from './types.ts';
import type { Identity } from './protocol.ts';
import { object } from './protocol.ts';
import { AdapterFailure } from './errors.ts';
/** Executable representative simulation. No provider SDK, credentials or network. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateRequest, parseRequest } from './protocol.ts';
import { profile } from './profiles.ts';
import { identityKey, updateMapped, readMapped, validateItem } from './items.ts';
import { requireCapability } from './capabilities.ts';
const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const text = Buffer.concat(chunks).toString('utf8');
try {
  const request = parseRequest(text);
  const { context, input, operation, mutationId } = request;
  const { capabilities, mappings } = profile(context.provider);
  const fault = process.argv[2];
  if (fault?.startsWith('programming-'))
    throw new Error(`${fault.slice(12)}: injected implementation bug`);
  const injected = new Map<string, 'authentication' | 'permission' | 'transient'>([
    ['error-authentication', 'authentication'],
    ['error-permission', 'permission'],
    ['error-transient', 'transient'],
  ]).get(fault);
  if (injected) throw new AdapterFailure(injected, 'none', 'simulated provider failure');
  if (fault === 'invalid-mapping') mappings.Kind.values = {};
  if (fault === 'emulated-blockers') capabilities.blockers.support = 'emulated';
  if (fault === 'unsupported-hierarchy') capabilities.hierarchy.support = 'unsupported';
  if (fault === 'overstate-claim') capabilities.claims.guarantee = 'atomic';
  const path = join(context.cwd, 'simulation.json');
  const state = existsSync(path)
    ? readState(JSON.parse(readFileSync(path, 'utf8')))
    : emptyState();
  if (
    context.backlog !== undefined &&
    !state.backlogs.some(
      (backlog) =>
        backlog.id === context.backlog &&
        backlog.provider === context.provider &&
        backlog.repository === context.repository,
    )
  )
    throw new AdapterFailure('not_found', 'none', 'selected backlog');
  const scope = JSON.stringify([
    context.provider,
    context.backlog,
    context.repository,
    context.actor,
    context.session,
  ]);
  const key = `${scope}:${mutationId}`;
  const fingerprint = JSON.stringify({ operation, input });
  const find = (identity: Identity) => {
    if (identity.provider !== context.provider || identity.backlog !== context.backlog)
      throw new AdapterFailure('invalid_request', 'none', 'item outside selected scope');
    const found = state.items[identityKey(identity)];
    if (!found || found.repository !== context.repository)
      throw new AdapterFailure('not_found', 'none', 'item');
    return found;
  };
  const normalized = (record: StoredItem) => {
    const { displayReference, ...item } = record.item;
    return {
      ...item,
      reference: displayReference,
      metadata: readMapped(record.data, mappings),
    };
  };
  const verifyClaimReplay = (entry: JournalEntry) => {
    const original: unknown = {
      protocol: 1,
      context,
      mutationId: 'replay',
      ...object(JSON.parse(entry.fingerprint), 'fingerprint'),
    };
    validateRequest(original);
    if (original.operation !== 'claim.acquire') return;
    const record = find(original.input.item);
    const current = state.claims[identityKey(original.input.item)];
    if (
      !current ||
      current.actor !== context.actor ||
      current.session !== context.session ||
      current.token !== object(entry.result?.claim, 'stored claim').token ||
      normalized(record).metadata.Status !== 'In Progress'
    )
      throw new AdapterFailure(
        'conflict',
        'none',
        'claim replay no longer has current ownership',
      );
  };
  const page = (items: unknown[]) => ({ items, complete: true, nextCursor: null });
  let result: Record<string, unknown>;
  if (mutationId && state.journal[key] && fault !== 'duplicate') {
    if (state.journal[key].fingerprint !== fingerprint)
      throw new AdapterFailure('invalid_request', 'none', 'mutation key rebound');
    if (state.journal[key].partial)
      throw new AdapterFailure(
        'unknown_outcome',
        'partial',
        'reconcile partial claim before retry',
      );
    verifyClaimReplay(state.journal[key]);
    result = state.journal[key].result!;
  } else {
    switch (operation) {
      case 'capability.read':
        result = { capabilities };
        break;
      case 'backlog.list':
        result = page(
          state.backlogs
            .filter(
              (backlog) =>
                backlog.provider === context.provider &&
                backlog.repository === context.repository,
            )
            .map(({ repository, ...backlog }) => backlog),
        );
        break;
      case 'backlog.create': {
        const id = `backlog-${++state.count}`;
        state.backlogs.push({
          id,
          title: input.title,
          provider: context.provider,
          repository: context.repository,
        });
        result = { backlog: id };
        break;
      }
      case 'backlog.check':
        result = { valid: true, gaps: [] };
        break;
      case 'item.create': {
        const number = ++state.count;
        const identity = {
          provider: context.provider,
          backlog: context.backlog!,
          id: `${context.provider}-${number}`,
        };
        const item = {
          identity,
          reference: context.provider === 'github' ? `#${number}` : identity.id,
          title: input.title,
          body: input.body,
          metadata: input.metadata,
          owners: [],
          ...(context.provider === 'beads'
            ? {}
            : { url: `https://example.invalid/items/${number}` }),
        };
        validateItem(item);
        const data = updateMapped(
          {
            ...(context.provider === 'linear' || context.provider === 'beads'
              ? { labels: ['unrelated'] }
              : {}),
            custom: 'preserved',
          },
          input.metadata,
          mappings,
        );
        const { reference: displayReference, ...fields } = item;
        state.items[identityKey(identity)] = {
          item: { ...fields, displayReference },
          data,
          repository: context.repository,
        };
        result = { item };
        break;
      }
      case 'item.read':
        result = { item: normalized(find(input.item)) };
        break;
      case 'item.update': {
        const record = find(input.item);
        for (const field of Object.keys(input.patch))
          if (!['title', 'body', 'metadata'].includes(field))
            throw new AdapterFailure('invalid_request', 'none', 'unknown patch field');
        if (fault === 'erase-unrelated') delete record.data.custom;
        if (input.patch.metadata)
          record.data = updateMapped(record.data, input.patch.metadata, mappings);
        for (const field of ['title', 'body'] as const)
          if (input.patch[field] !== undefined) record.item[field] = input.patch[field];
        result = { item: normalized(record) };
        validateItem(result.item);
        break;
      }
      case 'item.search':
      case 'candidate.list':
        result = page(
          Object.values(state.items)
            .filter(
              (record: StoredItem) =>
                record.repository === context.repository &&
                record.item.identity.provider === context.provider &&
                record.item.identity.backlog === context.backlog,
            )
            .map(normalized),
        );
        break;
      case 'relationship.write':
      case 'relationship.list': {
        find(input.item);
        requireCapability(
          capabilities,
          ['child', 'parent'].includes(input.kind) ? 'hierarchy' : 'blockers',
        );
        if (!['child', 'parent', 'blocked_by', 'related'].includes(input.kind))
          throw new AdapterFailure('invalid_request', 'none', 'relationship kind');
        const kind = input.kind === 'parent' ? 'child' : input.kind;
        const matches = (edge: SimulationState['edges'][number]) =>
          edge.kind === kind &&
          identityKey(input.kind === 'parent' ? edge.target : edge.item) ===
            identityKey(input.item);
        if (operation === 'relationship.write') {
          find(input.target);
          if (fault !== 'ignore-blocker' || kind !== 'blocked_by') {
            state.edges = state.edges.filter(
              (edge) =>
                !(
                  matches(edge) &&
                  identityKey(input.kind === 'parent' ? edge.item : edge.target) ===
                    identityKey(input.target)
                ),
            );
            if (input.present)
              state.edges.push({
                item: input.kind === 'parent' ? input.target : input.item,
                target: input.kind === 'parent' ? input.item : input.target,
                kind,
              });
          }
          result = { present: input.present };
        } else
          result = page(
            state.edges.filter(matches).map((edge) => {
              const identity = input.kind === 'parent' ? edge.item : edge.target;
              return { identity, status: normalized(find(identity)).metadata.Status };
            }),
          );
        break;
      }
      case 'claim.acquire':
      case 'claim.read':
      case 'claim.release': {
        const record = find(input.item);
        const id = identityKey(input.item);
        let claim: Claim = {
          ...(Object.hasOwn(state.claims, id)
            ? state.claims[id]
            : { actor: null, session: null, token: null, guarantee: 'best-effort' as const }),
          status: normalized(record).metadata.Status,
        };
        if (operation !== 'claim.read' && claim.status === 'Done')
          throw new AdapterFailure(
            'conflict',
            'none',
            'completed item cannot be claimed or released',
          );
        if (operation === 'claim.acquire') {
          if (claim.actor && fault !== 'overwrite-owner')
            throw new AdapterFailure('conflict', 'none', 'existing ownership');
          claim = {
            ...claim,
            actor: context.actor,
            session: context.session,
            token: mutationId!,
            status: fault === 'partial-claim' ? 'Todo' : 'In Progress',
          };
        } else if (operation === 'claim.release') {
          if (
            claim.actor !== context.actor ||
            claim.session !== context.session ||
            claim.token !== input.token
          )
            throw new AdapterFailure(
              'conflict',
              'none',
              'release requires original actor, session and token',
            );
          claim = { ...claim, actor: null, session: null, token: null, status: 'Todo' };
        }
        result = operation === 'claim.release' ? { released: true } : { claim };
        if (operation !== 'claim.read') {
          state.claims[id] = claim;
          record.item.owners = claim.actor ? [claim.actor] : [];
          record.data = updateMapped(record.data, { Status: claim.status }, mappings);
          if (operation === 'claim.acquire' && fault === 'partial-claim') {
            state.journal[key] = { fingerprint, partial: true };
            writeFileSync(path, JSON.stringify(state));
            throw new AdapterFailure(
              'unknown_outcome',
              'partial',
              'assignment persisted without status transition',
            );
          }
        }
        break;
      }
      case 'reference.write': {
        const record = find(input.item);
        record.pullRequestReference = input.reference;
        result = { reference: input.reference };
        break;
      }
      case 'completion.write': {
        const record = find(input.item);
        if (record.pullRequestReference !== input.merge.reference)
          throw new AdapterFailure(
            'invalid_request',
            'none',
            'merge reference not associated',
          );
        if (input.merge.merged !== true || !input.merge.commit)
          throw new AdapterFailure('invalid_request', 'none', 'unmerged code-host evidence');
        if (normalized(record).metadata.Status !== 'Done') {
          record.data = updateMapped(record.data, { Status: 'Done' }, mappings);
          record.completionEffects = (record.completionEffects ?? 0) + 1;
        }
        result = { status: 'Done' };
        break;
      }
      case 'mutation.read': {
        const entry = state.journal[`${scope}:${input.mutationId}`];
        if (entry && !entry.partial) verifyClaimReplay(entry);
        result = entry?.partial
          ? { state: 'unknown' }
          : entry
            ? { state: 'applied', result: entry.result }
            : { state: 'absent' };
        break;
      }
      default:
        throw new AdapterFailure('unsupported', 'none', 'operation');
    }
    if (mutationId) state.journal[key] = { fingerprint, result };
    if (mutationId) writeFileSync(path, JSON.stringify(state));
    if (mutationId && fault === 'error-unknown_outcome')
      throw new AdapterFailure(
        'unknown_outcome',
        'unknown',
        'response lost after persisted mutation',
      );
  }
  process.stdout.write(JSON.stringify({ protocol: 1, ok: true, result }));
} catch (error) {
  const failure =
    error instanceof AdapterFailure
      ? error
      : new AdapterFailure('unknown_outcome', 'unknown', String(error));
  process.stdout.write(
    JSON.stringify({
      protocol: 1,
      ok: false,
      error: {
        category: failure.category,
        message: failure.message,
        effects: failure.effects,
      },
    }),
  );
  process.exitCode = 1;
}
