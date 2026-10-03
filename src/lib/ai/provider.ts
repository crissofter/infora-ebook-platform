import "server-only";

export type AIMessage = { system: string; prompt: string };

export type AIProvider = {
  id: string;
  model: string;
  configured: boolean;
  /** Returns raw JSON text. Throws on transport/API failure. */
  completeJson(msg: AIMessage): Promise<string>;
};

/**
 * OpenAI-compatible adapter (works with OpenAI and any compatible gateway
 * exposing /v1/chat/completions).
 */
function openAIProvider(apiKey: string): AIProvider {
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  return {
    id: "openai",
    model,
    configured: true,
    async completeJson({ system, prompt }) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          temperature: 0.7,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`openai_http_${res.status}`);
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error("openai_empty_response");
      return content;
    },
  };
}

function anthropicProvider(apiKey: string): AIProvider {
  const model = process.env.AI_MODEL ?? "claude-3-5-sonnet-latest";
  return {
    id: "anthropic",
    model,
    configured: true,
    async completeJson({ system, prompt }) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          system: `${system}\nResponda SOMENTE com JSON válido.`,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`anthropic_http_${res.status}`);
      const json = (await res.json()) as { content?: { text?: string }[] };
      const content = json.content?.[0]?.text;
      if (!content) throw new Error("anthropic_empty_response");
      return content;
    },
  };
}

/** Local deterministic composer — used when no AI provider key is configured. */
export const LOCAL_PROVIDER: AIProvider = {
  id: "local-composer",
  model: "infora-local-composer-v1",
  configured: false,
  async completeJson() {
    throw new Error("local_provider_has_no_llm");
  },
};

export function resolveProvider(): AIProvider {
  const openai = process.env.OPENAI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (openai) return openAIProvider(openai);
  if (anthropic) return anthropicProvider(anthropic);
  return LOCAL_PROVIDER;
}

export function providerStatus() {
  const provider = resolveProvider();
  return {
    provider: provider.id,
    model: provider.model,
    configured: provider.configured,
    message: provider.configured
      ? "Provedor de IA conectado."
      : "Provedor de IA não configurado. A INFORA está usando o motor local de composição (estrutura determinística a partir dos seus dados).",
  };
}
