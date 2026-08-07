const MARKER = 'julvox-frontend-reconciliation-01-runtime';

const RECONCILIATION_CSS = String.raw`
<style id="julvox-frontend-reconciliation-01-styles">
html,body,#julvoxDecisionHome{background:#FCF9F4!important;min-height:100%;}
@supports (min-height:100dvh){#julvoxDecisionHome,.pr01b-shell{min-height:100dvh!important;}}
.pr01b-conversation[data-conversation-id]{cursor:pointer;touch-action:manipulation;}
.pr01b-conversation[data-conversation-id]:focus-visible{outline:3px solid rgba(14,167,161,.34);outline-offset:3px;}
@media (max-width:760px){
  body{padding-bottom:calc(68px + env(safe-area-inset-bottom))!important;}
  #julvoxDecisionHome .pr01b-mobile-nav{box-sizing:border-box!important;height:calc(68px + env(safe-area-inset-bottom))!important;min-height:calc(68px + env(safe-area-inset-bottom))!important;padding-bottom:env(safe-area-inset-bottom)!important;background:#fffdf9!important;}
  #julvoxDecisionHome .pr01b-main{padding-bottom:calc(24px + env(safe-area-inset-bottom))!important;}
  #aiChatPage{min-height:100dvh;}
  #chatMessages{overscroll-behavior:contain;}
}
@media (orientation:landscape) and (max-height:540px) and (max-width:960px){
  body{padding-bottom:calc(56px + env(safe-area-inset-bottom))!important;}
  #julvoxDecisionHome .pr01b-mobile-nav{height:calc(56px + env(safe-area-inset-bottom))!important;min-height:calc(56px + env(safe-area-inset-bottom))!important;padding-bottom:env(safe-area-inset-bottom)!important;}
}
</style>`;

