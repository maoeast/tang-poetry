"use client";

type NavItem = {
  tag: string;
  label: string;
};

type StickyCategoryNavProps = {
  items: NavItem[];
};

/**
 * Sticky category navigation — pure CSS sticky from parent,
 * this component only handles smooth-scroll on click.
 */
export function StickyCategoryNav({ items }: StickyCategoryNavProps) {
  const scrollTo = (tag: string) => {
    document
      .getElementById(`section-${tag}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex items-center gap-5 overflow-x-auto scrollbar-none">
      {items.map((item) => (
        <button
          key={item.tag}
          onClick={() => scrollTo(item.tag)}
          className="whitespace-nowrap text-sm text-ink-600 transition-colors hover:text-accent font-serif tracking-widest"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
