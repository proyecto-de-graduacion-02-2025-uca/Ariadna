export function normalizeNewlines(s: string): string {
  return s.replace(/\r\n?/g, '\n');
}

export function trimEOF(s: string): string {
  const t = s.replace(/[ \t]+\n/g, '\n').replace(/[ \t]+$/g, '');
  return t.endsWith('\n') ? t : t + '\n';
}

export function normalizeCaseText(s: string): string {
  return trimEOF(normalizeNewlines(s));
}

export function normalizeDataset<T extends { in: string; out?: string }>(arr: T[]): T[] {
  return arr.map(c => ({
    ...c,
    in: normalizeCaseText(c.in),
    ...(c.out !== undefined ? { out: normalizeCaseText(c.out) } : {})
  }));
}
