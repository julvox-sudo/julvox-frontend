const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanProductionTruth } = require('../../scripts/verify-production-truth.js');

test('forbidden demo fixture is detected', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui00-fixture-'));
  fs.mkdirSync(path.join(dir, 'dist'));
  fs.writeFileSync(path.join(dir, 'dist/index.html'), '<script src="/api-client.js"></script><script src="/ui-00-production-truth.js" defer></script>getDemoWishlist');
  fs.writeFileSync(path.join(dir, 'dist/enhancements_v3.js'), '');
  fs.writeFileSync(path.join(dir, 'dist/api-client.js'), '');
  fs.writeFileSync(path.join(dir, 'dist/ui-00-production-truth.js'), 'runConfirmedMutation');
  fs.writeFileSync(path.join(dir, 'dist/sw.js'), 'status: 503; status: 504;');
  const failures = scanProductionTruth({
    html: 'dist/index.html',
    enhancements: 'dist/enhancements_v3.js',
    client: 'dist/api-client.js',
    truth: 'dist/ui-00-production-truth.js',
    sw: 'dist/sw.js',
  }, dir);
  assert.ok(failures.some(value => value.includes('getDemoWishlist')));
});
