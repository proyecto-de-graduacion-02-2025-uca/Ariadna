// src/ai/prompts/hints.prompt.ts
import type { HintsContext } from "./types";

/**
 * buildHintsPrompt
 * ----------------
 * Genera 3 pistas graduadas:
 *
 *  Hint 1: Conceptual — mínima ayuda
 *  Hint 2: Direccional — señala aspectos del enfoque correcto
 *  Hint 3: Técnica — guía clara SIN revelar solución ni pseudo-código
 *
 * Diseñado para evitar que el modelo dé respuestas completas.
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
You are an ICPC-level tutoring assistant. Your task is to produce **gradual hints**,
NOT the solution.

## Problem Summary
${problemStatement}

## Examples
${examples}

## Submission Status
Verdict: ${verdict}
${failingTestInput ? `Failing input:\n${failingTestInput}` : ""}
${expectedOutput ? `Expected:\n${expectedOutput}` : ""}
${userOutput ? `Got:\n${userOutput}` : ""}

Time limit: ${timeLimitMs} ms  
Memory limit: ${memoryLimitMB} MB

## Hinting Rules (IMPORTANT)
- Provide **exactly 3 hints**, each more detailed than the previous.
- Do NOT give code or pseudo-code.
- Do NOT reveal the algorithm directly.
- Always respect constraints (time and memory).
- Focus on conceptual reasoning and key observations.

## Output Format
Hint 1: ...
Hint 2: ...
Hint 3: ...
`;
}
