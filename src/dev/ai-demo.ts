import { callModel } from '../ai/ai-client';

async function main() {
  const res = await callModel(
    'Dame 3 ideas de problemas fáciles de programación competitiva.',
    {
      temperature: 0.2,
      maxTokens: 256,
      systemPrompt: 'Eres un coach de programación competitiva en español.',
    }
  );

  if (!res.ok) {
    const err = res.error;

    if (err.type === 'api' && err.statusCode === 429) {
      console.error('[Ariadna AI] API limit / quota error:');
      console.error(err.details);
    } else {
      console.error('[Ariadna AI] Error llamando al modelo:');
      console.error(err);
    }

    process.exit(1);
  }

  console.log('[Ariadna AI] Respuesta:');
  console.log(res.value.text);
}

main().catch((err) => {
  console.error('[Ariadna AI] Unhandled error en demo:', err);
  process.exit(1);
});
