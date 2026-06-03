"use client";

import { useRouter } from "next/navigation";

/**
 * Dynamic back button — navigates to the previous page in browser history.
 * Falls back to home page if there is no history (direct URL entry / bookmark).
 */
export function BackButton() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex w-fit items-center gap-1.5 rounded-full border border-ink-200 bg-surface/72 px-4 py-2 text-sm text-ink-600 transition hover:bg-surface/50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 0 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
      </svg>
      返回
    </button>
  );
}
