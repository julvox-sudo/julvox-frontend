const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function readRequired(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required source file: ${relativePath}`);
    return '';
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  if (!content.trim()) fail(`Required source file is empty: ${relativePath}`);
  return content;
}

const indexHtml = readRequired('index.html');
const serviceWorker = readRequired('sw.js');
const manifestText = readRequired('manifest.json');
readRequired('build-static.js');

if (indexHtml && !/<html(?:\s|>)/i.test(indexHtml)) fail('index.html has no <html> element');
if (indexHtml && !/<head(?:\s|>)/i.test(indexHtml)) fail('index.html has no <head> element');
if (indexHtml && !/<body(?:\s|>)/i.test(indexHtml)) fail('index.html has no <body> element');
if (indexHtml && !/rel=["']manifest["']/i.test(indexHtml)) fail('index.html does not reference a web app manifest');

if (serviceWorker && !/addEventListener\s*\(\s*["']install["']/i.test(serviceWorker)) {
  fail('sw.js has no install event listener');
}
if (serviceWorker && !/addEventListener\s*\(\s*["']fetch["']/i.test(serviceWorker)) {
  fail('sw.js has no fetch event listener');
}

if (manifestText) {
  try {
    const manifest = JSON.parse(manifestText);
    for (const key of ['name', 'short_name', 'start_url', 'display']) {
      if (!manifest[key]) fail(`manifest.json is missing required field: ${key}`);
    }
  } catch (error) {
    fail(`manifest.json is not valid JSON: ${error.message}`);
  }
}

if (indexHtml) {
  const assetPattern = /(?:src|href)=["']([^"']+)["']/gi;
  const ignoredPrefixes = ['http://', 'https://', '//', 'data:', 'mailto:', 'tel:', 'javascript:', '#'];
  const staticAssetExtension = /\.(?:avif|css|gif|ico|jpe?g|js|json|mjs|png|svg|webp|woff2?|ttf|otf|xml)$/i;
  const checked = new Set();
  let match;

  while ((match = assetPattern.exec(indexHtml)) !== null) {
    const reference = match[1].trim();
    if (!reference || ignoredPrefixes.some((prefix) => reference.startsWith(prefix))) continue;
    if (reference.includes('${') || reference.includes('{{')) continue;

    const cleanReference = reference.split(/[?#]/, 1)[0];
    if (!cleanReference || cleanReference === '/') continue;

    // Links can target client-side routes. Only file-like references are assets.
    if (!staticAssetExtension.test(cleanReference)) continue;

    const relativePath = cleanReference.replace(/^\.\//, '').replace(/^\//, '');
    if (!relativePath || checked.has(relativePath)) continue;
    checked.add(relativePath);

    const absolutePath = path.resolve(root, relativePath);
    const relativeToRoot = path.relative(root, absolutePath);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      fail(`index.html references an asset outside the repository: ${reference}`);
      continue;
    }

    if (!fs.existsSync(absolutePath)) fail(`index.html references a missing local asset: ${reference}`);
  }
}

if (failures.length > 0) {
  console.error('Source verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Source verification passed.');
