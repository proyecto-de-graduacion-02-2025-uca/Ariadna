import type { GenTestsInput } from "../types";

export function buildGenTestsPrompt(input: GenTestsInput): { system: string; user: string } {
    const { problem, existing } = input;

    const baseBullets = existing.map(t =>
        `- ${t.id ?? "(no-id)"}: in=${JSON.stringify(t.in)} out=${JSON.stringify(t.out ?? "")}`
    ).join("\n");

    const maxNew = String(input.maxNew ?? 10);

    const system = [
        "Eres un generador de casos de prueba para programación competitiva.",
        "DEVUELVE SOLO UN JSON VÁLIDO. Nada de texto adicional, nada de markdown, ninguna explicación.",
        "Formato EXACTO:",
        '{ "tests": [ { "id": "string", "in": "string", "out": "string", "tags": ["edge|stress|random"], "why": "string" } ] }',
        "Si el checker del problema es standard/floats, incluye 'out' obligatoriamente.",
        "No incluyas ```json, ni prefacios, ni notas."
    ].join("\n");


    const user = [
        `Problema: ${problem.title ?? problem.id} (v${problem.version ?? "1.0.0"})`,
        "",
        "Formato de entrada/salida (extraído del enunciado):",
        problem.statement ?? "(sin statement)",
        "",
        "Muestras existentes (no repetir):",
        baseBullets || "(sin samples/tests)",
        "",
        "Requisitos para nuevos tests:",
        `- Genera hasta ${maxNew} casos.`,
        '- Etiqueta cada test con tags: ["edge"] para límites, ["stress"] para tamaño grande, o ["random"].',
        "- Respeta exactamente el formato de I/O del problema.",
        "- Evita duplicados y trivialidades.",
        '- Incluye un campo "why" breve explicando el objetivo.',
        "",
        "Devuelve SOLO el JSON, sin texto adicional."
    ].join("\n");

    return { system, user };
}
