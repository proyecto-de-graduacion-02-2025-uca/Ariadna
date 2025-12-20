// src/dev/e2e-full.ts

import { checkEntryCompileAndJudge } from '../pipeline/compile-and-judge';

async function main() {
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
      samples: [
        { id: 'sample-1', in: '1\n', out: '1\n' },
      ],
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

  // -------- 1) GOOD SUBMISSION (AC) --------
  const goodSubmission = {
    language: 'cpp17',
    source: `
      #include <bits/stdc++.h>
      using namespace std;

      int main() {
        ios::sync_with_stdio(false);
        cin.tie(nullptr);

        long long n;
        if (!(cin >> n)) return 0;
        cout << n << "\\n";
        return 0;
      }
    `,
  };

  // -------- 2) BAD SUBMISSION (WA) --------
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
        // bug: imprime n+1 en lugar de n
        cout << (n + 1) << "\\n";
        return 0;
      }
    `,
  };

  // -------- 3) RUNTIME ERROR (RE) --------
  const reSubmission = {
    language: 'cpp17',
    source: `
      #include <bits/stdc++.h>
      using namespace std;

      int main() {
        ios::sync_with_stdio(false);
        cin.tie(nullptr);

        long long n;
        if (!(cin >> n)) return 0;

        // Provocamos un runtime error: división entre cero
        long long z = 0;
        long long x = n / z; // SIGFPE esperado
        cout << x << "\\n";
        return 0;
      }
    `,
  };

  // // -------- 4) TIME LIMIT EXCEEDED (TLE) --------
  // const tleSubmission = {
  //   language: 'cpp17',
  //   source: `
  //     #include <bits/stdc++.h>
  //     using namespace std;

  //     int main() {
  //       ios::sync_with_stdio(false);
  //       cin.tie(nullptr);

  //       long long n;
  //       if (!(cin >> n)) return 0;

  //       // Bucle infinito / muy largo para forzar timeout
  //       while (true) {
  //         n++;
  //       }

  //       // Nunca debería llegar aquí
  //       return 0;
  //     }
  //   `,
  // };

  // ========== EJECUCIONES E2E ==========

  console.log('=== GOOD SUBMISSION (esperado AC) ===');
  const okGood = await checkEntryCompileAndJudge({
    problem,
    submission: goodSubmission,
  });
  console.log('[Ariadna] pipeline result (good/AC):', okGood);

  console.log('\n=== WA SUBMISSION (esperado WA) ===');
  const okWa = await checkEntryCompileAndJudge({
    problem,
    submission: waSubmission,
  });
  console.log('[Ariadna] pipeline result (WA):', okWa);

  console.log('\n=== RE SUBMISSION (esperado RE) ===');
  const okRe = await checkEntryCompileAndJudge({
    problem,
    submission: reSubmission,
  });
  console.log('[Ariadna] pipeline result (RE):', okRe);

  // console.log('\n=== TLE SUBMISSION (esperado TLE) ===');
  // const okTle = await checkEntryCompileAndJudge({
  //   problem,
  //   submission: tleSubmission,
  // });
  // console.log('[Ariadna] pipeline result (TLE):', okTle);

  // Esperamos:
  //  - good  → true
  //  - wa    → false
  //  - re    → false
  //  - tle   → false
  if (okGood && !okWa && !okRe /* && !okTle */) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Ariadna] e2e-full fatal error:', err);
  process.exit(1);
});
