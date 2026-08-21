const MARKER = 'julvox-p5-decision-history-01-runtime';
const STYLE_ID = 'julvox-p5-decision-history-01-styles';

function decisionRecommendationLabel(value) {
  const labels = Object.freeze({
    insufficient_data: 'INFORMATIONS INSUFFISANTES',
    wait: 'ATTENDRE',
    observe: 'À OBSERVER',
    consider: 'À CONSIDÉRER',
    favorable: 'FAVORABLE',
  });
  return labels[String(value || '').trim().toLowerCase()] || 'DÉCISION DISPONIBLE';
}

const STYLES = `
<style id="${STYLE_ID}">
#julvoxP5DecisionHistory[hidden]{display:none!important}
#julvoxP5DecisionHistory{position:fixed;inset:0;z-index:95;overflow:auto;background:#FCF9F4;color:#162536;padding:max(22px,env(safe-area-inset-top)) 18px max(28px,env(safe-area-inset-bottom));font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.jvp5dh-shell{width:min(860px,100%);margin:0 auto}
.jvp5dh-head{display:flex;align-items:center;gap:14px;margin-bottom:22px}
.jvp5dh-back,.jvp5dh-retry,.jvp5dh-detail,.jvp5dh-login{border:1px solid rgba(11,29,52,.12);background:#fff;border-radius:12px;padding:10px 13px;color:#0B1D34;font:650 13px/1 Inter,system-ui,sans-serif;cursor:pointer}
.jvp5dh-back:focus-visible,.jvp5dh-retry:focus-visible,.jvp5dh-detail:focus-visible,.jvp5dh-login:focus-visible{outline:3px solid rgba(14,167,161,.25);outline-offset:2px}
.jvp5dh-title{margin:0;font:650 30px/1.15 Sora,Inter,system-ui,sans-serif;letter-spacing:-.6px;color:#0B1D34}
.jvp5dh-intro{margin:0 0 18px;color:#5B6974;font-size:14px;line-height:1.6}
.jvp5dh-state{background:#fffdf9;border:1px solid rgba(11,29,52,.10);border-radius:20px;padding:22px;color:#5B6974;line-height:1.55}
.jvp5dh-state strong{display:block;color:#0B1D34;margin-bottom:6px}
.jvp5dh-list{display:grid;gap:12px}
.jvp5dh-card{background:#fffdf9;border:1px solid rgba(11,29,52,.10);border-radius:20px;padding:18px;box-shadow:0 10px 28px rgba(43,34,23,.06)}
.jvp5dh-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.jvp5dh-verdict{font:700 14px/1.2 Sora,Inter,system-ui,sans-serif;color:#0B1D34;letter-spacing:.01em}
.jvp5dh-date{font-size:12px;color:#75818A;white-space:nowrap}
.jvp5dh-reference{margin:10px 0 0;color:#52616B;font-size:13px;line-height:1.45;overflow-wrap:anywhere}
.jvp5dh-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.jvp5dh-chip{display:inline-flex;align-items:center;min-height:28px;padding:5px 9px;border-radius:999px;background:rgba(14,167,161,.08);color:#0B6764;font-size:12px;font-weight:650}
.jvp5dh-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.jvp5dh-detail-panel{margin-top:14px;padding-top:14px;border-top:1px solid rgba(11,29,52,.08);color:#52616B;font-size:13px;line-height:1.55}
.jvp5dh-reasons{margin:8px 0 0;padding-left:20px}
.jvp5dh-reasons li+li{margin-top:6px}
.jvp5dh-note{margin-top:18px;font-size:12px;line-height:1.5;color:#75818A}
@media(max-width:760px){#julvoxP5DecisionHistory{padding:calc(14px + env(safe-area-inset-top)) 12px calc(18px + env(safe-area-inset-bottom))}.jvp5dh-title{font-size:24px}.jvp5dh-card{padding:16px}.jvp5dh-card-top{display:block}.jvp5dh-date{display:block;margin-top:6px}}
@media(prefers-reduced-motion:reduce){#julvoxP5DecisionHistory *{scroll-behavior:auto!important;transition:none!important}}
</style>`;

