const MARKER = '<!-- julvox-product-smart-scan-01 -->';

const SMART_SCAN_CSS = String.raw`
<style id="julvox-product-smart-scan-01-styles">
#julvoxSmartScan[hidden]{display:none!important}
#julvoxSmartScan{position:fixed;inset:0;z-index:155;background:rgba(11,29,52,.52);display:grid;place-items:end center;padding:18px;overscroll-behavior:contain}
.jvss-panel{width:min(760px,100%);max-height:min(94vh,900px);overflow:auto;background:#fffdf9;border:1px solid rgba(11,29,52,.12);border-radius:28px;box-shadow:0 26px 80px rgba(11,29,52,.28);color:#162536;padding:20px}
.jvss-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:15px}.jvss-kicker{margin:0 0 5px;font:700 12px/1.2 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#0b6764}.jvss-title{margin:0;font:650 25px/1.18 Sora,Inter,system-ui,sans-serif;color:#0B1D34;letter-spacing:-.4px}.jvss-close{min-width:48px;min-height:48px;border:1px solid rgba(11,29,52,.13);border-radius:14px;background:#fff;color:#0B1D34;font-size:22px;cursor:pointer}.jvss-copy{margin:0 0 14px;font:500 14px/1.55 Inter,system-ui,sans-serif;color:#52616b}
.jvss-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.jvss-tab{min-height:52px;border:1px solid rgba(11,29,52,.14);border-radius:14px;background:#fff;color:#0B1D34;font:700 13px/1.25 Inter,system-ui,sans-serif;cursor:pointer;padding:8px}.jvss-tab[aria-selected="true"]{background:#0B1D34;color:#fff;border-color:#0B1D34}.jvss-tab small{display:block;font-size:11px;font-weight:600;opacity:.78;margin-top:2px}
.jvss-pane[hidden]{display:none!important}.jvss-card{padding:15px;border:1px solid rgba(11,29,52,.10);border-radius:18px;background:#FCF9F4;margin:12px 0}.jvss-label{display:block;margin:0 0 7px;font:700 13px/1.35 Inter,system-ui,sans-serif;color:#0B1D34}.jvss-input,.jvss-select{width:100%;min-height:48px;border:1px solid rgba(11,29,52,.18);border-radius:13px;background:#fff;padding:0 13px;color:#0B1D34;font:600 16px/1 Inter,system-ui,sans-serif}.jvss-textarea{min-height:96px;padding:12px 13px;resize:vertical;line-height:1.45}.jvss-row{display:flex;gap:9px;align-items:stretch}.jvss-row>*{flex:1}.jvss-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}.jvss-btn{min-height:48px;border-radius:14px;padding:0 16px;border:1px solid rgba(11,29,52,.13);background:#fff;color:#0B1D34;font:700 14px/1.15 Inter,system-ui,sans-serif;cursor:pointer}.jvss-btn-primary{background:#0B1D34;color:#fff;border-color:#0B1D34}.jvss-btn-accent{background:#0EA7A1;color:#062e2d;border-color:#0EA7A1}.jvss-btn[disabled]{opacity:.5;cursor:not-allowed}
.jvss-status{min-height:24px;margin:10px 0 14px;padding:10px 12px;border-radius:12px;background:#f3f7f6;color:#214d4a;font:650 14px/1.45 Inter,system-ui,sans-serif}.jvss-warning{padding:11px 12px;border-radius:12px;background:#fff4d8;color:#694d16;font:650 13px/1.45 Inter,system-ui,sans-serif;margin-top:10px}.jvss-photo-preview{display:block;max-width:100%;max-height:260px;object-fit:contain;border-radius:14px;margin:10px auto;background:#edf1f1}.jvss-photo-preview[hidden]{display:none!important}.jvss-privacy{margin:8px 0 0;font:550 12px/1.5 Inter,system-ui,sans-serif;color:#65727b}
.jvss-candidates{display:grid;gap:10px;margin-top:12px}.jvss-candidate{display:flex;gap:12px;align-items:flex-start;padding:13px;border:1px solid rgba(11,29,52,.13);border-radius:15px;background:#fff}.jvss-candidate input{margin-top:4px;min-width:20px;min-height:20px}.jvss-candidate strong{display:block;color:#0B1D34;font:700 14px/1.35 Inter,system-ui,sans-serif}.jvss-candidate span{display:block;color:#52616b;font:500 13px/1.45 Inter,system-ui,sans-serif;margin-top:3px}.jvss-candidate em{display:inline-block;margin-top:6px;color:#0b6764;font:700 12px/1.3 Inter,system-ui,sans-serif;font-style:normal}
.jvss-confirmed{padding:13px;border-radius:14px;background:#ecf7f5;border:1px solid rgba(14,167,161,.2);margin:12px 0}.jvss-confirmed strong{display:block;color:#0B1D34;font:750 14px/1.35 Inter,system-ui,sans-serif}.jvss-confirmed span{display:block;margin-top:3px;color:#52616b;font:500 13px/1.45 Inter,system-ui,sans-serif}
.jvss-decision{padding:16px;border:1px solid rgba(11,29,52,.12);border-radius:18px;background:#fff;margin-top:14px}.jvss-verdict{margin:0 0 5px;color:#0B1D34;font:750 23px/1.2 Sora,Inter,system-ui,sans-serif}.jvss-confidence{margin:0 0 14px;color:#52616b;font:600 13px/1.4 Inter,system-ui,sans-serif}.jvss-section{margin-top:13px}.jvss-section h4{margin:0 0 5px;color:#0B1D34;font:750 13px/1.3 Inter,system-ui,sans-serif}.jvss-section ul{margin:0;padding-left:20px;color:#52616b;font:500 13px/1.5 Inter,system-ui,sans-serif}.jvss-evidence{margin-top:12px;padding-top:12px;border-top:1px solid rgba(11,29,52,.09);color:#65727b;font:500 12px/1.5 Inter,system-ui,sans-serif}.jvss-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.jvss-btn:focus-visible,.jvss-close:focus-visible,.jvss-tab:focus-visible,.jvss-input:focus-visible,.jvss-select:focus-visible,.jvss-candidate:focus-within{outline:3px solid rgba(14,167,161,.34);outline-offset:2px}
@media (max-width:760px){#julvoxSmartScan{padding:0;place-items:end stretch}.jvss-panel{width:100%;max-height:95dvh;border-radius:24px 24px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}.jvss-title{font-size:22px}.jvss-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.jvss-row{flex-direction:column}.jvss-row .jvss-btn{width:100%}}
@media (orientation:landscape) and (max-height:540px){#julvoxSmartScan{place-items:stretch end}.jvss-panel{width:min(720px,94vw);height:100%;max-height:none;border-radius:24px 0 0 24px}}
@media (prefers-reduced-motion:reduce){#julvoxSmartScan *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>`;

