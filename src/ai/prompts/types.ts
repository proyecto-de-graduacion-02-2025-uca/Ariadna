// src/ai/prompts/types.ts

/**
 * Tipos exclusivos para los prompts del módulo de IA (coach, hints, refine).
 *
 * Objetivo:
 * - Mantener los prompts completamente desacoplados del sistema global de IA.
 * - Permitir testear los prompts sin depender del motor LLM.
 * - Evitar dependencias con sandbox/juez (todo llega como string).
 */

/* -------------------------------------------------------------------------- */
/*  Contenedor base utilizado por todos los prompts                           */
/* -------------------------------------------------------------------------- */

/**
 * BasePromptContext
 * -----------------
 * Describe la información mínima necesaria para construir prompts
 * para problemas de programación competitiva.
 *
 * NO depende del sandbox ni del juez.
 * NO usa tipos del sistema global de IA.
 * Todo dato debe llegar ya convertido a strings.
 */
export interface BasePromptContext {
  /** Resumen textual del enunciado del problema. */
  problemStatement: string;

  /** Ejemplos relevantes de entrada/salida como texto. */
  examples: string;

  /** Veredicto textual: AC, WA, RE, TLE, MLE, CE, etc. */
  verdict: string;

  /** Límites computacionales del problema. */
  timeLimitMs?: number;
  memoryLimitMB?: number;

  /** Información opcional de debugging. */
  stderr?: string;
  failingTestInput?: string;
  expectedOutput?: string;
  userOutput?: string;

  /** Código fuente enviado por el usuario (cuando es relevante). */
  userCode?: string;
}

/* -------------------------------------------------------------------------- */
/*  Contexto especializado para COACH                                         */
/* -------------------------------------------------------------------------- */

/**
 * CoachContext
 * -------------
 * Utilizado por el coach para explicar *por qué falló la solución*,
 * con estructura en 3 niveles (idea → análisis → verificación).
 *
 * Puede incluir código, pero no es obligatorio.
 */
export interface CoachContext extends BasePromptContext {
  userCode?: string;
}

/* -------------------------------------------------------------------------- */
/*  Contexto especializado para HINTS                                         */
/* -------------------------------------------------------------------------- */

/**
 * HintsContext
 * -------------
 * Utilizado por el generador de pistas graduales.
 * No requiere código ni feedback previo.
 */
export interface HintsContext extends BasePromptContext { }

/* -------------------------------------------------------------------------- */
/*  Contexto especializado para REFINE                                        */
/* -------------------------------------------------------------------------- */

/**
 * RefineContext
 * -------------
 * Contexto requerido para refinar el código:
 * - Usa feedback previo del coach.
 * - El código del usuario es obligatorio.
 */
export interface RefineContext extends BasePromptContext {
  previousFeedback: string;
  userCode: string;
}
