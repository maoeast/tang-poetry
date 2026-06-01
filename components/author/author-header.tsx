import Image from "next/image";

import type { AuthorInfo } from "@/lib/author/repository";

type AuthorHeaderProps = {
  author: AuthorInfo;
};

export function AuthorHeader({ author }: AuthorHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-card)] p-8 shadow-[var(--shadow-soft)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.25),transparent_30%)]" />

      <div className="relative flex flex-col items-center text-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-[3px] border-[rgba(222,196,150,0.6)]">
          <Image
            src={author.avatarUrl}
            alt={author.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>

        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          {author.name}
        </h1>

        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {author.dynasty}
          {author.courtesyName ? ` · 字${author.courtesyName}` : ""}
          {author.literaryName ? ` · ${author.literaryName}` : ""}
        </p>

        {author.bio ? (
          <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--color-muted)]">
            {author.bio}
          </p>
        ) : (
          <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--color-muted)] italic">
            此作者生平暂无考证，唯有佳作传世。
          </p>
        )}
      </div>
    </section>
  );
}