const RUNTIME = String.raw`
<script id="${MARKER}">
(function julvoxP5DecisionHistory01(){
  'use strict';
  var root=document.getElementById('julvoxDecisionHome');
  if(!root)return;
  var previousTrigger=null;
  var loading=false;

  function clean(value,limit){return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,limit||500)}
  function escapeHtml(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function token(){var direct=window.currentUser&&typeof window.currentUser.token==='string'?window.currentUser.token:'';if(direct.trim())return direct.trim();try{return clean(localStorage.getItem('token')||'',4096)}catch(_){return''}}
  function api(){return window.JULVOX_API&&typeof window.JULVOX_API.get==='function'?window.JULVOX_API:null}
  function recommendation(value){var labels={insufficient_data:'INFORMATIONS INSUFFISANTES',wait:'ATTENDRE',observe:'À OBSERVER',consider:'À CONSIDÉRER',favorable:'FAVORABLE'};return labels[clean(value,40).toLowerCase()]||'DÉCISION DISPONIBLE'}
  function confidence(value){var labels={none:'Non déterminée',low:'Faible',medium:'Moyenne',high:'Élevée'};return labels[clean(value,40).toLowerCase()]||'Non précisée'}
  function formatDate(value){var text=clean(value,80);if(!text)return'Date non disponible';var date=new Date(text);if(Number.isNaN(date.getTime()))return'Date non disponible';try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(date)}catch(_){return date.toLocaleDateString('fr-FR')}}
  function closeMobileMenu(){var sheet=document.getElementById('pr01bMobileSheet');if(sheet){sheet.dataset.open='false';sheet.setAttribute('aria-hidden','true')}var menu=root.querySelector('[data-home-action="toggle-menu"]');if(menu)menu.setAttribute('aria-expanded','false')}

  function page(){
    var existing=document.getElementById('julvoxP5DecisionHistory');if(existing)return existing;
    var node=document.createElement('section');node.id='julvoxP5DecisionHistory';node.hidden=true;node.setAttribute('aria-hidden','true');node.setAttribute('aria-labelledby','julvoxP5DecisionHistoryTitle');
    node.innerHTML='<div class="jvp5dh-shell"><div class="jvp5dh-head"><button class="jvp5dh-back" type="button" data-jvp5dh-close>← Retour</button><h1 class="jvp5dh-title" id="julvoxP5DecisionHistoryTitle">Mes décisions</h1></div><p class="jvp5dh-intro">Retrouve les décisions réellement enregistrées par Julvox et les raisons conservées avec chaque instantané. Une ancienne décision reste un historique : elle n’est pas présentée comme encore valable aujourd’hui.</p><div id="julvoxP5DecisionHistoryBody" aria-live="polite"></div><p class="jvp5dh-note">Julvox n’invente pas ce qui aurait changé depuis une décision. Une réévaluation temporelle fondée sur de nouvelles observations fera l’objet d’un lot séparé.</p></div>';
    root.appendChild(node);
    node.querySelector('[data-jvp5dh-close]').addEventListener('click',close);
    node.addEventListener('click',function(event){var retry=event.target.closest&&event.target.closest('[data-jvp5dh-retry]');if(retry){load();return}var login=event.target.closest&&event.target.closest('[data-jvp5dh-login]');if(login&&typeof window.openAuth==='function'){window.openAuth('login');return}var detail=event.target.closest&&event.target.closest('[data-jvp5dh-detail]');if(detail)loadDetail(detail.getAttribute('data-jvp5dh-detail'),detail)});
    return node;
  }
  function body(){page();return document.getElementById('julvoxP5DecisionHistoryBody')}
  function state(title,text,action){var target=body();if(!target)return;var button=action==='login'?'<button class="jvp5dh-login" type="button" data-jvp5dh-login>Se connecter</button>':action==='retry'?'<button class="jvp5dh-retry" type="button" data-jvp5dh-retry>Réessayer</button>':'';target.innerHTML='<div class="jvp5dh-state"><strong>'+escapeHtml(title)+'</strong><span>'+escapeHtml(text)+'</span>'+(button?'<div class="jvp5dh-actions">'+button+'</div>':'')+'</div>'}
  function render(items){
    var target=body();if(!target)return;
    if(!items.length){state('Aucune décision sauvegardée','Dès qu’une décision sera enregistrée par le moteur de décision Julvox, elle apparaîtra ici.');return}
    target.innerHTML='<div class="jvp5dh-list">'+items.map(function(item){var id=clean(item&&item.decisionId,80);var subject=clean(item&&item.subjectId,255)||'Référence non disponible';var observed=item&&item.observedAt?item.observedAt:item&&item.createdAt;return '<article class="jvp5dh-card" data-jvp5dh-card="'+escapeHtml(id)+'"><div class="jvp5dh-card-top"><div class="jvp5dh-verdict">'+escapeHtml(recommendation(item&&item.recommendation))+'</div><time class="jvp5dh-date">'+escapeHtml(formatDate(observed))+'</time></div><p class="jvp5dh-reference"><strong>Référence analysée :</strong> '+escapeHtml(subject)+'</p><div class="jvp5dh-meta"><span class="jvp5dh-chip">Confiance : '+escapeHtml(confidence(item&&item.confidence))+'</span></div><div class="jvp5dh-actions"><button class="jvp5dh-detail" type="button" data-jvp5dh-detail="'+escapeHtml(id)+'">Voir pourquoi</button></div><div class="jvp5dh-detail-panel" data-jvp5dh-panel="'+escapeHtml(id)+'" hidden></div></article>'}).join('')+'</div>';
  }
  async function load(){
    if(loading)return;var accessToken=token();if(!accessToken){state('Connexion nécessaire','Connecte-toi pour retrouver l’historique associé à ton compte.','login');return}var client=api();if(!client){state('Service indisponible','Le client sécurisé Julvox n’est pas disponible sur cette page.','retry');return}loading=true;state('Chargement','Julvox récupère uniquement les décisions enregistrées sur ton compte.');
    try{var result=await client.get('/decisions?limit=20&offset=0',{token:accessToken});if(!result||result.ok!==true){if(result&&result.status===401)state('Session expirée','Reconnecte-toi pour accéder à tes décisions.','login');else state('Historique indisponible',result&&result.message?result.message:'Impossible de récupérer tes décisions pour le moment.','retry');return}var payload=result.data&&typeof result.data==='object'?result.data:{};var items=Array.isArray(payload.items)?payload.items:[];render(items)}catch(_){state('Historique indisponible','Impossible de récupérer tes décisions pour le moment.','retry')}finally{loading=false}
  }
  async function loadDetail(id,button){
    var safeId=clean(id,80);if(!safeId)return;var panel=page().querySelector('[data-jvp5dh-panel="'+CSS.escape(safeId)+'"]');if(!panel)return;if(panel.dataset.loaded==='true'){panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));return}var accessToken=token();var client=api();if(!accessToken||!client){panel.hidden=false;panel.textContent='Les raisons détaillées ne sont pas disponibles dans cette session.';return}button.disabled=true;panel.hidden=false;panel.textContent='Chargement des raisons enregistrées…';
    try{var result=await client.get('/decisions/'+encodeURIComponent(safeId),{token:accessToken});if(!result||result.ok!==true||!result.data||typeof result.data!=='object'){panel.textContent='Les raisons enregistrées ne sont pas disponibles pour le moment.';return}var decision=result.data.decision&&typeof result.data.decision==='object'?result.data.decision:{};var reasons=Array.isArray(decision.reasons)?decision.reasons.map(function(value){return clean(value,700)}).filter(Boolean):[];if(!reasons.length){panel.textContent='Aucune raison détaillée n’est disponible dans cet instantané.'}else{panel.innerHTML='<strong>Pourquoi Julvox avait pris cette décision :</strong><ul class="jvp5dh-reasons">'+reasons.map(function(reason){return'<li>'+escapeHtml(reason)+'</li>'}).join('')+'</ul>'}panel.dataset.loaded='true';button.setAttribute('aria-expanded','true')}
    catch(_){panel.textContent='Les raisons enregistrées ne sont pas disponibles pour le moment.'}finally{button.disabled=false}
  }
  function open(trigger){previousTrigger=trigger||document.activeElement;closeMobileMenu();var node=page();node.hidden=false;node.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';load();window.setTimeout(function(){node.querySelector('[data-jvp5dh-close]')?.focus()},0)}
  function close(){var node=page();node.hidden=true;node.setAttribute('aria-hidden','true');document.body.style.overflow='';if(previousTrigger&&typeof previousTrigger.focus==='function')previousTrigger.focus()}

  window.openJulvoxDecisionHistory=open;
  document.addEventListener('click',function(event){var trigger=event.target.closest&&event.target.closest('[data-home-action="decisions"]');if(!trigger)return;event.preventDefault();open(trigger)},true);
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!page().hidden){event.preventDefault();close()}},true);
})();
</script>`;

