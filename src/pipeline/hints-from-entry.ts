import { validateEntry } from '../entry/index';
import type { EntryErr } from '../types/public';
import type { ProblemSpec } from '../spec/problem.schema';

import { compileCpp } from '../sandbox/compiler';
import { sanitizeFlags } from '../sandbox/policy.flags';
import type { CompileResult, CompileResultOK } from '../sandbox/types';

import { runJudge } from '../judge/runner';
import type { JudgeResult, JudgeSuccess, SingleTestResult } from '../judge/types';

import { runCoachHints } from '../ai/coach/hints-runner';
import type { HintSuggestion } from '../ai/types';
import type { HintsContext } from '../ai/prompts/types';

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

function formatSamples(problem: ProblemSpec): string {
  const samples = problem.dataset?.samples ?? [];
  if (!samples.length) return '(sin ejemplos)';

  return samples
    .map((s, i) => {
      const id = s.id ? ` (${s.id})` : '';
      return `Ejemplo ${i + 1}${id}\nInput:\n${s.in}\nOutput:\n${s.out}\n`;
    })
    .join('\n');
}

function verdictFromCompileKind(kind: string): string {
  if (kind === 'CE') return 'CE';
  if (kind === 'TIMEOUT') return 'TLE';
  if (kind === 'OOM') return 'RE';
  return 'RE';
}

function firstNonACTest(res: JudgeSuccess): SingleTestResult | undefined {
  return res.tests.find((t) => t.verdict !== 'AC');
}

export type HintsFromEntryInput = {
  problem: unknown;
  submission: unknown;
};

export type HintsFromEntryOk = {
  ok: true;
  sessionId: string;
  verdict: string;
  hints: HintSuggestion[];
};

export type HintsFromEntryResult = EntryErr | HintsFromEntryOk;

export async function hintsFromEntry(
  input: HintsFromEntryInput
): Promise<HintsFromEntryResult> {
  const entry = validateEntry(input);
  if (!entry.ok) return entry;

  const { problem, submission, sessionId } = entry.value as {
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

  const baseCtx: Omit<HintsContext, 'verdict'> = {
    problemStatement: problem.statement,
    examples: formatSamples(problem),
    timeLimitMs: problem.limits.timeMs,
    memoryLimitMB: problem.limits.memoryMB,
  };

  // 1) COMPILE
  const compileResult: CompileResult = await compileCpp({
    sessionId,
    source,
    flags: allowed,
  });

  if (!compileResult.ok) {
    const verdict = verdictFromCompileKind(compileResult.kind);

    const ctx: HintsContext = {
      ...baseCtx,
      verdict,
      stderr: compileResult.stderr || undefined,
    };

    const hints = await runCoachHints(ctx);
    return { ok: true, sessionId, verdict, hints };
  }

  const compileOk: CompileResultOK = compileResult;

  // 2) JUDGE
  const judgeResult: JudgeResult = await runJudge({
    problem,
    compile: compileOk,
  });

  // INFRA del judge -> devolvemos hints igual (verdict string)
  if (!judgeResult.ok) {
    const verdict = 'INFRA';
    const ctx: HintsContext = {
      ...baseCtx,
      verdict,
      stderr: judgeResult.message || 'Judge infrastructure error',
    };

    const hints = await runCoachHints(ctx);
    return { ok: true, sessionId, verdict, hints };
  }

  const verdict = judgeResult.verdict;
  const failing = firstNonACTest(judgeResult);

  let failingTestInput: string | undefined;
  let expectedOutput: string | undefined;
  let userOutput: string | undefined;
  let stderr: string | undefined;

  if (failing) {
    const tc = problem.dataset.tests?.[failing.index];
    failingTestInput = tc?.in;
    expectedOutput = tc?.out;
    userOutput = failing.stdout;
    stderr = failing.stderr?.trim() ? failing.stderr : undefined;
  }

  const ctx: HintsContext = {
    ...baseCtx,
    verdict,
    failingTestInput,
    expectedOutput,
    userOutput,
    stderr,
  };

  const hints = await runCoachHints(ctx);
  return { ok: true, sessionId, verdict, hints };
}

export async function checkEntryAndHints(input: HintsFromEntryInput): Promise<boolean> {
  const result = await hintsFromEntry(input);

  if ('issues' in result) {
    console.error('[Ariadna] INVALID ENTRY:');
    for (const i of result.issues) {
      console.error(`  - ${i.path}: ${i.message}`);
    }
    return false;
  }

  console.log(`[Ariadna] HINTS • verdict=${result.verdict} • session=${result.sessionId}`);
  result.hints.forEach((h, idx) => {
    console.log(`  Pista ${idx + 1} (${h.level}): ${h.hint}`);
  });

  return true;
}
