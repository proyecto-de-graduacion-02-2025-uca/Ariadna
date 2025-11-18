import type { ChatMessage, LLMAdapter } from "../types";

type GeminiCandidate = {
  content?: { parts?: { text?: string }[] };
  finishReason?: string;
};

export class GeminiAdapter implements LLMAdapter {
  constructor(
    private cfg: { apiKey: string; apiBase?: string; defaultModel?: string }
  ) {}

  private async call(body: any, model: string) {
    const url = `${
      this.cfg.apiBase ?? "https://generativelanguage.googleapis.com"
    }/v1beta/models/${model}:generateContent?key=${this.cfg.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 404) {
      // Modelo inexistente -> lanza error especializado para activar fallback
      throw new Error(`gemini_model_not_found:${model}`);
    }
    if (res.status === 429) throw new Error("rate_limited");
    if (!res.ok) throw new Error(`gemini_error:${res.status}`);

    return res.json();
  }

  async chat(
    messages: ChatMessage[],
    opt?: { model?: string; temperature?: number; maxTokens?: number; responseFormatJSON?: boolean }
  ): Promise<string> {
    const preferredModel =
      opt?.model ?? this.cfg.defaultModel ?? "gemini-1.5-pro-latest";

    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const userText = messages
      .filter((m) => m.role !== "system")
      .map((m) => m.content)
      .join("\n\n");

    const baseConfig: any = {
      temperature: opt?.temperature ?? 0.2,
      maxOutputTokens: opt?.maxTokens ?? 1500,
    };
    if (opt?.responseFormatJSON) baseConfig.responseMimeType = "application/json";

    const body = {
      systemInstruction: system ? { role: "system", parts: [{ text: system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: baseConfig,
    };

    let data: { candidates?: GeminiCandidate[] } | undefined;
    let text = "";

    try {
      data = await this.call(body, preferredModel);
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    } catch (e: any) {
      if (String(e?.message || "").startsWith("gemini_model_not_found:")) {
        const altModel =
          preferredModel.includes("flash")
            ? "gemini-1.5-pro-latest"
            : "gemini-1.5-flash-latest";
        data = await this.call(body, altModel);
        text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      } else {
        throw e;
      }
    }

    if (!text) throw new Error("gemini_empty_response");
    return text;
  }
}
