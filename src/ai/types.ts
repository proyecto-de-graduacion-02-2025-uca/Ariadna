export type AiErrorType = 'config' | 'network' | 'api' | 'timeout' | 'unknown';

export interface AiError {
  type: AiErrorType;
  message: string;
  statusCode?: number;
  details?: unknown;
}

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiSuccessValue {
  text: string;
  raw: unknown;       // respuesta completa del proveedor
  model?: string;
  usage?: AiUsage;
}

export type AiResponse =
  | { ok: true; value: AiSuccessValue }
  | { ok: false; error: AiError };

export interface CallModelOptions {
  /**
   * Override de modelo; si no se pasa se usa process.env.ARIADNA_AI_MODEL
   */
  model?: string;

  /**
   * API key; si no se pasa se usa process.env.ARIADNA_AI_API_KEY
   */
  apiKey?: string;

  /**
   * URL del endpoint compatible con OpenAI Chat Completions.
   * Si no se pasa se usa ARIADNA_AI_BASE_URL o el default de OpenAI.
   */
  baseUrl?: string;

  /**
   * Prompt de sistema (rol "system")
   */
  systemPrompt?: string;

  /**
   * Temperatura del modelo.
   */
  temperature?: number;

  /**
   * Tokens máximos de salida.
   */
  maxTokens?: number;

  /**
   * Timeout en milisegundos (default 60s).
   */
  timeoutMs?: number;
}
