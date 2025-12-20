export type TestVerdict = 'AC' | 'WA' | 'TLE' | 'RE';

export type SubmissionVerdict = TestVerdict | 'CE';

export interface SingleTestResult {
  index: number;
  verdict: TestVerdict;
  timeMs: number;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface JudgeSuccess {
  ok: true;
  sessionId: string;
  imageTag: string;
  verdict: TestVerdict;
  tests: SingleTestResult[];
}

export interface JudgeInfraError {
  ok: false;
  sessionId: string;
  imageTag: string;
  kind: 'INFRA';
  message: string;
}

export type JudgeResult = JudgeSuccess | JudgeInfraError;
