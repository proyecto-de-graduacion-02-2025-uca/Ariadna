import { mkdirSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { dockerConfig, workdirConfigs } from './configs';
import type { WorkdirInfo, BinaryInfo } from './types';

function hostRoot(): string {
  const env = process.env.ARIADNA_HOST_WORK_ROOT;
  if (env && env.trim().length > 0) return env.trim();
  return dockerConfig.hostWorkRoot || path.join(os.tmpdir(), 'ariadna');
}

export function prepareWorkdir(source: string, sessionId: string): {
  workdir: WorkdirInfo;
  binary: BinaryInfo;
} {
  const root = hostRoot();

  const sessionFolderName = sessionId.startsWith('session_')
    ? sessionId
    : `session_${sessionId}`;

  const hostPath = path.join(root, sessionFolderName);
  mkdirSync(hostPath, { recursive: true });

  const sourceFile = path.join(hostPath, workdirConfigs.fileName);
  writeFileSync(sourceFile, source, 'utf8');

  const workdir: WorkdirInfo = {
    hostPath,
    containerPath: dockerConfig.containerWorkRoot, 
  };

  const binaryFilename = workdirConfigs.executableFileName; 
  const binary: BinaryInfo = {
    hostPath: path.join(hostPath, binaryFilename),
    containerPath: `${dockerConfig.containerWorkRoot}/${binaryFilename}`,
    filename: binaryFilename,
  };

  return { workdir, binary };
}
