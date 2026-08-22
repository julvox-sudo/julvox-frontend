const fs = require('fs');
const path = require('path');
const {
  RUNTIME_HELPERS,
  findArbitraryScoreFallbacks,
  normalizeScoreFallbacks,
} = require('./ui-00-score-contract.js');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
const MARKER = '/* ui-00-final-product-truth:applied-v3 */';
const LEGACY_WISHLIST_TARGET = "item.current_best_price <= item.target_price ? '✅ ATTEINT !' : '(encore ' + (item.current_best_price - item.target_price).toFixed(0) + '€ à baisser)'";
const SAFE_WISHLIST_TARGET = "Number.isFinite(item.current_best_price) ? (item.current_best_price <= Number(item.target_price) ? '✅ ATTEINT !' : '(encore ' + (item.current_best_price - Number(item.target_price)).toFixed(0) + '€ à baisser)') : 'Prix actuel non observé'";

function fail(message) {
  throw new Error(`UI-00 final product truth failed: ${message}`);
}

function verifyFinalized(html) {
  if (!html.includes(MARKER)) fail('final product truth marker is missing');
  if ((html.match(/function ui00NumericScore\(/g) || []).length !== 1) fail('ui00NumericScore must be defined exactly once');
  if ((html.match(/function ui00ResolveScore\(/g) || []).length !== 1) fail('ui00ResolveScore must be defined exactly once');
  if ((html.match(/function ui00ScoreLabel\(/g) || []).length !== 1) fail('ui00ScoreLabel must be defined exactly once');
  const scoreFallbacks = findArbitraryScoreFallbacks(html);
  if (scoreFallbacks.length) fail(`an arbitrary score fallback remains: ${scoreFallbacks[0]}`);
  if (/Score NovaDeal™\s+\$\{(?:deal|d)\.novadeal_score\}\/100/.test(html)) fail('undefined score rendering remains');
  if (html.includes(LEGACY_WISHLIST_TARGET)) fail('wishlist can still treat a missing market price as a reached target');
  return html;
}

function finalizeHtml(input) {
  if (input.includes(MARKER)) return verifyFinalized(input);
  const anchor = "const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';";
  const count = input.split(anchor).length - 1;
  if (count !== 1) fail(`expected exactly one runtime API anchor, found ${count}`);

  let html = input.replace(anchor, `${anchor}\n${MARKER}\n${RUNTIME_HELPERS}\nfunction ui00ScoreLabel(value) {\n  const score = ui00NumericScore(value);\n  return score === null ? 'Score indisponible' : score + '/100';\n}`);

  // Convert the historical colour fallback before the generic score resolver rewrites its operands.
  html = html.replace(
    /const scoreColor\s*=\s*\(deal\.novadeal_score\|\|50\) >= 75 \? 'var\(--green\)' : \(deal\.novadeal_score\|\|50\) >= 50 \? 'var\(--gold\)' : '#FF5C2B';/g,
    "const scoreColorValue = ui00ResolveScore(deal.novadeal_score, deal.score); const scoreColor = scoreColorValue === null ? 'var(--txt3)' : scoreColorValue >= 75 ? 'var(--green)' : scoreColorValue >= 50 ? 'var(--gold)' : '#FF5C2B';",
  );

  html = normalizeScoreFallbacks(html);
  html = html.split(LEGACY_WISHLIST_TARGET).join(SAFE_WISHLIST_TARGET);

  html = html
    .replace(/const score\s*=\s*deal\.novadeal_score\s*\|\|\s*0;/g, 'const score = ui00ResolveScore(deal.novadeal_score, deal.score);')
    .replace(/const score\s*=\s*d\.score\s*\|\|\s*d\.novadeal_score\s*\|\|\s*0;/g, 'const score = ui00ResolveScore(d.novadeal_score, d.score);')
    .replace(/const scCls\s*=\s*score >= 90 \? 'sp-fire' : score >= 75 \? 'sp-green' : 'sp-gold';/g, "const scCls = score === null ? '' : score >= 90 ? 'sp-fire' : score >= 75 ? 'sp-green' : 'sp-gold';")
    .replace(/const ok\s*=\s*score >= 70;/g, 'const ok = score !== null && score >= 70;')
    .replace(/const v\s*=\s*getVerdict\(score\);/g, "const v = score === null ? { emoji: 'ℹ️', text: 'Score indisponible', detail: 'Le service n’a pas fourni de score.' } : getVerdict(score);")
    .replace(/const scoreColor\s*=\s*score >= 85 \? 'var\(--green\)' : score >= 65 \? 'var\(--gold\)' : '#FF5C2B';/g, "const scoreColor = score === null ? 'var(--txt3)' : score >= 85 ? 'var(--green)' : score >= 65 ? 'var(--gold)' : '#FF5C2B';")
    .replace(/<span class="score-pill \$\{scCls\}">★ \$\{score\}<\/span>/g, "${score === null ? '<span class=\"score-pill\">Score indisponible</span>' : `<span class=\"score-pill ${scCls}\">★ ${score}</span>`}")
    .replace(/<div class="score-ring"><div class="score-num">\$\{score\}<\/div><div class="score-sub2">\/100<\/div><\/div>/g, "${score === null ? '<div class=\"score-ring\"><div class=\"score-num\" style=\"font-size:11px\">N/D</div><div class=\"score-sub2\">indisponible</div></div>' : `<div class=\"score-ring\"><div class=\"score-num\">${score}</div><div class=\"score-sub2\">/100</div></div>`}")
    .replace(/Score NovaDeal™ \$\{deal\.novadeal_score\}\/100/g, 'Score NovaDeal™ ${ui00ScoreLabel(deal.novadeal_score)}')
    .replace(/★\$\{deal\.novadeal_score\|\|0\}/g, "${ui00NumericScore(deal.novadeal_score) === null ? 'Score indisponible' : '★' + ui00NumericScore(deal.novadeal_score)}")
    .replace(/★\$\{d\.novadeal_score\|\|0\}/g, "${ui00NumericScore(d.novadeal_score) === null ? 'Score indisponible' : '★' + ui00NumericScore(d.novadeal_score)}")
    .replace(/★ \$\{d\.novadeal_score\}/g, "${ui00NumericScore(d.novadeal_score) === null ? 'Score indisponible' : '★ ' + ui00NumericScore(d.novadeal_score)}")
    .replace(/\$\{deal\.novadeal_score\}\/100/g, '${ui00ScoreLabel(deal.novadeal_score)}');

  return verifyFinalized(html);
}

if (require.main === module) {
  if (!fs.existsSync(indexPath)) fail('dist/index.html is missing');
  fs.writeFileSync(indexPath, finalizeHtml(fs.readFileSync(indexPath, 'utf8')), 'utf8');
  console.log('UI-00 final product truth applied to dist/index.html.');
}

module.exports = { LEGACY_WISHLIST_TARGET, MARKER, SAFE_WISHLIST_TARGET, finalizeHtml, verifyFinalized };
