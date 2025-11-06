/**
 * Tipos para la compilacion de C++.
 * 
 * - CompileRequest: representa la solicitud de compilación, incluyendo el código fuente,
 *   los flags de compilador permitidos y un sessionId unico.
 * 
 * - CompileResultOK: resultado exitoso de compilacion, con ruta del binario, tiempo de compilacion,
 *   opcionalmente stderr, tag de imagen y sessionId.
 * 
 * - CompileResultError: resultado fallido de compilación, indicando tipo de error ('CE', 'TIMEOUT', 'OOM', 'INFRA'),
 *   mensaje de error, codigo de salida opcional, tag de imagen y sessionId.
 * 
 * - DockerCompileSuccess: exito especifico del compilador en contenedor Docker, con ruta del binario.
 * 
 * - CompileResult: unión de CompileResultOK y CompileResultError para tipar la respuesta de la compilación.
 */
export interface CompileRequest {
  sourceCode: string;
  flags: string[];
  sessionId: string;
}

export interface CompileResultOK {
  ok: true;
  binaryPath: string;
  compileMs: number;
  stderr?: string;
  imageTag: string;
  sessionId: string;
}

export interface CompileResultError {
  ok: false;
  kind: 'CE' | 'TIMEOUT' | 'OOM' | 'INFRA';
  stderr: string;
  exitCode?: number | null;
  imageTag: string;
  sessionId: string;
}

export interface DockerCompileSuccess {
  ok: true;
  binaryPath: string;
}

export type CompileResult = CompileResultOK | CompileResultError;