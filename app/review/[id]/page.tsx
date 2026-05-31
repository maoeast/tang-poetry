import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ReviewPoetryStage } from "@/components/review/review-poetry-stage";
import { getPoetryById } from "@/lib/poetry/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";
import {
  getReviewPlayerViewModel,
  submitReviewSelfReport,
} from "@/lib/review/scheduler";

type ReviewPlayerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function recordReviewSelfReport(input: {
  poetryId: string;
  isCorrect: boolean;
}) {
  "use server";

  return submitReviewSelfReport(input);
}

export const dynamic = "force-dynamic";

export default async function ReviewPlayerPage({
  params,
}: ReviewPlayerPageProps) {
  const userId = process.env.SYSTEM_USER_ID;
  const { id } = await params;
  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );
  const poetry = await getPoetryById(id, undefined, undefined, scriptVariant);

  if (!poetry || !userId) {
    notFound();
  }

  const viewModel = await getReviewPlayerViewModel({
    userId,
    poetryId: id,
    scriptVariant,
  });

  return (
    <ReviewPoetryStage
      key={poetry.id}
      poetry={poetry}
      initialQueuePoetryIds={viewModel.queuePoetryIds}
      initialQueuePosition={viewModel.queuePosition}
      dueTodayCount={viewModel.dueTodayCount}
      upcomingCount={viewModel.upcomingCount}
      recentWrongCount={viewModel.recentWrongCount}
      onSubmitReviewSelfReport={recordReviewSelfReport}
    />
  );
}
