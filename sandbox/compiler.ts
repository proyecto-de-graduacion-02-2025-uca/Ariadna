import { validateFlags } from './policy.flags';
import { prepareWorkdir } from './workdir';
import { runDockerCompiler } from './docker';
import { CompileRequest, CompileResult } from './types';
import { dockerConfig } from './configs';

/**
 * Función principal para compilar código C++.
 * 
 * Toma el código fuente y flags, valida las flags, prepara un directorio de trabajo
 * temporal, ejecuta la compilación dentro de un contenedor Docker efimero y devuelve
 * el resultado de la compilacion con informacion de exito o error.
 */
export async function compileCpp(request: CompileRequest): Promise<CompileResult> {
  const { sourceCode, flags, sessionId } = request;

  if (!validateFlags(flags)) {
    return {
      ok: false,
      kind: 'CE',
      stderr: 'Invalid compiler flags',
      imageTag: dockerConfig.image,
      sessionId
    };
  }

  const workdir = prepareWorkdir(sourceCode);
  const start = Date.now();
  const result = await runDockerCompiler(workdir, flags, sessionId);
  const compileMs = Date.now() - start;

  if (result.ok) {
    return {
      ok: true,
      binaryPath: result.binaryPath ?? "",
      compileMs,
      imageTag: dockerConfig.image,
      sessionId
    };
  } else {
    return {
      ok: false,
      kind: result.kind,
      stderr: result.stderr ?? "Unknown error",
      exitCode: result.exitCode,
      imageTag: dockerConfig.image,
      sessionId
    };
  }
}