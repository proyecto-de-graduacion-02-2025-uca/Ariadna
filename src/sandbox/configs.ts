// src/sandbox/configs.ts
import * as os from 'os';
import * as path from 'path';

const HOST_WORK_ROOT_ENV = 'ARIADNA_HOST_WORK_ROOT';

function resolveHostWorkRoot(): string {
  const fromEnv = process.env[HOST_WORK_ROOT_ENV];
  if (fromEnv && fromEnv.trim() !== '') {
    return fromEnv;
  }

  if (process.platform === 'win32') {
    return 'C:/AriadnaTmp';
  }

  const baseTmp = os.tmpdir();
  return path.join(baseTmp, 'ariadna');
}

export const dockerConfig = {
  image: 'gcc:13-bookworm',
  cpus: Number(1),
  memoryMB: Number(512),
  pidsLimit: Number(128),
  readOnly: true,
  tmpfs: '/tmp:rw,nosuid,nodev,noexec,size=16m',
  user: '10000:10000',
  network: 'none',
  containerWorkRoot: '/work',
  hostWorkRoot: resolveHostWorkRoot(),
  timeoutMs: Number(30000),
  stderrMaxKB: Number(64),
  debug: true,
};

export const workdirConfigs = {
  folder: 'ariadna',
  fileName: 'Main.cpp',
  executableFileName: 'main',
};
