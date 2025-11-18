import { sanitizeFlags } from './policy.flags';
import { prepareWorkdir } from './workdir';
import { runDockerCompiler } from './docker';
import type { CompileRequest, CompileResult } from './types';
import { dockerConfig } from './configs';

export async function compileCpp(req: CompileRequest): Promise<CompileResult> {
  const { source, flags, sessionId } = req;

  const { allowed, invalid } = sanitizeFlags(flags);
  if (invalid.length > 0) {
    return {
      ok: false,
      kind: 'CE',
      stderr: `Invalid compiler flags: ${invalid.join(' ')}`,
      imageTag: dockerConfig.image,
      sessionId,
    };
  }

  const prepared = prepareWorkdir(source, sessionId);

  const t0 = Date.now();
  const result = runDockerCompiler(prepared.workdir, prepared.binary, allowed, sessionId);
  const compileMs = Date.now() - t0;

  if (result.ok) {
    return {
      ok: true,
      sessionId,
      imageTag: dockerConfig.image,
      compileMs,

      workdir: result.workdir,
      binary: result.binary,

      binaryPath: result.binary.hostPath,
      warnings: result.warnings,
    };
  }

  return {
    ok: false,
    kind: result.kind,
    stderr: result.stderr ?? 'Unknown error',
    exitCode: result.exitCode,
    imageTag: dockerConfig.image,
    sessionId,
  };
}
