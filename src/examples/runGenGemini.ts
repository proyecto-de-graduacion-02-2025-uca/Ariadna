import "dotenv/config";
import fs from "fs";
import path from "path";
import { ProblemSpecSchema } from "../spec/problem.schema";
import { generateAiTests } from "../ai/genTests";
import { GeminiAdapter } from "../ai/adapters/gemini";

// Imprime los modelos disponibles para la API Key
async function listModels(apiKey: string, apiBase?: string) {
  const url = `${apiBase ?? "https://generativelanguage.googleapis.com"}/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  console.log("📦 Modelos visibles con tu API key:");
  (data?.models ?? []).slice(0, 10).forEach((m: any, i: number) => {
    console.log(`${i + 1}. ${m.name}`);
  });

  if ((data?.models ?? []).length === 0) {
    console.warn("⚠️  No se devolvieron modelos; revisa que la API key sea válida o tenga acceso a Gemini 1.5.");
  }
}

async function main() {
  // Listar modelos disponibles
  // await listModels(process.env.GEMINI_API_KEY!);

  // Leer y parsear el spec
  const specPath = path.resolve(__dirname, "specs/sum-n.json");
  const raw = fs.readFileSync(specPath, "utf8");
  const problem = ProblemSpecSchema.parse(JSON.parse(raw));

  // Crear el adapter Gemini
  const adapter = new GeminiAdapter({
    apiKey: process.env.GEMINI_API_KEY!,
    defaultModel: process.env.GEMINI_MODEL || "gemini-1.5-pro-latest"
  });

  // Generar tests IA
  const { accepted, rejected, updatedProblem } = await generateAiTests(adapter, {
    problem,
    existing: [...problem.dataset.samples, ...problem.dataset.tests],
    maxNew: 5,
    temperature: 0.2
  });

  console.log(`✅ Aceptados: ${accepted.length}`);
  if (rejected.length) console.log("❌ Rechazados:", rejected.map(r => r.reason));

  fs.writeFileSync(specPath + ".bak", raw);
  fs.writeFileSync(specPath, JSON.stringify(updatedProblem, null, 2));
  console.log("💾 Spec actualizado:", specPath);
}

main().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
