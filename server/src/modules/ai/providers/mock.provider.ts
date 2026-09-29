import { AIProviderError, type AIProvider } from './AIProvider.js';

/**
 * "No AI" provider. It deliberately fails every call, so the assistant uses its deterministic
 * path (rule-based intent + keyword ranking + template reasons). The app is fully usable —
 * and testable — without any model installed.
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock';
  readonly model = 'rules';

  async generateJson<T>(): Promise<T> {
    throw new AIProviderError('Mock provider: using deterministic recommendations');
  }
}
