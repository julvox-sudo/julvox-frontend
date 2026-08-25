'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_85_CONVERSATION_AUTH_TRANSPORT';
const RUNTIME_ID = 'julvox-conversation-source-of-truth-02-runtime';

const LEGACY_API_BASE = "  function apiBase(){var cfg=window.JULVOX_RUNTIME_CONFIG;return clean(cfg&&cfg.backend&&cfg.backend.apiBaseUrl,500).replace(/\\/+$/,'');}\n";
const SAFE_AUTH_HELPERS = `  function apiBase(){var cfg=window.JULVOX_RUNTIME_CONFIG;return clean(cfg&&cfg.backend&&cfg.backend.apiBaseUrl,500).replace(/\\/+$/,'');}\n  /* ${MARKER} */\n  function conversationToken(){try{return typeof currentUser!=='undefined'&&currentUser&&typeof currentUser.token==='string'?currentUser.token.trim():'';}catch(_){return'';}}\n  function conversationApiClient(){var client=window.JULVOX_API;return client&&typeof client.fetchResponse==='function'?client:null;}\n  function conversationAuthError(){var error=new Error('authentication required');error.code='AUTH_REQUIRED';return error;}\n  function requireConversationToken(){var value=conversationToken();if(!value)throw conversationAuthError();return value;}\n  function isConversationAuthError(error){return Boolean(error&&error.code==='AUTH_REQUIRED');}\n`;

const LEGACY_GET = "  async function getServerConversation(id){var base=apiBase();if(!base)throw new Error('preview backend unavailable');var response=await fetch(base+'/ai/conversations/'+encodeURIComponent(id),{credentials:'omit'});var data=null;try{data=await response.json();}catch(_){}if(!response.ok||!data||!validConversation(data.conversation))throw new Error('conversation unavailable');return data.conversation;}";
const SAFE_GET = "  async function getServerConversation(id){var base=apiBase();if(!base)throw new Error('preview backend unavailable');var client=conversationApiClient();if(!client)throw new Error('secure api client unavailable');var accessToken=requireConversationToken();var response=await client.fetchResponse(base+'/ai/conversations/'+encodeURIComponent(id),{method:'GET',token:accessToken,credentials:'omit'});if(response.status===401||response.status===403)throw conversationAuthError();var data=null;try{data=await response.json();}catch(_){}if(!response.ok||!data||!validConversation(data.conversation))throw new Error('conversation unavailable');return data.conversation;}";

const LEGACY_RESUME = "  async function resume(id){var target=safeId(id);if(!target)return false;setActive(target);showAssistant();var local=cached(target);if(local){renderConversation(local);status('Conversation restaurée depuis le dernier état canonique disponible.');}try{var server=await getServerConversation(target);if(server.id!==target)throw new Error('conversation identity mismatch');cacheConversation(server);renderConversation(server);status('Conversation reprise.');}catch(_){if(!local){status('Cette conversation n’est pas disponible dans le backend Preview et aucune copie canonique locale n’est disponible.');return false;}status('Conversation affichée depuis le dernier état canonique local. Synchronisation Preview indisponible.');}window.setTimeout(function(){var input=document.getElementById('chatInput');if(input)input.focus();},60);return true;}";
const SAFE_RESUME = "  async function resume(id){var target=safeId(id);if(!target)return false;setActive(target);showAssistant();var local=cached(target);if(local){renderConversation(local);status('Conversation restaurée depuis le dernier état canonique disponible.');}try{var server=await getServerConversation(target);if(server.id!==target)throw new Error('conversation identity mismatch');cacheConversation(server);renderConversation(server);status('Conversation reprise.');}catch(error){if(isConversationAuthError(error)){if(!local){status('Connexion nécessaire pour reprendre cette conversation depuis ton compte.');return false;}status('Conversation affichée depuis le dernier état canonique local. Connecte-toi pour la synchroniser avec ton compte.');}else{if(!local){status('Cette conversation n’est pas disponible dans le backend Preview et aucune copie canonique locale n’est disponible.');return false;}status('Conversation affichée depuis le dernier état canonique local. Synchronisation Preview indisponible.');}}window.setTimeout(function(){var input=document.getElementById('chatInput');if(input)input.focus();},60);return true;}";

