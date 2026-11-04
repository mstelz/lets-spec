/** Structured failures remain inspectable across process and recovery helpers. */
export class AdapterFailure extends Error {
  category: string;
  effects: 'none' | 'partial' | 'unknown';
  constructor(category: string, effects: AdapterFailure['effects'], message: string) {
    super(`${category}: ${message}`);
    this.name = 'AdapterFailure'; this.category = category; this.effects = effects;
  }
}
