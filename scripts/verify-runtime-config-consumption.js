const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
const configPath = path.join(root, 'dist', 'runtime-config.js');
const failures = [];

function fail(message) {
  failures.push(message);
}

if (!fs.existsSync(indexPath)) fail('dist/index.html is missing');
if (!fs.existsSync(configPath)) fail('dist/runtime-config.js is missing');

if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const scriptTag = '<script src="/runtime-config.js"></script>';
  const configuredApi = "const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';";
  const forbiddenFallback = /const API = [^;]+\|\| ['"]https:\/\/[^'"]*railway\.app['"];/;
  const legacyApi = "const API = 'https://julvox-dealscan-backend-production.up.railway.app';";

  if (!html.includes(scriptTag)) fail('dist/index.html does not load /runtime-config.js');
  if (!html.includes(configuredApi)) fail('dist/index.html does not consume backend.apiBaseUrl from JULVOX_RUNTIME_CONFIG');
  if (html.includes(legacyApi)) fail('dist/index.html still contains the standalone legacy API declaration');
  if (forbiddenFallback.test(html)) fail('dist/index.html still contains a hard-coded Railway fallback');

  const scriptPosition = html.indexOf(scriptTag);
  const apiPosition = html.indexOf(configuredApi);
  if (scriptPosition !== -1 && apiPosition !== -1 && scriptPosition > apiPosition) {
    fail('/runtime-config.js is loaded after the API constant is initialized');
  }
}

if (failures.length > 0) {
  console.error('Runtime config consumption verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Runtime config consumption verified.');
