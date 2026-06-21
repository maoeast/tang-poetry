import { cookies } from "next/headers";

import { ProfileSummary } from "@/components/me/profile-summary";
import { getFavoritePoems } from "@/lib/favorite/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";
import { getMyPageStats, getPoetAffinity } from "@/lib/stats/affinity";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const userId = process.env.SYSTEM_USER_ID;

  if (!userId) {
    return <ProfileSummary summary={DEFAULT_SUMMARY} affinity={[]} favorites={[]} />;
  }

  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );

  const [summary, affinity, favorites] = await Promise.all([
    getMyPageStats(userId),
    getPoetAffinity(userId),
    getFavoritePoems(userId, scriptVariant),
  ]);

  return (
    <ProfileSummary
      summary={summary}
      affinity={affinity}
      favorites={favorites}
    />
  );
}

const DEFAULT_SUMMARY = {
  streakDays: 0,
  viewedPoetryCount: 0,
  favoriteCount: 0,
  challengeAccuracy: 0,
  challengeAttemptCount: 0,
};
