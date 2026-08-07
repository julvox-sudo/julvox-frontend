const MARKER = '<!-- julvox-product-barcode-scanner-01 -->';

const SCANNER_CSS = String.raw`
<style id="julvox-product-barcode-scanner-01-styles">
.prscan-entry{display:inline-flex!important;align-items:center;gap:8px;font-weight:700!important}
.prscan-entry svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#julvoxProductScanner[hidden]{display:none!important}
#julvoxProductScanner{position:fixed;inset:0;z-index:140;background:rgba(11,29,52,.46);display:grid;place-items:end center;padding:18px;overscroll-behavior:contain}
.prscan-panel{width:min(680px,100%);max-height:min(92vh,840px);overflow:auto;background:#fffdf9;border:1px solid rgba(11,29,52,.12);border-radius:26px;box-shadow:0 24px 70px rgba(11,29,52,.24);color:#162536;padding:20px}
.prscan-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px}
.prscan-kicker{margin:0 0 5px;font:700 12px/1.2 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#0b6764}
.prscan-title{margin:0;font:650 25px/1.15 Sora,Inter,system-ui,sans-serif;color:#0B1D34;letter-spacing:-.45px}
.prscan-close{min-width:48px;min-height:48px;border:1px solid rgba(11,29,52,.12);border-radius:14px;background:#fff;color:#0B1D34;font-size:22px;cursor:pointer}
.prscan-copy,.prscan-note{margin:0 0 14px;font:500 14px/1.55 Inter,system-ui,sans-serif;color:#52616b}
.prscan-status{min-height:24px;margin:10px 0 14px;padding:10px 12px;border-radius:12px;background:#f3f7f6;color:#214d4a;font:650 14px/1.4 Inter,system-ui,sans-serif}
.prscan-camera{position:relative;overflow:hidden;aspect-ratio:4/3;border-radius:18px;background:#0B1D34;display:grid;place-items:center;margin:12px 0}
.prscan-camera video{width:100%;height:100%;object-fit:cover}
.prscan-frame{position:absolute;inset:22% 10%;border:3px solid rgba(255,255,255,.92);border-radius:16px;box-shadow:0 0 0 999px rgba(11,29,52,.22);pointer-events:none}
.prscan-camera-copy{position:absolute;bottom:14px;left:14px;right:14px;text-align:center;color:#fff;font:700 13px/1.35 Inter,system-ui,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.55)}
.prscan-actions{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
.prscan-btn{min-height:48px;border-radius:14px;padding:0 16px;border:1px solid rgba(11,29,52,.13);background:#fff;color:#0B1D34;font:700 14px/1 Inter,system-ui,sans-serif;cursor:pointer}
.prscan-btn-primary{background:#0B1D34;color:#fff;border-color:#0B1D34}
.prscan-btn-accent{background:#0EA7A1;color:#062e2d;border-color:#0EA7A1}
.prscan-btn:focus-visible,.prscan-close:focus-visible,.prscan-input:focus-visible{outline:3px solid rgba(14,167,161,.34);outline-offset:2px}
.prscan-manual{padding-top:14px;border-top:1px solid rgba(11,29,52,.09)}
.prscan-label{display:block;margin-bottom:7px;font:700 13px/1.3 Inter,system-ui,sans-serif;color:#0B1D34}
.prscan-row{display:flex;gap:8px;align-items:stretch}
.prscan-input{width:100%;min-height:48px;border:1px solid rgba(11,29,52,.18);border-radius:13px;background:#fff;padding:0 13px;color:#0B1D34;font:600 16px/1 Inter,system-ui,sans-serif}
.prscan-result{margin-top:16px;padding:16px;border:1px solid rgba(11,29,52,.10);border-radius:18px;background:#FCF9F4}
.prscan-result[hidden]{display:none!important}
.prscan-result h3{margin:0 0 10px;font:650 20px/1.25 Sora,Inter,system-ui,sans-serif;color:#0B1D34}
.prscan-facts{display:grid;gap:7px;margin:0 0 14px;padding:0;list-style:none;font:550 14px/1.45 Inter,system-ui,sans-serif;color:#52616b}
.prscan-facts strong{color:#0B1D34}
.prscan-decision{padding:12px;border-radius:14px;background:#fff;border:1px solid rgba(11,29,52,.09)}
.prscan-decision strong{display:block;color:#0B1D34;font:750 14px/1.3 Inter,system-ui,sans-serif;margin-bottom:4px}
.prscan-decision span{color:#52616b;font:500 14px/1.45 Inter,system-ui,sans-serif}
.prscan-offline{margin-top:10px;padding:11px 12px;border-radius:12px;background:#fff4d8;color:#694d16;font:650 13px/1.45 Inter,system-ui,sans-serif}
.prscan-price{margin-top:14px}
.prscan-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
@media (max-width:760px){#julvoxProductScanner{padding:0;place-items:end stretch}.prscan-panel{width:100%;max-height:94dvh;border-radius:24px 24px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}.prscan-title{font-size:22px}.prscan-row{flex-direction:column}.prscan-row .prscan-btn{width:100%}}
@media (orientation:landscape) and (max-height:520px){#julvoxProductScanner{place-items:stretch end}.prscan-panel{width:min(650px,92vw);height:100%;max-height:none;border-radius:24px 0 0 24px}.prscan-camera{aspect-ratio:16/8}}
@media (prefers-reduced-motion:reduce){#julvoxProductScanner *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
</style>`;

