const fs = require('fs');
const path = require('path');

const MARKER = 'julvox-conversation-source-of-truth-02-runtime';
const INERT_RUNTIME_IDS = Object.freeze([
  'julvox-assistant-human-presence-02-runtime',
  'julvox-assistant-conversational-intelligence-01-runtime',
  'julvox-frontend-reconciliation-01-runtime',
]);

const RUNTIME = String.raw`
<script id="${MARKER}">
(function julvoxConversationSourceOfTruth02(){
  'use strict';
  var SCHEMA_VERSION='julvox-conversation-v1';
  var CACHE_KEY='julvox:conversations:v2';
  var LEGACY_KEY='julvox:decision-home:conversations:v1';
  var ACTIVE_KEY='julvox:assistant:active-conversation:v2';
  var OUTBOX_KEY='julvox:conversation-outbox:v1';
  var MAX_CACHE=20;
  var MAX_OUTBOX=50;
  var loading=false;
  var smartScanWrapped=false;
  var DEFAULT_PREFERENCES={identity:'neutral',tone:'warm',address_mode:'tu'};
  var currentPreferences=normalizePreferences(window.JULVOX_ASSISTANT_PREFERENCES||DEFAULT_PREFERENCES);

  function clean(value,limit){return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,limit||1200);}
  function safeId(value){var id=clean(value,128);return /^[A-Za-z0-9._:-]{1,128}$/.test(id)?id:'';}
  function readJson(key,fallback){try{var value=JSON.parse(localStorage.getItem(key)||'null');return value==null?fallback:value;}catch(_){return fallback;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
  function normalizePreferences(value){var source=value&&typeof value==='object'?value:{};return{identity:['neutral','feminine','masculine'].indexOf(source.identity)>=0?source.identity:'neutral',tone:['warm','concise','detailed','expert'].indexOf(source.tone)>=0?source.tone:'warm',address_mode:['tu','vous'].indexOf(source.address_mode)>=0?source.address_mode:'tu'};}
  function clonePreferences(value){return{identity:value.identity,tone:value.tone,address_mode:value.address_mode};}
  function apiBase(){var cfg=window.JULVOX_RUNTIME_CONFIG;return clean(cfg&&cfg.backend&&cfg.backend.apiBaseUrl,500).replace(/\/+$/,'');}
  function messages(){return document.getElementById('chatMessages');}
  function status(text){var node=document.getElementById('julvoxAssistantStatus');if(node)node.textContent=text||'';}
  function showAssistant(){if(typeof window.openPage==='function')window.openPage('aiChatPage');else if(typeof openPage==='function')openPage('aiChatPage');}
  function hideWelcome(){var welcome=document.getElementById('julvoxAssistantWelcome');if(welcome)welcome.hidden=true;var prompts=document.getElementById('quickPrompts');if(prompts)prompts.hidden=true;}
  function resetDom(){var container=messages();if(container)container.innerHTML='';var welcome=document.getElementById('julvoxAssistantWelcome');if(welcome)welcome.hidden=false;var prompts=document.getElementById('quickPrompts');if(prompts)prompts.hidden=false;status('');}
  function append(role,text){var container=messages();if(!container)return;var row=document.createElement('div');row.className='julvox-assistant-message '+(role==='user'?'user':'assistant');var bubble=document.createElement('div');bubble.className='julvox-assistant-bubble';bubble.textContent=String(text==null?'':text);row.appendChild(bubble);container.appendChild(row);container.scrollTop=container.scrollHeight;}

  window.JULVOX_ASSISTANT_DEFAULT_PREFERENCES=Object.freeze(clonePreferences(DEFAULT_PREFERENCES));
  window.JULVOX_ASSISTANT_PREFERENCES=clonePreferences(currentPreferences);
  window.getJulvoxAssistantPreferences=function(){return clonePreferences(currentPreferences);};
  window.setJulvoxAssistantPreferences=function(value){currentPreferences=normalizePreferences(value);window.JULVOX_ASSISTANT_PREFERENCES=clonePreferences(currentPreferences);return clonePreferences(currentPreferences);};

  function validConversation(value){return Boolean(value&&typeof value==='object'&&safeId(value.id)&&value.schema_version===SCHEMA_VERSION&&Array.isArray(value.messages)&&value.context&&typeof value.context==='object'&&value.clarification&&typeof value.clarification==='object'&&value.assistant&&typeof value.assistant==='object');}
  function readCache(){var rows=readJson(CACHE_KEY,[]);if(!Array.isArray(rows))return[];return rows.filter(validConversation).sort(function(a,b){return String(b.updated_at||'').localeCompare(String(a.updated_at||''));}).slice(0,MAX_CACHE);}
  function cached(id){var target=safeId(id);return readCache().find(function(row){return row.id===target;})||null;}
  function cacheConversation(value){if(!validConversation(value))throw new Error('invalid canonical conversation payload');var rows=readCache().filter(function(row){return row.id!==value.id;});rows.unshift(value);writeJson(CACHE_KEY,rows.slice(0,MAX_CACHE));writeLegacyProjection();decorateCards();document.dispatchEvent(new CustomEvent('julvox:conversations-updated',{detail:{conversationId:value.id}}));return value;}

  function firstUserMessage(conversation){var row=(conversation.messages||[]).find(function(item){return item&&item.role==='user'&&clean(item.content,800);});return row?clean(row.content,800):'Conversation Julvox';}
  function projectLegacy(conversation){var clarification=conversation.clarification||{};var readiness=clean(clarification.readiness,40);var clarified=readiness==='product_identified'?'Produit confirmé et contexte conversationnel conservés.':readiness==='ready_for_product_search'?'Contexte nécessaire à la recherche conservé.':'Contexte de la conversation conservé.';return{id:conversation.id,need:firstUserMessage(conversation),clarified:clarified,next:'Continuer exactement depuis ce point.',updatedAt:clean(conversation.updated_at,80)||new Date().toISOString(),history:(conversation.messages||[]).map(function(item){return{role:item.role,content:item.content};}),context:conversation.context||{},askedFields:Array.isArray(clarification.asked_fields)?clarification.asked_fields.slice():[],greeted:Boolean(conversation.assistant&&conversation.assistant.greeted)};}
  function readLegacy(){var rows=readJson(LEGACY_KEY,[]);return Array.isArray(rows)?rows.filter(function(row){return row&&safeId(row.id);}):[];}
  function writeLegacyProjection(){var canonical=readCache();var ids={};var projected=canonical.map(function(row){ids[row.id]=true;return projectLegacy(row);});readLegacy().forEach(function(row){if(!ids[row.id])projected.push(row);});writeJson(LEGACY_KEY,projected.slice(0,MAX_CACHE));}
  function legacyPayload(row){return{id:safeId(row&&row.id),need:clean(row&&row.need,800)||null,clarified:clean(row&&row.clarified,500)||null,next:clean(row&&row.next,500)||null,updatedAt:clean(row&&row.updatedAt,80)||null,history:Array.isArray(row&&row.history)?row.history.slice(-500):[],context:row&&row.context&&typeof row.context==='object'?row.context:{},askedFields:Array.isArray(row&&row.askedFields)?row.askedFields.slice(0,100):[],greeted:Boolean(row&&row.greeted)};}

  function setActive(id){var value=safeId(id);try{if(value)localStorage.setItem(ACTIVE_KEY,value);else localStorage.removeItem(ACTIVE_KEY);}catch(_){}return value;}
  function getActive(){try{return safeId(localStorage.getItem(ACTIVE_KEY)||'');}catch(_){return'';}}
  function newId(){try{return'conversation-'+crypto.randomUUID();}catch(_){return'conversation-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}}
  function adoptHomeLegacy(initialPrompt){var prompt=clean(initialPrompt,800);if(!prompt)return'';var row=readLegacy().find(function(item){return clean(item.need,800)===prompt&&!cached(item.id);});return row?safeId(row.id):'';}
  function ensureConversation(preferred){var wanted=safeId(preferred)||getActive();if(wanted){setActive(wanted);return wanted;}var created=newId();setActive(created);return created;}

  function renderConversation(conversation){resetDom();var history=conversation&&Array.isArray(conversation.messages)?conversation.messages:[];if(history.length)hideWelcome();history.forEach(function(item){if(item&&(item.role==='user'||item.role==='assistant'))append(item.role,item.content);});}
  async function getServerConversation(id){var base=apiBase();if(!base)throw new Error('preview backend unavailable');var response=await fetch(base+'/ai/conversations/'+encodeURIComponent(id),{credentials:'omit'});var data=null;try{data=await response.json();}catch(_){}if(!response.ok||!data||!validConversation(data.conversation))throw new Error('conversation unavailable');return data.conversation;}
  async function resume(id){var target=safeId(id);if(!target)return false;setActive(target);showAssistant();var local=cached(target);if(local){renderConversation(local);status('Conversation restaurée depuis le dernier état canonique disponible.');}try{var server=await getServerConversation(target);if(server.id!==target)throw new Error('conversation identity mismatch');cacheConversation(server);renderConversation(server);status('Conversation reprise.');}catch(_){if(!local){status('Cette conversation n’est pas disponible dans le backend Preview et aucune copie canonique locale n’est disponible.');return false;}status('Conversation affichée depuis le dernier état canonique local. Synchronisation Preview indisponible.');}window.setTimeout(function(){var input=document.getElementById('chatInput');if(input)input.focus();},60);return true;}

  function queueOutbox(item){var rows=readJson(OUTBOX_KEY,[]);if(!Array.isArray(rows))rows=[];rows.push(item);writeJson(OUTBOX_KEY,rows.slice(-MAX_OUTBOX));}
  async function postChat(id,message,source,scanner){var base=apiBase();if(!base)throw new Error('preview backend unavailable');var prefs=window.getJulvoxAssistantPreferences();var payload={message:message,conversation_id:id,source:source||'assistant',assistant_preferences:prefs};if(scanner)payload.scanner_context=scanner;var response=await fetch(base+'/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(payload)});var data=null;try{data=await response.json();}catch(_){}if(!response.ok||!data||!validConversation(data.conversation))throw new Error('assistant response unavailable');if(data.conversation.id!==id||data.conversation_id!==id)throw new Error('conversation identity mismatch');return data;}

  window.getJulvoxAssistantConversationId=function(){return getActive()||null;};
  window.ensureJulvoxAssistantConversation=function(){return ensureConversation();};
  window.startNewJulvoxAssistantConversation=function(){var id=newId();setActive(id);resetDom();return id;};
  window.resumeJulvoxAssistantConversation=resume;
  window.openAIChat=function(options){var settings=options&&typeof options==='object'?options:{};showAssistant();if(settings.conversation_id){resume(settings.conversation_id);return;}var initial=clean(settings.initialPrompt||'',1200);if(initial){var adopted=adoptHomeLegacy(initial);var id=adopted||newId();setActive(id);resetDom();window.sendAIMessage(initial,{source:'home'});return;}window.setTimeout(function(){var input=document.getElementById('chatInput');if(input)input.focus();},80);};
  window.sendAIMessage=async function(preset,options){if(loading)return;var input=document.getElementById('chatInput');var message=clean(preset||(input?input.value:'')||'',1200);if(!message)return;if(input)input.value='';var settings=options&&typeof options==='object'?options:{};var scanner=settings.scanner_context&&typeof settings.scanner_context==='object'?settings.scanner_context:null;var source=clean(settings.source||(scanner?'scanner':'assistant'),40)||'assistant';var id=ensureConversation(settings.conversation_id);hideWelcome();append('user',message);loading=true;var button=document.getElementById('chatSendBtn');if(button)button.disabled=true;status('Julvox analyse ta demande…');try{var data=await postChat(id,message,source,scanner);append('assistant',data.response||'');cacheConversation(data.conversation);status('');}catch(_){queueOutbox({conversation_id:id,message:message,source:source,scanner_context:scanner||null,createdAt:new Date().toISOString()});status('Backend Preview momentanément indisponible. Le message reste localement en attente de synchronisation ; aucune réponse métier locale n’est inventée.');}finally{loading=false;if(button)button.disabled=false;if(input)input.focus();}};
  window.sendJulvoxScannerMessage=function(scannerContext){var scanner=scannerContext&&typeof scannerContext==='object'?scannerContext:{};var code=clean(scanner.code||'',32);if(!/^\d{8,14}$/.test(code))return false;var id=ensureConversation();window.openAIChat({conversation_id:id});window.sendAIMessage(code,{conversation_id:id,source:'scanner',scanner_context:scanner});return true;};

  async function migrateLegacy(){var base=apiBase();if(!base)return;var legacy=readLegacy();for(var i=0;i<legacy.length;i+=1){var item=legacy[i];if(!safeId(item.id)||cached(item.id))continue;try{var response=await fetch(base+'/ai/conversations/import',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(legacyPayload(item))});var data=null;try{data=await response.json();}catch(_){}if(response.ok&&data&&validConversation(data.conversation)&&data.conversation.id===item.id)cacheConversation(data.conversation);}catch(_){/* Leave the legacy entry untouched and retry on a later boot. */}}writeLegacyProjection();decorateCards();}

  function decorateCards(){var rows=readLegacy();var cards=document.querySelectorAll('#pr01bConversationList .pr01b-conversation');cards.forEach(function(card,index){var row=rows[index];if(!row||!safeId(row.id))return;card.setAttribute('data-conversation-id',row.id);card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('aria-label','Reprendre la conversation '+clean(row.need,80));});}
  function selectedSmartScanMode(){var tab=document.querySelector('#julvoxSmartScan .jvss-tab[aria-selected="true"]');if(!tab)return null;var id=clean(tab.id,80);return id.indexOf('jvssTab-')===0?id.slice('jvssTab-'.length):null;}
  function wrapSmartScan(){if(smartScanWrapped)return;var backend=window.JulvoxSmartScanBackend;if(!backend||typeof backend.post!=='function')return;var original=backend.post.bind(backend);backend.post=async function(route,payload){var id=ensureConversation();var next=Object.assign({},payload||{},{conversationId:id});if(route==='/smart-scan/confirm'){var mode=selectedSmartScanMode();if(mode)next.scanMode=mode;if(mode==='barcode'){var input=document.getElementById('jvssBarcode');var code=clean(input&&input.value,32).replace(/\s/g,'');if(code)next.scanCode=code;}}return original(route,next);};backend.__julvoxConversationCanonical=true;smartScanWrapped=true;}

  window.JulvoxConversationClient={
    schemaVersion:SCHEMA_VERSION,
    getActiveId:function(){return getActive()||null;},
    ensure:function(){return ensureConversation();},
    listCached:function(){return readCache().slice();},
    resume:resume,
    migrateLegacy:migrateLegacy
  };

  document.addEventListener('click',function(event){var card=event.target.closest&&event.target.closest('#pr01bConversationList [data-conversation-id]');if(card){event.preventDefault();resume(card.getAttribute('data-conversation-id'));return;}var preset=event.target.closest&&event.target.closest('[data-assistant-preset]');if(preset){event.preventDefault();window.sendAIMessage(preset.getAttribute('data-assistant-preset')||'');}},true);
  document.addEventListener('keydown',function(event){var card=event.target.closest&&event.target.closest('#pr01bConversationList [data-conversation-id]');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();resume(card.getAttribute('data-conversation-id'));return;}if(event.target&&event.target.id==='chatInput'&&event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.sendAIMessage();}},true);

  function boot(){decorateCards();wrapSmartScan();migrateLegacy();window.setTimeout(wrapSmartScan,350);window.setTimeout(decorateCards,350);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>`;

