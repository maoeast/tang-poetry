import Image from "next/image";
import Link from "next/link";

import type { BrowsePoem } from "@/lib/browse/repository";

type PoetryCardProps = {
  poem: BrowsePoem;
};

export function PoetryCard({ poem }: PoetryCardProps) {
  const imageSrc = poem.image.thumbPath ?? poem.image.imagePath;

  return (
    <div className="group relative block overflow-hidden rounded-xl border border-ink-200/60 bg-surface/70 transition-colors hover:border-ink-300/60 hover:shadow-[var(--shadow-card)]">
      <Link
        href={`/poetry/${poem.id}`}
        className="absolute inset-0 z-0"
        aria-label={`查看 ${poem.title}`}
      />
      <div className="relative z-10 pointer-events-none">
        <div className="relative aspect-[4/3] overflow-hidden bg-primary/5">
          <Image
            src={imageSrc}
            alt={`${poem.title} 配图`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        </div>
        {/* Center-aligned text — traditional symmetry */}
        <div className="px-5 pt-5 pb-4 text-center">
          <h3 className="truncate text-base font-serif font-medium text-ink-900">
            {poem.title}
          </h3>
          <p className="mt-1.5 truncate text-sm text-ink-500">
            {poem.dynasty} ·{" "}
            <Link
              href={`/author/${poem.author}` as import("next").Route}
              className="pointer-events-auto transition-colors hover:text-ink-900"
            >
              {poem.author}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
