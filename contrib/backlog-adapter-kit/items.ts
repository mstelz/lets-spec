import { object, validateIdentity } from './protocol.ts';
import type { Identity } from './protocol.ts';
export const METADATA = { Kind: ['Epic', 'Story', 'Bug', 'Chore'], Priority: ['Must', 'Should', 'Could', 'Wont'], Size: ['XS', 'S', 'M', 'L', 'XL'], Status: ['Todo', 'In Progress', 'Done'] } as const;
export type Metadata = Record<keyof typeof METADATA, string>;
export type Item = { identity: Identity; reference: string; url?: string; title: string; body: string; metadata: Metadata; owners: string[] };
export function validateItem(value: unknown): asserts value is Item {
  const item = object(value, 'item');
  validateIdentity(item.identity);
  for (const field of ['reference', 'title', 'body']) if (typeof item[field] !== 'string' || (field !== 'body' && item[field] === '')) throw new Error(`item.${field} required`);
  if (item.url !== undefined && (typeof item.url !== 'string' || !URL.canParse(item.url))) throw new Error('invalid item.url');
  if (!Array.isArray(item.owners) || item.owners.some(owner => typeof owner !== 'string' || !owner)) throw new Error('invalid owners');
  const metadata = object(item.metadata, 'metadata');
  for (const [field, values] of Object.entries(METADATA)) if (!(values as readonly unknown[]).includes(metadata[field])) throw new Error(`invalid metadata.${field}`);
  for (const key of Object.keys(metadata)) if (!(key in METADATA)) throw new Error(`unknown metadata.${key}`);
}
export function identityKey(identity: Identity): string { validateIdentity(identity); return JSON.stringify([identity.provider, identity.backlog, identity.id]); }
export type Mappings = Record<string, { field: string; values: Record<string, string> }>;
export function validateMappings(mappings: Mappings): void {
  object(mappings, 'mappings');
  const used = new Set<string>();
  for (const [field, values] of Object.entries(METADATA)) {
    const mapping = mappings[field];
    if (!mapping || typeof mapping.field !== 'string' || !mapping.field) throw new Error(`invalid_configuration: mapping ${field} missing field`);
    for (const value of values) {
      const stored = mapping.values?.[value];
      if (typeof stored !== 'string' || !stored) throw new Error(`invalid_configuration: mapping ${field}.${value} missing`);
      const key = JSON.stringify([mapping.field, stored]);
      if (used.has(key)) throw new Error(`invalid_configuration: ambiguous mapping ${field}.${value}`);
      used.add(key);
    }
  }
}
export function updateMapped(data: Record<string, unknown>, patch: Partial<Metadata>, mappings: Mappings): Record<string, unknown> {
  validateMappings(mappings);
  const result = structuredClone(data);
  for (const [field, value] of Object.entries(patch)) {
    if (!(field in METADATA) || !(METADATA[field as keyof Metadata] as readonly unknown[]).includes(value)) throw new Error(`invalid shared metadata ${field}`);
    const mapping = mappings[field];
    const previous = result[mapping.field];
    result[mapping.field] = Array.isArray(previous)
      ? [...previous.filter(entry => !Object.values(mapping.values).includes(entry)), mapping.values[value!]]
      : mapping.values[value!];
  }
  return result;
}

export function readMapped(data: Record<string, unknown>, mappings: Mappings): Metadata {
  validateMappings(mappings);
  const result: Record<string, string> = {};
  for (const [field, mapping] of Object.entries(mappings)) {
    const stored = data[mapping.field];
    const matches = Object.entries(mapping.values).filter(([, value]) => Array.isArray(stored) ? stored.includes(value) : stored === value);
    if (matches.length !== 1) throw new Error(`invalid_configuration: ambiguous or missing ${field} value`);
    result[field] = matches[0][0];
  }
  return result as Metadata;
}
