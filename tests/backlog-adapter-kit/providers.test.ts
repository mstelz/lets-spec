import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runProfile } from '../../contrib/backlog-adapter-kit/conformance.ts';
for (const provider of ['github', 'jira', 'linear', 'beads']) {
  test(`${provider} representative executable satisfies workflow outcomes`, async () => {
    assert.equal(await runProfile(provider), true);
  });
}
for (const [fault, outcome] of [['duplicate', /duplicate creation/], ['ignore-blocker', /blocker silently ignored/]] as const) {
  test(`conformance detects ${fault} fixture`, async () => {
    await assert.rejects(runProfile('beads', fault), outcome);
  });
}
