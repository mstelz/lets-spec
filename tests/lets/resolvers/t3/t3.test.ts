import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { Refused, SessionFailed, SpawnError, TimeoutError } from '../../../../lets/src/resolvers/kit/errors.ts';
import type { Db } from '../../../../lets/src/resolvers/kit/io.ts';
import {
  baseDir, buildLaunch, catalogueOf, createAdapter, defaultModel, dispatch, findProject, isAncestor, launch, readCatalogue, readFinalMessage, request,
  optionsFromCatalogue, readRun, readRuntime, readToken, t3ModelSelection,
} from '../../../../lets/src/resolvers/t3/t3.ts';
import type { RunInput, StartInput } from '../../../../lets/src/resolvers/kit/adapter.ts';
import { fakeIo } from '../kit/fixtures/fake-io.ts';

const SCHEMA = readFileSync(new URL('./fixtures/t3-schema.sql', import.meta.url), 'utf8');
const RUNTIME = '/home/u/.t3/userdata/server-runtime.json';
const TOKEN = '/home/u/.config/lets/t3-token';
const ORIGIN = 'http://127.0.0.1:3773';
const RUNNING = { [RUNTIME]: JSON.stringify({ pid: 7, origin: ORIGIN }), [TOKEN]: 'tok' };

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
  return db;
}
// The adapter closes each handle it opens; keep the in-memory one alive.
const shared = (db: DatabaseSync): Db => ({ prepare: (sql: string) => db.prepare(sql), close() {} }) as Db;

function addProject(db: DatabaseSync, { id = 'p1', title = 'lets-spec', root = '/r', selection = null as string | null } = {}) {
  db.prepare(`insert into projection_projects (project_id, title, workspace_root, scripts_json, created_at, updated_at, default_model_selection_json)
    values (?, ?, ?, '[]', 'now', 'now', ?)`).run(id, title, root, selection);
}
function addThread(db: DatabaseSync, threadId: string) {
  db.prepare(`insert into orchestration_v2_projection_threads (thread_id, project_id, title, default_provider, runtime_mode, interaction_mode, created_at, updated_at, payload_json)
    values (?, 'p1', 't', 'claudeAgent', 'full-access', 'plan', 'now', 'now', '{}')`).run(threadId);
}
// Runs are numbered; the newest has the highest ordinal.
function addRun(db: DatabaseSync, threadId: string, runId: string, ordinal: number, status: string) {
  db.prepare(`insert into orchestration_v2_projection_runs (run_id, thread_id, ordinal, provider, status, requested_at, payload_json)
    values (?, ?, ?, 'claudeAgent', ?, 'now', '{}')`).run(runId, threadId, ordinal, status);
}
function addMessage(db: DatabaseSync, messageId: string, runId: string, text: string, streaming: number, { role = 'assistant', createdAt = 'now' } = {}) {
  db.prepare(`insert into orchestration_v2_projection_messages (message_id, thread_id, run_id, role, streaming, created_at, updated_at, payload_json)
    values (?, 'T', ?, ?, ?, ?, ?, ?)`).run(messageId, runId, role, streaming, createdAt, createdAt, JSON.stringify({ text }));
}
function addPendingRequest(db: DatabaseSync, threadId: string) {
  db.prepare(`insert into orchestration_v2_projection_runtime_requests (runtime_request_id, thread_id, node_id, kind, status, created_at, payload_json)
    values ('rq1', ?, 'n1', 'user_input', 'pending', 'now', '{}')`).run(threadId);
}
function addFailure(db: DatabaseSync, runId: string, message: string) {
  db.prepare(`insert into orchestration_v2_projection_turn_items (turn_item_id, thread_id, run_id, ordinal, type, status, updated_at, payload_json)
    values ('e1', 'T', ?, 1, 'error', 'failed', 'now', ?)`).run(runId, JSON.stringify({ failure: { class: 'provider', message } }));
}

type Log = [string, unknown][];

// A WebSocket stand-in: opens at once and answers each request with `reply`.
function fakeWebSocket(reply: unknown, log: Log): typeof WebSocket {
  return class {
    listeners: Record<string, ((event: unknown) => void)[]> = {};
    constructor(url: URL) {
      log.push(['open', String(url)]);
      queueMicrotask(() => this.emit('open', {}));
    }
    addEventListener(type: string, listener: (event: unknown) => void) {
      (this.listeners[type] ??= []).push(listener);
    }
    emit(type: string, event: unknown) {
      for (const listener of this.listeners[type] ?? []) listener(event);
    }
    send(data: string) {
      log.push(['send', JSON.parse(data)]);
      queueMicrotask(() => this.emit('message', { data: JSON.stringify(reply) }));
    }
    close() {}
  } as unknown as typeof WebSocket;
}
const SUCCESS = { _tag: 'Exit', requestId: '1', exit: { _tag: 'Success', value: { sequence: 9 } } };
// launchThread answers with the thread and its projection; the resolver reads only the thread id.
const LAUNCHED = { _tag: 'Exit', requestId: '1', exit: { _tag: 'Success', value: { threadId: 'T', projection: {}, resumed: false } } };

// fetch answers from a list of statuses, recording each request.
function fakeFetch(statuses: number[], log: [string, RequestInit | undefined][]): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    log.push([url, init]);
    const status = statuses.shift()!;
    return { status, ok: status === 200, json: async () => ({ ticket: 'TICKET' }), text: async () => 'denied' };
  }) as unknown as typeof fetch;
}

test('baseDir honours T3CODE_HOME', () => {
  assert.equal(baseDir({}, '/home/u'), '/home/u/.t3');
  assert.equal(baseDir({ T3CODE_HOME: '/t' }, '/home/u'), '/t');
});

test('detect needs a runtime file, a live server, and the server among this process\'s ancestors', () => {
  const chain: Record<number, number> = { 100: 50, 50: 7, 7: 1 };
  const io = (over = {}) => fakeIo({
    files: { [RUNTIME]: JSON.stringify({ pid: 7, origin: ORIGIN }) },
    pid: 100,
    parentPid: (pid) => chain[pid] ?? null,
    processAlive: (pid) => pid === 7,
    env: {},
    ...over,
  });
  assert.deepEqual(readRuntime(io()), { origin: ORIGIN, pid: 7 });
  assert.equal(isAncestor(io(), 7), true);
  assert.equal(createAdapter(io()).detect(), true);
  assert.equal(createAdapter(io({ files: {} })).detect(), false);
  assert.equal(createAdapter(io({ processAlive: () => false })).detect(), false);
  // A stale runtime file: pid 7 is alive but is not an ancestor.
  const stale: Record<number, number> = { 100: 50, 50: 1 };
  assert.equal(createAdapter(io({ parentPid: (pid: number) => stale[pid] ?? null })).detect(), false);
});