const SMART_SCAN_RUNTIME = String.raw`
<script id="julvox-product-smart-scan-01-runtime">
(function julvoxProductSmartScan01(){
  'use strict';
  var MODAL_ID = 'julvoxSmartScan';
  var DRAFTS_KEY = 'julvox:smart-scan:drafts:v1';
  var HISTORY_KEY = 'julvox:smart-scan:history:v1';
  var HISTORY_ENABLED_KEY = 'julvox:history:enabled';
  var LEGACY_SESSION_KEY = 'julvox:product-scanner:current:v1';
  var PHOTO_DB = 'julvox-smart-scan-private-v1';
  var PHOTO_STORE = 'photoDrafts';
  var PHOTO_TTL_MS = 24 * 60 * 60 * 1000;
  var MODES = ['barcode','photo','link','text'];
  var legacyScanner = window.JulvoxProductScanner || null;
  var legacyOpen = legacyScanner && typeof legacyScanner.open === 'function' ? legacyScanner.open.bind(legacyScanner) : null;
  var legacyStop = legacyScanner && typeof legacyScanner.stop === 'function' ? legacyScanner.stop.bind(legacyScanner) : null;
  var currentMode = 'barcode';
  var currentIdentification = null;
  var confirmedProduct = null;
  var photoFile = null;
  var photoObjectUrl = '';
  var cameraPoll = 0;
  var lastFocused = null;

  function byId(id){ return document.getElementById(id); }
  function clean(value, limit){ return String(value == null ? '' : value).replace(/\s+/g,' ').trim().slice(0, limit || 500); }
  function escapeHtml(value){ return clean(value,1000).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function nowIso(){ return new Date().toISOString(); }
  function online(){ return navigator.onLine !== false; }
  function readJson(key, fallback){ try { var value = JSON.parse(localStorage.getItem(key) || 'null'); return value == null ? fallback : value; } catch (_) { return fallback; } }
  function writeJson(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  function setStatus(text){ var el = byId('jvssStatus'); if (el) el.textContent = clean(text,320); }
  function apiBase(){ var cfg = window.JULVOX_RUNTIME_CONFIG; return clean(cfg && cfg.backend && cfg.backend.apiBaseUrl,500).replace(/\/$/,''); }
  function backend(){ return window.JulvoxSmartScanBackend || null; }
  function uniqueStrings(values){ var seen = {}; return (Array.isArray(values) ? values : []).map(function(v){ return clean(v,500); }).filter(function(v){ if (!v || seen[v]) return false; seen[v]=true; return true; }); }

  function resetPhotoMemory(){
    photoFile = null;
    if (photoObjectUrl) { try { URL.revokeObjectURL(photoObjectUrl); } catch (_) {} photoObjectUrl = ''; }
    var input = byId('jvssPhoto'); if (input) input.value = '';
    var img = byId('jvssPhotoPreview'); if (img) { img.hidden = true; img.removeAttribute('src'); }
  }

  function openPhotoDb(){
    return new Promise(function(resolve, reject){
      if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
      var req = indexedDB.open(PHOTO_DB, 1);
      req.onupgradeneeded = function(){ var db = req.result; if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE,{keyPath:'id'}); };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error || new Error('IndexedDB error')); };
    });
  }
  function withPhotoStore(mode, fn){ return openPhotoDb().then(function(db){ return new Promise(function(resolve,reject){ var tx=db.transaction(PHOTO_STORE,mode); var store=tx.objectStore(PHOTO_STORE); var result; try { result=fn(store); } catch(e){ db.close(); reject(e); return; } tx.oncomplete=function(){ db.close(); resolve(result); }; tx.onerror=function(){ db.close(); reject(tx.error||new Error('IndexedDB transaction error')); }; }); }); }
  function savePhotoDraft(id, file){ return withPhotoStore('readwrite',function(store){ store.put({id:id,blob:file,name:clean(file.name,180),type:clean(file.type,80),savedAt:Date.now()}); }); }
  function deletePhotoDraft(id){ if(!id) return Promise.resolve(); return withPhotoStore('readwrite',function(store){ store.delete(id); }).catch(function(){}); }
  function readPhotoDraft(id){ return openPhotoDb().then(function(db){ return new Promise(function(resolve,reject){ var tx=db.transaction(PHOTO_STORE,'readonly'); var req=tx.objectStore(PHOTO_STORE).get(id); req.onsuccess=function(){ var row=req.result||null; db.close(); resolve(row); }; req.onerror=function(){ db.close(); reject(req.error); }; }); }); }
  function purgeOldPhotos(){
    return openPhotoDb().then(function(db){ return new Promise(function(resolve){ var tx=db.transaction(PHOTO_STORE,'readwrite'); var store=tx.objectStore(PHOTO_STORE); var req=store.openCursor(); req.onsuccess=function(){ var cursor=req.result; if(!cursor) return; var row=cursor.value; if(!row || !row.savedAt || Date.now()-row.savedAt>PHOTO_TTL_MS) cursor.delete(); cursor.continue(); }; tx.oncomplete=function(){ db.close(); resolve(); }; tx.onerror=function(){ db.close(); resolve(); }; }); }).catch(function(){});
  }

  function fileToDataUrl(file){ return new Promise(function(resolve,reject){ var reader=new FileReader(); reader.onload=function(){ resolve(String(reader.result||'')); }; reader.onerror=function(){ reject(reader.error||new Error('Lecture photo impossible')); }; reader.readAsDataURL(file); }); }
  function makeDraftId(){ try { return 'draft:'+crypto.randomUUID(); } catch (_) { return 'draft:'+Date.now()+':'+Math.random().toString(16).slice(2); } }

  function modePayload(){
    if (currentMode === 'barcode') return clean(byId('jvssBarcode') && byId('jvssBarcode').value,32).replace(/\s/g,'');
    if (currentMode === 'link') return clean(byId('jvssLink') && byId('jvssLink').value,2048);
    if (currentMode === 'text') return clean(byId('jvssText') && byId('jvssText').value,300);
    return photoFile ? clean(photoFile.name,180) : '';
  }

  function selectMode(mode, focusPanel){
    if (MODES.indexOf(mode) < 0) mode='barcode';
    currentMode=mode; currentIdentification=null; confirmedProduct=null;
    MODES.forEach(function(item){ var tab=byId('jvssTab-'+item); var pane=byId('jvssPane-'+item); if(tab){ tab.setAttribute('aria-selected',item===mode?'true':'false'); tab.tabIndex=item===mode?0:-1; } if(pane) pane.hidden=item!==mode; });
    var candidates=byId('jvssCandidatesCard'); if(candidates) candidates.hidden=true;
    var analysis=byId('jvssAnalysisCard'); if(analysis) analysis.hidden=true;
    var decision=byId('jvssDecision'); if(decision) decision.hidden=true;
    setStatus(mode==='photo' ? 'Prends une photo nette du produit. Julvox demandera toujours ta confirmation.' : 'Renseigne le produit puis lance l’identification.');
    if(focusPanel){ var pane=byId('jvssPane-'+mode); var input=pane && pane.querySelector('input,textarea,button'); if(input) input.focus(); }
  }

  function open(mode){
    var modal=byId(MODAL_ID); if(!modal) return;
    lastFocused=document.activeElement;
    modal.hidden=false; document.documentElement.style.overflow='hidden'; document.body.style.overflow='hidden';
    selectMode(mode||'barcode',false);
    window.setTimeout(function(){ var close=byId('jvssClose'); if(close) close.focus(); },0);
  }
  function close(){
    var modal=byId(MODAL_ID); if(!modal) return;
    stopLegacyCamera(); modal.hidden=true; document.documentElement.style.overflow=''; document.body.style.overflow=''; resetPhotoMemory(); currentIdentification=null; confirmedProduct=null;
    if(lastFocused && typeof lastFocused.focus==='function') { try { lastFocused.focus(); } catch (_) {} }
  }

  function stopLegacyCamera(){
    if(cameraPoll){ clearInterval(cameraPoll); cameraPoll=0; }
    if(legacyStop){ try{ legacyStop(); }catch(_){} }
    var legacyModal=byId('julvoxProductScanner'); if(legacyModal) legacyModal.hidden=true;
  }
  function scanWithCamera(){
    if(!legacyOpen){ setStatus('Le scanner caméra n’est pas disponible. Utilise la saisie manuelle.'); return; }
    var before=''; try{ var prev=JSON.parse(sessionStorage.getItem(LEGACY_SESSION_KEY)||'null'); before=prev&&prev.scannedAt||''; }catch(_){}
    legacyOpen(); setStatus('Cadre le code-barres avec la caméra. Aucun son n’est nécessaire.');
    if(cameraPoll) clearInterval(cameraPoll);
    cameraPoll=setInterval(function(){
      try{
        var row=JSON.parse(sessionStorage.getItem(LEGACY_SESSION_KEY)||'null');
        if(row && row.barcode && row.scannedAt && row.scannedAt!==before){
          stopLegacyCamera(); var input=byId('jvssBarcode'); if(input) input.value=clean(row.barcode,32); setStatus('Code capturé. Vérifie-le puis lance l’identification.'); if(input) input.focus();
        }
      }catch(_){}
    },350);
  }

  function matchLabel(candidate){
    var basis=clean(candidate && (candidate.matchBasis||candidate.match_basis),80);
    if(basis==='exact_barcode') return 'Correspondance exacte du code-barres';
    if(basis==='exact_observed_url') return 'URL déjà observée exactement';
    if(basis==='vision_inference') return 'Hypothèse visuelle — à confirmer';
    return 'Suggestion du catalogue — à confirmer';
  }
  function candidateName(c){ return clean([c&&c.brand,c&&c.name,c&&c.model,c&&c.color,c&&c.variant].filter(Boolean).join(' '),300) || 'Produit proposé'; }
  function renderCandidates(response){
    currentIdentification=response; confirmedProduct=null;
    var card=byId('jvssCandidatesCard'); var list=byId('jvssCandidates'); if(!card||!list) return;
    var candidates=Array.isArray(response&&response.candidates)?response.candidates:[];
    card.hidden=false;
    if(!candidates.length){
      list.innerHTML='<div class="jvss-warning">Aucun produit suffisamment étayé n’a été identifié. Julvox ne remplit pas les blancs.</div>';
      var confirm=byId('jvssConfirmBtn'); if(confirm) confirm.disabled=true;
      return;
    }
    list.innerHTML=candidates.map(function(c,index){
      var confidence=Number(c&&c.confidence); var confidenceText=Number.isFinite(confidence)?' — confiance fournie : '+Math.round(confidence*100)+' %':'';
      return '<label class="jvss-candidate"><input type="radio" name="jvssCandidate" value="'+index+'" '+(index===0?'checked':'')+'><span><strong>'+escapeHtml(candidateName(c))+'</strong><span>'+escapeHtml([c&&c.category,c&&c.model,c&&c.color,c&&c.variant].filter(Boolean).join(' · ')||'Aucun détail supplémentaire vérifié')+'</span><em>'+escapeHtml(matchLabel(c)+confidenceText)+'</em></span></label>';
    }).join('');
    var confirm=byId('jvssConfirmBtn'); if(confirm) confirm.disabled=false;
  }

  async function apiPost(path,payload){
    var adapter=backend();
    if(adapter && typeof adapter.post==='function') return adapter.post(path,payload);
    var base=apiBase(); if(!base) throw new Error('Backend Julvox non configuré');
    var response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit'});
    var data=null; try{ data=await response.json(); }catch(_){}
    if(!response.ok){ var error=new Error('Réponse backend '+response.status); error.status=response.status; error.payload=data; throw error; }
    return data;
  }

  async function identify(){
    currentIdentification=null; confirmedProduct=null;
    var analysis=byId('jvssAnalysisCard'); if(analysis) analysis.hidden=true;
    var decision=byId('jvssDecision'); if(decision) decision.hidden=true;
    if(!online()){ await saveDraft(true); setStatus('Produit enregistré. Connexion nécessaire pour récupérer les prix et l’analyse complète.'); return; }
    var payload={mode:currentMode,limit:5};
    try{
      if(currentMode==='barcode'){
        var barcode=modePayload(); if(!/^\d{8}$|^\d{12}$|^\d{13}$/.test(barcode)){ setStatus('Saisis un EAN-8, UPC-A ou EAN-13 valide.'); return; } payload.barcode=barcode;
      } else if(currentMode==='link'){
        var link=modePayload(); if(!link){setStatus('Colle un lien produit.');return;} var parsed=new URL(link); var allowed=['amazon.fr','www.amazon.fr','fnac.com','www.fnac.com','darty.com','www.darty.com','boulanger.com','www.boulanger.com','ikea.com','www.ikea.com','cdiscount.com','www.cdiscount.com','leroymerlin.fr','www.leroymerlin.fr']; if(parsed.protocol!=='https:'||allowed.indexOf(parsed.hostname.toLowerCase())<0){setStatus('Lien HTTPS Amazon, Fnac, Darty, Boulanger, Ikea, Cdiscount ou Leroy Merlin attendu.');return;} payload.url=link;
      } else if(currentMode==='text'){
        var query=modePayload(); if(query.length<2){setStatus('Décris le produit recherché en au moins deux caractères.');return;} payload.query=query;
      } else {
        if(!photoFile){setStatus('Prends ou sélectionne une photo du produit.');return;} setStatus('Photo prête. Identification en cours…'); payload.photoDataUrl=await fileToDataUrl(photoFile);
      }
      setStatus('Identification en cours…');
      var response=await apiPost('/smart-scan/identify',payload);
      if(currentMode==='photo') resetPhotoMemory();
      renderCandidates(response);
      if(response&&response.status==='vision_unavailable') setStatus('La reconnaissance visuelle n’est pas disponible sur cette version. La photo n’a pas été conservée par Julvox.');
      else if(response&&response.status==='not_found') setStatus('Produit non identifié avec des preuves suffisantes. Essaie un autre mode ou précise la recherche.');
      else setStatus('Vérifie le produit proposé. Ta confirmation est obligatoire avant toute analyse.');
    }catch(error){
      if(currentMode==='photo') resetPhotoMemory();
      renderCandidates({candidates:[]}); setStatus(error&&error.status===404?'Le service Smart Scan backend n’est pas encore déployé sur cet environnement.':'L’identification n’a pas abouti. Julvox ne déduit aucun produit sans preuve.');
    }
  }

  async function confirmCandidate(){
    if(!currentIdentification || !Array.isArray(currentIdentification.candidates)) return;
    var selected=document.querySelector('input[name="jvssCandidate"]:checked'); if(!selected){setStatus('Choisis le produit que tu regardes.');return;}
    var candidate=currentIdentification.candidates[Number(selected.value)]; if(!candidate){setStatus('Choix de produit invalide.');return;}
    try{
      await apiPost('/smart-scan/confirm',{identificationId:currentIdentification.identificationId,candidate:candidate,confirmed:true});
      confirmedProduct=candidate; var card=byId('jvssAnalysisCard'); if(card) card.hidden=false; var label=byId('jvssConfirmed'); if(label) label.innerHTML='<strong>Produit confirmé</strong><span>'+escapeHtml(candidateName(candidate))+'</span>'; setStatus('Produit confirmé. Ajoute les informations que tu connais, puis demande l’avis Julvox.'); if(card) card.scrollIntoView({block:'nearest'});
    }catch(error){ setStatus(error&&error.status===404?'Le service de confirmation Smart Scan n’est pas encore déployé sur cet environnement.':'La confirmation n’a pas abouti.'); }
  }

  function moneyMinor(value){ var text=clean(value,30).replace(/\s/g,'').replace(',','.'); if(!text) return null; var n=Number(text); if(!Number.isFinite(n)||n<=0) return null; return Math.round(n*100); }
  function verdictLabel(value){ if(value==='buy_now')return 'Acheter maintenant'; if(value==='wait')return 'Attendre'; if(value==='do_not_buy')return 'Ne pas acheter'; return 'Comparer davantage'; }
  function renderList(title,values){ var items=uniqueStrings(values); if(!items.length)return ''; return '<div class="jvss-section"><h4>'+escapeHtml(title)+'</h4><ul>'+items.map(function(v){return '<li>'+escapeHtml(v)+'</li>';}).join('')+'</ul></div>'; }
  function renderDecision(result){
    var box=byId('jvssDecision'); if(!box)return; box.hidden=false;
    var verdict=clean(result&&result.verdict,40); if(['buy_now','wait','compare_more','do_not_buy'].indexOf(verdict)<0) verdict='compare_more';
    var evidence=Array.isArray(result&&result.evidence)?result.evidence:[];
    box.innerHTML='<h3 class="jvss-verdict">'+escapeHtml(verdictLabel(verdict))+'</h3><p class="jvss-confidence">Confiance : '+escapeHtml(clean(result&&result.confidence,40)||'non déterminée')+'</p>'+renderList('Pourquoi',result&&result.reasons)+renderList('Risques',result&&result.risks)+renderList('Informations manquantes',result&&result.missingInformation)+renderList('Ce qui pourrait changer la recommandation',result&&result.changeFactors)+(evidence.length?'<div class="jvss-evidence">Preuves factuelles exposées : '+escapeHtml(String(evidence.length))+'. Les données non disponibles ne sont pas remplacées par des estimations.</div>':'<div class="jvss-evidence">Aucune preuve factuelle exploitable n’a été exposée pour ce verdict.</div>');
  }

  async function analyze(){
    if(!confirmedProduct || !currentIdentification){setStatus('Confirme d’abord le produit identifié.');return;}
    if(!online()){ await saveDraft(true); setStatus('Produit enregistré. Connexion nécessaire pour récupérer les prix et l’analyse complète.'); return; }
    var price=moneyMinor(byId('jvssPrice')&&byId('jvssPrice').value); var budget=moneyMinor(byId('jvssBudget')&&byId('jvssBudget').value); var currency=clean(byId('jvssCurrency')&&byId('jvssCurrency').value,3).toUpperCase(); var market=clean(byId('jvssMarket')&&byId('jvssMarket').value,2).toUpperCase(); var condition=clean(byId('jvssCondition')&&byId('jvssCondition').value,30); var urgency=clean(byId('jvssUrgency')&&byId('jvssUrgency').value,30)||'unknown';
    var payload={identificationId:currentIdentification.identificationId,confirmedProduct:confirmedProduct,confirmed:true,urgency:urgency}; if(price)payload.storePriceMinor=price;if(budget)payload.budgetMinor=budget;if(currency)payload.currency=currency;if(market)payload.marketCountry=market;if(condition)payload.condition=condition;
    setStatus('Analyse Julvox en cours…');
    try{ var result=await apiPost('/smart-scan/analyze',payload); renderDecision(result); saveHistory(result,price); setStatus('Analyse terminée. Julvox conserve explicitement les incertitudes restantes.'); }
    catch(error){ setStatus(error&&error.status===404?'Le moteur Smart Scan backend n’est pas encore déployé sur cet environnement.':'L’analyse n’a pas abouti. Aucune recommandation n’est inventée.'); }
  }

  function draftData(id){
    return {id:id,mode:currentMode,value:currentMode==='photo'?null:modePayload(),photoLocal:currentMode==='photo'&&!!photoFile,storePrice:clean(byId('jvssPrice')&&byId('jvssPrice').value,40)||null,storeName:clean(byId('jvssStore')&&byId('jvssStore').value,120)||null,currency:clean(byId('jvssCurrency')&&byId('jvssCurrency').value,3)||null,marketCountry:clean(byId('jvssMarket')&&byId('jvssMarket').value,2)||null,condition:clean(byId('jvssCondition')&&byId('jvssCondition').value,30)||null,budget:clean(byId('jvssBudget')&&byId('jvssBudget').value,40)||null,urgency:clean(byId('jvssUrgency')&&byId('jvssUrgency').value,30)||'unknown',savedAt:nowIso(),confirmedProduct:confirmedProduct?{candidateId:confirmedProduct.candidateId||confirmedProduct.candidate_id,name:confirmedProduct.name,brand:confirmedProduct.brand||null,model:confirmedProduct.model||null,category:confirmedProduct.category||null}:null};
  }
  async function saveDraft(silent){
    var id=makeDraftId(); var data=draftData(id); var drafts=readJson(DRAFTS_KEY,[]); if(!Array.isArray(drafts))drafts=[]; drafts=[data].concat(drafts).slice(0,20); writeJson(DRAFTS_KEY,drafts);
    if(currentMode==='photo'&&photoFile){ try{await savePhotoDraft(id,photoFile);data.photoLocal=true;writeJson(DRAFTS_KEY,[data].concat(drafts.filter(function(d){return d&&d.id!==id;})).slice(0,20));}catch(_){data.photoLocal=false;} }
    if(!silent)setStatus(data.photoLocal?'Brouillon enregistré temporairement sur cet appareil. La photo sera purgée sous 24 h ou après traitement.':'Brouillon enregistré sur cet appareil.'); return data;
  }
  function saveHistory(result,priceMinor){
    if(localStorage.getItem(HISTORY_ENABLED_KEY)!=='true'||!confirmedProduct)return; var rows=readJson(HISTORY_KEY,[]);if(!Array.isArray(rows))rows=[]; var reasons=uniqueStrings(result&&result.reasons); var row={date:nowIso(),product:candidateName(confirmedProduct),store:clean(byId('jvssStore')&&byId('jvssStore').value,120)||null,priceMinor:priceMinor||null,currency:clean(byId('jvssCurrency')&&byId('jvssCurrency').value,3)||null,decision:verdictLabel(clean(result&&result.verdict,40)),reason:reasons[0]||null}; writeJson(HISTORY_KEY,[row].concat(rows).slice(0,50));
  }

  async function restoreDraft(id){
    var drafts=readJson(DRAFTS_KEY,[]);var draft=Array.isArray(drafts)?drafts.find(function(d){return d&&d.id===id;}):null;if(!draft)return false;open(draft.mode||'barcode'); if(draft.mode==='barcode'){var e=byId('jvssBarcode');if(e)e.value=clean(draft.value,32);} if(draft.mode==='link'){var l=byId('jvssLink');if(l)l.value=clean(draft.value,2048);} if(draft.mode==='text'){var t=byId('jvssText');if(t)t.value=clean(draft.value,300);} if(draft.photoLocal){try{var row=await readPhotoDraft(id);if(row&&row.blob){photoFile=new File([row.blob],row.name||'photo-produit',{type:row.type||row.blob.type});photoObjectUrl=URL.createObjectURL(photoFile);var img=byId('jvssPhotoPreview');if(img){img.src=photoObjectUrl;img.hidden=false;}}}catch(_){}} setStatus('Brouillon restauré. Confirme les informations avant de continuer.');return true;
  }

  function photoChanged(event){ resetPhotoMemory(); var file=event.target.files&&event.target.files[0]; if(!file)return; if(['image/jpeg','image/png','image/webp'].indexOf(file.type)<0||file.size>6*1024*1024){event.target.value='';setStatus('Photo JPEG, PNG ou WebP de 6 Mo maximum attendue.');return;} photoFile=file;photoObjectUrl=URL.createObjectURL(file);var img=byId('jvssPhotoPreview');if(img){img.src=photoObjectUrl;img.hidden=false;}setStatus('Photo chargée localement. Elle n’est pas ajoutée à une galerie Julvox.'); }

  function keydown(event){
    var modal=byId(MODAL_ID);if(!modal||modal.hidden)return;
    if(event.key==='Escape'){event.preventDefault();close();return;}
    var tab=event.target&&event.target.closest&&event.target.closest('.jvss-tab');if(tab&&(event.key==='ArrowRight'||event.key==='ArrowLeft')){event.preventDefault();var index=MODES.indexOf(tab.getAttribute('data-mode'));index=(index+(event.key==='ArrowRight'?1:-1)+MODES.length)%MODES.length;selectMode(MODES[index],false);var next=byId('jvssTab-'+MODES[index]);if(next)next.focus();return;}
    if(event.key==='Tab'){var focusables=Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(el){return !el.closest('[hidden]');});if(!focusables.length)return;var first=focusables[0],last=focusables[focusables.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  }

  function bind(){
    document.addEventListener('click',function(event){
      var action=event.target&&event.target.closest&&event.target.closest('[data-jvss-action]');if(!action)return;var type=action.getAttribute('data-jvss-action');
      if(type==='close')close();else if(type==='identify')identify();else if(type==='confirm')confirmCandidate();else if(type==='analyze')analyze();else if(type==='save-draft')saveDraft(false);else if(type==='camera')scanWithCamera();else if(type==='mode')selectMode(action.getAttribute('data-mode'),true);
    });
    document.addEventListener('change',function(event){if(event.target&&event.target.id==='jvssPhoto')photoChanged(event);});
    document.addEventListener('keydown',keydown);
    window.addEventListener('offline',function(){setStatus('Hors connexion. Tu peux continuer à saisir et enregistrer un brouillon.');});
    window.addEventListener('online',function(){setStatus('Connexion rétablie. Tu peux reprendre l’identification ou l’analyse.');});
    var modal=byId(MODAL_ID);if(modal)modal.addEventListener('click',function(event){if(event.target===modal)close();});
  }

  function install(){
    if(!byId(MODAL_ID))return;
    bind();purgeOldPhotos();
    window.JulvoxSmartScan={open:open,close:close,identify:identify,saveDraft:saveDraft,restoreDraft:restoreDraft};
    var scanner=window.JulvoxProductScanner||{};scanner.open=function(){open('barcode');};scanner.stop=function(){close();};window.JulvoxProductScanner=scanner;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
</script>`;

