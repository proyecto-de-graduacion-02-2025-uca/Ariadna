/**
 * Valida que los flags de compilacion proporcionados por el usuario esten permitidos.
 * 
 * - `flags`: arreglo de strings con los flags de compilador que se aceptaran.
 * - Retorna `true` si todos los flags están en la lista blanca (`allowedFlags`), `false` en caso contrario.
 * - Evita que el usuario pase flags inseguros o no soportados.
 */
export const ALLOWED_FLAGS = new Set<string>(['-std=gnu++17', '-O2', '-pipe']);

export interface SanitizeFlagsResult {
  allowed: string[]; 
  invalid: string[]; 
}

export function sanitizeFlags(flags?: string[]): SanitizeFlagsResult {
  if (!flags || flags.length === 0) return { allowed: [], invalid: [] };

  const normalize = (f: string) => {
    if (f === '-std=c++17') return '-std=gnu++17';
    return f;
  };

  const seen = new Set<string>();
  const allowed: string[] = [];
  const invalid: string[] = [];

  for (const raw of flags) {
    const f = normalize(raw.trim());
    if (ALLOWED_FLAGS.has(f)) {
      if (!seen.has(f)) {
        seen.add(f);
        allowed.push(f);
      }
    } else {
      invalid.push(raw);
    }
  }

  const order = ['-std=gnu++17', '-O2', '-pipe'];
  allowed.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return { allowed, invalid };
}