const MARKER = 'julvox-p5-intelligent-decision-watch-01';
const LIST_ENDPOINT = '/decision-watches';
const WATCH_SUFFIX = '/watch';

function cleanText(value, limit = 240) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function buildWatchPayload(input = {}) {
  const currency = cleanText(input.currency, 3).toUpperCase();
  const marketCountry = cleanText(input.marketCountry, 2).toUpperCase();
  const condition = cleanText(input.condition, 40).toLowerCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError('Indiquez une devise à trois lettres, par exemple EUR.');
  if (!/^[A-Z]{2}$/.test(marketCountry)) throw new TypeError('Indiquez un pays ou marché à deux lettres, par exemple FR.');
  if (!['new', 'used', 'refurbished'].includes(condition)) throw new TypeError('Choisissez l’état du produit à surveiller.');
  return Object.freeze({ currency, marketCountry, condition });
}

function normalizeWatch(raw, expectedDecisionId = '') {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number(raw.id);
  const decisionId = cleanText(raw.decisionId, 80);
  const subjectId = cleanText(raw.subjectId, 255);
  const currency = cleanText(raw.currency, 3).toUpperCase();
  const marketCountry = cleanText(raw.marketCountry, 2).toUpperCase();
  const condition = cleanText(raw.condition, 40).toLowerCase();
  const source = cleanText(raw.source, 32);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!decisionId || (expectedDecisionId && decisionId !== cleanText(expectedDecisionId, 80))) return null;
  if (!subjectId.startsWith('catalog:') || !subjectId.slice(8).trim()) return null;
  if (!/^[A-Z]{3}$/.test(currency) || !/^[A-Z]{2}$/.test(marketCountry)) return null;
  if (!['new', 'used', 'refurbished'].includes(condition)) return null;
  if (source !== 'explicit_user' || raw.automaticRecheck !== false || raw.active !== true) return null;
  return Object.freeze({
    id,
    decisionId,
    subjectId,
    currency,
    marketCountry,
    condition,
    source,
    automaticRecheck: false,
    active: true,
    pendingChange: raw.pendingChange === true,
    lastCheckedAt: cleanText(raw.lastCheckedAt, 100) || null,
    changeDetectedAt: cleanText(raw.changeDetectedAt, 100) || null,
    lastNotifiedAt: cleanText(raw.lastNotifiedAt, 100) || null,
  });
}

function normalizeWatchList(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.authority !== 'explicit_user_watch' || payload.automaticRecheck !== false || !Array.isArray(payload.watches)) return null;
  const watches = [];
  for (const raw of payload.watches) {
    const normalized = normalizeWatch(raw);
    if (!normalized) return null;
    watches.push(normalized);
  }
  return Object.freeze(watches);
}

function normalizeCreateResponse(payload, expectedDecisionId) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.authority !== 'explicit_user_watch') return null;
  if (payload.automaticRecheck !== false) return null;
  if (payload.notificationSemantics !== 'canonical_observation_change_only') return null;
  return normalizeWatch(payload.watch, expectedDecisionId);
}

function normalizeDeleteResponse(payload) {
  if (!payload || typeof payload !== 'object') return false;
  return payload.status === 'deleted' && payload.automaticRecheck === false;
}

function fail(message) {
  throw new Error(`JULVOX-P5-INTELLIGENT-DECISION-WATCH-01 integration failed: ${message}`);
}

const STYLES = `
<style id="${MARKER}-styles">
.jvp506-watch,.jvp506-stop,.jvp506-primary,.jvp506-secondary{border:1px solid rgba(11,29,52,.12);background:#fff;border-radius:12px;padding:10px 13px;color:#0B1D34;font:650 13px/1 Inter,system-ui,sans-serif;cursor:pointer}
.jvp506-watch{border-color:rgba(14,167,161,.34);color:#0B6764}.jvp506-stop{color:#52616B}.jvp506-primary{background:#0EA7A1;border-color:#0EA7A1;color:#fff}.jvp506-secondary{background:#fff}
.jvp506-watch:focus-visible,.jvp506-stop:focus-visible,.jvp506-primary:focus-visible,.jvp506-secondary:focus-visible,.jvp506-input:focus-visible,.jvp506-select:focus-visible{outline:3px solid rgba(14,167,161,.25);outline-offset:2px}
.jvp506-watch:disabled,.jvp506-stop:disabled,.jvp506-primary:disabled,.jvp506-secondary:disabled{opacity:.55;cursor:not-allowed}
.jvp506-host{margin-top:10px}.jvp506-panel{background:#F8F4EC;border:1px solid rgba(11,29,52,.08);border-radius:16px;padding:14px;color:#52616B;font-size:13px;line-height:1.55}
.jvp506-panel h3{margin:0 0 7px;color:#0B1D34;font:650 16px/1.25 Sora,Inter,system-ui,sans-serif}.jvp506-panel p{margin:6px 0}
.jvp506-grid{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:9px;margin-top:12px}.jvp506-field{display:grid;gap:5px;color:#52616B;font-size:11px}
.jvp506-input,.jvp506-select{width:100%;border:1px solid rgba(11,29,52,.14);border-radius:10px;background:#fff;color:#162536;padding:9px 10px;font:inherit}
.jvp506-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.jvp506-status{min-height:18px;margin-top:9px;color:#75818A;font-size:12px}
.jvp506-active{margin-top:9px;padding:10px 12px;border-radius:12px;background:rgba(14,167,161,.08);color:#245A58;font-size:12px;line-height:1.5}.jvp506-change{font-weight:700;color:#0B6764}
@media(max-width:760px){.jvp506-grid{grid-template-columns:1fr}.jvp506-panel{padding:12px}}
</style>`;

