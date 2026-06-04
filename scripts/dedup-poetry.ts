/**
 * Dedup migration: remove 17 duplicate poems, reassign images and foreign keys.
 *
 * Usage:
 *   npx tsx scripts/dedup-poetry.ts          # preview (dry-run)
 *   npx tsx scripts/dedup-poetry.ts --apply  # execute migration
 *
 * What it does:
 * 1. Reads deletion mappings (deletedSourceUid → survivingSourceUid)
 * 2. Looks up poetryIds from DB by sourceUid
 * 3. Reassigns ImageAsset records to surviving poem (with modified style)
 * 4. Remaps FKs: DailyPoetry, LearningRecord, ChallengeAttempt, ReviewState, Favorite, AudioMeta
 * 5. Deletes duplicate Poetry records from DB
 * 6. Removes entries from data/ts300.simple.json and data/ts300.raw.json
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: ["error", "warn"] });

// ─── Deletion mappings ───────────────────────────────────────────────────────
// Each entry: [deletedSourceUid, survivingSourceUid, description]
const DEDUP_MAPPINGS: [string, string, string][] = [
  // Group 1: 将进酒
  ["0f7504df-cda2-4fe2-bc63-867ec2e418e7", "e5e5f969-ddac-4491-9cfe-d77742e1416d", "鼓吹曲辞 将进酒 → 将进酒"],

  // Group 3: 清平调 — delete prefix versions, keep 清平调 一/二/三
  ["b5f1094b-b9be-43cf-8e04-9b984642a630", "d5da9d7d-1e52-4992-8be5-73e556b07e0b", "杂曲歌辞 清平调 一 → 清平调 一"],
  ["73dadc56-88ff-4f11-9ff5-da0e0adf533c", "59063901-7dbc-4f22-974f-ddccab675cbc", "杂曲歌辞 清平调 二 → 清平调 二"],
  ["0db5450e-f1e0-4d53-8106-529def535537", "f91f3117-2bf2-4d12-999a-aca174124715", "杂曲歌辞 清平调 三 → 清平调 三"],
  ["948fa40a-492e-4fa1-99f4-b002ae87cd24", "d5da9d7d-1e52-4992-8be5-73e556b07e0b", "清平调词三首 一 → 清平调 一"],
  ["99167d13-8e2c-4b75-bf93-62b0682dfdd0", "59063901-7dbc-4f22-974f-ddccab675cbc", "清平调词三首 二 → 清平调 二"],

  // Group 4: 游子吟
  ["22923091-18da-429d-9ef1-6b367fd74b1a", "4cf19354-4c0a-4e55-980b-69fa7f81ed0f", "杂曲歌辞 游子吟 → 游子吟"],

  // Group 5: 秋夜曲
  ["1f66d2ec-8418-485e-a434-e21a0d439dda", "0055db4e-e8d3-41a0-b201-0e3b970e27b6", "杂曲歌辞 秋夜曲 → 秋夜曲"],

  // Group 6: 子夜吴歌 春歌
  ["4e92a96d-aa74-4153-8314-b6df22d1e18a", "57203d7f-380c-4052-b21b-d1ea79fbe231", "相和歌辞…春歌 → 子夜吴歌 春歌"],

  // Group 7: 子夜吴歌 冬歌
  ["35319d7e-9cf6-43b0-bfa3-991cf82a49f9", "f990af2e-d929-48da-a9b3-fdbc706ca4a3", "相和歌辞…冬歌 → 子夜吴歌 冬歌"],

  // Group 8: 寄人
  ["4ddb6dda-68be-4bb2-8874-8508c6c6e3ad", "afc2e6d6-e67f-4513-a6ab-82841d2f97cc", "寄人二首 其一(张佖) → 寄人 一(张泌)"],

  // Group 9: 春宫怨 (3→1, keep d3357800 杜荀鹤 with correct Artist audio)
  ["8eaf97fd-82bb-4651-9dde-9a5a6f78182c", "d3357800-9021-4647-a0a0-98499a0ee3c5", "春宫怨 杜荀鹤 dup → 春宫怨 杜荀鹤"],
  ["1d6885a4-d11e-4428-80a8-fcf75d7a41aa", "d3357800-9021-4647-a0a0-98499a0ee3c5", "春宫怨 周朴 → 春宫怨 杜荀鹤"],

  // Group 10: 行宫
  ["a6c85d29-ad02-4f54-a347-63800213a7b4", "02943f6d-2c91-4d9c-9690-247eab9ae3ec", "行宫 王建 → 行宫 元稹"],

  // Group 11: 登鹳雀楼
  ["19340af6-e25d-41c8-90fc-b465d9be1134", "63950163-6a10-4e74-af8a-09886e4ef2a8", "登楼 朱斌 → 登鹳雀楼 王之涣"],

  // Group 12: 寻隐者不遇
  ["162eb552-a496-4979-87e2-e441847d4e6f", "4f6575cc-12cc-4986-8bfc-5cedac7bb68f", "访羊尊师 孙革 → 寻隐者不遇 贾岛"],

  // Group 13: 塞下曲 (keep 卢纶)
  ["c8210485-a1f4-4c76-a1f6-2f5e57d39d29", "ee2a3000-9127-43fa-8618-89a1937322cb", "和张仆射塞下曲 钱起 → 卢纶版"],
];

const DELETED_UUIDS = new Set(DEDUP_MAPPINGS.map(([deleted]) => deleted));

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`唐诗去重迁移 — ${dryRun ? "DRY RUN (预览)" : "LIVE (执行)"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Step 1: Build sourceUid → poetryId lookup
  console.log("📋 Step 1: 查找所有诗歌的 poetryId...");
  const allPoetries = await db.poetry.findMany({
    select: { id: true, sourceUid: true, title: true, author: true },
  });
  const uidToId = new Map<string, { id: string; title: string; author: string }>();
  for (const p of allPoetries) {
    if (p.sourceUid) {
      uidToId.set(p.sourceUid, { id: p.id, title: p.title, author: p.author });
    }
  }

  // Validate all mappings
  const resolvedMappings: {
    deletedId: string;
    survivingId: string;
    deletedSourceUid: string;
    survivingSourceUid: string;
    desc: string;
    deletedTitle: string;
    survivingTitle: string;
  }[] = [];

  for (const [deletedUid, survivingUid, desc] of DEDUP_MAPPINGS) {
    const deleted = uidToId.get(deletedUid);
    const surviving = uidToId.get(survivingUid);
    if (!deleted) {
      console.error(`  ❌ 找不到被删诗歌: ${deletedUid} (${desc})`);
      continue;
    }
    if (!surviving) {
      console.error(`  ❌ 找不到保留诗歌: ${survivingUid} (${desc})`);
      continue;
    }
    resolvedMappings.push({
      deletedId: deleted.id,
      survivingId: surviving.id,
      deletedSourceUid: deletedUid,
      survivingSourceUid: survivingUid,
      desc,
      deletedTitle: `${deleted.title} (${deleted.author})`,
      survivingTitle: `${surviving.title} (${surviving.author})`,
    });
  }
  console.log(`  ✅ 解析 ${resolvedMappings.length}/${DEDUP_MAPPINGS.length} 组映射\n`);

  if (resolvedMappings.length !== DEDUP_MAPPINGS.length) {
    console.error("❌ 部分映射无法解析，中止。");
    await db.$disconnect();
    process.exit(1);
  }

  // Step 2: Reassign images
  console.log("🖼️  Step 2: 转移图片...");
  // Track how many extra images each surviving poem already has (for unique style suffix)
  const survivingExtraCount = new Map<string, number>();
  let totalImagesReassigned = 0;

  for (const mapping of resolvedMappings) {
    const images = await db.imageAsset.findMany({
      where: { poetryId: mapping.deletedId },
    });

    if (images.length === 0) {
      console.log(`  ⏭️  ${mapping.deletedTitle}: 无图片，跳过`);
      continue;
    }

    for (const img of images) {
      const count = survivingExtraCount.get(mapping.survivingId) ?? 0;
      const newStyle = `${img.style}-dedup${count > 0 ? `-${count}` : ""}`;

      // Check if the target unique key already exists
      const exists = await db.imageAsset.findFirst({
        where: {
          poetryId: mapping.survivingId,
          style: newStyle,
          promptVersion: img.promptVersion,
        },
      });

      if (exists) {
        console.log(`  ⚠️  ${mapping.deletedTitle}: 图片 ${newStyle}/${img.promptVersion} 已存在，跳过`);
        continue;
      }

      console.log(`  📎 ${mapping.deletedTitle} → ${mapping.survivingTitle}: ${img.style} → ${newStyle}`);
      totalImagesReassigned++;

      if (!dryRun) {
        await db.imageAsset.update({
          where: { id: img.id },
          data: {
            poetryId: mapping.survivingId,
            style: newStyle,
          },
        });
      }

      survivingExtraCount.set(mapping.survivingId, count + 1);
    }
  }
  console.log(`  ✅ 共转移 ${totalImagesReassigned} 张图片\n`);

  // Step 3: Remap foreign keys
  console.log("🔗 Step 3: 重映射外键...");
  const fkTables = [
    {
      name: "DailyPoetry",
      remap: async (deletedId: string, survivingId: string) => {
        // Update the poetryId reference
        const result = await db.dailyPoetry.updateMany({
          where: { poetryId: deletedId },
          data: { poetryId: survivingId },
        });
        return result.count;
      },
    },
    {
      name: "LearningRecord",
      remap: async (deletedId: string, survivingId: string) => {
        // Delete records that would conflict with existing records for surviving poem
        // (unique constraint on userId + poetryId + eventType + dayKey)
        const userId = process.env.SYSTEM_USER_ID ?? "family-001";
        // Find conflicting records (same userId + eventType + dayKey on surviving poem)
        const existing = await db.learningRecord.findMany({
          where: { poetryId: survivingId, userId },
          select: { eventType: true, dayKey: true },
        });
        const existingKeys = new Set(existing.map((r) => `${r.eventType}|${r.dayKey ?? ""}`));

        const toMigrate = await db.learningRecord.findMany({
          where: { poetryId: deletedId, userId },
          select: { id: true, eventType: true, dayKey: true },
        });

        let migrated = 0;
        for (const record of toMigrate) {
          const key = `${record.eventType}|${record.dayKey ?? ""}`;
          if (existingKeys.has(key)) {
            // Conflict — delete the duplicate
            if (!dryRun) await db.learningRecord.delete({ where: { id: record.id } });
          } else {
            if (!dryRun) {
              await db.learningRecord.update({
                where: { id: record.id },
                data: { poetryId: survivingId },
              });
            }
            migrated++;
          }
        }
        return migrated;
      },
    },
    {
      name: "ChallengeAttempt",
      remap: async (deletedId: string, survivingId: string) => {
        const result = await db.challengeAttempt.updateMany({
          where: { poetryId: deletedId },
          data: { poetryId: survivingId },
        });
        return result.count;
      },
    },
    {
      name: "ReviewState",
      remap: async (deletedId: string, survivingId: string) => {
        // Check if surviving poem already has a review state
        const userId = process.env.SYSTEM_USER_ID ?? "family-001";
        const existing = await db.reviewState.findUnique({
          where: { userId_poetryId: { userId, poetryId: survivingId } },
        });

        if (existing) {
          // Delete the duplicate's review state (keep the surviving one)
          const result = await db.reviewState.deleteMany({
            where: { poetryId: deletedId, userId },
          });
          return -result.count; // negative = deleted instead of migrated
        }

        const result = await db.reviewState.updateMany({
          where: { poetryId: deletedId },
          data: { poetryId: survivingId },
        });
        return result.count;
      },
    },
    {
      name: "Favorite",
      remap: async (deletedId: string, survivingId: string) => {
        const userId = process.env.SYSTEM_USER_ID ?? "family-001";
        const existing = await db.favorite.findUnique({
          where: { userId_poetryId: { userId, poetryId: survivingId } },
        });

        if (existing) {
          const result = await db.favorite.deleteMany({
            where: { poetryId: deletedId, userId },
          });
          return -result.count;
        }

        const result = await db.favorite.updateMany({
          where: { poetryId: deletedId },
          data: { poetryId: survivingId },
        });
        return result.count;
      },
    },
    {
      name: "AudioMeta",
      remap: async (deletedId: string, _survivingId: string) => {
        // AudioMeta is 1:1 with poetryId — just delete the duplicate's
        const result = await db.audioMeta.deleteMany({
          where: { poetryId: deletedId },
        });
        return -result.count; // negative = deleted
      },
    },
  ];

  for (const table of fkTables) {
    let total = 0;
    for (const mapping of resolvedMappings) {
      if (!dryRun) {
        const count = await table.remap(mapping.deletedId, mapping.survivingId);
        if (count !== 0) {
          console.log(`  ${count > 0 ? "📎" : "🗑️"}  ${table.name}: ${mapping.deletedTitle} → ${count > 0 ? `迁移 ${count} 条` : `删除 ${-count} 条`}`);
          total += Math.abs(count);
        }
      } else {
        // Dry run — just count
        if (table.name === "DailyPoetry") {
          const c = await db.dailyPoetry.count({ where: { poetryId: mapping.deletedId } });
          total += c;
        } else if (table.name === "AudioMeta") {
          const c = await db.audioMeta.count({ where: { poetryId: mapping.deletedId } });
          total += c;
        }
        // For others, dry run just reports
      }
    }
    console.log(`  ${table.name}: ${dryRun ? `~${total} 条待处理` : `✅ 完成`}`);
  }
  console.log();

  // Step 4: Delete duplicate Poetry records
  console.log("🗑️  Step 4: 删除重复诗歌记录...");
  const deletedIds = resolvedMappings.map((m) => m.deletedId);

  if (!dryRun) {
    // Delete in a transaction to ensure atomicity
    await db.$transaction(
      deletedIds.map((id) => db.poetry.delete({ where: { id } })),
    );
    console.log(`  ✅ 已删除 ${deletedIds.length} 条重复诗歌\n`);
  } else {
    for (const mapping of resolvedMappings) {
      console.log(`  🗑️  ${mapping.deletedTitle} (${mapping.deletedId})`);
    }
    console.log(`  共 ${deletedIds.length} 条待删除\n`);
  }

  // Step 5: Update JSON source files
  console.log("📄 Step 5: 更新 JSON 源文件...");
  const jsonFiles = [
    path.resolve(process.cwd(), "data/ts300.simple.json"),
    path.resolve(process.cwd(), "data/ts300.raw.json"),
  ];

  for (const filePath of jsonFiles) {
    const content = await readFile(filePath, "utf-8");
    const entries = JSON.parse(content) as Array<{ id: string; title: string; author: string }>;
    const before = entries.length;
    const filtered = entries.filter((e) => !DELETED_UUIDS.has(e.id));
    const removed = before - filtered.length;

    if (removed === 0) {
      console.log(`  ⏭️  ${path.basename(filePath)}: 无需删除`);
      continue;
    }

    console.log(`  📝 ${path.basename(filePath)}: ${before} → ${filtered.length} (删除 ${removed} 条)`);

    if (!dryRun) {
      await writeFile(filePath, JSON.stringify(filtered, null, 2) + "\n", "utf-8");
    }

    // List what was removed
    const removedEntries = entries.filter((e) => DELETED_UUIDS.has(e.id));
    for (const entry of removedEntries) {
      console.log(`    🗑️  ${entry.title} (${entry.author})`);
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  if (dryRun) {
    console.log("预览完成。执行迁移请运行:");
    console.log("  npx tsx scripts/dedup-poetry.ts --apply");
  } else {
    console.log("✅ 迁移完成！");
    console.log(`  - 删除 ${deletedIds.length} 条重复诗歌`);
    console.log(`  - 转移 ${totalImagesReassigned} 张图片`);
    console.log(`  - JSON 文件已更新`);
    console.log(`  - 当前诗歌总数: ${allPoetries.length - deletedIds.length}`);
  }
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("❌ 迁移失败:", err);
  void db.$disconnect();
  process.exit(1);
});