const SCANNER_RUNTIME = String.raw`
<script id="julvox-product-barcode-scanner-01-runtime">
(function julvoxProductBarcodeScanner01(){
  'use strict';
  var SCANNER_ID = 'julvoxProductScanner';
  var PENDING_KEY = 'julvox:product-scanner:pending:v1';
  var SESSION_KEY = 'julvox:product-scanner:current:v1';
  var HISTORY_KEY = 'julvox:product-scanner:history:v1';
  var HISTORY_ENABLED_KEY = 'julvox:history:enabled';
  var DESIRED_FORMATS = ['ean_13','ean_8','upc_a','upc_e'];
  var stream = null;
  var detector = null;
  var scanning = false;
  var scanLocked = false;
  var detectTimer = 0;
  var lastTrigger = null;
  var currentScan = null;

  function byId(id){ return document.getElementById(id); }
  function clean(value, limit){ return String(value == null ? '' : value).replace(/\s+/g,' ').trim().slice(0, limit || 500); }
  function escapeHtml(value){ return clean(value,1000).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function nowIso(){ return new Date().toISOString(); }
  function online(){ return navigator.onLine !== false; }
  function readJson(key, fallback){ try { var value = JSON.parse(localStorage.getItem(key) || 'null'); return value == null ? fallback : value; } catch (_) { return fallback; } }
  function writeJson(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  function removeLocal(key){ try { localStorage.removeItem(key); } catch (_) {} }
  function setStatus(text){ var el = byId('prscanStatus'); if (el) el.textContent = clean(text,280); }

  function classifyManualBarcode(value){
    var digits = String(value || '').replace(/\D/g,'');
    if (digits.length === 13) return { barcode: digits, barcodeType: 'ean_13' };
    if (digits.length === 12) return { barcode: digits, barcodeType: 'upc_a' };
    if (digits.length === 8) return { barcode: digits, barcodeType: 'ean_8_or_upc_e' };
    if (digits.length === 6 || digits.length === 7) return { barcode: digits, barcodeType: 'upc_e_candidate' };
    return null;
  }

  function stopCamera(){
    scanning = false;
    scanLocked = false;
    if (detectTimer) { window.clearTimeout(detectTimer); detectTimer = 0; }
    if (stream) {
      stream.getTracks().forEach(function(track){ try { track.stop(); } catch (_) {} });
      stream = null;
    }
    var video = byId('prscanVideo');
    if (video) { try { video.pause(); } catch (_) {} video.srcObject = null; }
  }

  function saveCurrent(scan){
    currentScan = scan;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(scan)); } catch (_) {}
    if (!online()) {
      var pending = readJson(PENDING_KEY, []);
      if (!Array.isArray(pending)) pending = [];
      pending = [scan].concat(pending.filter(function(item){ return item && item.barcode !== scan.barcode; })).slice(0,20);
      writeJson(PENDING_KEY, pending);
    }
    if (localStorage.getItem(HISTORY_ENABLED_KEY) === 'true') {
      var history = readJson(HISTORY_KEY, []);
      if (!Array.isArray(history)) history = [];
      writeJson(HISTORY_KEY, [scan].concat(history).slice(0,50));
    }
  }

  function productLabel(scan){
    var p = scan && scan.product;
    if (!p) return 'Produit à identifier';
    return clean([p.brand,p.name,p.model,p.variant].filter(Boolean).join(' '),160) || 'Produit identifié';
  }

  function renderResult(scan){
    var result = byId('prscanResult');
    if (!result) return;
    var productStatus = clean(scan.identificationStatus || 'NON_RECONNU',60);
    var price = scan.storePrice && Number.isFinite(Number(scan.storePrice.amount)) ? Number(scan.storePrice.amount).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' ' + clean(scan.storePrice.currency || 'EUR',5) : 'Non renseigné';
    var decisionStatus = scan.decision && scan.decision.status ? clean(scan.decision.status,40) : 'insufficient_data';
    var decisionLabel = decisionStatus === 'buy_now' ? 'ACHETER MAINTENANT' : decisionStatus === 'wait' ? 'ATTENDRE' : decisionStatus === 'compare' ? 'COMPARER AVANT D’ACHETER' : 'INFORMATIONS INSUFFISANTES';
    var summary = scan.decision && scan.decision.summary ? clean(scan.decision.summary,260) : 'Le code est bien enregistré, mais Julvox ne dispose pas encore des données produit et prix nécessaires pour donner un avis fiable.';
    result.hidden = false;
    result.innerHTML = '<h3>' + escapeHtml(productLabel(scan)) + '</h3>' +
      '<ul class="prscan-facts"><li><strong>Code :</strong> ' + escapeHtml(scan.barcode) + '</li><li><strong>Format :</strong> ' + escapeHtml(scan.barcodeType) + '</li><li><strong>Identification :</strong> ' + escapeHtml(productStatus) + '</li><li><strong>Prix magasin :</strong> <span id="prscanRenderedPrice">' + escapeHtml(price) + '</span></li></ul>' +
      '<div class="prscan-decision"><strong>' + escapeHtml(decisionLabel) + '</strong><span>' + escapeHtml(summary) + '</span></div>' +
      (!online() ? '<div class="prscan-offline">Produit enregistré. Connexion nécessaire pour rechercher les prix, les conditions disponibles et obtenir l’analyse Julvox.</div>' : '') +
      '<div class="prscan-price"><label class="prscan-label" for="prscanStorePrice">Prix affiché en magasin</label><div class="prscan-row"><input class="prscan-input" id="prscanStorePrice" inputmode="decimal" autocomplete="off" placeholder="Ex. 89,99" aria-label="Prix affiché en magasin, en euros"><button class="prscan-btn" type="button" data-prscan-action="save-price">Enregistrer le prix</button></div></div>' +
      '<div class="prscan-actions"><button class="prscan-btn prscan-btn-accent" type="button" data-prscan-action="ask-julvox">Demander à Julvox</button><button class="prscan-btn" type="button" data-prscan-action="restart">Recommencer le scan</button>' +
      (!online() ? '<button class="prscan-btn prscan-btn-primary" type="button" data-prscan-action="analyze-now">Analyser maintenant</button>' : '') + '</div>';
  }

  function normalizeBackendResponse(scan, response){
    if (!response || typeof response !== 'object') return scan;
    var allowedIdentification = ['IDENTIFIE','IDENTIFICATION_PROBABLE','PLUSIEURS_CORRESPONDANCES','NON_RECONNU'];
    var status = clean(response.identificationStatus || response.identification_status || '',60).toUpperCase();
    if (allowedIdentification.indexOf(status) < 0) status = scan.identificationStatus;
    var decision = response.decision && typeof response.decision === 'object' ? response.decision : null;
    if (decision && ['buy_now','wait','compare','insufficient_data'].indexOf(decision.status) < 0) decision = null;
    return Object.assign({}, scan, {
      identificationStatus: status || scan.identificationStatus,
      product: response.product && typeof response.product === 'object' ? response.product : scan.product,
      offers: Array.isArray(response.offers) ? response.offers : [],
      priceHistory: response.priceHistory || response.price_history || null,
      decision: decision || scan.decision
    });
  }

  async function tryBackendLookup(scan){
    var adapter = window.JulvoxProductScanBackend;
    if (!online()) { renderResult(scan); return; }
    if (!adapter || typeof adapter.lookup !== 'function') {
      setStatus('Code détecté. Le service d’identification produit n’est pas encore relié à cette version de Julvox.');
      renderResult(scan);
      return;
    }
    setStatus('Code détecté. Recherche du produit…');
    try {
      var response = await adapter.lookup({ barcode: scan.barcode, barcodeType: scan.barcodeType, scannedAt: scan.scannedAt });
      var resolved = normalizeBackendResponse(scan, response);
      saveCurrent(resolved);
      renderResult(resolved);
      setStatus(resolved.identificationStatus === 'IDENTIFIE' ? 'Produit identifié.' : 'Résultat reçu avec incertitude explicitement conservée.');
    } catch (_) {
      scan.decision = { status:'insufficient_data', summary:'La recherche produit n’a pas abouti. Le code reste disponible sans inventer de résultat.' };
      saveCurrent(scan);
      renderResult(scan);
      setStatus('La recherche produit n’a pas abouti. Tu peux conserver le code ou réessayer.');
    }
  }

  function acceptBarcode(rawValue, format){
    if (scanLocked) return;
    var barcode = clean(rawValue,32).replace(/\s/g,'');
    if (!/^\d{6,14}$/.test(barcode)) { setStatus('Je n’arrive pas à lire ce code avec certitude. Essaie de rapprocher la caméra.'); return; }
    scanLocked = true;
    stopCamera();
    if (navigator.vibrate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) { try { navigator.vibrate(45); } catch (_) {} }
    var scan = {
      barcode: barcode,
      barcodeType: clean(format || 'unknown',40),
      scannedAt: nowIso(),
      identificationStatus: 'NON_RECONNU',
      product: null,
      storePrice: null,
      offers: [],
      priceHistory: null,
      decision: { status:'insufficient_data', summary:'Le code est enregistré, mais aucune conclusion d’achat ne sera produite sans données vérifiables.' }
    };
    saveCurrent(scan);
    renderResult(scan);
    tryBackendLookup(scan);
  }

  async function detectionLoop(){
    if (!scanning || scanLocked || !detector) return;
    var video = byId('prscanVideo');
    if (!video || video.readyState < 2) { detectTimer = window.setTimeout(detectionLoop,180); return; }
    try {
      var found = await detector.detect(video);
      if (found && found.length) {
        var first = found.find(function(item){ return item && DESIRED_FORMATS.indexOf(item.format) >= 0 && /^\d+$/.test(String(item.rawValue || '')); });
        if (first) { acceptBarcode(first.rawValue, first.format); return; }
      }
    } catch (_) {}
    if (scanning) detectTimer = window.setTimeout(detectionLoop,180);
  }

  async function startCamera(){
    stopCamera();
    var result = byId('prscanResult'); if (result) result.hidden = true;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setStatus('La caméra n’est pas disponible ici. Saisis le code manuellement.');
      return;
    }
    if (!('BarcodeDetector' in window)) {
      setStatus('La détection automatique n’est pas disponible dans ce navigateur. Saisis le code manuellement.');
      return;
    }
    try {
      var supported = typeof window.BarcodeDetector.getSupportedFormats === 'function' ? await window.BarcodeDetector.getSupportedFormats() : DESIRED_FORMATS;
      var formats = DESIRED_FORMATS.filter(function(format){ return supported.indexOf(format) >= 0; });
      if (!formats.length) { setStatus('Les formats EAN/UPC ne sont pas pris en charge ici. Saisis le code manuellement.'); return; }
      detector = new window.BarcodeDetector({ formats: formats });
      setStatus('Autorise la caméra pour scanner le code-barres.');
      stream = await navigator.mediaDevices.getUserMedia({ audio:false, video:{ facingMode:{ ideal:'environment' }, width:{ ideal:1280 }, height:{ ideal:720 } } });
      var video = byId('prscanVideo');
      video.srcObject = stream;
      await video.play();
      scanning = true;
      scanLocked = false;
      setStatus('Caméra active. Place le code-barres dans le cadre.');
      detectionLoop();
    } catch (error) {
      stopCamera();
      if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) setStatus('Autorise la caméra ou saisis le code manuellement.');
      else setStatus('La caméra n’a pas pu démarrer. Tu peux saisir le code manuellement.');
    }
  }

  function createDialog(){
    if (byId(SCANNER_ID)) return;
    var dialog = document.createElement('section');
    dialog.id = SCANNER_ID;
    dialog.hidden = true;
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-labelledby','prscanTitle');
    dialog.innerHTML = '<div class="prscan-panel" tabindex="-1"><div class="prscan-head"><div><p class="prscan-kicker">En magasin</p><h2 class="prscan-title" id="prscanTitle">Scanner un produit</h2></div><button class="prscan-close" type="button" data-prscan-action="close" aria-label="Fermer le scanner">×</button></div>' +
      '<p class="prscan-copy">Le code-barres identifie le produit. Le prix affiché en rayon se renseigne séparément. Julvox ne conclut jamais à partir d’un rabais affiché seul.</p>' +
      '<div class="prscan-status" id="prscanStatus" role="status" aria-live="polite">Prêt à scanner.</div>' +
      '<div class="prscan-camera"><video id="prscanVideo" playsinline muted aria-label="Aperçu de la caméra pour scanner le code-barres"></video><div class="prscan-frame" aria-hidden="true"></div><div class="prscan-camera-copy">Aligne les barres à l’intérieur du cadre.</div></div>' +
      '<div class="prscan-actions"><button class="prscan-btn prscan-btn-primary" type="button" data-prscan-action="start">Activer la caméra</button><button class="prscan-btn" type="button" data-prscan-action="stop">Arrêter la caméra</button></div>' +
      '<div class="prscan-manual"><label class="prscan-label" for="prscanManualInput">Ou saisir le code manuellement</label><div class="prscan-row"><input class="prscan-input" id="prscanManualInput" inputmode="numeric" autocomplete="off" pattern="[0-9]*" maxlength="14" aria-describedby="prscanManualHelp"><button class="prscan-btn" type="button" data-prscan-action="manual">Identifier ce code</button></div><p class="prscan-note" id="prscanManualHelp">EAN-13, EAN-8, UPC-A et UPC-E sont prioritaires. En saisie manuelle, certains codes à 8 chiffres restent volontairement ambigus.</p></div>' +
      '<div class="prscan-result" id="prscanResult" hidden></div>' +
      '<p class="prscan-note">Confidentialité : le flux vidéo n’est pas enregistré. La caméra est coupée à la détection, à la fermeture et lorsque Julvox passe en arrière-plan.</p></div>';
    document.body.appendChild(dialog);
  }

  function installEntryPoint(){
    var examples = document.querySelector('#julvoxDecisionHome .pr01b-examples');
    if (!examples || examples.querySelector('[data-prscan-open]')) return;
    var button = document.createElement('button');
    button.className = 'pr01b-example prscan-entry';
    button.type = 'button';
    button.setAttribute('data-prscan-open','true');
    button.setAttribute('aria-label','Scanner un produit avec la caméra');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 9v6M10 9v6M14 9v6M17 9v6"/></svg><span>Scanner un produit</span>';
    examples.insertBefore(button, examples.firstChild);
  }

  function openScanner(trigger){
    createDialog();
    lastTrigger = trigger || document.activeElement;
    var dialog = byId(SCANNER_ID);
    dialog.hidden = false;
    document.documentElement.setAttribute('data-prscan-open','true');
    var panel = dialog.querySelector('.prscan-panel');
    if (panel) panel.focus();
    setStatus(online() ? 'Prêt à scanner.' : 'Hors ligne : le code peut être scanné et enregistré localement.');
  }

  function closeScanner(){
    stopCamera();
    var dialog = byId(SCANNER_ID); if (dialog) dialog.hidden = true;
    document.documentElement.removeAttribute('data-prscan-open');
    if (lastTrigger && typeof lastTrigger.focus === 'function') { try { lastTrigger.focus(); } catch (_) {} }
  }

  function saveStorePrice(){
    if (!currentScan) return;
    var input = byId('prscanStorePrice');
    var raw = clean(input && input.value,30).replace(',','.');
    var amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) { setStatus('Saisis un prix magasin valide.'); return; }
    currentScan = Object.assign({}, currentScan, { storePrice:{ amount:Math.round(amount * 100) / 100, currency:'EUR', source:'user_store_shelf' } });
    saveCurrent(currentScan);
    renderResult(currentScan);
    setStatus('Prix magasin enregistré séparément du code-barres.');
  }

  function askJulvox(){
    if (!currentScan) return;
    var priceText = currentScan.storePrice ? String(currentScan.storePrice.amount) + ' ' + currentScan.storePrice.currency : 'non renseigné';
    var prompt = 'Contexte scanner Julvox. Produit: ' + productLabel(currentScan) + '. Code: ' + currentScan.barcode + ' (' + currentScan.barcodeType + '). Prix affiché en magasin: ' + priceText + '. Statut identification: ' + currentScan.identificationStatus + '. Décision disponible: ' + (currentScan.decision && currentScan.decision.status || 'insufficient_data') + '. Ne fabrique aucun prix, historique, disponibilité ou économie. Aide-moi à décider si cet achat est pertinent maintenant avec les informations réellement disponibles.';
    closeScanner();
    if (typeof window.openAIChat === 'function') window.openAIChat();
    if (typeof window.sendAIMessage === 'function') { window.setTimeout(function(){ window.sendAIMessage(prompt); },80); return; }
    var chatInput = byId('chatInput'); if (chatInput) { chatInput.value = prompt; chatInput.focus(); }
  }

  function analyzeNow(){
    if (!currentScan) return;
    if (!online()) { setStatus('Connexion toujours indisponible. Le scan reste enregistré localement.'); return; }
    removeLocal(PENDING_KEY);
    tryBackendLookup(currentScan);
  }

  function handleAction(action){
    if (action === 'close') return closeScanner();
    if (action === 'start') return startCamera();
    if (action === 'stop') { stopCamera(); setStatus('Caméra arrêtée.'); return; }
    if (action === 'restart') { currentScan = null; var result = byId('prscanResult'); if (result) result.hidden = true; return startCamera(); }
    if (action === 'save-price') return saveStorePrice();
    if (action === 'ask-julvox') return askJulvox();
    if (action === 'analyze-now') return analyzeNow();
    if (action === 'manual') {
      var input = byId('prscanManualInput'); var classified = classifyManualBarcode(input && input.value);
      if (!classified) { setStatus('Code invalide. Vérifie les chiffres ou rapproche la caméra du code.'); return; }
      acceptBarcode(classified.barcode, classified.barcodeType); return;
    }
  }

  document.addEventListener('click', function(event){
    var open = event.target.closest && event.target.closest('[data-prscan-open]');
    if (open) { event.preventDefault(); openScanner(open); return; }
    var actionNode = event.target.closest && event.target.closest('[data-prscan-action]');
    if (actionNode) { event.preventDefault(); handleAction(actionNode.getAttribute('data-prscan-action')); }
  });
  document.addEventListener('keydown', function(event){ if (event.key === 'Escape' && byId(SCANNER_ID) && !byId(SCANNER_ID).hidden) closeScanner(); });
  document.addEventListener('visibilitychange', function(){ if (document.hidden) stopCamera(); });
  window.addEventListener('pagehide', stopCamera);
  window.addEventListener('offline', function(){ if (byId(SCANNER_ID) && !byId(SCANNER_ID).hidden) setStatus('Hors ligne : le scan reste local. L’analyse complète attendra la connexion.'); });
  window.addEventListener('online', function(){ if (byId(SCANNER_ID) && !byId(SCANNER_ID).hidden) setStatus('Connexion revenue. Tu peux relancer l’analyse du scan enregistré.'); });

  function boot(){ createDialog(); installEntryPoint(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
  window.setTimeout(installEntryPoint,300);
  window.JulvoxProductScanner = Object.freeze({ open:openScanner, stop:stopCamera, classifyManualBarcode:classifyManualBarcode });
})();
</script>`;

