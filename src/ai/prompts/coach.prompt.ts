import type { CoachContext } from "./types";

/**
 * Construye un prompt para que el modelo actúe como un “coach” de programación competitiva.
 * El contenido es exactamente el tuyo, solo ajustado para que el formatter lo procese bien.
 */
export function buildCoachPrompt(ctx: CoachContext): string {
  const {
    problemStatement,
    examples,
    verdict,
    timeLimitMs,
    memoryLimitMB,
    stderr,
    failingTestInput,
    expectedOutput,
    userOutput,
    userCode,
  } = ctx;

  return `
Eres un entrenador de programación competitiva con experiencia en ICPC.

Tu tarea es analizar el fallo del envío del usuario y explicar de forma breve, precisa y estructurada
la causa del error y cómo debe razonar para corregirlo.

Resumen del problema:
${problemStatement}

Ejemplos relevantes (I/O):
${examples}

Información del envío:
Veredicto: ${verdict}
Límite de tiempo: ${timeLimitMs} ms
Límite de memoria: ${memoryLimitMB} MB

${stderr ? `stderr:\n${stderr}\n` : ""}
${failingTestInput ? `Entrada que falló:\n${failingTestInput}\n` : ""}
${expectedOutput ? `Salida esperada:\n${expectedOutput}\n` : ""}
${userOutput ? `Salida del usuario:\n${userOutput}\n` : ""}
${userCode ? `Código del usuario:\n${userCode}\n` : ""}

Instrucciones para tu explicación:

1. Idea general del problema:
   Explica en 2–3 oraciones cuál es el objetivo central del ejercicio y qué tipo de razonamiento requiere.

2. Análisis del error:
   - Compara lo que el problema necesita con lo que hace el código del usuario.
   - Indica la causa principal del fallo según el veredicto (WA, RE, TLE, CE, etc.).
   - Señala errores comunes relacionados (casos borde, índices, lógica, overflow, etc.).
   - No proporciones la solución completa.

3. Verificación técnica:
   - Evalúa la solución frente a los límites de tiempo/memoria.
   - Explica si la complejidad usada es adecuada o no, y menciona riesgos de TLE o RE.
   - Sugiere el tipo de enfoque correcto (sin darlo explícitamente).

Genera tu análisis ahora siguiendo esta estructura.
  `.trim();
}
