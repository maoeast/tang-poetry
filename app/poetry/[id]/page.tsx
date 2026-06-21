import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PoetryDetail } from "@/components/poetry/poetry-detail";
import { isFavoritePoem, toggleFavoritePoem } from "@/lib/favorite/repository";
import {
  getPoetryById,
  getRelatedPoetries,
  recordPoetryView,
} from "@/lib/poetry/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

type PoetryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PoetryDetailPage({
  params,
}: PoetryDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );
  const poetry = await getPoetryById(id, undefined, undefined, scriptVariant);

  if (!poetry) {
    notFound();
  }

  const [isFav] = await Promise.all([
    isFavoritePoem(poetry.id),
    recordPoetryView(poetry.id),
  ]);
  const relatedPoetries = await getRelatedPoetries(poetry);

  return (
    <PoetryDetail
      poetry={poetry}
      relatedPoetries={relatedPoetries}
      initialScriptVariant={scriptVariant}
      initialIsFavorite={isFav}
      onToggleFavorite={toggleFavoriteAction}
    />
  );
}

async function toggleFavoriteAction(poetryId: string) {
  "use server";
  return toggleFavoritePoem(poetryId);
}
