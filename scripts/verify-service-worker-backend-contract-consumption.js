const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'runtime-contract.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const built = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');
const backendOrigin = new URL(contract.backend.api_base_url).origin;

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const historicalDetection = "url.hostname.includes('railway.app') || url.hostname.includes('julvox-dealscan')";
const marker = 'runtime-contract:backend.api_base_url';
const configuredOrigin = `const backendOrigin = '${backendOrigin}';`;
const configuredCondition = 'if (url.origin === backendOrigin) {';

if (count(source, historicalDetection) !== 1) {
  throw new Error('Source sw.js must retain exactly one controlled historical backend detection anchor');
}

if (source.includes(marker)) {
  throw new Error('Source sw.js must not contain the generated runtime-contract marker');
}

if (built.includes(historicalDetection)) {
  throw new Error('Built sw.js still contains the historical Railway/DealScan backend detection');
}

if (count(built, marker) !== 1) {
  throw new Error('Built sw.js must contain exactly one backend contract traceability marker');
}

if (count(built, configuredOrigin) !== 1) {
  throw new Error('Built sw.js must contain exactly one backend origin derived from backend.api_base_url');
}

if (count(built, configuredCondition) !== 1) {
  throw new Error('Built sw.js must compare request origins against the configured backend origin exactly once');
}

if (built.includes("hostname.includes('railway.app')") || built.includes("hostname.includes('julvox-dealscan')")) {
  throw new Error('Built sw.js must not rely on historical backend hostname fragments');
}

console.log('Service worker backend contract consumption verified.');
