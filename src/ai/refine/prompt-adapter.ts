// src/ai/refine/prompt-adapter.ts

import { buildRefinePrompt as buildRefineStringPrompt } from '../prompts/refine.prompt';
import type { RefineContext } from '../prompts/types';
import type { RefinePrompt, RefinePromptContext } from './types';

function formatExamples(problem: RefinePromptContext['problem']): string {
  const ex = problem.examples ?? [];
  if (!ex.length) return '(sin ejemplos)';

  return ex
    .map((e, i) => {
      const exp = e.explanation ? `\nExplicación:\n${e.explanation}` : '';
      return `Ejemplo ${i + 1}\nInput:\n${e.input}\nOutput:\n${e.output}${exp}\n`;
    })
    .join('\n');
}

function summarizePreviousFeedback(previousAttempts: RefinePromptContext['previousAttempts']): string {
  if (!previousAttempts.length) return '(sin feedback previo)';

  const last = previousAttempts[previousAttempts.length - 1];

  if (last.aiError) {
    return `El intento anterior falló por error del modelo: ${last.aiError.message}`;
  }

  if (!last.judge) {
    return 'No hay resultados del judge del intento anterior.';
  }

  const j = last.judge;
  const parts: string[] = [];
  parts.push(`Último veredicto: ${j.verdict}`);
  parts.push(`Tests: ${j.testsPassed}/${j.testsTotal}`);

  if (j.compileStderr) parts.push(`compile stderr:\n${j.compileStderr}`);
  if (j.runStderr) parts.push(`runtime stderr:\n${j.runStderr}`);
  if (j.timeMsMax != null) parts.push(`timeMsMax: ${j.timeMsMax}`);

  if (j.failingTestIndex != null) parts.push(`failingTestIndex: ${j.failingTestIndex}`);

  return parts.join('\n\n');
}

function buildCombinedStderr(judge?: { compileStderr?: string; runStderr?: string }): string | undefined {
  if (!judge) return undefined;
  const parts: string[] = [];
  if (judge.compileStderr?.trim()) parts.push(`compile stderr:\n${judge.compileStderr}`);
  if (judge.runStderr?.trim()) parts.push(`runtime stderr:\n${judge.runStderr}`);
  const out = parts.join('\n\n').trim();
  return out.length ? out : undefined;
}

export function buildRefinePrompt(
  ctx: RefinePromptContext,
  opts?: { systemPrompt?: string }
): RefinePrompt {
  const last = ctx.previousAttempts.length ? ctx.previousAttempts[ctx.previousAttempts.length - 1] : undefined;

  const lastCode = last?.source ?? '';

  const lastJudge = last?.judge;

  const refineCtx: RefineContext = {
    problemStatement: ctx.problem.statement,
    examples: formatExamples(ctx.problem),

    verdict: lastJudge?.verdict ?? 'UNKNOWN',

    stderr: buildCombinedStderr(lastJudge),

    failingTestInput: lastJudge?.failingTestInput,
    expectedOutput: lastJudge?.expectedOutput,
    userOutput: lastJudge?.userOutput,

    previousFeedback: summarizePreviousFeedback(ctx.previousAttempts),
    userCode: lastCode,

    timeLimitMs: ctx.problem.limits?.timeMs,
    memoryLimitMB: ctx.problem.limits?.memoryMB,
  };

  const userPrompt = buildRefineStringPrompt(refineCtx);

  return {
    userPrompt,
    systemPrompt: opts?.systemPrompt,
  };
}
