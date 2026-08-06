const test = require('node:test');
const assert = require('node:assert/strict');
const { finalizeResiduals } = require('../../scripts/finalize-ui-00-residuals.js');

test('removes random vote counters and residual scores idempotently', () => {
  const source = `/* ui-00-final-product-truth:applied-v3 */
  function ui00NumericScore(value){ return Number(value); }
  function ui00ScoreLabel(value) { return value + '/100'; }
  async function loadDealVotes(id){ try { updateVoteUI(id,{up:1,down:0}); } catch { const up=Math.floor(Math.random()*80)+8; updateVoteUI(id,{up,down:1}); } }
  function compare(d){ const bestScore=d.novadeal_score||50; return bestScore; }`;
  const result = finalizeResiduals(source);
  assert.doesNotMatch(result, /Math\.random|\|\|\s*50/);
  assert.match(result, /window\.JULVOX_API\.get/);
  assert.equal(finalizeResiduals(result), result);
});
