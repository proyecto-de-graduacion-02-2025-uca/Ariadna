// src/ai/prompts/refine.prompt.ts
import type { RefineContext } from "./types";

/**
 * buildRefinePrompt
 * -----------------
 * Construye un prompt para pedir al modelo una versión refinada del código del usuario,
 * corrigiendo errores detectados mediante el veredicto, stderr y los ejemplos fallidos.
 *
 * El objetivo es:
 *  - Mantener la estructura original del código.
 *  - Modificar solo lo necesario.
 *  - No inventar nuevos casos de prueba.
 *  - Asegurar que la solución respete límites de tiempo/memoria.
 *
 * Este prompt debe devolver **solo código**, sin explicaciones.
 */
export function buildRefinePrompt(ctx: RefineContext): string {
  const {
    problemStatement,
    examples,
    verdict,
    stderr,
    failingTestInput,
    expectedOutput,
    userOutput,
    previousFeedback,
    userCode,
    timeLimitMs,
    memoryLimitMB,
  } = ctx;

  return `
Eres un asistente encargado de **refinar código de programación competitiva**.

## Resumen del problema
${problemStatement}

## Ejemplos relevantes (I/O)
${examples}

## Información del último envío
Veredicto: ${verdict}
${stderr ? `stderr:\n${stderr}\n` : ""}
${failingTestInput ? `Entrada fallida:\n${failingTestInput}\n` : ""}
${expectedOutput ? `Salida esperada:\n${expectedOutput}\n` : ""}
${userOutput ? `Salida del usuario:\n${userOutput}\n` : ""}

## Retroalimentación previa del coach
${previousFeedback}

## Código del usuario (para refinar)
\`\`\`
${userCode}
\`\`\`

## Reglas estrictas para refinar el código
1. Mantén la estructura original del usuario.
2. Modifica solamente lo necesario para corregir el error.
3. No inventes casos de prueba nuevos.
4. No agregues comentarios ni explicaciones: **solo devuelve el código final corregido**.
5. Respeta estrictamente los límites:
   - Tiempo: ${timeLimitMs} ms
   - Memoria: ${memoryLimitMB} MB
6. No resuelvas el problema desde cero; corrige el enfoque actual.

## Salida esperada
Devuelve únicamente el código refinado, sin texto adicional.
`;
}

