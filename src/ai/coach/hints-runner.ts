import { buildHintsPrompt } from "../prompts/hints.prompt";
import { callModel } from "../ai-client";
import { formatHints } from "./output/formatter";
import { HintSuggestion } from "../types";
import { HintsContext } from "../prompts/types";

export async function runCoachHints(
  context: HintsContext
): Promise<HintSuggestion[]> {
  const prompt = buildHintsPrompt(context);
  const response = await callModel(prompt);

  if (!response.ok) {
    return [
      {
        hint: `No se pudieron generar pistas: ${response.error.message}`,
        level: "light",
        metadata: { fallback: true },
      },
      {
        hint: "Revisa el caso que falla y compara qué condición debería cumplirse versus lo que tu lógica está asumiendo.",
        level: "medium",
        metadata: { fallback: true },
      },
      {
        hint: "Identifica el punto exacto donde tu solución se desvía: parsing, caso borde, orden de operaciones, overflow o condiciones de corte.",
        level: "strong",
        metadata: { fallback: true },
      },
    ];
  }

  const raw = response.value.text;

  const json = tryParseJsonHints(raw);
  if (json?.hints) {
    return formatHints(json.hints);
  }

  return formatHints(raw);
}

function tryParseJsonHints(raw: string): { hints: string } | null {
  try {
    const match = raw.match(/```json\s*([\s\S]*?)```/i);
    if (!match?.[1]) return null;

    const parsed = JSON.parse(match[1]);
    if (typeof parsed?.hints === "string") return { hints: parsed.hints };
    return null;
  } catch {
    return null;
  }
}
