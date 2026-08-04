const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  isForbiddenPublicPath,
  loadPublicArtifactManifest,
  resolveExistingPublicFileWithinRoot,
  validateManifestDocument,
} = require('./public-artifact-utils');

const root = process.cwd();
const EXPECTED_PUBLIC_PATHS = Object.freeze([
  'enhancements_v3.js',
  'google3a92a4041aeeec5e.html',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/shortcut-alerts.png',
  'icons/shortcut-deals.png',
  'icons/shortcut-flash.png',
  'icons/shortcut-promos.png',
  'index.html',
  'manifest.json',
  'robots.txt',
  'runtime-config.js',
  'screenshots/screenshot-mobile.png',
  'sitemap.xml',
  'sw.js',
]);
const EXPECTED_FILE_COUNT = EXPECTED_PUBLIC_PATHS.length;

function expectFailure(label, document, expectedFragment) {
  try {
    validateManifestDocument(document);
  } catch (error) {
    if (!error.message.includes(expectedFragment)) {
      throw new Error(`${label} failed for the wrong reason: ${error.message}`);
    }
    return;
  }
  throw new Error(`${label} was unexpectedly accepted`);
}

const manifest = loadPublicArtifactManifest(root, { expectedFileCount: EXPECTED_FILE_COUNT });
const manifestPaths = manifest.files.map((entry) => entry.path);
if (JSON.stringify(manifestPaths) !== JSON.stringify(EXPECTED_PUBLIC_PATHS)) {
  throw new Error('Public artifact manifest differs from the independently approved QUALITY-01A path set');
}

for (const entry of manifest.files) {
  if (isForbiddenPublicPath(entry.path)) {
    throw new Error(`Forbidden path is present in public artifact manifest: ${entry.path}`);
  }
  resolveExistingPublicFileWithinRoot(root, entry.path);
}

expectFailure(
  'path traversal',
  { schema_version: 1, files: [{ path: '../secret.txt', classification: 'test' }] },
  'unsafe segment',
);
expectFailure(
  'dot segment',
  { schema_version: 1, files: [{ path: './index.html', classification: 'test' }] },
  'unsafe segment',
);
expectFailure(
  'nested traversal',
  { schema_version: 1, files: [{ path: 'icons/../secret.png', classification: 'test' }] },
  'unsafe segment',
);
expectFailure(
  'absolute path',
  { schema_version: 1, files: [{ path: '/icons/icon-192.png', classification: 'test' }] },
  'repository-relative',
);
expectFailure(
  'Windows absolute path',
  { schema_version: 1, files: [{ path: 'C:\\temp\\file', classification: 'test' }] },
  'POSIX separators',
);
expectFailure(
  'backslash path',
  { schema_version: 1, files: [{ path: 'icons\\secret.png', classification: 'test' }] },
  'POSIX separators',
);
expectFailure(
  'empty path segment',
  { schema_version: 1, files: [{ path: 'icons//icon-192.png', classification: 'test' }] },
  'unsafe segment',
);
expectFailure(
  'case collision',
  {
    schema_version: 1,
    files: [
      { path: 'a.js', classification: 'test' },
      { path: 'A.js', classification: 'test' },
    ],
  },
  'Case-insensitive',
);
expectFailure(
  'duplicate',
  {
    schema_version: 1,
    files: [
      { path: 'a.js', classification: 'test' },
      { path: 'a.js', classification: 'test' },
    ],
  },
  'Duplicate',
);
expectFailure(
  'unsorted manifest',
  {
    schema_version: 1,
    files: [
      { path: 'b.js', classification: 'test' },
      { path: 'a.js', classification: 'test' },
    ],
  },
  'sorted',
);

for (const forbiddenVariant of [
  '.git/config',
  '.GitHub/workflows/build.yml',
  'BUILD-REPORTS/inventory.json',
  'CONFIG/runtime-contract.json',
  'Docs/internal.txt',
  'Package.json',
  '.env.local',
]) {
  if (!isForbiddenPublicPath(forbiddenVariant)) {
    throw new Error(`Case-insensitive or hidden forbidden path was unexpectedly accepted: ${forbiddenVariant}`);
  }
}

if (process.platform !== 'win32') {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'quality01a-parent-symlink-'));
  try {
    const repositoryRoot = path.join(fixtureRoot, 'repository');
    const outsideRoot = path.join(fixtureRoot, 'outside');
    fs.mkdirSync(repositoryRoot);
    fs.mkdirSync(outsideRoot);
    fs.writeFileSync(path.join(outsideRoot, 'secret.txt'), 'outside repository\n');
    fs.symlinkSync(outsideRoot, path.join(repositoryRoot, 'icons'));
    try {
      resolveExistingPublicFileWithinRoot(repositoryRoot, 'icons/secret.txt');
      throw new Error('Parent directory symbolic link was unexpectedly accepted');
    } catch (error) {
      if (!error.message.includes('symbolic link')) throw error;
    }
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

console.log(`Public artifact manifest verified: ${manifest.files.length} independently approved files.`);
