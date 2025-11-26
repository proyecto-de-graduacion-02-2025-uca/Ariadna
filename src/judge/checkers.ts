import type { ProblemSpec } from '../spec/problem.schema';

function trimTrailingWhitespaceLines(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, '')); 

  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === '') {
    end--;
  }
  return lines.slice(0, end).join('\n');
}

export function standardChecker(expected: string, got: string): boolean {
  const normExpected = trimTrailingWhitespaceLines(expected);
  const normGot = trimTrailingWhitespaceLines(got);
  return normExpected === normGot;
}

export function floatsChecker(
  expected: string,
  got: string,
  _problem: ProblemSpec
): boolean {
  return standardChecker(expected, got);
}

export function selectChecker(problem: ProblemSpec) {
  const checkerType = problem.checker?.type ?? 'standard';

  if (checkerType === 'floats') {
    return (expected: string, got: string) => floatsChecker(expected, got, problem);
  }

  return (expected: string, got: string) => standardChecker(expected, got);
}
