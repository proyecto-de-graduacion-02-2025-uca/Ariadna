import { ProblemSpecSchema, type ProblemSpec } from '../spec/problem.schema';
import { SubmissionSchema, type Submission } from '../spec/submission.schema';
import { normalizeDataset } from '../utils/normalize';
import { formatZodError } from '../utils/errors';
import { newId } from '../utils/id';
import type { EntryResult, EntryOk, EntryErr } from '../types/public';

type NormalizedProblem = ProblemSpec;
type NormalizedSubmission = Submission;

export function validateEntry(
  input: { problem: unknown; submission: unknown }
): EntryResult<NormalizedProblem, NormalizedSubmission> {

  // 1) Validacion de payloads
  const parsedProblem = ProblemSpecSchema.safeParse(input.problem);
  if (!parsedProblem.success) {
    return <EntryErr>{ ok: false, issues: formatZodError(parsedProblem.error) };
  }
  const parsedSubmission = SubmissionSchema.safeParse(input.submission);
  if (!parsedSubmission.success) {
    return <EntryErr>{ ok: false, issues: formatZodError(parsedSubmission.error) };
  }

  // 2) Cross checks 
  const prob = parsedProblem.data;
  const sub = parsedSubmission.data;

  if (prob.allowedLanguages && !prob.allowedLanguages.includes(sub.language)) {
    return {
      ok: false,
      issues: [{ path: 'submission.language', message: `language ${sub.language} not allowed for this problem` }]
    };
  }

  // Dataset. Minimos 1 sample y 1 test
  if (prob.dataset.samples.length < 1) {
    return { ok: false, issues: [{ path: 'dataset.samples', message: 'at least 1 sample is required' }] };
  }
  if (prob.dataset.tests.length < 1) {
    return { ok: false, issues: [{ path: 'dataset.tests', message: 'at least 1 test is required' }] };
  }

  // 3) Normalizacion de TestCases 
  const normProblem: NormalizedProblem = {
    ...prob,
    dataset: {
      samples: normalizeDataset(prob.dataset.samples),
      tests: normalizeDataset(prob.dataset.tests)
    }
  };

  const sessionId = newId('session');

  const result: EntryOk<NormalizedProblem, NormalizedSubmission> = {
    ok: true,
    value: { problem: normProblem, submission: sub, sessionId }
  };
  return result;
}

//  Funcion para Test de entrada
export function checkEntryAndLog(input: { problem: unknown; submission: unknown }): boolean {
  const res = validateEntry(input);
  if (res.ok) {
    console.log(`[Ariadna] OK • session=${res.value.sessionId}`);
    return true;
  }
  console.error('[Ariadna] INVALID:');
  for (const i of res.issues) {
    console.error(`  - ${i.path}: ${i.message}`);
  }
  return false;
}

