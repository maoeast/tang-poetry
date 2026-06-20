/**
 * Generate batch JSON for apimart-imagegen to regenerate author avatars.
 * Usage: node scripts/generate-avatar-batch.cjs
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const authorsPath = path.join(__dirname, '..', 'data', 'authors.json');
const authors = JSON.parse(fs.readFileSync(authorsPath, 'utf-8'));

// Authors that are anonymous/unknown — skip avatar generation
const SKIP_AUTHORS = ['无名氏', '不详', '西鄙人', '杨敬述进'];

// Build style prompt template
function buildPrompt(author, hasRef) {
  const name = author.name;
  const dynasty = author.dynasty || '唐';
  const courtesy = author.courtesyName || '';
  const literary = author.literaryName || '';

  let identity = `${dynasty}代诗人${name}`;
  if (courtesy) identity += `（字${courtesy}）`;
  if (literary) identity += `，${literary}`;

  const refPrefix = hasRef
    ? 'Based on the reference image, recreate '
    : 'Create ';

  // Tang Dynasty scene elements for background variety
  const scenes = [
    'a Tang Dynasty scholar\'s study with wooden desk, scrolls, and a bamboo curtain',
    'a serene Tang Dynasty garden with rockery, pine trees, and a moon gate',
    'a grand Tang Dynasty palace hall with red pillars and carved wooden lattice',
    'a quiet Tang Dynasty courtyard with a stone path, plum blossoms, and a small pond',
    'a misty Tang Dynasty mountain pavilion overlooking a winding river',
    'a Tang Dynasty terrace at dusk with lanterns and a distant pagoda silhouette',
  ];
  const scene = scenes[Math.abs(hashCode(identity)) % scenes.length];

  return `${refPrefix}a refined classical Chinese ink and wash portrait painting (水墨工笔人物画) of ${identity}. ` +
    `The subject is depicted as a dignified Tang Dynasty scholar wearing elegant traditional literati robes and a scholar's hat (幞头), ` +
    `in a three-quarter view bust composition. ` +
    `The background shows ${scene}, rendered in soft ink wash with gentle atmospheric perspective. ` +
    `Use rich but harmonious warm tones with gentle ink gradations. ` +
    `Fine brushwork details on facial features and clothing. Museum-quality traditional Chinese portrait art style. ` +
    `IMPORTANT: Do NOT include any calligraphy text, Chinese characters, seals, stamps, or red chop marks on the image. Pure painting only. ` +
    `The overall feeling should be scholarly, serene, and culturally authentic.`;
}

// Extract filename from avatarUrl
function avatarFilename(author) {
  if (!author.avatarUrl) return null;
  // avatarUrl is like "/images/authors/luobinwang.jpg"
  const parts = author.avatarUrl.split('/');
  return parts[parts.length - 1];
}

// Split into two batches: with-ref and no-ref
const jobsWithRef = [];
const jobsNoRef = [];

for (const author of authors) {
  if (SKIP_AUTHORS.includes(author.name)) continue;

  const filename = avatarFilename(author);
  const hasRef = !!filename;

  const name = author.name;
  // Generate a slug for the output filename
  const slug = hasRef ? filename.replace(/\.\w+$/, '') : pinyin(name);

  const job = {
    name: slug,
    prompt: buildPrompt(author, hasRef),
  };

  if (hasRef) {
    job.image_paths = [`../public/images/authors/${filename}`];
    jobsWithRef.push(job);
  } else {
    jobsNoRef.push(job);
  }
}

// Batch 1: authors with reference images
const batch1 = {
  defaults: {
    model: 'gpt-image-2',
    size: '1:1',
    resolution: '1k',
  },
  jobs: jobsWithRef,
};

// Batch 2: authors without reference images
const batch2 = {
  defaults: {
    model: 'gpt-image-2',
    size: '1:1',
    resolution: '1k',
  },
  jobs: jobsNoRef,
};

const outDir = path.join(__dirname, '..', 'AIimages');
fs.writeFileSync(path.join(outDir, 'batch-authors-with-ref.json'), JSON.stringify(batch1, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'batch-authors-no-ref.json'), JSON.stringify(batch2, null, 2), 'utf-8');

console.log(`Batch 1 (with ref): ${jobsWithRef.length} authors`);
console.log(`Batch 2 (no ref):   ${jobsNoRef.length} authors`);
console.log(`Skipped: ${SKIP_AUTHORS.join(', ')}`);
console.log(`\nNo-ref authors: ${jobsNoRef.map(j => j.name).join(', ')}`);

// Deterministic hash for consistent scene assignment per author
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// Simple pinyin mapping for authors without avatar filenames
function pinyin(name) {
  const map = {
    '唐玄宗': 'tangxuanzong',
    '郑畋': 'zhengTian',
    '朱庆余': 'zhuqingyu',
    '崔曙': 'cuishu',
    '李频': 'lipin',
    '朱斌': 'zhubin',
    '张佖': 'zhangbi',
    '蔡襄': 'caixiang',
    '释明辩': 'shimingbian',
    '孙革': 'sunge',
    '刘眘虚': 'liushenxu',
    '严维': 'yanwei',
  };
  return map[name] || name;
}
