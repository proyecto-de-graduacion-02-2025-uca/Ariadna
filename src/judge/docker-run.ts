import { spawnSync, SpawnSyncReturns } from 'child_process';
import { judgeDockerConfig, normalizeHostPathForDocker, IO_LIMIT_KB } from './configs';
import type { CompileResultOK } from '../sandbox/types';
import type { SingleTestResult, TestVerdict } from './types';

export function runSingleTestInDocker(params: {
  compile: CompileResultOK;
  index: number;
  input: string;
  expectedOutput: string;
  checker: (expected: string, got: string) => boolean;
}): SingleTestResult | { infraError: string } {
  const { compile, index, input, expectedOutput, checker } = params;

  const hostWorkdir = normalizeHostPathForDocker(compile.workdir.hostPath);
  const containerWorkdir = compile.workdir.containerPath;
  const binaryPathInContainer = compile.binary.containerPath; 

  function normalizeOutput(s: string): string {
    return s
        .replace(/\r\n/g, '\n')   // CRLF -> LF
        .replace(/\r/g, '\n')     // CR -> LF
        .trimEnd();               // quita espacios/saltos al final
  }

  const dockerArgs = [
    'run',
    '--rm',
    '-i',
    `--network=${judgeDockerConfig.network}`,
    `--cpus=${judgeDockerConfig.cpus}`,
    `--memory=${judgeDockerConfig.memoryMB}m`,
    `--pids-limit=${judgeDockerConfig.pidsLimit}`,
    '--read-only',
    '-v',
    `${hostWorkdir}:${containerWorkdir}:ro`,
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '-u',
    judgeDockerConfig.user,
    '--tmpfs',
    judgeDockerConfig.tmpfs,
    '-w',
    containerWorkdir,
    judgeDockerConfig.image,
    binaryPathInContainer,
  ];

  const start = Date.now();
  const result: SpawnSyncReturns<Buffer> = spawnSync('docker', dockerArgs, {
    input,
    timeout: judgeDockerConfig.timeoutMsPerTest,
  });
  const timeMs = Date.now() - start;

  if (result.error) {
    const msg = String(result.error.message || '');
    return { infraError: msg.slice(0, 4096) };
  }

  const rawStdout = result.stdout ? result.stdout.toString() : '';
  const rawStderr = result.stderr ? result.stderr.toString() : '';

  const stdout = rawStdout.slice(0, IO_LIMIT_KB * 1024);
  const stderr = rawStderr.slice(0, IO_LIMIT_KB * 1024);

  let verdict: TestVerdict;
  let exitCode: number | null = result.status;

  if (result.status === null) {
    verdict = 'TLE';
    exitCode = null;
  } else if (result.status !== 0) {
    verdict = 'RE';
  } else {
    const expectedNorm = normalizeOutput(expectedOutput ?? '');
    const gotNorm = normalizeOutput(stdout);
    const ok = checker(expectedNorm, gotNorm);
    verdict = ok ? 'AC' : 'WA';
  }


  return {
    index,
    verdict,
    timeMs,
    exitCode,
    stdout,
    stderr,
  };
}
