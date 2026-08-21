const test = require('node:test');
const assert = require('node:assert/strict');
const feature = require('../../scripts/julvox-p5-conversation-resume-01');

function conversation(overrides = {}) {
  return Object.assign({
    id: 'conversation-1',
    status: 'active',
    messages: [{ role: 'user', content: 'Je cherche un aspirateur' }],
    context: {},
    clarification: {
      asked_fields: [],
      answered_fields: [],
      pending_question: null,
      readiness: 'collecting',
      recap_confirmed: false,
    },
    assistant: { greeted: true, turn_count: 1 },
    decision_id: null,
  }, overrides);
}

test('resume uses only persisted need, budget and constraints', () => {
  const summary = feature.buildResumeContext(conversation({
    context: {
      product_type: 'aspirateur robot',
      budget: 500,
      currency: 'EUR',
      usage: 'poils d’animaux',
      priorities: ['silencieux'],
      constraints: { quality_preference: 'sans compromis' },
    },
    clarification: {
      answered_fields: ['product_type', 'budget', 'usage'],
      pending_question: null,
      readiness: 'collecting',
      recap_confirmed: false,
    },
  }));
  assert.equal(summary.need, 'aspirateur robot');
  assert.equal(summary.budget, '500 €');
  assert.deepEqual(summary.constraints, [
    'usage : poils d’animaux',
    'priorités : silencieux',
    'qualité : sans compromis',
  ]);
  assert.deepEqual(summary.answeredFields, ['product_type', 'budget', 'usage']);
});

test('identified product remains the authoritative known need', () => {
  const summary = feature.buildResumeContext(conversation({
    context: { identified_product: { name: 'Roomba Combo X' } },
  }));
  assert.equal(summary.need, 'Roomba Combo X');
});

test('recap pending and confirmed come only from persisted clarification state', () => {
  assert.equal(feature.resumeStage(conversation({
    clarification: { readiness: 'awaiting_recap_confirmation', recap_confirmed: false },
  })).code, 'RECAP_PENDING');
  assert.equal(feature.resumeStage(conversation({
    clarification: { readiness: 'ready_for_product_search', recap_confirmed: true },
  })).code, 'RECAP_CONFIRMED');
});

test('existing decision remains a historical snapshot and is never recalculated', () => {
  const summary = feature.buildResumeContext(conversation({
    decision_id: 'decision-1',
    clarification: { readiness: 'ready_for_product_search', recap_confirmed: true },
  }));
  assert.equal(summary.stageCode, 'DECISION_AVAILABLE');
  assert.equal(summary.decisionAvailable, true);
  assert.match(feature.buildResumeCueText(summary), /instantané historique/);
  assert.equal('recommendation' in summary, false);
});

test('INSUFFICIENT_DATA in persisted history is not converted to a new verdict', () => {
  const source = conversation({
    decision_id: 'decision-insufficient',
    messages: [{ role: 'assistant', content: 'Décision Julvox : insufficient_data.' }],
  });
  const text = feature.buildResumeCueText(feature.buildResumeContext(source));
  assert.doesNotMatch(text, /FAVORABLE|ACHETER|ATTENDRE|ÉVITER/);
  assert.match(text, /instantané historique/);
});

test('missing context is not reconstructed from free-form message history', () => {
  const summary = feature.buildResumeContext(conversation({
    messages: [{ role: 'user', content: 'Je cherche une TV OLED à 1500 € pour PS5' }],
  }));
  assert.equal(summary.need, '');
  assert.equal(summary.budget, '');
  assert.deepEqual(summary.constraints, []);
  assert.match(
    feature.buildResumeCueText(summary),
    /besoin est encore en cours de précision|dernier échange enregistré/,
  );
});

test('answered question state remains server-owned and no question is created by resume', () => {
  const summary = feature.buildResumeContext(conversation({
    context: { budget: 900 },
    clarification: {
      asked_fields: ['budget'],
      answered_fields: ['budget'],
      pending_question: null,
      readiness: 'collecting',
      recap_confirmed: false,
    },
  }));
  assert.deepEqual(summary.answeredFields, ['budget']);
  assert.equal(summary.pendingQuestion, '');
});

test('closed conversation stage uses persisted conversation status', () => {
  assert.equal(feature.resumeStage(conversation({ status: 'closed' })).code, 'CONVERSATION_COMPLETED');
});

test('integration patches only the canonical active runtime despite inert duplicate anchors', () => {
  const html = `<script id="legacy-one" type="application/julvox-inert">${feature.SEND_ANCHOR}</script><script id="julvox-conversation-source-of-truth-02-runtime">${feature.RENDER_ANCHOR}${feature.SEND_ANCHOR}var input=document.getElementById('chatInput');</script><script id="legacy-two" type="application/julvox-inert">${feature.SEND_ANCHOR}</script><script id="julvox-p5-decision-history-01-runtime"></script><script id="julvox-p5-decision-timeline-01-runtime"></script><script id="julvox-p5-structured-explainability-01-runtime"></script>`;
  const once = feature.integrate(html);
  assert.match(once, /data-julvox-resume-context/);
  assert.ok(once.includes(feature.SEND_ANCHOR + 'clearResumeContext();'));
  assert.equal((once.match(new RegExp(feature.MARKER, 'g')) || []).length, 1);
  assert.equal(feature.integrate(once), once);
});

test('resume patch creates no network, persistence, long-term memory or decision authority', () => {
  for (const forbidden of [
    'fetch(',
    'localStorage',
    'DecisionEngine',
    'POST',
    'PATCH',
    'user preference',
    'long-term',
  ]) {
    assert.equal(feature.RUNTIME_PATCH.includes(forbidden), false, forbidden);
  }
});
