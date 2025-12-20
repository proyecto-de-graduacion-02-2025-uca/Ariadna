// src/ai/refine/run-candidate.ts

import { compileCpp } from '../../sandbox/compiler';
import { sanitizeFlags } from '../../sandbox/policy.flags';
import { runJudge } from '../../judge/runner';
import type { RefineCandidateJudgeSummary } from './types';
import type { ProblemSpec } from '../../spec/problem.schema';
import type { CompileResultError } from '../../sandbox/types';
import type { JudgeInfraError, JudgeSuccess, SingleTestResult, TestVerdict } from '../../judge/types';

export async function runCandidate(params: {
  problem: ProblemSpec;
  source: string;
  sessionId: string;
}): Promise<RefineCandidateJudgeSummary> {
  const { problem, source, sessionId } = params;

  const defaultFlags = ['-std=gnu++17', '-O2', '-pipe'];
  const { allowed, invalid } = sanitizeFlags(defaultFlags);
  if (invalid.length) {
    throw new Error(`Invalid default flags: ${invalid.join(' ')}`);
  }

  // 1) COMPILE
  const compileResult = await compileCpp({
    sessionId,
    source,
    flags: allowed,
  });

  if (!compileResult.ok) {
    return compileErrorToSummary(compileResult);
  }

  // 2) JUDGE
  const judgeResult = await runJudge({
    problem,
    compile: compileResult,
  });

  if (!judgeResult.ok) {
    throw judgeInfraToError(judgeResult);
  }

  // 3) RESUMEN (✅ con detalles del test fallido)
  return judgeSuccessToSummary(judgeResult, problem);
}

function compileErrorToSummary(err: CompileResultError): RefineCandidateJudgeSummary {
  let verdict: RefineCandidateJudgeSummary['verdict'];

  switch (err.kind) {
    case 'TIMEOUT':
      verdict = 'TLE';
      break;
    case 'OOM':
      verdict = 'RE';
      break;
    case 'CE':
      verdict = 'CE';
      break;
    default:
      verdict = 'RE';
      break;
  }

  return {
    verdict,
    testsPassed: 0,
    testsTotal: 0,
    compileStderr: truncate(err.stderr),
  };
}

/**
 * Consistente con aggregateVerdict: TLE > RE > WA > AC
 * Devuelve el índice del primer test que explica el veredicto global.
 */
function pickFailingTestIndex(tests: SingleTestResult[]): number | undefined {
  const priority: TestVerdict[] = ['TLE', 'RE', 'WA'];
  for (const v of priority) {
    const t = tests.find((x) => x.verdict === v);
    if (t) return t.index;
  }
  return undefined; // todo AC
}

function judgeSuccessToSummary(res: JudgeSuccess, problem: ProblemSpec): RefineCandidateJudgeSummary {
  const tests = res.tests;
  const testsTotal = tests.length;
  const testsPassed = tests.filter((t) => t.verdict === 'AC').length;

  const timeMsValues = tests.map((t) => t.timeMs);
  const timeMsMax = timeMsValues.length ? Math.max(...timeMsValues) : undefined;
  const timeMsAvg = timeMsValues.length
    ? Math.round(timeMsValues.reduce((a, b) => a + b, 0) / timeMsValues.length)
    : undefined;

  const failingIndex = pickFailingTestIndex(tests);
  const failingTest = failingIndex != null ? tests.find((t) => t.index === failingIndex) : undefined;

  // dataset del problema para reconstruir input/expected
  const specTests = (problem as any)?.dataset?.tests as Array<{ in?: string; out?: string }> | undefined;
  const specTest = failingIndex != null && specTests ? specTests[failingIndex] : undefined;

  // stderr preferido: el del test fallido; si no, el primero no vacío
  const firstNonEmptyStderr = tests.find((t) => t.stderr && t.stderr.trim())?.stderr;
  const stderrPreferred =
    failingTest?.stderr && failingTest.stderr.trim() ? failingTest.stderr : firstNonEmptyStderr;

  return {
    verdict: res.verdict, // TestVerdict compatible con SubmissionVerdict
    testsPassed,
    testsTotal,
    timeMsAvg,
    timeMsMax,
    runStderr: stderrPreferred ? truncate(stderrPreferred) : undefined,

    failingTestIndex: failingIndex,
    failingTestInput: specTest?.in != null ? truncate(specTest.in) : undefined,
    expectedOutput: specTest?.out != null ? truncate(specTest.out) : undefined,
    userOutput: failingTest?.stdout != null ? truncate(failingTest.stdout) : undefined,
  };
}

function judgeInfraToError(err: JudgeInfraError): Error {
  const e = new Error(err.message || 'Judge infrastructure error');
  (e as any).kind = err.kind;
  (e as any).imageTag = err.imageTag;
  (e as any).sessionId = err.sessionId;
  return e;
}

function truncate(s?: string, max = 4096): string | undefined {
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max) : s;
}
