import { AdapterFailure } from './errors.ts';
import { spawn } from 'node:child_process';
import { validateRequest, validateResponse } from './protocol.ts';
export async function invoke(executable: string, request: Record<string, any>, options: { args?: string[]; timeoutMs?: number; maxBytes?: number } = {}): Promise<Record<string, any>> {
  validateRequest(request);
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxBytes = options.maxBytes ?? 1024 * 1024;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isInteger(maxBytes) || maxBytes <= 0) throw new Error('invalid process limits');
  return new Promise((resolve, reject) => {
    const child = spawn(executable, options.args ?? [], { cwd: request.context.cwd, stdio: ['pipe', 'pipe', 'pipe'], shell: false });
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new AdapterFailure('unknown_outcome', 'unknown', 'timeout; reconcile mutation before retry')); }, timeoutMs);
    let stdout = '';
    let stderr = '';
    let bytes = 0;
    const count = (chunk: string) => { bytes += Buffer.byteLength(chunk); if (bytes > maxBytes) { child.kill('SIGKILL'); clearTimeout(timer); reject(new AdapterFailure('unknown_outcome', 'unknown', 'output limit; reconcile mutation before retry')); return false; } return true; };
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { if (count(chunk)) stderr += chunk; });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => { if (count(chunk)) stdout += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      try {
        if (signal || code === null) throw new Error(`contract failure: signal termination ${signal}`);
        const response = JSON.parse(stdout);
        validateResponse(response, code ?? -1, request.operation);
        if (!response.ok) reject(new AdapterFailure(response.error.category, response.error.effects, response.error.message));
        else resolve(response);
      } catch (error) { reject(new AdapterFailure('unknown_outcome', 'unknown', `${String(error)}; adapter stderr: ${stderr}`)); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(request));
  });
}
