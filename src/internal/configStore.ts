export type AriadnaConfig = {
  llm: {
    provider: 'openai' | 'anthropic' | 'gemini';
    apiKey: string;
    model?: string;
  };
  timeoutMs?: number;
};

let currentConfig: AriadnaConfig | null = null;

export function setConfig(config: AriadnaConfig) {
  currentConfig = Object.freeze({ ...config });
}

export function getConfig(): AriadnaConfig {
  if (!currentConfig) {
    throw new Error(
      'Ariadna is not configured. Call configureAriadna() first.'
    );
  }
  return currentConfig;
}
