import Link from "next/link";
import type { Route } from "next";

import { ChallengeRunner } from "@/components/challenge/challenge-runner";
import {
  buildChallengeRound,
  getChallengePoetrySeeds,
  submitChallengeAnswer,
  type ChallengeQuestion,
} from "@/lib/challenge/engine";

export const dynamic = "force-dynamic";

async function recordChallengeAnswer(
  question: ChallengeQuestion,
  userAnswer: string | string[],
) {
  "use server";

  return submitChallengeAnswer({
    question,
    userAnswer,
  });
}

export default async function ChallengePage() {
  const poetrySeeds = await getChallengePoetrySeeds();
  const challengeRound = buildChallengeRound(poetrySeeds);

  return (
    <main className="min-h-screen bg-[var(--color-page)] px-6 py-10 text-[var(--color-ink)] sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={"/" as Route}
            className="inline-flex w-fit items-center rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-2 text-sm text-[var(--color-muted)] transition hover:bg-white"
          >
            返回首页
          </Link>
          <p className="text-sm tracking-[0.24em] text-[var(--color-muted)] uppercase">
            Challenge
          </p>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-card)] p-8 shadow-[var(--shadow-soft)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.25),transparent_30%)]" />

          <div className="relative space-y-4">
            <h1 className="text-4xl font-semibold sm:text-5xl">挑战闯关</h1>
            <p className="max-w-3xl text-base leading-8 text-[var(--color-muted)]">
              当前版本先打通四类基础题型的闭环：对句、作者、诗名和乱序排句。每次作答都会写入挑战记录，并同步更新学习事件。
            </p>
          </div>
        </section>

        {challengeRound.questions.length > 0 ? (
          <ChallengeRunner
            questions={challengeRound.questions}
            onSubmitAnswer={recordChallengeAnswer}
          />
        ) : (
          <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-8 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
            <h2 className="text-2xl font-semibold">题库暂未就绪</h2>
            <p className="mt-4 text-sm leading-8 text-[var(--color-muted)]">
              当前数据库里还没有可用于出题的诗歌，请先完成唐诗数据导入。
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
