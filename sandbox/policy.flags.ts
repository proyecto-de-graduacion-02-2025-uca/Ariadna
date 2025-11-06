const allowedFlags = ['-O2', '-std=gnu++17', '-pipe'];

export function validateFlags(flags: string[]): boolean {
  return flags.every(flag => allowedFlags.includes(flag));
}