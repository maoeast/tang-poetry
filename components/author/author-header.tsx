import Image from "next/image";

import type { AuthorInfo } from "@/lib/author/repository";

type AuthorHeaderProps = {
  author: AuthorInfo;
};

export function AuthorHeader({ author }: AuthorHeaderProps) {
  const tags: string[] = [];
  if (author.literaryName) tags.push(author.literaryName);
  if (author.courtesyName) tags.push(`字${author.courtesyName}`);

  return (
    <section className="relative px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* Avatar with ink-wash effect */}
        <div className="relative shrink-0">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-ink-200/60 shadow-[0_4px_20px_rgba(53,78,107,0.12)]">
            <Image
              src={author.avatarUrl}
              alt={author.name}
              fill
              className="object-cover"
              sizes="112px"
            />
          </div>
          {/* Ink-wash halo */}
          <div className="pointer-events-none absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(53,78,107,0.08),transparent_70%)]" />
        </div>

        {/* Text block — left-aligned, constrained width */}
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-bold tracking-wide sm:text-4xl">
            {author.name}
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            {author.dynasty}
          </p>

          {/* Tags */}
          {tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {/* Bio */}
          {author.bio ? (
            <p className="mt-4 max-w-[65ch] text-left text-sm leading-8 text-ink-600">
              {author.bio}
            </p>
          ) : (
            <p className="mt-4 max-w-[65ch] text-left text-sm leading-8 text-ink-600 italic">
              此作者生平暂无考证，唯有佳作传世。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
