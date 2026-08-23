'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_49_COMMUNITY_COMMENTS_TRUTH';

const COMMENT_LISTENER = `  el.querySelectorAll('[data-comm-comments-id]').forEach(function(button) {
    button.addEventListener('click', function() {
      const id = trust.positiveId(button.getAttribute('data-comm-comments-id'));
      const deal = normalized.find(function(item) { return item.id === id; });
      if (deal) openCommComments(id, deal.product_name);
    });
  });
`;

const COMMENT_BUTTON = `<button type="button" data-comm-comments-id="\${d.id}" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px;font-size:12px;font-weight:600;cursor:pointer;color:var(--txt)">💬 Commenter \${d.comments_count ? \`(\${d.comments_count})\` : ''}</button>`;

const DISABLED_COMMENT_BUTTON = '<button type="button" disabled aria-disabled="true" title="Commentaires communautaires indisponibles" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px;font-size:12px;font-weight:600;cursor:not-allowed;color:var(--txt3);opacity:.75">💬 Commentaires indisponibles</button>';

const COMMENTS_RUNTIME_PATTERN = /function openCommComments\(dealId, dealName\) \{[\s\S]*?async function loadCommComments\(dealId\) \{[\s\S]*?\n\}\n\s*(?=\/\/ ── Leaderboard render ──)/;

const DISABLED_COMMENTS_RUNTIME = `/* ${MARKER} */
function openCommComments() {
  showToast('💬 Commentaires communautaires indisponibles pour le moment');
}

async function loadCommComments() {
  return null;
}


`;

function replaceExactlyOnce(source, legacy, replacement, label) {
  const count = source.split(legacy).length - 1;
  if (count !== 1) throw new Error(`P6.49 expected exactly one ${label}, got ${count}`);
  return source.replace(legacy, replacement);
}

function replaceRuntimeExactlyOnce(source) {
  const matches = source.match(new RegExp(COMMENTS_RUNTIME_PATTERN.source, 'g')) || [];
  if (matches.length !== 1) throw new Error(`P6.49 expected exactly one community comments runtime, got ${matches.length}`);
  return source.replace(COMMENTS_RUNTIME_PATTERN, DISABLED_COMMENTS_RUNTIME);
}

function hardenHtml(html) {
  if (html.includes(`/* ${MARKER} */`)) {
    assertHardened(html);
    return html;
  }

  let output = replaceExactlyOnce(html, COMMENT_LISTENER, '', 'community comments listener');
  output = replaceExactlyOnce(output, COMMENT_BUTTON, DISABLED_COMMENT_BUTTON, 'community comments button');
  output = replaceRuntimeExactlyOnce(output);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) throw new Error(`P6.49 marker count must be 1, got ${markerCount}`);

  for (const unsupported of [
    'data-comm-comments-id',
    'postCommComment(',
    '/community/deals/${dealId}/comments',
    'placeholder="Ajoute un commentaire…"',
  ]) {
    if (html.includes(unsupported)) throw new Error(`P6.49 unavailable community comment path remains: ${unsupported}`);
  }

  for (const required of [
    '💬 Commentaires indisponibles',
    'disabled aria-disabled="true"',
    'function openCommComments()',
    'Commentaires communautaires indisponibles pour le moment',
    'async function loadCommComments()',
    'postDealComment(',
    'dealCommentsList_',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.49 required comments truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_49_COMMUNITY_COMMENTS_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
