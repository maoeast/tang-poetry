type AuthorBioProps = {
  lifeStory: string | null;
  sourceUrl?: string | null;
};

/**
 * Split a long text into paragraphs by Chinese sentence-ending punctuation.
 * Each segment becomes its own <p> for better readability.
 */
function splitParagraphs(text: string): string[] {
  return text
    .split(/(?<=[。！？])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AuthorBio({ lifeStory, sourceUrl }: AuthorBioProps) {
  if (!lifeStory) return null;

  const paragraphs = splitParagraphs(lifeStory);

  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6">
      <h2 className="font-serif text-xl font-semibold">生平概述</h2>
      <div className="mt-4 space-y-3">
        {paragraphs.map((para, index) => (
          <p
            key={index}
            className="max-w-[65ch] text-left text-sm leading-8 text-ink-600"
          >
            {para}
          </p>
        ))}
      </div>
      {sourceUrl ? (
        <p className="mt-4 text-xs text-ink-400">
          来源：古文岛 ·{" "}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition hover:text-ink-600"
          >
            查看原文
          </a>
        </p>
      ) : null}
    </section>
  );
}
