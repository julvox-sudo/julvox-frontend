const MARKER = 'julvox-p5-explicit-preferences-ui-01';
const ENDPOINT = '/account/decision-preferences';
const TOPIC_OPTIONS = Object.freeze([
  ['brand_preference', 'Marque préférée'],
  ['excluded_brand', 'Marque à éviter'],
  ['budget_preference', 'Budget ou limite'],
  ['usage_priority', 'Usage prioritaire'],
  ['feature_priority', 'Caractéristique prioritaire'],
  ['format_preference', 'Format préféré'],
  ['merchant_preference', 'Marchand préféré'],
  ['other_preference', 'Autre préférence'],
]);

function cleanText(value, limit = 240) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function topicLabel(topic) {
  const key = cleanText(topic, 64);
  const known = TOPIC_OPTIONS.find(([id]) => id === key);
  if (known) return known[1];
  return key ? key.replace(/_/g, ' ') : 'Préférence';
}

function normalizePreference(record) {
  if (!record || typeof record !== 'object') return null;
  const id = Number(record.id);
  const topic = cleanText(record.topic, 64);
  const value = cleanText(record.value, 240);
  const scope = cleanText(record.scope, 20);
  const category = cleanText(record.category, 120);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(topic) || !value) return null;
  if (scope !== 'global' && scope !== 'category') return null;
  if (scope === 'category' && !category) return null;
  if (scope === 'global' && category) return null;
  if (record.source !== 'explicit_user' || record.automaticUse !== false) return null;
  return Object.freeze({
    id,
    topic,
    value,
    scope,
    category: category || null,
    source: 'explicit_user',
    automaticUse: false,
    createdAt: cleanText(record.createdAt, 80),
    updatedAt: cleanText(record.updatedAt, 80),
  });
}

function normalizeListPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.authority !== 'explicit_user_only' || payload.automaticUse !== false) return null;
  if (!Array.isArray(payload.preferences)) return null;
  const preferences = payload.preferences.map(normalizePreference);
  if (preferences.some((item) => item === null)) return null;
  return Object.freeze({
    authority: 'explicit_user_only',
    automaticUse: false,
    preferences: Object.freeze(preferences),
  });
}

function buildWritePayload(input) {
  const source = input && typeof input === 'object' ? input : {};
  const topic = cleanText(source.topic, 64).toLowerCase();
  const value = cleanText(source.value, 240);
  const scope = cleanText(source.scope || 'global', 20);
  const category = cleanText(source.category, 120);
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(topic)) throw new TypeError('Thème de préférence invalide.');
  if (!value) throw new TypeError('La préférence ne peut pas être vide.');
  if (scope !== 'global' && scope !== 'category') throw new TypeError('Portée de préférence invalide.');
  if (scope === 'category' && !category) throw new TypeError('Indiquez la catégorie concernée.');
  return Object.freeze({ topic, value, scope, category: scope === 'category' ? category : null });
}

function fail(message) {
  throw new Error(`JULVOX-P5-EXPLICIT-PREFERENCES-UI-01 integration failed: ${message}`);
}

