// src/ai/refine/types.ts

import type { AiError, CallModelOptions } from '../types';
import type { SubmissionVerdict } from '../../judge/types';

export interface RefineProblemInfo {
  id?: string;
  title?: string;
  statement: string;
  inputFormat?: string;
  outputFormat?: string;

  limits?: {
    timeMs?: number;
    memoryMB?: number;
  };

  examples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
}

export interface RefineCandidateJudgeSummary {
  verdict: SubmissionVerdict;
  testsPassed: number;
  testsTotal: number;

  // Métricas opcionales
  timeMsAvg?: number;
  timeMsMax?: number;
  memoryKbAvg?: number;
  memoryKbMax?: number;

  // Mensajes LLM / debug
  compileStderr?: string;
  runStderr?: string;

  // Detalles del primer test que explica el veredicto global (TLE > RE > WA)
  failingTestIndex?: number;
  failingTestInput?: string;
  expectedOutput?: string;
  userOutput?: string;
}

/**
 * ✅ "aiRaw" liviano: NO guardamos el raw gigante del provider.
 * Solo lo útil para debug: texto + modelo + tokens.
 */
export interface RefineAiRawLite {
  text: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface RefineCandidateResult {
  attemptIndex: number;
  source: string;
  judge?: RefineCandidateJudgeSummary;
  aiError?: AiError;

  // ⚠️ antes era AiSuccessValue (incluía raw). Ahora es “lite”.
  aiRaw?: RefineAiRawLite;
}

export interface RefinePromptContext {
  problem: RefineProblemInfo;
  language: string;
  attemptIndex: number;
  previousAttempts: RefineCandidateResult[];
}

export interface RefinePrompt {
  userPrompt: string;
  systemPrompt?: string;
}

export type RefineModelOptions = Omit<CallModelOptions, 'systemPrompt'>;

export interface RefineSolveParams {
  problem: RefineProblemInfo;
  language: string;
  maxCandidates: number;

  runCandidate: (source: string, attemptIndex: number) => Promise<RefineCandidateJudgeSummary>;

  modelOptions?: RefineModelOptions;

  systemPrompt?: string;
  initialCode: string;
}

export type RefineStoppedReason = 'accepted' | 'maxCandidatesReached' | 'aiError' | 'noCandidates';

// src/ai/refine/types.ts

export interface RefineImprovementSummary {
  baselineVerdict?: SubmissionVerdict;
  winnerVerdict?: SubmissionVerdict;

  baselineTestsPassed?: number;
  baselineTestsTotal?: number;
  winnerTestsPassed?: number;
  winnerTestsTotal?: number;

  baselineTimeMsMax?: number;
  winnerTimeMsMax?: number;

  baselineAttemptIndex?: number;
  winnerAttemptIndex?: number;

  selectionReason?: string;
  codeDiff?: string;

  summary: string;
}


export interface RefineSolveResult {
  winner?: RefineCandidateResult;
  attempts: RefineCandidateResult[];
  stoppedReason: RefineStoppedReason;

  refinedCode: string;
  baseline?: RefineCandidateResult;

  improvement?: RefineImprovementSummary;
}
