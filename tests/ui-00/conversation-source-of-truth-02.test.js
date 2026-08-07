const assert = require('node:assert/strict');
const test = require('node:test');

const {
  INERT_RUNTIME_IDS,
  MARKER,
  RUNTIME,
  integrate,
  verify,
} = require('../../scripts/julvox-conversation-source-of-truth-02.js');

function legacyArtifact() {
  return `<!doctype html><html><body>
<script id="julvox-assistant-human-presence-02-runtime">window.sendAIMessage=function(){};</script>
<script id="julvox-assistant-conversational-intelligence-01-runtime">function parseBudget(){}</script>
<script id="julvox-frontend-reconciliation-01-runtime">function extractContext(){}</script>
</body></html>`;
}

test('canonical integration neutralizes all active legacy conversation engines', () => {
  const output = integrate(legacyArtifact());
  assert.match(output, new RegExp(`id="${MARKER}"`));
  for (const id of INERT_RUNTIME_IDS) {
    assert.ok(output.includes(`<script id="${id}" type="application/julvox-inert">`));
    assert.equal(output.includes(`<script id="${id}">`), false);
  }
  assert.equal(verify(output), output);
});

test('canonical frontend runtime is a thin client, not another clarification engine', () => {
  for (const forbidden of [
    'function parseBudget',
    'function extractContext',
    'function localFallback',
    'budget_eur',
    'askedFields.push',
    'session_id:',
  ]) {
    assert.equal(RUNTIME.includes(forbidden), false, `thin runtime contains ${forbidden}`);
  }
  for (const required of [
    'conversation_id:id',
    'data.conversation.id!==id',
    "'/ai/conversations/import'",
    "'/ai/conversations/'",
    'conversationId:id',
    'aucune réponse métier locale n’est inventée',
  ]) {
    assert.ok(RUNTIME.includes(required), `thin runtime missing ${required}`);
  }
});

test('legacy localStorage is migration input and compatibility projection, never the canonical store', () => {
  assert.ok(RUNTIME.includes("var CACHE_KEY='julvox:conversations:v2'"));
  assert.ok(RUNTIME.includes("var LEGACY_KEY='julvox:decision-home:conversations:v1'"));
  assert.ok(RUNTIME.includes('migrateLegacy'));
  assert.ok(RUNTIME.includes('cacheConversation(data.conversation)'));
  assert.ok(RUNTIME.includes('if(response.ok&&data&&validConversation(data.conversation)&&data.conversation.id===item.id)'));
});

test('conversation cards stay resumable when the home runtime recreates their DOM', () => {
  assert.ok(RUNTIME.includes("closest('#pr01bConversationList .pr01b-conversation')"));
  assert.ok(RUNTIME.includes('conversationCardId(card)'));
  assert.ok(RUNTIME.includes('new MutationObserver(function(){decorateCards();})'));
  assert.ok(RUNTIME.includes("conversationCardsObserver.observe(list,{childList:true})"));
  assert.equal(RUNTIME.includes("closest('#pr01bConversationList [data-conversation-id]')"), false);
});

test('scanner and Smart Scan propagate the active canonical conversation id', () => {
  assert.ok(RUNTIME.includes("source:'scanner'"));
  assert.ok(RUNTIME.includes('conversationId:id'));
  assert.ok(RUNTIME.includes("route==='/smart-scan/confirm'"));
  assert.ok(RUNTIME.includes('next.scanCode=code'));
});

test('integration is deterministic and idempotent', () => {
  const once = integrate(legacyArtifact());
  const twice = integrate(once);
  assert.equal(twice, once);
  assert.equal((once.match(new RegExp(MARKER, 'g')) || []).length, 1);
});
