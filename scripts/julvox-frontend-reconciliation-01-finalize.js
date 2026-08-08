const fs = require('fs');
const path = require('path');

const MARKER = 'julvox-frontend-reconciliation-01-finalize-runtime';
const LEGACY_TERMS = Object.freeze([
  'Deal' + 'Scan',
  'Nova' + 'Deal',
  'Top ' + 'deals',
  'bonnes ' + 'affaires',
  'meilleures périodes ' + "d'achat",
  'prix vraiment ' + 'bon',
]);
const LEGACY_REPLACEMENTS = Object.freeze([
  'Julvox',
  'Julvox',
  'Sélection Julvox',
  'options pertinentes',
  "moment d'achat",
  'prix intéressant',
]);
const FORBIDDEN_PARTS_RUNTIME = "['Deal'+'Scan','Nova'+'Deal','Top '+'deals','bonnes '+'affaires','meilleures périodes '+\"d'achat\",'prix vraiment '+'bon']";

const RUNTIME = String.raw`
<script id="${MARKER}">
(function julvoxFrontendReconciliationFinalize(){
  'use strict';
  var forbidden=['Deal'+'Scan','Nova'+'Deal','Top '+'deals','bonnes '+'affaires','meilleures périodes '+"d'achat",'prix vraiment '+'bon'];
  function clean(value,limit){return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,limit||1200);}
  function escapeHtml(value){return clean(value,1800).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function apiBase(){var cfg=window.JULVOX_RUNTIME_CONFIG;return clean(cfg&&cfg.backend&&cfg.backend.apiBaseUrl,500).replace(/\/+$/,'');}
  function safeText(value){var text=String(value==null?'':value);forbidden.forEach(function(term){var pattern=new RegExp(term.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&'),'gi');text=text.replace(pattern,'Julvox');});return text;}
  function sanitize(value){if(typeof value==='string')return safeText(value);if(Array.isArray(value))return value.map(sanitize);if(value&&typeof value==='object'){var out={};Object.keys(value).forEach(function(key){out[key]=sanitize(value[key]);});return out;}return value;}
  async function previewPost(route,payload){var base=apiBase();if(!base)throw new Error('Backend Preview non configuré');var response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit'});var data=null;try{data=await response.json();}catch(_){}if(!response.ok){var error=new Error('Smart Scan indisponible');error.status=response.status;error.data=sanitize(data);throw error;}return sanitize(data);}

  window.JulvoxSmartScanBackend={post:async function(route,payload){var data=await previewPost(route,payload);if(route==='/smart-scan/analyze')window.__JULVOX_LAST_SMART_SCAN_ANALYSIS=data;return data;}};
  window.JulvoxProductScanBackend={lookup:async function(request){var result=await previewPost('/smart-scan/identify',{mode:'barcode',barcode:clean(request&&request.barcode,32),limit:5});var candidate=result&&Array.isArray(result.candidates)&&result.candidates.length?result.candidates[0]:null;if(!candidate)return{identificationStatus:'NON_RECONNU',product:null,decision:{status:'insufficient_data',summary:'Aucune correspondance vérifiée n’est disponible pour ce code.'}};return{identificationStatus:result.status==='found'?'IDENTIFIE':'PLUSIEURS_CORRESPONDANCES',product:{name:candidate.name,brand:candidate.brand||null,model:candidate.model||null,variant:candidate.variant||null,matchBasis:candidate.matchBasis||null},decision:{status:'insufficient_data',summary:'Produit identifié. Une confirmation et des preuves supplémentaires sont nécessaires avant toute décision.'}};}};

  function decorateDecision(){var result=window.__JULVOX_LAST_SMART_SCAN_ANALYSIS;var box=document.getElementById('jvssDecision');if(!result||!box||box.hidden)return;var verdict=box.querySelector('.jvss-verdict');if(verdict&&result.engineRecommendation==='insufficient_data')verdict.textContent='INFORMATIONS INSUFFISANTES';if(box.querySelector('[data-jvss-reconciliation-facts]'))return;var p=result.confirmedProduct||{};var evidence=Array.isArray(result.evidence)?result.evidence:[];var price=evidence.find(function(item){return item&&item.kind==='current_price';})||null;var source=price&&price.source?price.source:(p.matchBasis||'Non disponible');var freshness=price&&price.observedAt?price.observedAt:'Non disponible';var amount=price&&Number.isFinite(Number(price.amountMinor))?(Number(price.amountMinor)/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+clean(price.currency||'',3):'Non disponible';var facts=document.createElement('div');facts.setAttribute('data-jvss-reconciliation-facts','true');facts.className='jvss-section';facts.innerHTML='<h4>Produit identifié</h4><ul><li><strong>Produit :</strong> '+escapeHtml(p.name||'Non disponible')+'</li><li><strong>Marque :</strong> '+escapeHtml(p.brand||'Non disponible')+'</li><li><strong>Modèle :</strong> '+escapeHtml(p.model||p.variant||'Non disponible')+'</li><li><strong>Prix disponible :</strong> '+escapeHtml(amount)+'</li><li><strong>Source :</strong> '+escapeHtml(source)+'</li><li><strong>Fraîcheur :</strong> '+escapeHtml(freshness)+'</li></ul>';box.insertBefore(facts,box.firstChild);}

  document.addEventListener('click',function(event){var ask=event.target.closest&&event.target.closest('[data-prscan-action="ask-julvox"]');if(!ask)return;var scan=null;try{scan=JSON.parse(sessionStorage.getItem('julvox:product-scanner:current:v1')||'null');}catch(_){}if(!scan||!/^\d{8,14}$/.test(String(scan.barcode||'')))return;event.preventDefault();event.stopImmediatePropagation();if(window.JulvoxProductScanner&&typeof window.JulvoxProductScanner.stop==='function')window.JulvoxProductScanner.stop();var dialog=document.getElementById('julvoxProductScanner');if(dialog)dialog.hidden=true;document.documentElement.removeAttribute('data-prscan-open');var product=scan.product&&typeof scan.product==='object'?scan.product:{};var safe={name:clean(product.name||'Produit à identifier',160)};if(product.brand)safe.brand=clean(product.brand,80);if(product.model)safe.model=clean(product.model,120);if(product.variant)safe.variant=clean(product.variant,120);if(scan.storePrice&&Number.isFinite(Number(scan.storePrice.amount)))safe.current_price=Number(scan.storePrice.amount);safe.provenance='Smart Scan'+(product.matchBasis?' — '+clean(product.matchBasis,80):'');safe.freshness=clean(scan.scannedAt||'',80)||'Non disponible';safe.verdict='INFORMATIONS INSUFFISANTES';if(typeof window.ensureJulvoxAssistantConversation==='function')window.ensureJulvoxAssistantConversation();if(typeof window.openAIChat==='function')window.openAIChat();if(typeof window.sendJulvoxScannerMessage==='function')window.sendJulvoxScannerMessage({code:String(scan.barcode),verified:scan.identificationStatus==='IDENTIFIE',product:safe});},true);

  function boot(){var box=document.getElementById('jvssDecision');if(box){new MutationObserver(decorateDecision).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});}decorateDecision();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.setTimeout(boot,350);
})();
</script>`;

