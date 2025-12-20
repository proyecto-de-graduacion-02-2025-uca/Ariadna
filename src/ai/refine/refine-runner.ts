import { aiRefineSolve } from './engine';
import { runCandidate as runCandidateReal } from './run-candidate';
import type { RefineSolveResult } from './types';
import type { ProblemSpec } from '../../spec/problem.schema';

export async function runRefineK(params: {
  problem: ProblemSpec;
  initialCode: string;
  language: string;
  maxCandidates?: number;
}): Promise<RefineSolveResult> {
  const {
    problem,
    initialCode,
    language,
    maxCandidates = 5,
  } = params;

  return aiRefineSolve({
    problem,
    language,
    maxCandidates,
    initialCode,

    runCandidate: async (source: string, attemptIndex: number) => {
      const sessionId = `refine_${Date.now()}_${attemptIndex}`;

      return await runCandidateReal({
        problem,
        source,
        sessionId,
      });
    },

    modelOptions: {
      temperature: 0.2,
      maxTokens: 1024,
    },

    systemPrompt:
      'Eres un experto en programación competitiva ICPC. Refina el código sin cambiar su estructura.',
  });
}