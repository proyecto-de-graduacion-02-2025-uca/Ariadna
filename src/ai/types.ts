export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface GeneratedTest {
  id: string;
  in: string;
  out?: string;
  tags?: string[]; // ["edge", "stress", "random", ...]
  why?: string;
}

export interface GenTestsInput {
  // ProblemSpec viene de schema Zod
  problem: import("../spec/problem.schema").ProblemSpec;
  // Baseline para evitar duplicados
  existing: { id?: string; in: string; out?: string }[];
  maxNew?: number;
  temperature?: number;
  model?: string;
}

export interface LLMAdapter {
  chat(messages: ChatMessage[], opt?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormatJSON?: boolean;
  }): Promise<string>;
}
