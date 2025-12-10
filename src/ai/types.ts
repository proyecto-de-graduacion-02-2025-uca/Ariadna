/**
 * Tipos base para todas las funciones de IA del proyecto Ariadna.
 *
 * Objetivo:
 * - Tener un contrato claro y desacoplado del proveedor (OpenAI, Gemini, etc.).
 * - Facilitar mocks en pruebas unitarias.
 * - Servir como base para cliente LLM, coach, hints y refine-k.
 */

/* -------------------------------------------------------------------------- */
/*  Errores y uso de tokens                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Tipo de error de IA.
 */
export type AiErrorType = 'config' | 'network' | 'api' | 'timeout' | 'unknown';

/**
 * Error estructurado que puede devolver cualquier operación de IA.
 */
export interface AiError {
  /** Categoría de error (config, red, proveedor, timeout, etc.). */
  type: AiErrorType;
  /** Mensaje legible para logs o debugging. */
  message: string;
  /** Código HTTP del proveedor, si aplica. */
  statusCode?: number;
  /** Payload extra devuelto por el proveedor o contexto adicional. */
  details?: unknown;
}

/**
 * Información básica de uso de tokens.
 */
export interface AiUsage {
  /** Tokens consumidos en el prompt. */
  promptTokens: number;
  /** Tokens consumidos en la respuesta. */
  completionTokens: number;
  /** Total de tokens. */
  totalTokens: number;
}

/* -------------------------------------------------------------------------- */
/*  Request/response genéricos de LLM                                         */
/* -------------------------------------------------------------------------- */

/**
 * Representa una petición genérica a un modelo LLM.
 * No está amarrada a ningún proveedor específico.
 */
export interface AiRequest {
  /** Prompt principal (mensaje del usuario). */
  prompt: string;
  /** Prompt de sistema opcional (rol "system"). */
  systemPrompt?: string;
  /** Temperatura del muestreo del modelo. */
  temperature?: number;
  /** Límite máximo de tokens de salida. */
  maxTokens?: number;
  /**
   * Nombre del modelo lógico a usar (ej. "gpt-4o-mini").
   * El proveedor puede mapearlo a un modelo físico.
   */
  model?: string;
  /**
   * Metadatos adicionales para logging, trazabilidad, etc.
   * No se envían necesariamente al proveedor.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Valor de éxito de una llamada al modelo LLM.
 */
export interface AiSuccessValue {
  /** Texto principal devuelto por el modelo. */
  text: string;
  /** Respuesta cruda del proveedor (para debugging o features avanzadas). */
  raw: unknown;
  /** Nombre del modelo que finalmente respondió. */
  model?: string;
  /** Información de uso de tokens, si está disponible. */
  usage?: AiUsage;
  /** Metadatos internos opcionales. */
  metadata?: Record<string, unknown>;
}

/**
 * Respuesta genérica de una operación de IA.
 * Usa un discriminated union para facilitar el manejo de errores:
 *
 *   if (res.ok) { ... } else { ... }
 */
export type AiResponse =
  | { ok: true; value: AiSuccessValue }
  | { ok: false; error: AiError };

/**
 * Opciones específicas para la llamada de bajo nivel al proveedor
 * (usadas por el cliente LLM `callModel`).
 */
export interface CallModelOptions {
  /** Override de modelo; si no se pasa se usa la env ARIADNA_AI_MODEL. */
  model?: string;
  /** API key; si no se pasa se usa la env ARIADNA_AI_API_KEY. */
  apiKey?: string;
  /**
   * URL del endpoint del proveedor compatible con Chat Completions.
   * Si no se pasa se usa ARIADNA_AI_BASE_URL o el default.
   */
  baseUrl?: string;
  /** Prompt de sistema (rol "system"). */
  systemPrompt?: string;
  /** Temperatura del modelo. */
  temperature?: number;
  /** Tokens máximos de salida. */
  maxTokens?: number;
  /** Timeout en milisegundos (default configurable en el cliente). */
  timeoutMs?: number;
}

/* -------------------------------------------------------------------------- */
/*  Interfaz de proveedor genérico                                            */
/* -------------------------------------------------------------------------- */

/**
 * Interfaz mínima que debe cumplir un proveedor de IA.
 *
 * Esto permite:
 * - cambiar de OpenAI a otro backend sin tocar el resto del código,
 * - mockear fácilmente en tests (inyectar un proveedor fake).
 */
export interface AiProvider {
  /**
   * Genera texto a partir de una petición de IA.
   *
   * @param request  Información lógica de la petición (prompt, temperatura, etc.).
   * @returns        AiResponse con texto, tokens y metadata básica.
   */
  generate(request: AiRequest): Promise<AiResponse>;
}

/* -------------------------------------------------------------------------- */
/*  Tipos para coach / explicaciones                                          */
/* -------------------------------------------------------------------------- */

/**
 * Paso opcional dentro de una explicación de coach.
 * Por ejemplo: "Paso 1: analiza el input", "Paso 2: piensa en un caso base".
 */
export interface CoachStep {
  /** Título corto del paso (opcional). */
  title?: string;
  /** Descripción o explicación del paso. */
  description: string;
}

/**
 * Explicación generada por el "coach" de programación.
 * No depende de ningún proveedor específico.
 */
export interface CoachExplanation {
  /** Resumen principal de la explicación. */
  summary: string;
  /** Lista opcional de pasos estructurados. */
  steps?: CoachStep[];
  /** Metadatos adicionales (nivel, dificultad, tags, etc.). */
  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/*  Tipos para hints / pistas                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Nivel de intensidad de la pista (para no revelar demasiado).
 */
export type HintLevel = 'light' | 'medium' | 'strong';

/**
 * Pista corta para ayudar al usuario sin revelar la solución completa.
 */
export interface HintSuggestion {
  /** Texto de la pista. */
  hint: string;
  /** Intensidad de la pista (light/medium/strong). */
  level: HintLevel;
  /** Metadatos adicionales (por ejemplo, etiqueta de tema o subtarea). */
  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/*  Contrato base para refine-k                                               */
/* -------------------------------------------------------------------------- */

/**
 * Request genérico que refine-k podría usar para proponer mejores prompts
 * o variaciones a partir de intentos previos.
 */
export interface RefineKRequest {
  /** Prompt original o descripción del problema. */
  originalPrompt: string;
  /** Intentos anteriores (por ejemplo, soluciones previas o prompts antiguos). */
  previousAttempts: string[];
  /** Número de variantes/refinamientos deseados. */
  k: number;
  /** Metadatos opcionales (id de usuario, id de ejercicio, etc.). */
  metadata?: Record<string, unknown>;
}

/**
 * Una sugerencia/refinamiento producido por refine-k.
 */
export interface RefineKSuggestion {
  /** Identificador lógico de la sugerencia. */
  id: string;
  /** Nuevo prompt o instrucción refinada. */
  prompt: string;
  /** Razonamiento opcional de por qué se propone este refinamiento. */
  rationale?: string;
}

/**
 * Resultado de una operación refine-k.
 */
export interface RefineKResult {
  /** Lista de sugerencias/refinamientos generados. */
  suggestions: RefineKSuggestion[];
  /** Metadatos adicionales. */
  metadata?: Record<string, unknown>;
}