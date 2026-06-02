"use client";

import type { TitleQuestion } from "@/lib/challenge/engine";
import { getChallengeChoiceTheme } from "@/lib/theme";

type TitleChoiceQuestionCardProps = {
  question: TitleQuestion;
  selectedChoice: string;
  onSelectChoice: (choice: string) => void;
};

export function TitleChoiceQuestionCard({
  question,
  selectedChoice,
  onSelectChoice,
}: TitleChoiceQuestionCardProps) {
  const theme = getChallengeChoiceTheme("title");

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${theme.panel} p-6 text-[var(--color-ink)] shadow-[0_20px_46px_rgba(67,94,78,0.12)]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.58),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.28),transparent_38%)]" />

      <div className="relative">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs tracking-[0.18em] uppercase ${theme.pill}`}>
          选诗名
        </span>
        <h3 className="mt-4 text-2xl font-semibold">{question.title}</h3>
        <p className="mt-3 text-lg leading-8">{question.prompt}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => {
            const isActive = selectedChoice === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelectChoice(option)}
                className={`rounded-[1.25rem] border px-4 py-4 text-left text-base transition ${
                  isActive
                    ? theme.optionActive
                    : "border-white/40 bg-white/56 hover:bg-white/74"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
