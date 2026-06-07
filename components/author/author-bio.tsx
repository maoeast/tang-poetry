import { parseLifeStory, adaptToTimeline } from "@/lib/author/life-story-parser";
import { PoetTimeline } from "./poet-timeline";
import { FoldableScroll } from "./foldable-scroll";

type AuthorBioProps = {
  lifeStory: string | null;
  sourceUrl?: string | null;
};

export function AuthorBio({ lifeStory, sourceUrl }: AuthorBioProps) {
  if (!lifeStory) return null;

  const parsed = parseLifeStory(lifeStory);
  const timeline = adaptToTimeline(parsed);

  // Structured chapters → rich PoetTimeline
  if (timeline) {
    return (
      <section className="mt-8 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <PoetTimeline chapters={timeline} />
          {sourceUrl && (
            <p className="mt-4 text-xs text-ink-400">
              来源：
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-500 transition hover:text-primary"
              >
                古文岛
              </a>
            </p>
          )}
        </div>
      </section>
    );
  }

  // Fallback: plain text or empty chapters → foldable scroll
  return <FoldableScroll text={parsed.cleanText} sourceUrl={sourceUrl ?? null} />;
}
