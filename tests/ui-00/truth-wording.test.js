const test = require('node:test');
const assert = require('node:assert/strict');
const { qualifyTruthWording } = require('../../scripts/ui00-transforms/stage-5.js');

test('qualifies rendered real-time claims without renaming code identifiers', () => {
  const source = `
    function renderFlashLive() { return 'ok'; }
    <div>Live</div>
    const label = 'LIVE';
    <p>Deals vérifiés en temps réel</p>
    <span>vérifié il y a 5 minutes</span>
  `;
  const result = qualifyTruthWording(source);
  assert.match(result, /function renderFlashLive/);
  assert.match(result, />Offres</);
  assert.match(result, /'OFFRES'/);
  assert.doesNotMatch(result, />\s*Live\s*</i);
  assert.doesNotMatch(result, /temps réel|vérifié il y a/i);
  assert.equal(qualifyTruthWording(result), result);
});
