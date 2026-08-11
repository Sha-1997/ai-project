const fs = require('fs');
const path = require('path');

const excludeDirs = new Set(['.git', 'node_modules', 'node_modules_old', '.next', 'dist', 'build', '.gemini']);

let totalFiles = 0;
let totalSrcFiles = 0;
const extensionCounts = {};

function crawl(dir) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    return; // Bypass files/folders that cannot be read
  }
  for (const file of files) {
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      continue; // Bypass stats error (corrupted reparse points)
    }
    if (stat.isDirectory()) {
      if (!excludeDirs.has(file)) {
        crawl(fullPath);
      }
    } else {
      totalFiles++;
      const ext = path.extname(file).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.prisma', '.json'].includes(ext)) {
        totalSrcFiles++;
      }
      extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
    }
  }
}

crawl('.');
console.log(`Total Files (excl. build/git/node_modules): ${totalFiles}`);
console.log(`Total Source Files: ${totalSrcFiles}`);
console.log("Extension distribution:");
Object.entries(extensionCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([ext, count]) => {
    console.log(`  ${ext || '(no-ext)'}: ${count}`);
  });
