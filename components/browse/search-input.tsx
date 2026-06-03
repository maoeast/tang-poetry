"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";

/**
 * Search input with debounced URL param update.
 * - IME-safe: guards router.replace during composition (Chinese input).
 * - No key-based remounting: uses isLocalUpdate ref to distinguish
 *   self-triggered URL changes from browser back/forward.
 * - Renders directly inside Suspense (useSearchParams requires boundary).
 */
function SearchInputInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Track whether the current URL change was initiated by us (debounce/clear)
  // vs. an external navigation (browser back/forward).
  const isLocalUpdate = useRef(false);

  // Track IME composition state to avoid calling router.replace mid-composition.
  const isComposing = useRef(false);

  const updateSearch = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams);
      if (q) {
        params.set("q", q);
      } else {
        params.delete("q");
      }
      const url = params.toString() ? `/browse?${params.toString()}` : "/browse";
      router.replace(url as Route, { scroll: false });
    },
    [router, searchParams],
  );

  // Sync local state when URL changes externally (back/forward navigation)
  useEffect(() => {
    if (!isLocalUpdate.current) {
      setValue(urlQuery);
    }
    isLocalUpdate.current = false;
  }, [urlQuery]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const scheduleUpdate = useCallback(
    (newValue: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        isLocalUpdate.current = true;
        updateSearch(newValue);
      }, 300);
    },
    [updateSearch],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Don't trigger URL update during IME composition
    if (isComposing.current) return;

    scheduleUpdate(newValue);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposing.current = false;
    // Fire update with the final committed text
    const finalValue = (e.target as HTMLInputElement).value;
    scheduleUpdate(finalValue);
  };

  const handleClear = () => {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    isLocalUpdate.current = true;
    updateSearch("");
  };

  return (
    <div className="relative w-64 sm:w-80">
      {/* Search icon */}
      <svg
        className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onCompositionStart={() => {
          isComposing.current = true;
        }}
        onCompositionEnd={handleCompositionEnd}
        placeholder="搜索标题、作者或诗句…"
        className="w-full rounded-lg border border-ink-200/60 bg-surface/50 py-2.5 pl-10 pr-10 text-sm text-ink-900 placeholder:text-ink-400/80 transition-colors focus:border-ink-300/80 focus:outline-none font-serif tracking-wide"
        aria-label="搜索诗歌"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 transition-colors hover:text-ink-600"
          aria-label="清除搜索"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Search input wrapped in Suspense (required for useSearchParams).
 */
export function SearchInput() {
  return (
    <Suspense fallback={<SearchInputFallback />}>
      <SearchInputInner />
    </Suspense>
  );
}

/** Non-interactive placeholder shown while Suspense is loading */
function SearchInputFallback() {
  return (
    <div className="relative w-64 sm:w-80">
      <div className="w-full rounded-lg border border-ink-200/60 bg-surface/50 py-2.5 pl-10 pr-10 text-sm text-ink-400/60 font-serif tracking-wide">
        搜索标题、作者或诗句…
      </div>
    </div>
  );
}
