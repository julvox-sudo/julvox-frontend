const test = require('node:test');
const assert = require('node:assert/strict');
const { finalizeResiduals } = require('../../scripts/finalize-ui-00-residuals.js');

test('removes random vote counters and residual score fallbacks', () => {
  const source = `
    function ui00NumericScore(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
    function ui00ScoreLabel(value) { return value === null ? 'Score indisponible' : value + '/100'; }
    async function loadDealVotes(id) {
      try { updateVoteUI(id, { up: 1, down: 0 }); }
      catch { const up = Math.floor(Math.random() * 80) + 8; const down = Math.floor(Math.random() * 15) + 1; updateVoteUI(id, { up, down }); }
    }
    function compare(products) {
      const bestScore = products[0].novadeal_score || 50;
      const sc = products[0].score || 82;
      return \`★ \${bestScore} — \${sc}/100\`;
    }
  `;
  const result = finalizeResiduals(source);
  assert.doesNotMatch(result, /Math\.random|\|\|\s*(?:50|82)/);
  assert.match(result, /window\.JULVOX_API\.get/);
  assert.match(result, /Votes indisponibles/);
  assert.match(result, /ui00ScoreLabel/);
  assert.match(result, /Score indisponible/);
});
