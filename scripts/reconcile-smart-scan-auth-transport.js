'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_86_SMART_SCAN_AUTH_TRANSPORT';
const PRODUCT_RUNTIME_ID = 'julvox-product-smart-scan-01-runtime';
const ADAPTER_RUNTIME_ID = 'julvox-frontend-reconciliation-01-finalize-runtime';

const LEGACY_PRODUCT_API = `  async function apiPost(path,payload){
    var adapter=backend();
    if(adapter && typeof adapter.post==='function') return adapter.post(path,payload);
    var base=apiBase(); if(!base) throw new Error('Backend Julvox non configuré');
    var response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit'});
    var data=null; try{ data=await response.json(); }catch(_){}
    if(!response.ok){ var error=new Error('Réponse backend '+response.status); error.status=response.status; error.payload=data; throw error; }
    return data;
  }`;

const SAFE_PRODUCT_API = `  /* ${MARKER} */
  function smartScanFallbackToken(){try{return typeof currentUser!=='undefined'&&currentUser&&typeof currentUser.token==='string'?currentUser.token.trim():'';}catch(_){return'';}}
  function smartScanFallbackProtected(path){return path==='/smart-scan/confirm'||path==='/smart-scan/analyze';}
  function smartScanFallbackAuthError(status){var error=new Error('Authentification Smart Scan requise');error.code='AUTH_REQUIRED';error.status=status||401;return error;}
  function smartScanUiAuthFailure(error){return Boolean(error&&(error.code==='AUTH_REQUIRED'||error.status===401||error.status===403));}
  function openSmartScanLogin(){try{if(typeof window.openAuth==='function')window.openAuth('login');else if(typeof openAuth==='function')openAuth('login');}catch(_){}}
  async function apiPost(path,payload){
    var adapter=backend();
    if(adapter && typeof adapter.post==='function') return adapter.post(path,payload);
    var base=apiBase(); if(!base) throw new Error('Backend Julvox non configuré');
    var client=window.JULVOX_API; if(!client || typeof client.fetchResponse!=='function') throw new Error('Client API Julvox indisponible');
    var options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit'};
    if(smartScanFallbackProtected(path)){var accessToken=smartScanFallbackToken();if(!accessToken)throw smartScanFallbackAuthError(401);options.token=accessToken;}
    var response=await client.fetchResponse(base+path,options);
    if(response.status===401||response.status===403) throw smartScanFallbackAuthError(response.status);
    var data=null; try{ data=await response.json(); }catch(_){}
    if(!response.ok){ var error=new Error('Réponse backend '+response.status); error.status=response.status; error.payload=data; throw error; }
    return data;
  }`;

const LEGACY_CONFIRM = `  async function confirmCandidate(){
    if(!currentIdentification || !Array.isArray(currentIdentification.candidates)) return;
    var selected=document.querySelector('input[name="jvssCandidate"]:checked'); if(!selected){setStatus('Choisis le produit que tu regardes.');return;}
    var candidate=currentIdentification.candidates[Number(selected.value)]; if(!candidate){setStatus('Choix de produit invalide.');return;}
    try{
      await apiPost('/smart-scan/confirm',{identificationId:currentIdentification.identificationId,candidate:candidate,confirmed:true});
      confirmedProduct=candidate; var card=byId('jvssAnalysisCard'); if(card) card.hidden=false; var label=byId('jvssConfirmed'); if(label) label.innerHTML='<strong>Produit confirmé</strong><span>'+escapeHtml(candidateName(candidate))+'</span>'; setStatus('Produit confirmé. Ajoute les informations que tu connais, puis demande l’avis Julvox.'); if(card) card.scrollIntoView({block:'nearest'});
    }catch(error){ setStatus(error&&error.status===404?'Le service de confirmation Smart Scan n’est pas encore déployé sur cet environnement.':'La confirmation n’a pas abouti.'); }
  }`;

const SAFE_CONFIRM = `  async function confirmCandidate(){
    if(!currentIdentification || !Array.isArray(currentIdentification.candidates)) return;
    var selected=document.querySelector('input[name="jvssCandidate"]:checked'); if(!selected){setStatus('Choisis le produit que tu regardes.');return;}
    var candidate=currentIdentification.candidates[Number(selected.value)]; if(!candidate){setStatus('Choix de produit invalide.');return;}
    try{
      await apiPost('/smart-scan/confirm',{identificationId:currentIdentification.identificationId,candidate:candidate,confirmed:true});
      confirmedProduct=candidate; var card=byId('jvssAnalysisCard'); if(card) card.hidden=false; var label=byId('jvssConfirmed'); if(label) label.innerHTML='<strong>Produit confirmé</strong><span>'+escapeHtml(candidateName(candidate))+'</span>'; setStatus('Produit confirmé. Ajoute les informations que tu connais, puis demande l’avis Julvox.'); if(card) card.scrollIntoView({block:'nearest'});
    }catch(error){ if(smartScanUiAuthFailure(error)){setStatus('Connecte-toi pour confirmer ce produit avant l’analyse.');openSmartScanLogin();}else setStatus(error&&error.status===404?'Le service de confirmation Smart Scan n’est pas encore déployé sur cet environnement.':'La confirmation n’a pas abouti.'); }
  }`;

