const MARKER = 'julvox-p5-manual-decision-recheck-01';
const ENDPOINT_SUFFIX = '/recheck';

function cleanText(value, limit = 240) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function recommendationLabel(value) {
  const labels = Object.freeze({
    insufficient_data: 'INFORMATIONS INSUFFISANTES',
    wait: 'ATTENDRE',
    observe: 'À OBSERVER',
    consider: 'À CONSIDÉRER',
    favorable: 'FAVORABLE',
  });
  return labels[cleanText(value, 40).toLowerCase()] || 'DÉCISION DISPONIBLE';
}

function confidenceLabel(value) {
  const labels = Object.freeze({
    none: 'Non déterminée',
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Élevée',
  });
  return labels[cleanText(value, 40).toLowerCase()] || 'Non précisée';
}

function minorDigits(currency) {
  const code = cleanText(currency, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new TypeError('Devise invalide.');
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code })
      .resolvedOptions().maximumFractionDigits;
  } catch (_) {
    throw new TypeError('Devise invalide.');
  }
}

function amountToMinor(value, currency = 'EUR') {
  const raw = cleanText(value, 80);
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) {
    throw new TypeError('Indiquez un montant valide.');
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) throw new TypeError('Le montant doit être supérieur à zéro.');
  const digits = minorDigits(currency);
  const factor = 10 ** digits;
  const minor = Math.round(amount * factor);
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new TypeError('Le montant est hors limites.');
  return minor;
}

function buildRecheckPayload(input = {}) {
  const currency = cleanText(input.currency || 'EUR', 3).toUpperCase();
  const marketCountry = cleanText(input.marketCountry || 'FR', 2).toUpperCase();
  const condition = cleanText(input.condition || 'new', 40).toLowerCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError('Devise invalide.');
  if (!/^[A-Z]{2}$/.test(marketCountry)) throw new TypeError('Pays/marché invalide.');
  if (!/^[a-z][a-z0-9_-]{0,39}$/.test(condition)) throw new TypeError('État du produit invalide.');
  const currentTotalMinor = amountToMinor(input.amount, currency);
  const confirmed = input.totalPayableConfirmed === true;
  if (currentTotalMinor !== null && !confirmed) {
    throw new TypeError('Confirmez que ce montant est le total réellement payable maintenant, ou retirez le prix.');
  }
  return Object.freeze({
    currentTotalMinor,
    currency,
    marketCountry,
    condition,
    totalPayableConfirmed: currentTotalMinor !== null ? true : false,
  });
}

function normalizeRecheckResponse(payload, expectedPreviousDecisionId) {
  if (!payload || typeof payload !== 'object') return null;
  const previousDecisionId = cleanText(payload.previousDecisionId, 80);
  if (!previousDecisionId || previousDecisionId !== cleanText(expectedPreviousDecisionId, 80)) return null;
  const recheck = payload.recheck;
  const snapshot = payload.snapshot;
  if (!recheck || typeof recheck !== 'object' || !snapshot || typeof snapshot !== 'object') return null;
  if (recheck.mode !== 'manual') return null;
  if (recheck.historicalFactsReused !== false) return null;
  if (recheck.preferenceMemoryApplied !== false) return null;
  if (recheck.automaticWatch !== false) return null;
  const decision = snapshot.decision;
  if (!decision || typeof decision !== 'object') return null;
  const newDecisionId = cleanText(decision.id ?? decision.decisionId, 80);
  if (!newDecisionId) return null;
  const missingInformation = Array.isArray(recheck.missingInformation)
    ? recheck.missingInformation.map((value) => cleanText(value, 500)).filter(Boolean)
    : [];
  return Object.freeze({
    previousDecisionId,
    newDecisionId,
    persistenceStatus: cleanText(payload.persistenceStatus, 40),
    recommendation: cleanText(decision.recommendation, 40).toLowerCase(),
    confidence: cleanText(decision.confidence, 40).toLowerCase(),
    observedAt: cleanText(recheck.observedAt, 100),
    freshPriceAccepted: recheck.freshPriceAccepted === true,
    worldMemoryProjected: recheck.worldMemoryProjected === true,
    historicalFactsReused: false,
    preferenceMemoryApplied: false,
    automaticWatch: false,
    missingInformation: Object.freeze(missingInformation),
  });
}

