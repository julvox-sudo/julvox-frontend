const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');

function fail(message) {
  throw new Error(`UI-00 final product truth failed: ${message}`);
}

function findMatchingBrace(source, openingIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openingIndex; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) { if (character === '\n') lineComment = false; continue; }
    if (blockComment) { if (character === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (character === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (character === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function replaceNamedFunction(source, name, replacement, required = true) {
  const expression = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = expression.exec(source);
  if (!match) {
    if (required) fail(`function ${name} not found`);
    return source;
  }
  const braceStart = source.indexOf('{', match.index + match[0].length);
  const braceEnd = findMatchingBrace(source, braceStart);
  if (braceStart < 0 || braceEnd < 0) fail(`function ${name} is not balanced`);
  return `${source.slice(0, match.index)}${replacement}${source.slice(braceEnd + 1)}`;
}

function replaceRequired(source, pattern, replacement, label, minimum = 1) {
  const matches = typeof pattern === 'string'
    ? source.split(pattern).length - 1
    : [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))].length;
  if (matches < minimum) fail(`expected ${label}, found ${matches}`);
  return source.replace(pattern, replacement);
}

function finalizeHtml(input) {
  let html = input;

  html = html.replace(
    'placeholder="Ex: MacBook Air M3, Sony WH-1000XM5…"',
    'placeholder="Rechercher un produit à comparer…"',
  );

  const helperAnchor = "const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';";
  const helpers = `${helperAnchor}\nfunction ui00NumericScore(value) {\n  const score = Number(value);\n  return Number.isFinite(score) ? score : null;\n}\nfunction ui00ScoreLabel(value) {\n  const score = ui00NumericScore(value);\n  return score === null ? 'Score indisponible' : score + '/100';\n}`;
  html = replaceRequired(html, helperAnchor, helpers, 'runtime API declaration for score helpers');

  html = replaceNamedFunction(html, 'injectLocalAnalysis', `function injectLocalAnalysis() {
  const container = document.getElementById('modalExtra');
  if (container) container.innerHTML = '';
}`, false);

  html = html
    .replace(/const score\s*=\s*d\.novadeal_score\s*\|\|\s*50;/g, 'const score = ui00NumericScore(d.novadeal_score);')
    .replace(/const score\s*=\s*deal\.novadeal_score\s*\|\|\s*50;/g, 'const score = ui00NumericScore(deal.novadeal_score);')
    .replace(/const score\s*=\s*deal\.novadeal_score\s*\|\|\s*0;/g, 'const score = ui00NumericScore(deal.novadeal_score);')
    .replace(/const score\s*=\s*d\.score\s*\|\|\s*d\.novadeal_score\s*\|\|\s*0;/g, 'const score = ui00NumericScore(d.score ?? d.novadeal_score);')
    .replace(/const scCls\s*=\s*score >= 90 \? 'sp-fire' : score >= 75 \? 'sp-green' : 'sp-gold';/g, "const scCls = score === null ? '' : score >= 90 ? 'sp-fire' : score >= 75 ? 'sp-green' : 'sp-gold';")
    .replace(/const ok\s*=\s*score >= 70;/g, 'const ok = score !== null && score >= 70;')
    .replace(/const v\s*=\s*getVerdict\(score\);/g, "const v = score === null ? { emoji: 'ℹ️', text: 'Score indisponible', detail: 'Le service n’a pas fourni de score.' } : getVerdict(score);")
    .replace(/const scoreColor\s*=\s*\(deal\.novadeal_score\|\|50\) >= 75 \? 'var\(--green\)' : \(deal\.novadeal_score\|\|50\) >= 50 \? 'var\(--gold\)' : '#FF5C2B';/g, "const scoreColor = score === null ? 'var(--txt3)' : score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : '#FF5C2B';")
    .replace(/const scoreColor\s*=\s*score >= 85 \? 'var\(--green\)' : score >= 65 \? 'var\(--gold\)' : '#FF5C2B';/g, "const scoreColor = score === null ? 'var(--txt3)' : score >= 85 ? 'var(--green)' : score >= 65 ? 'var(--gold)' : '#FF5C2B';")
    .replace(/(\b(?:deal|d)\.novadeal_score\s*\?\?\s*(?:deal|d)\.score)\s*\?\?\s*(?:50|75|82)\b/g, '$1 ?? null')
    .replace(/(\b(?:deal|d)\.score\s*\?\?\s*(?:deal|d)\.novadeal_score)\s*\?\?\s*(?:50|75|82)\b/g, '$1 ?? null')
    .replace(/(\b(?:deal|d)\.novadeal_score)\s*\|\|\s*(?:50|75|82)\b/g, '$1 ?? null')
    .replace(/(STORE_TRUST(?:_V3)?\[[^\]]+\])\s*\|\|\s*82\b/g, '$1 ?? null');

  html = html.replace(
    '<span class="score-pill ${scCls}">★ ${score}</span>',
    "${score === null ? '<span class=\"score-pill\">Score indisponible</span>' : `<span class=\"score-pill ${scCls}\">★ ${score}</span>`}",
  );
  html = html.replace(
    '<div class="score-ring"><div class="score-num">${score}</div><div class="score-sub2">/100</div></div>',
    "${score === null ? '<div class=\"score-ring\"><div class=\"score-num\" style=\"font-size:11px\">N/D</div><div class=\"score-sub2\">indisponible</div></div>' : `<div class=\"score-ring\"><div class=\"score-num\">${score}</div><div class=\"score-sub2\">/100</div></div>`}",
  );

  html = html
    .replace(/Score NovaDeal™ \$\{deal\.novadeal_score\}\/100/g, 'Score NovaDeal™ ${ui00ScoreLabel(deal.novadeal_score)}')
    .replace(/★\$\{deal\.novadeal_score\|\|0\}/g, "${ui00NumericScore(deal.novadeal_score) === null ? 'Score indisponible' : '★' + ui00NumericScore(deal.novadeal_score)}")
    .replace(/★\$\{d\.novadeal_score\|\|0\}/g, "${ui00NumericScore(d.novadeal_score) === null ? 'Score indisponible' : '★' + ui00NumericScore(d.novadeal_score)}")
    .replace(/★ \$\{d\.novadeal_score\}/g, "${ui00NumericScore(d.novadeal_score) === null ? 'Score indisponible' : '★ ' + ui00NumericScore(d.novadeal_score)}")
    .replace(/\$\{deal\.novadeal_score\}\/100/g, '${ui00ScoreLabel(deal.novadeal_score)}');

  return html;
}

if (require.main === module) {
  if (!fs.existsSync(indexPath)) fail('dist/index.html is missing');
  const source = fs.readFileSync(indexPath, 'utf8');
  const finalized = finalizeHtml(source);
  fs.writeFileSync(indexPath, finalized, 'utf8');
  console.log('UI-00 final product truth applied to dist/index.html.');
}

module.exports = { finalizeHtml };
