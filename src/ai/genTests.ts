import { z } from "zod";
import { buildGenTestsPrompt } from "./prompt/gen_tests";
import type { GenTestsInput, GeneratedTest, LLMAdapter, ChatMessage } from "./types";
import { normalizeDataset } from "../utils/normalize";
import { ProblemSpecSchema } from "../spec/problem.schema";
import { SampleCaseSchema, TestCaseSchema } from "../spec/testCases.schema";

// Esquema de la respuesta del LLM
const GeneratedTestsSchema = z.object({
    tests: z.array(z.object({
        id: z.string(),
        in: z.string(),
        out: z.string().optional(),
        tags: z.array(z.string()).optional(),
        why: z.string().optional()
    })).default([])
});

export async function generateAiTests(adapter: LLMAdapter, input: GenTestsInput): Promise<{
    accepted: GeneratedTest[];
    rejected: { test: any; reason: string }[];
    updatedProblem: z.infer<typeof ProblemSpecSchema>;
}> {
    // Validar ProblemSpec segun Zod
    const problem = ProblemSpecSchema.parse(input.problem);

    // Base de comparación para duplicados (samples + tests existentes)
    const existing = [
        ...(problem.dataset?.samples ?? []),
        ...(problem.dataset?.tests ?? [])
    ].map(t => ({ id: (t as any).id, in: t.in, out: (t as any).out }));

    // Prompt
    const { system, user } = buildGenTestsPrompt({
        problem,
        existing,
        maxNew: input.maxNew,
        temperature: input.temperature,
        model: input.model
    });

    const messages: ChatMessage[] = [
        { role: "system", content: system },
        { role: "user", content: user }
    ];

    // LLM call
    let raw = await adapter.chat(messages, {
        responseFormatJSON: true,
        temperature: input.temperature ?? 0.2,
        model: input.model
    });

    // Helper para extraer JSON si viene con ruido
    function tryExtractJson(s: string): string | null {
        const match = s.match(/\{[\s\S]*\}$/m) || s.match(/\{[\s\S]*\}/m);
        if (!match) return null;
        try {
            JSON.parse(match[0]);
            return match[0];
        } catch {
            return null;
        }
    }

    const parseOrNull = (txt: string) => {
        try { return GeneratedTestsSchema.parse(JSON.parse(txt)); }
        catch { return null; }
    };

    // Parseo/validación JSON (1er intento)
    let parsed = parseOrNull(raw);

    // Fallback: intentar extracción de bloque JSON si falló
    if (!parsed) {
        const extracted = tryExtractJson(raw);
        if (extracted) parsed = parseOrNull(extracted);
    }

    // Reintento una vez con prompt más estricto si aún falla
    if (!parsed) {
        const retryMessages: ChatMessage[] = [
            { role: "system", content: messages[0].content + "\n\nIMPORTANTE: Responde SOLO con JSON válido. No incluyas texto ni markdown." },
            { role: "user", content: messages[1].content }
        ];
        raw = await adapter.chat(retryMessages, {
            responseFormatJSON: true,
            temperature: input.temperature ?? 0.0,
            model: input.model
        });
        parsed = parseOrNull(raw) ?? (tryExtractJson(raw) ? parseOrNull(tryExtractJson(raw)!) : null);
    }

    if (!parsed) {
        return {
            accepted: [],
            rejected: [{ test: raw, reason: "Respuesta no es JSON válido con el esquema esperado" }],
            updatedProblem: problem
        };
    }

    // Normaliza IN/OUT como hace el resto del sistema
    const normalized = normalizeDataset(parsed.tests.map(t => ({ in: t.in, out: t.out ?? "" })));

    const testsWithNorm = parsed.tests.map((t, i) => ({
        ...t,
        in: normalized[i].in,
        out: t.out === undefined ? undefined : normalized[i].out
    }));

    const existingKey = new Set(existing.map(t => `${t.in}<<>>${t.out ?? ""}`));
    const dedup = testsWithNorm.filter(t => !existingKey.has(`${t.in}<<>>${t.out ?? ""}`));

    // Reglas segun checker/IO:
    // * standard/floats -> out requerido
    // * interactive/special -> puede omitirse
    const checkerType = (problem.checker as any)?.type ?? "standard";
    const needsOut = checkerType === "standard" || checkerType === "floats";

    const accepted: GeneratedTest[] = [];
    const rejected: { test: any; reason: string }[] = [];

    for (const t of dedup) {
        if (!t.in?.length) {
            rejected.push({ test: t, reason: "Entrada vacía" });
            continue;
        }
        if (needsOut && (t.out === undefined || t.out === "")) {
            rejected.push({ test: t, reason: "Falta 'out' para checker exacto/floats" });
            continue;
        }

        // Validación contra TestCaseSchema
        try {
            if (needsOut) {
                // SampleCase requiere out
                SampleCaseSchema.parse({ in: t.in, out: t.out ?? "" });
            } else {
                // TestCase puede no tener out
                TestCaseSchema.parse({ in: t.in, out: t.out });
            }
            accepted.push(t);
        } catch (e: any) {
            rejected.push({ test: t, reason: `Schema test inválido: ${e?.message ?? "zod error"}` });
        }
    }

    // Anexar al ProblemSpec como tests nuevos
    const updatedProblem = {
        ...problem,
        dataset: {
            ...(problem.dataset ?? { samples: [], tests: [] }),
            samples: [...(problem.dataset?.samples ?? [])], // sin cambios
            tests: [
                ...((problem.dataset?.tests ?? []) as any[]),
                ...accepted.map(t => ({ id: t.id, in: t.in, out: t.out }))
            ]
        }
    };

    return { accepted, rejected, updatedProblem };
}
