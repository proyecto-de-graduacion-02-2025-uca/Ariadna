import type { CoachExplanation, HintSuggestion } from "../../types";

export function formatCoachExplanation(raw: string): CoachExplanation {
  const cleaned = clean(raw);

  const { summary, steps } = extractStructuredExplanation(cleaned);

  return {
    summary,
    steps,
    metadata: {
      text: cleaned, 
    },
  };
}

export function formatHints(raw: string): HintSuggestion[] {
  const cleaned = clean(raw);
  return extractHints(cleaned);
}

function clean(text: string): string {
  return text
    .replace(/```(json|ts|js|python)?/g, "```")
    .trim();
}

function extractStructuredExplanation(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const title = extractTitle(lines);
  const summary = extractSummary(lines, title);
  const steps = extractSteps(lines);

  return { title, summary, steps };
}

function extractTitle(lines: string[]): string {
  const h1 = lines.find((l) => l.startsWith("# "));
  if (h1) return h1.replace(/^#\s+/, "").trim();

  const first = lines.find((l) => l.length > 0);
  return first ?? "";
}

function extractSummary(lines: string[], title: string): string {
  for (const l of lines) {
    if (!l || l === title) continue;
    if (isStepLine(l)) continue;
    if (isCodeFence(l)) continue;
    return l;
  }
  return "";
}

function extractSteps(lines: string[]): CoachExplanation["steps"] {
  const steps: CoachExplanation["steps"] = [];

  for (const l of lines) {
    if (isStepLine(l)) {
      steps.push({
        description: cleanStep(l),
      });
    }
  }

  return steps.length > 0 ? steps : undefined;
}

function isStepLine(l: string): boolean {
  return /^\d+\./.test(l) || /^[-*]\s+/.test(l);
}

function cleanStep(l: string): string {
  return l.replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "").trim();
}

function isCodeFence(l: string): boolean {
  return /^```/.test(l);
}

function extractHints(text: string): HintSuggestion[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const hints: HintSuggestion[] = [];

  for (const l of lines) {
    if (!l.length) continue;

    const clean = l
      .replace(/^\d+\.\s*/, "")
      .replace(/^[-*]\s*/, "")
      .trim();

    if (clean.length > 0) {
      hints.push({
        hint: clean,
        level: "light",
      });
    }
  }

  return hints;
}