// An entry of server.getConfig's providers[], enabled and ready unless told otherwise.
const provider = (instanceId: string, models: unknown, over: Record<string, unknown> = {}) =>
  ({ instanceId, driver: instanceId, enabled: true, status: 'ready', models, ...over });
const slug = (id: string, over: Record<string, unknown> = {}) => ({ slug: id, name: id, ...over });

test('catalogueOf reads each provider instance and its models', () => {
  const reply = { providers: [
    provider('codex', [slug('gpt-6-luna'), slug('gpt-5.6-terra', { isDefault: true })]),
    provider('antigravity', [slug('lab', { isCustom: true })], { status: 'warning', enabled: false, availability: 'unavailable' }),
  ] };
  assert.deepEqual(catalogueOf(reply), { instances: [
    { instanceId: 'codex', enabled: true, status: 'ready', availability: null, models: [
      { slug: 'gpt-6-luna', isDefault: false, isCustom: false }, { slug: 'gpt-5.6-terra', isDefault: true, isCustom: false }] },
    { instanceId: 'antigravity', enabled: false, status: 'warning', availability: 'unavailable', models: [{ slug: 'lab', isDefault: false, isCustom: true }] },
  ], hidden: {} });
});

test('catalogueOf reads the slugs the user hid for each instance', () => {
  const reply = { providers: [], settings: { providerModelPreferences: { codex: { hiddenModels: ['gpt-6-luna', 7] }, claudeAgent: {} } } };
  assert.deepEqual(catalogueOf(reply).hidden, { codex: ['gpt-6-luna'] });
});

test('catalogueOf skips an entry without the fields it needs', () => {
  const reply = { providers: [7, { instanceId: 'codex' }, provider('codex', 'x'), provider('codex', [], { enabled: 'yes' }), provider('claudeAgent', [])] };
  assert.deepEqual(catalogueOf(reply).instances.map(({ instanceId }) => instanceId), ['claudeAgent']);
});

test('catalogueOf skips a model without a slug', () => {
  const reply = { providers: [provider('codex', [null, { name: 'x' }, slug('gpt-6-luna')])] };
  assert.deepEqual(catalogueOf(reply).instances[0].models.map((model) => model.slug), ['gpt-6-luna']);
});

test('catalogueOf skips a model whose id cannot run', () => {
  const reply = { providers: [
    provider('codex', [slug(''), slug('my model'), slug('gpt-6-luna')]),
    provider('antigravity', [slug('-high'), slug('gemini 4-low'), slug('gemini-4-argon')]),
  ] };
  assert.deepEqual(catalogueOf(reply).instances.map(({ models }) => models.map((model) => model.slug)), [['gpt-6-luna'], ['gemini-4-argon']]);
});

test('catalogueOf throws on a reply that is not an object', () => {
  assert.throws(() => catalogueOf(null), /not an object/);
  assert.throws(() => catalogueOf('x'), /not an object/);
});

test('catalogueOf throws on a reply with no list of providers', () => {
  assert.throws(() => catalogueOf({ instances: [] }), /no list of providers/);
});

const options = (providers: unknown[], hidden: Record<string, string[]> = {}) => optionsFromCatalogue(catalogueOf({
  providers,
  settings: { providerModelPreferences: Object.fromEntries(Object.entries(hidden).map(([id, hiddenModels]) => [id, { hiddenModels }])) },
}));

test('options from the catalogue list each instance in its order, the default first', () => {
  assert.deepEqual(options([
    provider('codex', [slug('gpt-6-luna'), slug('gpt-5.6-terra', { isDefault: true })]),
    provider('claudeAgent', [slug('claude-opus-5-5'), slug('claude-fable-5-1', { isDefault: true })]),
    provider('antigravity', [slug('gemini-4-argon'), slug('gemini-3.8-flash')]),
  ]), ['gpt/gpt-5.6-terra', 'gpt/gpt-6-luna', 'claude/claude-fable-5-1', 'claude/claude-opus-5-5', 'gemini/gemini-4-argon', 'gemini/gemini-3.8-flash']);
});

test('options from the catalogue leave out a disabled instance', () => {
  assert.deepEqual(options([provider('codex', [slug('gpt-6-luna')], { enabled: false })]), []);
});

test('options from the catalogue leave out an instance in status error or disabled', () => {
  assert.deepEqual(options([
    provider('codex', [slug('gpt-6-luna')], { status: 'disabled' }),
    provider('claudeAgent', [slug('claude-opus-5-5')], { status: 'error' }),
  ]), []);
});

test('options from the catalogue list an instance in status warning', () => {
  assert.deepEqual(options([provider('antigravity', [slug('gemini-4-argon')], { status: 'warning' })]), ['gemini/gemini-4-argon']);
});

test('options from the catalogue leave out an unavailable instance', () => {
  assert.deepEqual(options([provider('antigravity', [slug('gemini-4-argon')], { availability: 'unavailable' })]), []);
});

test('options from the catalogue leave out an instance t3 does not run', () => {
  assert.deepEqual(options([provider('cursor', [slug('auto')]), provider('codex_work', [slug('gpt-6-astra')]), provider('codex', [slug('gpt-6-luna')])]),
    ['gpt/gpt-6-luna']);
});

test('options from the catalogue leave out a hidden model', () => {
  assert.deepEqual(options([provider('codex', [slug('gpt-6-luna'), slug('gpt-6-astra')])], { codex: ['gpt-6-astra'] }), ['gpt/gpt-6-luna']);
});

test('options from the catalogue keep a custom model the user hid', () => {
  assert.deepEqual(options([provider('claudeAgent', [slug('claude-opus-5-5'), slug('claude-lab', { isCustom: true })])], { claudeAgent: ['claude-lab'] }),
    ['claude/claude-opus-5-5', 'claude/claude-lab']);
});

