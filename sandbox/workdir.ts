import { mkdirSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import {workdirConfigs} from './configs';

/**
 * Prepara un directorio de trabajo temporal para compilar el código fuente.
 * 
 * - Crea la carpeta dentro del directorio temporal del sistema (`os.tmpdir()`).
 * - Crea subcarpetas "ariadna/<sessionId>" automáticamente.
 * - Escribe el archivo "Main.cpp" con el código fuente recibido.
 * - Devuelve la ruta completa del directorio creado.
 */
export function prepareWorkdir(sourceCode: string): string {
  const baseTmp = os.tmpdir(); // carpeta temporal

  const workdir = path.join(baseTmp, workdirConfigs.folder);

  mkdirSync(workdir, { recursive: true });

  const mainFile = path.join(workdir, workdirConfigs.fileName);
  writeFileSync(mainFile, sourceCode, "utf8");

  return workdir;
}