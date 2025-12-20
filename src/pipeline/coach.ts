
import { validateEntry } from '../entry/index';
import { compileCpp } from '../sandbox/compiler';
import { sanitizeFlags } from '../sandbox/policy.flags';
import { runJudge } from '../judge/runner';

import type { EntryErr } from '../types/public';
import type { ProblemSpec } from '../spec/problem.schema';
import type { CompileResult, CompileResultOK, CompileResultError } from '../sandbox/types';
import type { JudgeResult, JudgeSuccess, JudgeInfraError } from '../judge/types';

import { runCoachExplain } from '../ai/coach/explain-runner';
import type { CoachExplanation } from '../ai/types';
import type { CoachContext } from '../ai/prompts/types';

export type CoachFromEntryInput = {
  problem: unknown;
  submission: unknown;
};

export type CoachFromEntryOk = {
  ok: true;
  sessionId: string;
  verdict: string;
  explanation: CoachExplanation;

  // opcional: para debugging/consumo externo
  compile?: CompileResult;
  judge?: JudgeResult;
};

export type CoachFromEntryResult = EntryErr | CoachFromEntryOk;

function normalizeLanguage(lang: string): 'cpp' | 'unsupported' {
  const v = (lang || '').toLowerCase().replace(/\s+/g, '');
  if (['cpp', 'c++', 'c++17', 'gnu++17', 'cpp17'].includes(v)) return 'cpp';
  return 'unsupported';
}

function extractSource(submission: any): string | null {
  if (!submission) return null;
  if (typeof submission.source === 'string') return submission.source;
  if (typeof submission.code === 'string') return submission.code;
  return null;
}

function formatExamplesFromSamples(problem: ProblemSpec): string {
  const samples = problem.dataset?.samples ?? [];
  if (!samples.length) return '(sin ejemplos)';

  return samples
    .map((s, i) => {
      const id = s.id ? ` (${s.id})` : '';
      return `Ejemplo ${i + 1}${id}\nInput:\n${s.in}\nOutput:\n${s.out}\n`;
    })
    .join('\n');
}

function verdictFromCompileErrorKind(kind: CompileResultError['kind']): string {
  switch (kind) {
    case 'CE':
      return 'CE';
    case 'TIMEOUT':
      return 'TLE';
    case 'OOM':
      return 'RE';
    case 'INFRA':
      return 'INFRA';
    default:
      return 'CE';
  }
}

function buildCoachContext(params: {
  problem: ProblemSpec;
  source: string;
  verdict: string;
  compile?: CompileResult;
  judge?: JudgeResult;
}): CoachContext {
  const { problem, source, verdict, compile, judge } = params;

  const timeLimitMs = problem.limits?.timeMs;
  const memoryLimitMB = problem.limits?.memoryMB;

  let stderr: string | undefined;
  let failingTestInput: string | undefined;
  let expectedOutput: string | undefined;
  let userOutput: string | undefined;

  // 1) stderr desde compile si aplica
  if (compile && !compile.ok) {
    stderr = compile.stderr || undefined;
  }

  // 2) si hay judge
  if (judge) {
    if (!judge.ok) {
      // infra error del judge
      stderr = judge.message || stderr;
    } else {
      // si hay fallo, tratamos de extraer el primer test no-AC
      const failing = judge.tests.find(t => t.verdict !== 'AC');
      if (failing) {
        const tc = problem.dataset?.tests?.[failing.index];
        failingTestInput = tc?.in;
        expectedOutput = tc?.out;
        userOutput = failing.stdout;

        const runErr = failing.stderr?.trim() ? failing.stderr : undefined;
        const compileWarn =
          compile && compile.ok && compile.warnings?.trim() ? compile.warnings : undefined;

        // preferimos stderr del runtime; si no, warnings de compile
        stderr = runErr ?? compileWarn ?? stderr;
      } else {
        // no hay fallo (AC). igual podemos pasar warnings si existieran
        const compileWarn =
          compile && compile.ok && compile.warnings?.trim() ? compile.warnings : undefined;
        stderr = compileWarn ?? stderr;
      }
    }
  }

  return {
    problemStatement: problem.statement,
    examples: formatExamplesFromSamples(problem),
    verdict,
    timeLimitMs,
    memoryLimitMB,
    stderr,
    failingTestInput,
    expectedOutput,
    userOutput,
    userCode: source,
  };
}

export async function coachFromEntry(input: CoachFromEntryInput): Promise<CoachFromEntryResult> {
  const res = validateEntry(input);
  if (!res.ok) return res;

  const { problem, submission, sessionId } = res.value as {
    problem: ProblemSpec;
    submission: any;
    sessionId: string;
  };

  const lang = normalizeLanguage(submission.language);
  if (lang === 'unsupported') {
    const err: EntryErr = {
      ok: false,
      issues: [
        {
          path: 'submission.language',
          message: 'only C++ is supported in this stage (cpp/c++17/gnu++17)',
        },
      ],
    };
    return err;
  }

  const source = extractSource(submission);
  if (!source) {
    const err: EntryErr = {
      ok: false,
      issues: [{ path: 'submission.source', message: 'missing source code' }],
    };
    return err;
  }

  const defaultFlags = ['-std=gnu++17', '-O2', '-pipe'];
  const { allowed, invalid } = sanitizeFlags(defaultFlags);
  if (invalid.length > 0) {
    const err: EntryErr = {
      ok: false,
      issues: [
        { path: 'submission.flags', message: `invalid default flags: ${invalid.join(' ')}` },
      ],
    };
    return err;
  }

  // 1) COMPILE
  const compile: CompileResult = await compileCpp({
    sessionId,
    source,
    flags: allowed,
  });

  if (!compile.ok) {
    const verdict = verdictFromCompileErrorKind(compile.kind);

    const ctx = buildCoachContext({
      problem,
      source,
      verdict,
      compile,
      judge: undefined,
    });

    const explanation = await runCoachExplain(ctx);

    return {
      ok: true,
      sessionId,
      verdict,
      explanation,
      compile,
    };
  }

  const compileOk: CompileResultOK = compile;

  // 2) JUDGE
  const judge: JudgeResult = await runJudge({
    problem,
    compile: compileOk,
  });

  if (!judge.ok) {
    const verdict = 'INFRA';

    const ctx = buildCoachContext({
      problem,
      source,
      verdict,
      compile: compileOk,
      judge,
    });

    const explanation = await runCoachExplain(ctx);

    return {
      ok: true,
      sessionId,
      verdict,
      explanation,
      compile: compileOk,
      judge,
    };
  }

  // 3) COACH con resultado normal
  const judgeOk: JudgeSuccess = judge;
  const verdict = judgeOk.verdict;

  const ctx = buildCoachContext({
    problem,
    source,
    verdict,
    compile: compileOk,
    judge: judgeOk,
  });

  const explanation = await runCoachExplain(ctx);

  return {
    ok: true,
    sessionId,
    verdict,
    explanation,
    compile: compileOk,
    judge: judgeOk,
  };
}