test('options from the catalogue put no hidden default first', () => {
  assert.deepEqual(options([provider('claudeAgent', [slug('claude-opus-5-5'), slug('claude-opus-4-5', { isDefault: true })])], { claudeAgent: ['claude-opus-4-5'] }),
    ['claude/claude-opus-5-5']);
});

test('options from the catalogue list each gemini model once, without its effort', () => {
  assert.deepEqual(options([provider('antigravity', [slug('gemini-3.8-flash-high'), slug('gemini-3.8-flash-low')])]), ['gemini/gemini-3.8-flash']);
});

const defaultOf = (providers: unknown[], family: 'gpt' | 'claude' | 'gemini', hidden: Record<string, string[]> = {}) => defaultModel(catalogueOf({
  providers,
  settings: { providerModelPreferences: Object.fromEntries(Object.entries(hidden).map(([id, hiddenModels]) => [id, { hiddenModels }])) },
}), family);

test('defaultModel is the visible default', () => {
  assert.equal(defaultOf([provider('codex', [slug('gpt-6-luna'), slug('gpt-5.6-terra', { isDefault: true })])], 'gpt'), 'gpt-5.6-terra');
});

test('defaultModel is the first visible model when the default is hidden', () => {
  assert.equal(defaultOf([provider('codex', [slug('gpt-5.6-terra', { isDefault: true }), slug('gpt-6-luna')])], 'gpt', { codex: ['gpt-5.6-terra'] }), 'gpt-6-luna');
});

test('defaultModel is null when the family\'s instance is missing', () => {
  assert.equal(defaultOf([provider('codex', [slug('gpt-6-luna')])], 'claude'), null);
});

test('defaultModel is null when the family\'s instance is not listed', () => {
  assert.equal(defaultOf([provider('claudeAgent', [slug('claude-fable-5-1', { isDefault: true })], { status: 'error' })], 'claude'), null);
});

test('defaultModel is null when the instance has no visible model', () => {
  assert.equal(defaultOf([provider('codex', [slug('gpt-6-luna')])], 'gpt', { codex: ['gpt-6-luna'] }), null);
});

test('defaultModel of gemini has no effort suffix', () => {
  assert.equal(defaultOf([provider('antigravity', [slug('gemini-3.8-flash-high', { isDefault: true })])], 'gemini'), 'gemini-3.8-flash');
});

test('t3 model selection carries the effort in each provider\'s own option', () => {
  assert.deepEqual(t3ModelSelection({ family: 'gpt', model: 'gpt-6.1-sol', effort: 'high' }),
    { instanceId: 'codex', model: 'gpt-6.1-sol', options: [{ id: 'reasoningEffort', value: 'high' }] });
  assert.deepEqual(t3ModelSelection({ family: 'claude', model: 'claude-fable-5-1', effort: 'low' }),
    { instanceId: 'claudeAgent', model: 'claude-fable-5-1', options: [{ id: 'effort', value: 'low' }] });
  assert.deepEqual(t3ModelSelection({ family: 'gemini', model: 'gemini-3.8-flash-high', effort: 'high' }),
    { instanceId: 'antigravity', model: 'gemini-3.8-flash-high', options: [] });
});

test('t3 model selection sends a gemini model as given, with no effort option', () => {
  assert.deepEqual(t3ModelSelection({ family: 'gemini', model: 'gemini-4-argon', effort: 'medium' }),
    { instanceId: 'antigravity', model: 'gemini-4-argon', options: [] });
});

test('findProject matches the workspace root, or names the known projects', () => {
  const db = database();
  addProject(db, { id: 'p1', title: 'lets-spec', root: '/r' });
  addProject(db, { id: 'p2', title: 'other', root: '/o' });
  assert.equal(findProject(shared(db), '/r').project_id, 'p1');
  assert.throws(() => findProject(shared(db), '/x'), (error) =>
    error instanceof Refused && /t3 project add \/x/.test(error.message) && /lets-spec, other/.test(error.message));
});

test('buildLaunch has the shape the UI sends for a new thread, on the current branch', () => {
  const modelSelection = { instanceId: 'codex', model: 'gpt-6.1-sol', options: [{ id: 'reasoningEffort', value: 'high' }] };
  const input = buildLaunch({
    threadId: 'T', projectId: 'P', title: 'x-plan-review', text: 'PROMPT', modelSelection, interactionMode: 'plan', branch: 'main', messageId: 'M', commandId: 'C',
  });
  assert.deepEqual(input, {
    commandId: 'C',
    creationSource: 'web',
    threadId: 'T',
    projectId: 'P',
    title: 'x-plan-review',
    generateTitle: true,
    modelSelection,
    runtimeMode: 'full-access',
    interactionMode: 'plan',
    workspaceStrategy: { type: 'root', branch: 'main' },
    initialMessage: { messageId: 'M', text: 'PROMPT', attachments: [] },
  });
  // A detached HEAD has no branch, and the root strategy then has none either.
  const plain = buildLaunch({ threadId: 'T', projectId: 'P', title: 't', text: 'x', modelSelection, interactionMode: 'default', branch: null });
  assert.equal(plain.interactionMode, 'default');
  assert.deepEqual(plain.workspaceStrategy, { type: 'root' });
  assert.match(plain.commandId, /^[0-9a-f-]{36}$/);
  assert.match(plain.initialMessage.messageId, /^[0-9a-f-]{36}$/);
});

test('readRun returns the newest run, or null when there is none', () => {
  const db = database();
  addThread(db, 'T');
  assert.equal(readRun(shared(db), 'T'), null);
  addRun(db, 'T', 'run-1', 1, 'completed');
  addRun(db, 'T', 'run-2', 2, 'running');
  assert.deepEqual(readRun(shared(db), 'T'), { id: 'run-2', status: 'running', pendingRequests: 0, failure: null });
  addPendingRequest(db, 'T');
  assert.equal(readRun(shared(db), 'T')!.pendingRequests, 1);
});

test('readRun reads a failed run\'s failure from its error item', () => {
  const db = database();
  addThread(db, 'T');
  addRun(db, 'T', 'run-1', 1, 'failed');
  assert.equal(readRun(shared(db), 'T')!.failure, null);
  addFailure(db, 'run-1', 'quota exceeded');
  assert.equal(readRun(shared(db), 'T')!.failure, 'quota exceeded');
});

