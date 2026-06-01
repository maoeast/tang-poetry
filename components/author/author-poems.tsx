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
      className="group block overflow-hidden rounded-[1.25rem] border border-[var(--color-line)] bg-white/82 shadow-[0_12px_30px_rgba(91,74,59,0.08)] transition hover:bg-white hover:shadow-[var(--shadow-soft)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-accent-soft)]">
        <Image
          src={imageSrc}
          alt={`${poem.title} 配图`}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="px-4 py-3">
        <h3 className="truncate text-base font-medium">{poem.title}</h3>
        <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
          {poem.formTag ?? "诗"}
        </p>
      </div>
    </Link>
  );
}

function PoemListItem({ poem }: { poem: AuthorPoem }) {
  return (
    <Link
      href={`/poetry/${poem.id}`}
      className="block rounded-[1.25rem] border border-[var(--color-line)] bg-white/72 p-4 transition hover:bg-white"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium">{poem.title}</p>
          <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
            {poem.previewLine}
          </p>
        </div>
        {poem.formTag && (
          <span className="shrink-0 rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-3 py-1 text-xs text-[var(--color-muted)]">
            {poem.formTag}
          </span>
        )}
      </div>
    </Link>
  );
}

export function AuthorPoems({ poems, authorName }: AuthorPoemsProps) {
  if (poems.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold">收录作品</h2>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          暂未收录 {authorName} 的作品。
        </p>
      </section>
    );
  }

  const useCards = poems.length <= 6;

  return (
    <section>
      <h2 className="text-xl font-semibold">
        收录作品{" "}
        <span className="font-normal text-[var(--color-muted)]">
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
        <div className="mt-4 space-y-3">
          {poems.map((poem) => (
            <PoemListItem key={poem.id} poem={poem} />
          ))}
        </div>
      )}
    </section>
  );
}
