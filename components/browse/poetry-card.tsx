import Image from "next/image";
import Link from "next/link";

import type { BrowsePoem } from "@/lib/browse/repository";

type PoetryCardProps = {
  poem: BrowsePoem;
};

export function PoetryCard({ poem }: PoetryCardProps) {
  const imageSrc = poem.image.thumbPath ?? poem.image.imagePath;

  return (
    <Link
      href={`/poetry/${poem.id}`}
      className="group block overflow-hidden rounded-[1.25rem] border border-[var(--color-line)] bg-white/82 shadow-[0_12px_30px_rgba(91,74,59,0.08)] transition hover:bg-white hover:shadow-[var(--shadow-soft)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-accent-soft)]">
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
        <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
          {poem.dynasty} · {poem.author}
        </p>
      </div>
    </Link>
  );
}
