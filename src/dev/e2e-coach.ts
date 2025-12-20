// src/dev/e2e-coach.ts

import { coachFromEntry } from '../pipeline/coach';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

async function runCase(label: string, input: { problem: any; submission: any }, expectedVerdict: string) {
  console.log(`\n=== ${label} (esperado ${expectedVerdict}) ===`);

  const res = await coachFromEntry(input);

  if ('issues' in res) {
    console.error('[Ariadna] INVALID ENTRY:');
    for (const i of res.issues) console.error(`  - ${i.path}: ${i.message}`);
    assert(false, `${label}: entry inválido (no debería)`);
    return;
  }

  assert(res.ok === true, `${label}: res.ok debería ser true`);
  console.log(`[Ariadna] verdict=${res.verdict} • session=${res.sessionId}`);

  // Nota: la explicación depende del LLM, pero el verdict sí debe ser estable.
  assert(res.verdict === expectedVerdict, `${label}: verdict esperado ${expectedVerdict}, got ${res.verdict}`);

  console.log('\n--- Coach summary ---');
  console.log(res.explanation.summary);

  if (res.explanation.steps?.length) {
    console.log('\n--- Coach steps ---');
    res.explanation.steps.forEach((s, idx) => console.log(`  ${idx + 1}. ${s.description}`));
  }
}

async function main() {
  // Requiere envs para IA (si no, el coach devolverá fallback con error de config):
  //   ARIADNA_AI_API_KEY, ARIADNA_AI_MODEL
  if (!process.env.ARIADNA_AI_API_KEY || !process.env.ARIADNA_AI_MODEL) {
    console.warn(
      '[Ariadna][warn] Falta ARIADNA_AI_API_KEY o ARIADNA_AI_MODEL. ' +
      'El coach responderá con fallback (pero el pipeline igual debería funcionar).'
    );
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
    checker: { type: 'standard' },
    dataset: {
      samples: [{ id: 'sample-1', in: '1\n', out: '1\n' }],
      tests: [
        { id: 'test-1', in: '1\n', out: '1\n' },
        { id: 'test-2', in: '42\n', out: '42\n' },
      ],
    },
    metadata: { tags: ['dev', 'echo'], difficulty: 'easy' },
  };

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
        long long z = 0;
        long long x = n / z;
        cout << x << "\\n";
        return 0;
      }
    `,
  };

  const ceSubmission = {
    language: 'cpp17',
    source: `
      #include <bits/stdc++.h>
      using namespace std;
      int main() {
        cout << "hi" << "\\n"
        return 0;
      }
    `,
  };

  await runCase('GOOD SUBMISSION', { problem, submission: goodSubmission }, 'AC');
  await runCase('WA SUBMISSION', { problem, submission: waSubmission }, 'WA');
  await runCase('RE SUBMISSION', { problem, submission: reSubmission }, 'RE');
  await runCase('CE SUBMISSION', { problem, submission: ceSubmission }, 'CE');

  console.log('\n[Ariadna] e2e-coach OK ✅');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Ariadna] e2e-coach fatal error:', err);
  process.exit(1);
});
