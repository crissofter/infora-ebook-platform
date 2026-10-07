import { imageFormat } from "../media.ts";

export async function generateIllustration({ apiKey, model, prompt, cover }: { apiKey: string; model: string; prompt: string; cover: boolean }, fetcher: typeof fetch = fetch) {
  const response = await fetcher("https://api.openai.com/v1/images/generations", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, size: cover ? "1024x1536" : "1536x1024", quality: "medium", output_format: "webp", n: 1 }),
    signal: AbortSignal.timeout(110_000),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "O provedor não autorizou a geração. Verifique a chave e o acesso ao modelo na hospedagem." : "O provedor não concluiu a imagem. Verifique o saldo e tente novamente.");
  const result = await response.json();
  const payload = result.data?.[0]?.b64_json;
  if (typeof payload !== "string" || payload.length > 16 * 1024 * 1024) throw new Error("O provedor retornou uma imagem inválida ou muito grande.");
  const bytes = Buffer.from(payload, "base64");
  const format = imageFormat(bytes);
  if (!format) throw new Error("O provedor retornou um formato de imagem inválido.");
  return { bytes, format };
}
