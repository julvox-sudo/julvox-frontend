const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function readJson(relativePath) {
  const text = read(relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${error.message}`);
    return {};
  }
}

const contract = readJson('config/runtime-contract.json');
const packageJson = readJson('package.json');
const html = read('dist/index.html');
const serviceWorker = read('dist/sw.js');
const frontendVersion = contract.application?.frontend_version;
const cacheVersion = contract.pwa?.cache_version;

if (typeof frontendVersion !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(frontendVersion)) {
  failures.push('application.frontend_version is not a valid semantic version');
}
if (packageJson.version !== frontendVersion) {
  failures.push('package.json.version differs from application.frontend_version');
}

if (frontendVersion) {
  const expectedCacheVersion = `v${frontendVersion.split('.')[0]}`;
  if (cacheVersion !== expectedCacheVersion) {
    failures.push(`pwa.cache_version must equal ${expectedCacheVersion}`);
  }
  const expectedMetadata = `<meta name="application-version" content="${frontendVersion}"/>`;
  if (!html.includes(expectedMetadata)) failures.push('dist/index.html does not expose application.frontend_version');
}

if (!html.includes('runtime-contract:application.frontend_version')) {
  failures.push('dist/index.html lacks the frontend version traceability marker');
}
if (cacheVersion && !serviceWorker.includes(`const CACHE_VERSION = '${cacheVersion}';`)) {
  failures.push('dist/sw.js cache version differs from pwa.cache_version');
}

if (failures.length) {
  console.error('Frontend version contract verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Frontend version contract verification passed.');
