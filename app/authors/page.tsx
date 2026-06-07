import Link from "next/link";
import { cookies } from "next/headers";
import type { Route } from "next";

import { AuthorCard } from "@/components/author/author-card";
import { BackToTop } from "@/components/browse/back-to-top";
import { SearchInput } from "@/components/browse/search-input";
import { StickyCategoryNav } from "@/components/browse/sticky-category-nav";
import { getAllAuthors } from "@/lib/author/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "诗人列表 — 诗笺阁",
};

export default async function AuthorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );

  const query = q?.trim() ?? "";
  const isSearching = query.length > 0;

  const authors = await getAllAuthors(scriptVariant);

  const filtered = isSearching
    ? authors.filter((a) => a.name.includes(query))
    : authors;

  // Group by dynasty
  const groups = new Map<string, typeof authors>();
  for (const a of filtered) {
    const list = groups.get(a.dynasty) ?? [];
    list.push(a);
    groups.set(a.dynasty, list);
  }

  const navItems = [...groups.entries()].map(([dynasty]) => ({
    tag: dynasty,
    label: dynasty,
  }));

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

        {/* Hero */}
        <section className="mt-10 antialiased">
          <h1 className="text-4xl font-serif tracking-[0.16em] sm:text-5xl">
            {isSearching ? "搜索结果" : "诗人总览"}
          </h1>
          <div className="mt-10 h-px w-24 bg-ink-200/60" />
        </section>
      </div>

      {/* Sticky bar: dynasty nav (left) + search (right) */}
      <div className="sticky top-0 z-50 border-b border-ink-200/40 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 sm:px-10">
          {!isSearching && navItems.length > 0 && (
            <StickyCategoryNav items={navItems} />
          )}
          <div className="ml-auto">
            <SearchInput basePath="/authors" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto mt-10 w-full max-w-6xl px-6 pb-20 sm:px-10">
        {isSearching ? (
          <>
            <p className="mb-8 text-sm tracking-widest text-ink-500 font-serif">
              「{query}」— 共 {filtered.length} 位
            </p>

            {filtered.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((a) => (
                  <AuthorCard key={a.name} author={a} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-lg text-ink-400 font-serif tracking-widest">
                  未找到相关诗人
                </p>
                <p className="mt-2 text-sm text-ink-300 tracking-wide">
                  试试换个关键词搜索
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-12">
            {[...groups.entries()].map(([dynasty, items]) => (
              <section key={dynasty} id={`section-${dynasty}`}>
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
        )}
      </div>

      <BackToTop />
    </main>
  );
}
