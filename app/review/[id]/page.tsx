import { notFound } from "next/navigation";

import { ReviewPoetryStage } from "@/components/review/review-poetry-stage";
import { getPoetryById } from "@/lib/poetry/repository";
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
  const poetry = await getPoetryById(id);

  if (!poetry || !userId) {
    notFound();
  }

  const viewModel = await getReviewPlayerViewModel({
    userId,
    poetryId: id,
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
