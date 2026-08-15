const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '../..');
const generator = path.join(repoRoot, 'scripts/generate-runtime-config.js');
const contractSource = path.join(repoRoot, 'config/runtime-contract.json');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'julvox-runtime-preview-'));
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.copyFileSync(contractSource, path.join(root, 'config/runtime-contract.json'));
  return root;
}

function runGenerator(root, variables = {}) {
  const env = { ...process.env };
  delete env.JULVOX_BACKEND_API_BASE_URL;
  delete env.VERCEL_ENV;
  Object.assign(env, variables);
  return spawnSync(process.execPath, [generator], { cwd: root, env, encoding: 'utf8' });
}

function generatedPath(root) {
  return path.join(root, 'dist', 'runtime-config.js');
}

function readRuntime(root) {
  const sandbox = { globalThis: {} };
  sandbox.window = sandbox.globalThis;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(generatedPath(root), 'utf8'), sandbox);
  return sandbox.globalThis.JULVOX_RUNTIME_CONFIG;
}

test('runtime generation never writes a tracked source-tree runtime config', () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, 'runtime-config.js'), 'tracked-source-sentinel\n', 'utf8');
  const before = fs.readFileSync(path.join(root, 'runtime-config.js'), 'utf8');
  const result = runGenerator(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'runtime-config.js'), 'utf8'), before);
  assert.equal(fs.existsSync(generatedPath(root)), true);
});

test('production generation uses the canonical backend when no override is supplied', () => {
  const root = fixture();
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'config/runtime-contract.json'), 'utf8'));
  const result = runGenerator(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readRuntime(root).backend.apiBaseUrl, contract.backend.api_base_url);
});

test('Vercel Preview refuses to build without an explicit Preview backend', () => {
  const root = fixture();
  const result = runGenerator(root, { VERCEL_ENV: 'preview' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Vercel Preview requires JULVOX_BACKEND_API_BASE_URL/);
});

test('preview generation uses only an explicit backend URL override without mutating the canonical contract', () => {
  const root = fixture();
  const contractPath = path.join(root, 'config/runtime-contract.json');
  const before = fs.readFileSync(contractPath, 'utf8');
  const previewUrl = 'https://julvox-backend-pr62-production.up.railway.app';
  const result = runGenerator(root, { VERCEL_ENV: 'preview', JULVOX_BACKEND_API_BASE_URL: previewUrl });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readRuntime(root).backend.apiBaseUrl, previewUrl);
  assert.equal(fs.readFileSync(contractPath, 'utf8'), before);
});

test('runtime generation does not publish unrelated build secrets', () => {
  const root = fixture();
  const secretValues = [
    'preview-google-secret-value-123456',
    'preview-jwt-secret-value-1234567890',
    'postgresql://private:password@private.invalid/db',
  ];
  const result = runGenerator(root, {
    VERCEL_ENV: 'preview',
    JULVOX_BACKEND_API_BASE_URL: 'https://julvox-backend-pr62-production.up.railway.app',
    GOOGLE_API_KEY: secretValues[0],
    JWT_SECRET: secretValues[1],
    DATABASE_URL: secretValues[2],
  });
  assert.equal(result.status, 0, result.stderr);
  const generated = fs.readFileSync(generatedPath(root), 'utf8');
  for (const secret of secretValues) assert.equal(generated.includes(secret), false);
  assert.equal(generated.includes('GOOGLE_API_KEY'), false);
  assert.equal(generated.includes('JWT_SECRET'), false);
  assert.equal(generated.includes('DATABASE_URL'), false);
});

test('an explicit preview override cannot silently target the canonical production backend', () => {
  const root = fixture();
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'config/runtime-contract.json'), 'utf8'));
  const result = runGenerator(root, { VERCEL_ENV: 'preview', JULVOX_BACKEND_API_BASE_URL: contract.backend.api_base_url });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /explicitly targets the canonical production backend/);
});

test('the explicit override rejects URLs that could expose credentials or secrets', () => {
  for (const previewUrl of [
    'http://preview.invalid',
    'https://user:password@preview.invalid',
    'https://preview.invalid?token=secret',
    'https://preview.invalid/#secret',
  ]) {
    const root = fixture();
    const result = runGenerator(root, { VERCEL_ENV: 'preview', JULVOX_BACKEND_API_BASE_URL: previewUrl });
    assert.notEqual(result.status, 0, previewUrl);
  }
});