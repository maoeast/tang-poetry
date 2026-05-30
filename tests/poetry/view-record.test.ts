import assert from "node:assert/strict";
import test from "node:test";

import { shouldCreateViewRecord, toUtcDayKey } from "@/lib/poetry/view-record";

test("shouldCreateViewRecord returns false when the latest view was created on the same UTC day", () => {
  assert.equal(
    shouldCreateViewRecord({
      existingCreatedAts: [new Date("2026-05-30T00:00:01.000Z")],
      targetDate: new Date("2026-05-30T08:00:00.000Z"),
    }),
    false,
  );
});

test("shouldCreateViewRecord returns true when existing records are all from other UTC days", () => {
  assert.equal(
    shouldCreateViewRecord({
      existingCreatedAts: [
        new Date("2026-05-29T23:59:59.000Z"),
        new Date("2026-05-28T10:00:00.000Z"),
      ],
      targetDate: new Date("2026-05-30T08:00:00.000Z"),
    }),
    true,
  );
});

test("toUtcDayKey returns a stable UTC day string", () => {
  assert.equal(toUtcDayKey(new Date("2026-05-30T23:59:59.000Z")), "2026-4-30");
});
