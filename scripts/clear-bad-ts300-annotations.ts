import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BAD_TRANSLATION_IDS = [
  "ts300-0310",
  "ts300-0176",
  "ts300-0006",
  "ts300-0022",
  "ts300-0029",
  "ts300-0071",
  "ts300-0080",
  "ts300-0081",
  "ts300-0145",
  "ts300-0171",
  "ts300-0182",
  "ts300-0198",
  "ts300-0262",
  "ts300-0297",
  "ts300-0336",
] as const;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  try {
    const rows = await prisma.poetry.findMany({
      where: {
        id: {
          in: [...BAD_TRANSLATION_IDS],
        },
      },
      select: {
        id: true,
        title: true,
        author: true,
        translation: true,
        annotation: true,
      },
      orderBy: { id: "asc" },
    });

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            targets: rows.map((row) => ({
              id: row.id,
              title: row.title,
              author: row.author,
              hasTranslation: Boolean(row.translation),
              hasAnnotation: Boolean(row.annotation),
            })),
          },
          null,
          2,
        ),
      );
      return;
    }

    for (const row of rows) {
      await prisma.poetry.update({
        where: { id: row.id },
        data: {
          translation: null,
          annotation: null,
        },
      });
    }

    console.log(
      JSON.stringify(
        {
          dryRun: false,
          cleared: rows.map((row) => row.id),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
