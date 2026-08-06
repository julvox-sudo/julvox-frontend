const test = require('node:test');
const assert = require('node:assert/strict');
const { centralizeApiCalls } = require('../../scripts/ui00-transforms/centralize-api-calls.js');

test('centralizes every supported backend fetch form and leaves external fetches unchanged', () => {
  const source = `
    fetch(API + '/stats');
    fetch(\`${'${API}'}/promos\`);
    fetchWithTimeout(API + '/deals', {}, 8000);
    fetchWithRetry(\`${'${API}'}/health\`, { timeout: 1000 });
    fetch('https://example.org/feed.json');
  `;
  const transformed = centralizeApiCalls(source);
  assert.equal((transformed.match(/window\.JULVOX_API\.fetchResponse\(/g) || []).length, 4);
  assert.doesNotMatch(transformed, /fetchWithTimeout|fetchWithRetry|\bfetch\(\s*(?:API\s*\+|`\$\{API\})/);
  assert.match(transformed, /fetch\('https:\/\/example\.org\/feed\.json'\)/);
  assert.equal(centralizeApiCalls(transformed), transformed);
});
