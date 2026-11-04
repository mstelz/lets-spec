import type { ERRORS } from './protocol.ts';
export type ErrorCategory = (typeof ERRORS)[number];
/** Structured failures remain inspectable across process and recovery helpers. */
export class AdapterFailure extends Error {
  category: ErrorCategory;
  effects: 'none' | 'partial' | 'unknown';
  constructor(category: ErrorCategory, effects: AdapterFailure['effects'], message: string) {
    super(`${category}: ${message}`);
    this.name = 'AdapterFailure';
    this.category = category;
    this.effects = effects;
  }
}