function fail(message) {
  throw new Error(`JULVOX-P5-DECISION-HISTORY-01 integration failed: ${message}`);
}

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(`id=["']${MARKER}["']`, 'g')) || []).length !== 1) fail('runtime marker must appear exactly once');
  if ((html.match(new RegExp(`id=["']${STYLE_ID}["']`, 'g')) || []).length !== 1) fail('style marker must appear exactly once');
  if (!html.includes("client.get('/decisions?limit=20&offset=0'")) fail('decision history must use the canonical decision history endpoint');
  if (!html.includes("client.get('/decisions/'")) fail('decision detail must use the canonical decision detail endpoint');
  if (!html.includes('window.JULVOX_API')) fail('decision history must use the centralized Julvox API client');
  if (!html.includes('data-home-action="decisions"')) fail('decision navigation entry point is missing');
  if (!html.includes('Une ancienne décision reste un historique')) fail('historical-decision freshness warning is missing');
  if (!html.includes('INFORMATIONS INSUFFISANTES')) fail('insufficient-data outcome must remain visible');
  if (/ACH[ÈE]TE\s+MAINTENANT\s*!+/i.test(html.slice(html.indexOf(`<script id="${MARKER}">`)))) fail('manipulative purchase urgency is forbidden');
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(`id="${MARKER}"`)) return verify(html);
  if (!html.includes('id="julvoxDecisionHome"')) fail('Julvox decision home must already be integrated');
  if (!html.includes('data-home-action="decisions"')) fail('Mes décisions navigation trigger is missing');
  const headEnd = html.indexOf('</head>');
  const bodyEnd = html.lastIndexOf('</body>');
  if (headEnd < 0 || bodyEnd < 0) fail('document anchors are missing');
  html = html.slice(0, headEnd) + STYLES + '\n' + html.slice(headEnd);
  const nextBodyEnd = html.lastIndexOf('</body>');
  html = html.slice(0, nextBodyEnd) + RUNTIME + '\n' + html.slice(nextBodyEnd);
  return verify(html);
}

module.exports = {
  MARKER,
  STYLE_ID,
  decisionRecommendationLabel,
  integrate,
  verify,
};
