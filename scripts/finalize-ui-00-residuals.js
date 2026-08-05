const fs = require('fs');
const path = require('path');
const { replaceNamedFunction } = require('./apply-ui-00-production-truth.js');
const { findArbitraryScoreFallbacks, normalizeScoreFallbacks } = require('./ui-00-score-contract.js');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
const MARKER = '/* ui-00-residual-product-truth:applied-v3 */';

function fail(message) {
  throw new Error(`UI-00 residual product truth failed: ${message}`);
}

function verifyResiduals(html) {
  if (!html.includes(MARKER)) fail('residual marker is missing');
  if (/(?:vote|votes|score|popularit|confirmation|\bup\b|\bdown\b)[^;\n]{0,180}Math\.random|Math\.random[^;\n]{0,180}(?:vote|votes|score|popularit|confirmation|\bup\b|\bdown\b)/i.test(html)) fail('a random business fallback remains');
  if (findArbitraryScoreFallbacks(html).length) fail('an arbitrary score fallback remains');
  if (/function\s+loadDealVotes[\s\S]{0,900}Math\.random/.test(html)) fail('loadDealVotes still fabricates counters');
  return html;
}

function finalizeResiduals(source) {
  if (source.includes(MARKER)) return verifyResiduals(source);
  let html = replaceNamedFunction(source, 'loadDealVotes', `async function loadDealVotes(id) {
  const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : localStorage.getItem('token');
  const result = await window.JULVOX_API.get('/deals/' + encodeURIComponent(id) + '/votes', {
    token,
    isEmpty: data => !Number.isFinite(data?.up) || !Number.isFinite(data?.down),
  });
  const voteRow = document.getElementById('voteUp_' + id)?.closest?.('.vote-row');
  if (!result.ok || result.kind === 'empty') {
    if (voteRow) { voteRow.dataset.ui00VotesStatus = 'unavailable'; voteRow.setAttribute('aria-label', 'Votes indisponibles'); }
    return;
  }
  updateVoteUI(id, result.data);
  if (voteRow) { voteRow.dataset.ui00VotesStatus = 'confirmed'; voteRow.removeAttribute('aria-label'); }
}`, true);
  html = normalizeScoreFallbacks(html);
  const anchor = 'function ui00ScoreLabel(value) {';
  const index = html.indexOf(anchor);
  if (index < 0) fail('score helper anchor is missing');
  html = `${html.slice(0, index)}${MARKER}\n${html.slice(index)}`;
  return verifyResiduals(html);
}

if (require.main === module) {
  if (!fs.existsSync(indexPath)) fail('dist/index.html is missing');
  fs.writeFileSync(indexPath, finalizeResiduals(fs.readFileSync(indexPath, 'utf8')), 'utf8');
  console.log('UI-00 residual product truth applied to dist/index.html.');
}

module.exports = { MARKER, finalizeResiduals, normalizeScoreFallbacks, verifyResiduals };
