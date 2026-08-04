const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');

function fail(message) {
  throw new Error(`UI-00 residual product truth failed: ${message}`);
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
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
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

function normalizeScoreFallbacks(source) {
  let output = source;
  const scoreAccess = String.raw`(?:[A-Za-z_$][\w$]*(?:\[[^\]\n]+\])?(?:\?\.)?\.(?:novadeal_score|merchant_trust_score|score))`;
  output = output.replace(
    new RegExp(`(${scoreAccess})\\s*(?:\\|\\||\\?\\?)\\s*(?:50|75|82)\\b`, 'g'),
    'ui00NumericScore($1)',
  );
  output = output.replace(
    /\(([^()\n]*(?:novadeal_score|merchant_trust_score|score)[^()\n]*)\)\s*(?:\|\||\?\?)\s*(?:50|75|82)\b/g,
    'ui00NumericScore($1)',
  );
  output = output
    .replace(/const\s+bestScore\s*=\s*([^;]+);/g, 'const bestScore = ui00NumericScore($1);')
    .replace(/const\s+sc\s*=\s*([^;]*(?:novadeal_score|\.score)[^;]*);/g, 'const sc = ui00NumericScore($1);')
    .replace(/score:\s*([^,}\n]*(?:novadeal_score|\.score)[^,}\n]*)\s*(?:\|\||\?\?)\s*(?:50|75|82)\b/g, 'score: ui00NumericScore($1)')
    .replace(/\$\{bestScore\}\/100/g, '${ui00ScoreLabel(bestScore)}')
    .replace(/\$\{sc\}\/100/g, '${ui00ScoreLabel(sc)}')
    .replace(/★\s*\$\{bestScore\}/g, "${bestScore === null ? 'Score indisponible' : '★ ' + bestScore}")
    .replace(/★\s*\$\{sc\}/g, "${sc === null ? 'Score indisponible' : '★ ' + sc}")
    .replace(/\$\{bestScore\}/g, '${bestScore === null ? \'Score indisponible\' : bestScore}')
    .replace(/\$\{sc\}/g, '${sc === null ? \'Score indisponible\' : sc}');
  return output;
}

function finalizeResiduals(source) {
  let html = replaceNamedFunction(source, 'loadDealVotes', `async function loadDealVotes(id) {
  const token = (typeof currentUser !== 'undefined' && currentUser)
    ? currentUser.token
    : localStorage.getItem('token');
  const result = await window.JULVOX_API.get('/deals/' + id + '/votes', {
    token,
    isEmpty: data => !Number.isFinite(data?.up) || !Number.isFinite(data?.down),
  });
  if (!result.ok || result.kind === 'empty') {
    const voteRow = document.getElementById('voteUp_' + id)?.closest?.('.vote-row');
    if (voteRow) {
      voteRow.dataset.ui00VotesStatus = 'unavailable';
      voteRow.setAttribute('aria-label', 'Votes indisponibles');
    }
    return;
  }
  updateVoteUI(id, result.data);
  const voteRow = document.getElementById('voteUp_' + id)?.closest?.('.vote-row');
  if (voteRow) {
    voteRow.dataset.ui00VotesStatus = 'confirmed';
    voteRow.removeAttribute('aria-label');
  }
}`, true);

  html = normalizeScoreFallbacks(html);

  if (/(?:vote|votes|score|popularit|confirmation|\bup\b|\bdown\b)[^;\n]{0,180}Math\.random|Math\.random[^;\n]{0,180}(?:vote|votes|score|popularit|confirmation|\bup\b|\bdown\b)/i.test(html)) {
    fail('a random business fallback remains after finalization');
  }
  if (/\b(?:novadeal_score|merchant_trust_score|score)\b[^\n;]{0,120}(?:\|\||\?\?)\s*(?:50|75|82)\b/.test(html)) {
    fail('an arbitrary score fallback remains after finalization');
  }
  return html;
}

if (require.main === module) {
  if (!fs.existsSync(indexPath)) fail('dist/index.html is missing');
  const source = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, finalizeResiduals(source), 'utf8');
  console.log('UI-00 residual product truth applied to dist/index.html.');
}

module.exports = { finalizeResiduals, normalizeScoreFallbacks };
