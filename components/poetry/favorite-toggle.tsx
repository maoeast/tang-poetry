"use client";

import { useState, useTransition } from "react";

type FavoriteToggleProps = {
  poetryId: string;
  initialIsFavorite: boolean;
  onToggle: (poetryId: string) => Promise<{ isFavorite: boolean }>;
};

export function FavoriteToggle({
  poetryId,
  initialIsFavorite,
  onToggle,
}: FavoriteToggleProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    // Optimistic flip
    const next = !isFavorite;
    setIsFavorite(next);

    startTransition(async () => {
      try {
        const result = await onToggle(poetryId);
        // Reconcile with server truth
        setIsFavorite(result.isFavorite);
      } catch {
        // Revert on failure
        setIsFavorite(isFavorite);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "取消收藏" : "收藏"}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface/70 px-4 py-2 text-sm text-ink-700 transition hover:bg-surface/50 disabled:opacity-50"
    >
      <HeartIcon filled={isFavorite} />
      <span>{isFavorite ? "已收藏" : "收藏"}</span>
    </button>
  );
}

/* ── Inline SVG heart (no icon library) ── */

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={filled ? "text-rose-500" : "text-ink-500"}
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
