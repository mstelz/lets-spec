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
export type Mappings = Record<string, { field: string; cardinality: 'one' | 'many'; values: Record<string, string> }>;
export function validateMappings(mappings: Mappings): void {
  object(mappings, 'invalid_configuration: mappings');
  for (const key of Object.keys(mappings)) if (!Object.hasOwn(METADATA, key)) throw new Error(`invalid_configuration: unknown mapping ${key}`);
  const used = new Set<string>();
  const storage = new Map<string, string>();
  for (const [field, values] of Object.entries(METADATA)) {
    const mapping = mappings[field];
    if (!mapping || typeof mapping.field !== 'string' || !mapping.field) throw new Error(`invalid_configuration: mapping ${field} missing field`);
    if (!['one', 'many'].includes(mapping.cardinality) || (storage.has(mapping.field) && (mapping.cardinality !== 'many' || storage.get(mapping.field) !== 'many'))) throw new Error(`invalid_configuration: conflicting cardinality for ${mapping.field}`);
    storage.set(mapping.field, mapping.cardinality);
    object(mapping.values, `invalid_configuration: mapping ${field}.values`);
    for (const key of Object.keys(mapping.values)) if (!(values as readonly string[]).includes(key)) throw new Error(`invalid_configuration: unknown mapping ${field}.${key}`);
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
    if (previous !== undefined && (mapping.cardinality === 'many' ? !Array.isArray(previous) : typeof previous !== 'string')) throw new Error(`invalid_configuration: storage cardinality for ${mapping.field}`);
    result[mapping.field] = mapping.cardinality === 'many'
      ? [...((previous ?? []) as string[]).filter(entry => !Object.values(mapping.values).includes(entry)), mapping.values[value!]]
      : mapping.values[value!];
  }
  return result;
}

export function readMapped(data: Record<string, unknown>, mappings: Mappings): Metadata {
  validateMappings(mappings);
  const result: Record<string, string> = {};
  for (const [field, mapping] of Object.entries(mappings)) {
    const stored = data[mapping.field];
    if (mapping.cardinality === 'many' ? !Array.isArray(stored) : typeof stored !== 'string') throw new Error(`invalid_configuration: storage cardinality for ${mapping.field}`);
    const matches = Object.entries(mapping.values).filter(([, value]) => Array.isArray(stored) ? stored.includes(value) : stored === value);
    if (matches.length !== 1) throw new Error(`invalid_configuration: ambiguous or missing ${field} value`);
    result[field] = matches[0][0];
  }
  return result as Metadata;
}
