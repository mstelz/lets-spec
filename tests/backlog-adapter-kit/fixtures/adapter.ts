import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invoke } from '../../../contrib/backlog-adapter-kit/process.ts';
export const metadata = { Kind: 'Story', Priority: 'Must', Size: 'S', Status: 'Todo' };
export const story = { title: 'Contract item', body: '', metadata };
type Context = { cwd: string; provider: string; repository: string; backlog?: string; actor: string; session: string };
export async function withAdapter<T>(run: (fixture: {
  call: (operation: string, input?: Record<string, unknown>, key?: string, options?: { context?: Partial<Context>; fault?: string }) => Promise<Record<string, any>>;
  state: () => any;
}) => Promise<T>, provider = 'beads', selected = true): Promise<T> {
  mkdirSync('.workspace', { recursive: true });
  const cwd = mkdtempSync(join(process.cwd(), '.workspace/backlog-'));
  const context: Context = { cwd, provider, repository: 'fixture', actor: 'me', session: 'worker' };
  const call = async (operation: string, input = {}, key?: string, options: { context?: Partial<Context>; fault?: string } = {}) => (await invoke(process.execPath, {
    protocol: 1, operation, input, context: { ...context, ...options.context }, ...(key ? { mutationId: key } : {}),
  }, { args: [fileURLToPath(new URL('../../../contrib/backlog-adapter-kit/fake.ts', import.meta.url)), ...(options.fault ? [options.fault] : [])] })).result;
  try {
    if (selected) context.backlog = (await call('backlog.create', { title: 'Acceptance' }, 'setup')).backlog;
    return await run({ call, state: () => JSON.parse(readFileSync(join(cwd, 'simulation.json'), 'utf8')) }); }
  finally { rmSync(cwd, { recursive: true, force: true }); }
}
export async function runWorkflow(fault?: string): Promise<void> {
  const { workflowOutcomes } = await import('../../../contrib/backlog-adapter-kit/conformance.ts');
  await withAdapter(async ({ call, state }) => workflowOutcomes(
    (operation, input, key, worker) => call(operation, input, key, { fault, context: worker }), 'beads',
    { actor: 'me', session: 'worker', inspectUnrelated: async identity => {
      const data = state().items[JSON.stringify([identity.provider, identity.backlog, identity.id])].data;
      return { custom: data.custom, labels: data.labels.filter((label: string) => !/^(Kind|Priority|Size|Status):/.test(label)) };
    } },
  ));
}