test('readFinalMessage returns the run\'s newest assistant message', () => {
  const db = database();
  assert.equal(readFinalMessage(shared(db), 'run-1'), null);
  addMessage(db, 'u1', 'run-1', 'the prompt', 0, { role: 'user', createdAt: '2026-10-17T00:00:00.000Z' });
  assert.equal(readFinalMessage(shared(db), 'run-1'), null);
  addMessage(db, 'a1', 'run-1', 'first', 0, { createdAt: '2026-10-17T00:00:01.000Z' });
  addMessage(db, 'a2', 'run-1', 'last', 1, { createdAt: '2026-10-17T00:00:02.000Z' });
  assert.deepEqual(readFinalMessage(shared(db), 'run-1'), { text: 'last', streaming: true });
});

const HANDLE = { kind: 'thread', id: 'T', origin: ORIGIN };

// Run a session in thread T, whose state is db. Each sleep runs the next step.
// t3 answers each request with the next status, and the log keeps what was sent.
function running(db: DatabaseSync, steps: (() => void)[] = [], { timeoutMs = 60000, statuses = [200, 200], log = [] as Log } = {}) {
  return createAdapter(launchingIo(db, log, { sleep: async () => steps.shift()?.(), statuses })).run(runInput, { timeoutMs });
}
const sentTypes = (log: Log) => log.filter(([what]) => what === 'send').map(([, frame]) => (frame as { payload: { type?: string } }).payload.type ?? 'launch');

test('run waits for the run to complete and the message to stop streaming', async () => {
  const db = database();
  addThread(db, 'T');
  addRun(db, 'T', 'run-1', 1, 'running');
  const steps = [
    () => { addMessage(db, 'a1', 'run-1', 'partial', 1); },
    () => db.exec("update orchestration_v2_projection_runs set status = 'completed'"),
    () => db.exec(`update orchestration_v2_projection_messages set payload_json = '{"text":"FINDINGS"}', streaming = 0`),
  ];
  assert.deepEqual(await running(db, steps), { handle: HANDLE, text: 'FINDINGS' });
  assert.equal(steps.length, 0);
});
// A thread whose run failed before any assistant message.
function refusedRun() {
  const db = database();
  addThread(db, 'T');
  addRun(db, 'T', 'run-1', 1, 'failed');
  addFailure(db, 'run-1', 'model not available');
  return db;
}
test('run refuses a run that failed before any assistant message, with its failure and thread', async () => {
  await assert.rejects(running(refusedRun()),
    (error) => error instanceof Refused && error.message === 'model not available (thread T)');
});
test('run archives a thread it was refused in', async () => {
  const log: Log = [];
  await assert.rejects(running(refusedRun(), [], { log }), Refused);
  assert.deepEqual(sentTypes(log), ['launch', 'thread.archive']);
});
test('a refused run that cannot archive its thread is still refused, saying why', async () => {
  await assert.rejects(running(refusedRun(), [], { statuses: [200, 401] }),
    (error) => error instanceof Refused && /^model not available; could not archive it: .+ \(thread T\)$/.test(error.message));
});
test('run fails a run that failed after an assistant message, with its failure', async () => {
  const db = database();
  addThread(db, 'T');
  addRun(db, 'T', 'run-1', 1, 'failed');
  addMessage(db, 'a1', 'run-1', 'half a review', 0);
  addFailure(db, 'run-1', 'quota exceeded');
  await assert.rejects(running(db),
    (error) => error instanceof SessionFailed && !(error instanceof Refused) && error.message === 'quota exceeded (thread T)');
});
test('run fails when the session stops to ask', async () => {
  for (const [status, pending] of [['waiting', false], ['running', true]] as const) {
    const db = database();
    addThread(db, 'T');
    addRun(db, 'T', 'run-1', 1, status);
    if (pending) addPendingRequest(db, 'T');
    await assert.rejects(running(db), (error) => error instanceof SessionFailed && error.message === 'the session stopped to ask (thread T)');
  }
});
test('run fails on an interrupted, cancelled or rolled back run', async () => {
  for (const [status, reason] of [['interrupted', 'run interrupted'], ['cancelled', 'run cancelled'], ['rolled_back', 'run rolled back']]) {
    const db = database();
    addThread(db, 'T');
    addRun(db, 'T', 'run-1', 1, status);
    await assert.rejects(running(db),
      (error) => error instanceof SessionFailed && error.message === `${reason} (thread T)`);
  }
});
test('run times out naming the thread, when the run does not end in time', async () => {
  const db = database();
  addThread(db, 'T');
  addRun(db, 'T', 'run-1', 1, 'running');
  await assert.rejects(running(db, [], { timeoutMs: 0 }), (error) => error instanceof TimeoutError && error.message === 'no result after 0 ms (thread T)');
});
test('run returns a completed run with no message as an empty one; the resolver rejects it', async () => {
  const db = database();
  addThread(db, 'T');
  addRun(db, 'T', 'run-1', 1, 'completed');
  assert.deepEqual(await running(db), { handle: HANDLE, text: '' });
});
test('run returns an empty final message as it is; the resolver rejects it', async () => {
  const db = database();
  addThread(db, 'T');
  addRun(db, 'T', 'run-1', 1, 'completed');
  addMessage(db, 'a1', 'run-1', '', 0);
  assert.deepEqual(await running(db), { handle: HANDLE, text: '' });
});

const ISSUE = ['auth', 'session', 'issue', '--base-dir', '/home/u/.t3', '--ttl', '30d', '--label', 'lets-delegate', '--token-only'];

test('a missing token is issued with the t3 CLI and stored private', async () => {
  const io = fakeIo({ env: {}, results: [{ stdout: 'fresh-token\n', stderr: '', code: 0 }] });
  assert.equal(await readToken(io), 'fresh-token');
  assert.deepEqual(io.calls.map(([cmd, args]) => [cmd, args]), [['t3', ISSUE]]);
  assert.equal(io.files.get(TOKEN), 'fresh-token');
  assert.equal(io.modes.get(TOKEN), 0o600);
  assert.equal(io.modes.get('/home/u/.config/lets'), 0o700);
});
test('a stored token is used as it is', async () => {
  const io = fakeIo({ env: {}, files: { [TOKEN]: 'stored\n' } });
  assert.equal(await readToken(io), 'stored');
  assert.equal(io.calls.length, 0);
});

