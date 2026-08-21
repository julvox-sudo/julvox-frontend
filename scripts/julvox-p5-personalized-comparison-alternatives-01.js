const MARKER = 'julvox-p5-personalized-comparison-alternatives-01';
const ENDPOINT = '/decision-comparisons/alternatives';
const PREFERENCES_ENDPOINT = '/account/decision-preferences';
const SUPPORTED_PREFERENCE_TOPICS = Object.freeze({
  brand_preference: 'Marque préférée',
  preferred_brand: 'Marque préférée',
  excluded_brand: 'Marque à éviter',
  avoid_brand: 'Marque à éviter',
});

function cleanText(value, limit = 240) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function splitBrands(value) {
  const seen = new Set();
  const result = [];
  String(value == null ? '' : value).split(',').forEach((part) => {
    const brand = cleanText(part, 160);
    const key = brand.toLowerCase();
    if (brand && !seen.has(key) && result.length < 8) {
      seen.add(key);
      result.push(brand);
    }
  });
  return Object.freeze(result);
}

function buildAlternativePayload(input = {}) {
  const decisionId = cleanText(input.decisionId, 128);
  if (!decisionId) throw new TypeError('Décision invalide.');
  const rawLimit = Number(input.limit == null ? 4 : input.limit);
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 6) {
    throw new TypeError('Le nombre d’alternatives doit être compris entre 1 et 6.');
  }
  const preferenceIds = Array.from(input.preferenceIds || []).map(Number);
  if (preferenceIds.length > 12 || preferenceIds.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(preferenceIds).size !== preferenceIds.length) {
    throw new TypeError('Sélection de préférences invalide.');
  }
  return Object.freeze({
    decisionId,
    limit: rawLimit,
    preferredBrands: splitBrands(input.preferredBrands),
    excludedBrands: splitBrands(input.excludedBrands),
    preferenceIds: Object.freeze(preferenceIds),
  });
}

function normalizePreference(record) {
  if (!record || typeof record !== 'object') return null;
  const id = Number(record.id);
  const topic = cleanText(record.topic, 64);
  const value = cleanText(record.value, 240);
  const scope = cleanText(record.scope, 20);
  const category = record.category == null ? null : cleanText(record.category, 120);
  if (!Number.isSafeInteger(id) || id <= 0 || !value) return null;
  if (!Object.prototype.hasOwnProperty.call(SUPPORTED_PREFERENCE_TOPICS, topic)) return null;
  if (scope !== 'global' && scope !== 'category') return null;
  if (scope === 'category' && !category) return null;
  if (scope === 'global' && category) return null;
  if (record.source !== 'explicit_user' || record.automaticUse !== false) return null;
  return Object.freeze({ id, topic, value, scope, category, source: 'explicit_user', automaticUse: false });
}

function normalizePreferenceList(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.authority !== 'explicit_user_only' || payload.automaticUse !== false || !Array.isArray(payload.preferences)) return null;
  const supported = [];
  for (const record of payload.preferences) {
    const normalized = normalizePreference(record);
    if (normalized) supported.push(normalized);
    else if (record && typeof record === 'object' && Object.prototype.hasOwnProperty.call(SUPPORTED_PREFERENCE_TOPICS, cleanText(record.topic, 64))) return null;
  }
  return Object.freeze({ authority: 'explicit_user_only', automaticUse: false, preferences: Object.freeze(supported) });
}

function normalizeAlternative(record) {
  if (!record || typeof record !== 'object') return null;
  const candidateId = cleanText(record.candidateId, 128);
  const productId = Number(record.productId);
  const name = cleanText(record.name, 240);
  const brand = record.brand == null ? null : cleanText(record.brand, 160);
  const category = record.category == null ? null : cleanText(record.category, 160);
  if (!candidateId.startsWith('catalog:') || !Number.isSafeInteger(productId) || productId <= 0 || !name) return null;
  if (record.evaluationStatus !== 'not_evaluated' || record.recommendation !== null || record.confidence !== null) return null;
  if (record.decisionAuthority !== 'requires_separate_current_factual_evaluation') return null;
  if (!Array.isArray(record.preferenceMatches) || !Array.isArray(record.missingInformation)) return null;
  return Object.freeze({
    candidateId,
    productId,
    name,
    brand,
    category,
    imageUrl: record.imageUrl == null ? null : cleanText(record.imageUrl, 1000),
    preferenceMatches: Object.freeze(record.preferenceMatches.map((item) => Object.freeze({
      criterion: cleanText(item && item.criterion, 80),
      catalogValue: cleanText(item && item.catalogValue, 160),
      match: cleanText(item && item.match, 80),
    }))),
    evaluationStatus: 'not_evaluated',
    recommendation: null,
    confidence: null,
    decisionAuthority: 'requires_separate_current_factual_evaluation',
    missingInformation: Object.freeze(record.missingInformation.map((item) => cleanText(item, 240)).filter(Boolean)),
  });
}

