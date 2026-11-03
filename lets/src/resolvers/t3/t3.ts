// Inside T3 Code: each session is a new thread in the sidebar. The thread is
// created the way the desktop UI does it, with one `orchestration.launchThread`
// request over the server's WebSocket RPC, which makes the thread and sends
// the first message. The result is read back from t3's state database.
//
// This speaks orchestration protocol 2, read on 2026-10-17 from the t3code
// 0.1.0 server bundle (apps/server/dist/binCli-*.mjs) and its web client.
// Protocol types live in packages/contracts/src/orchestrationV2.ts of
// https://github.com/pingdotgg/t3code. A t3 update can change any of this;
// run the smoke test in the README after each one.
//
// What is private here, and why it stays:
// - The WebSocket RPC and the `launchThread` and `thread.archive` calls are
//   the UI's own, so they move only when the UI does.
// - `server.getConfig` is the request the UI makes to fill its model
//   picker, so it lists the models the composer offers. T3's
//   model-manifest.json is not that list.
// - t3's CLI has no thread commands. Its MCP tools reach only the agent
//   process t3 started, not a child like this one. The `acp-mcp-call`
//   terminal fallback exists only where t3 sets `T3_ACP_MCP_NODE`, which it
//   does for ACP agents and not for Claude Code.
// - The state database (userdata/statev2.sqlite) is the only place to read a
//   finished run without holding a subscription open.
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { configDir } from '../../config-dir.ts';
import { exitCodeOf, Refused, SessionFailed, SpawnError } from '../kit/errors.ts';
import { withoutEffort } from '../kit/families.ts';
import type { Adapter, RunInput, StartInput } from '../kit/adapter.ts';
import type { Db, Io } from '../kit/io.ts';
import type { Handle, ModelString } from '../kit/adapter.ts';
import { FAMILIES } from '../kit/families.ts';
import type { Effort, Family } from '../kit/families.ts';
import { pollUntil } from '../kit/wait.ts';

// The protocol this adapter speaks. t3 refuses a WebSocket that names another.
export const ORCHESTRATION_PROTOCOL = 2;

const POLL_MS = 5000;
const REPLY_TIMEOUT_MS = 120_000;
// The whole catalogue request, from the token to the reply.
const CATALOGUE_TIMEOUT_MS = 10_000;

// The t3 provider instance for each family.
export const T3_INSTANCE: Record<Family, string> = { gpt: 'codex', claude: 'claudeAgent', gemini: 'antigravity' };
// Each t3 provider names its effort option differently. Gemini has none.
const T3_EFFORT_OPTION: Record<Family, string | null> = { gpt: 'reasoningEffort', claude: 'effort', gemini: null };

export type ModelSelection = { instanceId: string; model: string | null; options: { id: string; value: string }[] };
type Project = { project_id: string; title: string; workspace_root: string };

// The composer's model catalogue, as `server.getConfig` gives it: each
// provider instance with its models, and the slugs the user hid, by instance.
export type CatalogueModel = { slug: string; isDefault: boolean; isCustom: boolean };
export type CatalogueInstance = { instanceId: string; enabled: boolean; status: string; availability: string | null; models: CatalogueModel[] };
export type Catalogue = { instances: CatalogueInstance[]; hidden: Record<string, string[]> };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

// The reply is untrusted data from a private protocol, so this keeps only
// what the next steps can use. An id that is empty or holds white space is
// one T3 and parseModel both reject.
export function catalogueOf(value: unknown): Catalogue {
  if (!isObject(value)) throw new Error('the reply is not an object');
  if (!Array.isArray(value.providers)) throw new Error('the reply has no list of providers');
  const instances: CatalogueInstance[] = [];
  for (const entry of value.providers) {
    if (!isObject(entry)) continue;
    const { instanceId, enabled, status, availability, models } = entry;
    if (typeof instanceId !== 'string' || typeof enabled !== 'boolean' || typeof status !== 'string' || !Array.isArray(models)) continue;
    const id = (slug: string) => (instanceId === T3_INSTANCE.gemini ? withoutEffort(slug) : slug);
    instances.push({
      instanceId,
      enabled,
      status,
      availability: typeof availability === 'string' ? availability : null,
      models: models
        .filter((model): model is Record<string, unknown> & { slug: string } => isObject(model) && typeof model.slug === 'string')
        .filter(({ slug }) => id(slug) !== '' && !/\s/.test(id(slug)))
        .map(({ slug, isDefault, isCustom }) => ({ slug, isDefault: isDefault === true, isCustom: isCustom === true })),
    });
  }
  const hidden: Record<string, string[]> = {};
  const preferences = isObject(value.settings) && isObject(value.settings.providerModelPreferences) ? value.settings.providerModelPreferences : {};
  for (const [instanceId, preference] of Object.entries(preferences)) {
    if (isObject(preference) && Array.isArray(preference.hiddenModels)) {
      hidden[instanceId] = preference.hiddenModels.filter((slug): slug is string => typeof slug === 'string');
    }
  }
  return { instances, hidden };
}

