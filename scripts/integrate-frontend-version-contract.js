const fs = require('fs');
const path = require('path');

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

const contract = readJson('config/runtime-contract.json');
const packageJson = readJson('package.json');
const frontendVersion = contract.application?.frontend_version;
const cacheVersion = contract.pwa?.cache_version;

if (typeof frontendVersion !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(frontendVersion)) {
  throw new Error('Cannot integrate frontend version: application.frontend_version must be a valid semantic version');
}
if (packageJson.version !== frontendVersion) {
  throw new Error(`Cannot integrate frontend version: package.json version ${packageJson.version} differs from contract ${frontendVersion}`);
}

const expectedCacheVersion = `v${frontendVersion.split('.')[0]}`;
if (cacheVersion !== expectedCacheVersion) {
  throw new Error(`Cannot integrate frontend version: pwa.cache_version ${cacheVersion} must equal ${expectedCacheVersion}`);
}

const indexPath = path.join(root, 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const charset = '<meta charset="UTF-8"/>';
const versionMetadata = `${charset}\n<!-- runtime-contract:application.frontend_version -->\n<meta name="application-version" content="${frontendVersion}"/>`;
const occurrences = html.split(charset).length - 1;
if (occurrences !== 1) {
  throw new Error(`Cannot integrate frontend version: expected exactly one charset anchor, found ${occurrences}`);
}
html = html.replace(charset, versionMetadata);
fs.writeFileSync(indexPath, html);

const serviceWorker = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');
const expectedServiceWorkerVersion = `const CACHE_VERSION = '${cacheVersion}';`;
if (!serviceWorker.includes(expectedServiceWorkerVersion)) {
  throw new Error('Cannot integrate frontend version: built Service Worker cache version differs from contract');
}

console.log(`Frontend version integrated: ${frontendVersion} (${cacheVersion})`);
