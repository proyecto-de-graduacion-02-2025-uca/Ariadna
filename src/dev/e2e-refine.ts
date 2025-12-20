import { refineFromEntry } from '../pipeline/refine-entry';

async function main() {
  const hasKey = !!process.env.ARIADNA_AI_API_KEY;
  const hasModel = !!process.env.ARIADNA_AI_MODEL;

  if (!hasKey || !hasModel) {
    console.error('[Ariadna] Missing env for AI refine test.');
    console.error('Set ARIADNA_AI_API_KEY and ARIADNA_AI_MODEL before running dev:e2e-refine.');
    process.exit(1);
  }

  const problem = {
    id: 'echo-int',
    title: 'Echo Integer',
    source: 'local-dev',
    version: '1.0.0',
    statement: 'Given an integer n, print n.',
    io: {
      style: 'stdin-stdout',
      inputSpec: 'Input: a single integer n.',
      outputSpec: 'Output: print the same integer n followed by a newline.',
    },
    limits: {
      timeMs: 1000,
      memoryMB: 256,
    },
    checker: {
      type: 'standard',
    },
    dataset: {
      samples: [{ id: 'sample-1', in: '1\n', out: '1\n' }],
      tests: [
        { id: 'test-1', in: '1\n', out: '1\n' },
        { id: 'test-2', in: '42\n', out: '42\n' },
      ],
    },
    metadata: {
      tags: ['dev', 'echo'],
      difficulty: 'easy',
    },
  };

  // ✅ baseline WA
  const waSubmission = {
    language: 'cpp17',
    source: `
      #include <bits/stdc++.h>
      using namespace std;

      int main() {
        ios::sync_with_stdio(false);
        cin.tie(nullptr);

        long long n;
        if (!(cin >> n)) return 0;
        cout << (n + 1) << "\\n";
        return 0;
      }
    `,
  };

  console.log('=== REFINE TEST (esperado: termine en AC) ===');

  const res = await refineFromEntry(
    { problem, submission: waSubmission },
    { maxCandidates: 3 }
  );

  if ('issues' in res) {
    console.error('[Ariadna] INVALID ENTRY:');
    for (const i of res.issues) console.error(`  - ${i.path}: ${i.message}`);
    process.exit(1);
  }

  // ===== DEBUG: imprimir JSON compacto (legible) =====
  function preview(s: string | undefined, max = 600) {
    if (!s) return undefined;
    const t = s.trim();
    if (t.length <= max) return t;
    return t.slice(0, max) + `... [truncated ${t.length - max} chars]`;
  }

  function attemptView(a: any) {
    const j = a.judge;
    return {
      attemptIndex: a.attemptIndex,
      verdict: j?.verdict ?? 'NO_JUDGE',
      testsPassed: j?.testsPassed,
      testsTotal: j?.testsTotal,
      timeMsMax: j?.timeMsMax,
      memoryKbMax: j?.memoryKbMax,
      failingTestIndex: j?.failingTestIndex,
      error: a.aiError?.message,
      sourcePreview: preview(a.source, 300),
      // ojo: NO incluimos aiRaw/raw aquí
    };
  }

  const view = {
    stoppedReason: res.stoppedReason,
    baseline: attemptView(res.baseline ?? res.attempts?.[0]),
    winner: attemptView(res.winner),
    improvement: res.improvement,
    attempts: res.attempts.map(attemptView),
    refinedCodePreview: preview(res.refinedCode, 600),
  };

  console.log('=== REFINE RESULT (COMPACT JSON) ===');
  console.log(JSON.stringify(view, null, 2));

  console.log(`[Ariadna] stoppedReason=${res.stoppedReason}`);
  res.attempts.forEach((a) => {
    const v = a.judge?.verdict ?? 'NO_JUDGE';
    const tp = a.judge ? `${a.judge.testsPassed}/${a.judge.testsTotal}` : '-';
    console.log(`  [attempt #${a.attemptIndex}] verdict=${v} tests=${tp}`);
  });

  const winnerVerdict = res.winner?.judge?.verdict ?? 'UNKNOWN';
  console.log(`[Ariadna] winnerVerdict=${winnerVerdict}`);

  process.exit(winnerVerdict === 'AC' ? 0 : 1);
}

main().catch((err) => {
  console.error('[Ariadna] e2e-refine fatal error:', err);
  process.exit(1);
});
