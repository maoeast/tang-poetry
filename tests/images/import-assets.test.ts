import test from "node:test";
import assert from "node:assert/strict";

import {
  buildImageAssetUpsertPayload,
  summarizeImageAssetImport,
  validateImageAssetRecords,
  type ImageAssetImportRecord,
} from "@/lib/images/import-assets";

const validRecord: ImageAssetImportRecord = {
  poetryId: "ts300-0311",
  style: "storybook-watercolor",
  status: "placeholder",
  imagePath: "/images/placeholders/default-poetry-card.jpg",
  thumbPath: "/images/placeholders/default-poetry-card.jpg",
  promptVersion: "v1",
};

test("validateImageAssetRecords returns normalized records for valid payloads", () => {
  const records = validateImageAssetRecords([validRecord, { ...validRecord, poetryId: "ts300-0121" }]);

  assert.equal(records.length, 2);
  assert.deepEqual(records[0], validRecord);
  assert.equal(records[1]?.poetryId, "ts300-0121");
});

test("validateImageAssetRecords rejects records with missing required fields", () => {
  assert.throws(
    () =>
      validateImageAssetRecords([
        {
          ...validRecord,
          poetryId: "",
        },
      ]),
    /image asset record at index 0 has invalid poetryId/i,
  );
});

test("buildImageAssetUpsertPayload uses poetryId_style_promptVersion unique key", () => {
  const payload = buildImageAssetUpsertPayload(validRecord);

  assert.deepEqual(payload.where, {
    poetryId_style_promptVersion: {
      poetryId: "ts300-0311",
      style: "storybook-watercolor",
      promptVersion: "v1",
    },
  });
  assert.deepEqual(payload.create, validRecord);
  assert.deepEqual(payload.update, {
    status: "placeholder",
    imagePath: "/images/placeholders/default-poetry-card.jpg",
    thumbPath: "/images/placeholders/default-poetry-card.jpg",
  });
});

test("summarizeImageAssetImport reports total count and unique poetry ids", () => {
  const summary = summarizeImageAssetImport([
    validRecord,
    { ...validRecord, poetryId: "ts300-0121" },
    { ...validRecord, style: "ink-outline", promptVersion: "v2" },
  ]);

  assert.deepEqual(summary, {
    totalRecords: 3,
    uniquePoetryIds: 2,
    styles: ["ink-outline", "storybook-watercolor"],
    promptVersions: ["v1", "v2"],
  });
});