const LEGACY_POST = "  async function postChat(id,message,source,scanner){var base=apiBase();if(!base)throw new Error('preview backend unavailable');var prefs=window.getJulvoxAssistantPreferences();var payload={message:message,conversation_id:id,source:source||'assistant',assistant_preferences:prefs};if(scanner)payload.scanner_context=scanner;var response=await fetch(base+'/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(payload)});var data=null;try{data=await response.json();}catch(_){}if(!response.ok||!data||!validConversation(data.conversation))throw new Error('assistant response unavailable');if(data.conversation.id!==id||data.conversation_id!==id)throw new Error('conversation identity mismatch');return data;}";
const SAFE_POST = "  async function postChat(id,message,source,scanner){var base=apiBase();if(!base)throw new Error('preview backend unavailable');var client=conversationApiClient();if(!client)throw new Error('secure api client unavailable');var accessToken=requireConversationToken();var prefs=window.getJulvoxAssistantPreferences();var payload={message:message,conversation_id:id,source:source||'assistant',assistant_preferences:prefs};if(scanner)payload.scanner_context=scanner;var response=await client.fetchResponse(base+'/ai/chat',{method:'POST',token:accessToken,headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(payload)});if(response.status===401||response.status===403)throw conversationAuthError();var data=null;try{data=await response.json();}catch(_){}if(!response.ok||!data||!validConversation(data.conversation))throw new Error('assistant response unavailable');if(data.conversation.id!==id||data.conversation_id!==id)throw new Error('conversation identity mismatch');return data;}";

const LEGACY_SEND = "  window.sendAIMessage=async function(preset,options){if(loading)return;clearResumeContext();var input=document.getElementById('chatInput');var message=clean(preset||(input?input.value:'')||'',1200);if(!message)return;if(input)input.value='';var settings=options&&typeof options==='object'?options:{};var scanner=settings.scanner_context&&typeof settings.scanner_context==='object'?settings.scanner_context:null;var source=clean(settings.source||(scanner?'scanner':'assistant'),40)||'assistant';var id=ensureConversation(settings.conversation_id);hideWelcome();append('user',message);loading=true;var button=document.getElementById('chatSendBtn');if(button)button.disabled=true;status('Julvox analyse ta demande…');try{var data=await postChat(id,message,source,scanner);append('assistant',data.response||'');cacheConversation(data.conversation);status('');}catch(_){queueOutbox({conversation_id:id,message:message,source:source,scanner_context:scanner||null,createdAt:new Date().toISOString()});status('Backend Preview momentanément indisponible. Le message reste localement en attente de synchronisation ; aucune réponse métier locale n’est inventée.');}finally{loading=false;if(button)button.disabled=false;if(input)input.focus();}};";
const SAFE_SEND = "  window.sendAIMessage=async function(preset,options){if(loading)return;clearResumeContext();var input=document.getElementById('chatInput');var message=clean(preset||(input?input.value:'')||'',1200);if(!message)return;if(!conversationToken()){status('Connexion nécessaire pour utiliser l’Assistant Julvox.');if(typeof window.openAuth==='function')window.openAuth('login');else if(typeof openAuth==='function')openAuth('login');return;}if(input)input.value='';var settings=options&&typeof options==='object'?options:{};var scanner=settings.scanner_context&&typeof settings.scanner_context==='object'?settings.scanner_context:null;var source=clean(settings.source||(scanner?'scanner':'assistant'),40)||'assistant';var id=ensureConversation(settings.conversation_id);hideWelcome();append('user',message);loading=true;var button=document.getElementById('chatSendBtn');if(button)button.disabled=true;status('Julvox analyse ta demande…');try{var data=await postChat(id,message,source,scanner);append('assistant',data.response||'');cacheConversation(data.conversation);status('');}catch(error){if(isConversationAuthError(error)){status('Session expirée. Reconnecte-toi pour continuer cette conversation.');if(typeof window.openAuth==='function')window.openAuth('login');else if(typeof openAuth==='function')openAuth('login');}else{queueOutbox({conversation_id:id,message:message,source:source,scanner_context:scanner||null,createdAt:new Date().toISOString()});status('Backend Preview momentanément indisponible. Le message reste localement en attente de synchronisation ; aucune réponse métier locale n’est inventée.');}}finally{loading=false;if(button)button.disabled=false;if(input)input.focus();}};";

