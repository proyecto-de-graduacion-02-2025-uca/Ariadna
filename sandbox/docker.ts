import { spawnSync, SpawnSyncReturns } from 'child_process';
import { dockerConfig, workdirConfigs } from './configs';
import { CompileResultError, CompileResultOK, DockerCompileSuccess } from './types';



export type DockerCompileResult = DockerCompileSuccess | CompileResultError;

/**
 * Ejecuta la compilación de código C++ dentro de un contenedor Docker efimero.
 *
 * Se encarga de:
 * - Montar el directorio de trabajo desde el host al contenedor.
 * - Aplicar límites de recursos y restricciones de seguridad.
 * - Ejecutar el compilador g++ con flags específicos.
 * - Intentar un fallback si falla la compilación estática.
 * - Clasificar errores en TIMEOUT, OOM, INFRA o CE.
 * - Devolver la ruta del binario compilado dentro del workdir.
 */
export function runDockerCompiler(
  workdir: string,
  flags: string[],
  sessionId: string
): DockerCompileResult {
  const compileCmd = ['g++', ...flags, '-static-pie', '-s', '-o', workdirConfigs.executableFileName, workdirConfigs.fileName];
  const fallbackCmd = ['g++', ...flags, '-s', '-o', workdirConfigs.executableFileName, workdirConfigs.fileName];

  const dockerArgs = [
    'run',
    '--rm',
    `--network=${dockerConfig.network}`,
    `--cpus=${dockerConfig.cpus}`,
    `--memory=${dockerConfig.memory}`,
    `--pids-limit=${dockerConfig.pidsLimit}`,
    dockerConfig.readOnly ? '--read-only' : '',
    '-v', `${workdir}:${dockerConfig.rootWork}:rw`,
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '-u', dockerConfig.user,
    '--tmpfs', dockerConfig.tmpfs,
    '-w', dockerConfig.rootWork,
    dockerConfig.image
  ].filter(arg => arg !== '');

  // Ejecutar compilacion principal con timeout
  const result: SpawnSyncReturns<Buffer> = spawnSync('docker', [...dockerArgs, ...compileCmd], {
    timeout: 30000
  });

  // Manejo de errores del sistema
  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;

    if (err.code === 'ETIMEDOUT') {
      return { ok: false, kind: 'TIMEOUT', stderr: '', exitCode: null, imageTag: dockerConfig.image, sessionId };
    }

    if (err.message.includes('ENOMEM')) {
      return { ok: false, kind: 'OOM', stderr: '', exitCode: null, imageTag: dockerConfig.image, sessionId };
    }
  }

  // Manejo de errores de infraestructura Docker
  if (result.status !== 0 && result.stderr) {
    const errMsg = result.stderr.toString();
    if (/pull access denied|not found|cannot connect to the Docker daemon/i.test(errMsg)) {
      return {
        ok: false,
        kind: 'INFRA',
        stderr: errMsg.slice(0, 8192),
        exitCode: result.status,
        imageTag: dockerConfig.image,
        sessionId
      };
    }
  }

  // Si el proceso terminó con error de compilación
  if (result.status !== 0) {
    const fallback = spawnSync('docker', [...dockerArgs, ...fallbackCmd], { timeout: 30000 });

    // Si compilacin falla, ejecuta fallback
    if (fallback.status !== 0) {
      return {
        ok: false,
        kind: 'CE',
        stderr: fallback.stderr.toString().slice(0, 8192),
        exitCode: fallback.status,
        imageTag: dockerConfig.image,
        sessionId
      };
    }
  }

  // Retornar exito con ruta al binario
  return {
    ok: true,
    binaryPath: `${workdir}${dockerConfig.rootWork}/${workdirConfigs.executableFileName}`
  };
}