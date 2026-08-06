const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing runtime entrypoint: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function requirePattern(content, pattern, message) {
  if (!pattern.test(content)) failures.push(message);
}

const indexHtml = read('index.html');
const enhancements = read('enhancements_v3.js');
const serviceWorker = read('sw.js');

if (indexHtml) {
  requirePattern(indexHtml, /<script[^>]+src=["'][^"']*enhancements_v3\.js["'][^>]*>/i,
    'index.html does not load enhancements_v3.js');
  requirePattern(indexHtml, /navigator\.serviceWorker\.register\s*\(/,
    'index.html does not register the service worker');
  requirePattern(indexHtml, /(?:const|let|var)\s+API\s*=/,
    'index.html does not define the historical global API configuration');
  requirePattern(indexHtml, /function\s+renderDeals\s*\(/,
    'index.html does not expose the historical renderDeals function');
}

if (enhancements) {
  requirePattern(enhancements, /document\.addEventListener\s*\(\s*["']DOMContentLoaded["']/,
    'enhancements_v3.js does not initialize from DOMContentLoaded');
  requirePattern(enhancements, /window\.renderDeals\s*=/,
    'enhancements_v3.js no longer wraps window.renderDeals');
  requirePattern(enhancements, /Object\.assign\s*\(\s*CAT_IMG\s*,/,
    'enhancements_v3.js no longer extends CAT_IMG');
  requirePattern(enhancements, /Object\.assign\s*\(\s*STORE_TRUST\s*,/,
    'enhancements_v3.js no longer extends STORE_TRUST');
}

if (serviceWorker) {
  for (const eventName of ['install', 'activate', 'fetch', 'push', 'notificationclick', 'message']) {
    requirePattern(
      serviceWorker,
      new RegExp(`self\\.addEventListener\\s*\\(\\s*["']${eventName}["']`),
      `sw.js is missing the ${eventName} entrypoint`,
    );
  }
  if (/self\.addEventListener\s*\(\s*["']sync["']/.test(serviceWorker)
      || /syncPendingVotes|sync-votes/.test(serviceWorker)) {
    failures.push('sw.js must not queue or replay vote mutations');
  }
}

if (failures.length > 0) {
  console.error('Runtime entrypoint verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Runtime entrypoint verification passed.');