const LEGACY_MIGRATE = "  async function migrateLegacy(){var base=apiBase();if(!base)return;var legacy=readLegacy();for(var i=0;i<legacy.length;i+=1){var item=legacy[i];if(!safeId(item.id)||cached(item.id))continue;try{var response=await fetch(base+'/ai/conversations/import',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(legacyPayload(item))});var data=null;try{data=await response.json();}catch(_){}if(response.ok&&data&&validConversation(data.conversation)&&data.conversation.id===item.id)cacheConversation(data.conversation);}catch(_){/* Leave the legacy entry untouched and retry on a later boot. */}}writeLegacyProjection();decorateCards();}";
const SAFE_MIGRATE = "  async function migrateLegacy(){var base=apiBase();if(!base)return;var client=conversationApiClient();var accessToken=conversationToken();if(!client||!accessToken){writeLegacyProjection();decorateCards();return;}var legacy=readLegacy();for(var i=0;i<legacy.length;i+=1){var item=legacy[i];if(!safeId(item.id)||cached(item.id))continue;try{var response=await client.fetchResponse(base+'/ai/conversations/import',{method:'POST',token:accessToken,headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(legacyPayload(item))});var data=null;try{data=await response.json();}catch(_){}if(response.ok&&data&&validConversation(data.conversation)&&data.conversation.id===item.id)cacheConversation(data.conversation);}catch(_){/* Leave the legacy entry untouched and retry on a later authenticated boot. */}}writeLegacyProjection();decorateCards();}";

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function replaceOnce(source, legacy, safe, label) {
  const count = countOf(source, legacy);
  if (count !== 1) throw new Error(`P6.85 ${label} legacy count must be 1, got ${count}`);
  return source.replace(legacy, safe);
}

function runtimeSlice(html) {
  const startTag = `<script id="${RUNTIME_ID}">`;
  const start = html.indexOf(startTag);
  if (start < 0) throw new Error('P6.85 canonical conversation runtime missing');
  const end = html.indexOf('</script>', start);
  if (end < 0) throw new Error('P6.85 canonical conversation runtime unterminated');
  return { start, end: end + '</script>'.length, text: html.slice(start, end + '</script>'.length) };
}

function assertHardened(html) {
  const runtime = runtimeSlice(html).text;
  if (countOf(runtime, MARKER) !== 1) throw new Error('P6.85 marker count must be 1 in canonical runtime');
  for (const required of [
    "function conversationToken()",
    "typeof currentUser!=='undefined'",
    "window.JULVOX_API",
    "token:accessToken",
    "client.fetchResponse(base+'/ai/chat'",
    "client.fetchResponse(base+'/ai/conversations/'",
    "client.fetchResponse(base+'/ai/conversations/import'",
    "response.status===401||response.status===403",
    "Connexion nécessaire pour utiliser l’Assistant Julvox.",
    "Session expirée. Reconnecte-toi",
    "Connecte-toi pour la synchroniser avec ton compte.",
    "credentials:'omit'",
    "P6_84_WISHLIST_DETAIL_OPEN_RUNTIME",
  ]) {
    if (!html.includes(required)) throw new Error(`P6.85 required boundary missing: ${required}`);
  }
  for (const forbidden of [
    "fetch(base+'/ai/chat'",
    "fetch(base+'/ai/conversations/'+encodeURIComponent(id)",
    "fetch(base+'/ai/conversations/import'",
  ]) {
    if (runtime.includes(forbidden)) throw new Error(`P6.85 unauthenticated canonical transport remains: ${forbidden}`);
  }
}

function hardenHtml(html) {
  const input = String(html);
  const initial = runtimeSlice(input);
  if (initial.text.includes(MARKER)) {
    assertHardened(input);
    return input;
  }

  let runtime = initial.text;
  runtime = replaceOnce(runtime, LEGACY_API_BASE, SAFE_AUTH_HELPERS, 'auth helper');
  runtime = replaceOnce(runtime, LEGACY_GET, SAFE_GET, 'conversation GET');
  runtime = replaceOnce(runtime, LEGACY_RESUME, SAFE_RESUME, 'resume state');
  runtime = replaceOnce(runtime, LEGACY_POST, SAFE_POST, 'chat POST');
  runtime = replaceOnce(runtime, LEGACY_SEND, SAFE_SEND, 'send state');
  runtime = replaceOnce(runtime, LEGACY_MIGRATE, SAFE_MIGRATE, 'legacy import');

  const output = input.slice(0, initial.start) + runtime + input.slice(initial.end);
  assertHardened(output);
  return output;
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  fs.writeFileSync(target, hardenHtml(source), 'utf8');
  console.log('P6_85_CONVERSATION_AUTH_TRANSPORT_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = {
  MARKER,
  RUNTIME_ID,
  LEGACY_GET,
  LEGACY_POST,
  LEGACY_MIGRATE,
  SAFE_AUTH_HELPERS,
  SAFE_GET,
  SAFE_POST,
  SAFE_MIGRATE,
  assertHardened,
  hardenHtml,
  hardenPublicArtifact,
};