const XDG_TOKEN = '/cfg/lets/t3-token';

test('with XDG_CONFIG_HOME set, the token stored under it is used', async () => {
  const io = fakeIo({ env: { XDG_CONFIG_HOME: '/cfg' }, files: { [XDG_TOKEN]: 'stored\n' } });
  assert.equal(await readToken(io), 'stored');
  assert.equal(io.calls.length, 0);
});

test('with XDG_CONFIG_HOME set, a fresh token is stored under it', async () => {
  const io = fakeIo({ env: { XDG_CONFIG_HOME: '/cfg' }, results: [{ stdout: 'fresh-token\n', stderr: '', code: 0 }] });
  await readToken(io);
  assert.equal(io.files.get(XDG_TOKEN), 'fresh-token');
});

test('an empty XDG_CONFIG_HOME means the token under ~/.config', async () => {
  const io = fakeIo({ env: { XDG_CONFIG_HOME: '' }, files: { [TOKEN]: 'stored\n' } });
  assert.equal(await readToken(io), 'stored');
  assert.equal(io.calls.length, 0);
});

test('with XDG_CONFIG_HOME set, a token only under ~/.config is replaced by a fresh one under XDG_CONFIG_HOME', async () => {
  const io = fakeIo({ env: { XDG_CONFIG_HOME: '/cfg' }, files: { [TOKEN]: 'old\n' }, results: [{ stdout: 'fresh-token\n', stderr: '', code: 0 }] });
  assert.equal(await readToken(io), 'fresh-token');
  assert.equal(io.files.get(XDG_TOKEN), 'fresh-token');
});

test('dispatch sends one request frame and returns the success value', async () => {
  const log: Log = [];
  const fetches: [string, RequestInit | undefined][] = [];
  const io = fakeIo({ env: {}, fetch: fakeFetch([200], fetches), WebSocket: fakeWebSocket(SUCCESS, log) });
  const command = { type: 'thread.archive', commandId: 'C', threadId: 'T' };
  assert.deepEqual(await dispatch(io, { origin: ORIGIN, token: 'tok' }, command), { sequence: 9 });
  assert.deepEqual(fetches, [[`${ORIGIN}/api/auth/websocket-ticket`, { method: 'POST', headers: { authorization: 'Bearer tok' } }]]);
  assert.deepEqual(log, [
    ['open', 'ws://127.0.0.1:3773/ws?wsTicket=TICKET&orchestrationProtocol=2'],
    ['send', { _tag: 'Request', id: '1', tag: 'orchestration.dispatchCommand', payload: command, headers: [] }],
  ]);
});
test('launch sends one launchThread request and returns the thread t3 names', async () => {
  const log: Log = [];
  const io = fakeIo({ env: {}, fetch: fakeFetch([200], []), WebSocket: fakeWebSocket(LAUNCHED, log) });
  const input = buildLaunch({ threadId: 'T', projectId: 'P', title: 't', text: 'x', modelSelection: { instanceId: 'codex', model: 'm', options: [] }, interactionMode: 'plan', branch: null });
  assert.deepEqual(await launch(io, { origin: ORIGIN, token: 'tok' }, input), { threadId: 'T' });
  assert.deepEqual(log[1], ['send', { _tag: 'Request', id: '1', tag: 'orchestration.launchThread', payload: input, headers: [] }]);
});
test('dispatch re-issues a rejected token once', async () => {
  const fetches: [string, RequestInit | undefined][] = [];
  const io = fakeIo({ env: {}, results: [{ stdout: 'new\n', stderr: '', code: 0 }], fetch: fakeFetch([401, 200], fetches), WebSocket: fakeWebSocket(SUCCESS, []) });
  assert.deepEqual(await dispatch(io, { origin: ORIGIN, token: 'old' }, { type: 'x' }), { sequence: 9 });
  assert.equal(io.calls.length, 1);
  assert.equal((fetches[1][1]!.headers as Record<string, string>).authorization, 'Bearer new');
});
test('dispatch fails when the token is rejected twice', async () => {
  const io = fakeIo({ env: {}, results: [{ stdout: 'new\n', stderr: '', code: 0 }], fetch: fakeFetch([401, 403], []), WebSocket: fakeWebSocket(SUCCESS, []) });
  await assert.rejects(dispatch(io, { origin: ORIGIN, token: 'old' }, { type: 'x' }), (error) =>
    error instanceof Refused && error.message === 't3 rejected the token twice');
});
test('dispatch is refused on a Defect', async () => {
  const io = fakeIo({ env: {}, fetch: fakeFetch([200], []), WebSocket: fakeWebSocket({ _tag: 'Defect', defect: 'boom' }, []) });
  await assert.rejects(dispatch(io, { origin: ORIGIN, token: 'tok' }, { type: 'x' }), Refused);
});
test('dispatch is refused when t3 answers with a failure', async () => {
  const failure = { _tag: 'Exit', requestId: '1', exit: { _tag: 'Failure', cause: 'no such model' } };
  const io = fakeIo({ env: {}, fetch: fakeFetch([200], []), WebSocket: fakeWebSocket(failure, []) });
  await assert.rejects(dispatch(io, { origin: ORIGIN, token: 'tok' }, { type: 'x' }), (error) => error instanceof Refused && /no such model/.test(error.message));
});
test('dispatch is refused when the ticket request fails', async () => {
  const io = fakeIo({ env: {}, fetch: fakeFetch([500], []), WebSocket: fakeWebSocket(SUCCESS, []) });
  await assert.rejects(dispatch(io, { origin: ORIGIN, token: 'tok' }, { type: 'x' }), (error) => error instanceof Refused && /HTTP 500/.test(error.message));
});
test('dispatch is refused when t3 is unreachable', async () => {
  const fetch = (async () => {
    throw Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
  }) as unknown as typeof globalThis.fetch;
  await assert.rejects(dispatch(fakeIo({ env: {}, fetch }), { origin: ORIGIN, token: 'tok' }, { type: 'x' }),
    (error) => error instanceof Refused && /unreachable \(ECONNREFUSED\)/.test(error.message));
});

