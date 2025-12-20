import { buildCoachPrompt } from "../prompts/coach.prompt";
import { callModel } from "../ai-client";
import { formatCoachExplanation } from "./output/formatter";
import { CoachExplanation } from "../types";
import { CoachContext, } from "../prompts/types";

export async function runCoachExplain(
    context: CoachContext
): Promise<CoachExplanation> {
    const prompt = buildCoachPrompt(context);

    const response = await callModel(prompt);

    if (!response.ok) {
        return {
            summary: `No se pudo generar explicación: ${response.error.message}`,
            steps: [],
            metadata: { fallback: true },
        };
    }

    const raw = response.value.text;

    const json = tryParseJsonBlock(raw);
    if (json?.text) {
        return formatCoachExplanation(json.text);
    }

    return formatCoachExplanation(raw);
}

function tryParseJsonBlock(raw: string): { text: string } | null {
  try {
    const match = raw.match(/```json\s*([\s\S]*?)```/i);
    if (!match?.[1]) return null;

    const parsed = JSON.parse(match[1]);
    if (typeof parsed?.text === 'string') return { text: parsed.text };
    return null;
  } catch {
    return null;
  }
}