const LEGACY_ANALYZE = `  async function analyze(){
    if(!confirmedProduct || !currentIdentification){setStatus('Confirme d’abord le produit identifié.');return;}
    if(!online()){ await saveDraft(true,false); setStatus('Produit enregistré. Connexion nécessaire pour récupérer les prix et l’analyse complète.'); return; }
    var price=moneyMinor(byId('jvssPrice')&&byId('jvssPrice').value); var budget=moneyMinor(byId('jvssBudget')&&byId('jvssBudget').value); var currency=clean(byId('jvssCurrency')&&byId('jvssCurrency').value,3).toUpperCase(); var market=clean(byId('jvssMarket')&&byId('jvssMarket').value,2).toUpperCase(); var condition=clean(byId('jvssCondition')&&byId('jvssCondition').value,30); var urgency=clean(byId('jvssUrgency')&&byId('jvssUrgency').value,30)||'unknown';
    var payload={identificationId:currentIdentification.identificationId,confirmedProduct:confirmedProduct,confirmed:true,urgency:urgency}; if(price)payload.storePriceMinor=price;if(budget)payload.budgetMinor=budget;if(currency)payload.currency=currency;if(market)payload.marketCountry=market;if(condition)payload.condition=condition;
    setStatus('Analyse Julvox en cours…');
    try{ var result=await apiPost('/smart-scan/analyze',payload); renderDecision(result); saveHistory(result,price); setStatus('Analyse terminée. Julvox conserve explicitement les incertitudes restantes.'); }
    catch(error){ setStatus(error&&error.status===404?'Le moteur Smart Scan backend n’est pas encore déployé sur cet environnement.':'L’analyse n’a pas abouti. Aucune recommandation n’est inventée.'); }
  }`;

const SAFE_ANALYZE = `  async function analyze(){
    if(!confirmedProduct || !currentIdentification){setStatus('Confirme d’abord le produit identifié.');return;}
    if(!online()){ await saveDraft(true,false); setStatus('Produit enregistré. Connexion nécessaire pour récupérer les prix et l’analyse complète.'); return; }
    var price=moneyMinor(byId('jvssPrice')&&byId('jvssPrice').value); var budget=moneyMinor(byId('jvssBudget')&&byId('jvssBudget').value); var currency=clean(byId('jvssCurrency')&&byId('jvssCurrency').value,3).toUpperCase(); var market=clean(byId('jvssMarket')&&byId('jvssMarket').value,2).toUpperCase(); var condition=clean(byId('jvssCondition')&&byId('jvssCondition').value,30); var urgency=clean(byId('jvssUrgency')&&byId('jvssUrgency').value,30)||'unknown';
    var payload={identificationId:currentIdentification.identificationId,confirmedProduct:confirmedProduct,confirmed:true,urgency:urgency}; if(price)payload.storePriceMinor=price;if(budget)payload.budgetMinor=budget;if(currency)payload.currency=currency;if(market)payload.marketCountry=market;if(condition)payload.condition=condition;
    setStatus('Analyse Julvox en cours…');
    try{ var result=await apiPost('/smart-scan/analyze',payload); renderDecision(result); saveHistory(result,price); setStatus('Analyse terminée. Julvox conserve explicitement les incertitudes restantes.'); }
    catch(error){ if(smartScanUiAuthFailure(error)){setStatus('Connecte-toi pour demander l’analyse Julvox.');openSmartScanLogin();}else setStatus(error&&error.status===404?'Le moteur Smart Scan backend n’est pas encore déployé sur cet environnement.':'L’analyse n’a pas abouti. Aucune recommandation n’est inventée.'); }
  }`;

const LEGACY_ADAPTER = `  async function previewPost(route,payload){var base=apiBase();if(!base)throw new Error('Backend Preview non configuré');var response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit'});var data=null;try{data=await response.json();}catch(_){}if(!response.ok){var error=new Error('Smart Scan indisponible');error.status=response.status;error.data=sanitize(data);throw error;}return sanitize(data);}`;