const familyOf = (instanceId: string) => FAMILIES.find((family) => T3_INSTANCE[family] === instanceId);

// An instance t3 can run models on. A run always goes to T3_INSTANCE's
// instance, so a second one, such as codex_work, would run on the wrong
// instance. `warning` is an instance T3 has not checked yet.
function listable(instance: CatalogueInstance): boolean {
  return instance.enabled && (instance.status === 'ready' || instance.status === 'warning')
    && instance.availability !== 'unavailable' && familyOf(instance.instanceId) !== undefined;
}

// The models the composer offers for the instance, the visible default
// first. As in the composer, hiding never removes a custom model.
function visibleModels(instance: CatalogueInstance, catalogue: Catalogue): CatalogueModel[] {
  const hidden = new Set(catalogue.hidden[instance.instanceId] ?? []);
  const visible = instance.models.filter((model) => model.isCustom || !hidden.has(model.slug));
  const index = visible.findIndex((model) => model.isDefault);
  return index === -1 ? visible : [visible[index], ...visible.filter((_, i) => i !== index)];
}

// The id t3 sends: a gemini slug still names an effort, which t3 no longer
// accepts in the id.
const modelId = (family: Family, slug: string) => (family === 'gemini' ? withoutEffort(slug) : slug);

// The models t3 can run, as <family>/<model>, in the catalogue's order.
// Each gemini model appears once.
export function optionsFromCatalogue(catalogue: Catalogue): ModelString[] {
  const options = new Set<ModelString>();
  for (const instance of catalogue.instances.filter(listable)) {
    const family = familyOf(instance.instanceId)!;
    for (const { slug } of visibleModels(instance, catalogue)) options.add(`${family}/${modelId(family, slug)}`);
  }
  return [...options];
}

// The model a bare family runs: the visible default, or else the first
// visible model, as T3 itself picks. Null when t3 does not list the
// family's instance, or it has no visible model.
export function defaultModel(catalogue: Catalogue, family: Family): string | null {
  const instance = catalogue.instances.find((entry) => entry.instanceId === T3_INSTANCE[family]);
  if (instance === undefined || !listable(instance)) return null;
  const [first] = visibleModels(instance, catalogue);
  return first === undefined ? null : modelId(family, first.slug);
}

// The model goes as given. A null effort is a start's, and sends no effort option.
export function t3ModelSelection({ family, model, effort }: { family: Family; model: string | null; effort: Effort | null }): ModelSelection {
  const option = T3_EFFORT_OPTION[family];
  return { instanceId: T3_INSTANCE[family], model, options: option && effort !== null ? [{ id: option, value: effort }] : [] };
}

export function baseDir(env: Io['env'], homedir: string): string {
  return env.T3CODE_HOME ?? `${homedir}/.t3`;
}

const userdata = (io: Io) => `${baseDir(io.env, io.homedir())}/userdata`;

// The running server's origin and pid, or null when there is no runtime file.
export function readRuntime(io: Io): { origin: string; pid: number } | null {
  const path = `${userdata(io)}/server-runtime.json`;
  if (!io.exists(path)) return null;
  try {
    const { origin, pid } = JSON.parse(io.readFile(path));
    return { origin, pid };
  } catch {
    return null;
  }
}

