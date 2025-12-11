export interface CoachExplainContext {
  problemSummary: string;
  lastSubmission?: string;
  verdict?: string;
  errorType?: string;
  failedTest?: string;
  stderr?: string;
}

export interface CoachHintsContext {
  problemSummary: string;
  lastSubmission?: string;
  verdict?: string;
  failedTest?: string;
}
