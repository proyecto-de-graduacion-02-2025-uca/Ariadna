import { compileCpp } from './compiler';
import { CompileRequest } from './types';

export async function handleCompileRequest(request: CompileRequest) {
  return await compileCpp(request);
}