// True when ancestorPid is this process or one of its parents.
export function isAncestor(io: Io, ancestorPid: number): boolean {
  let pid: number | null = io.pid;
  // The bound guards against a cycle in a bad parent map.
  for (let hops = 0; pid !== null && pid > 0 && hops < 4096; hops++) {
    if (pid === ancestorPid) return true;
    pid = io.parentPid(pid);
  }
  return false;
}

export function findProject(db: Db, repoRoot: string): Project {
  const projects = db.prepare(
    'select project_id, title, workspace_root from projection_projects where deleted_at is null',
  ).all() as Project[];
  const project = projects.find((p) => p.workspace_root === repoRoot);
  if (!project) {
    throw new Refused(`t3 has no project for ${repoRoot}; run: t3 project add ${repoRoot}; known: ${projects.map((p) => p.title).join(', ')}`);
  }
  return { ...project };
}

type LaunchInput = {
  threadId: string; projectId: string; title: string; text: string; modelSelection: ModelSelection;
  interactionMode: 'plan' | 'default'; branch: string | null; messageId?: string; commandId?: string;
};

// The `orchestration.launchThread` request, as the UI sends it for a new
// thread: the thread's settings, a root workspace on the current branch, and
// the first message. The title is a seed; t3 generates a durable one from
// the message. messageId and commandId are random unless given, so tests
// can fix them.
export function buildLaunch({
  threadId, projectId, title, text, modelSelection, interactionMode, branch, messageId = randomUUID(), commandId = randomUUID(),
}: LaunchInput) {
  return {
    commandId,
    creationSource: 'web',
    threadId,
    projectId,
    title,
    generateTitle: true,
    modelSelection,
    runtimeMode: 'full-access',
    interactionMode,
    workspaceStrategy: { type: 'root', ...(branch === null ? {} : { branch }) },
    initialMessage: { messageId, text, attachments: [] },
  };
}

// A run is one user message and the work it starts. These are t3's statuses.
export type Run = { id: string; status: string; pendingRequests: number; failure: string | null };

// The thread's newest run, with whether it has stopped to ask and, when it
// failed, why.
export function readRun(db: Db, threadId: string): Run | null {
  const run = db.prepare(`
    select run_id, status from orchestration_v2_projection_runs
    where thread_id = ? order by ordinal desc limit 1`).get(threadId) as { run_id: string; status: string } | undefined;
  if (!run) return null;
  const { pending } = db.prepare(`
    select count(*) as pending from orchestration_v2_projection_runtime_requests
    where thread_id = ? and status = 'pending'`).get(threadId) as { pending: number };
  // A failed run leaves an error item; its failure says what went wrong.
  const error = db.prepare(`
    select payload_json from orchestration_v2_projection_turn_items
    where run_id = ? and type = 'error' and status = 'failed'
    order by updated_at desc, ordinal desc limit 1`).get(run.run_id) as { payload_json: string } | undefined;
  let failure: string | null = null;
  if (error) {
    try {
      const { message } = (JSON.parse(error.payload_json) as { failure?: { message?: unknown } }).failure ?? {};
      failure = typeof message === 'string' ? message : null;
    } catch {
      failure = null;
    }
  }
  return { id: run.run_id, status: run.status, pendingRequests: pending, failure };
}

// The run's newest assistant message, or null when it has none yet.
export function readFinalMessage(db: Db, runId: string): { text: string; streaming: boolean } | null {
  const row = db.prepare(`
    select payload_json, streaming from orchestration_v2_projection_messages
    where run_id = ? and role = 'assistant'
    order by created_at desc, rowid desc limit 1`).get(runId) as { payload_json: string; streaming: number } | undefined;
  if (!row) return null;
  const { text } = JSON.parse(row.payload_json) as { text?: unknown };
  return { text: typeof text === 'string' ? text : '', streaming: row.streaming === 1 };
}

// t3-token in the lets config folder, beside lets's config.yaml.
const tokenPath = (io: Io) => join(configDir(io.env, io.homedir()), 't3-token');

