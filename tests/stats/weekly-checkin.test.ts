import assert from "node:assert/strict";
import test from "node:test";

import { getWeeklyCheckIn } from "@/lib/stats/weekly-checkin";

/**
 * Unit tests for getWeeklyCheckIn.
 *
 * Uses DI repository pattern — no real DB needed.
 */

// Wednesday June 3, 2026 12:00 UTC
// Week: Mon June 1 — Sun June 7
const WEDNESDAY = new Date("2026-06-03T12:00:00Z");

function makeMockRepo(allRecords: Array<{ createdAt: Date }>) {
  const records = [...allRecords];
  return {
    learningRecord: {
      findMany: async (args: {
        where: Record<string, unknown>;
        select: unknown;
        orderBy?: unknown;
      }) => {
        const where = args.where as Record<string, unknown>;
        if (where.createdAt) {
          const dateFilter = where.createdAt as {
            gte?: Date;
            lt?: Date;
          };
          return records.filter((r) => {
            if (dateFilter.gte && r.createdAt < dateFilter.gte) return false;
            if (dateFilter.lt && r.createdAt >= dateFilter.lt) return false;
            return true;
          });
        }
        return records;
      },
    },
  };
}

test("returns 7 days with correct labels Mon–Sun", async () => {
  const repo = makeMockRepo([]);
  const result = await getWeeklyCheckIn("user-1", repo, WEDNESDAY);

  assert.equal(result.days.length, 7);
  assert.deepStrictEqual(
    result.days.map((d) => d.label),
    ["一", "二", "三", "四", "五", "六", "日"],
  );
});

test("marks days after today as future", async () => {
  const repo = makeMockRepo([]);
  const result = await getWeeklyCheckIn("user-1", repo, WEDNESDAY);

  // Wed is today → Mon, Tue, Wed are not future; Thu-Sun are future
  assert.equal(result.days[0].isFuture, false); // Mon
  assert.equal(result.days[1].isFuture, false); // Tue
  assert.equal(result.days[2].isFuture, false); // Wed (today)
  assert.equal(result.days[3].isFuture, true); // Thu
  assert.equal(result.days[4].isFuture, true); // Fri
  assert.equal(result.days[5].isFuture, true); // Sat
  assert.equal(result.days[6].isFuture, true); // Sun
});

test("marks checked days based on records", async () => {
  // Activity on Monday and Wednesday
  const records = [
    { createdAt: new Date("2026-06-01T10:00:00Z") }, // Mon
    { createdAt: new Date("2026-06-03T08:00:00Z") }, // Wed
  ];
  const repo = makeMockRepo(records);
  const result = await getWeeklyCheckIn("user-1", repo, WEDNESDAY);

  assert.equal(result.days[0].isChecked, true); // Mon — has record
  assert.equal(result.days[1].isChecked, false); // Tue — no record
  assert.equal(result.days[2].isChecked, true); // Wed — has record
  assert.equal(result.days[3].isChecked, false); // Thu — future, no record
});

test("counts streak days correctly", async () => {
  // Mon, Tue, Wed consecutive → streak = 3
  const records = [
    { createdAt: new Date("2026-06-03T08:00:00Z") }, // Wed
    { createdAt: new Date("2026-06-02T08:00:00Z") }, // Tue
    { createdAt: new Date("2026-06-01T08:00:00Z") }, // Mon
  ];
  const repo = makeMockRepo(records);
  const result = await getWeeklyCheckIn("user-1", repo, WEDNESDAY);

  assert.equal(result.streakDays, 3);
});

test("returns streak 0 when no records exist", async () => {
  const repo = makeMockRepo([]);
  const result = await getWeeklyCheckIn("user-1", repo, WEDNESDAY);

  assert.equal(result.streakDays, 0);
});

test("streak breaks on gap — only counts consecutive from today", async () => {
  // Mon and Wed but not Tue → streak = 1 (only Wed)
  const records = [
    { createdAt: new Date("2026-06-03T08:00:00Z") }, // Wed
    { createdAt: new Date("2026-06-01T08:00:00Z") }, // Mon
  ];
  const repo = makeMockRepo(records);
  const result = await getWeeklyCheckIn("user-1", repo, WEDNESDAY);

  assert.equal(result.streakDays, 1);
});

test("handles Sunday as end of week", async () => {
  // Sunday June 7
  const sunday = new Date("2026-06-07T12:00:00Z");
  const repo = makeMockRepo([]);
  const result = await getWeeklyCheckIn("user-1", repo, sunday);

  assert.equal(result.days.length, 7);
  // All days Mon-Sat are not future, Sun is today
  assert.equal(result.days[6].isFuture, false); // Sun = today
  // Week starts June 1 (Mon)
  assert.equal(result.days[0].label, "一");
});
