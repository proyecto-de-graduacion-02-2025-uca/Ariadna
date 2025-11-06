import { validateFlags } from './policy.flags';
import { prepareWorkdir } from './workdir';
import { runDockerCompiler } from './docker';
import { CompileRequest, CompileResult } from './types';
import { imageTag } from './images';

export async function compileCpp(request: CompileRequest): Promise<CompileResult> {
  const { sourceCode, flags, sessionId } = request;

  if (!validateFlags(flags)) {
    return {
      ok: false,
      kind: 'CE',
      stderr: 'Invalid compiler flags',
      imageTag,
      sessionId
    };
  }

  const workdir = prepareWorkdir(sessionId, sourceCode);
  const start = Date.now();
  const result = await runDockerCompiler(workdir, flags, sessionId);
  const compileMs = Date.now() - start;

  if (result.ok) {
    return {
      ok: true,
      binaryPath: result.binaryPath ?? "",
      compileMs,
      imageTag,
      sessionId
    };
  } else {
    return {
      ok: false,
      kind: 'CE',
      stderr: result.stderr ?? "",
      exitCode: result.exitCode,
      imageTag,
      sessionId
    };
  }
}