function normalizeAlternativeResponse(payload, expectedDecisionId = '') {
  if (!payload || typeof payload !== 'object') return null;
  const decisionId = cleanText(payload.decisionId, 128);
  if (!decisionId || (expectedDecisionId && decisionId !== cleanText(expectedDecisionId, 128))) return null;
  const allowedStatuses = new Set(['alternatives_found', 'no_catalog_alternative', 'insufficient_catalog_identity', 'insufficient_category']);
  if (!allowedStatuses.has(payload.status) || !Array.isArray(payload.alternatives)) return null;
  const personalization = payload.personalization;
  if (!personalization || personalization.mode !== 'explicit_request_only' || personalization.automaticPreferenceUse !== false || personalization.feedbackLearning !== false) return null;
  if (!Array.isArray(personalization.selectedPreferenceIds) || !Array.isArray(personalization.appliedPreferences)) return null;
  const alternatives = payload.alternatives.map(normalizeAlternative);
  if (alternatives.some((item) => item === null)) return null;
  if (payload.status === 'alternatives_found' && alternatives.length === 0) return null;
  if (payload.status !== 'alternatives_found' && payload.status !== 'no_catalog_alternative' && alternatives.length !== 0) return null;
  if (payload.status === 'alternatives_found' || payload.status === 'no_catalog_alternative') {
    const authority = payload.comparisonAuthority;
    if (!authority || authority.currentDecision !== 'existing_immutable_decision_snapshot' || authority.alternativeIdentity !== 'catalog_only' || authority.alternativeDecision !== 'not_evaluated' || authority.opaqueScore !== false || authority.commercialOrdering !== false) return null;
  }
  return Object.freeze({
    decisionId,
    subjectId: cleanText(payload.subjectId, 160),
    status: payload.status,
    alternatives: Object.freeze(alternatives),
    personalization: Object.freeze({
      mode: 'explicit_request_only',
      automaticPreferenceUse: false,
      feedbackLearning: false,
      selectedPreferenceIds: Object.freeze(personalization.selectedPreferenceIds.map(Number)),
      appliedPreferences: Object.freeze(personalization.appliedPreferences.slice()),
    }),
    explanation: cleanText(payload.explanation, 800),
  });
}

function fail(message) {
  throw new Error(`JULVOX-P5-PERSONALIZED-COMPARISON-ALTERNATIVES-01 integration failed: ${message}`);
}

const STYLES = `
<style id="${MARKER}-styles">
.jvp508-open{border:1px solid rgba(11,29,52,.12);background:#fff;border-radius:12px;padding:10px 13px;color:#52616B;font:650 13px/1 Inter,system-ui,sans-serif;cursor:pointer}.jvp508-open:disabled,.jvp508-primary:disabled,.jvp508-secondary:disabled{opacity:.55;cursor:not-allowed}
.jvp508-open:focus-visible,.jvp508-primary:focus-visible,.jvp508-secondary:focus-visible,.jvp508-input:focus-visible,.jvp508-check:focus-visible{outline:3px solid rgba(14,167,161,.25);outline-offset:2px}
.jvp508-host{margin-top:10px}.jvp508-panel{background:#F8F4EC;border:1px solid rgba(11,29,52,.08);border-radius:16px;padding:14px;color:#52616B;font-size:13px;line-height:1.55}.jvp508-panel h3{margin:0 0 7px;color:#0B1D34;font:650 16px/1.25 Sora,Inter,system-ui,sans-serif}.jvp508-panel p{margin:6px 0}
.jvp508-warning{background:rgba(198,141,36,.10);border:1px solid rgba(198,141,36,.18);border-radius:11px;padding:9px 11px;color:#78581E}.jvp508-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:11px}.jvp508-label{display:grid;gap:5px;font-size:11px;color:#66747D}.jvp508-input{width:100%;border:1px solid rgba(11,29,52,.14);border-radius:10px;background:#fff;color:#162536;padding:9px 10px;font:inherit}.jvp508-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.jvp508-primary,.jvp508-secondary{border:1px solid rgba(11,29,52,.13);border-radius:10px;padding:9px 12px;font:650 12px/1 Inter,system-ui,sans-serif;cursor:pointer}.jvp508-primary{background:#0EA7A1;border-color:#0EA7A1;color:#fff}.jvp508-secondary{background:#fff;color:#0B1D34}.jvp508-status{min-height:18px;margin-top:8px;color:#75818A;font-size:12px}
.jvp508-prefhost{margin-top:9px}.jvp508-prefitem{display:flex;gap:8px;align-items:flex-start;background:#fff;border:1px solid rgba(11,29,52,.10);border-radius:10px;padding:9px;margin-top:6px}.jvp508-prefitem input{margin-top:3px}.jvp508-prefmeta{font-size:11px;color:#75818A}.jvp508-results{display:grid;gap:9px;margin-top:12px}.jvp508-card{background:#fff;border:1px solid rgba(11,29,52,.10);border-radius:12px;padding:11px}.jvp508-card strong{color:#0B1D34}.jvp508-badge{display:inline-block;margin-left:6px;border-radius:999px;padding:2px 7px;background:rgba(14,167,161,.09);color:#24716D;font-size:10px}.jvp508-missing{margin:7px 0 0;padding-left:18px;color:#66747D;font-size:11px}
@media(max-width:760px){.jvp508-panel{padding:12px}.jvp508-grid{grid-template-columns:1fr}.jvp508-primary,.jvp508-secondary{min-height:42px}}
</style>`;

