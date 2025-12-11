import type { CallModelOptions, AiResponse } from './types';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_BASE_URL = 'https://api.openai.com/v1/chat/completions';

const API_KEY_ENV = 'ARIADNA_AI_API_KEY';
const MODEL_ENV = 'ARIADNA_AI_MODEL';
const BASE_URL_ENV = 'ARIADNA_AI_BASE_URL';

function isDev() {
    return process.env.NODE_ENV !== 'production';
}

function devLog(...args: unknown[]) {
    if (isDev()) {
        console.log('[Ariadna AI]', ...args);
    }
}

function safeParseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/**
 * Wrapper principal para llamar a un modelo LLM estilo OpenAI.
 *
 * - Lee API key de process.env.ARIADNA_AI_API_KEY (o options.apiKey).
 * - Lee modelo de process.env.ARIADNA_AI_MODEL (o options.model).
 * - Soporta baseUrl OpenAI-compatible (env ARIADNA_AI_BASE_URL u options.baseUrl).
 * - Maneja timeout, errores de red / API y respuestas vacías.
 */
export async function callModel(
    prompt: string,
    options: CallModelOptions = {}
): Promise<AiResponse> {
    const apiKey = options.apiKey ?? process.env[API_KEY_ENV];
    const model = options.model ?? process.env[MODEL_ENV];
    const baseUrl = options.baseUrl ?? process.env[BASE_URL_ENV] ?? DEFAULT_BASE_URL;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    if (!apiKey) {
        const message = `Missing AI API key. Set ${API_KEY_ENV} or provide options.apiKey.`;
        devLog(message);

        return {
            ok: false,
            error: {
                type: 'config',
                message,
            },
        };
    }

    if (!model) {
        const message = `Missing AI model name. Set ${MODEL_ENV} or provide options.model.`;
        devLog(message);

        return {
            ok: false,
            error: {
                type: 'config',
                message,
            },
        };
    }

    // Construimos el payload estilo OpenAI Chat Completions
    const messages = [
        ...(options.systemPrompt
            ? [{ role: 'system', content: options.systemPrompt as string }]
            : []),
        { role: 'user', content: prompt },
    ];

    const body: Record<string, unknown> = {
        model,
        messages,
        temperature: options.temperature ?? 0,
    };

    if (options.maxTokens != null) {
        // OpenAI usa max_tokens
        (body as any).max_tokens = options.maxTokens;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        devLog('Calling model', model, 'at', baseUrl);

        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
            const text = await res.text().catch(() => undefined);
            const parsed = text ? safeParseJson(text) : undefined;

            let message = `AI provider error: HTTP ${res.status}`;

            const errorCode = (parsed as any)?.error?.code;
            if (res.status === 429 && errorCode === 'insufficient_quota') {
                message = 'AI provider error: insufficient quota / billing. Check your plan or API key.';
            }

            devLog(message, parsed ?? text);

            return {
                ok: false,
                error: {
                    type: 'api',
                    message,
                    details: parsed ?? text,
                    statusCode: res.status,
                },
            };
        }

        const json: any = await res.json();

        const choice = json?.choices?.[0];
        const content: string | undefined = choice?.message?.content?.trim?.();

        if (!content) {
            const message = 'Empty AI response content.';
            devLog(message, json);

            return {
                ok: false,
                error: {
                    type: 'api',
                    message,
                    details: json,
                },
            };
        }

        const usage = json.usage
            ? {
                promptTokens: json.usage.prompt_tokens,
                completionTokens: json.usage.completion_tokens,
                totalTokens: json.usage.total_tokens,
            }
            : undefined;

        const response: AiResponse = {
            ok: true,
            value: {
                text: content,
                raw: json,
                model: json.model ?? model,
                usage,
            },
        };

        devLog('AI call succeeded. Tokens:', usage);

        return response;
    } catch (err: any) {
        clearTimeout(timeout);

        if (err?.name === 'AbortError') {
            const message = `AI request timed out after ${timeoutMs}ms.`;
            devLog(message);

            return {
                ok: false,
                error: {
                    type: 'timeout',
                    message,
                },
            };
        }

        const message = 'Unexpected error calling AI provider.';
        devLog(message, err);

        return {
            ok: false,
            error: {
                type: 'unknown',
                message,
                details:
                    err instanceof Error
                        ? {
                            name: err.name,
                            message: err.message,
                            stack: err.stack,
                        }
                        : String(err),
            },
        };
    }
}
