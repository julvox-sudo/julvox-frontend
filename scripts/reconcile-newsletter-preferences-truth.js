'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_38_NEWSLETTER_PREFERENCES_TRUTH';

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`P6.38 expected one ${label}, got ${count}`);
  return source.replace(before, after);
}

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }

  let out = html;
  const start = out.indexOf('async function openNewsletterPrefs() {');
  const end = out.indexOf('\n</script>\n<!-- runtime-contract:runtime.enhancements_script -->', start);
  if (start < 0 || end < 0) throw new Error('P6.38 newsletter preferences anchors missing');
  let block = out.slice(start, end);

  block = replaceOnce(
    block,
    "  const minScore = prefs?.min_score || 75;\n",
    "  const safePrefsEmail = escHtml(prefs?.email || currentUser?.email || '');\n",
    'legacy min-score state'
  );
  block = replaceOnce(
    block,
    "${prefs?.email || currentUser?.email || ''}",
    '${safePrefsEmail}',
    'newsletter email render'
  );
  block = replaceOnce(
    block,
    "        ? `<button onclick=\"unsubscribeNewsletter()\" style=\"background:rgba(231,76,60,.12);border:1px solid rgba(231,76,60,.3);color:#e74c3c;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer\">Se désabonner</button>`\n",
    "        ? `<div style=\"max-width:180px;text-align:right;font-size:11px;line-height:1.35;color:var(--txt3)\">Désabonnement via le lien présent dans chaque email Julvox.</div>`\n",
    'broken unsubscribe button'
  );
  block = replaceOnce(
    block,
    "          {v:'flash',  e:'🔥', t:'Flash only',       s:'à partir des données disponibles'},\n",
    '',
    'fake flash-only preference'
  );

  const scoreStart = block.indexOf('    <!-- Score minimum -->');
  const scoreEnd = block.indexOf('    <!-- Save button -->', scoreStart);
  if (scoreStart < 0 || scoreEnd < 0) throw new Error('P6.38 legacy score preference section missing');
  block = block.slice(0, scoreStart) + block.slice(scoreEnd);

  block = replaceOnce(
    block,
    "  const minScore = parseInt(document.getElementById('prefsMinScore')?.value || '75');\n\n",
    '',
    'legacy min-score save state'
  );
  block = replaceOnce(
    block,
    '      body: JSON.stringify({ frequency, categories, min_score: minScore })',
    '      body: JSON.stringify({ frequency, categories })',
    'legacy min-score payload'
  );

  block = `// ${MARKER}\n` + block;
  out = out.slice(0, start) + block + out.slice(end);
  assertHardened(out);
  return out;
}

function assertHardened(html) {
  const count = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (count !== 1) throw new Error(`P6.38 marker count must be 1, got ${count}`);
  const start = html.indexOf(`// ${MARKER}`);
  const end = html.indexOf('\n</script>\n<!-- runtime-contract:runtime.enhancements_script -->', start);
  if (start < 0 || end < 0) throw new Error('P6.38 hardened newsletter block missing');
  const block = html.slice(start, end);

  for (const bad of [
    'prefsMinScore',
    'min_score: minScore',
    "{v:'flash'",
    'unsubscribeNewsletter()',
    'Score Julvox minimum',
  ]) {
    if (block.includes(bad)) throw new Error(`P6.38 stale newsletter preference remains: ${bad}`);
  }
  for (const required of [
    "const safePrefsEmail = escHtml(prefs?.email || currentUser?.email || '');",
    '${safePrefsEmail}',
    'Désabonnement via le lien présent dans chaque email Julvox.',
    'body: JSON.stringify({ frequency, categories })',
    "{v:'daily'",
    "{v:'weekly'",
    "{v:'twice'",
  ]) {
    if (!block.includes(required)) throw new Error(`P6.38 missing ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_38_NEWSLETTER_PREFERENCES_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
