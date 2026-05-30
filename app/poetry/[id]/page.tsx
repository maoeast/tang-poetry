import { notFound } from "next/navigation";

import { PoetryDetail } from "@/components/poetry/poetry-detail";
import {
  getPoetryById,
  getRelatedPoetries,
  recordPoetryView,
} from "@/lib/poetry/repository";

type PoetryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PoetryDetailPage({
  params,
}: PoetryDetailPageProps) {
  const { id } = await params;
  const poetry = await getPoetryById(id);

  if (!poetry) {
    notFound();
  }

  await recordPoetryView(poetry.id);
  const relatedPoetries = await getRelatedPoetries(poetry);

  return <PoetryDetail poetry={poetry} relatedPoetries={relatedPoetries} />;
}
