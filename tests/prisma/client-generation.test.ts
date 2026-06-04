import test from "node:test";
import assert from "node:assert/strict";

import { Prisma } from "@prisma/client";

test("generated Prisma client includes Poetry dual-script fields", () => {
  const poetryModel = Prisma.dmmf.datamodel.models.find(
    (model) => model.name === "Poetry",
  );

  assert.ok(poetryModel, "Poetry model should exist in generated Prisma client");

  const expectedFields = [
    "audioMeta",
    "annotation",
    "sourceUid",
    "titleZhHans",
    "titleZhHant",
    "authorZhHans",
    "authorZhHant",
    "linesZhHans",
    "linesZhHant",
  ];

  for (const fieldName of expectedFields) {
    assert.ok(
      poetryModel.fields.some((field) => field.name === fieldName),
      `generated Prisma client is stale: Poetry.${fieldName} is missing`,
    );
  }

  assert.deepEqual(
    poetryModel.fields
      .filter(
        (field) => field.name === "linesZhHans" || field.name === "linesZhHant",
      )
      .map((field) => ({
        name: field.name,
        type: field.type,
        isRequired: field.isRequired,
      })),
    [
      { name: "linesZhHans", type: "Json", isRequired: false },
      { name: "linesZhHant", type: "Json", isRequired: false },
    ],
    "generated Prisma client is stale: Poetry dual-script Json fields are incorrect",
  );
});