const RUNTIME_SCRIPT = `
<script id="${MARKER}-runtime">
(function julvoxP5ExplicitPreferencesUi(){
  'use strict';
  var MARKER=${JSON.stringify(MARKER)};
  var ENDPOINT=${JSON.stringify(ENDPOINT)};
  var TOPIC_OPTIONS=${JSON.stringify(TOPIC_OPTIONS)};
  ${cleanText.toString()}
  ${topicLabel.toString()}
  ${normalizePreference.toString()}
  ${normalizeListPayload.toString()}
  ${buildWritePayload.toString()}

  function node(tag,className,text){var item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=text;return item;}
  function token(){try{return typeof currentUser!=='undefined'&&currentUser&&typeof currentUser.token==='string'?currentUser.token.trim():'';}catch(_){return '';}}
  function api(){return window.JULVOX_API&&typeof window.JULVOX_API.get==='function'?window.JULVOX_API:null;}
  function statusText(root,message,isError){var target=root.querySelector('[data-p5-pref-status]');if(!target)return;target.textContent=message||'';target.style.color=isError?'#ff7b7b':'var(--txt3)';}
  function insertionPoint(body){var sections=Array.from(body.querySelectorAll('.account-section'));return sections.find(function(section){var title=section.querySelector('.account-section-title');return title&&/^Mes Alertes prix/.test(title.textContent||'');})||null;}
  function makeSelect(options,value){var select=node('select','p5-pref-input');options.forEach(function(pair){var option=node('option','',pair[1]);option.value=pair[0];select.appendChild(option);});select.value=value;return select;}
  function unknownTopicOption(select,topic){if(!topic||Array.from(select.options).some(function(option){return option.value===topic;}))return;var option=node('option','',topicLabel(topic));option.value=topic;select.appendChild(option);select.value=topic;}

  async function mountPreferences(){
    var body=document.getElementById('accountBody');
    var bearer=token();
    var client=api();
    if(!body||!bearer||!client)return;
    var previous=body.querySelector('[data-julvox-p5-explicit-preferences="true"]');if(previous)previous.remove();
    var section=node('div','account-section');section.setAttribute('data-julvox-p5-explicit-preferences','true');
    section.appendChild(node('div','account-section-title','Mes préférences mémorisées'));
    var intro=node('p','p5-pref-intro','Seules les préférences que vous choisissez d’enregistrer ici sont conservées. Elles ne sont pas utilisées automatiquement dans vos décisions pour le moment.');section.appendChild(intro);
    var controls=node('div','p5-pref-controls');var add=node('button','p5-pref-primary','Ajouter une préférence');add.type='button';controls.appendChild(add);section.appendChild(controls);
    var formHost=node('div','p5-pref-form-host');section.appendChild(formHost);
    var status=node('div','p5-pref-status','Chargement…');status.setAttribute('data-p5-pref-status','true');section.appendChild(status);
    var list=node('div','p5-pref-list');section.appendChild(list);
    var before=insertionPoint(body);if(before)body.insertBefore(section,before);else body.appendChild(section);

    function closeForm(){formHost.replaceChildren();}
    function renderForm(existing){
      closeForm();var form=node('form','p5-pref-form');
      var topicLabelEl=node('label','p5-pref-label','Type de préférence');var topicSelect=makeSelect(TOPIC_OPTIONS,existing?existing.topic:'brand_preference');unknownTopicOption(topicSelect,existing&&existing.topic);topicLabelEl.appendChild(topicSelect);form.appendChild(topicLabelEl);
      var valueLabel=node('label','p5-pref-label','Ce que vous voulez mémoriser');var valueInput=node('textarea','p5-pref-input');valueInput.rows=2;valueInput.maxLength=240;valueInput.placeholder='Ex. Je préfère Sony pour les téléviseurs';valueInput.value=existing?existing.value:'';valueLabel.appendChild(valueInput);form.appendChild(valueLabel);
      var scopeLabel=node('label','p5-pref-label','Portée');var scopeSelect=makeSelect([['global','Tous mes achats'],['category','Une catégorie seulement']],existing?existing.scope:'global');scopeLabel.appendChild(scopeSelect);form.appendChild(scopeLabel);
      var categoryLabel=node('label','p5-pref-label','Catégorie concernée');var categoryInput=node('input','p5-pref-input');categoryInput.type='text';categoryInput.maxLength=120;categoryInput.placeholder='Ex. téléviseurs';categoryInput.value=existing&&existing.category?existing.category:'';categoryLabel.appendChild(categoryInput);form.appendChild(categoryLabel);
      function syncCategory(){categoryLabel.hidden=scopeSelect.value!=='category';if(categoryLabel.hidden)categoryInput.value='';}scopeSelect.addEventListener('change',syncCategory);syncCategory();
      var actions=node('div','p5-pref-actions');var submit=node('button','p5-pref-primary',existing?'Enregistrer la modification':'Enregistrer cette préférence');submit.type='submit';var cancel=node('button','p5-pref-secondary','Annuler');cancel.type='button';cancel.addEventListener('click',closeForm);actions.append(submit,cancel);form.appendChild(actions);
      form.addEventListener('submit',async function(event){event.preventDefault();var payload;try{payload=buildWritePayload({topic:topicSelect.value,value:valueInput.value,scope:scopeSelect.value,category:categoryInput.value});}catch(error){statusText(section,error.message,true);return;}submit.disabled=true;statusText(section,existing?'Modification…':'Enregistrement…',false);var result=existing?await client.put(ENDPOINT+'/'+existing.id,payload,{token:bearer}):await client.post(ENDPOINT,payload,{token:bearer});submit.disabled=false;if(!result.ok){statusText(section,result.message||'La préférence n’a pas pu être enregistrée.',true);return;}closeForm();await load();});
      formHost.appendChild(form);valueInput.focus();
    }
    add.addEventListener('click',function(){renderForm(null);});

    function renderPreferences(preferences){
      list.replaceChildren();
      if(!preferences.length){statusText(section,'Aucune préférence mémorisée. Rien n’est enregistré sans votre action.',false);return;}
      statusText(section,preferences.length+' préférence'+(preferences.length>1?'s':'')+' mémorisée'+(preferences.length>1?'s':'')+' à votre demande.',false);
      preferences.forEach(function(preference){var card=node('div','p5-pref-card');var head=node('div','p5-pref-card-head');var title=node('strong','',topicLabel(preference.topic));var badge=node('span','p5-pref-badge','Mémorisée à votre demande');head.append(title,badge);card.appendChild(head);card.appendChild(node('div','p5-pref-value',preference.value));card.appendChild(node('div','p5-pref-meta',preference.scope==='category'?'Catégorie : '+preference.category:'Portée : tous mes achats'));
        var actions=node('div','p5-pref-actions');var edit=node('button','p5-pref-secondary','Modifier');edit.type='button';edit.addEventListener('click',function(){renderForm(preference);});var remove=node('button','p5-pref-danger','Supprimer');remove.type='button';remove.addEventListener('click',async function(){if(!window.confirm('Supprimer cette préférence mémorisée ?'))return;remove.disabled=true;statusText(section,'Suppression…',false);var result=await client.delete(ENDPOINT+'/'+preference.id,{token:bearer});remove.disabled=false;if(!result.ok){statusText(section,result.message||'La préférence n’a pas pu être supprimée.',true);return;}await load();});actions.append(edit,remove);card.appendChild(actions);list.appendChild(card);});
    }
    async function load(){statusText(section,'Chargement…',false);list.replaceChildren();var result=await client.get(ENDPOINT,{token:bearer});if(!result.ok){statusText(section,result.message||'Impossible de charger vos préférences.',true);return;}var normalized=normalizeListPayload(result.data);if(!normalized){statusText(section,'Le registre de préférences n’a pas fourni une autorité explicite vérifiable.',true);return;}renderPreferences(normalized.preferences);}
    await load();
  }

  var originalOpenAccountPage=window.openAccountPage;
  if(typeof originalOpenAccountPage!=='function')return;
  window.openAccountPage=async function(){var result=await originalOpenAccountPage.apply(this,arguments);await mountPreferences();return result;};
  window.JULVOX_P5_EXPLICIT_PREFERENCES_UI=Object.freeze({authority:'explicit_user_only',automaticUse:false,endpoint:ENDPOINT,mount:mountPreferences,marker:MARKER});
})();
</script>
<style id="${MARKER}-styles">
[data-julvox-p5-explicit-preferences="true"]{display:block}.p5-pref-intro{font-size:12px;line-height:1.5;color:var(--txt2);margin:6px 0 12px}.p5-pref-controls,.p5-pref-actions{display:flex;gap:8px;flex-wrap:wrap}.p5-pref-status{font-size:12px;color:var(--txt3);margin:10px 0}.p5-pref-list{display:grid;gap:10px}.p5-pref-card,.p5-pref-form{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px}.p5-pref-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.p5-pref-badge{font-size:10px;color:var(--green);background:rgba(0,208,132,.08);border:1px solid rgba(0,208,132,.18);border-radius:999px;padding:3px 7px;white-space:nowrap}.p5-pref-value{font-size:13px;line-height:1.45;margin:8px 0}.p5-pref-meta{font-size:11px;color:var(--txt3);margin-bottom:10px}.p5-pref-form{display:grid;gap:10px;margin:10px 0}.p5-pref-label{display:grid;gap:5px;font-size:11px;color:var(--txt2)}.p5-pref-input{width:100%;border:1px solid var(--border);border-radius:9px;background:var(--bg2);color:var(--txt);padding:9px 10px;font:inherit}.p5-pref-primary,.p5-pref-secondary,.p5-pref-danger{border-radius:9px;padding:8px 11px;font-size:12px;border:1px solid var(--border)}.p5-pref-primary{background:var(--accent);border-color:var(--accent);color:#fff}.p5-pref-secondary{background:var(--bg2);color:var(--txt2)}.p5-pref-danger{background:transparent;color:#ff7b7b;border-color:rgba(255,123,123,.3)}.p5-pref-primary:disabled,.p5-pref-secondary:disabled,.p5-pref-danger:disabled{opacity:.55;cursor:not-allowed}
</style>`;

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(`id="${MARKER}-runtime"`, 'g')) || []).length !== 1) fail('runtime marker must appear exactly once');
  if ((html.match(new RegExp(`id="${MARKER}-styles"`, 'g')) || []).length !== 1) fail('style marker must appear exactly once');
  for (const prerequisite of ['api-client.js', 'julvox-p5-conversation-resume-01', 'openAccountPage']) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const runtimeStart = html.indexOf(`id="${MARKER}-runtime"`);
  const runtimeEnd = html.indexOf('</script>', runtimeStart);
  const runtime = html.slice(runtimeStart, runtimeEnd);
  for (const required of [ENDPOINT, 'JULVOX_API', '.get(', '.post(', '.put(', '.delete(', 'explicit_user_only', 'automaticUse:false', 'window.confirm']) {
    if (!runtime.includes(required)) fail(`runtime is missing ${required}`);
  }
  for (const forbidden of ['localStorage', 'DecisionEngine', 'Gemini', 'score_preference', 'favorite_categories', '/ml/']) {
    if (runtime.includes(forbidden)) fail(`runtime contains forbidden authority ${forbidden}`);
  }
  if (!html.includes('Seules les préférences que vous choisissez d’enregistrer ici sont conservées.')) fail('explicit-memory explanation is missing');
  if (!html.includes('Elles ne sont pas utilisées automatiquement dans vos décisions pour le moment.')) fail('automatic-use warning is missing');
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(`id="${MARKER}-runtime"`)) return verify(html);
  for (const prerequisite of ['api-client.js', 'julvox-p5-conversation-resume-01', 'openAccountPage']) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const anchor = '</body>';
  const index = html.lastIndexOf(anchor);
  if (index < 0) fail('closing body tag is missing');
  html = `${html.slice(0, index)}${RUNTIME_SCRIPT}\n${html.slice(index)}`;
  return verify(html);
}

module.exports = {
  MARKER,
  ENDPOINT,
  TOPIC_OPTIONS,
  RUNTIME_SCRIPT,
  cleanText,
  topicLabel,
  normalizePreference,
  normalizeListPayload,
  buildWritePayload,
  integrate,
  verify,
};
