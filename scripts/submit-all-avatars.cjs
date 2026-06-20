/**
 * Submit all author avatar generation tasks to apimart at once,
 * save task IDs for later polling.
 * Usage: node scripts/submit-all-avatars.cjs
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const https = require('https');

const API_KEY = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'AIimages', 'config.json'), 'utf-8')).api_key;
const API_URL = 'https://api.apimart.ai/v1/images/generations';

// Load both batch files
const batch1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'AIimages', 'batch-authors-with-ref.json'), 'utf-8'));
const batch2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'AIimages', 'batch-authors-no-ref.json'), 'utf-8'));

const defaults = batch1.defaults; // same for both

function submitTask(job) {
  return new Promise((resolve, reject) => {
    const payload = {
      model: job.model || defaults.model,
      prompt: job.prompt,
      size: job.size || defaults.size,
      resolution: job.resolution || defaults.resolution,
      n: job.n || 1,
    };

    // Convert local image_paths to base64 image_urls
    if (job.image_paths && job.image_paths.length > 0) {
      const imageUrls = [];
      for (const imgPath of job.image_paths) {
        const absPath = path.resolve(path.join(__dirname, '..', 'AIimages'), imgPath);
        if (!fs.existsSync(absPath)) {
          console.error(`  ⚠ Image not found: ${absPath}`);
          continue;
        }
        const ext = path.extname(absPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        const data = fs.readFileSync(absPath);
        const b64 = Buffer.from(data).toString('base64');
        imageUrls.push(`data:${mime};base64,${b64}`);
      }
      payload.image_urls = imageUrls;
    }

    const body = JSON.stringify(payload);
    const req = https.request(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Parse error: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const allJobs = [
    ...batch2.jobs.map(j => ({ ...j, _batch: 'no-ref' })),
    ...batch1.jobs.map(j => ({ ...j, _batch: 'with-ref' })),
  ];

  console.log(`Total jobs to submit: ${allJobs.length}`);
  console.log(`  No-ref: ${batch2.jobs.length}, With-ref: ${batch1.jobs.length}`);
  console.log('');

  const results = [];
  const concurrency = 3; // submit 3 at a time to avoid rate limiting
  let submitted = 0;
  let failed = 0;

  for (let i = 0; i < allJobs.length; i += concurrency) {
    const chunk = allJobs.slice(i, i + concurrency);
    const promises = chunk.map(async (job, idx) => {
      const num = i + idx + 1;
      try {
        const resp = await submitTask(job);
        if (resp.code === 200 && resp.data && resp.data[0]) {
          const taskId = resp.data[0].task_id;
          submitted++;
          console.log(`✓ ${num}/${allJobs.length} ${job.name} -> ${taskId}`);
          return { name: job.name, task_id: taskId, batch: job._batch, status: 'submitted' };
        } else {
          failed++;
          const err = resp.error ? `${resp.error.code}: ${resp.error.message}` : JSON.stringify(resp).substring(0, 200);
          console.error(`✗ ${num}/${allJobs.length} ${job.name} -> ${err}`);
          return { name: job.name, error: err, batch: job._batch, status: 'failed' };
        }
      } catch (e) {
        failed++;
        console.error(`✗ ${num}/${allJobs.length} ${job.name} -> ${e.message}`);
        return { name: job.name, error: e.message, batch: job._batch, status: 'failed' };
      }
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);

    // Small delay between chunks
    if (i + concurrency < allJobs.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\nDone. Submitted: ${submitted}, Failed: ${failed}`);

  // Save results
  const outputPath = path.join(__dirname, '..', 'AIimages', 'submitted-tasks.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Task IDs saved to: ${outputPath}`);
}

main().catch(console.error);
