import Link from "next/link";
import { cookies } from "next/headers";
import type { Route } from "next";

import { AuthorCard } from "@/components/author/author-card";
import { getAllAuthors } from "@/lib/author/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "诗人列表 — 诗笺阁",
};

export default async function AuthorsPage() {
  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );

  const authors = await getAllAuthors(scriptVariant);

  // Group by dynasty
  const groups = new Map<string, typeof authors>();
  for (const a of authors) {
    const list = groups.get(a.dynasty) ?? [];
    list.push(a);
    groups.set(a.dynasty, list);
  }

  return (
    <main className="min-h-screen bg-paper text-ink-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-full border border-ink-200 bg-surface/70 px-4 py-2 text-sm text-ink-600 transition hover:bg-surface/50"
          >
            返回首页
          </Link>
          <p className="text-sm tracking-[0.24em] text-ink-600 uppercase">
            诗人列表
          </p>
        </div>

        <section className="mt-10">
          <h1 className="text-4xl font-serif tracking-[0.16em] sm:text-5xl">
            诗人总览
          </h1>
          <div className="mt-4 h-px w-24 bg-ink-200/60" />
        </section>

        {/* Dynasty groups */}
        <div className="mt-10 space-y-12">
          {[...groups.entries()].map(([dynasty, items]) => (
            <section key={dynasty}>
              <h2 className="mb-4 font-serif text-xl tracking-widest text-ink-600">
                {dynasty}
                <span className="ml-2 text-sm text-ink-400">
                  {items.length}人
                </span>
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((a) => (
                  <AuthorCard key={a.name} author={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
