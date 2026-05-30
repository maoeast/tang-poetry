import type { ChallengeQuestionType } from "@/lib/challenge/engine";

type ThemeSpec = {
  panel: string;
  pill: string;
  optionActive: string;
};

const CHALLENGE_CHOICE_THEME: Record<ChallengeQuestionType, ThemeSpec> = {
  couplet: {
    panel:
      "from-[rgba(215,186,142,0.95)] via-[rgba(233,220,194,0.92)] to-[rgba(248,244,236,0.96)]",
    pill: "bg-white/72 text-[rgba(88,61,39,0.88)]",
    optionActive:
      "border-[rgba(125,85,43,0.45)] bg-white/78 shadow-[0_14px_32px_rgba(96,73,52,0.12)]",
  },
  author: {
    panel:
      "from-[rgba(194,164,121,0.95)] via-[rgba(228,205,168,0.9)] to-[rgba(245,240,229,0.98)]",
    pill: "bg-[rgba(255,255,255,0.72)] text-[rgba(103,67,31,0.92)]",
    optionActive:
      "border-[rgba(139,93,49,0.44)] bg-[rgba(255,250,241,0.88)] shadow-[0_14px_32px_rgba(103,67,31,0.16)]",
  },
  title: {
    panel:
      "from-[rgba(132,167,148,0.94)] via-[rgba(192,216,203,0.88)] to-[rgba(244,248,244,0.98)]",
    pill: "bg-[rgba(255,255,255,0.72)] text-[rgba(40,83,64,0.9)]",
    optionActive:
      "border-[rgba(58,117,90,0.4)] bg-[rgba(247,255,251,0.9)] shadow-[0_14px_32px_rgba(47,106,69,0.14)]",
  },
  ordering: {
    panel:
      "from-[rgba(156,172,197,0.94)] via-[rgba(210,220,235,0.9)] to-[rgba(247,249,252,0.98)]",
    pill: "bg-[rgba(255,255,255,0.72)] text-[rgba(52,74,108,0.9)]",
    optionActive:
      "border-[rgba(73,101,146,0.4)] bg-[rgba(248,251,255,0.9)] shadow-[0_14px_32px_rgba(73,101,146,0.14)]",
  },
};

export function getChallengeChoiceTheme(type: "author" | "title") {
  return CHALLENGE_CHOICE_THEME[type];
}
