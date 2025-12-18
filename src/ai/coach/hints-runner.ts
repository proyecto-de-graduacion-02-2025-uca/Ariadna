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
    const match = raw.match(/\{[\s\S]*?\}/m);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.hints === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}
