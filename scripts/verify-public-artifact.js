const fs = require('fs');
const path = require('path');
const {
  INVENTORY_RELATIVE_PATH,
  createInventory,
  isForbiddenPublicPath,
  listFilesRecursive,
  loadPublicArtifactManifest,
  writeJsonDeterministic,
} = require('./public-artifact-utils');

const root = process.cwd();
const dist = path.join(root, 'dist');
const EXPECTED_FILE_COUNT = 15;
const failures = [];

function fail(message) {
  failures.push(message);
}

if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
  fail('dist/ directory is missing');
}

let manifest;
try {
  manifest = loadPublicArtifactManifest(root, { expectedFileCount: EXPECTED_FILE_COUNT });
} catch (error) {
  fail(error.message);
}

let actualPaths = [];
if (fs.existsSync(dist)) {
  try {
    actualPaths = listFilesRecursive(dist);
  } catch (error) {
    fail(error.message);
  }
}

if (manifest) {
  const expectedPaths = manifest.files.map((entry) => entry.path);
  const expectedSet = new Set(expectedPaths);
  const actualSet = new Set(actualPaths);

  for (const expected of expectedPaths) {
    if (!actualSet.has(expected)) fail(`Authorized public artifact is missing: ${expected}`);
  }
  for (const actual of actualPaths) {
    if (!expectedSet.has(actual)) fail(`Unauthorized public artifact was produced: ${actual}`);
  }

  if (actualPaths.length !== EXPECTED_FILE_COUNT) {
    fail(`dist must contain exactly ${EXPECTED_FILE_COUNT} files, found ${actualPaths.length}`);
  }

  const caseFolded = new Map();
  for (const publicPath of actualPaths) {
    if (isForbiddenPublicPath(publicPath)) fail(`Forbidden public path was produced: ${publicPath}`);
    const folded = publicPath.toLocaleLowerCase('en-US');
    const previous = caseFolded.get(folded);
    if (previous) fail(`Case-insensitive collision in dist: ${previous} <-> ${publicPath}`);
    caseFolded.set(folded, publicPath);

    const absolute = path.join(dist, ...publicPath.split('/'));
    const stat = fs.statSync(absolute);
    const manifestEntry = manifest.files.find((entry) => entry.path === publicPath);
    if (stat.size === 0 && !manifestEntry?.allow_empty) fail(`Public artifact is unexpectedly empty: ${publicPath}`);
  }
}

const forbiddenDirectoryNames = ['.github', 'config', 'docs', 'node_modules', 'scripts', 'tests'];
for (const directoryName of forbiddenDirectoryNames) {
  if (fs.existsSync(path.join(dist, directoryName))) fail(`Forbidden directory exists in dist: ${directoryName}/`);
}

const secretPatterns = [
  { label: 'private key material', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'Stripe secret key', pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { label: 'obvious private assignment', pattern: /\b(?:SECRET|PRIVATE_KEY|DATABASE_URL|PASSWORD)\b\s*[:=]\s*["'][^"']{8,}["']/i },
];
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.svg', '.txt', '.xml']);
for (const publicPath of actualPaths) {
  if (!textExtensions.has(path.extname(publicPath).toLocaleLowerCase('en-US'))) continue;
  const content = fs.readFileSync(path.join(dist, ...publicPath.split('/')), 'utf8');
  for (const secretPattern of secretPatterns) {
    if (secretPattern.pattern.test(content)) {
      fail(`Heuristic secret scan detected ${secretPattern.label} in ${publicPath}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Public artifact verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const inventory = createInventory(dist, manifest);
writeJsonDeterministic(root, INVENTORY_RELATIVE_PATH, inventory);
console.log(`Public artifact verified: ${inventory.file_count} files, ${inventory.total_size} bytes.`);
console.log('Heuristic secret scan passed.');
console.log(`Inventory written to ${INVENTORY_RELATIVE_PATH}.`);
