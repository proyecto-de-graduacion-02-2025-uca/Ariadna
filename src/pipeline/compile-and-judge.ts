// src/pipeline/compile-and-judge.ts

import { validateEntry } from '../entry/index';
import { compileCpp } from '../sandbox/compiler';
import { sanitizeFlags } from '../sandbox/policy.flags';

import type { EntryErr } from '../types/public';
import type { ProblemSpec } from '../spec/problem.schema';
import type {
  CompileResult,
  CompileResultOK,
} from '../sandbox/types';
import type { JudgeResult } from '../judge/types';
import { runJudge } from '../judge/runner';

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

export type FullPipelineResult = EntryErr | CompileResult | JudgeResult;

export type CompileAndJudgeInput = {
  problem: unknown;
  submission: unknown;
};

export async function compileAndJudgeFromEntry(
  input: CompileAndJudgeInput
): Promise<FullPipelineResult> {
  const res = validateEntry(input);
  if (!res.ok) {
    return res; 
  }

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
      issues: [
        { path: 'submission.source', message: 'missing source code' },
      ],
    };
    return err;
  }

  const defaultFlags = ['-std=gnu++17', '-O2', '-pipe'];
  const { allowed, invalid } = sanitizeFlags(defaultFlags);
  if (invalid.length > 0) {
    const err: EntryErr = {
      ok: false,
      issues: [
        {
          path: 'submission.flags',
          message: `invalid default flags: ${invalid.join(' ')}`,
        },
      ],
    };
    return err;
  }

  const compileResult: CompileResult = await compileCpp({
    sessionId,
    source,
    flags: allowed,
  });

  if (!compileResult.ok) {
    return compileResult;
  }

  const compileOk: CompileResultOK = compileResult;

  const judgeResult: JudgeResult = await runJudge({
    problem,
    compile: compileOk,
  });

  return judgeResult;
}


export async function checkEntryCompileAndJudge(
  input: CompileAndJudgeInput
): Promise<boolean> {
  const result = await compileAndJudgeFromEntry(input);

  if ('issues' in result) {
    console.error('[Ariadna] INVALID ENTRY:');
    for (const i of result.issues) {
      console.error(`  - ${i.path}: ${i.message}`);
    }
    return false;
  }

  if ('tests' in result) {
    console.log(
      `[Ariadna] JUDGE RESULT • verdict=${result.verdict} • session=${result.sessionId}`
    );
    result.tests.forEach((t) => {
      console.log(
        `  [test #${t.index}] verdict=${t.verdict} time=${t.timeMs}ms exit=${t.exitCode}`
      );
    });
    return result.verdict === 'AC';
  }

  if (!result.ok) {
    const isCompileError = 'exitCode' in result;
    const phase = isCompileError ? 'COMPILE FAIL' : 'JUDGE INFRA FAIL';
    const exit = isCompileError ? (result as any).exitCode : 'n/a';
    console.error(
      `[Ariadna] ${phase} • session=${result.sessionId} • kind=${result.kind} • exit=${exit}`
    );
    if ('stderr' in result && typeof result.stderr === 'string' && result.stderr.trim()) {
      console.error(result.stderr);
    }
    return false;
  }

  console.log(
    `[Ariadna] COMPILE OK (sin judge) • session=${result.sessionId} • ms=${result.compileMs}`
  );
  return true;
}
