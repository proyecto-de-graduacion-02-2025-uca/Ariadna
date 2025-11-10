// src/pipeline/compile-entry.ts
import { validateEntry } from '../entry/index';
import { compileCpp } from '../sandbox/compiler';
import { sanitizeFlags } from '../sandbox/policy.flags';
import type { EntryErr } from '../types/public';
import type { CompileResult } from '../sandbox/types';

function normalizeLanguage(lang: string): 'cpp' | 'unsupported' {
  const v = (lang || '').toLowerCase().replace(/\s+/g, '');
  if (['cpp', 'c++', 'c++17', 'gnu++17', 'cpp17'].includes(v)) return 'cpp';
  return 'unsupported';
}

function extractSource(submission: any): string | null {
  if (!submission) return null;
  if (typeof submission.source === 'string') return submission.source;
  if (typeof submission.code === 'string') return submission.code;
  return null;
}

export type CompileFromEntryInput = {
  problem: unknown;
  submission: unknown;
};

export async function compileFromEntry(
  input: CompileFromEntryInput
): Promise<CompileResult | EntryErr> {
  // 1) Validación (Zod)
  const res = validateEntry(input);
  if (!res.ok) return res;

  const { submission, sessionId } = res.value;

  // 2) Lenguaje soportado (solo C++)
  const lang = normalizeLanguage((submission as any).language);
  if (lang === 'unsupported') {
    return {
      ok: false,
      issues: [
        {
          path: 'submission.language',
          message: 'only C++ is supported in this stage (cpp/c++17/gnu++17)',
        },
      ],
    };
  }

  // 3) Código fuente
  const source = extractSource(submission);
  if (!source) {
    return {
      ok: false,
      issues: [{ path: 'submission.source', message: 'missing source code' }],
    };
  }

  // 4) Flags del compilador (whitelist)
  const defaultFlags = ['-std=gnu++17', '-O2', '-pipe'];
  const { allowed, invalid } = sanitizeFlags(defaultFlags);
  if (invalid.length > 0) {
    return {
      ok: false,
      issues: [
        { path: 'submission.flags', message: `invalid default flags: ${invalid.join(' ')}` },
      ],
    };
  }

  // 5) Compilar (contrato listo para el judge)
  return await compileCpp({
    sessionId,
    source,
    flags: allowed,
  });
}

export async function checkEntryAndCompile(input: CompileFromEntryInput): Promise<boolean> {
  const result = await compileFromEntry(input);

  // A) Error de validación (EntryErr)
  if ('issues' in result) {
    console.error('[Ariadna] INVALID ENTRY:');
    for (const i of result.issues) {
      console.error(`  - ${i.path}: ${i.message}`);
    }
    return false;
  }

  // B) Resultado del compilador (CompileResult)
  if (result.ok) {
    console.log(`[Ariadna] COMPILE OK • session=${result.sessionId} • ms=${result.compileMs}`);
    console.log(
      `[Ariadna] workdir: host=${result.workdir.hostPath} -> container=${result.workdir.containerPath}`
    );
    console.log(
      `[Ariadna] binary : host=${result.binary.hostPath} -> container=${result.binary.containerPath}`
    );
    if (result.warnings && result.warnings.trim()) {
      console.log(`[Ariadna] warnings:\n${result.warnings}`);
    }
    return true;
  } else {
    console.error(
      `[Ariadna] COMPILE FAIL • session=${result.sessionId} • kind=${result.kind} • exit=${result.exitCode ?? 'n/a'}`
    );
    if (result.stderr && result.stderr.trim()) {
      console.error(result.stderr);
    }
    return false;
  }
}
