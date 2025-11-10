import { spawnSync, SpawnSyncReturns } from 'child_process';
import { dockerConfig, workdirConfigs } from './configs';
import type { DockerCompileSuccess, WorkdirInfo, BinaryInfo, CompileResultError } from './types';

export type DockerCompileResult = DockerCompileSuccess | CompileResultError;

function stderrSlice(buf?: Buffer, kb = dockerConfig.stderrMaxKB ?? 64): string {
  if (!buf) return '';
  const max = Math.max(1, kb) * 1024;
  const s = buf.toString('utf8');
  return s.length > max ? s.slice(0, max) : s;
}

export function runDockerCompiler(
  workdir: WorkdirInfo,
  binary: BinaryInfo,
  flags: string[],
  sessionId: string
): DockerCompileResult {
  const compileCmd = [
    'g++',
    ...flags,
    '-static-pie',
    '-s',
    '-o',
    binary.filename,
    workdirConfigs.fileName,
  ];
  const fallbackCmd = ['g++', ...flags, '-s', '-o', binary.filename, workdirConfigs.fileName];

  const dockerArgs = [
    'run',
    '--rm',
    `--network=${dockerConfig.network}`,
    `--cpus=${dockerConfig.cpus}`,
    `--memory=${dockerConfig.memoryMB}m`,
    `--pids-limit=${dockerConfig.pidsLimit}`,
    dockerConfig.readOnly ? '--read-only' : '',
    '-v',
    `${workdir.hostPath}:${workdir.containerPath}:rw`,
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '-u',
    dockerConfig.user,
    '--tmpfs',
    dockerConfig.tmpfs,
    '-w',
    workdir.containerPath,
    dockerConfig.image,
  ].filter(Boolean) as string[];

  if (process.env.ARIADNA_DEBUG) {
    console.log('[Ariadna][compile] docker args:', 'run', ...dockerArgs.slice(1));
  }

  const tPrimary0 = Date.now();

  const primary = spawnSync('docker', [...dockerArgs, ...compileCmd], {
    timeout: dockerConfig.timeoutMs,
  });
  const primaryMs = Date.now() - tPrimary0;

  // Timeouts / ENOMEM (host)
  if (primary.error) {
    const err = primary.error as NodeJS.ErrnoException;
    if (err.code === 'ETIMEDOUT') {
      return { ok: false, kind: 'TIMEOUT', stderr: '', exitCode: null, imageTag: dockerConfig.image, sessionId };
    }
    if ((err.message || '').includes('ENOMEM')) {
      return { ok: false, kind: 'OOM', stderr: '', exitCode: null, imageTag: dockerConfig.image, sessionId };
    }
  }

  // Infra docker (daemon / image / permisos)
  if (primary.status !== 0 && primary.stderr) {
    const msg = primary.stderr.toString();
    if (/pull access denied|not found|cannot connect to the Docker daemon|The system cannot find the path/i.test(msg)) {
      return {
        ok: false,
        kind: 'INFRA',
        stderr: stderrSlice(primary.stderr),
        exitCode: primary.status,
        imageTag: dockerConfig.image,
        sessionId,
      };
    }
  }

  // Si falla el estático, intentamos dinámico
  if (primary.status !== 0) {
    if (process.env.ARIADNA_DEBUG) {
      console.log('[Ariadna][compile] primary failed (', primaryMs, 'ms ), trying fallback…');
    }

    const tFallback0 = Date.now();
    const fallback = spawnSync('docker', [...dockerArgs, ...fallbackCmd], {
      timeout: dockerConfig.timeoutMs,
    });
    const fallbackMs = Date.now() - tFallback0;

    if (fallback.status !== 0) {
      return {
        ok: false,
        kind: 'CE',
        stderr: stderrSlice(fallback.stderr),
        exitCode: fallback.status,
        imageTag: dockerConfig.image,
        sessionId,
      };
    }

    if (process.env.ARIADNA_DEBUG) {
      console.log('[Ariadna][compile] fallback OK in', fallbackMs, 'ms');
    }

    return {
      ok: true,
      workdir,
      binary,
      warnings: stderrSlice(fallback.stderr),
    };
  }

  // Éxito por primary
  return {
    ok: true,
    workdir,
    binary,
    warnings: stderrSlice(primary.stderr),
  };
}
