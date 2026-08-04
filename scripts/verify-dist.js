const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dist = path.join(root, 'dist');
const requiredFiles = [
  'api-client.js', 'enhancements_v3.js', 'index.html', 'manifest.json',
  'runtime-config.js', 'sw.js', 'ui-00-production-truth.js',
];
function fail(message) { console.error(`Static build verification failed: ${message}`); process.exit(1); }
if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) fail('dist/ directory is missing');
for (const relativePath of requiredFiles) {
  const absolutePath = path.join(dist, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) fail(`${relativePath} is missing from dist/`);
  if (fs.statSync(absolutePath).size === 0) fail(`${relativePath} is empty`);
}
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) fail('index.html does not contain a complete HTML document');
const scripts = [
  '<script src="/runtime-config.js"></script>',
  '<script src="/api-client.js"></script>',
  '<script src="/ui-00-production-truth.js" defer></script>',
  '<script src="/enhancements_v3.js" defer></script>',
];
const positions = scripts.map(script => {
  if (html.split(script).length - 1 !== 1) fail(`index.html must load exactly one ${script}`);
  return html.indexOf(script);
});
if (!positions.every((position, index) => index === 0 || positions[index - 1] < position)) fail('runtime script order is invalid');
const serviceWorker = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
if (!serviceWorker.includes('addEventListener')) fail('sw.js does not register service-worker events');
if (!serviceWorker.includes('isCacheablePublicApiRequest')) fail('sw.js does not isolate cacheable public API requests');
console.log('Static build verification passed.');
