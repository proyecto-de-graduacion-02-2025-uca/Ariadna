export { validateEntry, checkEntryAndLog } from './entry/index';
export type { EntryResult, EntryOk, EntryErr } from './types/public';
export type { ProblemSpec } from './spec/problem.schema';
export type { Submission } from './spec/submission.schema';
export type { Limits } from './spec/limits.schema';

// export judge
export { compileFromEntry, checkEntryAndCompile } from './pipeline/compile-entry';
export type { JudgeResult, SingleTestResult, TestVerdict } from './judge/types';
export { runJudge } from './judge/runner';

// export Coach
export { coachFromEntry } from './pipeline/coach';
export type { CoachFromEntryInput, CoachFromEntryOk, CoachFromEntryResult } from './pipeline/coach';

// export Hints
export { hintsFromEntry, checkEntryAndHints } from './pipeline/hints-from-entry';
export { runCoachHints } from './ai/coach/hints-runner';
export type { HintSuggestion, HintLevel } from './ai/types';

// export Refine
export { refineFromEntry, checkEntryAndRefine } from './pipeline/refine-entry';
export type {
  RefineSolveResult,
  RefineCandidateResult,
  RefineCandidateJudgeSummary,
  RefineImprovementSummary,
  RefineStoppedReason,
} from './ai/refine/types';