function fail(message) {
  throw new Error(`JULVOX-PRODUCT-BARCODE-SCANNER-01 integration failed: ${message}`);
}

function applyScannerExperience(input) {
  if (typeof input !== 'string' || !input.includes('</head>') || !input.includes('</body>')) {
    fail('expected a complete HTML document');
  }
  if (input.includes(MARKER)) return input;
  if (!input.includes('id="julvoxDecisionHome"')) fail('Julvox decision home must be integrated first');
  let html = input.replace('</head>', `${SCANNER_CSS}\n</head>`);
  html = html.replace('</body>', `${MARKER}\n${SCANNER_RUNTIME}\n</body>`);
  return html;
}

function verifyScannerExperience(html) {
  if ((html.match(/julvox-product-barcode-scanner-01/g) || []).length < 3) fail('scanner marker/runtime/styles are incomplete');
  for (const token of [
    'Scanner un produit',
    "['ean_13','ean_8','upc_a','upc_e']",
    'navigator.mediaDevices.getUserMedia',
    'track.stop()',
    'document.addEventListener(\'visibilitychange\'',
    'saisir le code manuellement',
    'INFORMATIONS INSUFFISANTES',
    'window.JulvoxProductScanBackend',
    'Demander à Julvox',
    'Ne fabrique aucun prix, historique, disponibilité ou économie',
    'Produit enregistré. Connexion nécessaire',
  ]) {
    if (!html.includes(token)) fail(`missing scanner contract token: ${token}`);
  }
  if (/current_price\s*\*\s*1\.2/.test(html)) fail('fabricated reference price logic is forbidden');
  if (/Achète, c[’']est/i.test(html)) fail('automatic promotional buy wording is forbidden');
  return html;
}

module.exports = {
  MARKER,
  SCANNER_CSS,
  SCANNER_RUNTIME,
  applyScannerExperience,
  verifyScannerExperience,
};