// Issue a token with the server's own CLI, so it lands in the same auth store.
async function issueToken(io: Io, timeoutMs?: number): Promise<string> {
  const args = ['auth', 'session', 'issue', '--base-dir', baseDir(io.env, io.homedir()), '--ttl', '30d', '--label', 'lets-delegate', '--token-only'];
  const { stdout, stderr, code } = await io.execFile('t3', args, { env: io.env, ...(timeoutMs === undefined ? {} : { timeoutMs }) });
  const token = stdout.trim();
  if (code !== 0 || !/^\S+$/.test(token)) throw new Refused(`could not issue a t3 token (exit ${code}): ${stderr.trim()}`);
  const path = tokenPath(io);
  io.mkdirp(dirname(path), { mode: 0o700 });
  io.writeFile(path, token, { mode: 0o600 });
  return token;
}

// The stored token, or a fresh one when none is stored.
export async function readToken(io: Io, timeoutMs?: number): Promise<string> {
  const path = tokenPath(io);
  return io.exists(path) ? io.readFile(path).trim() : issueToken(io, timeoutMs);
}

async function requestTicket(io: Io, origin: string, token: string, signal?: AbortSignal): Promise<Response> {
  try {
    return await io.fetch(`${origin}/api/auth/websocket-ticket`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, ...(signal ? { signal } : {}) });
  } catch (error) {
    if (signal?.aborted) throw new Refused(`t3 at ${origin} did not answer in time`);
    const { cause, message } = error as Error & { cause?: { code?: string } };
    throw new Refused(`t3 at ${origin} is unreachable (${cause?.code ?? message})`);
  }
}

const rejected = (response: Response) => response.status === 401 || response.status === 403;

type Frame = { _tag: string; requestId?: string; exit?: { _tag: string; value?: unknown } };

// Why t3 refused a WebSocket upgrade. t3 answers a plain GET of /ws with
// JSON whose message says why, such as a protocol it no longer speaks.
export async function refusal(io: Io, origin: string, signal?: AbortSignal): Promise<string> {
  let why = 'it gave no reason';
  try {
    const response = await io.fetch(`${origin}/ws`, ...(signal ? [{ signal }] : []));
    const { message } = await response.json() as { message?: unknown };
    why = typeof message === 'string' ? message : `HTTP ${response.status}`;
  } catch {
    // Keep the default reason.
  }
  return `t3 refused the WebSocket connection: ${why} A t3 update may have changed its protocol; see "After a t3 update" in the lets-spec README.`;
}

type Server = { origin: string; token: string };
type Rpc = { tag: string; payload: Record<string, unknown>; threadId: string | undefined };

// One request over the WebSocket RPC, as the UI makes it: a ticket for the
// token, then one Request frame, then its Exit. The result is the Exit's
// value. A deadline, in Date.now() time, stops every step when it passes, so
// no fetch is left open to keep the process alive.
export async function request(io: Io, { origin, token }: Server, { tag, payload, threadId }: Rpc, deadline?: number): Promise<unknown> {
  const left = () => (deadline === undefined ? Infinity : Math.max(0, deadline - Date.now()));
  const controller = deadline === undefined ? undefined : new AbortController();
  const abortTimer = controller && setTimeout(() => controller.abort(), left());
  let ws: WebSocket | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Set before the socket closes: closing one that is still connecting fires
  // error and close, which must not start a late refusal fetch.
  let settled = false;
  try {
    let response = await requestTicket(io, origin, token, controller?.signal);
    if (rejected(response)) {
      response = await requestTicket(io, origin, await issueToken(io, deadline === undefined ? undefined : left()), controller?.signal);
      if (rejected(response)) throw new Refused('t3 rejected the token twice');
    }
    if (!response.ok) throw new Refused(`t3 ticket request failed with HTTP ${response.status}: ${await response.text()}`);
    const { ticket } = await response.json() as { ticket: string };

    const url = new URL('/ws', origin.replace(/^http/, 'ws'));
    url.searchParams.set('wsTicket', ticket);
    url.searchParams.set('orchestrationProtocol', String(ORCHESTRATION_PROTOCOL));
    const socket = ws = new io.WebSocket(url);
    const exit = await new Promise<NonNullable<Frame['exit']>>((resolveExit, reject) => {
      const waitMs = Math.min(REPLY_TIMEOUT_MS, left());
      // A timeout means "unknown", not "failed": the server may still act on it.
      const check = threadId === undefined ? '' : `; check ${threadId} before running again`;
      timer = setTimeout(() => reject(new SpawnError(`no reply from t3 after ${Math.round(waitMs / 1000)} s${check}`)), waitMs);
      let opened = false;
      let refused = false;
      // Before the socket opens, an error or a close means t3 refused the
      // upgrade, and the WebSocket API hides why. Ask t3 itself, once. After
      // it opens, t3 may have acted on the request, so the outcome is unknown.
      const fail = (reason: string) => {
        if (settled) return;
        if (opened) return reject(new SpawnError(reason));
        if (refused) return;
        refused = true;
        refusal(io, origin, controller?.signal).then((why) => reject(new Refused(why)));
      };
      socket.addEventListener('open', () => {
        opened = true;
        socket.send(JSON.stringify({ _tag: 'Request', id: '1', tag, payload, headers: [] }));
      });
      socket.addEventListener('message', (event) => {
        for (const message of [JSON.parse(event.data as string) as Frame | Frame[]].flat()) {
          if (message._tag === 'Exit' && String(message.requestId) === '1') resolveExit(message.exit!);
          else if (message._tag === 'Defect' || message._tag === 'ClientProtocolError') reject(new Refused(`t3 rejected the request: ${JSON.stringify(message)}`));
        }
      });
      socket.addEventListener('error', (event) => fail(`t3 websocket error: ${(event as Event & { message?: string }).message || event.type}`));
      socket.addEventListener('close', (event) => fail(`t3 websocket closed: ${event.code} ${event.reason}`));
    });
    if (exit._tag !== 'Success') throw new Refused(`t3 ${tag} failed: ${JSON.stringify(exit)}`);
    return exit.value;
  } finally {
    settled = true;
    clearTimeout(timer);
    clearTimeout(abortTimer);
    controller?.abort();
    ws?.close();
  }
}

