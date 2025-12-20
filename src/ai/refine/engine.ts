// src/ai/refine/engine.ts

import { callModel } from '../ai-client';
import type { AiResponse } from '../types';
import type {
  RefineSolveParams,
  RefineSolveResult,
  RefineCandidateResult,
  RefineCandidateJudgeSummary,
  RefinePromptContext,
  RefinePrompt,
  RefineImprovementSummary,
} from './types';
import { buildRefinePrompt } from './prompt-adapter';

function extractCodeFromModelText(text: string): string {
  const fenced = text.match(/```(?:cpp|c\+\+|cxx|c)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  return text.trim();
}

function toAiRawLite(v: { text: string; model?: string; usage?: any }) {
  return {
    text: v.text,
    model: v.model,
    usage: v.usage,
  };
}


function selectBestCandidate(attempts: RefineCandidateResult[]): RefineCandidateResult | undefined {
  const withJudge = attempts.filter((a) => a.judge != null);
  if (withJudge.length === 0) return undefined;

  return withJudge.sort((a, b) => {
    const ja = a.judge!;
    const jb = b.judge!;

    // 1) testsPassed desc
    if (ja.testsPassed !== jb.testsPassed) return jb.testsPassed - ja.testsPassed;

    // 2) timeMsMax asc (si ambos lo tienen)
    if (ja.timeMsMax != null && jb.timeMsMax != null && ja.timeMsMax !== jb.timeMsMax) {
      return ja.timeMsMax - jb.timeMsMax;
    }

    // 3) attemptIndex asc (baseline gana empates)
    return a.attemptIndex - b.attemptIndex;
  })[0];
}

/**
 * Mini-diff “humano”: muestra la primera zona donde difieren.
 * No pretende ser un diff completo; es para entender “qué cambió” sin ruido.
 */
function buildMiniDiff(oldCode?: string, newCode?: string): string | undefined {
  if (!oldCode || !newCode) return undefined;

  const a = oldCode.replace(/\r\n/g, '\n');
  const b = newCode.replace(/\r\n/g, '\n');

  if (a.trim() === b.trim()) return undefined;

  const aLines = a.split('\n');
  const bLines = b.split('\n');

  let i = 0;
  while (i < aLines.length && i < bLines.length && aLines[i] === bLines[i]) i++;

  let aEnd = aLines.length - 1;
  let bEnd = bLines.length - 1;
  while (aEnd >= i && bEnd >= i && aLines[aEnd] === bLines[bEnd]) {
    aEnd--;
    bEnd--;
  }

  const take = 4; // máximo líneas “interesantes”
  const removed = aLines.slice(i, Math.min(aEnd + 1, i + take));
  const added = bLines.slice(i, Math.min(bEnd + 1, i + take));

  const out: string[] = [];
  out.push(`@@ line ${i + 1} @@`);
  for (const l of removed) out.push(`- ${l}`);
  for (const l of added) out.push(`+ ${l}`);

  return out.join('\n');
}

function improvementSummary(
  baselineAttempt?: RefineCandidateResult,
  winnerAttempt?: RefineCandidateResult
): RefineImprovementSummary | undefined {
  const baseline = baselineAttempt?.judge;
  const winner = winnerAttempt?.judge;
  if (!baseline || !winner) return undefined;

  const summaryParts: string[] = [];

  if (baseline.verdict !== winner.verdict) {
    summaryParts.push(`verdict: ${baseline.verdict} -> ${winner.verdict}`);
  } else {
    summaryParts.push(`verdict: ${winner.verdict}`);
  }

  summaryParts.push(`tests: ${winner.testsPassed}/${winner.testsTotal}`);

  if (baseline.timeMsMax != null && winner.timeMsMax != null) {
    const delta = winner.timeMsMax - baseline.timeMsMax;
    const sign = delta === 0 ? '' : delta > 0 ? '+' : '';
    summaryParts.push(`timeMsMax: ${baseline.timeMsMax} -> ${winner.timeMsMax} (${sign}${delta})`);
  }

  const selectionReason =
    `winner picked by: testsPassed DESC, then timeMsMax ASC (if present), then attemptIndex ASC`;

  const codeDiff = buildMiniDiff(baselineAttempt?.source, winnerAttempt?.source);

  return {
    baselineAttemptIndex: baselineAttempt?.attemptIndex,
    winnerAttemptIndex: winnerAttempt?.attemptIndex,

    baselineVerdict: baseline.verdict,
    winnerVerdict: winner.verdict,

    baselineTestsPassed: baseline.testsPassed,
    baselineTestsTotal: baseline.testsTotal,
    winnerTestsPassed: winner.testsPassed,
    winnerTestsTotal: winner.testsTotal,

    baselineTimeMsMax: baseline.timeMsMax,
    winnerTimeMsMax: winner.timeMsMax,

    selectionReason,
    codeDiff,

    summary: summaryParts.join(' • '),
  };
}

export async function aiRefineSolve(params: RefineSolveParams): Promise<RefineSolveResult> {
  const { problem, language, maxCandidates, runCandidate, modelOptions, initialCode } = params;

  const attempts: RefineCandidateResult[] = [{ attemptIndex: 0, source: initialCode }];

  // ===== 0) BASELINE JUDGE (attempt 0) =====
  try {
    const baselineJudge = await runCandidate(initialCode, 0);
    attempts[0].judge = baselineJudge;
  } catch (err) {
    attempts[0].aiError = {
      type: 'network',
      message: 'Error running baseline through judge pipeline.',
      details:
        err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : String(err),
    };

    return {
      winner: undefined,
      attempts,
      stoppedReason: 'aiError',
      refinedCode: initialCode,
      baseline: attempts[0],
      improvement: undefined,
    };
  }

  let stoppedReason: RefineSolveResult['stoppedReason'] = 'maxCandidatesReached';

  // ===== 1..K) CANDIDATES (SIEMPRE CORRER HASTA K, SIN CORTE TEMPRANO) =====
  for (let attemptIndex = 1; attemptIndex <= maxCandidates; attemptIndex++) {
    const ctx: RefinePromptContext = {
      problem,
      language,
      attemptIndex,
      previousAttempts: attempts,
    };

    const prompt: RefinePrompt = buildRefinePrompt(ctx, {
      systemPrompt: params.systemPrompt,
    });

    const aiRes: AiResponse = await callModel(prompt.userPrompt, {
      ...modelOptions,
      systemPrompt: prompt.systemPrompt,
    });

    if (!aiRes.ok) {
      attempts.push({
        attemptIndex,
        source: '',
        aiError: aiRes.error,
      });
      stoppedReason = 'aiError';
      break;
    }

    const aiValue = aiRes.value;
    const source = extractCodeFromModelText(aiValue.text);

    if (!source) {
      attempts.push({
        attemptIndex,
        source: '',
        aiRaw: toAiRawLite(aiValue),
      });
      continue; // seguimos intentando hasta K
    }

    let judgeSummary: RefineCandidateJudgeSummary;
    try {
      judgeSummary = await runCandidate(source, attemptIndex);
    } catch (err) {
      attempts.push({
        attemptIndex,
        source,
        aiRaw: toAiRawLite(aiValue),
        aiError: {
          type: 'network',
          message: 'Error running candidate through judge pipeline.',
          details:
            err instanceof Error
              ? { name: err.name, message: err.message, stack: err.stack }
              : String(err),
        },
      });
      stoppedReason = 'aiError';
      break;
    }

    attempts.push({
      attemptIndex,
      source,
      judge: judgeSummary,
      aiRaw: toAiRawLite(aiValue),
    });
  }

  // Elegimos el mejor entre baseline + candidatos que sí tienen judge
  const winner = selectBestCandidate(attempts) ?? attempts[0];
  const refinedCode = winner.source ?? initialCode;

  return {
    winner,
    attempts,
    stoppedReason,
    refinedCode,
    baseline: attempts[0],
    improvement: improvementSummary(attempts[0], winner),
  };
}