const RECONCILIATION_RUNTIME = String.raw`
<script id="${MARKER}">
(function julvoxFrontendReconciliation01(){
  'use strict';
  var STORAGE_KEY='julvox:decision-home:conversations:v1';
  var ACTIVE_KEY='julvox:assistant:active-conversation:v1';
  var MAX_CONVERSATIONS=2;
  var loading=false;
  var activeId='';
  var state={turnCount:0,greeted:false,context:{},askedFields:[]};
  var FORBIDDEN=/(?:DealScan|NovaDeal|Top deals|bonnes affaires|meilleures périodes d'achat|prix vraiment bon)/i;
  var NO_CATALOG='J’ai suffisamment d’informations pour chercher des modèles adaptés, mais cette Preview n’a pas encore accès aux données produit nécessaires. Je préfère ne pas inventer de références.';

  function clean(value,limit){return String(value==null?'':value).replace(/\\s+/g,' ').trim().slice(0,limit||1200);}
  function escapeHtml(value){return clean(value,1600).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function readItems(){try{var v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v.filter(function(x){return x&&x.id&&x.need;}).slice(0,MAX_CONVERSATIONS):[];}catch(_){return[];}}
  function writeItems(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_CONVERSATIONS)));}catch(_){}}
  function setActive(id){activeId=clean(id,80);try{if(activeId)sessionStorage.setItem(ACTIVE_KEY,activeId);else sessionStorage.removeItem(ACTIVE_KEY);}catch(_){}}
  function getActive(){if(activeId)return activeId;try{return clean(sessionStorage.getItem(ACTIVE_KEY)||'',80);}catch(_){return'';}}
  function findItem(id){return readItems().find(function(x){return x.id===id;})||null;}
  function normalizeRecord(item){var x=item||{};return {id:clean(x.id,80),need:clean(x.need,800),clarified:clean(x.clarified,240)||'Contexte de la conversation conservé.',next:clean(x.next,240)||'Poursuivre la décision avec Julvox.',updatedAt:clean(x.updatedAt,40)||new Date().toISOString(),history:Array.isArray(x.history)?x.history.slice(-40):[],context:x.context&&typeof x.context==='object'?x.context:{},askedFields:Array.isArray(x.askedFields)?x.askedFields.slice(0,12):[],greeted:x.greeted===true};}
  function saveRecord(record){var cleanRecord=normalizeRecord(record);var items=readItems().filter(function(x){return x.id!==cleanRecord.id;});writeItems([cleanRecord].concat(items));decorateCards();return cleanRecord;}
  function newId(){return 'decision-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
  function createStateFrom(record){return {turnCount:Array.isArray(record.history)?record.history.filter(function(x){return x&&x.role==='user';}).length:0,greeted:record.greeted===true,context:record.context&&typeof record.context==='object'?record.context:{},askedFields:Array.isArray(record.askedFields)?record.askedFields.slice():[]};}
  function messages(){return document.getElementById('chatMessages');}
  function status(text){var node=document.getElementById('julvoxAssistantStatus');if(node)node.textContent=text||'';}
  function append(role,text){var container=messages();if(!container)return;var row=document.createElement('div');row.className='julvox-assistant-message '+(role==='user'?'user':'assistant');var bubble=document.createElement('div');bubble.className='julvox-assistant-bubble';bubble.textContent=String(text==null?'':text);row.appendChild(bubble);container.appendChild(row);container.scrollTop=container.scrollHeight;}
  function resetDom(){var c=messages();if(c)c.innerHTML='';var welcome=document.getElementById('julvoxAssistantWelcome');if(welcome)welcome.hidden=false;var prompts=document.getElementById('quickPrompts');if(prompts)prompts.hidden=false;}
  function hideWelcome(){var welcome=document.getElementById('julvoxAssistantWelcome');if(welcome)welcome.hidden=true;var prompts=document.getElementById('quickPrompts');if(prompts)prompts.hidden=true;}
  function showAssistant(){if(typeof window.openPage==='function')window.openPage('aiChatPage');else if(typeof openPage==='function')openPage('aiChatPage');}
  function renderHistory(record){resetDom();var history=Array.isArray(record.history)?record.history:[];if(history.length)hideWelcome();history.forEach(function(turn){if(turn&&(turn.role==='user'||turn.role==='assistant'))append(turn.role,turn.content);});}
  function parseBudget(text){var m=String(text||'').match(/(^|\\D)(\\d{1,3}(?:[ .\\u202f]\\d{3})+|\\d{2,6})(?:[,.]\\d{1,2})?\\s*(?:€|euros?\\b)/i);if(!m)return null;var n=parseInt(m[2].replace(/\\D/g,''),10);return Number.isFinite(n)&&n>0&&n<=1000000?n:null;}
  function extract(message,current){var c=Object.assign({},current||{});var text=clean(message,1200);var low=text.toLowerCase();var budget=parseBudget(text);if(budget!==null)c.budget_eur=budget;if(/casque audio|\\bcasque\\b|écouteurs|ecouteurs/i.test(text))c.product_category='casque audio';else if(/\\b(tv|télé|tele|télévision|television)\\b/i.test(text))c.product_category='TV';if(/\\b(?:pour )?mon fils\\b/i.test(text))c.recipient='fils';else if(/\\b(?:pour )?ma fille\\b/i.test(text))c.recipient='fille';else if(/\\b(?:pour )?mon enfant\\b/i.test(text))c.recipient='enfant';if(/sport|running|courir|course à pied|course a pied|entraînement|entrainement|salle de sport/i.test(text))c.usage='sport';else if(/\\bfilms?\\b|cinéma|cinema/i.test(text))c.usage='films';if(/intra-auriculaire|intra auriculaire|\\bintra\\b|écouteurs|ecouteurs/i.test(text))c.format='intra-auriculaire';else if(/autour des oreilles|circum-aural|circumaural|over-ear|over ear/i.test(text))c.format='autour des oreilles';var age=text.match(/(^|\\D)(\\d{1,2})\\s*ans\\b/i);if(age)c.recipient_age=parseInt(age[2],10);if(/^\\d{8,14}$/.test(text))c.barcode=text;if(low.indexOf('sans compromis')>=0)c.quality_preference='sans compromis';return c;}
  function sufficient(c){return Boolean(c&&c.product_category&&c.usage&&c.recipient&&c.budget_eur!==undefined);}
  function localFallback(message,scanner){var c=state.context||{};if(scanner){var code=/^\\d{8,14}$/.test(String(scanner.code||''))?String(scanner.code):'ce code';var p=scanner.product&&typeof scanner.product==='object'?scanner.product:{};if(scanner.verified!==true||!clean(p.name,160))return 'Je regarde si je trouve une correspondance pour le code '+code+'.\\n\\nJe n’ai pas encore trouvé de correspondance suffisamment fiable. Je préfère ne pas inventer le produit.';var lines=[p.brand,p.name,p.model||p.variant].filter(Boolean).map(function(v){return'- '+clean(v,180);});if(p.current_price!==undefined)lines.push('- Prix disponible : '+String(p.current_price));if(p.provenance)lines.push('- Source : '+clean(p.provenance,180));if(p.freshness)lines.push('- Fraîcheur : '+clean(p.freshness,120));var verdict=['ACHETER MAINTENANT','ATTENDRE','COMPARER DAVANTAGE','NE PAS ACHETER','INFORMATIONS INSUFFISANTES'].indexOf(p.verdict)>=0?p.verdict:'INFORMATIONS INSUFFISANTES';return 'J’ai trouvé :\\n'+lines.join('\\n')+'\\n\\nVerdict : '+verdict;}
    if(sufficient(c)){if(c.product_category==='casque audio'&&c.usage==='sport'&&!c.format&&state.askedFields.indexOf('format')<0){state.askedFields.push('format');return c.recipient==='fils'?'Ton fils préfère-t-il des écouteurs intra-auriculaires ou un casque autour des oreilles ?':c.recipient==='fille'?'Ta fille préfère-t-elle des écouteurs intra-auriculaires ou un casque autour des oreilles ?':'Tu préfères des écouteurs intra-auriculaires ou un casque autour des oreilles ?';}return NO_CATALOG;}
    if(c.product_category==='casque audio'&&!c.usage&&state.askedFields.indexOf('usage')<0){state.askedFields.push('usage');return 'Quel sera l’usage principal ?';}
    return 'Je peux partir de ce que tu as déjà indiqué. Donne-moi le produit ou la décision que tu veux éclairer, et je ne te ferai pas répéter les informations connues.';}
  function apiBase(){var cfg=window.JULVOX_RUNTIME_CONFIG;var base=cfg&&cfg.backend&&cfg.backend.apiBaseUrl?String(cfg.backend.apiBaseUrl):'';return base.replace(/\\/+$/,'');}
  function ensureRecord(message){var id=getActive();var record=id&&findItem(id);if(record){record=normalizeRecord(record);setActive(record.id);return record;}var items=readItems();var candidate=items.find(function(x){return clean(x.need,800)===clean(message,800)&&(!Array.isArray(x.history)||x.history.length===0);});if(candidate){record=normalizeRecord(candidate);}else{record=normalizeRecord({id:newId(),need:clean(message,800),clarified:'Ton besoin initial est enregistré.',next:'Poursuivre la décision avec Julvox.',updatedAt:new Date().toISOString(),history:[],context:{},askedFields:[],greeted:false});}setActive(record.id);state=createStateFrom(record);return saveRecord(record);}
  function commitState(record){record.context=state.context;record.askedFields=state.askedFields;record.greeted=state.greeted;record.updatedAt=new Date().toISOString();record.clarified='Contexte et historique restaurables.';record.next='Continuer exactement depuis ce point.';return saveRecord(record);}
  function decorateCards(){var items=readItems();var cards=document.querySelectorAll('#pr01bConversationList .pr01b-conversation');cards.forEach(function(card,index){var item=items[index];if(!item)return;card.setAttribute('data-conversation-id',item.id);card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('aria-label','Reprendre la conversation '+clean(item.need,80));});}
  function resume(id){var record=findItem(clean(id,80));if(!record)return false;record=normalizeRecord(record);setActive(record.id);state=createStateFrom(record);showAssistant();renderHistory(record);status('Conversation reprise.');window.setTimeout(function(){var input=document.getElementById('chatInput');if(input)input.focus();},80);return true;}

  window.getJulvoxAssistantConversationId=function(){return getActive()||null;};
  window.ensureJulvoxAssistantConversation=function(){var id=getActive();if(id&&findItem(id))return id;setActive(newId());state={turnCount:0,greeted:false,context:{},askedFields:[]};return getActive();};
  window.startNewJulvoxAssistantConversation=function(){setActive(newId());state={turnCount:0,greeted:false,context:{},askedFields:[]};resetDom();status('');return getActive();};
  window.resumeJulvoxAssistantConversation=resume;
  window.openAIChat=function(options){var settings=options&&typeof options==='object'?options:{};showAssistant();if(settings.conversation_id&&resume(settings.conversation_id))return;var initial=clean(settings.initialPrompt||'',1200);if(initial){window.startNewJulvoxAssistantConversation();window.sendAIMessage(initial);return;}window.setTimeout(function(){var input=document.getElementById('chatInput');if(input)input.focus();},80);};
  window.sendAIMessage=async function(preset,options){if(loading)return;var input=document.getElementById('chatInput');var message=clean(preset||(input?input.value:'')||'',1200);if(!message)return;if(input)input.value='';var settings=options&&typeof options==='object'?options:{};var scanner=settings.scanner_context&&typeof settings.scanner_context==='object'?settings.scanner_context:null;var record=ensureRecord(message);state=createStateFrom(record);hideWelcome();append('user',message);record.history.push({role:'user',content:message});state.turnCount+=1;state.context=extract(message,state.context);loading=true;var button=document.getElementById('chatSendBtn');if(button)button.disabled=true;status('Julvox analyse ta demande…');var answer='';try{var base=apiBase();if(!base)throw new Error('preview backend unavailable');var p=typeof window.getJulvoxAssistantPreferences==='function'?window.getJulvoxAssistantPreferences():{identity:'neutral',tone:'warm',address_mode:'tu'};var response=await fetch(base+'/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:message,session_id:record.id,assistant_preferences:p,scanner_context:scanner})});if(!response.ok)throw new Error('assistant response unavailable');var data=await response.json();answer=clean(data&&data.response,5000)||localFallback(message,scanner);if(!scanner&&sufficient(state.context))answer=localFallback(message,null);if(FORBIDDEN.test(answer))answer=localFallback(message,scanner);status('');}catch(_){answer=localFallback(message,scanner);status('Réponse locale affichée. Le backend Preview est momentanément indisponible.');}append('assistant',answer);record.history.push({role:'assistant',content:answer});state.greeted=true;commitState(record);loading=false;if(button)button.disabled=false;if(input)input.focus();};
  window.sendJulvoxScannerMessage=function(scannerContext){var scanner=scannerContext&&typeof scannerContext==='object'?scannerContext:{};var code=clean(scanner.code||'',20);if(!/^\\d{8,14}$/.test(code))return false;window.ensureJulvoxAssistantConversation();window.sendAIMessage(code,{scanner_context:scanner});return true;};

  document.addEventListener('click',function(event){var card=event.target.closest&&event.target.closest('#pr01bConversationList [data-conversation-id]');if(card){event.preventDefault();resume(card.getAttribute('data-conversation-id'));}},true);
  document.addEventListener('keydown',function(event){var card=event.target.closest&&event.target.closest('#pr01bConversationList [data-conversation-id]');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();resume(card.getAttribute('data-conversation-id'));}},true);
  window.addEventListener('pageshow',decorateCards);
  var observer=new MutationObserver(function(){decorateCards();});var list=document.getElementById('pr01bConversationList');if(list)observer.observe(list,{childList:true});decorateCards();
})();
</script>`;

