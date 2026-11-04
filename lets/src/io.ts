// The real filesystem, git and child processes, as the modules see them.
// Tests pass a fake with the same methods.
import { execFile as nodeExecFile } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ResolverName } from './delegate/config.ts';
import type { Adapter } from './resolvers/kit/adapter.ts';

// What a command printed, and its exit code. code is null when the command
// cannot start. timedOut: the command ran past timeoutMs, and was stopped.
export type ExecResult = {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut?: boolean;
  outputLimitExceeded?: boolean;
  signal?: NodeJS.Signals;
};

// env replaces the whole environment. input is written to stdin, which is
// closed either way. timeoutMs stops the command when it runs longer.
export type ExecOptions = {
  cwd?: string;
  env?: Record<string, string | undefined>;
  input?: string;
  timeoutMs?: number;
  maxBytes?: number;
  killSignal?: NodeJS.Signals;
};

export type Io = {
  readFile(path: string): string | null;
  readBytes(path: string): Buffer | null;
  writeFile(path: string, text: string): void;
  exists(path: string): boolean;
  isSymlink(path: string): boolean;
  isDir(path: string): boolean;
  readlink(path: string): string | null;
  symlink(target: string, path: string): void;
  remove(path: string): void;
  mkdirp(path: string): void;
  stat(path: string): { mode: number };
  chmod(path: string, mode: number): void;
  copyFile(src: string, dst: string): void;
  listDirs(path: string): string[];
  listNames(path: string): string[];
  listFiles(path: string): string[];
  execFile(cmd: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
  // The user's home folder.
  homedir(): string;
  now(): number;
};

// Everything a command needs from the real world.
export type Deps = {
  env: Record<string, string | undefined>;
  cwd: string;
  packageRoot: string;
  // The resolvers built into lets, by the names the chain lists.
  resolvers: Record<ResolverName, Adapter>;
  io: Io;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
};

// Run fn, and answer null when the path does not exist.
function orNull<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'EINVAL') return null;
    throw error;
  }
}

// Every file under dir, as a path relative to dir.
function walk(dir: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...walk(dir, rel));
    else found.push(rel);
  }
  return found;
}

export function realIo(): Io {
  return {
    readFile: (path) => orNull(() => readFileSync(path, 'utf8')),
    readBytes: (path) => orNull(() => readFileSync(path)),
    // Writes through an existing file, so its inode, links and mode are kept.
    writeFile: (path, text) => writeFileSync(path, text),
    exists: (path) => existsSync(path),
    isSymlink: (path) => orNull(() => lstatSync(path).isSymbolicLink()) ?? false,
    isDir: (path) => orNull(() => statSync(path).isDirectory()) ?? false,
    readlink: (path) => orNull(() => readlinkSync(path)),
    symlink: (target, path) => symlinkSync(target, path),
    remove: (path) => rmSync(path, { recursive: true, force: true }),
    mkdirp: (path) => mkdirSync(path, { recursive: true }),
    stat: (path) => ({ mode: statSync(path).mode & 0o7777 }),
    chmod: (path, mode) => chmodSync(path, mode),
    // Keeps the source's mode, even when the source is read-only.
    copyFile(src, dst) {
      copyFileSync(src, dst);
      chmodSync(dst, statSync(src).mode & 0o7777);
    },
    listDirs: (path) =>
      readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort(),
    // Every entry name: files, folders and links, even a link that dangles.
    listNames: (path) => (orNull(() => readdirSync(path)) ?? []).sort(),
    listFiles: (path) => walk(path).sort(),

    // Resolves on any exit code, and on a timeout. code is null when the
    // command cannot start.
    execFile(
      cmd,
      args,
      { cwd, env, input, timeoutMs, maxBytes, killSignal = 'SIGTERM' } = {},
    ) {
      return new Promise((resolve) => {
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let bytes = 0;
        let stopped: 'timeout' | 'output' | undefined;
        const finish = (result: ExecResult) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(result);
        };
        // Buffer mode preserves byte counts even for invalid UTF-8 diagnostics.
        // The combined stream limit below runs before Node's per-stream ceiling.
        const child = nodeExecFile(
          cmd,
          args,
          {
            cwd,
            env,
            encoding: 'buffer',
            maxBuffer: maxBytes === undefined ? 64 * 1024 * 1024 : Infinity,
            killSignal,
          },
          (error, stdout, stderr) => {
            if (stopped) return;
            const signal = error?.signal ?? undefined;
            if (error && typeof error.code === 'string') {
              const buffering = error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
              finish({
                stdout: '',
                stderr: error.message,
                code: buffering ? 1 : null,
                ...(buffering ? { outputLimitExceeded: true } : {}),
                ...(signal ? { signal } : {}),
              });
              return;
            }
            try {
              finish({
                stdout: stdout.toString('utf8'),
                stderr: stderr.toString('utf8'),
                code: error ? ((error.code as number | undefined) ?? 1) : 0,
                ...(signal ? { signal } : {}),
              });
            } catch {
              finish({ stdout: '', stderr: 'output decoding failed', code: 1,
                outputLimitExceeded: true, ...(signal ? { signal } : {}) });
            }
          },
        );
        const stop = (reason: 'timeout' | 'output') => {
          if (settled || stopped) return;
          stopped = reason;
          clearTimeout(timer);
          const killed = child.kill(killSignal);
          child.stdout?.destroy();
          child.stderr?.destroy();
          finish({
            stdout: '',
            stderr: '',
            code: 1,
            ...(reason === 'timeout' ? { timedOut: true } : { outputLimitExceeded: true }),
            ...(killed && killSignal === 'SIGKILL' ? { signal: killSignal } : {}),
          });
        };
        if (maxBytes !== undefined) {
          const count = (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > maxBytes) stop('output');
          };
          child.stdout?.on('data', count);
          child.stderr?.on('data', count);
        }
        if (timeoutMs !== undefined) timer = setTimeout(() => stop('timeout'), timeoutMs);
        child.stdin!.on('error', () => {});
        child.stdin!.end(input);
      });
    },

    homedir: () => homedir(),
    now: () => Date.now(),
  };
}
