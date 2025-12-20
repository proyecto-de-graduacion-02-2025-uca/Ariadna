// src/pipeline/refine-entry.ts

import { validateEntry } from '../entry/index';
import type { EntryErr } from '../types/public';
import type { ProblemSpec } from '../spec/problem.schema';
import { runRefineK } from '../ai/refine/refine-runner';
import type { RefineSolveResult } from '../ai/refine/types';

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

export type RefineFromEntryInput = {
  problem: unknown;
  submission: unknown;
};

export async function refineFromEntry(
  input: RefineFromEntryInput,
  opts?: { maxCandidates?: number }
): Promise<RefineSolveResult | EntryErr> {
  const res = validateEntry(input);
  if (!res.ok) return res;

  const { problem, submission } = res.value as {
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

  // Refine-k (usa IA + judge para elegir el mejor candidato)
  return await runRefineK({
    problem,
    initialCode: source,
    language: submission.language ?? 'cpp17',
    maxCandidates: opts?.maxCandidates,
  });
}

/**
 * Helper estilo "checkEntry..." (solo para dev/debug).
 * Devuelve `true` si el ganador termina en AC, si no `false`.
 */
export async function checkEntryAndRefine(
  input: RefineFromEntryInput,
  opts?: { maxCandidates?: number }
): Promise<boolean> {
  const result = await refineFromEntry(input, opts);

  if ('issues' in result) {
    console.error('[Ariadna] INVALID ENTRY:');
    for (const i of result.issues) {
      console.error(`  - ${i.path}: ${i.message}`);
    }
    return false;
  }

  const baselineVerdict = result.baseline?.judge?.verdict ?? 'UNKNOWN';
  const winnerVerdict = result.winner?.judge?.verdict ?? 'UNKNOWN';

  console.log(`[Ariadna] REFINE RESULT • baseline=${baselineVerdict} winner=${winnerVerdict}`);
  if (result.improvement?.summary) {
    console.log(`[Ariadna] improvement: ${result.improvement.summary}`);
  }


  return winnerVerdict === 'AC';
}
