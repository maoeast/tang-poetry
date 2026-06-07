"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { TimelineChapter } from "@/lib/author/life-story-parser";

/* ── Types ────────────────────────────────────────────── */

type PoetTimelineProps = {
  chapters: TimelineChapter[];
};

/* ── Badge config ─────────────────────────────────────── */

const TAG_MAP = {
  poem: { label: "诗文", cls: "pt-badge--poem" },
  turn: { label: "转折", cls: "pt-badge--turn" },
  friend: { label: "交游", cls: "pt-badge--friend" },
  hidden: { label: "隐逸", cls: "pt-badge--hidden" },
} as const;

/* ── Component ────────────────────────────────────────── */

export function PoetTimeline({ chapters }: PoetTimelineProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionKey, setTransitionKey] = useState(0);
  const [visible, setVisible] = useState(true);
  const navRef = useRef<HTMLDivElement>(null);
  const activeChapter = chapters[activeIndex];

  const select = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      setVisible(false);
      // Short delay for leave animation
      setTimeout(() => {
        setActiveIndex(index);
        setTransitionKey((k) => k + 1);
        setVisible(true);
      }, 180);
    },
    [activeIndex],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && activeIndex < chapters.length - 1) {
        select(activeIndex + 1);
      } else if (e.key === "ArrowLeft" && activeIndex > 0) {
        select(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, chapters.length, select]);

  // Scroll active tab into view
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeIndex]);

  const progressPct = ((activeIndex + 1) / chapters.length) * 100;

  return (
    <section className="poet-timeline">
      {/* Progress bar */}
      <div className="pt-progress">
        <div
          className="pt-progress__fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Tab bar — flex-wrap, auto line break at ≥5 */}
      <div ref={navRef} className="pt-tabs">
        {chapters.map((ch, i) => (
          <button
            key={ch.tab}
            className={`pt-tab ${i === activeIndex ? "pt-tab--active" : ""}`}
            onClick={() => select(i)}
          >
            {ch.tab}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div
        key={transitionKey}
        className={`pt-card ${visible ? "pt-card--visible" : "pt-card--hidden"}`}
      >
        {/* Gold accent line on left is handled in CSS ::before */}

        <div className="pt-card__header">
          <h3 className="pt-card__title">{activeChapter.tab}</h3>
          <span className="pt-card__period">{activeChapter.period}</span>
        </div>
        <p className="pt-card__summary">{activeChapter.summary}</p>

        <ul className="pt-events">
          {activeChapter.events.map((evt, ei) => {
            const tagInfo = evt.tag ? TAG_MAP[evt.tag] : null;
            return (
              <li key={ei} className="pt-event">
                <div className="pt-event__time">
                  <span className="pt-event__year">{evt.year}</span>
                  <span className="pt-event__era">{evt.era}</span>
                </div>
                <div className="pt-event__body">
                  <span className="pt-event__text">{evt.text}</span>
                  {tagInfo && (
                    <span className={`pt-badge ${tagInfo.cls}`}>
                      {tagInfo.label}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Scoped styles */}
      <style jsx>{`
        /* ── Color tokens ────────────────────────────── */
        .poet-timeline {
          --pt-card-bg: #fdfbf7;
          --pt-card-border: #e0d6c2;
          --pt-accent-line: #c9a84c;
          --pt-tab-border: #d4c8a8;
          --pt-tab-text: #6b5d4f;
          --pt-tab-active-bg: #4a3b2a;
          --pt-tab-active-text: #f0e0b8;
          --pt-title: #3c3228;
          --pt-text: #4a3f34;
          --pt-text-secondary: #8b7a65;
          --pt-progress-bg: #e0d6c2;
          --pt-progress-fill: #c9a84c;
          --pt-badge-poem-bg: rgba(180, 155, 80, 0.18);
          --pt-badge-poem-text: #8a7230;
          --pt-badge-turn-bg: rgba(200, 90, 65, 0.15);
          --pt-badge-turn-text: #b34233;
          --pt-badge-friend-bg: rgba(46, 179, 138, 0.15);
          --pt-badge-friend-text: #1d7a5f;
          --pt-badge-hidden-bg: rgba(120, 120, 120, 0.15);
          --pt-badge-hidden-text: #6b6b6b;

          border-radius: 1rem;
          padding: 1.5rem;
          background: transparent;
        }

        /* ── Progress bar ─────────────────────────────── */
        .pt-progress {
          height: 3px;
          border-radius: 2px;
          background: var(--pt-progress-bg);
          margin-bottom: 1.25rem;
          overflow: hidden;
        }
        .pt-progress__fill {
          height: 100%;
          border-radius: 2px;
          background: var(--pt-progress-fill);
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ── Tabs ─────────────────────────────────────── */
        .pt-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .pt-tab {
          min-height: 44px;
          padding: 0.5rem 1.25rem;
          border: 1.5px solid var(--pt-tab-border);
          border-radius: 999px;
          background: transparent;
          color: var(--pt-tab-text);
          font-size: 0.875rem;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.25s ease;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .pt-tab:hover {
          background: color-mix(in srgb, var(--pt-tab-active-bg) 10%, transparent);
        }
        .pt-tab--active {
          background: var(--pt-tab-active-bg);
          color: var(--pt-tab-active-text);
          border-color: var(--pt-tab-active-bg);
          font-weight: 600;
        }

        /* ── Card ─────────────────────────────────────── */
        .pt-card {
          position: relative;
          background: var(--pt-card-bg);
          border: 1px solid var(--pt-card-border);
          border-radius: 0.875rem;
          padding: 1.5rem 1.5rem 1.5rem 2rem;
          overflow: hidden;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .pt-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(
            to bottom,
            var(--pt-accent-line),
            color-mix(in srgb, var(--pt-accent-line) 30%, transparent)
          );
          border-radius: 3px 0 0 3px;
        }

        /* Transition states */
        .pt-card--visible {
          opacity: 1;
          transform: translateY(0);
        }
        .pt-card--hidden {
          opacity: 0;
          transform: translateY(8px);
        }

        .pt-card__header {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .pt-card__title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--pt-title);
        }
        .pt-card__period {
          font-size: 0.8125rem;
          color: var(--pt-text-secondary);
          letter-spacing: 0.04em;
        }
        .pt-card__summary {
          margin: 0.5rem 0 0;
          font-size: 0.875rem;
          color: var(--pt-text-secondary);
          line-height: 1.6;
        }

        /* ── Events ───────────────────────────────────── */
        .pt-events {
          list-style: none;
          margin: 1.25rem 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .pt-event {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
        }
        .pt-event__time {
          flex-shrink: 0;
          width: 5.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          text-align: right;
          padding-top: 0.1rem;
        }
        .pt-event__year {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--pt-title);
          font-variant-numeric: tabular-nums;
        }
        .pt-event__era {
          font-size: 0.75rem;
          color: var(--pt-text-secondary);
        }
        .pt-event__body {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          flex-wrap: wrap;
          flex: 1;
          min-width: 0;
        }
        .pt-event__text {
          font-size: 0.9375rem;
          line-height: 1.75;
          color: var(--pt-text);
        }

        /* ── Badges ───────────────────────────────────── */
        .pt-badge {
          flex-shrink: 0;
          display: inline-block;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          font-size: 0.6875rem;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .pt-badge--poem {
          background: var(--pt-badge-poem-bg);
          color: var(--pt-badge-poem-text);
        }
        .pt-badge--turn {
          background: var(--pt-badge-turn-bg);
          color: var(--pt-badge-turn-text);
        }
        .pt-badge--friend {
          background: var(--pt-badge-friend-bg);
          color: var(--pt-badge-friend-text);
        }
        .pt-badge--hidden {
          background: var(--pt-badge-hidden-bg);
          color: var(--pt-badge-hidden-text);
        }
      `}</style>
    </section>
  );
}