function inertRuntime(html, id) {
  const active = `<script id="${id}">`;
  const inert = `<script id="${id}" type="application/julvox-inert">`;
  if (html.includes(inert)) return html;
  if (!html.includes(active)) throw new Error(`canonical conversation integration missing runtime to neutralize: ${id}`);
  return html.replace(active, inert);
}

function verify(input) {
  const html = String(input);
  if (!html.includes(`id="${MARKER}"`)) throw new Error('canonical conversation runtime is missing');
  for (const id of INERT_RUNTIME_IDS) {
    if (!html.includes(`<script id="${id}" type="application/julvox-inert">`)) {
      throw new Error(`legacy conversation runtime remains executable: ${id}`);
    }
  }
  const start = html.indexOf(`<script id="${MARKER}">`);
  const end = html.indexOf('</script>', start);
  const runtime = start >= 0 && end > start ? html.slice(start, end) : '';
  for (const forbidden of ['parseBudget(', 'extractContext(', 'localFallback(', 'budget_eur', 'askedFields.push(', 'session_id:']) {
    if (runtime.includes(forbidden)) throw new Error(`thin client contains forbidden conversational ownership: ${forbidden}`);
  }
  for (const required of [
    "conversation_id:id",
    "'/ai/conversations/import'",
    "'/ai/conversations/'",
    "conversationId:id",
    "aucune réponse métier locale n’est inventée",
    "julvox:decision-home:conversations:v1",
    "julvox:conversations:v2",
  ]) {
    if (!runtime.includes(required)) throw new Error(`canonical conversation runtime missing contract: ${required}`);
  }
  return html;
}

function integrate(input) {
  let html = String(input);
  if (html.includes(`id="${MARKER}"`)) return verify(html);
  for (const id of INERT_RUNTIME_IDS) html = inertRuntime(html, id);
  const closing = html.lastIndexOf('</body>');
  if (closing < 0) throw new Error('canonical conversation integration missing </body>');
  html = html.slice(0, closing) + RUNTIME + '\n' + html.slice(closing);
  return verify(html);
}

function run() {
  const file = path.join(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(file)) throw new Error('dist/index.html is missing');
  fs.writeFileSync(file, integrate(fs.readFileSync(file, 'utf8')), 'utf8');
  console.log('JULVOX-ARCHITECTURE-REFORM-02 canonical conversation runtime integrated.');
}

if (require.main === module) run();
module.exports = { INERT_RUNTIME_IDS, MARKER, RUNTIME, integrate, verify };
