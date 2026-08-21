const MARKER = 'julvox-p5-decision-timeline-01-runtime';
const STYLE_ID = 'julvox-p5-decision-timeline-01-styles';

function clean(value, limit) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 500);
}

function recommendationLabel(value) {
  const labels = Object.freeze({
    insufficient_data: 'INFORMATIONS INSUFFISANTES',
    wait: 'ATTENDRE',
    observe: 'À OBSERVER',
    consider: 'À CONSIDÉRER',
    favorable: 'FAVORABLE',
  });
  return labels[clean(value, 40).toLowerCase()] || 'DÉCISION DISPONIBLE';
}

function confidenceLabel(value) {
  const labels = Object.freeze({
    none: 'Non déterminée',
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Élevée',
  });
  return labels[clean(value, 40).toLowerCase()] || 'Non précisée';
}

function timelineTimestamp(item) {
  const raw = item && (item.observedAt || item.createdAt);
  const parsed = Date.parse(clean(raw, 100));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function normalizeTimelineItems(items, subjectId) {
  const subject = clean(subjectId, 255);
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === 'object' && clean(item.subjectId, 255) === subject)
    .filter((item) => {
      const id = clean(item.decisionId, 80);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice()
    .sort((left, right) => {
      const timeDiff = timelineTimestamp(left) - timelineTimestamp(right);
      if (timeDiff !== 0) return timeDiff;
      return clean(left.decisionId, 80).localeCompare(clean(right.decisionId, 80));
    });
}

function decisionFromSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const decision = snapshot.decision;
  if (!decision || typeof decision !== 'object') return null;
  const context = decision.context;
  if (!context || typeof context !== 'object') return null;
  return { decision, context };
}

function comparablePrice(snapshot) {
  const data = decisionFromSnapshot(snapshot);
  if (!data) return null;
  const facts = data.context.facts;
  if (!facts || typeof facts !== 'object') return null;
  const price = facts.pricePosition || facts.price_position;
  if (!price || typeof price !== 'object') return null;
  const amount = price.currentTotalMinor ?? price.current_total_minor;
  const currency = clean(price.currency, 3).toUpperCase();
  const market = clean(price.market, 2).toUpperCase();
  const condition = clean(price.condition, 30).toLowerCase();
  const basis = clean(price.priceBasis ?? price.price_basis, 40).toLowerCase();
  if (!Number.isInteger(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  if (!/^[A-Z]{2}$/.test(market) || !condition || basis !== 'total_payable') return null;
  return { amount, currency, market, condition, basis };
}

function compareSnapshots(previousSnapshot, currentSnapshot) {
  const previous = decisionFromSnapshot(previousSnapshot);
  const current = decisionFromSnapshot(currentSnapshot);
  if (!previous || !current) {
    return { status: 'UNKNOWN', changes: [], reason: 'SNAPSHOT_UNAVAILABLE' };
  }
  const previousSubject = clean(previous.context.subjectId ?? previous.context.subject_id, 255);
  const currentSubject = clean(current.context.subjectId ?? current.context.subject_id, 255);
  if (!previousSubject || previousSubject !== currentSubject) {
    return { status: 'UNKNOWN', changes: [], reason: 'SUBJECT_MISMATCH' };
  }

  const changes = [];
  const previousRecommendation = clean(previous.decision.recommendation, 40).toLowerCase();
  const currentRecommendation = clean(current.decision.recommendation, 40).toLowerCase();
  if (previousRecommendation && currentRecommendation && previousRecommendation !== currentRecommendation) {
    changes.push({
      type: 'DECISION_CHANGED',
      from: previousRecommendation,
      to: currentRecommendation,
    });
  }

  const previousConfidence = clean(previous.decision.confidence, 40).toLowerCase();
  const currentConfidence = clean(current.decision.confidence, 40).toLowerCase();
  if (previousConfidence && currentConfidence && previousConfidence !== currentConfidence) {
    changes.push({
      type: 'CONFIDENCE_CHANGED',
      from: previousConfidence,
      to: currentConfidence,
    });
  }

  const previousPrice = comparablePrice(previousSnapshot);
  const currentPrice = comparablePrice(currentSnapshot);
  if (Boolean(previousPrice) !== Boolean(currentPrice)) {
    changes.push({
      type: 'MISSING_DATA_CHANGED',
      field: 'pricePosition',
      fromAvailable: Boolean(previousPrice),
      toAvailable: Boolean(currentPrice),
    });
  } else if (previousPrice && currentPrice) {
    const sameContext = previousPrice.currency === currentPrice.currency
      && previousPrice.market === currentPrice.market
      && previousPrice.condition === currentPrice.condition
      && previousPrice.basis === currentPrice.basis;
    if (sameContext && previousPrice.amount !== currentPrice.amount) {
      changes.push({
        type: 'PRICE_CHANGED',
        fromMinor: previousPrice.amount,
        toMinor: currentPrice.amount,
        currency: currentPrice.currency,
        market: currentPrice.market,
        condition: currentPrice.condition,
      });
    }
  }

  const hasComparableFact = changes.some((change) => change.type === 'PRICE_CHANGED' || change.type === 'MISSING_DATA_CHANGED');
  return {
    status: hasComparableFact ? 'FACTUAL_DIFF' : 'UNKNOWN',
    changes,
    reason: hasComparableFact ? null : 'NO_SUPPORTED_COMPARABLE_FACT_CHANGE',
  };
}

const STYLES = `
<style id="${STYLE_ID}">
#julvoxP5DecisionTimeline[hidden]{display:none!important}
#julvoxP5DecisionTimeline{position:fixed;inset:0;z-index:96;overflow:auto;background:#FCF9F4;color:#162536;padding:max(22px,env(safe-area-inset-top)) 18px max(28px,env(safe-area-inset-bottom));font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.jvp5dt-shell{width:min(860px,100%);margin:0 auto}.jvp5dt-head{display:flex;align-items:center;gap:14px;margin-bottom:22px}.jvp5dt-back,.jvp5dt-open,.jvp5dt-retry{border:1px solid rgba(11,29,52,.12);background:#fff;border-radius:12px;padding:10px 13px;color:#0B1D34;font:650 13px/1 Inter,system-ui,sans-serif;cursor:pointer}.jvp5dt-back:focus-visible,.jvp5dt-open:focus-visible,.jvp5dt-retry:focus-visible{outline:3px solid rgba(14,167,161,.25);outline-offset:2px}.jvp5dt-title{margin:0;font:650 28px/1.15 Sora,Inter,system-ui,sans-serif;letter-spacing:-.5px;color:#0B1D34}.jvp5dt-subject{margin:0 0 18px;color:#5B6974;font-size:14px;line-height:1.55;overflow-wrap:anywhere}.jvp5dt-summary{margin-top:20px;padding:18px;background:#F4F0E8;border:1px solid rgba(11,29,52,.08);border-radius:18px}.jvp5dt-summary h2{margin:0 0 8px;font:650 18px/1.25 Sora,Inter,system-ui,sans-serif;color:#0B1D34}.jvp5dt-summary p{margin:0;color:#5B6974;font-size:13px;line-height:1.55}.jvp5dt-subjects{display:grid;gap:9px;margin-top:12px}.jvp5dt-subject-row{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fffdf9;border:1px solid rgba(11,29,52,.08);border-radius:14px;padding:12px}.jvp5dt-subject-name{min-width:0;color:#273849;font-size:13px;line-height:1.4;overflow-wrap:anywhere}.jvp5dt-subject-count{display:block;color:#75818A;font-size:11px;margin-top:3px}.jvp5dt-state{background:#fffdf9;border:1px solid rgba(11,29,52,.10);border-radius:18px;padding:18px;color:#5B6974;line-height:1.55}.jvp5dt-list{display:grid;gap:14px}.jvp5dt-entry{position:relative;background:#fffdf9;border:1px solid rgba(11,29,52,.10);border-radius:18px;padding:17px}.jvp5dt-entry-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.jvp5dt-verdict{font:700 14px/1.25 Sora,Inter,system-ui,sans-serif;color:#0B1D34}.jvp5dt-date{font-size:12px;color:#75818A;white-space:nowrap}.jvp5dt-confidence{margin-top:8px;color:#52616B;font-size:12px}.jvp5dt-diff{margin-top:13px;padding-top:12px;border-top:1px solid rgba(11,29,52,.08);font-size:12px;line-height:1.55;color:#52616B}.jvp5dt-diff strong{color:#273849}.jvp5dt-changes{margin:7px 0 0;padding-left:19px}.jvp5dt-changes li+li{margin-top:5px}.jvp5dt-unknown{margin-top:7px;color:#75818A}.jvp5dt-note{margin-top:18px;color:#75818A;font-size:12px;line-height:1.55}
@media(max-width:760px){#julvoxP5DecisionTimeline{padding:calc(14px + env(safe-area-inset-top)) 12px calc(18px + env(safe-area-inset-bottom))}.jvp5dt-title{font-size:23px}.jvp5dt-subject-row{align-items:flex-start;flex-direction:column}.jvp5dt-entry-top{display:block}.jvp5dt-date{display:block;margin-top:5px}}
@media(prefers-reduced-motion:reduce){#julvoxP5DecisionTimeline *{scroll-behavior:auto!important;transition:none!important}}
</style>`;

const RUNTIME = String.raw`
<script id="${MARKER}">
(function julvoxP5DecisionTimeline01(){
  'use strict';
  ${clean.toString()}
  ${recommendationLabel.toString()}
  ${confidenceLabel.toString()}
  ${timelineTimestamp.toString()}
  ${normalizeTimelineItems.toString()}
  ${decisionFromSnapshot.toString()}
  ${comparablePrice.toString()}
  ${compareSnapshots.toString()}

  var root=document.getElementById('julvoxDecisionHome');if(!root)return;
  var summaryLoading=false;var timelineTrigger=null;
  function escapeHtml(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function token(){var direct=window.currentUser&&typeof window.currentUser.token==='string'?window.currentUser.token:'';if(direct.trim())return direct.trim();try{return clean(localStorage.getItem('token')||'',4096)}catch(_){return''}}
  function api(){return window.JULVOX_API&&typeof window.JULVOX_API.get==='function'?window.JULVOX_API:null}
  function formatDate(value){var text=clean(value,80);if(!text)return'Date non disponible';var date=new Date(text);if(Number.isNaN(date.getTime()))return'Date non disponible';try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(date)}catch(_){return date.toLocaleDateString('fr-FR')}}
  function formatMinor(value,currency){try{var formatter=new Intl.NumberFormat('fr-FR',{style:'currency',currency:currency});var digits=formatter.resolvedOptions().maximumFractionDigits;return formatter.format(value/Math.pow(10,digits))}catch(_){return String(value)+' unités mineures '+clean(currency,3)}}

  function timelinePage(){var existing=document.getElementById('julvoxP5DecisionTimeline');if(existing)return existing;var node=document.createElement('section');node.id='julvoxP5DecisionTimeline';node.hidden=true;node.setAttribute('aria-hidden','true');node.setAttribute('aria-labelledby','julvoxP5DecisionTimelineTitle');node.innerHTML='<div class="jvp5dt-shell"><div class="jvp5dt-head"><button class="jvp5dt-back" type="button" data-jvp5dt-close>← Mes décisions</button><h1 class="jvp5dt-title" id="julvoxP5DecisionTimelineTitle">Évolution de la décision</h1></div><p class="jvp5dt-subject" id="julvoxP5DecisionTimelineSubject"></p><div id="julvoxP5DecisionTimelineBody" aria-live="polite"></div><p class="jvp5dt-note">Julvox compare ici uniquement des instantanés réellement enregistrés. Une différence observée n’est jamais présentée comme la cause d’un changement de décision.</p></div>';root.appendChild(node);node.querySelector('[data-jvp5dt-close]').addEventListener('click',closeTimeline);return node}
  function timelineBody(){timelinePage();return document.getElementById('julvoxP5DecisionTimelineBody')}
  function timelineState(title,text){var target=timelineBody();target.innerHTML='<div class="jvp5dt-state"><strong>'+escapeHtml(title)+'</strong><div>'+escapeHtml(text)+'</div></div>'}
  function closeTimeline(){var node=timelinePage();node.hidden=true;node.setAttribute('aria-hidden','true');if(timelineTrigger&&typeof timelineTrigger.focus==='function')timelineTrigger.focus()}

  function changeText(change){if(!change||typeof change!=='object')return'';if(change.type==='DECISION_CHANGED')return'Décision : '+recommendationLabel(change.from)+' → '+recommendationLabel(change.to);if(change.type==='CONFIDENCE_CHANGED')return'Confiance : '+confidenceLabel(change.from)+' → '+confidenceLabel(change.to);if(change.type==='PRICE_CHANGED')return'Prix total observé : '+formatMinor(change.fromMinor,change.currency)+' → '+formatMinor(change.toMinor,change.currency);if(change.type==='MISSING_DATA_CHANGED'&&change.field==='pricePosition')return change.toAvailable?'Un instantané de prix comparable est désormais disponible.':'L’instantané de prix comparable n’est plus disponible.';return''}
  function renderTimeline(subject,items,snapshots){var target=timelineBody();if(!items.length){timelineState('Historique indisponible','Aucune décision persistée n’est disponible pour cette référence.');return}var snapshotById={};snapshots.forEach(function(entry){if(entry&&entry.id)snapshotById[entry.id]=entry.snapshot});target.innerHTML='<div class="jvp5dt-list">'+items.map(function(item,index){var id=clean(item.decisionId,80);var currentSnapshot=snapshotById[id]||null;var observed=item.observedAt||item.createdAt;var diffHtml='';if(index===0){diffHtml='<div class="jvp5dt-diff"><strong>Point de départ de cet historique.</strong></div>'}else{var previousId=clean(items[index-1].decisionId,80);var comparison=compareSnapshots(snapshotById[previousId]||null,currentSnapshot);var visible=(comparison.changes||[]).map(changeText).filter(Boolean);var factVisible=(comparison.changes||[]).some(function(change){return change.type==='PRICE_CHANGED'||change.type==='MISSING_DATA_CHANGED'});diffHtml='<div class="jvp5dt-diff"><strong>Depuis la décision précédente</strong>'+(visible.length?'<ul class="jvp5dt-changes">'+visible.map(function(text){return'<li>'+escapeHtml(text)+'</li>'}).join('')+'</ul>':'')+(!factVisible?'<div class="jvp5dt-unknown">Ce qui a changé dans les faits : information indisponible avec les instantanés comparables pris en charge.</div>':'')+'</div>'}return'<article class="jvp5dt-entry"><div class="jvp5dt-entry-top"><div class="jvp5dt-verdict">'+escapeHtml(recommendationLabel(item.recommendation))+'</div><time class="jvp5dt-date">'+escapeHtml(formatDate(observed))+'</time></div><div class="jvp5dt-confidence">Confiance : '+escapeHtml(confidenceLabel(item.confidence))+'</div>'+diffHtml+'</article>'}).join('')+'</div>'}

  async function loadTimeline(subject,trigger){var safeSubject=clean(subject,255);if(!safeSubject)return;var accessToken=token();var client=api();timelineTrigger=trigger||document.activeElement;var node=timelinePage();node.hidden=false;node.setAttribute('aria-hidden','false');document.getElementById('julvoxP5DecisionTimelineSubject').textContent='Référence analysée : '+safeSubject;if(!accessToken||!client){timelineState('Historique indisponible','Une session authentifiée Julvox est nécessaire pour comparer les décisions.');return}timelineState('Chargement','Julvox relit les instantanés persistés de cette référence.');try{var historyResult=await client.get('/decisions?limit=20&subjectId='+encodeURIComponent(safeSubject),{token:accessToken});if(!historyResult||historyResult.ok!==true){timelineState('Historique indisponible','Impossible de récupérer les décisions de cette référence pour le moment.');return}var payload=historyResult.data&&typeof historyResult.data==='object'?historyResult.data:{};var items=normalizeTimelineItems(Array.isArray(payload.items)?payload.items:[],safeSubject);var snapshots=[];for(var i=0;i<items.length;i+=1){var id=clean(items[i].decisionId,80);if(!id)continue;try{var detail=await client.get('/decisions/'+encodeURIComponent(id),{token:accessToken});snapshots.push({id:id,snapshot:detail&&detail.ok===true&&detail.data&&typeof detail.data==='object'?detail.data:null})}catch(_){snapshots.push({id:id,snapshot:null})}}renderTimeline(safeSubject,items,snapshots)}catch(_){timelineState('Historique indisponible','Impossible de comparer les décisions pour le moment.')}}

  function summaryNode(){var existing=document.getElementById('julvoxP5DecisionTimelineSummary');if(existing)return existing;var history=document.getElementById('julvoxP5DecisionHistory');if(!history)return null;var shell=history.querySelector('.jvp5dh-shell');if(!shell)return null;var node=document.createElement('section');node.id='julvoxP5DecisionTimelineSummary';node.className='jvp5dt-summary';node.innerHTML='<h2>Évolution dans le temps</h2><p>Quand plusieurs décisions existent pour la même référence, Julvox peut les remettre dans l’ordre sans inventer pourquoi elles ont changé.</p><div data-jvp5dt-summary-body></div>';var note=shell.querySelector('.jvp5dh-note');if(note)shell.insertBefore(node,note);else shell.appendChild(node);node.addEventListener('click',function(event){var button=event.target.closest&&event.target.closest('[data-jvp5dt-open]');if(button)loadTimeline(button.getAttribute('data-jvp5dt-open'),button)});return node}
  function renderSummary(items){var node=summaryNode();if(!node)return;var body=node.querySelector('[data-jvp5dt-summary-body]');var groups={};(Array.isArray(items)?items:[]).forEach(function(item){var subject=clean(item&&item.subjectId,255);if(!subject)return;if(!groups[subject])groups[subject]=0;groups[subject]+=1});var subjects=Object.keys(groups).filter(function(subject){return groups[subject]>=2}).sort(function(a,b){return a.localeCompare(b,'fr')});if(!subjects.length){body.innerHTML='<p style="margin-top:10px">Aucune référence n’a encore plusieurs décisions dans l’historique récent.</p>';return}body.innerHTML='<div class="jvp5dt-subjects">'+subjects.map(function(subject){return'<div class="jvp5dt-subject-row"><div class="jvp5dt-subject-name">'+escapeHtml(subject)+'<span class="jvp5dt-subject-count">'+groups[subject]+' décisions enregistrées</span></div><button class="jvp5dt-open" type="button" data-jvp5dt-open="'+escapeHtml(subject)+'">Voir l’évolution</button></div>'}).join('')+'</div>'}
  async function loadSummary(){if(summaryLoading)return;var history=document.getElementById('julvoxP5DecisionHistory');if(!history||history.hidden)return;var node=summaryNode();if(!node)return;var body=node.querySelector('[data-jvp5dt-summary-body]');var accessToken=token();var client=api();if(!accessToken||!client){body.innerHTML='<p style="margin-top:10px">Connecte-toi pour retrouver l’évolution de tes décisions.</p>';return}summaryLoading=true;body.innerHTML='<p style="margin-top:10px">Recherche des références suivies dans ton historique…</p>';try{var result=await client.get('/decisions?limit=100',{token:accessToken});if(!result||result.ok!==true){body.innerHTML='<p style="margin-top:10px">Évolution indisponible pour le moment.</p>';return}var payload=result.data&&typeof result.data==='object'?result.data:{};renderSummary(Array.isArray(payload.items)?payload.items:[])}catch(_){body.innerHTML='<p style="margin-top:10px">Évolution indisponible pour le moment.</p>'}finally{summaryLoading=false}}

  document.addEventListener('click',function(event){var trigger=event.target.closest&&event.target.closest('[data-home-action="decisions"]');if(trigger)window.setTimeout(loadSummary,0)},true);
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!timelinePage().hidden){event.preventDefault();closeTimeline()}},true);
})();
</script>`;

function fail(message) {
  throw new Error(`JULVOX-P5-DECISION-TIMELINE-01 integration failed: ${message}`);
}

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(`id=["']${MARKER}["']`, 'g')) || []).length !== 1) fail('runtime marker must appear exactly once');
  if ((html.match(new RegExp(`id=["']${STYLE_ID}["']`, 'g')) || []).length !== 1) fail('style marker must appear exactly once');
  if (!html.includes('julvox-p5-decision-history-01-runtime')) fail('P5.1A decision history must be integrated first');
  if (!html.includes("client.get('/decisions?limit=100'")) fail('summary must read authenticated canonical history');
  if (!html.includes("client.get('/decisions?limit=20&subjectId='")) fail('timeline must use canonical subject-filtered history');
  if (!html.includes("client.get('/decisions/'")) fail('timeline must read canonical persisted snapshots');
  if (!html.includes('Ce qui a changé dans les faits : information indisponible')) fail('UNKNOWN factual diff state is required');
  if (!html.includes('Une différence observée n’est jamais présentée comme la cause')) fail('causality disclaimer is required');
  const runtime = html.slice(html.indexOf(`<script id="${MARKER}">`));
  if (/client\.(post|put|patch|delete)\s*\(/i.test(runtime)) fail('timeline must remain read-only');
  if (/affiliate|commission|cashback/i.test(runtime)) fail('commercial influence is forbidden in the timeline');
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(`id="${MARKER}"`)) return verify(html);
  if (!html.includes('id="julvox-p5-decision-history-01-runtime"')) fail('P5.1A decision history must be integrated first');
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
  recommendationLabel,
  confidenceLabel,
  normalizeTimelineItems,
  comparablePrice,
  compareSnapshots,
  integrate,
  verify,
};
