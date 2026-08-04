const fs = require('fs');
const {
  isForbiddenPublicPath,
  loadPublicArtifactManifest,
  resolveWithinRoot,
  validateManifestDocument,
} = require('./public-artifact-utils');

const root = process.cwd();
const EXPECTED_FILE_COUNT = 15;

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
for (const entry of manifest.files) {
  if (isForbiddenPublicPath(entry.path)) {
    throw new Error(`Forbidden path is present in public artifact manifest: ${entry.path}`);
  }
  const absolute = resolveWithinRoot(root, entry.path);
  if (!fs.existsSync(absolute)) throw new Error(`Whitelisted source file is missing: ${entry.path}`);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error(`Whitelisted source file must not be a symbolic link: ${entry.path}`);
  if (!stat.isFile()) throw new Error(`Whitelisted source path is not a file: ${entry.path}`);
}

expectFailure(
  'path traversal',
  { schema_version: 1, files: [{ path: '../secret.txt', classification: 'test' }] },
  'unsafe segment',
);
expectFailure(
  'absolute path',
  { schema_version: 1, files: [{ path: '/secret.txt', classification: 'test' }] },
  'repository-relative',
);
expectFailure(
  'backslash path',
  { schema_version: 1, files: [{ path: 'icons\\secret.png', classification: 'test' }] },
  'POSIX separators',
);
expectFailure(
  'non-normalized path',
  { schema_version: 1, files: [{ path: 'icons/../secret.png', classification: 'test' }] },
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

console.log(`Public artifact manifest verified: ${manifest.files.length} explicitly authorized files.`);
