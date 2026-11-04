import { realIo } from '../../../../lets/src/io.ts';
import { validateResponse } from '../../../../lets/src/backlog/protocol.ts';
import { AdapterFailure } from '../../../../lets/src/backlog/errors.ts';
import type { Operation, ResultMap } from '../../../../lets/src/backlog/types.ts';
import { readState } from '../../../../lets/src/backlog/state.ts';
import type { SimulationState } from '../../../../lets/src/backlog/state.ts';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invoke } from '../../../../lets/src/backlog/process.ts';
export const metadata = { Kind: 'Story', Priority: 'Must', Size: 'S', Status: 'Todo' };
export const story = { title: 'Contract item', body: '', metadata };
type Context = {
  cwd: string;
  provider: string;
  repository: string;
  backlog?: string;
  actor: string;
  session: string;
};
export async function withAdapter<T>(
  run: (fixture: {
    call: <O extends Operation>(
      operation: O,
      input?: Record<string, unknown>,
      key?: string,
      options?: { context?: Partial<Context>; fault?: string; raw?: boolean },
    ) => Promise<ResultMap[O]>;
    state: () => SimulationState;
  }) => Promise<T>,
  provider = 'beads',
  selected = true,
): Promise<T> {
  mkdirSync('.workspace', { recursive: true });
  const cwd = mkdtempSync(join(process.cwd(), '.workspace/backlog-'));
  const context: Context = {
    cwd,
    provider,
    repository: 'fixture',
    actor: 'me',
    session: 'worker',
  };
  const call = async <O extends Operation>(
    operation: O,
    input: Record<string, unknown> = {},
    key?: string,
    options: { context?: Partial<Context>; fault?: string; raw?: boolean } = {},
  ): Promise<ResultMap[O]> => {
    const request = {
      protocol: 1,
      operation,
      input,
      context: { ...context, ...options.context },
      ...(key ? { mutationId: key } : {}),
    };
    const args = [
      fileURLToPath(new URL('../../../../lets/src/backlog/fake.ts', import.meta.url)),
      ...(options.fault ? [options.fault] : []),
    ];
    if (options.raw) {
      const result = await realIo().execFile(process.execPath, args, {
        input: JSON.stringify(request),
        timeoutMs: 5000,
        maxBytes: 1024 * 1024,
        killSignal: 'SIGKILL',
      });
      const response: unknown = JSON.parse(result.stdout);
      validateResponse(response, result.code ?? 1, operation);
      if (!response.ok)
        throw new AdapterFailure(
          response.error.category,
          response.error.effects,
          response.error.message,
        );
      return response.result as ResultMap[O];
    }
    return (await invoke(process.execPath, request, { args })).result as ResultMap[O];
  };
  try {
    if (selected)
      context.backlog = (
        await call('backlog.create', { title: 'Acceptance' }, 'setup')
      ).backlog;
    return await run({
      call,
      state: () => readState(JSON.parse(readFileSync(join(cwd, 'simulation.json'), 'utf8'))),
    });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}
export async function runWorkflow(fault?: string): Promise<void> {
  const { workflowOutcomes } = await import('../../../../lets/src/backlog/conformance.ts');
  await withAdapter(async ({ call, state }) =>
    workflowOutcomes(
      (operation, input, key, worker) =>
        call(operation, input, key, { fault, context: worker }),
      'beads',
      {
        actor: 'me',
        session: 'worker',
        inspectUnrelated: async (identity) => {
          const data =
            state().items[JSON.stringify([identity.provider, identity.backlog, identity.id])]
              .data;
          return {
            custom: data.custom,
            labels: (data.labels as string[]).filter(
              (label: string) => !/^(Kind|Priority|Size|Status):/.test(label),
            ),
          };
        },
      },
    ),
  );
}
