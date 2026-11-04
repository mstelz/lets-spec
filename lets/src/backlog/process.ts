import { realIo } from '../io.ts';
import type { Io } from '../io.ts';
import { AdapterFailure } from './errors.ts';
import { validateRequest, validateResponse } from './protocol.ts';
import type { BacklogResponse } from './types.ts';

export type InvokeOptions = {
  args?: string[];
  timeoutMs?: number;
  maxBytes?: number;
  io?: Pick<Io, 'execFile'>;
};

export async function invoke(
  executable: string,
  request: unknown,
  options: InvokeOptions = {},
): Promise<Extract<BacklogResponse, { ok: true }>> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxBytes = options.maxBytes ?? 1024 * 1024;
  let input: string;
  try {
    validateRequest(request);
    if (
      !Number.isFinite(timeoutMs) ||
      timeoutMs > 2 ** 31 - 1 ||
      timeoutMs <= 0 ||
      !Number.isSafeInteger(maxBytes) ||
      maxBytes <= 0
    ) {
      throw new Error('invalid process limits');
    }
    input = JSON.stringify(request);
  } catch (error) {
    throw new AdapterFailure('invalid_request', 'none', String(error));
  }
  const io = options.io ?? realIo();
  let execution;
  try {
    execution = await io.execFile(executable, options.args ?? [], {
      cwd: request.context.cwd,
      input,
      timeoutMs,
      maxBytes,
      killSignal: 'SIGKILL',
    });
  } catch (error) {
    throw new AdapterFailure('unknown_outcome', 'unknown', String(error));
  }
  const { stdout, stderr, code, signal, timedOut, outputLimitExceeded } = execution;
  const transport = timedOut
    ? 'timeout'
    : outputLimitExceeded
      ? 'output limit'
      : signal
        ? `signal termination ${signal}`
        : code === null
          ? 'adapter could not start'
          : undefined;
  if (transport) {
    throw new AdapterFailure(
      'unknown_outcome',
      'unknown',
      `${transport}; reconcile mutation before retry`,
    );
  }
  let response: unknown;
  try {
    response = JSON.parse(stdout);
    validateResponse(response, code!, request.operation);
  } catch (error) {
    throw new AdapterFailure(
      'unknown_outcome',
      'unknown',
      `${String(error)}; adapter stderr: ${stderr}`,
    );
  }
  if (!response.ok) {
    throw new AdapterFailure(
      response.error.category,
      response.error.effects,
      response.error.message,
    );
  }
  return response;
}
