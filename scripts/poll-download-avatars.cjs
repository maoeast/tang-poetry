/**
 * Poll all submitted tasks and download completed images.
 * Usage: node scripts/poll-download-avatars.cjs [--download]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'AIimages', 'config.json'), 'utf-8')).api_key;
const tasksPath = path.join(__dirname, '..', 'AIimages', 'submitted-tasks.json');
const outputDir = path.join(__dirname, '..', 'public', 'images', 'authors');
const doDownload = process.argv.includes('--download');

function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
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
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  const submitted = tasks.filter(t => t.status === 'submitted' || t.status === 'pending' || t.status === 'completed');
  console.log(`Total tasks: ${submitted.length}\n`);

  let completed = 0, pending = 0, failed = 0;

  for (let i = 0; i < submitted.length; i++) {
    const task = submitted[i];
    if (!task.task_id) continue;

    try {
      const resp = await fetchJSON(
        `https://api.apimart.ai/v1/tasks/${task.task_id}`,
        { 'Authorization': `Bearer ${API_KEY}` }
      );

      if (resp.code === 200 && resp.data) {
        const d = resp.data;
        if (d.status === 'completed' && d.result && d.result.images) {
          completed++;
          const imgUrl = d.result.images[0].url[0] || d.result.images[0].url;
          task.status = 'completed';
          task.image_url = imgUrl;
          task.actual_time = d.actual_time;

          if (doDownload) {
            const ext = imgUrl.match(/\.(\w+)(\?|$)/)?.[1] || 'png';
            const dest = path.join(outputDir, `${task.name}.jpg`);
            try {
              await downloadFile(imgUrl, dest);
              task.local_path = dest;
              console.log(`✓ ${i + 1}/${submitted.length} ${task.name} downloaded (${Math.round(d.actual_time)}s)`);
            } catch (dlErr) {
              console.error(`✗ ${i + 1}/${submitted.length} ${task.name} download failed: ${dlErr.message}`);
              task.download_error = dlErr.message;
            }
          } else {
            console.log(`✓ ${i + 1}/${submitted.length} ${task.name} completed (${Math.round(d.actual_time)}s)`);
          }
        } else if (d.status === 'failed') {
          failed++;
          task.status = 'failed';
          task.error = d.error?.message || 'unknown';
          console.error(`✗ ${i + 1}/${submitted.length} ${task.name} FAILED: ${task.error}`);
        } else {
          pending++;
          const prog = d.progress || 0;
          process.stdout.write(`⏳ ${i + 1}/${submitted.length} ${task.name} ${d.status} ${prog}%\r`);
        }
      }
    } catch (e) {
      console.error(`? ${i + 1}/${submitted.length} ${task.name} poll error: ${e.message}`);
    }

    // Small delay between requests
    if ((i + 1) % 5 === 0) await new Promise(r => setTimeout(r, 300));
  }

  // Save updated tasks
  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8');

  console.log(`\n\n=== Summary ===`);
  console.log(`Completed: ${completed}`);
  console.log(`Pending:   ${pending}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Total:     ${submitted.length}`);
  console.log(`\nUpdated: ${tasksPath}`);
}

main().catch(console.error);
