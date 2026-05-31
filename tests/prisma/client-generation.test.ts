import test from "node:test";
import assert from "node:assert/strict";

import { Prisma } from "@prisma/client";

test("generated Prisma client includes Poetry.audioMeta relation", () => {
  const poetryModel = Prisma.dmmf.datamodel.models.find(
    (model) => model.name === "Poetry",
  );

  assert.ok(poetryModel, "Poetry model should exist in generated Prisma client");
  assert.ok(
    poetryModel.fields.some((field) => field.name === "audioMeta"),
    "generated Prisma client is stale: Poetry.audioMeta is missing",
  );
});
