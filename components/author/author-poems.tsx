import Image from "next/image";
import Link from "next/link";

import type { AuthorPoem } from "@/lib/author/repository";

type AuthorPoemsProps = {
  poems: AuthorPoem[];
  authorName: string;
};

function PoemCard({ poem }: { poem: AuthorPoem }) {
  const imageSrc = poem.image.thumbPath ?? poem.image.imagePath;

  return (
    <Link
      href={`/poetry/${poem.id}`}
      className="group block overflow-hidden rounded-[1.25rem] border border-ink-200 bg-surface/82 shadow-[var(--shadow-card)] transition hover:bg-surface hover:shadow-[var(--shadow-panel)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-primary/10">
        <Image
          src={imageSrc}
          alt={`${poem.title} 配图`}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-medium">{poem.title}</h3>
          {poem.formTag ? (
            <span className="shrink-0 rounded-full border border-ink-200 px-2 py-0.5 text-[0.65rem] text-ink-400">
              {poem.formTag}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-sm text-ink-600">
          {poem.previewLine}
        </p>
      </div>
    </Link>
  );
}

function PoemListItem({ poem }: { poem: AuthorPoem }) {
  return (
    <Link
      href={`/poetry/${poem.id}`}
      className="group flex items-center gap-4 rounded-[1.25rem] border border-ink-200 bg-surface/72 px-4 py-3 transition hover:bg-surface hover:shadow-[var(--shadow-card)]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-base font-medium">{poem.title}</p>
          {poem.formTag ? (
            <span className="shrink-0 rounded-full border border-ink-200 px-2 py-0.5 text-[0.65rem] text-ink-400">
              {poem.formTag}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-sm text-ink-600">
          {poem.previewLine}
        </p>
      </div>
      {/* Arrow indicator */}
      <span className="shrink-0 text-ink-200 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
        </svg>
      </span>
    </Link>
  );
}

export function AuthorPoems({ poems, authorName }: AuthorPoemsProps) {
  if (poems.length === 0) {
    return (
      <section>
        <h2 className="font-serif text-xl font-semibold">收录作品</h2>
        <p className="mt-4 text-sm text-ink-600">
          暂未收录 {authorName} 的作品。
        </p>
      </section>
    );
  }

  const useCards = poems.length <= 6;

  return (
    <section>
      <h2 className="font-serif text-xl font-semibold">
        收录作品{" "}
        <span className="font-normal text-ink-400">
          {poems.length} 首
        </span>
      </h2>

      {useCards ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {poems.map((poem) => (
            <PoemCard key={poem.id} poem={poem} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {poems.map((poem) => (
            <PoemListItem key={poem.id} poem={poem} />
          ))}
        </div>
      )}
    </section>
  );
}