const SAFE_ADAPTER = `  function smartScanTransportToken(){try{return typeof currentUser!=='undefined'&&currentUser&&typeof currentUser.token==='string'?currentUser.token.trim():'';}catch(_){return'';}}
  function smartScanTransportProtected(route){return route==='/smart-scan/confirm'||route==='/smart-scan/analyze';}
  function smartScanTransportAuthError(status){var error=new Error('Authentification Smart Scan requise');error.code='AUTH_REQUIRED';error.status=status||401;return error;}
  async function previewPost(route,payload){var base=apiBase();if(!base)throw new Error('Backend Preview non configuré');var client=window.JULVOX_API;if(!client||typeof client.fetchResponse!=='function')throw new Error('Client API Julvox indisponible');var options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit'};if(smartScanTransportProtected(route)){var accessToken=smartScanTransportToken();if(!accessToken)throw smartScanTransportAuthError(401);options.token=accessToken;}var response=await client.fetchResponse(base+route,options);if(response.status===401||response.status===403)throw smartScanTransportAuthError(response.status);var data=null;try{data=await response.json();}catch(_){}if(!response.ok){var error=new Error('Smart Scan indisponible');error.status=response.status;error.data=sanitize(data);throw error;}return sanitize(data);}`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function runtimeSlice(html, id) {
  const startTag = `<script id="${id}">`;
  const start = html.indexOf(startTag);
  if (start < 0) throw new Error(`P6.86 runtime missing: ${id}`);
  const end = html.indexOf('</script>', start);
  if (end < 0) throw new Error(`P6.86 runtime unterminated: ${id}`);
  return { start, end: end + '</script>'.length, text: html.slice(start, end + '</script>'.length) };
}

function replaceOnce(source, legacy, safe, label) {
  const count = countOf(source, legacy);
  if (count !== 1) throw new Error(`P6.86 ${label} legacy count must be 1, got ${count}`);
  return source.replace(legacy, safe);
}

function assertHardened(html) {
  const product = runtimeSlice(html, PRODUCT_RUNTIME_ID).text;
  const adapter = runtimeSlice(html, ADAPTER_RUNTIME_ID).text;
  if (countOf(product, MARKER) !== 1) throw new Error('P6.86 marker count must be 1');
  for (const required of [
    "path==='/smart-scan/confirm'||path==='/smart-scan/analyze'",
    "route==='/smart-scan/confirm'||route==='/smart-scan/analyze'",
    "client.fetchResponse(base+path,options)",
    "client.fetchResponse(base+route,options)",
    "options.token=accessToken",
    "response.status===401||response.status===403",
    "Connecte-toi pour confirmer ce produit avant l’analyse.",
    "Connecte-toi pour demander l’analyse Julvox.",
    "apiPost('/smart-scan/identify'",
    "apiPost('/smart-scan/confirm'",
    "apiPost('/smart-scan/analyze'",
    "credentials:'omit'",
    "P6_85_CONVERSATION_AUTH_TRANSPORT",
  ]) {
    if (!html.includes(required)) throw new Error(`P6.86 required boundary missing: ${required}`);
  }
  if (product.includes('fetch(base+path')) throw new Error('P6.86 direct Smart Scan product fetch remains');
  if (adapter.includes('fetch(base+route')) throw new Error('P6.86 direct Smart Scan adapter fetch remains');
  if (countOf(product, "options.token=accessToken") !== 1) throw new Error('P6.86 fallback token assignment must be unique');
  if (countOf(adapter, "options.token=accessToken") !== 1) throw new Error('P6.86 adapter token assignment must be unique');
}

function hardenHtml(html) {
  const input = String(html);
  const productSlice = runtimeSlice(input, PRODUCT_RUNTIME_ID);
  if (productSlice.text.includes(MARKER)) {
    assertHardened(input);
    return input;
  }

  let product = productSlice.text;
  product = replaceOnce(product, LEGACY_PRODUCT_API, SAFE_PRODUCT_API, 'product transport');
  product = replaceOnce(product, LEGACY_CONFIRM, SAFE_CONFIRM, 'confirm UX');
  product = replaceOnce(product, LEGACY_ANALYZE, SAFE_ANALYZE, 'analyze UX');
  let output = input.slice(0, productSlice.start) + product + input.slice(productSlice.end);

  const adapterSlice = runtimeSlice(output, ADAPTER_RUNTIME_ID);
  let adapter = adapterSlice.text;
  adapter = replaceOnce(adapter, LEGACY_ADAPTER, SAFE_ADAPTER, 'adapter transport');
  output = output.slice(0, adapterSlice.start) + adapter + output.slice(adapterSlice.end);

  assertHardened(output);
  return output;
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  fs.writeFileSync(target, hardenHtml(source), 'utf8');
  console.log('P6_86_SMART_SCAN_AUTH_TRANSPORT_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = {
  MARKER,
  PRODUCT_RUNTIME_ID,
  ADAPTER_RUNTIME_ID,
  LEGACY_PRODUCT_API,
  SAFE_PRODUCT_API,
  LEGACY_CONFIRM,
  SAFE_CONFIRM,
  LEGACY_ANALYZE,
  SAFE_ANALYZE,
  LEGACY_ADAPTER,
  SAFE_ADAPTER,
  assertHardened,
  hardenHtml,
  hardenPublicArtifact,
};
