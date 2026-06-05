"use client";

import { useEffect, useRef, useState } from "react";

type ExpandableTextProps = {
  text: string;
  /** Maximum visible lines before clamping (default 8) */
  maxLines?: number;
};

export function ExpandableText({ text, maxLines = 8 }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    // Temporarily remove clamp to measure natural height
    const prevStyle = el.style.cssText;
    el.style.cssText = "";
    const natural = el.scrollHeight;
    el.style.cssText = prevStyle;
    const clamped = el.clientHeight;
    // Rounding tolerance: treat as overflowing if natural > clamped by >1px
    setOverflows(natural - clamped > 1);
  }, [text, maxLines]);

  return (
    <div>
      <p
        ref={textRef}
        className="mt-2 whitespace-pre-line text-sm leading-8 text-ink-600"
        style={
          !expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {text}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 flex items-center gap-1 rounded-full border border-ink-200 bg-surface/70 px-3 py-1 text-sm text-ink-500 transition hover:bg-surface/50 hover:text-ink-700"
        >
          {expanded ? "收起" : "展开全部"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}
