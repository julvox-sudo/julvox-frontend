const fs = require('fs');
const path = require('path');
const {
  INVENTORY_RELATIVE_PATH,
  createInventory,
  isForbiddenPublicPath,
  listDirectoriesRecursive,
  listFilesRecursive,
  loadPublicArtifactManifest,
  writeJsonDeterministic,
} = require('./public-artifact-utils');

const root = process.cwd();
const dist = path.join(root, 'dist');
const EXPECTED_FILE_COUNT = 17;
const failures = [];

function fail(message) {
  failures.push(message);
}

function expectedDirectoriesFor(paths) {
  const directories = new Set();
  for (const publicPath of paths) {
    let directory = path.posix.dirname(publicPath);
    while (directory !== '.') {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  return [...directories].sort((a, b) => a.localeCompare(b, 'en'));
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
let actualDirectories = [];
if (fs.existsSync(dist)) {
  try {
    actualPaths = listFilesRecursive(dist);
    actualDirectories = listDirectoriesRecursive(dist);
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

  const expectedDirectories = expectedDirectoriesFor(expectedPaths);
  if (JSON.stringify(actualDirectories) !== JSON.stringify(expectedDirectories)) {
    fail(`dist directories differ from the manifest-derived set: expected ${JSON.stringify(expectedDirectories)}, found ${JSON.stringify(actualDirectories)}`);
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

const forbiddenDirectoryNames = ['.git', '.github', 'build-reports', 'config', 'docs', 'node_modules', 'scripts', 'tests'];
for (const directoryName of forbiddenDirectoryNames) {
  if (fs.existsSync(path.join(dist, directoryName))) fail(`Forbidden directory exists in dist: ${directoryName}/`);
}

const secretPatterns = [
  { label: 'private key material', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'Stripe secret key', pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { label: 'embedded URL credentials', pattern: /\bhttps?:\/\/[^\s/:@]+:[^\s/@]+@/i },
  { label: 'JWT-like credential', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  {
    label: 'obvious private assignment',
    pattern: /\b(?:SECRET|PRIVATE_KEY|DATABASE_URL|PASSWORD|PASSWD|API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|CREDENTIALS)\b\s*[:=]\s*["'][^"']{8,}["']/i,
  },
];

const requiredSecretFixtures = [
  ['private key material', ['-----BEGIN', 'PRIVATE KEY-----'].join(' ')],
  ['GitHub token', ['ghp', 'abcdefghijklmnopqrstuvwxyz123456'].join('_')],
  ['AWS access key', ['AK', 'IA', 'ABCDEFGHIJKLMNOP'].join('')],
  ['Stripe secret key', ['sk', 'live', 'abcdefghijklmnopqrstuvwxyz'].join('_')],
  ['embedded URL credentials', ['https://user', 'password@example.com/path'].join(':')],
  ['JWT-like credential', ['eyJabcdefghijk', 'abcdefghijklmnop', 'abcdefghijklmnop'].join('.')],
  ['obvious private assignment', ['client_secret = "', 'super-secret-value', '"'].join('')],
];
for (const [label, fixture] of requiredSecretFixtures) {
  const detector = secretPatterns.find((entry) => entry.label === label);
  if (!detector || !detector.pattern.test(fixture)) {
    fail(`Heuristic secret detector is not covering its required ${label} fixture`);
  }
}

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.svg', '.txt', '.xml']);
const binaryExtensions = new Set(['.avif', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.webp', '.woff', '.woff2']);
let scannedTextFiles = 0;
let skippedBinaryFiles = 0;
for (const publicPath of actualPaths) {
  const extension = path.extname(publicPath).toLocaleLowerCase('en-US');
  if (binaryExtensions.has(extension)) {
    skippedBinaryFiles += 1;
    continue;
  }
  if (!textExtensions.has(extension)) {
    fail(`Public artifact has no explicit text/binary secret-scan classification: ${publicPath}`);
    continue;
  }
  scannedTextFiles += 1;
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
console.log(`Heuristic secret scan passed: ${scannedTextFiles} text files scanned, ${skippedBinaryFiles} explicitly classified binary files skipped.`);
console.log(`Inventory written to ${INVENTORY_RELATIVE_PATH}.`);