const RUNTIME_SCRIPT = `
<script id="${MARKER}-runtime">
(function julvoxP5PersonalizedComparisonAlternatives01(){
  'use strict';
  var ENDPOINT=${JSON.stringify(ENDPOINT)};
  var PREFERENCES_ENDPOINT=${JSON.stringify(PREFERENCES_ENDPOINT)};
  var SUPPORTED_PREFERENCE_TOPICS=${JSON.stringify(SUPPORTED_PREFERENCE_TOPICS)};
  ${cleanText.toString()}
  ${splitBrands.toString()}
  ${buildAlternativePayload.toString()}
  ${normalizePreference.toString()}
  ${normalizePreferenceList.toString()}
  ${normalizeAlternative.toString()}
  ${normalizeAlternativeResponse.toString()}

  var scheduled=false;
  function node(tag,className,text){var item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=text;return item;}
  function token(){try{return typeof currentUser!=='undefined'&&currentUser&&typeof currentUser.token==='string'?currentUser.token.trim():'';}catch(_){return '';}}
  function api(){var client=window.JULVOX_API;return client&&typeof client.post==='function'&&typeof client.get==='function'?client:null;}
  function cardId(card){return cleanText(card&&card.getAttribute('data-jvp5dh-card'),128);}
  function hostFor(card){var host=card.querySelector('[data-jvp508-host]');if(!host){host=node('div','jvp508-host');host.setAttribute('data-jvp508-host','true');card.appendChild(host);}return host;}
  function setStatus(host,message,isError){var target=host.querySelector('[data-jvp508-status]');if(!target)return;target.textContent=message||'';target.style.color=isError?'#A53535':'#75818A';}
  function closeOthers(card){document.querySelectorAll('[data-jvp508-host]').forEach(function(host){if(host.closest('.jvp5dh-card')!==card)host.replaceChildren();});}

  function renderResults(container,result){
    container.replaceChildren();
    if(!result.alternatives.length){var empty=node('p','',result.explanation||'Aucune alternative catalogue exploitable n’est disponible sans inventer de données.');container.appendChild(empty);return;}
    result.alternatives.forEach(function(item){var card=node('div','jvp508-card');var title=node('strong','',item.name);card.appendChild(title);if(item.brand)card.appendChild(node('span','jvp508-badge',item.brand));card.appendChild(node('p','', 'Alternative catalogue — pas encore une recommandation.'));if(item.preferenceMatches.length)card.appendChild(node('p','', 'Correspondance explicite : '+item.preferenceMatches.map(function(match){return match.catalogValue;}).filter(Boolean).join(', ')+'.'));if(item.missingInformation.length){var list=node('ul','jvp508-missing');item.missingInformation.slice(0,5).forEach(function(info){list.appendChild(node('li','',info));});card.appendChild(list);}container.appendChild(card);});
  }

  function renderPanel(card,id){
    closeOthers(card);var host=hostFor(card);host.replaceChildren();var panel=node('div','jvp508-panel');panel.appendChild(node('h3','', 'Voir des alternatives'));panel.appendChild(node('p','jvp508-warning','Ces alternatives ne sont pas encore des recommandations. Une correspondance de catégorie ou de marque ne prouve pas qu’un produit est meilleur.'));
    panel.appendChild(node('p','', 'Julvox n’utilise aucune préférence mémorisée sans que vous la sélectionniez pour cette comparaison.'));
    var grid=node('div','jvp508-grid');var preferredLabel=node('label','jvp508-label','Marques à privilégier pour cette recherche');var preferred=node('input','jvp508-input');preferred.type='text';preferred.placeholder='Ex. Sony, Samsung';preferred.maxLength=600;preferredLabel.appendChild(preferred);var excludedLabel=node('label','jvp508-label','Marques à exclure');var excluded=node('input','jvp508-input');excluded.type='text';excluded.placeholder='Ex. Marque X, Marque Y';excluded.maxLength=600;excludedLabel.appendChild(excluded);grid.append(preferredLabel,excludedLabel);panel.appendChild(grid);
    var prefHost=node('div','jvp508-prefhost');var prefButton=node('button','jvp508-secondary','Choisir des préférences mémorisées');prefButton.type='button';prefHost.appendChild(prefButton);panel.appendChild(prefHost);var selectedIds=[];var preferencesLoaded=false;
    prefButton.addEventListener('click',async function(){if(preferencesLoaded)return;var bearer=token();var client=api();if(!bearer||!client){setStatus(host,'Session ou client sécurisé Julvox indisponible.',true);return;}prefButton.disabled=true;prefButton.textContent='Chargement des préférences…';try{var response=await client.get(PREFERENCES_ENDPOINT,{token:bearer});if(!response||response.ok!==true){setStatus(host,'Vos préférences n’ont pas pu être chargées.',true);prefButton.disabled=false;prefButton.textContent='Choisir des préférences mémorisées';return;}var normalized=normalizePreferenceList(response.data);if(!normalized){setStatus(host,'Le registre de préférences n’a pas fourni une autorité explicite vérifiable.',true);prefButton.disabled=false;prefButton.textContent='Choisir des préférences mémorisées';return;}preferencesLoaded=true;prefButton.remove();if(!normalized.preferences.length){prefHost.appendChild(node('p','', 'Aucune préférence de marque compatible n’est mémorisée.'));return;}prefHost.appendChild(node('p','', 'Cochez uniquement les préférences que vous voulez appliquer à cette comparaison :'));normalized.preferences.forEach(function(preference){var label=node('label','jvp508-prefitem');var checkbox=node('input','jvp508-check');checkbox.type='checkbox';checkbox.value=String(preference.id);var text=node('span','',SUPPORTED_PREFERENCE_TOPICS[preference.topic]+' : '+preference.value);var meta=node('div','jvp508-prefmeta',preference.scope==='category'?'Catégorie : '+preference.category:'Tous mes achats');text.appendChild(meta);checkbox.addEventListener('change',function(){var numeric=Number(checkbox.value);if(checkbox.checked){if(!selectedIds.includes(numeric)&&selectedIds.length<12)selectedIds.push(numeric);}else selectedIds=selectedIds.filter(function(value){return value!==numeric;});});label.append(checkbox,text);prefHost.appendChild(label);});}catch(_){setStatus(host,'Vos préférences n’ont pas pu être chargées.',true);prefButton.disabled=false;prefButton.textContent='Choisir des préférences mémorisées';}});
    var actions=node('div','jvp508-actions');var submit=node('button','jvp508-primary','Rechercher des alternatives');submit.type='button';var close=node('button','jvp508-secondary','Fermer');close.type='button';close.addEventListener('click',function(){host.replaceChildren();});actions.append(submit,close);panel.appendChild(actions);var status=node('div','jvp508-status');status.setAttribute('data-jvp508-status','true');panel.appendChild(status);var results=node('div','jvp508-results');panel.appendChild(results);host.appendChild(panel);
    submit.addEventListener('click',async function(){var payload;try{payload=buildAlternativePayload({decisionId:id,limit:4,preferredBrands:preferred.value,excludedBrands:excluded.value,preferenceIds:selectedIds});}catch(error){setStatus(host,error.message||'Critères invalides.',true);return;}var bearer=token();var client=api();if(!bearer||!client){setStatus(host,'Session ou client sécurisé Julvox indisponible.',true);return;}submit.disabled=true;setStatus(host,'Recherche d’alternatives factuelles…',false);results.replaceChildren();try{var response=await client.post(ENDPOINT,payload,{token:bearer});if(!response||response.ok!==true){setStatus(host,response&&response.message?response.message:'La recherche d’alternatives a échoué.',true);return;}var normalized=normalizeAlternativeResponse(response.data,id);if(!normalized){setStatus(host,'Le serveur n’a pas fourni un contrat de comparaison explicite vérifiable.',true);return;}setStatus(host,normalized.status==='alternatives_found'?'Alternatives catalogue trouvées — aucune n’est encore recommandée.':'Aucune alternative exploitable sans données supplémentaires.',false);renderResults(results,normalized);}catch(_){setStatus(host,'La recherche d’alternatives a échoué.',true);}finally{submit.disabled=false;}});
  }

  function enhanceCard(card){var id=cardId(card);if(!id)return;var actions=card.querySelector('.jvp5dh-actions');if(!actions||actions.querySelector('[data-jvp508-action]'))return;var button=node('button','jvp508-open','Voir des alternatives');button.type='button';button.setAttribute('data-jvp508-action','open');button.addEventListener('click',function(){renderPanel(card,id);});actions.appendChild(button);}
  function mount(){scheduled=false;document.querySelectorAll('#julvoxP5DecisionHistoryBody .jvp5dh-card').forEach(enhanceCard);}
  function scheduleMount(){if(scheduled)return;scheduled=true;queueMicrotask(mount);}
  var root=document.getElementById('julvoxDecisionHome');if(!root)return;var observer=new MutationObserver(scheduleMount);observer.observe(root,{childList:true,subtree:true});document.addEventListener('click',function(event){var trigger=event.target.closest&&event.target.closest('[data-home-action="decisions"]');if(trigger)window.setTimeout(scheduleMount,0);},true);scheduleMount();
  window.JULVOX_P5_PERSONALIZED_COMPARISON_ALTERNATIVES_UI=Object.freeze({mode:'explicit_request_only',automaticPreferenceUse:false,feedbackLearning:false,endpoint:ENDPOINT,mount:mount});
})();
</script>`;

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(`id="${MARKER}-runtime"`, 'g')) || []).length !== 1) fail('runtime marker must appear exactly once');
  if ((html.match(new RegExp(`id="${MARKER}-styles"`, 'g')) || []).length !== 1) fail('style marker must appear exactly once');
  for (const prerequisite of ['api-client.js', 'julvox-p5-decision-history-01-runtime', 'julvox-p5-explicit-preferences-ui-01-runtime', 'julvox-p5-explicit-decision-feedback-01-runtime']) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const runtimeStart = html.indexOf(`id="${MARKER}-runtime"`);
  const runtimeEnd = html.indexOf('</script>', runtimeStart);
  const runtime = html.slice(runtimeStart, runtimeEnd);
  for (const required of [ENDPOINT, PREFERENCES_ENDPOINT, 'Voir des alternatives', 'Ces alternatives ne sont pas encore des recommandations.', 'Choisir des préférences mémorisées', 'client.post(', 'client.get(', 'explicit_request_only', 'automaticPreferenceUse:false', 'feedbackLearning:false', 'not_evaluated']) {
    if (!runtime.includes(required)) fail(`runtime is missing ${required}`);
  }
  const prefGet = runtime.indexOf('client.get(PREFERENCES_ENDPOINT');
  const explicitClick = runtime.indexOf("prefButton.addEventListener('click'");
  if (prefGet < 0 || explicitClick < 0 || prefGet < explicitClick) fail('preferences must load only after explicit user action');
  for (const forbidden of ['fetch(', 'localStorage', 'DecisionEngine', 'Gemini', '/ml/', 'deal_quality_score', 'affiliate_url', 'target_price', 'bestAlternative', 'matchScore']) {
    if (runtime.includes(forbidden)) fail(`runtime contains forbidden authority ${forbidden}`);
  }
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(`id="${MARKER}-runtime"`)) return verify(html);
  for (const prerequisite of ['api-client.js', 'julvox-p5-decision-history-01-runtime', 'julvox-p5-explicit-preferences-ui-01-runtime', 'julvox-p5-explicit-decision-feedback-01-runtime']) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) fail('HTML head boundary is missing');
  html = html.slice(0, headEnd) + STYLES + '\n' + html.slice(headEnd);
  const bodyEnd = html.lastIndexOf('</body>');
  if (bodyEnd < 0) fail('HTML body boundary is missing');
  html = html.slice(0, bodyEnd) + RUNTIME_SCRIPT + '\n' + html.slice(bodyEnd);
  return verify(html);
}

module.exports = {
  ENDPOINT,
  MARKER,
  PREFERENCES_ENDPOINT,
  RUNTIME_SCRIPT,
  STYLES,
  SUPPORTED_PREFERENCE_TOPICS,
  buildAlternativePayload,
  cleanText,
  integrate,
  normalizeAlternative,
  normalizeAlternativeResponse,
  normalizePreference,
  normalizePreferenceList,
  splitBrands,
  verify,
};