// A WebSocket that opens and never answers.
function silentWebSocket(): typeof WebSocket {
  return class {
    listeners: Record<string, ((event: unknown) => void)[]> = {};
    constructor() {
      queueMicrotask(() => this.emit('open', {}));
    }
    addEventListener(type: string, listener: (event: unknown) => void) {
      (this.listeners[type] ??= []).push(listener);
    }
    emit(type: string, event: unknown) {
      for (const listener of this.listeners[type] ?? []) listener(event);
    }
    send() {}
    close() {}
  } as unknown as typeof WebSocket;
}

test('no reply from t3 is an unknown outcome, not a refusal', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const io = fakeIo({ env: {}, fetch: fakeFetch([200], []), WebSocket: silentWebSocket() });
  const pending = dispatch(io, { origin: ORIGIN, token: 'tok' }, { type: 'x', threadId: 'T' });
  // Let the ticket request and the socket's open run before time moves on.
  for (let i = 0; i < 10; i++) await Promise.resolve();
  t.mock.timers.tick(120_000);
  await assert.rejects(pending, (error) => error instanceof SpawnError && !(error instanceof Refused) && /no reply from t3/.test(error.message));
});

// A WebSocket that t3 refuses: it fails and closes without opening.
function refusedWebSocket(): typeof WebSocket {
  return class {
    listeners: Record<string, ((event: unknown) => void)[]> = {};
    constructor() {
      queueMicrotask(() => {
        this.emit('error', { type: 'error', message: '' });
        this.emit('close', { code: 1006, reason: '' });
      });
    }
    addEventListener(type: string, listener: (event: unknown) => void) {
      (this.listeners[type] ??= []).push(listener);
    }
    emit(type: string, event: unknown) {
      for (const listener of this.listeners[type] ?? []) listener(event);
    }
    send() {}
    close() {}
  } as unknown as typeof WebSocket;
}

test('a refused WebSocket is reported with t3\'s own reason', async () => {
  const fetches: string[] = [];
  const fetch = (async (url: string) => {
    fetches.push(url);
    if (url.endsWith('/ws')) {
      return { status: 426, ok: false, json: async () => ({ code: 'orchestration_protocol_incompatible', message: 'Update this client to one that supports orchestration protocol 2.' }) };
    }
    return { status: 200, ok: true, json: async () => ({ ticket: 'TICKET' }) };
  }) as unknown as typeof globalThis.fetch;
  const io = fakeIo({ env: {}, fetch, WebSocket: refusedWebSocket() });
  await assert.rejects(dispatch(io, { origin: ORIGIN, token: 'tok' }, { type: 'x' }), (error) =>
    error instanceof Refused
    && error.message.startsWith('t3 refused the WebSocket connection: Update this client to one that supports orchestration protocol 2.')
    && error.message.includes('After a t3 update'));
  assert.deepEqual(fetches, [`${ORIGIN}/api/auth/websocket-ticket`, `${ORIGIN}/ws`]);
});

test('a refused WebSocket with no reason to read still says it was refused', async () => {
  const fetch = (async (url: string) => {
    if (url.endsWith('/ws')) throw new Error('connection reset');
    return { status: 200, ok: true, json: async () => ({ ticket: 'TICKET' }) };
  }) as unknown as typeof globalThis.fetch;
  const io = fakeIo({ env: {}, fetch, WebSocket: refusedWebSocket() });
  await assert.rejects(dispatch(io, { origin: ORIGIN, token: 'tok' }, { type: 'x' }), /^Error: t3 refused the WebSocket connection: it gave no reason/);
});

// A fetch that never answers, and rejects when its signal aborts, as a real
// fetch does. Each request is logged with its signal.
function hangingFetch(log: [string, AbortSignal | undefined][], answer: (url: string) => unknown = () => undefined): typeof fetch {
  return ((url: string, init?: RequestInit) => {
    log.push([url, init?.signal ?? undefined]);
    const answered = answer(url);
    if (answered !== undefined) return Promise.resolve(answered);
    return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  }) as unknown as typeof fetch;
}
const TICKET = { status: 200, ok: true, json: async () => ({ ticket: 'TICKET' }) };
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const catalogueRpc = { tag: 'server.getConfig', payload: {}, threadId: undefined };

test('a request past its deadline stops waiting for the reply, naming no thread', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const io = fakeIo({ env: {}, fetch: fakeFetch([200], []), WebSocket: silentWebSocket() });
  const pending = request(io, { origin: ORIGIN, token: 'tok' }, catalogueRpc, 10_000);
  await settle();
  t.mock.timers.tick(10_000);
  await assert.rejects(pending, (error) => error instanceof Error && /no reply from t3 after 10 s$/.test(error.message));
});

test('a request with a deadline waits for the reply only the time left', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let settled = false;
  const io = fakeIo({ env: {}, fetch: fakeFetch([200], []), WebSocket: silentWebSocket() });
  t.mock.timers.tick(4_000);
  const pending = request(io, { origin: ORIGIN, token: 'tok' }, catalogueRpc, 10_000).finally(() => {
    settled = true;
  });
  pending.catch(() => {});
  await settle();
  t.mock.timers.tick(5_999);
  await settle();
  assert.equal(settled, false);
  t.mock.timers.tick(1);
  await assert.rejects(pending, /no reply from t3 after 6 s/);
});

test('a request past its deadline aborts a ticket fetch that never answers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const fetches: [string, AbortSignal | undefined][] = [];
  const io = fakeIo({ env: {}, fetch: hangingFetch(fetches), WebSocket: silentWebSocket() });
  const pending = request(io, { origin: ORIGIN, token: 'tok' }, catalogueRpc, 10_000);
  await settle();
  t.mock.timers.tick(10_000);
  await assert.rejects(pending, (error) => error instanceof Refused && /did not answer in time/.test(error.message));
  assert.equal(fetches[0][1]?.aborted, true);
});

test('a request past its deadline aborts the fetch that asks why t3 refused the socket', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const fetches: [string, AbortSignal | undefined][] = [];
  const fetch = hangingFetch(fetches, (url) => (url.endsWith('/ws') ? undefined : TICKET));
  const io = fakeIo({ env: {}, fetch, WebSocket: refusedWebSocket() });
  const pending = request(io, { origin: ORIGIN, token: 'tok' }, catalogueRpc, 10_000);
  pending.catch(() => {});
  await settle();
  t.mock.timers.tick(10_000);
  await settle();
  assert.deepEqual(fetches.map(([url, signal]) => [url, signal?.aborted]), [[`${ORIGIN}/api/auth/websocket-ticket`, true], [`${ORIGIN}/ws`, true]]);
});

