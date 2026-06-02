import Image from "next/image";
import Link from "next/link";

import type { BrowsePoem } from "@/lib/browse/repository";

type PoetryCardProps = {
  poem: BrowsePoem;
};

export function PoetryCard({ poem }: PoetryCardProps) {
  const imageSrc = poem.image.thumbPath ?? poem.image.imagePath;

  return (
    <div className="group relative block overflow-hidden rounded-[1.25rem] border border-ink-200 bg-surface/82 shadow-[var(--shadow-card)] transition hover:bg-surface/50 hover:shadow-[var(--shadow-panel)]">
      <Link
        href={`/poetry/${poem.id}`}
        className="absolute inset-0 z-0"
        aria-label={`查看 ${poem.title}`}
      />
      <div className="relative z-10 pointer-events-none">
        <div className="relative aspect-[4/3] overflow-hidden bg-primary/10">
          <Image
            src={imageSrc}
            alt={`${poem.title} 配图`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        </div>
        <div className="px-4 py-3">
          <h3 className="truncate text-base font-medium">{poem.title}</h3>
          <p className="mt-1 truncate text-sm text-ink-600">
            {poem.dynasty} ·{" "}
            <Link
              href={`/author/${poem.author}` as import("next").Route}
              className="pointer-events-auto transition hover:text-ink-900"
            >
              {poem.author}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
