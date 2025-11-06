/**
 * Configuracion de Docker y directorio de trabajo para la compilacion.
 * 
 * dockerConfig: define los recursos, restricciones de seguridad y la imagen de compilador
 * que se usara en los contenedores efimeros.
 * 
 * workdirConfigs: define la estructura de directorio temporal donde se escribirá el código
 * fuente y se generará el binario compilado.
 */
export const dockerConfig = {
  image: 'gcc:13-bookworm',
  cpus: '1',
  memory: '512m',
  pidsLimit: 128,
  readOnly: true,
  tmpfs: '/tmp:rw,nosuid,nodev,noexec,size=16m',
  user: '10000:10000',
  network: 'none',
  rootWork: '/work'
};

export const workdirConfigs = {
  folder: 'ariadna',
  fileName: 'Main.cpp',
  executableFileName: 'main'
};