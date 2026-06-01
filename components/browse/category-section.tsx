import type { PoetryCategory } from "@/lib/browse/repository";
import { PoetryCard } from "./poetry-card";

type CategorySectionProps = {
  category: PoetryCategory;
};

export function CategorySection({ category }: CategorySectionProps) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{category.label}</h2>
        <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-sm text-[var(--color-muted)]">
          {category.count} 首
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {category.poems.map((poem) => (
          <PoetryCard key={poem.id} poem={poem} />
        ))}
      </div>
    </section>
  );
}
