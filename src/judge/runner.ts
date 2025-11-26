import type { ProblemSpec } from '../spec/problem.schema';
import type { CompileResultOK } from '../sandbox/types';
import { selectChecker } from './checkers';
import { judgeDockerConfig } from './configs';
import { runSingleTestInDocker } from './docker-run';
import type { JudgeResult, SingleTestResult, TestVerdict } from './types';

export async function runJudge(params: {
  problem: ProblemSpec;
  compile: CompileResultOK;
}): Promise<JudgeResult> {
  const { problem, compile } = params;
  const checker = selectChecker(problem);
  const tests = problem.dataset.tests ?? [];

  const results: SingleTestResult[] = [];

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const input = t.in ?? '';
    const expectedOut = t.out ?? '';

    const r = runSingleTestInDocker({
      compile,
      index: i,
      input,
      expectedOutput: expectedOut,
      checker,
    });
    if ('infraError' in r) {
      return {
        ok: false,
        sessionId: compile.sessionId,
        imageTag: judgeDockerConfig.image,
        kind: 'INFRA',
        message: r.infraError,
      };
    }

    results.push(r);
  }

  const globalVerdict = aggregateVerdict(results);

  return {
    ok: true,
    sessionId: compile.sessionId,
    imageTag: judgeDockerConfig.image,
    verdict: globalVerdict,
    tests: results,
  };
}

function aggregateVerdict(results: SingleTestResult[]): TestVerdict {
  if (results.length === 0) return 'RE'; 

  let hasWA = false;
  let verdict: TestVerdict = 'AC';

  for (const r of results) {
    if (r.verdict === 'TLE') return 'TLE';
    if (r.verdict === 'RE') verdict = 'RE';
    if (r.verdict === 'WA') hasWA = true;
  }

  if (verdict === 'RE') return 'RE';
  if (hasWA) return 'WA';
  return 'AC';
}
