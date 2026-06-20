/**
 * Submit 4 extra author tasks and download results.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const https = require('https');

const API_KEY = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'AIimages', 'config.json'), 'utf-8')).api_key;
const batch = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'AIimages', 'batch-extra-4.json'), 'utf-8'));

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error(data.substring(0,200))); } });
    });
    req.on('error', reject);
    if (options.body) { req.write(options.body); }
    req.end();
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (e) => { fs.unlink(dest, () => {}); reject(e); });
  });
}

async function main() {
  const results = [];

  // Submit
  for (const job of batch.jobs) {
    const body = JSON.stringify({ model: 'gpt-image-2', prompt: job.prompt, size: '1:1', resolution: '1k', n: 1 });
    try {
      const resp = await fetchJSON('https://api.apimart.ai/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body
      });
      if (resp.code === 200 && resp.data?.[0]) {
        console.log(`✓ Submitted ${job.name} -> ${resp.data[0].task_id}`);
        results.push({ name: job.name, task_id: resp.data[0].task_id });
      } else {
        console.error(`✗ Failed ${job.name}:`, JSON.stringify(resp).substring(0, 200));
      }
    } catch (e) {
      console.error(`✗ Error ${job.name}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nWaiting 120s for generation...`);
  await new Promise(r => setTimeout(r, 120000));

  // Poll & download
  const outputDir = path.join(__dirname, '..', 'public', 'images', 'authors');
  for (const task of results) {
    try {
      const resp = await fetchJSON(`https://api.apimart.ai/v1/tasks/${task.task_id}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      if (resp.data?.status === 'completed' && resp.data?.result?.images?.[0]) {
        const imgUrl = resp.data.result.images[0].url[0] || resp.data.result.images[0].url;
        const dest = path.join(outputDir, `${task.name}.jpg`);
        await downloadFile(imgUrl, dest);
        console.log(`✓ Downloaded ${task.name} -> ${dest}`);
      } else {
        console.log(`⏳ ${task.name}: ${resp.data?.status || 'unknown'} ${resp.data?.progress || 0}%`);
      }
    } catch (e) {
      console.error(`? Poll error ${task.name}:`, e.message);
    }
  }
  console.log('\nDone!');
}

main().catch(console.error);