const RUNTIME_SCRIPT = `
<script id="${MARKER}-runtime">
(function julvoxP5IntelligentDecisionWatch01(){
  'use strict';
  var LIST_ENDPOINT=${JSON.stringify(LIST_ENDPOINT)};
  var WATCH_SUFFIX=${JSON.stringify(WATCH_SUFFIX)};
  ${cleanText.toString()}
  ${buildWatchPayload.toString()}
  ${normalizeWatch.toString()}
  ${normalizeWatchList.toString()}
  ${normalizeCreateResponse.toString()}
  ${normalizeDeleteResponse.toString()}

  var watchesByDecision=new Map();
  var loadInFlight=null;
  var scheduled=false;

  function node(tag,className,text){var item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=text;return item;}
  function token(){try{return typeof currentUser!=='undefined'&&currentUser&&typeof currentUser.token==='string'?currentUser.token.trim():'';}catch(_){return '';}}
  function api(){var client=window.JULVOX_API;return client&&typeof client.get==='function'&&typeof client.post==='function'&&typeof client.delete==='function'?client:null;}
  function cardId(card){return cleanText(card&&card.getAttribute('data-jvp5dh-card'),80);}
  function setStatus(host,message,isError){var status=host.querySelector('[data-jvp506-status]');if(!status)return;status.textContent=message||'';status.style.color=isError?'#A53535':'#75818A';}
  function hostFor(card){var host=card.querySelector('[data-jvp506-host]');if(!host){host=node('div','jvp506-host');host.setAttribute('data-jvp506-host','true');card.appendChild(host);}return host;}
  function closeOtherPanels(card){document.querySelectorAll('[data-jvp506-host]').forEach(function(host){if(host.closest('.jvp5dh-card')!==card)host.replaceChildren();});}

  function activeSummary(watch){
    var box=node('div','jvp506-active');
    box.appendChild(node('strong','', 'Surveillance active'));
    box.appendChild(node('div','', 'Périmètre : '+watch.currency+' · '+watch.marketCountry+' · '+(watch.condition==='new'?'neuf':watch.condition==='used'?'occasion':'reconditionné')+'.'));
    box.appendChild(node('div','', 'Aucune nouvelle décision n’est calculée automatiquement. Vous gardez le contrôle de toute réévaluation.'));
    if(watch.pendingChange)box.appendChild(node('div','jvp506-change','De nouvelles données comparables ont été détectées. Réévaluez quand vous le souhaitez.'));
    return box;
  }

  async function stopWatch(card,watch,button){
    var bearer=token();var client=api();var host=hostFor(card);if(!bearer||!client){host.replaceChildren();var panel=node('div','jvp506-panel');panel.appendChild(node('p','', 'Session ou client sécurisé Julvox indisponible.'));host.appendChild(panel);return;}
    button.disabled=true;
    try{
      var response=await client.delete(LIST_ENDPOINT+'/'+encodeURIComponent(String(watch.id)),{token:bearer});
      if(!response||response.ok!==true||!normalizeDeleteResponse(response.data)){throw new Error('delete contract');}
      watchesByDecision.delete(watch.decisionId);host.replaceChildren();enhanceCard(card);
    }catch(_){host.replaceChildren();var failed=node('div','jvp506-panel');failed.appendChild(node('p','', 'La surveillance n’a pas pu être arrêtée.'));host.appendChild(failed);button.disabled=false;}
  }

  function renderActive(card,watch){
    var actions=card.querySelector('.jvp5dh-actions');if(!actions)return;
    var existing=actions.querySelector('[data-jvp506-action]');if(existing)existing.remove();
    var stop=node('button','jvp506-stop','Arrêter la surveillance');stop.type='button';stop.setAttribute('data-jvp506-action','stop');
    stop.addEventListener('click',function(){stopWatch(card,watch,stop);});actions.appendChild(stop);
    var host=hostFor(card);host.replaceChildren(activeSummary(watch));
  }

  function showCreateForm(card,id){
    closeOtherPanels(card);var host=hostFor(card);host.replaceChildren();
    var panel=node('div','jvp506-panel');panel.appendChild(node('h3','', 'Me prévenir si le contexte change'));
    panel.appendChild(node('p','', 'Vous choisissez de surveiller les nouvelles observations marché comparables pour cette décision.'));
    panel.appendChild(node('p','', 'Une notification peut être envoyée si un canal Julvox est disponible. Julvox ne recalculera jamais votre décision automatiquement.'));
    panel.appendChild(node('p','', 'Indiquez le même périmètre que celui que vous souhaitez surveiller. Aucun prix cible et aucun seuil commercial ne sont utilisés.'));
    var grid=node('div','jvp506-grid');
    var currencyLabel=node('label','jvp506-field','Devise');var currency=node('input','jvp506-input');currency.type='text';currency.maxLength=3;currency.placeholder='EUR';currency.autocapitalize='characters';currency.autocomplete='off';currencyLabel.appendChild(currency);
    var marketLabel=node('label','jvp506-field','Pays / marché');var market=node('input','jvp506-input');market.type='text';market.maxLength=2;market.placeholder='FR';market.autocapitalize='characters';market.autocomplete='off';marketLabel.appendChild(market);
    var conditionLabel=node('label','jvp506-field','État du produit');var condition=node('select','jvp506-select');var blank=node('option','','Choisir');blank.value='';condition.appendChild(blank);[['new','Neuf'],['used','Occasion'],['refurbished','Reconditionné']].forEach(function(pair){var option=node('option','',pair[1]);option.value=pair[0];condition.appendChild(option);});conditionLabel.appendChild(condition);
    grid.append(currencyLabel,marketLabel,conditionLabel);panel.appendChild(grid);
    var actions=node('div','jvp506-actions');var submit=node('button','jvp506-primary','Activer la surveillance');submit.type='button';var cancel=node('button','jvp506-secondary','Annuler');cancel.type='button';cancel.addEventListener('click',function(){host.replaceChildren();});actions.append(submit,cancel);panel.appendChild(actions);
    var status=node('div','jvp506-status');status.setAttribute('data-jvp506-status','true');panel.appendChild(status);host.appendChild(panel);
    submit.addEventListener('click',async function(){
      var payload;try{payload=buildWatchPayload({currency:currency.value,marketCountry:market.value,condition:condition.value});}catch(error){setStatus(host,error.message||'Périmètre invalide.',true);return;}
      var bearer=token();var client=api();if(!bearer||!client){setStatus(host,'Session ou client sécurisé Julvox indisponible.',true);return;}
      submit.disabled=true;cancel.disabled=true;setStatus(host,'Activation de la surveillance…',false);
      try{
        var response=await client.post('/decisions/'+encodeURIComponent(id)+WATCH_SUFFIX,payload,{token:bearer});
        if(!response||response.ok!==true){setStatus(host,response&&response.message?response.message:'La surveillance n’a pas pu être activée.',true);return;}
        var watch=normalizeCreateResponse(response.data,id);if(!watch){setStatus(host,'La réponse ne respecte pas le contrat de surveillance explicite attendu.',true);return;}
        watchesByDecision.set(id,watch);renderActive(card,watch);
      }catch(_){setStatus(host,'La surveillance n’a pas pu être activée.',true);}
      finally{submit.disabled=false;cancel.disabled=false;}
    });
  }

  function enhanceCard(card){
    var id=cardId(card);if(!id)return;var actions=card.querySelector('.jvp5dh-actions');if(!actions)return;
    var watch=watchesByDecision.get(id);var existing=actions.querySelector('[data-jvp506-action]');if(existing)existing.remove();
    if(watch){renderActive(card,watch);return;}
    var host=hostFor(card);if(host.querySelector('.jvp506-active'))host.replaceChildren();
    var button=node('button','jvp506-watch','Me prévenir si le contexte change');button.type='button';button.setAttribute('data-jvp506-action','create');button.addEventListener('click',function(){showCreateForm(card,id);});actions.appendChild(button);
  }
  function mount(){scheduled=false;document.querySelectorAll('#julvoxP5DecisionHistoryBody .jvp5dh-card').forEach(enhanceCard);}
  function scheduleMount(){if(scheduled)return;scheduled=true;queueMicrotask(mount);}

  async function refreshWatches(){
    if(loadInFlight)return loadInFlight;
    var bearer=token();var client=api();if(!bearer||!client){watchesByDecision.clear();scheduleMount();return null;}
    loadInFlight=(async function(){
      try{
        var response=await client.get(LIST_ENDPOINT,{token:bearer});
        if(!response||response.ok!==true)return null;
        var normalized=normalizeWatchList(response.data);if(!normalized)return null;
        watchesByDecision.clear();normalized.forEach(function(watch){watchesByDecision.set(watch.decisionId,watch);});scheduleMount();return normalized;
      }catch(_){return null;}finally{loadInFlight=null;}
    })();
    return loadInFlight;
  }

  var root=document.getElementById('julvoxDecisionHome');if(!root)return;
  var observer=new MutationObserver(scheduleMount);observer.observe(root,{childList:true,subtree:true});
  document.addEventListener('click',function(event){var trigger=event.target.closest&&event.target.closest('[data-home-action="decisions"]');if(trigger)window.setTimeout(function(){refreshWatches();scheduleMount();},0);},true);
  refreshWatches();scheduleMount();
  window.JULVOX_P5_INTELLIGENT_DECISION_WATCH_UI=Object.freeze({authority:'explicit_user_watch',automaticRecheck:false,notificationSemantics:'canonical_observation_change_only',listEndpoint:LIST_ENDPOINT,createEndpointTemplate:'/decisions/{decision_id}/watch',refresh:refreshWatches,mount:mount});
})();
</script>`;

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(`id="${MARKER}-runtime"`, 'g')) || []).length !== 1) fail('runtime marker must appear exactly once');
  if ((html.match(new RegExp(`id="${MARKER}-styles"`, 'g')) || []).length !== 1) fail('style marker must appear exactly once');
  for (const prerequisite of ['api-client.js', 'julvox-p5-decision-history-01-runtime', 'julvox-p5-manual-decision-recheck-01-runtime']) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const runtimeStart = html.indexOf(`id="${MARKER}-runtime"`);
  const runtimeEnd = html.indexOf('</script>', runtimeStart);
  const runtime = html.slice(runtimeStart, runtimeEnd);
  for (const required of [
    'Me prévenir si le contexte change',
    'Activer la surveillance',
    'Arrêter la surveillance',
    'explicit_user_watch',
    'canonical_observation_change_only',
    'automaticRecheck:false',
    "client.get(LIST_ENDPOINT",
    "client.post('/decisions/'",
    'client.delete(LIST_ENDPOINT',
    'Aucune nouvelle décision n’est calculée automatiquement',
  ]) {
    if (!runtime.includes(required)) fail(`runtime is missing ${required}`);
  }
  for (const forbidden of [
    'fetch(',
    'DecisionEngine',
    'Gemini',
    'setInterval(',
    'Notification(',
    'localStorage',
    'affiliate_url',
    'deal_quality_score',
    'target_price',
    'send_price_alert_email',
    '/recheck',
    'automaticRecheck:true',
  ]) {
    if (runtime.includes(forbidden)) fail(`runtime contains forbidden authority ${forbidden}`);
  }
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(`id="${MARKER}-runtime"`)) return verify(html);
  for (const prerequisite of ['api-client.js', 'julvox-p5-decision-history-01-runtime', 'julvox-p5-manual-decision-recheck-01-runtime']) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const headEnd = html.indexOf('</head>');
  const bodyEnd = html.lastIndexOf('</body>');
  if (headEnd < 0 || bodyEnd < 0) fail('HTML document boundaries are missing');
  html = html.slice(0, headEnd) + STYLES + '\n' + html.slice(headEnd);
  const updatedBodyEnd = html.lastIndexOf('</body>');
  html = html.slice(0, updatedBodyEnd) + RUNTIME_SCRIPT + '\n' + html.slice(updatedBodyEnd);
  return verify(html);
}

module.exports = {
  LIST_ENDPOINT,
  MARKER,
  RUNTIME_SCRIPT,
  STYLES,
  WATCH_SUFFIX,
  buildWatchPayload,
  cleanText,
  integrate,
  normalizeCreateResponse,
  normalizeDeleteResponse,
  normalizeWatch,
  normalizeWatchList,
  verify,
};
