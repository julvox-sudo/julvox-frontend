const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MANIFEST_RELATIVE_PATH = 'config/public-artifact-manifest.json';
const INVENTORY_RELATIVE_PATH = 'build-reports/public-artifact-inventory.json';
const REFERENCE_REPORT_RELATIVE_PATH = 'build-reports/public-reference-report.json';

const FORBIDDEN_DIRECTORY_PREFIXES = [
  '.github/',
  'config/',
  'docs/',
  'node_modules/',
  'scripts/',
  'tests/',
];

const FORBIDDEN_EXACT_PATHS = new Set([
  'build-static.js',
  'package-lock.json',
  'package.json',
]);

const FORBIDDEN_SUFFIXES = [
  '.bak',
  '.backup',
  '.log',
  '.md',
  '.tmp',
];

function normalizePublicPath(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Public artifact path must be a non-empty string');
  }
  if (value !== value.trim()) {
    throw new Error(`Public artifact path has surrounding whitespace: ${JSON.stringify(value)}`);
  }
  if (value.includes('\\')) {
    throw new Error(`Public artifact path must use POSIX separators: ${value}`);
  }
  if (value.includes('\0')) {
    throw new Error(`Public artifact path contains a NUL byte: ${value}`);
  }
  if (value.startsWith('/') || path.posix.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    throw new Error(`Public artifact path must be repository-relative: ${value}`);
  }

  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Public artifact path contains an unsafe segment: ${value}`);
  }

  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === '.' || normalized.startsWith('../')) {
    throw new Error(`Public artifact path is not normalized: ${value}`);
  }
  return normalized;
}

function resolveWithinRoot(root, relativePath) {
  const normalized = normalizePublicPath(relativePath);
  const absolute = path.resolve(root, ...normalized.split('/'));
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Public artifact path escapes or resolves to repository root: ${relativePath}`);
  }
  return absolute;
}

function validateManifestDocument(document, options = {}) {
  const expectedFileCount = options.expectedFileCount;
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('Public artifact manifest must be a JSON object');
  }
  if (document.schema_version !== 1) {
    throw new Error(`Unsupported public artifact manifest schema_version: ${document.schema_version}`);
  }
  if (!Array.isArray(document.files) || document.files.length === 0) {
    throw new Error('Public artifact manifest files must be a non-empty array');
  }
  if (expectedFileCount !== undefined && document.files.length !== expectedFileCount) {
    throw new Error(`Public artifact manifest must contain exactly ${expectedFileCount} files, found ${document.files.length}`);
  }

  const entries = document.files.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Public artifact manifest entry ${index} must be an object`);
    }
    const normalizedPath = normalizePublicPath(entry.path);
    if (typeof entry.classification !== 'string' || !entry.classification.trim()) {
      throw new Error(`Public artifact manifest entry ${normalizedPath} needs a classification`);
    }
    if (entry.allow_empty !== undefined && typeof entry.allow_empty !== 'boolean') {
      throw new Error(`allow_empty must be boolean for ${normalizedPath}`);
    }
    return Object.freeze({
      path: normalizedPath,
      classification: entry.classification.trim(),
      allow_empty: entry.allow_empty === true,
    });
  });

  const paths = entries.map((entry) => entry.path);
  const sortedPaths = [...paths].sort((a, b) => a.localeCompare(b, 'en'));
  if (JSON.stringify(paths) !== JSON.stringify(sortedPaths)) {
    throw new Error('Public artifact manifest files must be sorted lexicographically by path');
  }

  const exact = new Set();
  const caseFolded = new Map();
  for (const publicPath of paths) {
    if (exact.has(publicPath)) {
      throw new Error(`Duplicate public artifact path: ${publicPath}`);
    }
    exact.add(publicPath);

    const folded = publicPath.toLocaleLowerCase('en-US');
    const previous = caseFolded.get(folded);
    if (previous) {
      throw new Error(`Case-insensitive public artifact collision: ${previous} <-> ${publicPath}`);
    }
    caseFolded.set(folded, publicPath);
  }

  return Object.freeze({
    schema_version: document.schema_version,
    files: Object.freeze(entries),
  });
}

function loadPublicArtifactManifest(root = process.cwd(), options = {}) {
  const manifestPath = path.join(root, MANIFEST_RELATIVE_PATH);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`${MANIFEST_RELATIVE_PATH} is missing`);
  }
  let document;
  try {
    document = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`${MANIFEST_RELATIVE_PATH} is invalid JSON: ${error.message}`);
  }
  return validateManifestDocument(document, options);
}

function isForbiddenPublicPath(publicPath) {
  const normalized = normalizePublicPath(publicPath);
  if (FORBIDDEN_EXACT_PATHS.has(normalized)) return true;
  if (FORBIDDEN_DIRECTORY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  const lower = normalized.toLocaleLowerCase('en-US');
  return FORBIDDEN_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

function listFilesRecursive(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];

  function visit(current, relativePrefix) {
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const relative = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symbolic links are not allowed in public artifact output: ${relative}`);
      }
      if (entry.isDirectory()) visit(absolute, relative);
      else if (entry.isFile()) output.push(normalizePublicPath(relative));
      else throw new Error(`Unsupported public artifact filesystem entry: ${relative}`);
    }
  }

  visit(directory, '');
  return output;
}

function sha256File(absolutePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

function createInventory(distPath, manifest) {
  const classifications = new Map(manifest.files.map((entry) => [entry.path, entry.classification]));
  const files = listFilesRecursive(distPath).map((publicPath) => {
    const absolute = path.join(distPath, ...publicPath.split('/'));
    const stat = fs.statSync(absolute);
    return {
      path: publicPath,
      size: stat.size,
      sha256: sha256File(absolute),
      classification: classifications.get(publicPath) || 'unclassified',
    };
  });
  return {
    schema_version: 1,
    file_count: files.length,
    total_size: files.reduce((total, file) => total + file.size, 0),
    files,
  };
}

function writeJsonDeterministic(root, relativePath, value) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return absolute;
}

module.exports = {
  FORBIDDEN_DIRECTORY_PREFIXES,
  INVENTORY_RELATIVE_PATH,
  MANIFEST_RELATIVE_PATH,
  REFERENCE_REPORT_RELATIVE_PATH,
  createInventory,
  isForbiddenPublicPath,
  listFilesRecursive,
  loadPublicArtifactManifest,
  normalizePublicPath,
  resolveWithinRoot,
  sha256File,
  validateManifestDocument,
  writeJsonDeterministic,
};