// The composer's model catalogue, within CATALOGUE_TIMEOUT_MS. Any failure,
// of any class, is a Refused with one known prefix, so the probe can warn
// and a bare family can try the next model.
export async function readCatalogue(io: Io, origin: string): Promise<Catalogue> {
  const deadline = Date.now() + CATALOGUE_TIMEOUT_MS;
  try {
    const token = await readToken(io, Math.max(0, deadline - Date.now()));
    return catalogueOf(await request(io, { origin, token }, { tag: 'server.getConfig', payload: {}, threadId: undefined }, deadline));
  } catch (error) {
    throw new Refused(`T3 gave no model catalogue: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Send one orchestration command, such as `thread.archive`.
export function dispatch(io: Io, server: Server, command: { threadId?: string; [field: string]: unknown }): Promise<unknown> {
  return request(io, server, { tag: 'orchestration.dispatchCommand', payload: command, threadId: command.threadId });
}

// Create a thread and send its first message. The answer names the thread.
export async function launch(io: Io, server: Server, input: ReturnType<typeof buildLaunch>): Promise<{ threadId: string }> {
  const result = await request(io, server, { tag: 'orchestration.launchThread', payload: input, threadId: input.threadId }) as { threadId?: unknown } | null;
  return { threadId: typeof result?.threadId === 'string' ? result.threadId : input.threadId };
}

export function createAdapter(io: Io): Adapter {
  const databasePath = () => `${userdata(io)}/statev2.sqlite`;

  // Open the database, run read(db), and close it again.
  function withDb<T>(read: (db: Db) => T): T {
    const db = io.openDb(databasePath());
    try {
      return read(db);
    } finally {
      db.close();
    }
  }

  async function git(cwd: string, args: string[]): Promise<string> {
    const { stdout, stderr, code } = await io.execFile('git', ['-C', cwd, ...args], { cwd });
    if (code !== 0) throw new Refused(`git ${args.join(' ')} failed in ${cwd}: ${stderr.trim()}`);
    return stdout.trim();
  }

  // The running server. finish sends the token only here, never to an
  // origin a handle names.
  function runningServer() {
    const runtime = readRuntime(io);
    if (runtime === null) throw new Refused(`t3 is not running (no ${userdata(io)}/server-runtime.json)`);
    return runtime;
  }

  // Launch a thread for the request. A read-only one is in plan mode; a null
  // effort is a start's, which sends no effort option.
  async function launchThread({ name, prompt, cwd, family, model }: StartInput, { readOnly, effort }: { readOnly: boolean; effort: Effort | null }): Promise<Handle> {
    const { origin } = runningServer();
    // The main checkout, even when cwd is a linked worktree.
    const repoRoot = resolve(await git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']), '..');
    const project = withDb((db) => findProject(db, repoRoot));
    const branch = (await git(cwd, ['branch', '--show-current'])) || null;
    // A bare family runs the catalogue's default. T3 rejects a launch with
    // no model, so with none there is nothing to start.
    const chosen = model ?? defaultModel(await readCatalogue(io, origin), family);
    if (chosen === null) throw new Refused(`T3 lists no model t3 can run on its ${T3_INSTANCE[family]} instance`);
    const modelSelection = t3ModelSelection({ family, model: chosen, effort });
    // Read after the catalogue request, which may have replaced the token.
    const token = await readToken(io);
    const { threadId } = await launch(io, { origin, token }, buildLaunch({
      threadId: randomUUID(),
      projectId: project.project_id,
      title: name,
      text: prompt,
      modelSelection,
      interactionMode: readOnly ? 'plan' : 'default',
      branch,
    }));
    // origin is for people to read: finish sends the token only to the
    // running server, never to the origin a handle names.
    return { kind: 'thread', id: threadId, origin };
  }

  async function archive(handle: Handle): Promise<void> {
    const { origin } = runningServer();
    await dispatch(io, { origin, token: await readToken(io) }, { type: 'thread.archive', commandId: randomUUID(), threadId: handle.id });
  }

  // Wait for the thread's run to end, and read its final message.
  async function waitForText(handle: Handle, timeoutMs: number): Promise<{ text: string }> {
    // Open the database fresh on each check: the server writes it, and a
    // long-lived handle can see stale state.
    const check = () => withDb((db) => {
      const run = readRun(db, handle.id);
      if (run === null) return undefined;
      if (run.pendingRequests > 0 || run.status === 'waiting') throw new SessionFailed('the session stopped to ask');
      // A run that failed before any message is a refusal, such as a model
      // the account cannot run. run then archives the thread.
      if (run.status === 'failed') {
        const failure = run.failure ?? 'run failed';
        throw readFinalMessage(db, run.id) === null ? new Refused(failure) : new SessionFailed(failure);
      }
      if (run.status === 'interrupted' || run.status === 'cancelled' || run.status === 'rolled_back') throw new SessionFailed(`run ${run.status.replace('_', ' ')}`);
      if (run.status !== 'completed') return undefined;
      // A completed run with no message yet is one with none at all; the
      // resolver rejects the empty text. One still streaming will finish.
      const message = readFinalMessage(db, run.id);
      if (message === null) return { text: '' };
      if (message.streaming) return undefined;
      return { text: message.text };
    });
    return pollUntil(check, { intervalMs: POLL_MS, timeoutMs, now: io.now, sleep: io.sleep });
  }

  return {
    name: 't3',

    detect() {
      const runtime = readRuntime(io);
      return runtime !== null && io.processAlive(runtime.pid) && isAncestor(io, runtime.pid);
    },

    async options(warn) {
      try {
        return optionsFromCatalogue(await readCatalogue(io, runningServer().origin));
      } catch (error) {
        if (!(error instanceof Refused)) throw error;
        warn(`${error.message}, so t3 lists no models`);
        return [];
      }
    },

    async run({ effort, ...input }: RunInput, { timeoutMs }) {
      // An error before the thread exists passes through: there is nothing
      // to archive or name.
      const handle = await launchThread(input, { readOnly: true, effort });
      try {
        return { handle, ...(await waitForText(handle, timeoutMs)) };
      } catch (error) {
        if (error instanceof Refused) {
          // Nothing ran, so the thread goes, as finish with ok would do.
          await archive(handle).catch((why: Error) => {
            error.message += `; could not archive it: ${why.message}`;
          });
        }
        // A kit error names the thread, so a person can find it.
        if (error instanceof Error && exitCodeOf(error) !== null) error.message += ` (thread ${handle.id})`;
        throw error;
      }
    },

    async start(input: StartInput) {
      return launchThread(input, { readOnly: false, effort: null });
    },

    // Archives the thread on ok. A failure throws, and the resolver reports it.
    async finish(handle: Handle, ok: boolean) {
      if (ok) await archive(handle);
    },
  };
}
