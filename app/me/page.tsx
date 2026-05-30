import { ProfileSummary } from "@/components/me/profile-summary";
import { getMyPageStats, getPoetAffinity } from "@/lib/stats/affinity";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const userId = process.env.SYSTEM_USER_ID;

  if (!userId) {
    return <ProfileSummary summary={DEFAULT_SUMMARY} affinity={[]} />;
  }

  const [summary, affinity] = await Promise.all([
    getMyPageStats(userId),
    getPoetAffinity(userId),
  ]);

  return <ProfileSummary summary={summary} affinity={affinity} />;
}

const DEFAULT_SUMMARY = {
  streakDays: 0,
  viewedPoetryCount: 0,
  favoriteCount: 0,
  challengeAccuracy: 0,
  challengeAttemptCount: 0,
};
