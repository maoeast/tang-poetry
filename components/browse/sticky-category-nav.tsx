"use client";

import { useEffect, useRef, useState } from "react";

type NavItem = {
  tag: string;
  label: string;
};

type StickyCategoryNavProps = {
  items: NavItem[];
};

export function StickyCategoryNav({ items }: StickyCategoryNavProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const scrollTo = (tag: string) => {
    document
      .getElementById(`section-${tag}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const entries = new Map<string, IntersectionObserverEntry>();

    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          entries.set(entry.target.id, entry);
        }

        // Find the topmost visible section (highest intersection ratio wins; tiebreak by DOM order)
        const tags = itemsRef.current.map((i) => i.tag);
        let bestTag: string | null = null;
        let bestRatio = 0;

        for (const tag of tags) {
          const entry = entries.get(`section-${tag}`);
          if (entry && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestTag = tag;
          }
        }

        // Only update if we found a visible section with ratio > 0
        if (bestRatio > 0 && bestTag) {
          setActiveTag(bestTag);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      },
    );

    // Observe all sections
    const sectionIds = itemsRef.current.map((i) => `section-${i.tag}`);
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex items-center gap-5 overflow-x-auto scrollbar-none">
      {items.map((item) => (
        <button
          key={item.tag}
          onClick={() => scrollTo(item.tag)}
          className={`whitespace-nowrap text-sm transition-colors font-serif tracking-widest ${
            activeTag === item.tag
              ? "text-accent border-b-2 border-accent pb-px"
              : "text-ink-400 hover:text-ink-600"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