function fail(message) {
  throw new Error(`JULVOX-P5-MANUAL-DECISION-RECHECK-01 integration failed: ${message}`);
}

const STYLES = `
<style id="${MARKER}-styles">
.jvp505-recheck,.jvp505-primary,.jvp505-secondary{border:1px solid rgba(11,29,52,.12);background:#fff;border-radius:12px;padding:10px 13px;color:#0B1D34;font:650 13px/1 Inter,system-ui,sans-serif;cursor:pointer}
.jvp505-primary{background:#0EA7A1;border-color:#0EA7A1;color:#fff}.jvp505-secondary{background:#fff}
.jvp505-recheck:focus-visible,.jvp505-primary:focus-visible,.jvp505-secondary:focus-visible,.jvp505-input:focus-visible,.jvp505-select:focus-visible{outline:3px solid rgba(14,167,161,.25);outline-offset:2px}
.jvp505-recheck:disabled,.jvp505-primary:disabled,.jvp505-secondary:disabled{opacity:.55;cursor:not-allowed}
.jvp505-badge{display:inline-flex;align-items:center;width:max-content;margin-top:9px;padding:5px 8px;border-radius:999px;background:#F4F0E8;color:#52616B;font-size:10px;font-weight:750;letter-spacing:.04em}
.jvp505-badge-new{background:rgba(14,167,161,.10);color:#0B6764}
.jvp505-host{margin-top:14px;padding-top:14px;border-top:1px solid rgba(11,29,52,.08)}
.jvp505-panel{background:#F8F4EC;border:1px solid rgba(11,29,52,.08);border-radius:16px;padding:14px;color:#52616B;font-size:13px;line-height:1.55}
.jvp505-panel h3{margin:0 0 7px;color:#0B1D34;font:650 16px/1.25 Sora,Inter,system-ui,sans-serif}
.jvp505-panel p{margin:6px 0}.jvp505-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:9px;margin-top:12px}
.jvp505-field{display:grid;gap:5px;color:#52616B;font-size:11px}.jvp505-input,.jvp505-select{width:100%;border:1px solid rgba(11,29,52,.14);border-radius:10px;background:#fff;color:#162536;padding:9px 10px;font:inherit}
.jvp505-check{display:flex;align-items:flex-start;gap:8px;margin:12px 0 0;color:#394A58;font-size:12px;line-height:1.45}.jvp505-check input{margin-top:2px}
.jvp505-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.jvp505-status{min-height:18px;margin-top:9px;color:#75818A;font-size:12px}
.jvp505-result{margin-top:12px;background:#fffdf9;border:1px solid rgba(14,167,161,.24);border-radius:16px;padding:14px}.jvp505-result strong{color:#0B1D34}
.jvp505-missing{margin:8px 0 0;padding-left:20px}.jvp505-missing li+li{margin-top:4px}
@media(max-width:760px){.jvp505-grid{grid-template-columns:1fr}.jvp505-panel{padding:12px}}
</style>`;

