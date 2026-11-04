import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('inventory table contains the required responsibility mappings', () => {
  const document = readFileSync(
    new URL('../../../docs/backlog-adapter-contract.md', import.meta.url),
    'utf8',
  );
  for (const behavior of [
    'Project discovery',
    'Project creation',
    'Field validation',
    'Item search',
    'Item creation',
    'Targeted update',
    'Parent-child links',
    'Directional blockers',
    'Packet validation',
    'Schema routing',
    'Ready-work ranking',
    'Claim',
    'Release',
    'Pull request references',
    'Completion',
    'Glossary handoff',
  ]) {
    assert.match(
      document,
      new RegExp(`\\| ${behavior} \\| (shared policy|adapter|code host) \\| [^|]+\\|`),
      behavior,
    );
  }
});
