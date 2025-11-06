/**
 * Valida que los flags de compilacion proporcionados por el usuario esten permitidos.
 * 
 * - `flags`: arreglo de strings con los flags de compilador que se aceptaran.
 * - Retorna `true` si todos los flags están en la lista blanca (`allowedFlags`), `false` en caso contrario.
 * - Evita que el usuario pase flags inseguros o no soportados.
 */
const allowedFlags = ['-O2', '-std=gnu++17', '-pipe'];

export function validateFlags(flags: string[]): boolean {
  return flags.every(flag => allowedFlags.includes(flag));
}