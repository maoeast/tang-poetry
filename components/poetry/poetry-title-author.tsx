import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

type PoetryTitleAuthorProps = {
  title: string;
  author: string;
  dynasty: string;
  authorAvatarUrl?: string | null;
  subtitle?: string;
};

export function PoetryTitleAuthor({
  title,
  author,
  dynasty,
  authorAvatarUrl,
  subtitle,
}: PoetryTitleAuthorProps) {
  return (
    <div className="shrink-0 text-center">
      {subtitle ? (
        <p className="text-sm tracking-[0.24em] text-ink-400">{subtitle}</p>
      ) : null}
      <h1
        className={`font-serif tracking-wide ${
          subtitle ? "mt-3" : ""
        } ${
          title.length > 15
            ? "text-2xl font-semibold leading-relaxed sm:text-3xl"
            : "text-3xl font-bold leading-tight sm:text-4xl"
        }`}
      >
        {title}
      </h1>
      <Link
        href={`/author/${author}` as Route}
        className="mt-2.5 inline-flex items-center justify-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/5"
      >
        {authorAvatarUrl ? (
          <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-ink-200/60">
            <Image
              src={authorAvatarUrl}
              alt={author}
              fill
              className="object-cover"
              sizes="28px"
            />
          </span>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-primary/10 text-xs font-serif text-ink-600">
            {author.charAt(0)}
          </span>
        )}
        <span className="font-serif text-sm text-ink-600">
          {dynasty} · {author}
        </span>
      </Link>
    </div>
  );
}
