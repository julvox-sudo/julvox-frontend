const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dist = path.join(root, 'dist');

const requiredFiles = [
  'enhancements_v3.js',
  'index.html',
  'manifest.json',
  'runtime-config.js',
  'sw.js',
];

function fail(message) {
  console.error(`Static build verification failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
  fail('dist/ directory is missing');
}

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(dist, relativePath);

  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    fail(`${relativePath} is missing from dist/`);
  }

  if (fs.statSync(absolutePath).size === 0) {
    fail(`${relativePath} is empty`);
  }
}

const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!/<html[\s>]/i.test(indexHtml) || !/<\/html>/i.test(indexHtml)) {
  fail('index.html does not contain a complete HTML document');
}

const serviceWorker = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
if (!serviceWorker.includes('addEventListener')) {
  fail('sw.js does not appear to register service-worker events');
}

console.log('Static build verification passed.');
