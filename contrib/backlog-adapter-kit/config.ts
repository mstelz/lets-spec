import { resolve } from 'node:path';
import { object } from './protocol.ts';
import { validateMappings } from './items.ts';
import type { Mappings } from './items.ts';
/** Checks already-parsed examples, not a YAML parser or production consumer. */
export function checkConfiguration(document: unknown, cwd: string, findExecutable: (name: string) => string | undefined): { provider: string; executable: string; backlog?: string } {
  const root = object(document, 'config');
  const lets = root.lets === undefined ? {} : object(root.lets, 'lets');
  const selection = lets.backlog === undefined ? { provider: 'github', executable: 'lets-backlog-github' } : object(lets.backlog, 'config lets.backlog');
  for (const key of Object.keys(selection)) if (!['provider', 'executable', 'id', 'mappings', 'storage'].includes(key)) throw new Error(`invalid_configuration: unsupported backlog setting ${key}`);
  for (const field of ['provider', 'executable']) if (typeof selection[field] !== 'string' || !selection[field]) throw new Error(`invalid_configuration: ${field} required`);
  if (lets.backlog !== undefined) {
    if (typeof selection.id !== 'string' || !selection.id) throw new Error('invalid_configuration: one backlog id required');
    validateMappings(selection.mappings as Mappings);
  }
  if (selection.provider === 'beads') {
    const storage = object(selection.storage, 'invalid_configuration: storage');
    if (typeof storage.path !== 'string' || !storage.path) throw new Error('invalid_configuration: storage.path required');
    if (!['tracked', 'ignored'].includes(storage.tracking as string)) throw new Error('invalid_configuration: storage.tracking must be tracked or ignored');
  }
  const executable = findExecutable((selection.executable as string).includes('/') ? resolve(cwd, selection.executable as string) : selection.executable as string);
  if (!executable) throw new Error('invalid_configuration: executable unavailable; no fallback');
  return { provider: selection.provider as string, executable, ...(typeof selection.id === 'string' ? { backlog: selection.id } : {}) };
}
