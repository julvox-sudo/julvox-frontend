const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ASSISTANT_RUNTIME,
  applyAssistantHumanPresence,
  fallbackSelfReference,
  localDecisionFallback,
  normalizeAssistantPreferences,
} = require('../../scripts/julvox-assistant-human-presence-02.js');

function legacyFixture() {
  return `<!doctype html>
<html lang="fr">
<head><title>Julvox</title></head>
<body>
<div id="julvoxDecisionHome">
  <script>
  function openConversation(safePrompt) {
    if (typeof window.openAIChat === 'function' && typeof window.sendAIMessage === 'function') {
      window.openAIChat();
      window.setTimeout(function(){ window.sendAIMessage(safePrompt); }, 80);
      return;
    }
  }
  </script>
</div>
<!-- ═══ ASSISTANT IA JULVOX ═══ -->
<div class="page" id="aiChatPage">
  <div class="page-head"><div class="page-title">🤖 Assistant IA</div></div>
  <div><div id="chatMessages">Je suis l'assistant DealScan. NovaDeal.</div></div>
</div>
<div aria-hidden="true">🤖</div>
</body>
</html>`;
}

test('Lot A replaces robot/chatbot identity with explicit Assistant Julvox disclosure', () => {
  const output = applyAssistantHumanPresence(legacyFixture());
  assert.match(output, /Assistant Julvox/);
  assert.match(output, /Intelligence artificielle/);
  assert.doesNotMatch(output, /🤖/u);
  const assistant = output.slice(output.indexOf('id="aiChatPage"'), output.indexOf('</body>'));
  assert.doesNotMatch(assistant, /Assistant\s+DealScan/i);
  assert.doesNotMatch(assistant, /NovaDeal/i);
  assert.doesNotMatch(assistant, /Assistant\s+IA/i);
});

test('Lot A exposes the five decision shortcuts and removes historical shortcuts', () => {
  const output = applyAssistantHumanPresence(legacyFixture());
  for (const label of [
    'Choisir un produit',
    'Comparer deux options',
    'Explorer des idées',
    'M’aider à décider',
    'Continuer une réflexion',
  ]) {
    assert.match(output, new RegExp(label));
  }
  for (const forbidden of ['Top deals', 'Fausses promos', 'Premium']) {
    assert.doesNotMatch(output, new RegExp(forbidden, 'i'));
  }
});

test('frontend assistant_preferences defaults and invalid-value fallback are deterministic', () => {
  assert.deepEqual(normalizeAssistantPreferences(), {
    identity: 'neutral',
    tone: 'warm',
    address_mode: 'tu',
  });
  assert.deepEqual(normalizeAssistantPreferences({
    identity: 'robot',
    tone: 'expert',
    address_mode: 'unknown',
  }), {
    identity: 'neutral',
    tone: 'expert',
    address_mode: 'tu',
  });
  assert.match(ASSISTANT_RUNTIME, /assistant_preferences: prefs/);
});

test('female, male and neutral fallbacks respect self-agreement rules', () => {
  const feminine = fallbackSelfReference({ identity: 'feminine', tone: 'warm', address_mode: 'tu' });
  assert.match(feminine, /ravie/);
  assert.match(feminine, /prête/);
  assert.doesNotMatch(feminine, /\bravi\b|\bprêt\b/);

  const feminineVous = fallbackSelfReference({ identity: 'feminine', tone: 'warm', address_mode: 'vous' });
  assert.match(feminineVous, /ravie de vous aider/);
  assert.match(feminineVous, /prête/);
  assert.doesNotMatch(feminineVous, /vousaider/);

  const masculine = fallbackSelfReference({ identity: 'masculine', tone: 'warm', address_mode: 'tu' });
  assert.match(masculine, /\bravi\b/);
  assert.match(masculine, /\bprêt\b/);
  assert.doesNotMatch(masculine, /ravie|prête/);

  const neutral = fallbackSelfReference({ identity: 'neutral', tone: 'warm', address_mode: 'tu' });
  assert.match(neutral, /Je peux t’aider/);
  assert.doesNotMatch(neutral, /ravi|ravie|prêt|prête|\(e\)|·/i);
});

test('local fallback is decision-oriented and has no historical assistant vocabulary', () => {
  const samples = [
    localDecisionFallback('Bonjour', { identity: 'neutral', tone: 'warm', address_mode: 'tu' }),
    localDecisionFallback('Je compare deux canapés', { identity: 'neutral', tone: 'warm', address_mode: 'tu' }),
    localDecisionFallback('Mon budget est de 900 euros', { identity: 'neutral', tone: 'warm', address_mode: 'tu' }),
  ];
  for (const response of samples) {
    assert.doesNotMatch(response, /DealScan|NovaDeal|fausse promo|top deal|Premium/i);
  }
});

test('home handoff becomes atomic: first message and exactly one Assistant request', () => {
  const output = applyAssistantHumanPresence(legacyFixture());
  assert.match(output, /window\.openAIChat\(\{ initialPrompt: safePrompt \}\);/);
  assert.doesNotMatch(output, /setTimeout\(function\(\)\{\s*window\.sendAIMessage\(safePrompt\)/);
  assert.equal((ASSISTANT_RUNTIME.match(/window\.sendAIMessage\(initialPrompt\)/g) || []).length, 1);
  assert.equal((ASSISTANT_RUNTIME.match(/fetch\(apiBase \+ '\/ai\/chat'/g) || []).length, 1);
});

test('Lot A integration is idempotent', () => {
  const once = applyAssistantHumanPresence(legacyFixture());
  assert.equal(applyAssistantHumanPresence(once), once);
});
