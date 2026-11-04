import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  identityKey,
  validateItem,
  updateMapped,
  validateMappings,
  readMapped,
} from '../../../lets/src/backlog/items.ts';
const item = {
  identity: { provider: 'beads', backlog: 'local', id: 'bd-a' },
  reference: 'bd-a',
  title: 'Example',
  body: '',
  metadata: { Kind: 'Story', Priority: 'Must', Size: 'S', Status: 'Todo' },
  owners: [],
};
test('local normalized item needs no URL', () =>
  assert.doesNotThrow(() => validateItem(item)));
test('same local ID in different scopes stays distinct', () => {
  assert.notEqual(
    identityKey(item.identity),
    identityKey({ ...item.identity, backlog: 'other' }),
  );
});
import { METADATA } from '../../../lets/src/backlog/items.ts';
const mappings = Object.fromEntries(
  Object.entries(METADATA).map(([field, values]) => [
    field,
    {
      field: field.toLowerCase(),
      cardinality: 'one' as const,
      values: Object.fromEntries(values.map((value) => [value, `${field}:${value}`])),
    },
  ]),
);
test('mapping rejects ambiguous values', () => {
  const bad = structuredClone(mappings);
  bad.Priority.values.Must = bad.Priority.values.Should;
  assert.throws(() => validateMappings(bad), /ambiguous/);
});
test('targeted mapping update preserves unrelated provider data', () => {
  const data = { status: 'Status:Todo', custom: { keep: true }, labels: ['customer'] };
  assert.deepEqual(updateMapped(data, { Status: 'In Progress' }, mappings), {
    ...data,
    status: 'Status:In Progress',
  });
  assert.equal(data.status, 'Status:Todo');
});
test('label mappings round trip shared metadata', async () => {
  const { readMapped } = await import('../../../lets/src/backlog/items.ts');
  const labels = Object.fromEntries(
    Object.entries(mappings).map(([key, mapping]) => [
      key,
      { ...mapping, cardinality: 'many' as const, field: 'labels' },
    ]),
  );
  const data = updateMapped({ labels: ['customer'] }, item.metadata, labels);
  assert.deepEqual(readMapped(data, labels), item.metadata);
  assert.ok((data.labels as string[]).includes('customer'));
});
test('empty label storage retains all shared meanings', () => {
  const labels = Object.fromEntries(
    Object.entries(mappings).map(([key, mapping]) => [
      key,
      { ...mapping, cardinality: 'many' as const, field: 'labels' },
    ]),
  );
  assert.deepEqual(readMapped(updateMapped({}, item.metadata, labels), labels), item.metadata);
});
test('two shared meanings cannot share scalar storage', () => {
  const bad = structuredClone(mappings);
  bad.Priority.field = bad.Kind.field;
  assert.throws(() => validateMappings(bad), /cardinality/);
});
for (const stored of ['Priority:Must', 'Priority:P0']) {
  test(`mapping rejects extra shared meaning ${stored}`, () => {
    const bad = structuredClone(mappings);
    bad.Priority.values.Urgent = stored;
    assert.throws(() => validateMappings(bad), /invalid_configuration.*Urgent/);
  });
}
test('mapping rejects an unknown shared field', () => {
  assert.throws(
    () => validateMappings({ ...mappings, Custom: mappings.Priority }),
    /invalid_configuration.*Custom/,
  );
});
for (const cardinality of ['one', 'many'] as const) {
  test(`mapping read enforces ${cardinality} cardinality`, () => {
    const configured = { ...mappings, Priority: { ...mappings.Priority, cardinality } };
    const data = updateMapped({}, item.metadata, configured);
    data.priority = cardinality === 'one' ? ['Priority:Must'] : 'Priority:Must';
    assert.throws(() => readMapped(data, configured), /cardinality/);
  });
}
