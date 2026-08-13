'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_ANCHOR = "const BACKEND_ORIGIN = '__JULVOX_BACKEND_ORIGIN_FROM_RUNTIME_CONTRACT__'; /* build-anchor:service-worker-backend-origin */";
const TRACEABILITY_MARKER = 'runtime-contract:backend.api_base_url';
const LEGACY_DETECTION = "url.hostname.includes('railway.app') || url.hostname.includes('julvox-dealscan')";

function count(haystack, needle) {
  return String(haystack).split(needle).length - 1;
}

function verifyServiceWorkerBackendContract({ source, built, backendOrigin }) {
  const failures = [];
  const expectedOrigin = new URL(backendOrigin).origin;
  const configuredDeclaration = `const BACKEND_ORIGIN = '${expectedOrigin}'; /* ${TRACEABILITY_MARKER} */`;
  const configuredCondition = 'if (url.origin === BACKEND_ORIGIN) {';

  if (count(source, SOURCE_ANCHOR) !== 1) {
    failures.push('Source sw.js must contain exactly one neutral backend origin build anchor');
  }
  if (source.includes(TRACEABILITY_MARKER)) {
    failures.push('Source sw.js must not contain the generated backend contract marker');
  }
  if (/railway\.app|julvox-dealscan/i.test(source)) {
    failures.push('Source sw.js must not contain a Railway or Julvox-DealScan backend hostname');
  }
  if (/\bapi_base_url\b/.test(source)) {
    failures.push('Source sw.js must not consume the snake_case runtime contract directly');
  }
  if (/const\s+BACKEND_ORIGIN\s*=\s*['"]https?:\/\//.test(source)) {
    failures.push('Source sw.js must not hardcode a backend origin');
  }
  if (source.includes(LEGACY_DETECTION)) {
    failures.push('Source sw.js must not retain the historical hostname-fragment backend detection');
  }

  if (built.includes(SOURCE_ANCHOR) || built.includes('__JULVOX_BACKEND_ORIGIN_FROM_RUNTIME_CONTRACT__')) {
    failures.push('Built sw.js still contains the neutral backend build anchor');
  }
  if (count(built, TRACEABILITY_MARKER) !== 1) {
    failures.push('Built sw.js must contain exactly one backend contract traceability marker');
  }
  if (count(built, configuredDeclaration) !== 1) {
    failures.push('Built sw.js must contain exactly one backend origin derived from backend.api_base_url');
  }
  if (count(built, configuredCondition) !== 1) {
    failures.push('Built sw.js must compare request origins against BACKEND_ORIGIN exactly once');
  }
  if (built.includes(LEGACY_DETECTION) || /hostname\.includes\(['"](?:railway\.app|julvox-dealscan)/.test(built)) {
    failures.push('Built sw.js must not rely on historical backend hostname fragments');
  }
  if (/BACKEND_ORIGIN\s*(?:\|\||\?\?)/.test(built)) {
    failures.push('Built sw.js must not define an implicit backend origin fallback');
  }
  if (count(built, 'const BACKEND_ORIGIN = ') !== 1) {
    failures.push('Built sw.js must define BACKEND_ORIGIN exactly once');
  }
  const withoutTraceabilityMarker = built.replace(TRACEABILITY_MARKER, '');
  if (/\bapi_base_url\b/.test(withoutTraceabilityMarker)) {
    failures.push('Built sw.js must not expose a second snake_case backend authority');
  }

  return failures;
}

function readGeneratedBackendOrigin(root) {
  const runtimeConfigPath = path.join(root, 'runtime-config.js');
  const runtimeSource = fs.readFileSync(runtimeConfigPath, 'utf8');
  const vm = require('vm');
  const context = { globalThis: {} };
  vm.runInNewContext(runtimeSource, context, { filename: 'runtime-config.js' });
  const backendApiBaseUrl = context.globalThis.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl;
  if (!backendApiBaseUrl) {
    throw new Error('Generated runtime backend.apiBaseUrl is missing');
  }
  return new URL(backendApiBaseUrl).origin;
}

function runVerification(root = process.cwd()) {
  const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const built = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');
  const failures = verifyServiceWorkerBackendContract({
    source,
    built,
    backendOrigin: readGeneratedBackendOrigin(root),
  });
  if (failures.length) {
    throw new Error(`Service worker backend contract consumption failed:\n- ${failures.join('\n- ')}`);
  }
  console.log('Service worker backend contract consumption verified.');
}

if (require.main === module) runVerification();

module.exports = {
  LEGACY_DETECTION,
  SOURCE_ANCHOR,
  TRACEABILITY_MARKER,
  count,
  readGeneratedBackendOrigin,
  runVerification,
  verifyServiceWorkerBackendContract,
};
