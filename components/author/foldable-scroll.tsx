"use client";

import { useState } from "react";

type FoldableScrollProps = {
  text: string;
  sourceUrl: string | null;
};

export function FoldableScroll({ text, sourceUrl }: FoldableScrollProps) {
  const [expanded, setExpanded] = useState(false);

  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="mt-8 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-serif text-xl font-semibold tracking-wide">
          生平概述
        </h2>

        <div className="relative mt-4">
          <div
            className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
              expanded ? "max-h-[9999px]" : "max-h-[280px]"
            }`}
          >
            <div className="space-y-4 font-serif text-sm leading-[1.8] text-ink-600">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          {/* Gradient mask when collapsed */}
          {!expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper to-transparent" />
          )}
        </div>

        {/* Expand / collapse button */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 rounded-full border border-ink-200 bg-surface/70 px-4 py-2 text-sm text-ink-500 transition hover:bg-surface/50"
        >
          {expanded ? "收起" : "展开完整生平"}
        </button>

        {sourceUrl && (
          <p className="mt-4 text-xs text-ink-400">
            来源：
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-500 transition hover:text-primary"
            >
              古文岛
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
