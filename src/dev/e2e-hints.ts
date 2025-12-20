// src/dev/e2e-hints.ts

import { hintsFromEntry } from '../pipeline/hints-from-entry';

async function main() {
  const hasKey = !!process.env.ARIADNA_AI_API_KEY;
  const hasModel = !!process.env.ARIADNA_AI_MODEL;

  if (!hasKey || !hasModel) {
    console.log('[Ariadna] e2e-hints SKIPPED: set ARIADNA_AI_API_KEY and ARIADNA_AI_MODEL to run.');
    process.exit(0);
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
    limits: { timeMs: 1000, memoryMB: 256 },
    checker: { type: 'standard' },
    dataset: {
      samples: [{ id: 'sample-1', in: '1\n', out: '1\n' }],
      tests: [
        { id: 'test-1', in: '1\n', out: '1\n' },
        { id: 'test-2', in: '42\n', out: '42\n' },
      ],
    },
  };

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

  const res = await hintsFromEntry({ problem, submission: waSubmission });

  if ('issues' in res) {
    console.error('[Ariadna] INVALID ENTRY:');
    res.issues.forEach((i) => console.error(`  - ${i.path}: ${i.message}`));
    process.exit(1);
  }

  console.log(`[Ariadna] HINTS RESULT • verdict=${res.verdict} • session=${res.sessionId}`);
  res.hints.forEach((h, i) => console.log(`  Pista ${i + 1} (${h.level}): ${h.hint}`));
  const ok =
    res.hints.length === 3 &&
    res.hints.every((h) => typeof h.hint === 'string' && h.hint.trim().length > 0);

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('[Ariadna] e2e-hints fatal error:', err);
  process.exit(1);
});
