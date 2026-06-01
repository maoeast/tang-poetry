type AuthorBioProps = {
  lifeStory: string | null;
  sourceUrl?: string | null;
};

export function AuthorBio({ lifeStory, sourceUrl }: AuthorBioProps) {
  if (!lifeStory) return null;

  return (
    <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/80 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
      <h2 className="text-xl font-semibold">生平概述</h2>
      <p className="mt-4 text-sm leading-8 text-[var(--color-muted)]">
        {lifeStory}
      </p>
      {sourceUrl && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          来源：古文岛 ·{" "}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition hover:text-[var(--color-ink)]"
          >
            查看原文
          </a>
        </p>
      )}
    </section>
  );
}
