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
} from "@/lib/author/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

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

  const displayName = author?.name ?? poems[0]?.author ?? authorName;

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
            <span className="text-ink-600">{displayName}</span>
          </nav>
        </div>

        {/* Author header */}
        {author ? (
          <AuthorHeader author={author} />
        ) : poems.length > 0 ? (
          <FallbackHeader name={poems[0].author} dynasty={poems[0].dynasty} />
        ) : null}

        {/* Bio section */}
        <AuthorBio
          lifeStory={author?.lifeStory ?? null}
          sourceUrl={author?.sourceUrl ?? null}
        />

        {/* Poems section */}
        <div className="mt-8">
          <AuthorPoems poems={poems} authorName={authorName} />
        </div>
      </div>
    </main>
  );
}

function FallbackHeader({ name, dynasty }: { name: string; dynasty: string }) {
  return (
    <section className="relative px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative shrink-0">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-ink-200/60 bg-primary/10 shadow-[0_4px_20px_rgba(53,78,107,0.12)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/authors/default.svg"
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="pointer-events-none absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(53,78,107,0.08),transparent_70%)]" />
        </div>

        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-bold tracking-wide sm:text-4xl">
            {name}
          </h1>
          <p className="mt-1 text-sm text-ink-600">{dynasty}</p>
          <p className="mt-4 max-w-[65ch] text-left text-sm leading-8 text-ink-600 italic">
            此作者生平暂无考证，唯有佳作传世。
          </p>
        </div>
      </div>
    </section>
  );
}
