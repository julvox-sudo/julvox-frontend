const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
const configPath = path.join(root, 'dist', 'runtime-config.js');
const failures = [];
const fail = message => failures.push(message);

if (!fs.existsSync(indexPath)) fail('dist/index.html is missing');
if (!fs.existsSync(configPath)) fail('dist/runtime-config.js is missing');

if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const orderedScripts = [
    '<script src="/runtime-config.js"></script>',
    '<script src="/api-client.js"></script>',
    '<script src="/ui-00-production-truth.js" defer></script>',
    '<script src="/enhancements_v3.js" defer></script>',
  ];
  const positions = orderedScripts.map(script => {
    const count = html.split(script).length - 1;
    if (count !== 1) fail(`script must appear exactly once: ${script}`);
    return html.indexOf(script);
  });
  if (!positions.every((position, index) => position >= 0 && (index === 0 || positions[index - 1] < position))) {
    fail('runtime config, API client, UI-00 truth and enhancements are not loaded in the required order');
  }
  const configuredApi = "const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';";
  if (!html.includes(configuredApi)) fail('dist/index.html does not consume backend.apiBaseUrl');
  if (/\.backend\?\.api_base_url|\.backend\.api_base_url/.test(html)) fail('dist/index.html still consumes backend.api_base_url');
  if (/const API = [^;]+\|\| ['"]https:\/\/[^'"]*railway\.app['"]/.test(html)) fail('hard-coded Railway fallback remains');
  if (positions[0] > html.indexOf(configuredApi)) fail('/runtime-config.js is loaded after the API constant is initialized');
}

if (failures.length) {
  console.error('Runtime config consumption verification failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Runtime config consumption verified.');
