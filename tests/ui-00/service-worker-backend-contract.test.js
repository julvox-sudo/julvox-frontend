'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8');
const SOURCE_ANCHOR = "const BACKEND_ORIGIN = '__JULVOX_BACKEND_ORIGIN_FROM_RUNTIME_CONTRACT__'; /* build-anchor:service-worker-backend-origin */";

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test('service worker source uses one neutral backend build anchor', () => {
  assert.equal(count(source, SOURCE_ANCHOR), 1);
  assert.doesNotMatch(source, /railway\.app|julvox-dealscan/i);
  assert.doesNotMatch(source, /\bapi_base_url\b/);
});
