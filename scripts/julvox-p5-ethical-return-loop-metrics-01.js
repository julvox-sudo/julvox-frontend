const MARKER = 'julvox-p5-ethical-return-loop-metrics-01';
const ENDPOINT = '/account/p5-metrics';

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function normalizeMetricsPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const loop = payload.returnLoop;
  const privacy = payload.privacy;
  const metrics = payload.metrics;
  if (!loop || typeof loop !== 'object' || !privacy || typeof privacy !== 'object' || !metrics || typeof metrics !== 'object') return null;

  if (loop.authority !== 'descriptive_explicit_user_facts_only') return null;
  if (loop.interpretation !== 'descriptive_counts_only') return null;
  for (const key of [
    'automaticFeedbackUse',
    'automaticPreferenceUse',
    'automaticRecheck',
    'feedbackLearning',
    'decisionEngineInfluence',
    'geminiInfluence',
    'opaqueScore',
    'commercialRanking',
  ]) {
    if (loop[key] !== false) return null;
  }

  if (privacy.scope !== 'authenticated_user_only') return null;
  for (const key of ['newBehavioralTelemetry', 'newPersistence', 'commentsExposed']) {
    if (privacy[key] !== false) return null;
  }

  const feedback = metrics.explicitFeedback;
  const watches = metrics.decisionWatches;
  if (!feedback || typeof feedback !== 'object' || !watches || typeof watches !== 'object') return null;
  const counts = [
    metrics.decisionSnapshots,
    metrics.explicitPreferences,
    feedback.total,
    feedback.helpful,
    feedback.notHelpful,
    feedback.withComment,
    watches.total,
    watches.active,
    watches.pendingChange,
  ];
  if (!counts.every(isCount)) return null;
  if (feedback.helpful + feedback.notHelpful > feedback.total) return null;
  if (feedback.withComment > feedback.total) return null;
  if (watches.active > watches.total || watches.pendingChange > watches.active) return null;

  return Object.freeze({
    metrics: Object.freeze({
      decisionSnapshots: metrics.decisionSnapshots,
      explicitPreferences: metrics.explicitPreferences,
      explicitFeedback: Object.freeze({
        total: feedback.total,
        helpful: feedback.helpful,
        notHelpful: feedback.notHelpful,
        withComment: feedback.withComment,
      }),
      decisionWatches: Object.freeze({
        total: watches.total,
        active: watches.active,
        pendingChange: watches.pendingChange,
      }),
    }),
    returnLoop: Object.freeze({
      authority: loop.authority,
      interpretation: loop.interpretation,
      automaticFeedbackUse: false,
      automaticPreferenceUse: false,
      automaticRecheck: false,
      feedbackLearning: false,
      decisionEngineInfluence: false,
      geminiInfluence: false,
      opaqueScore: false,
      commercialRanking: false,
    }),
    privacy: Object.freeze({
      scope: privacy.scope,
      newBehavioralTelemetry: false,
      newPersistence: false,
      commentsExposed: false,
    }),
  });
}

function fail(message) {
  throw new Error(`JULVOX-P5-ETHICAL-RETURN-LOOP-METRICS-01 integration failed: ${message}`);
}

