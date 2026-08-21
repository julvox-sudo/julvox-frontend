const MARKER = 'julvox-p5-structured-explainability-01-runtime';
const STYLE_ID = 'julvox-p5-structured-explainability-01-styles';

function clean(value, limit) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 1000);
}

function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const normalized = clean(value, 1000);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function evidenceDescriptions(rule) {
  return unique(
    (Array.isArray(rule && rule.evidence) ? rule.evidence : [])
      .map((item) => clean(item && item.description, 1000)),
  );
}

function extractReevaluation(reason) {
  const text = clean(reason, 1500);
  const marker = 'Réévaluation :';
  const index = text.indexOf(marker);
  if (index < 0) return '';
  return clean(text.slice(index + marker.length).replace(/[.!?;:\s]+$/g, ''), 1000);
}

function classifyDecisionExplanation(decision) {
  const source = decision && typeof decision === 'object' ? decision : {};
  const ruleResults = Array.isArray(source.ruleResults) ? source.ruleResults : [];
  const decisionReasons = unique(Array.isArray(source.reasons) ? source.reasons : []);

  const favorable = [];
  const unfavorable = [];
  const uncertainties = [];
  const changeConditions = [];
  const ruleReasonSet = new Set();

  for (const rawRule of ruleResults) {
    if (!rawRule || typeof rawRule !== 'object') continue;
    const reason = clean(rawRule.reason, 1000);
    if (reason) ruleReasonSet.add(reason);
    const item = {
      reason,
      evidence: evidenceDescriptions(rawRule),
    };

    if (rawRule.applicable === true) {
      const score = Number(rawRule.score);
      if (Number.isFinite(score) && score > 0) favorable.push(item);
      else if (Number.isFinite(score) && score < 0) unfavorable.push(item);
      else if (reason) uncertainties.push({ kind: 'neutral', reason });
      continue;
    }

    if (rawRule.applicable === false && reason) {
      uncertainties.push({ kind: 'not_applicable', reason });
      const reevaluation = extractReevaluation(reason);
      if (reevaluation) changeConditions.push(reevaluation);
    }
  }

  for (const reason of decisionReasons) {
    if (!ruleReasonSet.has(reason)) {
      uncertainties.push({ kind: 'decision', reason });
    }
  }

  return {
    favorable,
    unfavorable,
    uncertainties,
    changeConditions: unique(changeConditions),
    hasRuleResults: ruleResults.some((rule) => rule && typeof rule === 'object'),
  };
}

const STYLES = `
<style id="${STYLE_ID}">
.jvp5ex-wrap{display:grid;gap:14px}.jvp5ex-intro{margin:0;color:#5B6974;font-size:12px;line-height:1.55}.jvp5ex-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.jvp5ex-section{background:#fff;border:1px solid rgba(11,29,52,.09);border-radius:15px;padding:13px}.jvp5ex-section h3{margin:0 0 8px;font:700 13px/1.25 Sora,Inter,system-ui,sans-serif;color:#0B1D34}.jvp5ex-list{margin:0;padding-left:18px;color:#52616B;font-size:12px;line-height:1.55}.jvp5ex-list li+li{margin-top:7px}.jvp5ex-empty{margin:0;color:#75818A;font-size:12px;line-height:1.5}.jvp5ex-evidence{display:block;margin-top:4px;color:#75818A;font-size:11px;line-height:1.45}.jvp5ex-kind{font-weight:700;color:#52616B}.jvp5ex-change-note{margin:8px 0 0;color:#75818A;font-size:11px;line-height:1.5}
@media(max-width:760px){.jvp5ex-grid{grid-template-columns:1fr}.jvp5ex-section{padding:12px}}
</style>`;

