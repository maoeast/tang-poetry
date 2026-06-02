"use client";

import { useState, useTransition } from "react";

import { AuthorChoiceQuestionCard } from "@/components/challenge/author-choice-question-card";
import { TitleChoiceQuestionCard } from "@/components/challenge/title-choice-question-card";
import type { ChallengeQuestion } from "@/lib/challenge/engine";

type ChallengeRunnerProps = {
  questions: ChallengeQuestion[];
  onSubmitAnswer: (
    question: ChallengeQuestion,
    userAnswer: string | string[],
  ) => Promise<{
    isCorrect: boolean;
    normalizedAnswer: string;
  }>;
};

type AnswerState = {
  questionId: string;
  isCorrect: boolean;
  normalizedAnswer: string;
};

function normalizeOptionLine(line: string) {
  return line.trim();
}

export function ChallengeRunner({
  questions,
  onSubmitAnswer,
}: ChallengeRunnerProps) {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [orderingAnswer, setOrderingAnswer] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<AnswerState | null>(null);
  const [results, set挑战结果s] = useState<AnswerState[]>([]);
  const [isPending, startTransition] = useTransition();

  const currentQuestion = questions[currentIndex];
  const isComplete = started && currentIndex >= questions.length;

  function resetInput(question: ChallengeQuestion | undefined) {
    setTextAnswer("");
    setSelectedChoice("");
    setFeedback(null);
    setOrderingAnswer(question?.type === "ordering" ? question.options : []);
  }

  function startRound() {
    setStarted(true);
    setCurrentIndex(0);
    set挑战结果s([]);
    resetInput(questions[0]);
  }

  function moveToNextQuestion() {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    resetInput(questions[nextIndex]);
  }

  function submitCurrentAnswer() {
    if (!currentQuestion) {
      return;
    }

    const userAnswer =
      currentQuestion.type === "ordering"
        ? orderingAnswer
        : currentQuestion.type === "couplet"
          ? textAnswer
          : selectedChoice;

    if (
      (typeof userAnswer === "string" && userAnswer.trim().length === 0) ||
      (Array.isArray(userAnswer) && userAnswer.length === 0)
    ) {
      return;
    }

    startTransition(async () => {
      const result = await onSubmitAnswer(currentQuestion, userAnswer);
      const nextFeedback = {
        questionId: currentQuestion.id,
        isCorrect: result.isCorrect,
        normalizedAnswer: result.normalizedAnswer,
      };

      setFeedback(nextFeedback);
      set挑战结果s((previous) => [...previous, nextFeedback]);
    });
  }

  function swapOrderingItem(index: number, direction: -1 | 1) {
    setOrderingAnswer((previous) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }

      const next = [...previous];
      const currentValue = next[index];
      next[index] = next[targetIndex] as string;
      next[targetIndex] = currentValue as string;
      return next;
    });
  }

  const correctCount = results.filter((item) => item.isCorrect).length;

  if (!started) {
    return (
      <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-8 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
        <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
          准备开始
        </p>
        <h2 className="mt-3 text-3xl font-semibold">开始一轮基础挑战</h2>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--color-muted)]">
          本轮共 {questions.length} 题。答题后会即时显示结果，并在最后汇总正确题数。
        </p>
        <button
          type="button"
          onClick={startRound}
          className="mt-8 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-white transition hover:brightness-105"
        >
          开始挑战
        </button>
      </section>
    );
  }

  if (isComplete) {
    return (
      <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-8 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
        <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
          挑战结果
        </p>
        <h2 className="mt-3 text-3xl font-semibold">本轮完成</h2>
        <p className="mt-4 text-base leading-8 text-[var(--color-muted)]">
          你答对了 {correctCount} / {questions.length} 题。
        </p>
        <div className="mt-6 space-y-3">
          {questions.map((question, index) => {
            const result = results[index];

            return (
              <div
                key={question.id}
                className="rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-card)] p-4"
              >
                <p className="text-sm text-[var(--color-muted)]">{question.title}</p>
                <p className="mt-2 text-lg font-medium">{question.prompt}</p>
                <p
                  className={`mt-3 text-sm ${
                    result?.isCorrect ? "text-[#2f6a45]" : "text-[#8c3e2f]"
                  }`}
                >
                  {result?.isCorrect ? "回答正确" : "回答有误"}
                </p>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={startRound}
          className="mt-8 rounded-full border border-[var(--color-line)] bg-white px-6 py-3 text-sm font-medium"
        >
          再来一轮
        </button>
      </section>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-8 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
          第 {currentIndex + 1} / {questions.length} 题
        </p>
        <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-sm text-[var(--color-muted)]">
          {currentQuestion.type === "couplet" && "对句"}
	          {currentQuestion.type === "author" && "选作者"}
	          {currentQuestion.type === "title" && "选诗名"}
	          {currentQuestion.type === "ordering" && "排序"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <h2 className="text-2xl font-semibold">{currentQuestion.title}</h2>
        {currentQuestion.type === "author" || currentQuestion.type === "title" ? null : (
          <p className="text-lg leading-8">{currentQuestion.prompt}</p>
        )}
      </div>

      <div className="mt-8">
        {currentQuestion.type === "couplet" ? (
          <label className="block space-y-2">
            <span className="text-sm text-[var(--color-muted)]">输入你的答案</span>
            <input
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-accent)]"
              placeholder="例如：处处闻啼鸟"
            />
          </label>
        ) : null}

        {currentQuestion.type === "author" ? (
          <AuthorChoiceQuestionCard
            question={currentQuestion}
            selectedChoice={selectedChoice}
            onSelectChoice={setSelectedChoice}
          />
        ) : null}

        {currentQuestion.type === "title" ? (
          <TitleChoiceQuestionCard
            question={currentQuestion}
            selectedChoice={selectedChoice}
            onSelectChoice={setSelectedChoice}
          />
        ) : null}

        {currentQuestion.type === "ordering" ? (
          <div className="space-y-3">
            {orderingAnswer.map((line, index) => (
              <div
                key={`${line}-${index}`}
                className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--color-line)] bg-white px-4 py-3"
              >
                <span className="min-w-7 text-sm text-[var(--color-muted)]">
                  {index + 1}
                </span>
                <p className="flex-1">{normalizeOptionLine(line)}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => swapOrderingItem(index, -1)}
                    className="rounded-full border border-[var(--color-line)] px-3 py-1 text-sm"
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    onClick={() => swapOrderingItem(index, 1)}
                    className="rounded-full border border-[var(--color-line)] px-3 py-1 text-sm"
                  >
                    下移
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {feedback?.questionId === currentQuestion.id ? (
        <div
          className={`mt-6 rounded-[1.5rem] px-4 py-3 text-sm ${
            feedback.isCorrect
              ? "bg-[rgba(92,146,109,0.12)] text-[#2f6a45]"
              : "bg-[rgba(188,91,66,0.12)] text-[#8c3e2f]"
          }`}
        >
          {feedback.isCorrect ? "回答正确，继续下一题。" : "回答有误，可以继续下一题。"}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {feedback?.questionId === currentQuestion.id ? (
          <button
            type="button"
            onClick={moveToNextQuestion}
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-white transition hover:brightness-105"
          >
            {currentIndex + 1 === questions.length ? "查看结果" : "下一题"}
          </button>
        ) : (
          <button
            type="button"
            onClick={submitCurrentAnswer}
            disabled={isPending}
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "判题中..." : "提交答案"}
          </button>
        )}
      </div>
    </section>
  );
}
