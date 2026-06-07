import Link from "next/link";
import type { Route } from "next";
import type { AuthorListItem } from "@/lib/author/repository";

type AuthorCardProps = {
  author: AuthorListItem;
};

export function AuthorCard({ author }: AuthorCardProps) {
  // Truncate bio to ~30 chars for card display
  const snippet = author.bio
    ? author.bio
        .replace(/（[^）]*）/g, "")
        .replace(/\([^)]*\)/g, "")
        .slice(0, 30) + (author.bio.length > 30 ? "…" : "")
    : null;

  const hasAvatar = author.avatarUrl && !author.avatarUrl.endsWith("/default.svg");

  return (
    <Link
      href={`/author/${encodeURIComponent(author.name)}` as Route}
      className="group flex items-center gap-3 rounded-xl border border-ink-200/60 bg-surface/60 px-4 py-3 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]"
    >
      {/* Avatar */}
      {hasAvatar ? (
        <img
          src={author.avatarUrl}
          alt={author.name}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900/5 text-ink-400 text-xs font-serif">
          {author.name.slice(0, 2)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-ink-800 truncate">
          {author.name}
          {author.courtesyName && (
            <span className="ml-1 text-xs text-ink-400">
              字{author.courtesyName}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400">{author.dynasty}</span>
          {snippet && (
            <span className="truncate text-xs text-ink-300">{snippet}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
