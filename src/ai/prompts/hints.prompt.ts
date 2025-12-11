// src/ai/prompts/hints.prompt.ts
import type { HintsContext } from "./types";

/**
 * buildHintsPrompt
 * ----------------
 * Construye un prompt para generar **pistas graduales** (3 niveles)
 * sin revelar la solución completa ni escribir código.
 *
 * Las pistas deben ayudar al usuario a avanzar progresivamente:
 *  - Pista 1: Conceptual (muy general, mínima ayuda)
 *  - Pista 2: Direccional (en qué debería fijarse)
 *  - Pista 3: Técnica (orientación clara sin resolver)
 *
 * No debe generarse código ni pseudocódigo.
 */
export function buildHintsPrompt(ctx: HintsContext): string {
   const {
      problemStatement,
      examples,
      verdict,
      timeLimitMs,
      memoryLimitMB,
      failingTestInput,
      expectedOutput,
      userOutput,
   } = ctx;

   return `
Eres un asistente especializado en dar pistas para problemas de programación competitiva.
Tu objetivo es guiar al usuario SIN revelar la solución completa ni escribir código.

## Resumen del problema
${problemStatement}

## Ejemplos relevantes (I/O)
${examples}

## Estado del último envío
Veredicto: ${verdict}
${failingTestInput ? `Entrada que falló:\n${failingTestInput}` : ""}
${expectedOutput ? `\nSalida esperada:\n${expectedOutput}` : ""}
${userOutput ? `\nSalida del usuario:\n${userOutput}` : ""}

Límite de tiempo: ${timeLimitMs} ms  
Límite de memoria: ${memoryLimitMB} MB

## Instrucciones de generación de pistas
Debes producir **exactamente 3 pistas**, cada una más reveladora que la anterior:

1. **Pista 1 (muy ligera):**  
   Menciona un concepto general, un patrón o una observación del problema.  
   No nombres algoritmos concretos.

2. **Pista 2 (intermedia):**  
   Orienta sobre qué parte del razonamiento puede estar fallando el usuario  
   o qué estructura/comportamiento debería analizar.

3. **Pista 3 (fuerte pero sin solución):**  
   Indica la idea técnica que debería considerar, pero **sin describir el algoritmo completo**  
   ni dar pasos exactos.

Reglas rígidas:
- NO dar código.
- NO dar pseudocódigo.
- NO resolver explícitamente el problema.
- NO mencionar directamente una solución final.

## Formato de salida
Pista 1: ...
Pista 2: ...
Pista 3: ...
`;
}

