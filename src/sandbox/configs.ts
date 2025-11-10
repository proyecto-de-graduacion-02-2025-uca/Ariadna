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
  hostWorkRoot: 'C:/AriadnaTmp', 
  timeoutMs: Number(30000),
  stderrMaxKB: Number(64),
  debug: true,
}

export const workdirConfigs = {
  folder: 'ariadna',
  fileName: 'Main.cpp',
  executableFileName: 'main',
};