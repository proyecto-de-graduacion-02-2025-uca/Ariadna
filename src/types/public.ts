export type { ProblemSpec } from '../spec/problem.schema';
export type { Submission } from '../spec/submission.schema';
export type { Limits } from '../spec/limits.schema';

export type EntryOk<TSpec, TSub> = { ok: true; value: { problem: TSpec; submission: TSub; sessionId: string } };
export type EntryErr = { ok: false; issues: { path: string; message: string; code?: string }[] };
export type EntryResult<TSpec, TSub> = EntryOk<TSpec, TSub> | EntryErr;
