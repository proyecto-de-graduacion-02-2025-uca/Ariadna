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

export interface AiRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface AiSuccessValue {
  text: string;
  raw: unknown;
  model?: string;
  usage?: AiUsage;
  metadata?: Record<string, unknown>;
}

export type AiResponse =
  | { ok: true; value: AiSuccessValue }
  | { ok: false; error: AiError };

export interface CallModelOptions {
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AiProvider {
  // @param request  Información lógica de la petición (prompt, temperatura, etc.).
  // @returns        AiResponse con texto, tokens y metadata básica.
  generate(request: AiRequest): Promise<AiResponse>;
}

export interface CoachStep {
  title?: string;
  description: string;
}

export interface CoachExplanation {
  summary: string;
  steps?: CoachStep[];
  metadata?: Record<string, unknown>;
}

export type HintLevel = 'light' | 'medium' | 'strong';

export interface HintSuggestion {
  hint: string;
  level: HintLevel;
  metadata?: Record<string, unknown>;
}

export interface RefineKRequest {
  originalPrompt: string;
  previousAttempts: string[];
  k: number;
  metadata?: Record<string, unknown>;
}

export interface RefineKSuggestion {
  id: string;
  prompt: string;
  rationale?: string;
}

export interface RefineKResult {
  suggestions: RefineKSuggestion[];
  metadata?: Record<string, unknown>;
}
