"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import {
  buildReviewBatchQueue,
  type ReviewBucketKey,
  type ReviewBuckets,
  type ReviewStateSnapshot,
} from "@/lib/review/scheduler";
import { writeReviewQueue } from "@/lib/review/session-queue";

type ReviewListProps = {
  buckets: ReviewBuckets;
  suggestedCount: number;
  upcomingCount: number;
};

const REVIEW_CARD_LAYOUT = {
  width: 80,
  height: 120,
} as const;

export function getReviewCardLayout() {
  return REVIEW_CARD_LAYOUT;
}

function getBucketLabel(bucket: ReviewBucketKey) {
  if (bucket === "todayDue") {
    return "待复习";
  }

  if (bucket === "recentWrong") {
    return "错题";
  }

  return "即将到期";
}

function getBucketTitle(bucket: ReviewBucketKey) {
  if (bucket === "todayDue") {
    return "今日待复习";
  }

  if (bucket === "recentWrong") {
    return "最近错题";
  }

  return "即将到期";
}

function buildReviewHref(poetryId: string, from: ReviewBucketKey, index: number) {
  return `/review/${poetryId}?from=${from}&index=${index}` as Route;
}

function ReviewPosterCard({
  item,
  badge,
  href,
  onOpen,
}: {
  item: ReviewStateSnapshot;
  badge: string;
  href: Route;
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const layout = getReviewCardLayout();

  return (
    <article className="flex h-[120px] min-w-0 overflow-hidden rounded-[1.25rem] border border-ink-200 bg-surface/82 shadow-[var(--shadow-card)]">
      <div
        className="relative shrink-0 overflow-hidden border-r border-ink-200 bg-primary/10"
        style={{ width: `${layout.width}px`, height: `${layout.height}px` }}
      >
        <Image
          src={item.image.thumbPath ?? item.image.imagePath}
          alt={`${item.title} 配图`}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      <div className="flex min-w-0 flex-1 items-stretch justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-medium">{item.title}</h3>
              <p className="truncate text-sm text-ink-600">{item.author}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.65rem] tracking-[0.18em] text-ink-600 uppercase">
              {badge}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-600">
            <span className="rounded-full border border-ink-200 px-2.5 py-1">
              熟练度 {item.mastery}
            </span>
            <span className="rounded-full border border-ink-200 px-2.5 py-1">
              错题 {item.wrongCount}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-end">
          <Link
            href={href}
            onClick={onOpen}
            className="inline-flex rounded-full bg-surface px-4 py-2 text-sm transition hover:bg-surface"
          >
            开始复习
          </Link>
        </div>
      </div>
    </article>
  );
}

function ReviewBucketSection({
  title,
  bucketKey,
  items,
  emptyText,
  buckets,
}: {
  title: string;
  bucketKey: ReviewBucketKey;
  items: ReviewStateSnapshot[];
  emptyText: string;
  buckets: ReviewBuckets;
}) {
  const router = useRouter();

  function handleOpen(item: ReviewStateSnapshot, index: number) {
    const queuePoetryIds = buildReviewBatchQueue(buckets, bucketKey);

    if (queuePoetryIds.length === 0) {
      return;
    }

    writeReviewQueue(queuePoetryIds, item.poetryId);
    router.push(buildReviewHref(item.poetryId, bucketKey, index));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {bucketKey === "todayDue" ? (
          <span className="text-sm text-ink-600">错题优先排序</span>
        ) : null}
      </div>
      {items.length > 0 ? (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <ReviewPosterCard
              key={item.poetryId}
              item={item}
              badge={getBucketLabel(bucketKey)}
              href={buildReviewHref(item.poetryId, bucketKey, index)}
              onOpen={(event) => {
                event.preventDefault();
                handleOpen(item, index);
              }}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-[1.5rem] border border-ink-200 bg-surface/78 p-5 text-sm leading-7 text-ink-600">
          {emptyText}
        </p>
      )}
    </section>
  );
}

export function ReviewList({
  buckets,
  suggestedCount,
  upcomingCount,
}: ReviewListProps) {
  const router = useRouter();
  const suggestedQueue = buildReviewBatchQueue(buckets, "todayDue");
  const firstSuggestedPoetryId = suggestedQueue[0] ?? null;

  function handleStartSuggestedReview() {
    if (!firstSuggestedPoetryId) {
      router.push("/challenge");
      return;
    }

    writeReviewQueue(suggestedQueue, firstSuggestedPoetryId);
    router.push(buildReviewHref(firstSuggestedPoetryId, "todayDue", 0));
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-ink-200 bg-surface/75 p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm tracking-[0.24em] text-ink-600 uppercase">
            今日建议
          </p>
          <p className="mt-3 text-3xl font-semibold">{suggestedCount}</p>
          <p className="mt-2 text-sm leading-7 text-ink-600">
            今天可优先复习的诗作数量。
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-ink-200 bg-surface/75 p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm tracking-[0.24em] text-ink-600 uppercase">
            即将到期
          </p>
          <p className="mt-3 text-3xl font-semibold">{upcomingCount}</p>
          <p className="mt-2 text-sm leading-7 text-ink-600">
            未来 7 天内会进入复习池的内容。
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-ink-200 bg-surface/75 p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm tracking-[0.24em] text-ink-600 uppercase">
            开始复习
          </p>
          <button
            type="button"
            onClick={handleStartSuggestedReview}
            className="mt-4 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-medium text-white transition hover:brightness-105"
          >
            {firstSuggestedPoetryId ? "从当前批次开始" : "先去闯关练习"}
          </button>
          <p className="mt-3 text-sm leading-7 text-ink-600">
            选择一首诗开始复习。
          </p>
        </article>
      </section>

      <ReviewBucketSection
        title={getBucketTitle("todayDue")}
        bucketKey="todayDue"
        items={buckets.todayDue}
        emptyText="今日暂时没有到期复习内容，可以先去闯关页练习新诗。"
        buckets={buckets}
      />

      <ReviewBucketSection
        title={getBucketTitle("recentWrong")}
        bucketKey="recentWrong"
        items={buckets.recentWrong}
        emptyText="目前还没有错题记录，继续保持。"
        buckets={buckets}
      />

      <ReviewBucketSection
        title={getBucketTitle("upcoming")}
        bucketKey="upcoming"
        items={buckets.upcoming}
        emptyText="未来几天暂时没有新的到期内容。"
        buckets={buckets}
      />
    </div>
  );
}