// A WebSocket that never opens, and fails and closes when it is closed.
function connectingWebSocket(): typeof WebSocket {
  return class {
    listeners: Record<string, ((event: unknown) => void)[]> = {};
    addEventListener(type: string, listener: (event: unknown) => void) {
      (this.listeners[type] ??= []).push(listener);
    }
    emit(type: string, event: unknown) {
      for (const listener of this.listeners[type] ?? []) listener(event);
    }
    send() {}
    close() {
      this.emit('error', { type: 'error', message: '' });
      this.emit('close', { code: 1006, reason: '' });
    }
  } as unknown as typeof WebSocket;
}

test('closing a connecting socket at the deadline asks t3 for no refusal', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const fetches: [string, AbortSignal | undefined][] = [];
  const io = fakeIo({ env: {}, fetch: hangingFetch(fetches, () => TICKET), WebSocket: connectingWebSocket() });
  const pending = request(io, { origin: ORIGIN, token: 'tok' }, catalogueRpc, 10_000);
  await settle();
  t.mock.timers.tick(10_000);
  await assert.rejects(pending, /no reply from t3/);
  await settle();
  assert.deepEqual(fetches.map(([url]) => url), [`${ORIGIN}/api/auth/websocket-ticket`]);
});

test('a request past its deadline names the thread to check', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const io = fakeIo({ env: {}, fetch: fakeFetch([200], []), WebSocket: silentWebSocket() });
  const pending = request(io, { origin: ORIGIN, token: 'tok' }, { tag: 'x', payload: {}, threadId: 'T' }, 10_000);
  await settle();
  t.mock.timers.tick(10_000);
  await assert.rejects(pending, /no reply from t3 after 10 s; check T before running again/);
});

const CONFIG = { providers: [provider('codex', [slug('gpt-6-luna')])] };
const configured = (value: unknown) => ({ _tag: 'Exit', requestId: '1', exit: { _tag: 'Success', value } });

test('readCatalogue asks T3 for server.getConfig, and reads its reply', async () => {
  const log: Log = [];
  const io = fakeIo({ env: {}, files: { [TOKEN]: 'tok' }, fetch: fakeFetch([200], []), WebSocket: fakeWebSocket(configured(CONFIG), log) });
  assert.deepEqual(await readCatalogue(io, ORIGIN), catalogueOf(CONFIG));
  assert.deepEqual(log[1], ['send', { _tag: 'Request', id: '1', tag: 'server.getConfig', payload: {}, headers: [] }]);
});

test('readCatalogue gives issuing a token the time left of its 10 s', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const timeouts: (number | undefined)[] = [];
  const io = fakeIo({
    env: {},
    results: [(_cmd, _args, opts) => {
      timeouts.push(opts.timeoutMs);
      return { stdout: 'fresh\n', stderr: '', code: 0 };
    }],
    fetch: fakeFetch([200], []),
    WebSocket: fakeWebSocket(configured(CONFIG), []),
  });
  await readCatalogue(io, ORIGIN);
  assert.deepEqual(timeouts, [10_000]);
});

test('readCatalogue refuses 10 s after it starts asking', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const io = fakeIo({ env: {}, files: { [TOKEN]: 'tok' }, fetch: fakeFetch([200], []), WebSocket: silentWebSocket() });
  const pending = readCatalogue(io, ORIGIN);
  await settle();
  t.mock.timers.tick(10_000);
  await assert.rejects(pending, (error) => error instanceof Refused && /^T3 gave no model catalogue: no reply from t3 after 10 s$/.test(error.message));
});

test('readCatalogue keeps T3\'s own reason for refusing', async () => {
  const fetch = (async (url: string) => (url.endsWith('/ws')
    ? { status: 426, ok: false, json: async () => ({ message: 'unsupported orchestration protocol' }) }
    : TICKET)) as unknown as typeof globalThis.fetch;
  const io = fakeIo({ env: {}, files: { [TOKEN]: 'tok' }, fetch, WebSocket: refusedWebSocket() });
  await assert.rejects(readCatalogue(io, ORIGIN), (error) => error instanceof Refused
    && error.message.startsWith('T3 gave no model catalogue: t3 refused the WebSocket connection: unsupported orchestration protocol'));
});

test('readCatalogue refuses a reply of another shape', async () => {
  const io = fakeIo({ env: {}, files: { [TOKEN]: 'tok' }, fetch: fakeFetch([200], []), WebSocket: fakeWebSocket(configured({ instances: [] }), []) });
  await assert.rejects(readCatalogue(io, ORIGIN), (error) => error instanceof Refused && error.message === 'T3 gave no model catalogue: the reply has no list of providers');
});

test('readCatalogue refuses on an error of any class', async () => {
  // The fake's WebSocket throws a plain Error.
  const io = fakeIo({ env: {}, files: { [TOKEN]: 'tok' }, fetch: fakeFetch([200], []) });
  await assert.rejects(readCatalogue(io, ORIGIN), (error) => error instanceof Refused && error.message === 'T3 gave no model catalogue: no network in this fake');
});

test('finish archives the thread on ok and leaves it otherwise', async () => {
  const log: Log = [];
  const io = fakeIo({ env: {}, files: RUNNING, fetch: fakeFetch([200], []), WebSocket: fakeWebSocket(SUCCESS, log) });
  const adapter = createAdapter(io);
  await adapter.finish(HANDLE, false, { cwd: '/r' });
  assert.deepEqual(log, []);
  await adapter.finish(HANDLE, true, { cwd: '/r' });
  const frame = log[1][1] as { payload: { type: string; threadId: string } };
  assert.equal(frame.payload.type, 'thread.archive');
  assert.equal(frame.payload.threadId, 'T');
});

