// src/ai/prompts/coach.prompt.ts
import type { CoachContext } from "./types";

/**
 * buildCoachPrompt
 * ----------------
 * Construye un prompt de "coach" para explicar:
 * 1) Qué falló
 * 2) Por qué falló
 * 3) Qué debería considerar el usuario
 *
 * Basado en investigación sobre explicaciones de programación competitiva,
 * el coach debe estructurar la explicación en 3 niveles:
 *
 *  - Nivel 1: Idea general del problema
 *  - Nivel 2: Análisis del error y diferencias entre lo requerido vs lo que hace el código
 *  - Nivel 3: Validación contra constraints y casos borde
 *
 * Nunca devuelve código. Solo orientación conceptual y técnica.
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
You are an ICPC-level programming coach.

## Problem Summary
${problemStatement}

## Examples (I/O)
${examples}

## Submission Information
Verdict: ${verdict}
Time limit: ${timeLimitMs} ms
Memory limit: ${memoryLimitMB} MB

${stderr ? `stderr:\n${stderr}\n` : ""}
${failingTestInput ? `Failing input:\n${failingTestInput}\n` : ""}
${expectedOutput ? `Expected output:\n${expectedOutput}\n` : ""}
${userOutput ? `User output:\n${userOutput}\n` : ""}
${userCode ? `User's code snippet:\n${userCode}\n` : ""}

## Coaching Instructions (Follow STRICTLY)
Provide a concise, structured explanation using the following 3-level format:

### 1. Core Idea of the Problem
Explain in 2–3 sentences what the problem fundamentally requires.

### 2. Error Analysis (Most Important)
- Compare what the problem intends vs what the user's code actually does.  
- Identify the exact cause of the WA/RE/TLE or other verdict.  
- Highlight common pitfalls (off-by-one, overflow, incorrect loops, logic gaps).  
- DO NOT provide code.

### 3. Verification Against Constraints
- Explain how the mistake relates to time/memory limits or corner cases.
- Suggest the type of approach that would satisfy the constraints (e.g., O(N), sorting, DP), without revealing the full algorithm.

Keep the explanation **brief, precise, and non-verbose**.
`;
}
