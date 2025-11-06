import { spawnSync, SpawnSyncReturns } from 'child_process';
import { dockerLimits } from './limits';

// Definimos un tipo de resultado para claridad
interface DockerCompileSuccess {
  ok: true;
  binaryPath: string;
}

interface DockerCompileError {
  ok: false;
  kind: 'CE' | 'TIMEOUT' | 'OOM';
  stderr: string;
  exitCode: number | null;
}

export type DockerCompileResult = DockerCompileSuccess | DockerCompileError;

export function runDockerCompiler(
  workdir: string,
  flags: string[],
  sessionId: string
): DockerCompileResult {
  const compileCmd = ['g++', ...flags, '-static-pie', '-s', '-o', 'main', 'Main.cpp'];
  const fallbackCmd = ['g++', ...flags, '-s', '-o', 'main', 'Main.cpp'];

  const dockerArgs = [
    'run', '--rm',
    '--network', 'none',
    '--cpus=1', '--memory=512m', '--pids-limit=128',
    '--read-only', '-v', `${workdir}:/work:rw`,
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '-u', '10000:10000',
    '--tmpfs', '/tmp:rw,nosuid,nodev,noexec,size=16m',
    '-w', '/work',
    'gcc:13-bookworm'
  ];

  const result: SpawnSyncReturns<Buffer> = spawnSync('docker', [...dockerArgs, ...compileCmd], {
    timeout: 30000
  });

  // Si hubo error del sistema
  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;

    if (err.code === 'ETIMEDOUT') {
      return { ok: false, kind: 'TIMEOUT', stderr: '', exitCode: null };
    }

    if (err.message.includes('ENOMEM')) {
      return { ok: false, kind: 'OOM', stderr: '', exitCode: null };
    }
  }

  // Si el proceso terminó con error de compilación
  if (result.status !== 0) {
    const fallback = spawnSync('docker', [...dockerArgs, ...fallbackCmd], { timeout: 30000 });

    if (fallback.status !== 0) {
      return {
        ok: false,
        kind: 'CE',
        stderr: fallback.stderr.toString().slice(0, 8192),
        exitCode: fallback.status
      };
    }
  }

  // Éxito
  return {
    ok: true,
    binaryPath: `${workdir}/main`
  };
}
