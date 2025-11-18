export interface CompileRequest {
  source: string;
  flags: string[];
  sessionId: string;
}

export interface WorkdirInfo {
  hostPath: string;
  containerPath: string;
}

export interface BinaryInfo {
  hostPath: string;
  containerPath: string;
  filename: string;
}

export type ErrorKind = 'CE' | 'TIMEOUT' | 'OOM' | 'INFRA';

export interface CompileLimits {
  timeoutMs: number;
  memoryMB: number;
  cpus: number;
  pidsLimit: number;
}

export interface CompileResultOK {
  ok: true;
  sessionId: string;
  imageTag: string;
  compileMs: number;
  workdir: WorkdirInfo;
  binary: BinaryInfo;
  binaryPath: string;      
  warnings?: string;       
}

export interface CompileResultError {
  ok: false;
  kind: ErrorKind;
  stderr: string;
  exitCode?: number | null;
  imageTag: string;
  sessionId: string;
}

export interface DockerCompileSuccess {
  ok: true;
  workdir: WorkdirInfo;
  binary: BinaryInfo;
  warnings?: string;
}

export type CompileResult = CompileResultOK | CompileResultError;
