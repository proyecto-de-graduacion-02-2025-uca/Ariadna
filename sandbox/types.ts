export interface CompileRequest {
  sourceCode: string;
  flags: string[];
  sessionId: string;
}

export interface CompileResultOK {
  ok: true;
  binaryPath: string;
  compileMs: number;
  stderr?: string;
  imageTag: string;
  sessionId: string;
}

export interface CompileResultError {
  ok: false;
  kind: 'CE' | 'TIMEOUT' | 'OOM' | 'INFRA';
  stderr: string;
  exitCode?: number | null;
  imageTag: string;
  sessionId: string;
}

export type CompileResult = CompileResultOK | CompileResultError;