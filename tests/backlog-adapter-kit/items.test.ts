import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identityKey, validateItem, updateMapped, validateMappings, readMapped } from '../../contrib/backlog-adapter-kit/items.ts';
const item = { identity: { provider: 'beads', backlog: 'local', id: 'bd-a' }, reference: 'bd-a', title: 'Example', body: '', metadata: { Kind: 'Story', Priority: 'Must', Size: 'S', Status: 'Todo' }, owners: [] };
test('local normalized item needs no URL', () => assert.doesNotThrow(() => validateItem(item)));
test('same local ID in different scopes stays distinct', () => {
  assert.notEqual(identityKey(item.identity), identityKey({ ...item.identity, backlog: 'other' }));
});
import { METADATA } from '../../contrib/backlog-adapter-kit/items.ts';
const mappings = Object.fromEntries(Object.entries(METADATA).map(([field, values]) => [field, { field: field.toLowerCase(), cardinality: 'one' as const, values: Object.fromEntries(values.map(value => [value, `${field}:${value}`])) }]));
test('mapping rejects ambiguous values', () => {
  const bad = structuredClone(mappings);
  bad.Priority.values.Must = bad.Priority.values.Should;
  assert.throws(() => validateMappings(bad), /ambiguous/);
});
test('targeted mapping update preserves unrelated provider data', () => {
  const data = { status: 'Status:Todo', custom: { keep: true }, labels: ['customer'] };
  assert.deepEqual(updateMapped(data, { Status: 'In Progress' }, mappings), { ...data, status: 'Status:In Progress' });
  assert.equal(data.status, 'Status:Todo');
});
test('label mappings round trip shared metadata', async () => {
  const { readMapped } = await import('../../contrib/backlog-adapter-kit/items.ts');
  const labels = Object.fromEntries(Object.entries(mappings).map(([key, mapping]) => [key, { ...mapping, cardinality: 'many' as const, field: 'labels' }]));
  const data = updateMapped({ labels: ['customer'] }, item.metadata, labels);
  assert.deepEqual(readMapped(data, labels), item.metadata);
  assert.ok((data.labels as string[]).includes('customer'));
});
test('empty label storage retains all shared meanings', () => {
  const labels = Object.fromEntries(Object.entries(mappings).map(([key, mapping]) => [key, { ...mapping, cardinality: 'many' as const, field: 'labels' }]));
  assert.deepEqual(readMapped(updateMapped({}, item.metadata, labels), labels), item.metadata);
});
test('two shared meanings cannot share scalar storage', () => {
  const bad = structuredClone(mappings);
  bad.Priority.field = bad.Kind.field;
  assert.throws(() => validateMappings(bad), /cardinality/);
});