test('finish sends the token to the running server, never to an origin the handle names', async () => {
  const fetches: [string, RequestInit | undefined][] = [];
  const io = fakeIo({ env: {}, files: RUNNING, fetch: fakeFetch([200], fetches), WebSocket: fakeWebSocket(SUCCESS, []) });
  await createAdapter(io).finish({ ...HANDLE, origin: 'http://evil.example' }, true, { cwd: '/r' });
  assert.equal(fetches[0][0], `${ORIGIN}/api/auth/websocket-ticket`);
});

test('finish is refused when t3 is not running', async () => {
  await assert.rejects(createAdapter(fakeIo({ env: {} })).finish(HANDLE, true, { cwd: '/r' }), (error) => error instanceof Refused && /not running/.test(error.message));
});

const runInput: RunInput = { name: 'x-plan-review', prompt: 'PROMPT', cwd: '/r/sub', family: 'gpt', model: 'gpt-6.1-sol', effort: 'high' };

test('run launches a plan-mode thread in the project for this repo, and the handle holds no token', async () => {
  const db = database();
  addProject(db, { root: '/r' });
  const log: Log = [];
  const io = fakeIo({
    env: {},
    files: RUNNING,
    results: [{ stdout: '/r/.git\n', stderr: '', code: 0 }, { stdout: 'main\n', stderr: '', code: 0 }],
    openDb: () => shared(db),
    fetch: fakeFetch([200], []),
    WebSocket: fakeWebSocket(LAUNCHED, log),
  });
  addRun(db, 'T', 'run-1', 1, 'completed');
  addMessage(db, 'a1', 'run-1', 'FINDINGS', 0);
  const { handle } = await createAdapter(io).run(runInput, { timeoutMs: 60000 });
  assert.deepEqual(io.calls.map(([cmd, args]) => [cmd, args]), [
    ['git', ['-C', '/r/sub', 'rev-parse', '--path-format=absolute', '--git-common-dir']],
    ['git', ['-C', '/r/sub', 'branch', '--show-current']],
  ]);
  const frame = log[1][1] as { tag: string; payload: ReturnType<typeof buildLaunch> };
  assert.equal(frame.tag, 'orchestration.launchThread');
  // The handle names the thread t3 answered with, and holds no token.
  assert.deepEqual(handle, { kind: 'thread', id: 'T', origin: ORIGIN });
  assert.match(frame.payload.threadId, /^[0-9a-f-]{36}$/);
  assert.equal(frame.payload.interactionMode, 'plan');
  assert.equal(frame.payload.projectId, 'p1');
  assert.deepEqual(frame.payload.workspaceStrategy, { type: 'root', branch: 'main' });
  assert.equal(frame.payload.title, 'x-plan-review');
  assert.equal(frame.payload.initialMessage.text, 'PROMPT');
  assert.deepEqual(frame.payload.modelSelection, { instanceId: 'codex', model: 'gpt-6.1-sol', options: [{ id: 'reasoningEffort', value: 'high' }] });
});

test('run fails with the add hint when t3 does not know the repo', async () => {
  const db = database();
  addProject(db, { title: 'other', root: '/o' });
  const io = fakeIo({
    env: {},
    files: RUNNING,
    results: [{ stdout: '/r/.git\n', stderr: '', code: 0 }],
    openDb: () => shared(db),
  });
  await assert.rejects(createAdapter(io).run({ ...runInput, cwd: '/r' }, { timeoutMs: 60000 }), (error) => error instanceof Refused && /t3 project add \/r; known: other/.test(error.message));
});

test('run is refused when git fails in the repository', async () => {
  const io = fakeIo({ env: {}, files: RUNNING, results: [{ stdout: '', stderr: 'fatal: not a git repository', code: 128 }] });
  await assert.rejects(createAdapter(io).run(runInput, { timeoutMs: 60000 }), (error) => error instanceof Refused && /not a git repository/.test(error.message));
});

test('run is refused when t3 is not running', async () => {
  await assert.rejects(createAdapter(fakeIo({ env: {} })).run(runInput, { timeoutMs: 60000 }), (error) => error instanceof Refused && /not running/.test(error.message));
});

// An io inside a running T3 with a project for /r, whose state is db. t3
// answers each request over the WebSocket with LAUNCHED, which names thread
// T, and logs it.
function launchingIo(db: DatabaseSync, log: Log, { projectDefault = null as string | null, sleep = async () => {}, statuses = [200, 200] } = {}) {
  addProject(db, { root: '/r', selection: projectDefault });
  return fakeIo({
    env: {},
    files: RUNNING,
    results: [{ stdout: '/r/.git\n', stderr: '', code: 0 }, { stdout: 'main\n', stderr: '', code: 0 }],
    openDb: () => shared(db),
    fetch: fakeFetch(statuses, []),
    WebSocket: fakeWebSocket(LAUNCHED, log),
    sleep,
  });
}
const launched = (log: Log) => (log[1][1] as { payload: ReturnType<typeof buildLaunch> }).payload;

const startInput: StartInput = { name: 'fix-login', prompt: 'PROMPT', cwd: '/r/sub', family: 'gpt', model: 'gpt-6-luna' };

// Start a session, and answer the model selection t3 was sent.
async function startedSelection(input: Partial<StartInput>, options: { projectDefault?: string | null } = {}) {
  const log: Log = [];
  await createAdapter(launchingIo(database(), log, options)).start!({ ...startInput, ...input });
  return launched(log).modelSelection;
}

test('start launches a default-mode thread, and returns its handle', async () => {
  const log: Log = [];
  const handle = await createAdapter(launchingIo(database(), log)).start!(startInput);
  assert.deepEqual(handle, { kind: 'thread', id: 'T', origin: ORIGIN });
  assert.equal(launched(log).interactionMode, 'default');
  assert.equal(launched(log).title, 'fix-login');
});

test('a start runs the request\'s model, not the project default, with no effort option', async () => {
  const selection = await startedSelection({ family: 'gpt', model: 'gpt-6-luna' },
    { projectDefault: '{"instanceId":"claudeAgent","model":"claude-opus-5-5","options":[]}' });
  assert.deepEqual(selection, { instanceId: 'codex', model: 'gpt-6-luna', options: [] });
});

test('a gemini start sends the model as given, with no effort option', async () => {
  assert.deepEqual(await startedSelection({ family: 'gemini', model: 'gemini-3.8-flash' }),
    { instanceId: 'antigravity', model: 'gemini-3.8-flash', options: [] });
});
