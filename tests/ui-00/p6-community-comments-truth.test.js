'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-community-comments-truth');

const fixture = `<!doctype html><html><body>
<script>
function showToast() {}
function renderCommDeals(normalized, el, trust) {
  el.querySelectorAll('[data-comm-comments-id]').forEach(function(button) {
    button.addEventListener('click', function() {
      const id = trust.positiveId(button.getAttribute('data-comm-comments-id'));
      const deal = normalized.find(function(item) { return item.id === id; });
      if (deal) openCommComments(id, deal.product_name);
    });
  });
}
function renderCommDealCard(d) {
  return \`<button type="button" data-comm-comments-id="\${d.id}" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px;font-size:12px;font-weight:600;cursor:pointer;color:var(--txt)">💬 Commenter \${d.comments_count ? \`(\${d.comments_count})\` : ''}</button>\`;
}
function openCommComments(dealId, dealName) {
  const body = document.getElementById('modalBody');
  body.innerHTML = \`<div id="commCommentsList"></div><input type="text" id="commCommentInput" placeholder="Ajoute un commentaire…" onkeydown="if(event.key==='Enter')postCommComment(\${dealId})"/><button onclick="postCommComment(\${dealId})">↑</button>\`;
  loadCommComments(dealId);
}
async function loadCommComments(dealId) {
  const el = document.getElementById('commCommentsList');
  try {
    const r = await window.JULVOX_API.fetchResponse(\`\${API}/community/deals/\${dealId}/comments\`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const comments = d.comments || [];
    if (!comments.length) { el.innerHTML = 'Sois le premier à commenter !'; return; }
  } catch(e) { el.innerHTML = 'Sois le premier à commenter !'; }
}


// ── Leaderboard render ──
function postDealComment() { return true; }
const mainDealCommentsId = 'dealCommentsList_';
</script>
</body></html>`;

function executableInlineScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    scripts.push(match[2] || '');
  }
  return scripts;
}

test('P6.49 disables the unavailable community-comments path instead of fabricating an empty state', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /data-comm-comments-id/);
  assert.doesNotMatch(hardened, /postCommComment\(/);
  assert.doesNotMatch(hardened, /\/community\/deals\/\$\{dealId\}\/comments/);
  assert.doesNotMatch(hardened, /placeholder="Ajoute un commentaire…"/);
  assert.match(hardened, /💬 Commentaires indisponibles/);
  assert.match(hardened, /disabled aria-disabled="true"/);
  assert.match(hardened, /Commentaires communautaires indisponibles pour le moment/);
});

test('P6.49 preserves the separate main-deal comments runtime', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /postDealComment\(/);
  assert.match(hardened, /dealCommentsList_/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.49 is wired after P6.48 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const submissionCall = csp.indexOf('reconcileCommunitySubmissionTruth();');
  const commentsCall = csp.indexOf('reconcileCommunityCommentsTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(submissionCall >= 0 && commentsCall > submissionCall && readCall > commentsCall);
});
