import { mkdirSync, writeFileSync } from "fs";
import os from "os";
import path from "path";

/**
 * Prepara un directorio de trabajo temporal para compilar el código fuente.
 * 
 * - Crea la carpeta dentro del directorio temporal del sistema (`os.tmpdir()`).
 * - Crea subcarpetas "ariadna/<sessionId>" automáticamente.
 * - Escribe el archivo "Main.cpp" con el código fuente recibido.
 * - Devuelve la ruta completa del directorio creado.
 */
export function prepareWorkdir(sessionId: string, sourceCode: string): string {
  // 📁 Directorio base del sistema (por ejemplo: /tmp o C:\Users\<user>\AppData\Local\Temp)
  const baseTmp = os.tmpdir();

  // 📂 Carpeta única por sesión
  const workdir = path.join(baseTmp, "ariadna", sessionId);

  // ✅ Crea todas las carpetas intermedias si no existen
  mkdirSync(workdir, { recursive: true });

  // 📝 Escribe el archivo fuente principal
  const mainFile = path.join(workdir, "Main.cpp");
  writeFileSync(mainFile, sourceCode, "utf8");

  // 🔁 Devuelve la ruta creada para usarla en Docker
  return workdir;
}
