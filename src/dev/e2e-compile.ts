import { checkEntryAndCompile } from '../index';

async function main() {
  const problem = {
    id: 'hello-world',
    title: 'Hello World',
    source: 'internal',
    version: "1.0.0", 
    statement: 'Minimal problem for compile-only e2e test.',
    io: {
      style: 'stdin-stdout',
      inputSpec: 'Read from standard input.',
      outputSpec: 'Write to standard output.',
    },
    limits: { timeMs: 2000, memoryMB: 256 },
    checker: { type: 'standard' },
    allowedLanguages: ['cpp17'],
    dataset: {
      samples: [{ in: '1\n', out: '1\n' }],
      tests:   [{ in: '2\n', out: '2\n' }],
    },
  };

  const submissionOk = {
    language: 'cpp17',
    source: `
      #include <iostream>
      using namespace std;
      int main() {
        cout << "Hola desde docker!" << "\\n";
        return 0;
      }
    `,
  };

  const submissionCe = {
    language: 'cpp17',
    source: `
      #include <iostream>
      using namespace std;
      int main() {
        cout << "Esto no compila" << endl
        return 0;
      }
    `,
  };

  console.log('== Caso OK ==');
  const ok = await checkEntryAndCompile({ problem, submission: submissionOk });
  console.log('Resultado OK:', ok, '\n');

  console.log('== Caso CE ==');
  const ce = await checkEntryAndCompile({ problem, submission: submissionCe });
  console.log('Resultado CE:', ce, '\n');

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('[Ariadna] Unhandled error:', err);
  process.exit(2);
});
