const test = require('node:test');
const assert = require('node:assert/strict');
const { finalizeHtml } = require('../../scripts/finalize-ui-00-production-truth.js');

test('removes product placeholders, local analysis and arbitrary score fallbacks', () => {
  const source = `
    const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';
    <input placeholder="Ex: MacBook Air M3, Sony WH-1000XM5…"/>
    function injectLocalAnalysis(deal) { const score = deal.novadeal_score || 50; return 'Analyse locale ' + score; }
    function card(d) {
      const score = d.novadeal_score || 50;
      const scCls = score >= 90 ? 'sp-fire' : score >= 75 ? 'sp-green' : 'sp-gold';
      const ok = score >= 70;
      return '<span class="score-pill ' + scCls + '">★ ' + score + '</span>';
    }
  `;
  const result = finalizeHtml(source);
  assert.doesNotMatch(result, /MacBook Air M3|Analyse locale|novadeal_score\s*\|\|\s*50/);
  assert.match(result, /function ui00ScoreLabel/);
  assert.match(result, /ui00NumericScore\(d\.novadeal_score\)/);
});
