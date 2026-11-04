import { AdapterFailure } from './errors.ts';
import { METADATA } from './items.ts';
import type { Mappings } from './items.ts';
import type { Capabilities } from './capabilities.ts';
export const PROVIDERS = ['github', 'jira', 'linear', 'beads'] as const;
export function profile(provider: string): { capabilities: Capabilities; mappings: Mappings } {
  if (!(PROVIDERS as readonly string[]).includes(provider))
    throw new AdapterFailure('invalid_configuration', 'none', 'unknown simulated profile');
  const capabilities: Capabilities = Object.fromEntries(
    ['hierarchy', 'blockers', 'claims', 'metadata', 'references', 'completion'].map((name) => [
      name,
      {
        support:
          name === 'metadata' ||
          name === 'references' ||
          name === 'completion' ||
          name === 'claims'
            ? 'emulated'
            : 'native',
        limits:
          'Representative simulation only; mappings, permissions, session provenance and consistency require live acceptance.',
        ...(name === 'claims' ? { guarantee: 'best-effort' } : {}),
      },
    ]),
  );
  const mappings = Object.fromEntries(
    Object.entries(METADATA).map(([field, values]) => [
      field,
      {
        field: provider === 'linear' || provider === 'beads' ? 'labels' : field.toLowerCase(),
        cardinality:
          provider === 'linear' || provider === 'beads' ? ('many' as const) : ('one' as const),
        values: Object.fromEntries(values.map((value) => [value, `${field}:${value}`])),
      },
    ]),
  );
  return { capabilities, mappings };
}