const RUNTIME_SCRIPT = `
<script id="${MARKER}-runtime">
(function julvoxP5EthicalReturnLoopMetrics(){
  'use strict';
  var MARKER=${JSON.stringify(MARKER)};
  var ENDPOINT=${JSON.stringify(ENDPOINT)};
  ${isCount.toString()}
  ${normalizeMetricsPayload.toString()}

  function node(tag,className,text){var item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=text;return item;}
  function token(){try{return typeof currentUser!=='undefined'&&currentUser&&typeof currentUser.token==='string'?currentUser.token.trim():'';}catch(_){return '';}}
  function api(){return window.JULVOX_API&&typeof window.JULVOX_API.get==='function'?window.JULVOX_API:null;}
  function statusText(root,message,isError){var target=root.querySelector('[data-p5-metrics-status]');if(!target)return;target.textContent=message||'';target.style.color=isError?'#ff7b7b':'var(--txt3)';}
  function addMetric(grid,label,value,detail){var card=node('div','p5-metrics-card');card.appendChild(node('div','p5-metrics-value',String(value)));card.appendChild(node('div','p5-metrics-label',label));if(detail)card.appendChild(node('div','p5-metrics-detail',detail));grid.appendChild(card);}
  function insertSection(body,section){var preferences=body.querySelector('[data-julvox-p5-explicit-preferences="true"]');if(preferences&&preferences.parentNode){preferences.insertAdjacentElement('afterend',section);return;}var first=body.querySelector('.account-section');if(first&&first.parentNode){first.parentNode.insertBefore(section,first.nextSibling);return;}body.appendChild(section);}

  async function mountMetrics(){
    var body=document.getElementById('accountBody');
    var bearer=token();
    var client=api();
    if(!body||!bearer||!client)return;
    var previous=body.querySelector('[data-julvox-p5-ethical-metrics="true"]');if(previous)previous.remove();
    var section=node('div','account-section p5-metrics-section');section.setAttribute('data-julvox-p5-ethical-metrics','true');
    section.appendChild(node('div','account-section-title','Mon bilan de transparence'));
    section.appendChild(node('p','p5-metrics-intro','Ces chiffres résument uniquement des éléments déjà présents dans votre espace Julvox. Ils ne constituent ni une note de performance, ni un score d’achat.'));
    var status=node('div','p5-metrics-status','Chargement du bilan…');status.setAttribute('data-p5-metrics-status','true');section.appendChild(status);
    var grid=node('div','p5-metrics-grid');section.appendChild(grid);
    var guard=node('div','p5-metrics-guard');guard.appendChild(node('strong','','Ce que Julvox ne fait pas avec ce bilan'));var guardList=node('ul','p5-metrics-list');
    ['Votre feedback ne réentraîne pas Julvox automatiquement.','Vos préférences mémorisées ne sont pas appliquées silencieusement à vos décisions.','Aucune réévaluation de décision n’est déclenchée par ce bilan.','Consulter cette section ne crée aucun suivi comportemental supplémentaire.'].forEach(function(text){guardList.appendChild(node('li','',text));});guard.appendChild(guardList);section.appendChild(guard);
    insertSection(body,section);

    var result=await client.get(ENDPOINT,{token:bearer});
    if(!result.ok){statusText(section,result.message||'Impossible de charger le bilan de transparence.',true);return;}
    var normalized=normalizeMetricsPayload(result.data);
    if(!normalized){statusText(section,'Le bilan n’a pas fourni les garanties de transparence attendues. Aucune donnée n’est affichée.',true);return;}
    var m=normalized.metrics;grid.replaceChildren();
    addMetric(grid,'Décisions enregistrées',m.decisionSnapshots,'Instantanés de décision canoniques');
    addMetric(grid,'Préférences mémorisées',m.explicitPreferences,'Enregistrées explicitement à votre demande');
    addMetric(grid,'Retours explicites',m.explicitFeedback.total,m.explicitFeedback.helpful+' utiles · '+m.explicitFeedback.notHelpful+' à améliorer');
    addMetric(grid,'Surveillances actives',m.decisionWatches.active,m.decisionWatches.pendingChange+' changement'+(m.decisionWatches.pendingChange>1?'s':'')+' à vérifier');
    statusText(section,'Bilan descriptif chargé. Aucun commentaire de feedback n’est affiché ici.',false);
  }

  var originalOpenAccountPage=window.openAccountPage;
  if(typeof originalOpenAccountPage!=='function')return;
  window.openAccountPage=async function(){var result=await originalOpenAccountPage.apply(this,arguments);await mountMetrics();return result;};
  window.JULVOX_P5_ETHICAL_RETURN_LOOP_METRICS=Object.freeze({authority:'descriptive_explicit_user_facts_only',interpretation:'descriptive_counts_only',endpoint:ENDPOINT,mount:mountMetrics,newBehavioralTelemetry:false,newPersistence:false});
})();
</script>
<style id="${MARKER}-styles">
[data-julvox-p5-ethical-metrics="true"]{display:block}.p5-metrics-intro{font-size:12px;line-height:1.5;color:var(--txt2);margin:6px 0 12px}.p5-metrics-status{font-size:12px;color:var(--txt3);margin:8px 0 12px}.p5-metrics-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.p5-metrics-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:11px}.p5-metrics-value{font-size:20px;font-weight:800;line-height:1.1}.p5-metrics-label{font-size:11px;font-weight:700;margin-top:5px}.p5-metrics-detail{font-size:10px;line-height:1.4;color:var(--txt3);margin-top:4px}.p5-metrics-guard{margin-top:12px;padding:11px;border:1px solid var(--border);border-radius:12px;background:var(--bg3);font-size:11px;line-height:1.45}.p5-metrics-list{margin:7px 0 0;padding-left:18px;color:var(--txt2)}.p5-metrics-list li+li{margin-top:4px}@media(max-width:520px){.p5-metrics-grid{grid-template-columns:1fr}}
</style>`;

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(`id="${MARKER}-runtime"`, 'g')) || []).length !== 1) fail('runtime marker must appear exactly once');
  if ((html.match(new RegExp(`id="${MARKER}-styles"`, 'g')) || []).length !== 1) fail('style marker must appear exactly once');
  for (const prerequisite of ['api-client.js', 'julvox-p5-personalized-comparison-alternatives-01-runtime', 'openAccountPage']) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const runtimeStart = html.indexOf(`id="${MARKER}-runtime"`);
  const runtimeEnd = html.indexOf('</script>', runtimeStart);
  const runtime = html.slice(runtimeStart, runtimeEnd);
  for (const required of [ENDPOINT, 'JULVOX_API', '.get(', 'descriptive_explicit_user_facts_only', 'descriptive_counts_only', 'newBehavioralTelemetry:false', 'newPersistence:false']) {
    if (!runtime.includes(required)) fail(`runtime is missing ${required}`);
  }
  for (const forbidden of ['fetch(', 'localStorage', 'DecisionEngine', 'Gemini', '/ml/', 'affiliate_url', 'deal_quality_score', 'target_price', 'setInterval(', 'navigator.sendBeacon', 'conversionRate', 'helpfulnessRate', 'successRate']) {
    if (runtime.includes(forbidden)) fail(`runtime contains forbidden authority ${forbidden}`);
  }
  if (!html.includes('ne réentraîne pas Julvox automatiquement')) fail('feedback-learning disclosure is missing');
  if (!html.includes('ne crée aucun suivi comportemental supplémentaire')) fail('telemetry disclosure is missing');
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(`id="${MARKER}-runtime"`)) return verify(html);
  if (!html.includes('julvox-p5-personalized-comparison-alternatives-01-runtime')) fail('P5.8 comparison prerequisite is missing');
  const closingBody = html.lastIndexOf('</body>');
  if (closingBody < 0) fail('closing body is missing');
  html = `${html.slice(0, closingBody)}${RUNTIME_SCRIPT}\n${html.slice(closingBody)}`;
  return verify(html);
}

module.exports = {
  ENDPOINT,
  MARKER,
  RUNTIME_SCRIPT,
  integrate,
  isCount,
  normalizeMetricsPayload,
  verify,
};
