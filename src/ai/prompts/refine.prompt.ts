// src/ai/prompts/refine.prompt.ts
import type { RefineContext } from "../types";

/**
 * buildRefinePrompt
 * -----------------
 * Produce un pedido de refinación de código basado en:
 * - feedback previo del coach,
 * - veredicto y evidencias reales,
 * - constraints del problema.
 *
 * NO implementa refine-k — solo genera un único pedido de refinación.
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
You are an LLM specializing in improving competitive programming code.

## Problem Summary
${problemStatement}

## Examples
${examples}

## Last Verdict
${verdict}

${stderr ? `stderr:\n${stderr}\n` : ""}
${failingTestInput ? `Failing input:\n${failingTestInput}\n` : ""}
${expectedOutput ? `Expected:\n${expectedOutput}\n` : ""}
${userOutput ? `User output:\n${userOutput}\n` : ""}

## Feedback From Coach
${previousFeedback}

## User Code (to refine)
\`\`\`
${userCode}
\`\`\`

## Refinement Rules (FOLLOW STRICTLY)
1. Modify the user's code **minimally** — only what is necessary to fix correctness.
2. Preserve structure, variable names, and overall approach unless they fundamentally cannot work.
3. Do NOT rewrite everything from scratch.
4. Base corrections ONLY on:
   - stderr
   - failing input
   - expected vs actual output
   - constraints (time: ${timeLimitMs} ms, memory: ${memoryLimitMB} MB)
5. Do NOT invent new test cases.
6. Do NOT include explanations — output **only the final refined code**.
7. Ensure the refined version respects time/memory constraints.

## OUTPUT
Return ONLY the corrected code:
`;
}
