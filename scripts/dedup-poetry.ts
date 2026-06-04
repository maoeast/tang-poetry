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

  // ─── Fuzzy dedup (Phase 2): 13 groups with variant characters ───

  // F1: 关山月 (TTS → Artist)
  ["0167687e-8325-48bf-8da4-3749c9ce0a74", "4be77185-992e-4614-9746-de2e73c8a3c3", "横吹曲辞 关山月 → 关山月"],

  // F2: 渭城曲 (TTS → Artist)
  ["e4a87504-f9a3-4599-b770-aba4afd3cb04", "1575c835-1241-4d7b-99dc-6d700549ac65", "杂曲歌辞 渭城曲 → 渭城曲"],

  // F3: 蜀道难 (TTS → Artist)
  ["e117d224-39ca-4eba-a047-0d36ce8b8c26", "f15c4b50-ee89-4927-8cf3-15e3a6a6ab95", "相和歌辞 蜀道难 → 蜀道难"],

  // F4: 玉阶怨 (TTS → Artist)
  ["f93545e7-747e-4d12-a6c8-e484c46b2860", "a65e5646-14b1-4f75-924b-bbf262b242d7", "相和歌辞 玉阶怨 → 玉阶怨"],

  // F5: 丽人行 (TTS → Artist)
  ["aaae5882-9b74-4b45-9bb5-9f773a721119", "370b53ae-949e-45cf-92b0-3aca072c1b86", "杂曲歌辞 丽人行 → 丽人行"],

  // F6: 长相思 (TTS → Artist)
  ["d4baf2d1-ea61-4fb3-a284-e889275bdca2", "3c1693fc-f4e6-43b7-a66f-6379c3a26eef", "杂曲歌辞 长相思三首 一 → 长相思"],

  // F7-F9: 行路难三首 一/二/三 (all TTS, keep no-prefix)
  ["527eba4b-b35c-4d29-99e7-8f40c6f3d5b7", "c348bc2e-f50d-436b-88b7-c198d63dacfc", "杂曲歌辞 行路难三首 一 → 行路难三首 一"],
  ["e12edd83-36cd-4e8a-a630-91874631c51f", "801c3192-8001-4238-8ecf-0111f490e84c", "杂曲歌辞 行路难三首 二 → 行路难三首 二"],
  ["b4f9c5b3-0108-4127-bf3e-73fd207176f3", "a7b8e17f-ee93-4bdc-a144-b1ba5ab32bb5", "杂曲歌辞 行路难三首 三 → 行路难三首 三"],

  // F10-F11: 长干曲四首 一/二 (TTS → Artist/TTS)
  ["4bef9a5e-f4a1-44bd-a78c-cb0fe38ccdff", "c39225f9-16b2-4713-a11c-d7030ec3b1c9", "杂曲歌辞 长干曲四首 一 → 长干曲四首 一"],
  ["8d480633-1876-4082-aaca-a7b3a26c04d7", "4a732464-35a5-4ffc-94d0-37d653eef2a1", "杂曲歌辞 长干曲四首 二 → 长干曲四首 二"],

  // F12: 从军行 (TTS → Artist)
  ["0ed53ef4-30ca-41ac-a629-d778e5cc2bfa", "bea6f283-8f90-49b5-8842-1cb906816548", "相和歌辞 从军行 → 古从军行"],

  // F13: 列女操 (TTS → Artist)
  ["7ccd9915-51a1-4748-9989-af243036455b", "a9d3bfca-8402-4946-ad02-53db1964a3b2", "琴曲歌辞 列女操 → 列女操"],

  // F14: 颂古三十二首 其二三 (释明辩, 宋, TTS) → 春怨 (金昌绪, Artist)
  ["228c87f2-092b-411b-9029-c5454cc2cb1c", "b41e25f5-5a57-497f-a3a2-84bdfb9331f5", "颂古三十二首 其二三(释明辩) → 春怨(金昌绪)"],

  // ─── Fuzzy dedup (Phase 3): 9 groups from full scan ───

  // F15: 子夜吴歌 秋歌 (both TTS, keep short title)
  ["49194c4b-b775-4d21-a506-fc0a2ff308f1", "baccf46a-41c4-4a0f-b90f-37cc35b04a64", "相和歌辞…秋歌 → 子夜吴歌 秋歌"],

  // F16: 度南涧 (蔡襄, 宋, TTS) → 桃花溪 (张旭, Artist)
  ["e72db286-3b6a-425b-ad02-75248ea5a790", "1f28ab03-8388-4a2f-8c4f-3ce47789e221", "度南涧(蔡襄) → 桃花溪(张旭)"],

  // F17: 相和歌辞 江南曲 (Artist) → 江南词 (TTS) — keep 江南词 per short-title rule, but Artist is on prefix ver
  // Actually: 江南词(TTS) vs 相和歌辞 江南曲(Artist). Keep Artist audio version.
  ["9bd49546-5289-4351-97f4-d69296720dfc", "bb111748-d8f1-4a5e-b618-b70272a7a642", "江南词(李益,TTS) → 相和歌辞 江南曲(李益,Artist)"],

  // F18: 杂曲歌辞 婆罗门 (杨敬述进, TTS) → 夜上受降城闻笛 (李益, Artist)
  ["f1320c1f-949a-4cbe-ad23-4806878632c5", "992df222-c445-4925-a656-0caa4447d5bb", "杂曲歌辞 婆罗门(杨敬述进) → 夜上受降城闻笛(李益)"],

  // F19: 新年作 (宋之问, TTS) → 新年作 (刘长卿, Artist)
  ["368fc6bb-1636-419e-8ddb-cdc1dd07a1ca", "6556f501-f5b9-4353-bde2-75ec0e1bb616", "新年作(宋之问) → 新年作(刘长卿)"],

  // F20: 赋得 (刘长卿, TTS) → 春思 (皇甫冉, Artist)
  ["41d292d2-b752-4c30-8b6b-7b7380f2f9bd", "d35f583a-c20c-453c-a886-e13f98b2e4b4", "赋得(刘长卿) → 春思(皇甫冉)"],

  // F21: 渡汉江 (宋之问, TTS) → 渡汉江 (李频, Artist)
  ["eb9530d2-e4c7-4c34-9214-06c28ca586bf", "a6144ae0-3bcf-4503-b58d-9abf24d6608c", "渡汉江(宋之问) → 渡汉江(李频)"],

  // F22: 和晋陵… (韦应物, TTS) → 和晋陵… (杜审言, Artist)
  ["b67ddf05-43fb-4859-a1a9-34f95d45aabf", "b881b056-6d92-45e8-9620-4710a375776f", "和晋陵…(韦应物) → 和晋陵…(杜审言)"],

  // F23: 相和歌辞 子夜四时歌四首 夏歌 (TTS) → 子夜吴歌 夏歌 (TTS)
  ["4bd5be2b-5788-42c0-a300-9d106a73d46e", "abb3e465-f10e-43dd-b564-a5de08010478", "相和歌辞…夏歌 → 子夜吴歌 夏歌"],
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
    const skipped = DEDUP_MAPPINGS.length - resolvedMappings.length;
    console.log(`  ℹ️  跳过 ${skipped} 组已处理的映射`);
  }

  if (resolvedMappings.length === 0) {
    console.log("✅ 无新映射需要处理。");
    await db.$disconnect();
    return;
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
