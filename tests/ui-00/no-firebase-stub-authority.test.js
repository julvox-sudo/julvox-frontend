'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const thisFile = path.resolve(__filename);
const TEXT_EXTENSIONS = new Set(['.js', '.html', '.json', '.md']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, files);
      continue;
    }
    if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name))) continue;
    if (path.resolve(absolute) === thisFile) continue;
    files.push(absolute);
  }
  return files;
}

function suspiciousFirebaseStubAuthority(source) {
  const text = String(source);
  const direct = new RegExp(['firebase', 'stub'].join('[_-]?'), 'i');
  const heuristic = /firebase[\s\S]{0,120}stub|stub[\s\S]{0,120}firebase/i;
  return direct.test(text) || heuristic.test(text);
}

test('no source or build transform synthesizes a firebase stub identity', () => {
  const findings = [];
  for (const file of walk(root)) {
    const source = fs.readFileSync(file, 'utf8');
    if (suspiciousFirebaseStubAuthority(source)) {
      findings.push(path.relative(root, file));
    }
  }
  assert.deepEqual(
    findings,
    [],
    `Unverified Firebase stub identity authority found in: ${findings.join(', ')}`,
  );
});

test('guard detects direct and split heuristic variants', () => {
  assert.equal(suspiciousFirebaseStubAuthority(['firebase', 'stub_123'].join('_')), true);
  assert.equal(suspiciousFirebaseStubAuthority("const uid = 'firebase_' + token + '_stub';"), true);
  assert.equal(suspiciousFirebaseStubAuthority('const uid = serverIdentity.uid;'), false);
});
