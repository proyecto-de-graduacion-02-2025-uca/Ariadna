import { compileCpp } from './compiler';
export { compileCpp };

export type {
  CompileRequest,
  CompileResult,
  CompileResultOK,
  CompileResultError,
  DockerCompileSuccess,
  WorkdirInfo,
  BinaryInfo,
  ErrorKind,
  CompileLimits,
} from './types';

export async function handleCompileRequest(req: import('./types').CompileRequest) {
  return compileCpp(req);
}

export { sanitizeFlags, ALLOWED_FLAGS } from './policy.flags';
export { dockerConfig, workdirConfigs } from './configs';
