export const promptVersion = "v1";

export type ExplanationAudience = "child" | "general";

type BuildPoetryExplanationMessagesInput = {
  title: string;
  author: string;
  lines: string[];
  audience: ExplanationAudience;
};

const audienceInstructionMap: Record<ExplanationAudience, string> = {
  child: "面向儿童，用温柔、具体、容易想象的中文解释。",
  general: "面向普通学习者，用自然、清晰、不过度学术化的中文解释。",
};

export function getExplanationCacheKey(audience: ExplanationAudience) {
  return `${audience}_${promptVersion}` as const;
}

export function isExplanationAudience(
  value: unknown,
): value is ExplanationAudience {
  return value === "child" || value === "general";
}

export function buildPoetryExplanationMessages({
  title,
  author,
  lines,
  audience,
}: BuildPoetryExplanationMessagesInput) {
  const audienceLabel = audience === "child" ? "儿童" : "普通学习者";

  return {
    system: [
      "你是一名讲解唐诗的中文老师。",
      "你只做讲解，不做创作。",
      "不要改写原诗，不要补写新诗句，不要输出与讲解无关的内容。",
      "只返回 JSON 对象，字段必须包含 summary、imagery、emotion。",
      audienceInstructionMap[audience],
      "summary 用 2 到 3 句话说明这首诗写了什么。",
      "imagery 说明画面和意境，可以帮助读者想象。",
      "emotion 说明诗人的心情或情感变化。",
      "语言要准确、亲和，避免空泛套话。",
    ].join(" "),
    user: [
      `请为${audienceLabel}讲解这首唐诗。`,
      `题目：${title}`,
      `作者：${author}`,
      "原诗：",
      lines.join("\n"),
    ].join("\n"),
  };
}