const SMART_SCAN_HTML = String.raw`
<div id="julvoxSmartScan" hidden role="dialog" aria-modal="true" aria-labelledby="jvssTitle" aria-describedby="jvssIntro">
  <section class="jvss-panel">
    <header class="jvss-head"><div><p class="jvss-kicker">Julvox · aide à la décision</p><h2 class="jvss-title" id="jvssTitle">Identifier un produit</h2></div><button class="jvss-close" id="jvssClose" type="button" data-jvss-action="close" aria-label="Fermer">×</button></header>
    <p class="jvss-copy" id="jvssIntro">Code-barres, photo, lien ou texte : Julvox identifie d’abord le produit, puis te demande de confirmer avant toute analyse.</p>
    <div class="jvss-tabs" role="tablist" aria-label="Mode d’identification">
      <button class="jvss-tab" id="jvssTab-barcode" role="tab" aria-selected="true" data-jvss-action="mode" data-mode="barcode">Code-barres<small>EAN / UPC</small></button>
      <button class="jvss-tab" id="jvssTab-photo" role="tab" aria-selected="false" data-jvss-action="mode" data-mode="photo" tabindex="-1">Photo<small>produit</small></button>
      <button class="jvss-tab" id="jvssTab-link" role="tab" aria-selected="false" data-jvss-action="mode" data-mode="link" tabindex="-1">Lien<small>boutique</small></button>
      <button class="jvss-tab" id="jvssTab-text" role="tab" aria-selected="false" data-jvss-action="mode" data-mode="text" tabindex="-1">Texte<small>recherche</small></button>
    </div>
    <div class="jvss-status" id="jvssStatus" aria-live="polite">Renseigne le produit puis lance l’identification.</div>

    <div class="jvss-pane jvss-card" id="jvssPane-barcode" role="tabpanel" aria-labelledby="jvssTab-barcode">
      <label class="jvss-label" for="jvssBarcode">Code-barres</label><div class="jvss-row"><input class="jvss-input" id="jvssBarcode" inputmode="numeric" autocomplete="off" placeholder="EAN-13, EAN-8 ou UPC-A" aria-describedby="jvssBarcodeHelp"><button class="jvss-btn" type="button" data-jvss-action="camera">Scanner avec la caméra</button></div><p class="jvss-privacy" id="jvssBarcodeHelp">La saisie manuelle reste toujours disponible. Aucun son n’est requis.</p><div class="jvss-actions"><button class="jvss-btn jvss-btn-primary" type="button" data-jvss-action="identify">Identifier</button><button class="jvss-btn" type="button" data-jvss-action="save-draft">Enregistrer le brouillon</button></div>
    </div>

    <div class="jvss-pane jvss-card" id="jvssPane-photo" role="tabpanel" aria-labelledby="jvssTab-photo" hidden>
      <label class="jvss-label" for="jvssPhoto">Photo du produit</label><input class="jvss-input" id="jvssPhoto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><img class="jvss-photo-preview" id="jvssPhotoPreview" alt="Aperçu temporaire de la photo du produit" hidden><p class="jvss-privacy">La photo n’est pas ajoutée à une galerie Julvox. En ligne, elle est envoyée uniquement pour l’identification puis supprimée de la mémoire de cette interface. Un brouillon photo hors ligne n’est conservé sur l’appareil que si tu choisis explicitement de l’enregistrer, au maximum 24 h.</p><div class="jvss-actions"><button class="jvss-btn jvss-btn-primary" type="button" data-jvss-action="identify">Identifier la photo</button><button class="jvss-btn" type="button" data-jvss-action="save-draft">Enregistrer le brouillon hors ligne</button></div>
    </div>

    <div class="jvss-pane jvss-card" id="jvssPane-link" role="tabpanel" aria-labelledby="jvssTab-link" hidden>
      <label class="jvss-label" for="jvssLink">Lien produit</label><input class="jvss-input" id="jvssLink" type="url" inputmode="url" autocomplete="url" placeholder="https://…"><p class="jvss-privacy">Amazon, Fnac, Darty, Boulanger, Ikea, Cdiscount ou Leroy Merlin. Une URL inconnue reste inconnue : Julvox n’invente pas le produit.</p><div class="jvss-actions"><button class="jvss-btn jvss-btn-primary" type="button" data-jvss-action="identify">Identifier</button><button class="jvss-btn" type="button" data-jvss-action="save-draft">Enregistrer le brouillon</button></div>
    </div>

    <div class="jvss-pane jvss-card" id="jvssPane-text" role="tabpanel" aria-labelledby="jvssTab-text" hidden>
      <label class="jvss-label" for="jvssText">Décris ce que tu cherches</label><textarea class="jvss-input jvss-textarea" id="jvssText" placeholder="Ex. Je cherche un casque Bluetooth pour mon fils."></textarea><div class="jvss-actions"><button class="jvss-btn jvss-btn-primary" type="button" data-jvss-action="identify">Rechercher</button><button class="jvss-btn" type="button" data-jvss-action="save-draft">Enregistrer le brouillon</button></div>
    </div>

    <section class="jvss-card" id="jvssCandidatesCard" hidden aria-labelledby="jvssCandidatesTitle"><h3 class="jvss-title" id="jvssCandidatesTitle" style="font-size:18px">Quel produit regardes-tu ?</h3><p class="jvss-copy">Julvox ne choisit jamais à ta place le produit reconnu.</p><div class="jvss-candidates" id="jvssCandidates"></div><div class="jvss-actions"><button class="jvss-btn jvss-btn-accent" id="jvssConfirmBtn" type="button" data-jvss-action="confirm">C’est ce produit</button></div></section>

    <section class="jvss-card" id="jvssAnalysisCard" hidden aria-labelledby="jvssAnalysisTitle"><h3 class="jvss-title" id="jvssAnalysisTitle" style="font-size:18px">Ta situation d’achat</h3><div class="jvss-confirmed" id="jvssConfirmed"></div><p class="jvss-copy">Renseigne seulement ce que tu sais. Les champs laissés vides resteront des informations manquantes.</p>
      <div class="jvss-row"><div><label class="jvss-label" for="jvssPrice">Prix affiché</label><input class="jvss-input" id="jvssPrice" inputmode="decimal" placeholder="Ex. 329,00"></div><div><label class="jvss-label" for="jvssCurrency">Devise</label><select class="jvss-select" id="jvssCurrency"><option value="">À préciser</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option></select></div></div>
      <div class="jvss-row" style="margin-top:10px"><div><label class="jvss-label" for="jvssStore">Magasin (pour ton historique, facultatif)</label><input class="jvss-input" id="jvssStore" autocomplete="organization" placeholder="Ex. Fnac Bordeaux"></div><div><label class="jvss-label" for="jvssMarket">Pays du prix</label><input class="jvss-input" id="jvssMarket" autocomplete="country" maxlength="2" placeholder="Ex. FR"></div></div>
      <div class="jvss-row" style="margin-top:10px"><div><label class="jvss-label" for="jvssCondition">État</label><select class="jvss-select" id="jvssCondition"><option value="">À préciser</option><option value="new">Neuf</option><option value="open_box">Boîte ouverte</option><option value="refurbished">Reconditionné</option><option value="used">Occasion</option></select></div><div><label class="jvss-label" for="jvssBudget">Budget maximum</label><input class="jvss-input" id="jvssBudget" inputmode="decimal" placeholder="Facultatif"></div></div>
      <div style="margin-top:10px"><label class="jvss-label" for="jvssUrgency">Urgence du besoin</label><select class="jvss-select" id="jvssUrgency"><option value="unknown">Je ne précise pas</option><option value="immediate">Besoin immédiat</option><option value="can_wait">Je peux attendre</option></select></div>
      <div class="jvss-actions"><button class="jvss-btn jvss-btn-primary" type="button" data-jvss-action="analyze">Est-ce une bonne décision pour moi maintenant ?</button><button class="jvss-btn" type="button" data-jvss-action="save-draft">Enregistrer le brouillon</button></div>
      <div class="jvss-decision" id="jvssDecision" hidden aria-live="polite"></div>
    </section>
  </section>
</div>`;

