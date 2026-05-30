import {
  buildPoetryExplanationMessages,
  type ExplanationAudience,
} from "@/lib/ai/prompts";

export type PoetryExplanation = {
  summary: string;
  imagery: string;
  emotion: string;
  cachedAt: string;
};

type ExplainPoetryInput = {
  title: string;
  author: string;
  lines: string[];
  audience: ExplanationAudience;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function explainPoetry(
  input: ExplainPoetryInput,
): Promise<PoetryExplanation> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY.");
  }

  const messages = buildPoetryExplanationMessages(input);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: messages.system,
        },
        {
          role: "user",
          content: messages.user,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as DeepSeekResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("DeepSeek response content is empty.");
  }

  const parsed = JSON.parse(content) as Partial<PoetryExplanation>;

  if (
    typeof parsed.summary !== "string" ||
    typeof parsed.imagery !== "string" ||
    typeof parsed.emotion !== "string"
  ) {
    throw new Error("DeepSeek response JSON is invalid.");
  }

  return {
    summary: parsed.summary,
    imagery: parsed.imagery,
    emotion: parsed.emotion,
    cachedAt: new Date().toISOString(),
  };
}
