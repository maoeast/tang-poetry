import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";

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

  return (
    <main className="min-h-screen bg-[var(--color-page)] px-6 py-10 text-[var(--color-ink)] sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-2 text-sm text-[var(--color-muted)] transition hover:bg-white"
          >
            返回首页
          </Link>
        </div>

        {author && <AuthorHeader author={author} />}

        <AuthorBio
          lifeStory={author?.lifeStory ?? null}
          sourceUrl={author?.sourceUrl ?? null}
        />

        <AuthorPoems poems={poems} authorName={authorName} />
      </div>
    </main>
  );
}
