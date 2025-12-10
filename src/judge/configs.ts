import { dockerConfig as compileDockerConfig } from '../sandbox/configs';

export const judgeDockerConfig = {
  image: compileDockerConfig.image,
  cpus: compileDockerConfig.cpus,
  memoryMB: compileDockerConfig.memoryMB,
  pidsLimit: compileDockerConfig.pidsLimit,
  network: compileDockerConfig.network,
  user: compileDockerConfig.user,
  tmpfs: compileDockerConfig.tmpfs,
  containerWorkRoot: compileDockerConfig.containerWorkRoot,
  timeoutMsPerTest: compileDockerConfig.timeoutMs, 
  stderrMaxKB: compileDockerConfig.stderrMaxKB,
};

export const IO_LIMIT_KB = 64;

export function normalizeHostPathForDocker(p: string): string {
  if (process.platform === 'win32') {
    return p.replace(/\\/g, '/');
  }
  return p;
}
