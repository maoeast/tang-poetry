import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";

import { AuthorHeader } from "@/components/author/author-header";
import { AuthorBio } from "@/components/author/author-bio";
import { AuthorPoems } from "@/components/author/author-poems";
import {
  getAuthorByName,
  getPoemsByAuthor,
  type AuthorInfo,
} from "@/lib/author/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

const DEFAULT_AVATAR = "/images/authors/default.svg";

type AuthorPageProps = {
  params: Promise<{
    authorName: string;
  }>;
};

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { authorName: rawName } = await params;
  const authorName = decodeURIComponent(rawName).trim();

  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );

  const author = await getAuthorByName(authorName, scriptVariant);
  const poems = await getPoemsByAuthor(authorName, scriptVariant);

  if (!author && poems.length === 0) {
    notFound();
  }

  // Build a minimal AuthorInfo when the JSON has no entry but DB has poems
  const headerAuthor: AuthorInfo = author ?? {
    name: poems[0]?.author ?? authorName,
    avatarUrl: DEFAULT_AVATAR,
    dynasty: poems[0]?.dynasty ?? "",
    courtesyName: null,
    literaryName: null,
    bio: null,
    lifeStory: null,
    sourceUrl: null,
  };

  const headersList = await headers();
  const referer = headersList.get("referer");
  const backHref: Route = referer ? (new URL(referer).pathname as Route) : ("/" as Route);

  return (
    <main className="min-h-screen bg-paper text-ink-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
        {/* Back button + breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex w-fit items-center rounded-full border border-ink-200 bg-surface/70 px-4 py-2 text-sm text-ink-600 transition hover:bg-surface/50"
          >
            返回
          </Link>
          <nav aria-label="面包屑导航" className="flex items-center gap-2 text-sm text-ink-400">
            <Link
              href={"/" as Route}
              className="transition hover:text-ink-600"
            >
              首页
            </Link>
            <span>/</span>
            <span className="text-ink-600">{headerAuthor.name}</span>
          </nav>
        </div>

        <AuthorHeader author={headerAuthor} />

        <AuthorBio
          lifeStory={author?.lifeStory ?? null}
          sourceUrl={author?.sourceUrl ?? null}
        />

        <div className="mt-8">
          <AuthorPoems poems={poems} authorName={authorName} />
        </div>
      </div>
    </main>
  );
}