const RUNTIME_SCRIPT = `
<script id="${MARKER}-runtime">
(function julvoxP5ManualDecisionRecheck01(){
  'use strict';
  var ENDPOINT_SUFFIX=${JSON.stringify(ENDPOINT_SUFFIX)};
  ${cleanText.toString()}
  ${recommendationLabel.toString()}
  ${confidenceLabel.toString()}
  ${minorDigits.toString()}
  ${amountToMinor.toString()}
  ${buildRecheckPayload.toString()}
  ${normalizeRecheckResponse.toString()}

  var active={previousDecisionId:'',newDecisionId:''};
  var scheduled=false;

  function node(tag,className,text){var item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=text;return item;}
  function token(){try{return typeof currentUser!=='undefined'&&currentUser&&typeof currentUser.token==='string'?currentUser.token.trim():'';}catch(_){return '';}}
  function api(){return window.JULVOX_API&&typeof window.JULVOX_API.post==='function'?window.JULVOX_API:null;}
  function cardId(card){return cleanText(card&&card.getAttribute('data-jvp5dh-card'),80);}
  function setStatus(host,message,isError){var status=host.querySelector('[data-jvp505-status]');if(!status)return;status.textContent=message||'';status.style.color=isError?'#A53535':'#75818A';}
  function clearRole(card,role){card.querySelectorAll('[data-jvp505-role="'+role+'"]').forEach(function(item){item.remove();});}
  function badge(card,text,kind){var current=card.querySelector('[data-jvp505-role="badge"]');if(current)current.remove();var item=node('span','jvp505-badge'+(kind==='new'?' jvp505-badge-new':''),text);item.setAttribute('data-jvp505-role','badge');var top=card.querySelector('.jvp5dh-card-top');if(top)top.insertAdjacentElement('afterend',item);else card.prepend(item);}
  function rewriteNote(){var note=document.querySelector('#julvoxP5DecisionHistory .jvp5dh-note');var text='Julvox n’invente pas ce qui aurait changé depuis une décision. Une réévaluation manuelle crée un nouvel instantané à votre demande ; l’ancienne décision reste inchangée.';if(note&&note.textContent!==text)note.textContent=text;}

  function renderResult(card,normalized,requestHadPrice){
    clearRole(card,'result');
    badge(card,'ANCIENNE DÉCISION','old');
    var result=node('div','jvp505-result');result.setAttribute('data-jvp505-role','result');
    result.appendChild(node('span','jvp505-badge jvp505-badge-new','NOUVELLE DÉCISION'));
    result.appendChild(node('h3','',recommendationLabel(normalized.recommendation)));
    result.appendChild(node('p','', 'Confiance : '+confidenceLabel(normalized.confidence)));
    result.appendChild(node('p','', 'Cette nouvelle décision est un nouvel instantané. L’ancienne décision ci-dessus reste inchangée.'));
    if(normalized.freshPriceAccepted===true)result.appendChild(node('p','', 'Le prix que vous avez confirmé a été accepté comme fait actuel pour cette réévaluation.'));
    else if(requestHadPrice)result.appendChild(node('p','', 'Le prix fourni n’a pas été retenu comme fait suffisamment fort pour cette réévaluation.'));
    else result.appendChild(node('p','', 'Aucun prix actuel n’a été présenté comme fait par cette réévaluation.'));
    if(normalized.missingInformation.length){
      var title=node('strong','','Informations encore manquantes');result.appendChild(title);
      var list=node('ul','jvp505-missing');normalized.missingInformation.forEach(function(value){list.appendChild(node('li','',value));});result.appendChild(list);
    }
    var actions=node('div','jvp505-actions');
    var refresh=node('button','jvp505-secondary','Actualiser l’historique');refresh.type='button';
    refresh.addEventListener('click',function(){if(typeof window.openJulvoxDecisionHistory==='function')window.openJulvoxDecisionHistory(refresh);});
    actions.appendChild(refresh);result.appendChild(actions);
    var host=card.querySelector('[data-jvp505-host]');if(host)host.replaceChildren(result);
  }

  function showForm(card,id){
    document.querySelectorAll('[data-jvp505-host]').forEach(function(host){if(host.closest('.jvp5dh-card')!==card)host.replaceChildren();});
    badge(card,'ANCIENNE DÉCISION','old');
    var host=card.querySelector('[data-jvp505-host]');if(!host)return;
    host.replaceChildren();
    var panel=node('div','jvp505-panel');
    panel.appendChild(node('h3','', 'Réévaluer maintenant'));
    panel.appendChild(node('p','', 'Vous demandez une nouvelle évaluation avec les informations disponibles maintenant. L’ancienne décision restera enregistrée et inchangée.'));
    panel.appendChild(node('p','', 'Le prix est facultatif. Ne l’indiquez que si vous connaissez le total réellement payable maintenant.'));

    var grid=node('div','jvp505-grid');
    var amountLabel=node('label','jvp505-field','Prix total actuel (facultatif)');var amount=node('input','jvp505-input');amount.type='text';amount.inputMode='decimal';amount.placeholder='Ex. 1299,00';amount.autocomplete='off';amountLabel.appendChild(amount);
    var currencyLabel=node('label','jvp505-field','Devise');var currency=node('input','jvp505-input');currency.type='text';currency.maxLength=3;currency.value='EUR';currency.autocapitalize='characters';currencyLabel.appendChild(currency);
    var marketLabel=node('label','jvp505-field','Pays / marché');var market=node('input','jvp505-input');market.type='text';market.maxLength=2;market.value='FR';market.autocapitalize='characters';marketLabel.appendChild(market);
    grid.append(amountLabel,currencyLabel,marketLabel);panel.appendChild(grid);

    var conditionLabel=node('label','jvp505-field','État du produit');conditionLabel.style.marginTop='9px';var condition=node('select','jvp505-select');
    [['new','Neuf'],['used','Occasion'],['refurbished','Reconditionné']].forEach(function(pair){var option=node('option','',pair[1]);option.value=pair[0];condition.appendChild(option);});conditionLabel.appendChild(condition);panel.appendChild(conditionLabel);

    var checkLabel=node('label','jvp505-check');var check=node('input');check.type='checkbox';var checkText=node('span','', 'Je confirme que le montant indiqué est le total réellement payable maintenant.');checkLabel.append(check,checkText);panel.appendChild(checkLabel);
    function syncCheck(){var hasAmount=cleanText(amount.value,80)!=='';check.disabled=!hasAmount;if(!hasAmount)check.checked=false;}amount.addEventListener('input',syncCheck);syncCheck();

    var actions=node('div','jvp505-actions');var submit=node('button','jvp505-primary','Créer une nouvelle décision');submit.type='button';var cancel=node('button','jvp505-secondary','Annuler');cancel.type='button';cancel.addEventListener('click',function(){host.replaceChildren();});actions.append(submit,cancel);panel.appendChild(actions);
    var status=node('div','jvp505-status');status.setAttribute('data-jvp505-status','true');panel.appendChild(status);host.appendChild(panel);

    submit.addEventListener('click',async function(){
      var payload;try{payload=buildRecheckPayload({amount:amount.value,currency:currency.value,marketCountry:market.value,condition:condition.value,totalPayableConfirmed:check.checked});}catch(error){setStatus(host,error.message||'Informations invalides.',true);return;}
      var bearer=token();var client=api();if(!bearer||!client){setStatus(host,'Session ou client sécurisé Julvox indisponible.',true);return;}
      submit.disabled=true;cancel.disabled=true;setStatus(host,'Nouvelle évaluation en cours…',false);
      try{
        var response=await client.post('/decisions/'+encodeURIComponent(id)+ENDPOINT_SUFFIX,payload,{token:bearer});
        if(!response||response.ok!==true){setStatus(host,response&&response.message?response.message:'La réévaluation n’a pas pu être créée.',true);return;}
        var normalized=normalizeRecheckResponse(response.data,id);if(!normalized){setStatus(host,'La réponse de réévaluation ne respecte pas le contrat manuel attendu.',true);return;}
        active.previousDecisionId=normalized.previousDecisionId;active.newDecisionId=normalized.newDecisionId;
        renderResult(card,normalized,payload.currentTotalMinor!==null);
      }catch(_){setStatus(host,'La réévaluation n’a pas pu être créée.',true);}
      finally{submit.disabled=false;cancel.disabled=false;}
    });
  }

  function enhanceCard(card){
    var id=cardId(card);if(!id)return;
    if(active.previousDecisionId===id)badge(card,'ANCIENNE DÉCISION','old');
    if(active.newDecisionId===id)badge(card,'NOUVELLE DÉCISION','new');
    var actions=card.querySelector('.jvp5dh-actions');if(!actions)return;
    if(!actions.querySelector('[data-jvp505-recheck]')){
      var button=node('button','jvp505-recheck','Réévaluer maintenant');button.type='button';button.setAttribute('data-jvp505-recheck',id);button.addEventListener('click',function(){showForm(card,id);});actions.appendChild(button);
    }
    if(!card.querySelector('[data-jvp505-host]')){var host=node('div','jvp505-host');host.setAttribute('data-jvp505-host','true');card.appendChild(host);}
  }
  function mount(){scheduled=false;rewriteNote();document.querySelectorAll('#julvoxP5DecisionHistoryBody .jvp5dh-card').forEach(enhanceCard);}
  function scheduleMount(){if(scheduled)return;scheduled=true;queueMicrotask(mount);}

  var root=document.getElementById('julvoxDecisionHome');if(!root)return;
  var observer=new MutationObserver(scheduleMount);observer.observe(root,{childList:true,subtree:true});
  document.addEventListener('click',function(event){var trigger=event.target.closest&&event.target.closest('[data-home-action="decisions"]');if(trigger)window.setTimeout(scheduleMount,0);},true);
  scheduleMount();
  window.JULVOX_P5_MANUAL_DECISION_RECHECK_UI=Object.freeze({mode:'manual',preferenceMemoryApplied:false,automaticWatch:false,endpointTemplate:'/decisions/{decision_id}/recheck',mount:mount});
})();
</script>`;

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(`id="${MARKER}-runtime"`, 'g')) || []).length !== 1) fail('runtime marker must appear exactly once');
  if ((html.match(new RegExp(`id="${MARKER}-styles"`, 'g')) || []).length !== 1) fail('style marker must appear exactly once');
  for (const prerequisite of [
    'api-client.js',
    'julvox-p5-decision-history-01-runtime',
    'julvox-p5-decision-timeline-01-runtime',
    'julvox-p5-explicit-preferences-ui-01-runtime',
  ]) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const runtimeStart = html.indexOf(`id="${MARKER}-runtime"`);
  const runtimeEnd = html.indexOf('</script>', runtimeStart);
  const runtime = html.slice(runtimeStart, runtimeEnd);
  for (const required of [
    "client.post('/decisions/'",
    ENDPOINT_SUFFIX,
    'Réévaluer maintenant',
    'ANCIENNE DÉCISION',
    'NOUVELLE DÉCISION',
    'total réellement payable maintenant',
    'historicalFactsReused',
    'preferenceMemoryApplied',
    'automaticWatch',
    'INFORMATIONS INSUFFISANTES',
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
    '/account/decision-preferences',
    'automaticWatch:true',
    'preferenceMemoryApplied:true',
  ]) {
    if (runtime.includes(forbidden)) fail(`runtime contains forbidden authority ${forbidden}`);
  }
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(`id="${MARKER}-runtime"`)) return verify(html);
  for (const prerequisite of [
    'api-client.js',
    'julvox-p5-decision-history-01-runtime',
    'julvox-p5-decision-timeline-01-runtime',
    'julvox-p5-explicit-preferences-ui-01-runtime',
  ]) {
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
  ENDPOINT_SUFFIX,
  MARKER,
  RUNTIME_SCRIPT,
  STYLES,
  amountToMinor,
  buildRecheckPayload,
  cleanText,
  confidenceLabel,
  integrate,
  normalizeRecheckResponse,
  recommendationLabel,
  verify,
};