function fail(message) { throw new Error(`JULVOX-FRONTEND-RECONCILIATION-01 integration failed: ${message}`); }

function integrate(input) {
  let html = String(input);
  if (html.includes(`id="${MARKER}"`)) return verify(html);
  for (const required of [
    'julvox-assistant-conversational-intelligence-01-runtime',
    'julvox-product-barcode-scanner-01-runtime',
    'julvox-product-smart-scan-01-runtime',
  ]) if (!html.includes(required)) fail(`missing prerequisite runtime: ${required}`);

  html = html.replace(
    "if(typeof window.startNewJulvoxAssistantConversation==='function') window.startNewJulvoxAssistantConversation();",
    "if(typeof window.ensureJulvoxAssistantConversation==='function') window.ensureJulvoxAssistantConversation(); else if(typeof window.startNewJulvoxAssistantConversation==='function') window.startNewJulvoxAssistantConversation();",
  );
  html = html.replace('</head>', `${RECONCILIATION_CSS}\n</head>`);
  html = html.replace('</body>', `${RECONCILIATION_RUNTIME}\n</body>`);
  return verify(html);
}

function verify(input) {
  const html = String(input);
  for (const token of [
    `id="${MARKER}"`,
    'resumeJulvoxAssistantConversation',
    'data-conversation-id',
    'session_id:record.id',
    'ensureJulvoxAssistantConversation',
    'J’ai suffisamment d’informations pour chercher des modèles adaptés',
    'calc(68px + env(safe-area-inset-bottom))',
    'calc(56px + env(safe-area-inset-bottom))',
  ]) if (!html.includes(token)) fail(`missing reconciliation contract: ${token}`);
  if (html.includes("if(typeof window.startNewJulvoxAssistantConversation==='function') window.startNewJulvoxAssistantConversation();\n    if(typeof window.openAIChat==='function') window.openAIChat();")) fail('scanner still forces a new assistant conversation');
  return html;
}

module.exports = { MARKER, RECONCILIATION_CSS, RECONCILIATION_RUNTIME, integrate, verify };