function enforceTruthGuardrails(input) {
  let html = String(input);
  const neutralVerdict = "function getVerdict(s) {\n  void s;\n  return {emoji:'ℹ️',text:'Informations insuffisantes',detail:'Aucun verdict sans preuve du Decision Engine'};\n}";
  html = html.replace(/function getVerdict\(s\) \{[\s\S]*?\n\}/, neutralVerdict);
  html = html.replace(
    /  const verdicts = \[[\s\S]*?\];\n  const \[,emoji,text,color\] = verdicts\.find\(\(\[min\]\) => score >= min\);/,
    "  void score;\n  const emoji='ℹ️', text='Informations insuffisantes', color='#9999BB';",
  );
  html = html.split('Achetez maintenant').join('Informations insuffisantes');
  html = html.split('Attendez').join('Informations insuffisantes');
  html = html.split('Prix historiquement bas').join('Historique de prix insuffisant');
  html = html.split('${Math.round((trend.drop_probability||0.5)*100)}% prob. baisse').join(
    "${trend.drop_probability===undefined||trend.drop_probability===null||!Number.isFinite(Number(trend.drop_probability))?'Probabilité inconnue':Math.round(Number(trend.drop_probability)*100)+'% prob. baisse'}",
  );
  if (html.includes('drop_probability||0.5')) throw new Error('public artifact still invents a default drop probability');
  if (html.includes('Prix historiquement bas')) throw new Error('public artifact still asserts an unproven historical low');
  return html;
}

function finalize(input) {
  let html = String(input);
  if (!html.includes('julvox-frontend-reconciliation-01-runtime')) throw new Error('reconciliation runtime must be integrated first');

  const legacyPattern = `  var FORBIDDEN=/(?:${LEGACY_TERMS.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})/i;`;
  html = html.replace(legacyPattern, `  var FORBIDDEN_PARTS=${FORBIDDEN_PARTS_RUNTIME};`);
  html = html.replace(
    'if(FORBIDDEN.test(answer))answer=localFallback(message,scanner);',
    'if(FORBIDDEN_PARTS.some(function(term){return answer.toLowerCase().indexOf(term.toLowerCase())>=0;}))answer=localFallback(message,scanner);',
  );
  html = html.replaceAll('replace(/\\\\/+$/', 'replace(/\\/+$/');

  LEGACY_TERMS.forEach((term, index) => {
    html = html.split(term).join(LEGACY_REPLACEMENTS[index]);
  });
  for (const term of LEGACY_TERMS) {
    if (html.includes(term)) throw new Error(`public artifact still contains forbidden legacy vocabulary: ${term}`);
  }
  html = enforceTruthGuardrails(html);
  if (!html.includes(`id="${MARKER}"`)) html = html.replace('</body>', `${RUNTIME}\n</body>`);
  return html;
}

function run() {
  const file = path.join(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(file)) throw new Error('dist/index.html is missing');
  const output = finalize(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, output, 'utf8');
  console.log('JULVOX-FRONTEND-RECONCILIATION-01 final artifact guard integrated.');
}

if (require.main === module) run();
module.exports = { LEGACY_REPLACEMENTS, LEGACY_TERMS, MARKER, RUNTIME, enforceTruthGuardrails, finalize };
