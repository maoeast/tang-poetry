"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { LifeStoryChapter } from "@/lib/author/life-story-parser";

type LifeStoryTimelineProps = {
  chapters: LifeStoryChapter[];
  sourceUrl: string | null;
};

export function LifeStoryTimeline({
  chapters,
  sourceUrl,
}: LifeStoryTimelineProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);

  const select = useCallback(
    (index: number) => {
      setActiveIndex(index);
    },
    [],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && activeIndex < chapters.length - 1) {
        setActiveIndex((i) => i + 1);
      } else if (e.key === "ArrowLeft" && activeIndex > 0) {
        setActiveIndex((i) => i - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, chapters.length]);

  // Scroll active node into view
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIndex]);

  const activeChapter = chapters[activeIndex];
  const contentParagraphs = activeChapter
    ? activeChapter.content
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <section className="mt-8 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-serif text-xl font-semibold tracking-wide">
          生平概述
        </h2>

        {/* Timeline nav */}
        <div
          ref={navRef}
          className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {chapters.map((ch, i) => (
            <button
              key={ch.heading}
              onClick={() => select(i)}
              className={`relative shrink-0 rounded-lg px-3 py-2 font-serif text-xs transition-all ${
                i === activeIndex
                  ? "translate-y-[2px] bg-gradient-to-b from-[#C4A87C] to-[#A89060] text-accent shadow-[0_1px_0_#8B7355,0_2px_6px_rgba(53,78,107,0.08)]"
                  : "bg-gradient-to-b from-[#C4A87C] to-[#A89060] text-ink-900 shadow-[0_3px_0_#8B7355,0_4px_8px_rgba(53,78,107,0.1)] hover:shadow-[0_2px_0_#8B7355,0_3px_6px_rgba(53,78,107,0.08)]"
              }`}
            >
              <span className="border border-[#8B7355]/40 rounded px-1">
                {ch.heading}
              </span>
            </button>
          ))}
        </div>

        {/* Connector line */}
        <div className="mt-1 h-px bg-ink-200/60" />

        {/* Content area */}
        <div className="mt-4 max-h-[40vh] overflow-y-auto rounded-[1.25rem] bg-surface/60 p-5">
          <div
            key={activeIndex}
            className="space-y-4 font-serif text-sm leading-[1.8] text-ink-600"
            style={{ animation: "fadeIn 0.3s ease-in-out" }}
          >
            {contentParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        {/* Chapter indicator */}
        <p className="mt-2 text-xs text-ink-400">
          {activeIndex + 1} / {chapters.length}
        </p>

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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
