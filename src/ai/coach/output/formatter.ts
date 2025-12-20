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
  return text.replace(/```(json|ts|js|python)?/g, "```").trim();
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
  const structured = extractThreeHintsByLabel(text);
  if (structured) return structured;

  const fallback = extractHintsFallback(text);
  return ensureThreeHints(fallback);
}

function extractThreeHintsByLabel(text: string): HintSuggestion[] | null {
  const lines = text.split(/\r?\n/);

  const buckets: Record<"1" | "2" | "3", string[]> = {
    "1": [],
    "2": [],
    "3": [],
  };

  let current: "1" | "2" | "3" | null = null;

  const labelRe = /^Pista\s*([123])\s*:\s*(.*)$/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isCodeFence(line)) continue;

    const m = line.match(labelRe);
    if (m) {
      current = m[1] as "1" | "2" | "3";
      const rest = (m[2] ?? "").trim();
      if (rest) buckets[current].push(rest);
      continue;
    }

    if (current) {
      buckets[current].push(line);
    }
  }

  const h1 = joinBucket(buckets["1"]);
  const h2 = joinBucket(buckets["2"]);
  const h3 = joinBucket(buckets["3"]);

  if (!h1 || !h2 || !h3) return null;

  return [
    { hint: h1, level: "light" },
    { hint: h2, level: "medium" },
    { hint: h3, level: "strong" },
  ];
}

function joinBucket(parts: string[]): string {
  const s = parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

function extractHintsFallback(text: string): HintSuggestion[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const hints: HintSuggestion[] = [];

  for (const l of lines) {
    if (!l.length) continue;
    if (isCodeFence(l)) continue;
    if (/^Pista\s*[123]\s*:/i.test(l)) continue;

    const cleanLine = l.replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "").trim();

    if (cleanLine) {
      hints.push({ hint: cleanLine, level: "light" });
    }
  }
  return hints;
}

function ensureThreeHints(hints: HintSuggestion[]): HintSuggestion[] {
  const out: HintSuggestion[] = [];

  const first =
    hints[0]?.hint ?? "Revisa el objetivo central del problema y qué se pide exactamente.";
  const second =
    hints[1]?.hint ?? "Enfócate en el caso que falla: qué condición o borde no estás manejando.";
  const third =
    hints[2]?.hint ??
    "Piensa en la estructura de datos/condición que garantiza el resultado correcto en todos los casos.";

  out.push({ hint: first, level: "light" });
  out.push({ hint: second, level: "medium" });
  out.push({ hint: third, level: "strong" });

  return out;
}
