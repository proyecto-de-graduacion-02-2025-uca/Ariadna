import type { CallModelOptions, AiResponse } from './types';
import { getConfig } from '../internal/configStore';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_BASE_URL = 'https://api.openai.com/v1/chat/completions';

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
 * - Lee configuración desde getConfig()
 * - Soporta override por options (uso avanzado / tests)
 * - Maneja timeout, errores de red / API y respuestas vacías
 */
export async function callModel(
    prompt: string,
    options: CallModelOptions = {}
): Promise<AiResponse> {
    const config = getConfig();

    const apiKey = options.apiKey ?? config.llm.apiKey;
    const model = options.model ?? config.llm.model;
    const baseUrl =
        options.baseUrl ??
        DEFAULT_BASE_URL;

    const timeoutMs =
        options.timeoutMs ??
        config.timeoutMs ??
        DEFAULT_TIMEOUT_MS;

    if (!apiKey) {
        const message =
            'Missing AI API key. Configure Ariadna with configureAriadna().';
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
        const message =
            'Missing AI model name. Configure Ariadna with configureAriadna().';
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
                message =
                    'AI provider error: insufficient quota / billing. Check your plan or API key.';
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
