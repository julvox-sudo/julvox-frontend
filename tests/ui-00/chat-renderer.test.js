const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  MALFORMED_CHAT_RENDERER,
  SAFE_CHAT_RENDERER,
  repairChatRenderer,
} = require('../../scripts/ui00-transforms/repair-chat-renderer.js');

test('repairs generated chat markdown regexes and yields parseable code', () => {
  const source = `function appendChatBubble(text){ const escaped = String(text); ${MALFORMED_CHAT_RENDERER} return rendered; }`;
  const repaired = repairChatRenderer(source);
  assert.match(repaired, /replace\(\/\\n\/g/);
  assert.match(repaired, /replace\(\/\\\*\\\*/);
  assert.doesNotThrow(() => new vm.Script(repaired));
});

test('is idempotent only for the exact safe renderer', () => {
  assert.equal(repairChatRenderer(SAFE_CHAT_RENDERER), SAFE_CHAT_RENDERER);
  assert.throws(() => repairChatRenderer('function appendChatBubble(){}'), /malformed=0, safe=0/);
});