function applySmartScanExperience(html) {
  if (typeof html !== 'string' || !html.includes('</body>')) {
    throw new Error('JULVOX-PRODUCT-VISION-SMART-SCAN-01 expected an HTML document with </body>');
  }
  if (html.includes(MARKER)) return html;
  return html.replace('</body>', `${MARKER}\n${SMART_SCAN_CSS}\n${SMART_SCAN_HTML}\n${SMART_SCAN_RUNTIME}\n</body>`);
}

function verifySmartScanExperience(html) {
  const required = [
    MARKER,
    'id="julvoxSmartScan"',
    'data-mode="barcode"',
    'data-mode="photo"',
    'data-mode="link"',
    'data-mode="text"',
    'Quel produit regardes-tu ?',
    'C’est ce produit',
    '/smart-scan/identify',
    '/smart-scan/confirm',
    '/smart-scan/analyze',
    'Acheter maintenant',
    'Attendre',
    'Comparer davantage',
    'Ne pas acheter',
    'photoDrafts',
    'julvox:history:enabled',
  ];
  const missing = required.filter((token) => !html.includes(token));
  if (missing.length) throw new Error(`Smart Scan integration missing: ${missing.join(', ')}`);
  if (/confidence[^\n]{0,120}(91|95|99)\s*%/i.test(html)) {
    throw new Error('Smart Scan must not embed invented confidence percentages');
  }
  return true;
}

module.exports = { MARKER, SMART_SCAN_CSS, SMART_SCAN_HTML, SMART_SCAN_RUNTIME, applySmartScanExperience, verifySmartScanExperience };
