import Image from "next/image";

import type { AuthorInfo } from "@/lib/author/repository";

const DEFAULT_AVATAR = "/images/authors/default.svg";

type AuthorHeaderProps = {
  author: AuthorInfo;
};

export function AuthorHeader({ author }: AuthorHeaderProps) {
  const tags: string[] = [];
  if (author.literaryName) tags.push(author.literaryName);
  if (author.courtesyName) tags.push(`字${author.courtesyName}`);

  const isDefaultAvatar = author.avatarUrl === DEFAULT_AVATAR;

  return (
    <section className="relative px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* Avatar with ink-wash halo */}
        <div className="relative shrink-0">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-ink-200/60 shadow-[0_4px_20px_rgba(53,78,107,0.12)]">
            {isDefaultAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={DEFAULT_AVATAR}
                alt={author.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={author.avatarUrl}
                alt={author.name}
                fill
                className="object-cover"
                sizes="112px"
              />
            )}
          </div>
          <div className="pointer-events-none absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(53,78,107,0.08),transparent_70%)]" />
        </div>

        {/* Right: name, dynasty, tags, bio */}
        <div className="min-w-0 text-center sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-baseline sm:gap-3">
            <h1 className="font-serif text-3xl font-bold tracking-wide sm:text-4xl">
              {author.name}
            </h1>
            <span className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-400">
              {author.dynasty}
            </span>
          </div>

          {/* Tags — seal stamp style */}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-sm border border-accent/40 px-2.5 py-0.5 font-serif text-[0.65rem] text-accent shadow-[0_2px_0_rgba(184,75,75,0.25)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {author.bio ? (
            <p className="mt-4 max-w-[65ch] text-sm leading-8 text-ink-600">
              {author.bio}
            </p>
          ) : (
            <p className="mt-4 max-w-[65ch] text-sm leading-8 italic text-ink-500">
              此作者生平暂无考证，唯有佳作传世。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
