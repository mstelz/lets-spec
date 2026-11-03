import { AdapterFailure } from './errors.ts';
export type MergeEvidence = { reference: string; merged: boolean; commit: string };
export type CompletionState = { status: string; completionEffects: number };
/** codeHost is the trusted caller's code-host boundary, never provider item text. */
export async function complete(item: CompletionState, reference: string, codeHost: () => Promise<MergeEvidence>, loseResponse = false): Promise<string> {
  const evidence = await codeHost();
  if (typeof reference !== 'string' || !reference || !evidence || evidence.merged !== true || evidence.reference !== reference || typeof evidence.commit !== 'string' || !evidence.commit) throw new Error('unmerged or mismatched code-host evidence');
  if (item.status === 'Done') return 'Done';
  item.status = 'Done'; item.completionEffects++;
  if (loseResponse) throw new AdapterFailure('unknown_outcome', 'unknown', 'completion response lost');
  return item.status;
}