const RUNTIME = String.raw`
<script id="${MARKER}">
(function julvoxP5StructuredExplainability01(){
  'use strict';
  ${clean.toString()}
  ${unique.toString()}
  ${evidenceDescriptions.toString()}
  ${extractReevaluation.toString()}
  ${classifyDecisionExplanation.toString()}

  function escapeHtml(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function token(){var direct=window.currentUser&&typeof window.currentUser.token==='string'?window.currentUser.token:'';if(direct.trim())return direct.trim();try{return clean(localStorage.getItem('token')||'',4096)}catch(_){return''}}
  function api(){return window.JULVOX_API&&typeof window.JULVOX_API.get==='function'?window.JULVOX_API:null}
  function panelFor(button,id){var card=button&&button.closest?button.closest('[data-jvp5dh-card]'):null;if(!card)return null;return card.querySelector('[data-jvp5dh-panel="'+CSS.escape(id)+'"]')}
  function renderItems(items,emptyText){if(!items.length)return'<p class="jvp5ex-empty">'+escapeHtml(emptyText)+'</p>';return'<ul class="jvp5ex-list">'+items.map(function(item){var reason=escapeHtml(item.reason||'Information enregistrée.');var evidence=Array.isArray(item.evidence)?item.evidence:[];var evidenceHtml=evidence.length?'<span class="jvp5ex-evidence">Preuves enregistrées : '+evidence.map(escapeHtml).join(' · ')+'</span>':'';return'<li>'+reason+evidenceHtml+'</li>'}).join('')+'</ul>'}
  function renderUncertainties(items){if(!items.length)return'<p class="jvp5ex-empty">Aucune limite explicite supplémentaire n’est enregistrée dans cet instantané.</p>';return'<ul class="jvp5ex-list">'+items.map(function(item){var prefix=item.kind==='neutral'?'Élément neutre : ':item.kind==='not_applicable'?'Règle non applicable : ':'';return'<li><span class="jvp5ex-kind">'+escapeHtml(prefix)+'</span>'+escapeHtml(item.reason||'')+'</li>'}).join('')+'</ul>'}
  function renderConditions(items){if(!items.length)return'<p class="jvp5ex-empty">Aucune condition de réévaluation explicite n’est enregistrée dans cet instantané.</p>';return'<ul class="jvp5ex-list">'+items.map(function(item){return'<li>'+escapeHtml(item)+'</li>'}).join('')+'</ul><p class="jvp5ex-change-note">Ces conditions peuvent justifier une nouvelle évaluation ; elles ne garantissent jamais que la décision changera.</p>'}
  function renderExplanation(decision){var explanation=classifyDecisionExplanation(decision);return'<div class="jvp5ex-wrap"><p class="jvp5ex-intro">Explication structurée de l’instantané enregistré. Julvox ne recalcule pas la décision et n’ajoute aucun motif absent des données persistées.</p><div class="jvp5ex-grid"><section class="jvp5ex-section"><h3>Pour</h3>'+renderItems(explanation.favorable,'Aucun élément favorable explicite dans les règles persistées.')+'</section><section class="jvp5ex-section"><h3>Contre</h3>'+renderItems(explanation.unfavorable,'Aucun élément défavorable explicite dans les règles persistées.')+'</section><section class="jvp5ex-section"><h3>Incertitudes</h3>'+renderUncertainties(explanation.uncertainties)+'</section><section class="jvp5ex-section"><h3>Ce qui ferait réévaluer la décision</h3>'+renderConditions(explanation.changeConditions)+'</section></div></div>'}

  async function loadStructuredDetail(id,button){
    var safeId=clean(id,80);if(!safeId||!button)return;var panel=panelFor(button,safeId);if(!panel)return;
    if(panel.dataset.p5ExplainabilityLoaded==='true'){panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));return}
    var accessToken=token();var client=api();panel.hidden=false;
    if(!accessToken||!client){panel.textContent='L’explication structurée n’est pas disponible dans cette session.';return}
    button.disabled=true;panel.textContent='Chargement de l’explication enregistrée…';
    try{var result=await client.get('/decisions/'+encodeURIComponent(safeId),{token:accessToken});if(!result||result.ok!==true||!result.data||typeof result.data!=='object'){panel.textContent='L’explication enregistrée n’est pas disponible pour le moment.';return}var decision=result.data.decision&&typeof result.data.decision==='object'?result.data.decision:{};panel.innerHTML=renderExplanation(decision);panel.dataset.p5ExplainabilityLoaded='true';panel.dataset.loaded='true';button.setAttribute('aria-expanded','true')}
    catch(_){panel.textContent='L’explication enregistrée n’est pas disponible pour le moment.'}finally{button.disabled=false}
  }

  document.addEventListener('click',function(event){var button=event.target.closest&&event.target.closest('[data-jvp5dh-detail]');if(!button)return;var history=document.getElementById('julvoxP5DecisionHistory');if(!history||!history.contains(button))return;event.preventDefault();event.stopPropagation();var id=button.getAttribute('data-jvp5dh-detail');loadStructuredDetail(id,button)},true);
})();
</script>`;

function fail(message) {
  throw new Error(`JULVOX-P5-STRUCTURED-EXPLAINABILITY-01 integration failed: ${message}`);
}

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(`id=["']${MARKER}["']`, 'g')) || []).length !== 1) fail('runtime marker must appear exactly once');
  if ((html.match(new RegExp(`id=["']${STYLE_ID}["']`, 'g')) || []).length !== 1) fail('style marker must appear exactly once');
  if (!html.includes('julvox-p5-decision-history-01-runtime')) fail('P5.1A decision history must be integrated first');
  if (!html.includes('julvox-p5-decision-timeline-01-runtime')) fail('P5.1B factual timeline must be integrated first');
  if (!html.includes("client.get('/decisions/'")) fail('structured explanation must read the canonical persisted snapshot endpoint');
  if (!html.includes('Ce qui ferait réévaluer la décision')) fail('explicit reevaluation section is required');
  if (!html.includes('elles ne garantissent jamais que la décision changera')) fail('reevaluation must not be presented as guaranteed decision change');
  const runtime = html.slice(html.indexOf(`<script id="${MARKER}">`));
  if (/client\.(post|put|patch|delete)\s*\(/i.test(runtime)) fail('structured explanation must remain read-only');
  if (/affiliate|commission|cashback/i.test(runtime)) fail('commercial influence is forbidden in structured explanation');
  if (/Gemini/i.test(runtime)) fail('Gemini must not become explanation authority in this lot');
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(`id="${MARKER}"`)) return verify(html);
  if (!html.includes('id="julvox-p5-decision-history-01-runtime"')) fail('P5.1A decision history must be integrated first');
  if (!html.includes('id="julvox-p5-decision-timeline-01-runtime"')) fail('P5.1B factual timeline must be integrated first');
  const headEnd = html.indexOf('</head>');
  const bodyEnd = html.lastIndexOf('</body>');
  if (headEnd < 0 || bodyEnd < 0) fail('HTML document boundaries are missing');
  html = `${html.slice(0, headEnd)}${STYLES}${html.slice(headEnd)}`;
  const updatedBodyEnd = html.lastIndexOf('</body>');
  html = `${html.slice(0, updatedBodyEnd)}${RUNTIME}${html.slice(updatedBodyEnd)}`;
  return verify(html);
}

module.exports = {
  MARKER,
  STYLE_ID,
  clean,
  extractReevaluation,
  classifyDecisionExplanation,
  integrate,
  verify,
};
