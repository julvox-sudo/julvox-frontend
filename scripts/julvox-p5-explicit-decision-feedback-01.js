const MARKER = 'julvox-p5-explicit-decision-feedback-01';
const ENDPOINT_PREFIX = '/decision-feedback/';

function cleanText(value, limit = 600) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function buildFeedbackPayload(input = {}) {
  const sentiment = cleanText(input.sentiment, 20).toLowerCase();
  const comment = cleanText(input.comment, 601);
  if (!['helpful', 'not_helpful'].includes(sentiment)) {
    throw new TypeError('Choisissez si cette décision vous a été utile ou non.');
  }
  if (comment.length > 600) {
    throw new TypeError('Votre commentaire doit contenir au maximum 600 caractères.');
  }
  return Object.freeze({ sentiment, comment: comment || null });
}

function normalizeFeedback(record, expectedDecisionId = '') {
  if (!record || typeof record !== 'object') return null;
  const id = Number(record.id);
  const decisionId = cleanText(record.decisionId, 80);
  const sentiment = cleanText(record.sentiment, 20).toLowerCase();
  const comment = record.comment == null ? null : cleanText(record.comment, 601);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!decisionId || (expectedDecisionId && decisionId !== cleanText(expectedDecisionId, 80))) return null;
  if (!['helpful', 'not_helpful'].includes(sentiment)) return null;
  if (comment !== null && comment.length > 600) return null;
  if (record.source !== 'explicit_user' || record.automaticUse !== false) return null;
  return Object.freeze({
    id,
    decisionId,
    sentiment,
    comment,
    source: 'explicit_user',
    automaticUse: false,
    createdAt: cleanText(record.createdAt, 100) || null,
    updatedAt: cleanText(record.updatedAt, 100) || null,
  });
}

function normalizeFeedbackResponse(payload, expectedDecisionId = '') {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.authority !== 'explicit_user_feedback' || payload.automaticUse !== false) return null;
  if (payload.feedback == null) {
    return Object.freeze({ authority: 'explicit_user_feedback', automaticUse: false, feedback: null });
  }
  const feedback = normalizeFeedback(payload.feedback, expectedDecisionId);
  if (!feedback) return null;
  return Object.freeze({ authority: 'explicit_user_feedback', automaticUse: false, feedback });
}

function normalizeDeleteResponse(payload) {
  return Boolean(payload && typeof payload === 'object' && payload.status === 'deleted' && payload.automaticUse === false);
}

function fail(message) {
  throw new Error(`JULVOX-P5-EXPLICIT-DECISION-FEEDBACK-01 integration failed: ${message}`);
}

const STYLES = `
<style id="${MARKER}-styles">
.jvp507-feedback{border:1px solid rgba(11,29,52,.12);background:#fff;border-radius:12px;padding:10px 13px;color:#52616B;font:650 13px/1 Inter,system-ui,sans-serif;cursor:pointer}
.jvp507-feedback:focus-visible,.jvp507-choice:focus-visible,.jvp507-save:focus-visible,.jvp507-secondary:focus-visible,.jvp507-comment:focus-visible{outline:3px solid rgba(14,167,161,.25);outline-offset:2px}
.jvp507-feedback:disabled,.jvp507-choice:disabled,.jvp507-save:disabled,.jvp507-secondary:disabled{opacity:.55;cursor:not-allowed}
.jvp507-host{margin-top:10px}.jvp507-panel{background:#F8F4EC;border:1px solid rgba(11,29,52,.08);border-radius:16px;padding:14px;color:#52616B;font-size:13px;line-height:1.55}
.jvp507-panel h3{margin:0 0 7px;color:#0B1D34;font:650 16px/1.25 Sora,Inter,system-ui,sans-serif}.jvp507-panel p{margin:6px 0}
.jvp507-choices,.jvp507-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.jvp507-choice,.jvp507-save,.jvp507-secondary{border:1px solid rgba(11,29,52,.13);background:#fff;border-radius:10px;padding:9px 12px;color:#0B1D34;font:650 12px/1 Inter,system-ui,sans-serif;cursor:pointer}
.jvp507-choice[aria-pressed="true"],.jvp507-save{background:#0EA7A1;border-color:#0EA7A1;color:#fff}.jvp507-comment{width:100%;min-height:74px;resize:vertical;margin-top:11px;border:1px solid rgba(11,29,52,.14);border-radius:10px;background:#fff;color:#162536;padding:10px;font:inherit}
.jvp507-status{min-height:18px;margin-top:8px;color:#75818A;font-size:12px}.jvp507-current{margin-top:9px;padding:9px 11px;border-radius:11px;background:rgba(14,167,161,.08);color:#245A58;font-size:12px}
@media(max-width:760px){.jvp507-panel{padding:12px}.jvp507-choice,.jvp507-save,.jvp507-secondary{min-height:42px}}
</style>`;

