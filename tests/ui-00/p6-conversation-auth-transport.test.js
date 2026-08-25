'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const {
  MARKER,
  RUNTIME_ID,
  LEGACY_GET,
  LEGACY_POST,
  LEGACY_MIGRATE,
  hardenHtml,
} = require('../../scripts/reconcile-conversation-auth-transport');

const LEGACY_API_BASE = "  function apiBase(){var cfg=window.JULVOX_RUNTIME_CONFIG;return clean(cfg&&cfg.backend&&cfg.backend.apiBaseUrl,500).replace(/\\/+$/,'');}\n";
const LEGACY_RESUME = "  async function resume(id){var target=safeId(id);if(!target)return false;setActive(target);showAssistant();var local=cached(target);if(local){renderConversation(local);status('Conversation restaurée depuis le dernier état canonique disponible.');}try{var server=await getServerConversation(target);if(server.id!==target)throw new Error('conversation identity mismatch');cacheConversation(server);renderConversation(server);status('Conversation reprise.');}catch(_){if(!local){status('Cette conversation n’est pas disponible dans le backend Preview et aucune copie canonique locale n’est disponible.');return false;}status('Conversation affichée depuis le dernier état canonique local. Synchronisation Preview indisponible.');}window.setTimeout(function(){var input=document.getElementById('chatInput');if(input)input.focus();},60);return true;}";
const LEGACY_SEND = "  window.sendAIMessage=async function(preset,options){if(loading)return;clearResumeContext();var input=document.getElementById('chatInput');var message=clean(preset||(input?input.value:'')||'',1200);if(!message)return;if(input)input.value='';var settings=options&&typeof options==='object'?options:{};var scanner=settings.scanner_context&&typeof settings.scanner_context==='object'?settings.scanner_context:null;var source=clean(settings.source||(scanner?'scanner':'assistant'),40)||'assistant';var id=ensureConversation(settings.conversation_id);hideWelcome();append('user',message);loading=true;var button=document.getElementById('chatSendBtn');if(button)button.disabled=true;status('Julvox analyse ta demande…');try{var data=await postChat(id,message,source,scanner);append('assistant',data.response||'');cacheConversation(data.conversation);status('');}catch(_){queueOutbox({conversation_id:id,message:message,source:source,scanner_context:scanner||null,createdAt:new Date().toISOString()});status('Backend Preview momentanément indisponible. Le message reste localement en attente de synchronisation ; aucune réponse métier locale n’est inventée.');}finally{loading=false;if(button)button.disabled=false;if(input)input.focus();}};";

const fixture = [
  '<html><body>',
  `<script id="${RUNTIME_ID}">`,
  LEGACY_API_BASE,
  '  function validConversation(value){return Boolean(value);}',
  LEGACY_GET,
  LEGACY_RESUME,
  '  function queueOutbox(item){return item;}',
  LEGACY_POST,
  LEGACY_SEND,
  LEGACY_MIGRATE,
  '</script>',
  '<!-- P6_84_WISHLIST_DETAIL_OPEN_RUNTIME -->',
  '</body></html>',
].join('\n');

function canonicalRuntime(html) {
  const startTag = `<script id="${RUNTIME_ID}">`;
  const start = html.indexOf(startTag);
  const end = html.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start);
  return html.slice(start + startTag.length, end);
}

test('P6.85 routes all canonical conversation endpoints through JULVOX_API with the existing token', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  const runtime = canonicalRuntime(hardened);
  assert.equal(runtime.includes(MARKER), true);
  assert.equal((runtime.match(/client\.fetchResponse\(base\+'\/ai\//g) || []).length, 3);
  assert.ok((runtime.match(/token:accessToken/g) || []).length >= 3);
  assert.equal(runtime.includes("fetch(base+'/ai/chat'"), false);
  assert.equal(runtime.includes("fetch(base+'/ai/conversations/'+encodeURIComponent(id)"), false);
  assert.equal(runtime.includes("fetch(base+'/ai/conversations/import'"), false);
});

test('P6.85 preserves credential omission while using Bearer token authority', () => {
  const runtime = canonicalRuntime(hardenHtml(fixture));
  assert.ok((runtime.match(/credentials:'omit'/g) || []).length >= 3);
  assert.equal(runtime.includes("typeof currentUser!=='undefined'"), true);
  assert.equal(runtime.includes("typeof currentUser.token==='string'"), true);
  assert.equal(runtime.includes("window.JULVOX_API"), true);
});

test('P6.85 distinguishes missing or expired authentication from transport failure', () => {
  const runtime = canonicalRuntime(hardenHtml(fixture));
  assert.equal(runtime.includes("error.code='AUTH_REQUIRED'"), true);
  assert.equal(runtime.includes('response.status===401||response.status===403'), true);
  assert.equal(runtime.includes('Connexion nécessaire pour utiliser l’Assistant Julvox.'), true);
  assert.equal(runtime.includes('Session expirée. Reconnecte-toi pour continuer cette conversation.'), true);
  assert.equal(runtime.includes('Connecte-toi pour la synchroniser avec ton compte.'), true);
});

test('P6.85 does not queue a message merely because no authenticated session exists', () => {
  const runtime = canonicalRuntime(hardenHtml(fixture));
  const guard = runtime.indexOf("if(!conversationToken()){status('Connexion nécessaire pour utiliser l’Assistant Julvox.')");
  const append = runtime.indexOf("append('user',message)");
  const authCatch = runtime.indexOf('if(isConversationAuthError(error))');
  const outbox = runtime.indexOf('else{queueOutbox(', authCatch);
  assert.ok(guard >= 0 && append > guard);
  assert.ok(authCatch >= 0 && outbox > authCatch);
});

test('P6.85 skips legacy server import while unauthenticated without deleting the local projection', () => {
  const runtime = canonicalRuntime(hardenHtml(fixture));
  assert.equal(runtime.includes("if(!client||!accessToken){writeLegacyProjection();decorateCards();return;}"), true);
  assert.equal(runtime.includes('retry on a later authenticated boot'), true);
});

test('P6.85 hardened canonical runtime is syntactically valid JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(canonicalRuntime(hardenHtml(fixture))));
});

test('P6.85 is wired after P6.84 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p684Call = csp.indexOf('reconcileWishlistDetailOpenRuntime();');
  const p685Call = csp.indexOf('reconcileConversationAuthTransport();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p684Call >= 0 && p685Call > p684Call && readCall > p685Call);
});