const RUNTIME_SCRIPT = `
<script id="${MARKER}-runtime">
(function julvoxP5ExplicitDecisionFeedback01(){
  'use strict';
  var ENDPOINT_PREFIX=${JSON.stringify(ENDPOINT_PREFIX)};
  ${cleanText.toString()}
  ${buildFeedbackPayload.toString()}
  ${normalizeFeedback.toString()}
  ${normalizeFeedbackResponse.toString()}
  ${normalizeDeleteResponse.toString()}

  var scheduled=false;
  function node(tag,className,text){var item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=text;return item;}
  function token(){try{return typeof currentUser!=='undefined'&&currentUser&&typeof currentUser.token==='string'?currentUser.token.trim():'';}catch(_){return '';}}
  function api(){var client=window.JULVOX_API;return client&&typeof client.get==='function'&&typeof client.put==='function'&&typeof client.delete==='function'?client:null;}
  function cardId(card){return cleanText(card&&card.getAttribute('data-jvp5dh-card'),80);}
  function endpoint(id){return ENDPOINT_PREFIX+encodeURIComponent(id);}
  function hostFor(card){var host=card.querySelector('[data-jvp507-host]');if(!host){host=node('div','jvp507-host');host.setAttribute('data-jvp507-host','true');card.appendChild(host);}return host;}
  function closeOtherPanels(card){document.querySelectorAll('[data-jvp507-host]').forEach(function(host){if(host.closest('.jvp5dh-card')!==card)host.replaceChildren();});}
  function setStatus(host,message,isError){var target=host.querySelector('[data-jvp507-status]');if(!target)return;target.textContent=message||'';target.style.color=isError?'#A53535':'#75818A';}

  function renderPanel(card,id,current){
    closeOtherPanels(card);var host=hostFor(card);host.replaceChildren();
    var panel=node('div','jvp507-panel');panel.appendChild(node('h3','', 'Cette décision vous a-t-elle été utile ?'));
    panel.appendChild(node('p','', 'Votre retour est enregistré uniquement parce que vous choisissez de le donner.'));
    panel.appendChild(node('p','', 'Il n’est pas appliqué automatiquement à vos décisions, préférences ou recommandations.'));
    var choices=node('div','jvp507-choices');var helpful=node('button','jvp507-choice','Oui, utile');var notHelpful=node('button','jvp507-choice','Pas vraiment');helpful.type='button';notHelpful.type='button';choices.append(helpful,notHelpful);panel.appendChild(choices);
    var comment=node('textarea','jvp507-comment');comment.maxLength=600;comment.placeholder='Commentaire facultatif — dites ce qui vous a aidé ou ce qui manquait.';comment.value=current&&current.comment?current.comment:'';panel.appendChild(comment);
    var selected=current?current.sentiment:'';
    function sync(){helpful.setAttribute('aria-pressed',String(selected==='helpful'));notHelpful.setAttribute('aria-pressed',String(selected==='not_helpful'));}
    helpful.addEventListener('click',function(){selected='helpful';sync();});notHelpful.addEventListener('click',function(){selected='not_helpful';sync();});sync();
    if(current){var summary=node('div','jvp507-current','Retour actuellement enregistré : '+(current.sentiment==='helpful'?'utile':'pas utile')+'.');panel.appendChild(summary);}
    var actions=node('div','jvp507-actions');var save=node('button','jvp507-save',current?'Mettre à jour mon retour':'Enregistrer mon retour');save.type='button';var cancel=node('button','jvp507-secondary','Fermer');cancel.type='button';cancel.addEventListener('click',function(){host.replaceChildren();});actions.append(save,cancel);
    if(current){var remove=node('button','jvp507-secondary','Supprimer mon retour');remove.type='button';remove.addEventListener('click',async function(){var bearer=token();var client=api();if(!bearer||!client){setStatus(host,'Session ou client sécurisé Julvox indisponible.',true);return;}if(!window.confirm('Supprimer votre retour sur cette décision ?'))return;remove.disabled=true;var response=await client.delete(endpoint(id),{token:bearer});remove.disabled=false;if(!response||response.ok!==true||!normalizeDeleteResponse(response.data)){setStatus(host,'Votre retour n’a pas pu être supprimé.',true);return;}host.replaceChildren();});actions.appendChild(remove);}
    panel.appendChild(actions);var status=node('div','jvp507-status');status.setAttribute('data-jvp507-status','true');panel.appendChild(status);host.appendChild(panel);
    save.addEventListener('click',async function(){var payload;try{payload=buildFeedbackPayload({sentiment:selected,comment:comment.value});}catch(error){setStatus(host,error.message||'Retour invalide.',true);return;}var bearer=token();var client=api();if(!bearer||!client){setStatus(host,'Session ou client sécurisé Julvox indisponible.',true);return;}save.disabled=true;setStatus(host,'Enregistrement…',false);try{var response=await client.put(endpoint(id),payload,{token:bearer});if(!response||response.ok!==true){setStatus(host,response&&response.message?response.message:'Votre retour n’a pas pu être enregistré.',true);return;}var normalized=normalizeFeedbackResponse(response.data,id);if(!normalized||!normalized.feedback){setStatus(host,'La réponse ne respecte pas le contrat de feedback explicite attendu.',true);return;}renderPanel(card,id,normalized.feedback);}catch(_){setStatus(host,'Votre retour n’a pas pu être enregistré.',true);}finally{save.disabled=false;}});
  }

  async function openFeedback(card,id,button){
    var bearer=token();var client=api();var host=hostFor(card);if(!bearer||!client){host.replaceChildren();var unavailable=node('div','jvp507-panel');unavailable.appendChild(node('p','', 'Session ou client sécurisé Julvox indisponible.'));host.appendChild(unavailable);return;}
    button.disabled=true;host.replaceChildren();var loading=node('div','jvp507-panel');loading.appendChild(node('p','', 'Chargement de votre retour…'));host.appendChild(loading);
    try{var response=await client.get(endpoint(id),{token:bearer});if(!response||response.ok!==true){host.replaceChildren();var failed=node('div','jvp507-panel');failed.appendChild(node('p','', 'Votre retour n’a pas pu être chargé.'));host.appendChild(failed);return;}var normalized=normalizeFeedbackResponse(response.data,id);if(!normalized){host.replaceChildren();var invalid=node('div','jvp507-panel');invalid.appendChild(node('p','', 'Le serveur n’a pas fourni une autorité de feedback explicite vérifiable.'));host.appendChild(invalid);return;}renderPanel(card,id,normalized.feedback);}catch(_){host.replaceChildren();var failed=node('div','jvp507-panel');failed.appendChild(node('p','', 'Votre retour n’a pas pu être chargé.'));host.appendChild(failed);}finally{button.disabled=false;}
  }

  function enhanceCard(card){var id=cardId(card);if(!id)return;var actions=card.querySelector('.jvp5dh-actions');if(!actions)return;if(actions.querySelector('[data-jvp507-action]'))return;var button=node('button','jvp507-feedback','Donner mon avis sur cette décision');button.type='button';button.setAttribute('data-jvp507-action','open');button.addEventListener('click',function(){openFeedback(card,id,button);});actions.appendChild(button);}
  function mount(){scheduled=false;document.querySelectorAll('#julvoxP5DecisionHistoryBody .jvp5dh-card').forEach(enhanceCard);}
  function scheduleMount(){if(scheduled)return;scheduled=true;queueMicrotask(mount);}
  var root=document.getElementById('julvoxDecisionHome');if(!root)return;var observer=new MutationObserver(scheduleMount);observer.observe(root,{childList:true,subtree:true});document.addEventListener('click',function(event){var trigger=event.target.closest&&event.target.closest('[data-home-action="decisions"]');if(trigger)window.setTimeout(scheduleMount,0);},true);scheduleMount();
  window.JULVOX_P5_EXPLICIT_DECISION_FEEDBACK_UI=Object.freeze({authority:'explicit_user_feedback',automaticUse:false,endpointTemplate:'/decision-feedback/{decision_id}',mount:mount});
})();
</script>`;

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(`id="${MARKER}-runtime"`, 'g')) || []).length !== 1) fail('runtime marker must appear exactly once');
  if ((html.match(new RegExp(`id="${MARKER}-styles"`, 'g')) || []).length !== 1) fail('style marker must appear exactly once');
  for (const prerequisite of ['api-client.js', 'julvox-p5-decision-history-01-runtime', 'julvox-p5-intelligent-decision-watch-01-runtime']) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const runtimeStart = html.indexOf(`id="${MARKER}-runtime"`);
  const runtimeEnd = html.indexOf('</script>', runtimeStart);
  const runtime = html.slice(runtimeStart, runtimeEnd);
  for (const required of [ENDPOINT_PREFIX, 'Cette décision vous a-t-elle été utile ?', 'explicit_user_feedback', 'automaticUse:false', 'client.get(', 'client.put(', 'client.delete(', 'Il n’est pas appliqué automatiquement']) {
    if (!runtime.includes(required)) fail(`runtime is missing ${required}`);
  }
  for (const forbidden of ['fetch(', 'localStorage', 'DecisionEngine', 'Gemini', '/ml/', 'score_preference', 'favorite_categories', '/decisions/{decision_id}/feedback', 'target_price', 'affiliate_url', 'deal_quality_score']) {
    if (runtime.includes(forbidden)) fail(`runtime contains forbidden authority ${forbidden}`);
  }
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(`id="${MARKER}-runtime"`)) return verify(html);
  for (const prerequisite of ['api-client.js', 'julvox-p5-decision-history-01-runtime', 'julvox-p5-intelligent-decision-watch-01-runtime']) {
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
  ENDPOINT_PREFIX,
  MARKER,
  RUNTIME_SCRIPT,
  STYLES,
  buildFeedbackPayload,
  cleanText,
  integrate,
  normalizeDeleteResponse,
  normalizeFeedback,
  normalizeFeedbackResponse,
  verify,
};
