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
    if (!p) return 'Produit Ã  identifier';
    return clean([p.brand,p.name,p.model,p.variant].filter(Boolean).join(' '),160) || 'Produit identifiÃ©';
  }

  function renderResult(scan){
    var result = byId('prscanResult');
    if (!result) return;
    var productStatus = clean(scan.identificationStatus || 'NON_RECONNU',60);
    var price = scan.storePrice && Number.isFinite(Number(scan.storePrice.amount)) ? Number(scan.storePrice.amount).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' ' + clean(scan.storePrice.currency || 'EUR',5) : 'Non renseignÃ©';
    var decisionStatus = scan.decision && scan.decision.status ? clean(scan.decision.status,40) : 'insufficient_data';
    var decisionLabel = decisionStatus === 'buy_now' ? 'ACHETER MAINTENANT' : decisionStatus === 'wait' ? 'ATTENDRE' : decisionStatus === 'compare' ? 'COMPARER AVANT Dâ€™ACHETER' : 'INFORMATIONS INSUFFISANTES';
    var summary = scan.decision && scan.decision.summary ? clean(scan.decision.summary,260) : 'Le code est bien enregistrÃ©, mais Julvox ne dispose pas encore des donnÃ©es produit et prix nÃ©cessaires pour donner un avis fiable.';
    result.hidden = false;
    result.innerHTML = '<h3>' + escapeHtml(productLabel(scan)) + '</h3>' +
      '<ul class="prscan-facts"><li><strong>Code :</strong> ' + escapeHtml(scan.barcode) + '</li><li><strong>Format :</strong> ' + escapeHtml(scan.barcodeType) + '</li><li><strong>Identification :</strong> ' + escapeHtml(productStatus) + '</li><li><strong>Prix magasin :</strong> <span id="prscanRenderedPrice">' + escapeHtml(price) + '</span></li></ul>' +
      '<div class="prscan-decision"><strong>' + escapeHtml(decisionLabel) + '</strong><span>' + escapeHtml(summary) + '</span></div>' +
      (!online() ? '<div class="prscan-offline">Produit enregistrÃ©. Connexion nÃ©cessaire pour rechercher les prix, les conditions disponibles et obtenir lâ€™analyse Julvox.</div>' : '') +
      '<div class="prscan-price"><label class="prscan-label" for="prscanStorePrice">Prix affichÃ© en magasin</label><div class="prscan-row"><input class="prscan-input" id="prscanStorePrice" inputmode="decimal" autocomplete="off" placeholder="Ex. 89,99" aria-label="Prix affichÃ© en magasin, en euros"><button class="prscan-btn" type="button" data-prscan-action="save-price">Enregistrer le prix</button></div></div>' +
      '<div class="prscan-actions"><button class="prscan-btn prscan-btn-accent" type="button" data-prscan-action="ask-julvox">Demander Ã  Julvox</button><button class="prscan-btn" type="button" data-prscan-action="restart">Recommencer le scan</button>' +
      (!online() ? '<button class="prscan-btn prscan-btn-primary" type="button" data-prscan-action="analyze-now">Analyser maintenant</button>' : '') + '</div>';
  }

  function normalizeBackendResponse(scan, response){
    if (!response || typeof response !== 'object') return scan;
    var allowedIdentification = ['IDENTIFIE','IDENTIFICATION_PROBABLE','PLUSIEDRS_CORRESPONDANCES','NON_RECONNU'];
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
      setStatus('Code dÃ©tectÃ©. Le service dâ€™identification produit nâ€™est pas encore reliÃ© Ã  cette version de Julvox.');
      renderResult(scan);
      return;
    }
    setStatus('Code dÃ©tectÃ©. Recherche du produitâ€¦.');
    try {
      var response = await adapter.lookup({ barcode: scan.barcode, barcodeType: scan.barcodeType, scannedAt: scan.scannedAt });
      var resolved = normalizeBackendResponse(scan, response);
      saveCurrent(resolved);
      renderResult(resolved);
      setStatus(resolved.identificationStatus === 'IDENTIFIE' ? 'Produit identifiÃ©.' : 'RÃ©sultat reÃ§u avec incertitude explicitement conservÃ©e.');
    } catch (_) {
      scan.decision = { status:'insufficient_data', summary:'La recherche produit nâ€™a pas abouti. Le code reste disponible sans inventer de rÃ©sultat.' };
      saveCurrent(scan);
      renderResult(scan);
      setStatus('La recherche produit nâ€™a pas abouti. Tu peux conserver le code ou rÃ©essayer.');
    }
  }

  function acceptBarcode(rawValue, format){
    if (scanLocked) return;
    var barcode = clean(rawValue,32).replace(/\s/g,'');
    if (!/^\d{6,14}$/.test(barcode)) { setStatus('Je nâ€™Arrive pas Ã  lire ce code avec certitude. Essaie de rapprocher la camÃ©ra.'); return; }
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
      decision: { status:'insufficient_data', summary:'Le code est enregistrÃ©, mais aucune conclusion dâ€™achat ne sera produite sans donnÃ©es vÃ©rifiables.' }
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
      setStatus('La camÃ©ra nâ€™•ÍĞÁ…Ì‘¥ÍÁ½¹¥‰±”¥¤¸M…¥Í¥Ì±”½‘”µ…¹Õ•±±•µ•¹Ğ¸œ¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€¥˜€ „ 	…É½‘••Ñ•Ñ½Èœ¥¸İ¥¹‘½Ü¤¤ì(€€€€€Í•ÑMÑ…ÑÕÌ 1„“¥Ñ•Ñ¥½¸…ÕÑ½µ…Ñ¥ÅÕ”»Še•ÍĞÁ…Ì‘¥ÍÁ½¹¥‰±”‘…¹Ì”¹…Ù¥…Ñ•ÕÈ¸M…¥Í¥Ì±”½‘”µ…¹Õ•±±•µ•¹Ğ¸œ¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€ÑÉäì(€€€€€Ù…ÈÍÕÁÁ½ÉÑ•€ôÑåÁ•½˜İ¥¹‘½Ü¹	…É½‘••Ñ•Ñ½È¹•ÑMÕÁÁ½ÉÑ•‘½Éµ…ÑÌ€ôôô€™Õ¹Ñ¥½¸œ€ü…İ…¥Ğİ¥¹‘½Ü¹	…É½‘••Ñ•Ñ½È¹•ÑMÕÁÁ½ÉÑ•‘½Éµ…ÑÌ ¤€èM%I}=I5QLì(€€€€€Ù…È™½Éµ…ÑÌ€ôM%I}=I5QL¹™¥±Ñ•È¡™Õ¹Ñ¥½¸¡™½Éµ…Ğ¥ìÉ•ÑÕÉ¸ÍÕÁÁ½ÉÑ•¹¥¹‘•á=˜¡™½Éµ…Ğ¤€øô€Àìô¤ì(€€€€€¥˜€ …™½Éµ…ÑÌ¹±•¹Ñ ¤ìÍ•ÑMÑ…ÑÕÌ 1•Ì™½Éµ…ÑÌ8½UA¹”Í½¹ĞÁ…ÌÁÉ¥Ì•¸¡…É”¥¤¸M…¥Í¥Ì±”½‘”µ…¹Õ•±±•µ•¹Ğ¸œ¤ìÉ•ÑÕÉ¸ìô(€€€€€‘•Ñ•Ñ½È€ô¹•Üİ¥¹‘½Ü¹	…É½‘••Ñ•Ñ½È¡ì™½Éµ…ÑÌè™½Éµ…ÑÌô¤ì(€€€€€Í•ÑMÑ…ÑÕÌ ÕÑ½É¥Í”±„…·¥É„Á½ÕÈÍ…¹¹•È±”½‘”µ‰…ÉÉ•Ì¸œ¤ì(€€€€€ÍÑÉ•…´€ô…İ…¥Ğ¹…Ù¥…Ñ½È¹µ•‘¥…•Ù¥•Ì¹•ÑUÍ•É5•‘¥„¡ì…Õ‘¥¼é™…±Í”°Ù¥‘•¼éì™…¥¹5½‘”éì¥‘•…°è•¹Ù¥É½¹µ•¹Ğœô°İ¥‘Ñ éì¥‘•…°èÄÈàÀô°¡•¥¡Ğéì¥‘•…°èÜÈÀôôô¤ì(€€€€€Ù…ÈÙ¥‘•¼€ô‰å% ÁÉÍ…¹Y¥‘•¼œ¤ì(€€€€€Ù¥‘•¼¹ÍÉ=‰©•Ğ€ôÍÑÉ•…´ì(€€€€€…İ…¥ĞÙ¥‘•¼¹Á±…ä ¤ì(€€€€€Í…¹¹¥¹œ€ôÑÉÕ”ì(€€€€€Í…¹1½­•€ô™…±Í”ì(€€€€€Í•ÑMÑ…ÑÕÌ …·¥É„…Ñ¥Ù”¸A±…”±”½‘”µ‰…ÉÉ•Ì‘…¹Ì±”…‘É”¸œ¤ì(€€€€€‘•Ñ•Ñ¥½¹1½½À ¤ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€ÍÑ½Á…µ•É„ ¤ì(€€€€€¥˜€¡•ÉÉ½È€˜˜€¡•ÉÉ½È¹¹…µ”€ôôô€9½Ñ±±½İ•‘ÉÉ½Èœñğ•ÉÉ½È¹¹…µ”€ôôô€M•ÕÉ¥ÑåÉÉ½Èœ¤¤­•åMÑ…ÑÕÌ €ÕÑ½É¥Í”±„…·¥É„½ÔÍ…¥Í¥Ì±”½‘”µ…¹Õ•±±•µ•¹Ğ¸œ¤ì(€€€€€•±Í”Í•ÑMÑ…ÑÕÌ 1„…·¥É„»Še„Á…ÌÁÔ¥µ…ÉÉ•È¸QÔÁ•ÕàÍ…¥Í¥È±”½‘”µ…¹Õ•±±•µ•¹Ğ¸œ¤ì(€€€ô(€ô((€™Õ¹Ñ¥½¸É•…Ñ•¥…±½œ ¥ì(€€€¥˜€¡‰å%¡M99I}%¤¤¥µÁ½ÉĞì((€€€Ù…È‘¥…±½œ€ô‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ Í•Ñ¥½¸œ¤ì(€€€‘¥…±½œ¹¥€ôM99I}%ì(€€€‘¥…±½œ¹¡¥‘‘•¸€ôÑÉÕ”ì(€€€‘¥…±½œ¹Í•ÑÑÑÉ¥‰ÕÑ” É½±”œ°‘¥…±½œœ¤ì(€€€‘¥…±½œ¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µµ½‘…°œ°ÑÉÕ”œ¤ì(€€€‘¥…±½œ¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ±…‰•±±•‘‰äœ°ÁÉÍ…¹Q¥Ñ±”œ¤ì(€€€‘¥…±½œ¹¥¹¹•É!Q50€ô€œñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µÁ…¹•°ˆÑ…‰¥¹‘•àôˆ´Äˆøñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µ¡•…ˆøñ‘¥ØøñÀ±…ÍÌô‰ÁÉÍ…¸µ­¥­•Èˆù¸µ……Í¥¸ğ½Àøñ È±…ÍÌô‰ÁÉÍ…¸µÑ¥Ñ±”ˆ¥ô‰ÁÉÍ…¹Q¥Ñ±”ˆùM…¹¹•ÈÕ¸ÁÉ½‘Õ¥Ğğ½ Èøğ½‘¥Øøñ‰ÕÑÑ½¸±…ÍÌô‰ÁÉÍ…¸µ±½Í”ˆÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µÁÉÍ…¸µ…Ñ¥½¸ô‰±½Í”ˆ…É¥„µ±…‰•°ô‰•Éµ•È±”Í…¹¹•Èˆû\ğ½‰ÕÑÑ½¸øğ½‘¥Øøœ€¬(€€€€€€œñÀ±…ÍÌô‰ÁÉÍ…¸µ½Áäˆù1”½‘”µ‰…ÉÉ•Ì¥‘•¹Ñ¥™¥”±”ÁÉ½‘Õ¥Ğ¸1”ÁÉ¥à…™™¥£¤•¸É…å½¸Í”É•¹Í•¥¹”Ï¥Á…Ë¥µ•¹Ğ¸)Õ±Ù½à¹”½¹±ÕĞ©…µ…¥Ï Á…ÉÑ¥È“ŠeÕ¸É…‰…¥Ì…™™¥£¤Í•Õ°¸ğ½Àøœ€¬(€€€€€€œñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µÍÑ…ÑÕÌˆ¥ô‰ÁÉÍ…¹MÑ…ÑÕÌˆÉ½±”ô‰ÍÑ…ÑÕÌˆ…É¥„µ±¥Ù”ô‰Á½±¥Ñ”ˆùAË©Ğƒ€Í…¹¹•È¸ğ½‘¥Øøœ€¬(€€€€€€œñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µ…µ•É„ˆøñÙ¥‘•¼¥ô‰ÁÉÍ…¹Y¥‘•¼ˆÁ±…åÍ¥¹±¥¹”µÕÑ•…É¥„µ±…‰•°ô‰Á•ËÔ‘”±„…·¥É„Á½ÕÈÍ…¹¹•È±”½‘”µ‰…ÉÉ•Ìˆøğ½Ù¥‘•¼øñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µ™É…µ”ˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆøğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µ…µ•É„µ½Áäˆù±¥¹”±•Ì‰…ÉÉ•Ìƒ€³Še¥¹Ó¥É¥•ÕÈ‘Ô…‘É”¸ğ½‘¥Øøğ½‘¥Øøœ€¬(€€€€€€œñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µ…Ñ¥½¹Ìˆøñ‰ÕÑÑ½¸±…ÍÌô‰ÁÉÍ…¸µ‰Ñ¸ÁÉÍ…¸µ‰Ñ¸µÁÉ¥µ…ÉäˆÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µÁÉÍ…¸µ…Ñ¥½¸ô‰ÍÑ…ÉĞˆùÑ¥Ù•È±„…·¥É„ğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÌô‰ÁÉÍ…¸µ‰Ñ¸ˆÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µÁÉÍ…¸µ…Ñ¥½¸ô‰ÍÑ½ÀˆùÉË©Ñ•È±„…·¥É„ğ½‰ÕÑÑ½¸øğ½‘¥Øøœ€¬(€€€€€€œñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µµ…¹Õ…°ˆøñ±…‰•°±…ÍÌô‰ÁÉÍ…¸µ±…‰•°ˆ™½Èô‰ÁÉÍ…¹5…¹Õ…±%¹ÁÕĞˆù=ÔÍ…¥Í¥È±”½‘”µ…¹Õ•±±•µ•¹Ğğ½±…‰•°øñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µÉ½Üˆøñ¥¹ÁÕĞ±…ÍÌô‰ÁÉÍ…¸µ¥¹ÁÕĞˆ¥ô‰ÁÉÍ…¹5…¹Õ…±%¹ÁÕĞˆ¥¹ÁÕÑµ½‘”ô‰¹Õµ•É¥Œˆ…ÕÑ½½µÁ±•Ñ”ô‰½™˜ˆÁ…ÑÑ•É¸ô‰lÀ´åt¨ˆµ…á±•¹Ñ ôˆÄĞˆ…É¥„µ‘•ÍÉ¥‰•‘‰äô‰ÁÉÍ…¹5…¹Õ…±!•±Àˆøñ‰ÕÑÑ½¸±…ÍÌô‰ÁÉÍ…¸µ‰Ñ¸ˆÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µÁÉÍ…¸µ…Ñ¥½¸ô‰µ…¹Õ…°ˆù%‘•¹Ñ¥™¥•È”½‘”ğ½‰ÕÑÑ½¸øğ½‘¥ØøñÀ±…ÍÌô‰ÁÉÍ…¸µ¹½Ñ”ˆ¥ô‰ÁÉÍ…¹5…¹Õ…±!•±Àˆù8´ÄÌ°8´à°UAµ•ĞUAµÍ½¹ĞÁÉ¥½É¥Ñ…¥É•Ì¸¸Í…¥Í¥”µ…¹Õ•±±”°•ÉÑ…¥¹Ì½‘•Ìƒ€€à¡¥™™É•ÌÉ•ÍÑ•¹ĞÙ½±½¹Ñ…¥É•µ•¹Ğ…µ‰¥ÕÌ¸ğ½Àøğ½‘¥Øøœ€¬(€€€€€€œñ‘¥Ø±…ÍÌô‰ÁÉÍ…¸µÉ•ÍÕ±Ğˆ¥ô‰ÁÉÍ…¹I•ÍÕ±Ğˆ¡¥‘‘•¸øğ½‘¥Øøœ€¬(€€€€€€œñÀ±…ÍÌô‰ÁÉÍ…¸µ¹½Ñ”ˆù½¹™¥‘•¹Ñ¥…±¥Ó¤€è±”™±ÕàÙ¥“¥¼»Še•ÍĞÁ…Ì•¹É•¥ÍÑË¤¸1„…·¥É„•ÍĞ½ÕÃ¥”ƒ€±„“¥Ñ•Ñ¥½¸°ƒ€±„™•Éµ•ÑÕÉ”•Ğ±½ÉÍÅÕ”)Õ±Ù½àÁ…ÍÍ”•¸…ÉÉ§¡É”µÁ±…¸¸ğ½Àøğ½‘¥Øøœì(€€€‘½Õµ•¹Ğ¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡‘¥…±½œ¤ì(€ô((€™Õ¹Ñ¥½¸¥¹ÍÑ…±±¹ÑÉåA½¥¹Ğ ¥ì(€€€Ù…È•á…µÁ±•Ì€ô‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½È œ©Õ±Ù½á•¥Í¥½¹!½µ”€¹ÁÈÀÅˆµ•á…µÁ±•Ìœ¤ì(€€€¥˜€ …•á…µÁ±•Ìñğ•á…µÁ±•Ì¹ÅÕ•ÉåM•±•Ñ½È m‘…Ñ„µÁÉÍ…¸µ½Á•¹tœ¤¤É•ÑÕÉ¸ì(€€€Ù…È‰ÕÑÑ½¸€ô‘½Õµ•¹Ğ¹É•…Ñ•±•µ•¹Ğ ‰ÕÑÑ½¸œ¤ì(€€€‰ÕÑÑ½¸¹±…ÍÍ9…µ”€ô€ÁÈÀÅˆµ•á…µÁ±”ÁÉÍ…¸µ•¹ÑÉäœì(€€€‰ÕÑÑ½¸¹ÑåÁ”€ô€‰ÕÑÑ½¸œì(€€€‰ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” ‘…Ñ„µÁÉÍ…¸µ½Á•¸œ°ÑÉÕ”œ¤ì(€€€‰ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” …É¥„µ±…‰•°œ°M…¹¹•ÈÕ¸ÁÉ½‘Õ¥Ğ…Ù•Œ±„…·¥É„œ¤ì(€€€‰ÕÑÑ½¸¹¥¹¹•É!Q50€ô€œñÍÙœÙ¥•İ	½àôˆÀ€À€ÈĞ€ÈĞˆ…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆøñÁ…Ñ ô‰4Ğ€İXÕ„Ä€Ä€À€À€Ä€Ä´Å É4ÄÜ€Ñ É„Ä€Ä€À€À€Ä€Ä€ÅØÉ4ÈÀ€ÄİØÉ„Ä€Ä€À€À€Ä´Ä€Å ´É4Ü€ÈÁ Õ„Ä€Ä€À€À€Ä´Ä´ÅØ´É4Ü€åØÙ4ÄÀ€åØÙ4ÄĞ€åØÙ4ÄÜ€åØØˆ¼øğ½ÍÙœøñÍÁ…¸ùM…¹¹•ÈÕ¸ÁÉ½‘Õ¥Ğğ½ÍÁ…¸øœì(€€€•á…µÁ±•Ì¹¥¹Í•ÉÑ	•™½É”¡‰ÕÑÑ½¸°•á…µÁ±•Ì¹™¥ÉÍÑ¡¥±¤ì(€ô((€™Õ¹Ñ¥½¸½Á•¹M…¹¹•È¡ÑÉ¥•È¥ì(€€€É•…Ñ•¥…±½œ ¤ì(€€€±…ÍÑQÉ¥•È€ôÑÉ¥•Èñğ‘½Õµ•¹Ğ¹…Ñ¥Ù•±•µ•¹Ğì(€€€Ù…È‘¥…±½œ€ô‰å%¡M99I}%¤ì(€€€‘¥…±½œ¹¡¥‘‘•¸€ô™…±Í”ì(€€€‘½Õµ•¹Ğ¹‘½Õµ•¹Ñ±•µ•¹Ğ¹Í•ÑÑÑÉ¥‰ÕÑ” ‘…Ñ„µÁÉÍ…¸µ…Ñ¥Ù”œ°ÑÉÕ”œ¤ì(€€€Ù…ÈÁ…¹•°€ô‘¥…±½œ¹ÅÕ•ÉåM•±•Ñ½È œ¹ÁÉÍ…¸µÁ…¹•°œ¤ì(€€€¥˜€¡Á…¹•°¤Á…¹•°¹™½ÕÌ ¤ì(€€€Í•ÑMÑ…ÑÕÌ¡½¹±¥¹” ¤€ü€AË©Ğƒ€Í…¹¹•È¸œ€è€!½ÉÌ±¥¹”€è±”½‘”Á•ÕĞƒ©ÑÉ”Í…¹»¤•Ğ•¹É•¥ÍÑË¤±½…±•µ•¹Ğ¸œ¤ì(€ô((€™Õ¹Ñ¥½¸±½Í•M…¹¹•È ¥ì(€€€ÍÑ½Á…µ•É„ ¤ì(€€€Ù…È‘¥…±½œ€ô‰å%¡M99I}%¤ì¥˜€¡‘¥…±½œ¤‘¥…±½œ¹¡¥‘‘•¸€ôÑÉÕ”ì(€€€‘½Õµ•¹Ğ¹‘½Õµ•¹Ñ±•µ•¹Ğ¹É•µ½Ù•ÑÑÉ¥‰ÕÑ” ‘…Ñ„µÁÉÍ…¸µ…Ñ¥Ù”œ¤ì(€€€¥˜€¡±…ÍÑQÉ¥•È€˜˜ÑåÁ•½˜±…ÍÑQÉ¥•È¹™½ÕÌ€ôôô€™Õ¹Ñ¥½¸œ¤ìÑÉäì±…ÍÑQÉ¥•È¹™½ÕÌ ¤ìô…Ñ €¡|¤íôô(€ô((€™Õ¹Ñ¥½¸Í…Ù•MÑ½É•AÉ¥” ¥ì(€€€¥˜€ …ÕÉÉ•¹ÑM…¸¤É•ÑÕÉ¸ì(€€€Ù…È¥¹ÁÕĞ€ô‰å% ÁÉÍ…¹MÑ½É•AÉ¥”œ¤ì(€€€Ù…ÈÉ…Ü€ô±•…¸¡¥¹ÁÕĞ€˜˜¥¹ÁÕĞ¹Ù…±Õ”°ÌÀ¤¹É•Á±…” œ°œ°œ¸œ¤ì(€€€Ù…È…µ½Õ¹Ğ€ô9Õµ‰•È¡É…Ü¤ì(€€€¥˜€ …9Õµ‰•È¹¥Í¥¹¥Ñ”¡…µ½Õ¹Ğ¤ñğ…µ½Õ¹Ğ€ğô€Àñğ…µ½Õ¹Ğ€ø€ÄÀÀÀÀÀÀ¤ìÍ•ÑMÑ…ÑÕÌ M…¥Í¥ÌÕ¸ÁÉ¥àµ……Í¥¸Ù…±¥‘”¸œ¤ìÉ•ÑÕÉ¸ìô(€€€ÕÉÉ•¹ÑM…¸€ô=‰©•Ğ¹…ÍÍ¥¸¡íô°ÕÉÉ•¹ÑM…¸°ìÍÑ½É•AÉ¥”éì…µ½Õ¹Ğé5…Ñ ¹É½Õ¹¡…µ½Õ¹Ğ€¨€ÄÀÀ¤€¼€ÄÀÀ°ÕÉÉ•¹äèUHœ°Í½ÕÉ”èÕÍ•É}ÍÑ½É•}Í¡•±˜œôô¤ì(€€€Í…Ù•ÕÉÉ•¹Ğ¡ÕÉÉ•¹ÑM…¸¤ì(€€€É•¹‘•ÉI•ÍÕ±Ğ¡ÕÉÉ•¹ÑM…¸¤ì(€€€Í•ÑMÑ…ÑÕÌ AÉ¥àµ……Í¥¸•¹É•¥ÍÑË¤Ï¥Á…Ë¥µ•¹Ğ‘Ô½‘”µ‰…ÉÉ•Ì¸œ¤ì(€ô((€™Õ¹Ñ¥½¸…Í­)Õ±Ù½à ¥ì(€€€¥˜€ …ÕÉÉ•¹ÑM…¸¤É•ÑÕÉ¸ì(€€€Ù…ÈÁÉ¥•Q•áĞ€ôÕÉÉ•¹ÑM…¸¹ÍÑ½É•AÉ¥”€üMÑÉ¥¹œ¡ÕÉÉ•¹ÑM…¸¹ÍÑ½É•AÉ¥”¹…µ½Õ¹Ğ¤€¬€œ€œ€¬ÕÉÉ•¹ÑM…¸¹ÍÑ½É•AÉ¥”¹ÕÉÉ•¹ä€è€¹½¸É•¹Í•¥»¤œì(€€€Ù…ÈÁÉ½µÁĞ€ô€½¹Ñ•áÑ”Í…¹¹•È)Õ±Ù½à¸AÉ½‘Õ¥Ğè€œ€¬ÁÉ½‘ÕÑ1…‰•°¡ÕÉÉ•¹ÑM…¸¤€¬€œ¸½‘”è€œ€¬ÕÉÉ•¹ÑM…¸¹‰…É½‘”€¬€œ€ œ€¬ÕÉÉ•¹ÑM…¸¹‰…É½‘•QåÁ”€¬€œ¤¸AÉ¥à…™™¥£¤•¸µ……Í¥¸è€œ€¬ÁÉ¥•Q•áĞ€¬€œ¸MÑ…ÑÕĞ¥‘•¹Ñ¥™¥…Ñ¥½¸è€œ€¬ÕÉÉ•¹ÑM…¸¹¥‘•¹Ñ¥™¥…Ñ¥½¹MÑ…ÑÕÌ€¬€œ¸¥¥Í¥½¸‘¥ÍÁ½¹¥‰±”è€œ€¬€¡ÕÉÉ•¹ÑM…¸¹‘•¥Í¥½¸€˜˜ÕÉÉ•¹ÑM…¸¹‘•¥Í¥½¸¹ÍÑ…ÑÕÌñğ€¥¹ÍÕ™™¥¥•¹Ñ}‘…Ñ„œ¤€¬€œ¸9”™…‰É¥ÅÕ”…ÕÕ¸ÁÉ¥à°¡¥ÍÑ½É¥ÅÕ”°‘¥ÍÁ½¹¥‰¥±¥Ó¤½Ôƒ¥½¹½µ¥”¸¥‘”µµ½¤ƒ€“¥¥‘•ÈÍ¤•Ğ…¡…Ğ•ÍĞÁ•ÉÑ¥¹•¹Ğµ…¥¹Ñ•¹…¹Ğ…Ù•Œ±•Ì¥¹™½Éµ…Ñ¥½¹ÌË¥•±±•µ•¹Ğ‘¥ÍÁ½¹¥‰±•Ì¸œì(€€€±½Í•M…¹¹•È ¤ì(€€€¥˜€¡ÑåÁ•½˜İ¥¹‘½Ü¹½Á•¹%¡…Ğ€ôôô€™Õ¹Ñ¥½¸œ¤İ¥¹‘½Ü¹½Á•¹%¡…Ğ ¤ì(€€€¥˜€¡ÑåÁ•½˜İ¥¹‘½Ü¹Í•¹‘%5•ÍÍ…”€ôôô€™Õ¹Ñ¥½¸œ¤ìİ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕĞ¡™Õ¹Ñ¥½¸ ¥ìİ¥¹‘½Ü¹Í•¹‘%5•ÍÍ…”¡ÁÉ½µÁĞ¤ìô°àÀ¤ìÉ•ÑÕÉ¸ìô(€€€Ù…È¡…Ñ%¹ÁÕĞ€ô‰å% ¡…Ñ%¹ÁÕĞœ¤ì¥˜€¡¡…Ñ%¹ÁÕĞ¤ì¡…Ñ%¹ÁÕĞ¹Ù…±Õ”€ôÁÉ½µÁĞì¡…Ñ%¹ÁÕĞ¹™½ÕÌ ¤ìô(€ô((€™Õ¹Ñ¥½¸…¹…±åé•9½Ü ¥ì(€€€¥˜€ …ÕÉÉ•¹ÑM…¸¤É•ÑÕÉ¸ì(€€€¥˜€ …½¹±¥¹” ¤¤ìÍ•ÑMÑ…ÑÕÌ ½¹¹•á¥½¸Ñ½Õ©½ÕÉÌ¥¹‘¥ÍÁ½¹¥‰±”¸1”Í…¸É•ÍÑ”•¹É•¥ÍÑË¤±½…±•µ•¹Ğ¸œ¤ìÉ•ÑÕÉ¸ìô(€€€É•µ½Ù•1½…°¡A9%9}-d¤ì(€€€ÑÉå	…­•¹‘1½½­ÕÀ¡ÕÉÉ•¹ÑM…¸¤ì(€ô((€™Õ¹Ñ¥½¸¡…¹‘±•Ñ¥½¸¡…Ñ¥½¸¥ì(€€€¥˜€¡…Ñ¥½¸€ôôô€±½Í”œ¤É•ÑÕÉ¸±½Í•M…¹¹•È ¤ì(€€€¥˜€¡…Ñ¥½¸€ôôô€ÍÑ…ÉĞœ¤É•ÑÕÉ¸ÍÑ…ÉÑ…µ•É„ ¤ì(€€€¥˜€¡…Ñ¥½¸€ôôô€ÍÑ½Àœ¤ìÍÑ½Á…µ•É„ ¤ìÍ•ÑMÑ…ÑÕÌ …·¥É„…ÉË©Ó¥”¸œ¤ìÉ•ÑÕÉ¸ìô(€€€¥˜€¡…Ñ¥½¸€ôôô€É•ÍÑ…ÉĞœ¤ìÕÉÉ•¹ÑM…¸€ô¹Õ±°ìÙ…ÈÉ•ÍÕ±Ğ€ô‰å% ÁÉÍ…¹I•ÍÕ±Ğœ¤ì¥˜€¡É•ÍÕ±Ğ¤É•ÍÕ±Ğ¹¡¥‘‘•¸€ôÑÉÕ”ìÉ•ÑÕÉ¸ÍÑ…ÉÑ…µ•É„ ¤ìô(€€€¥˜€¡…Ñ¥½¸€ôôô€Í…Ù”µÁÉ¥”œ¤É•ÑÕÉ¸Í…Ù•MÑ½É•AÉ¥” ¤ì(€€€¥˜€¡…Ñ¥½¸€ôôô€…Í¬µ©Õ±Ù½àœ¤É•ÑÕÉ¸…Í­)Õ±Ù½à ¤ì(€€€¥˜€¡…Ñ¥½¸€ôôô€…¹…±åé”µ¹½Üœ¤É•ÑÕÉ¸…¹…±åé•9½Ü ¤ì(€€€¥˜€¡…Ñ¥½¸€ôôô€µ…¹Õ…°œ¤ì(€€€€€Ù…È¥¹ÁÕĞ€ô‰å% ÁÉÍ…¹5…¹Õ…±%¹ÁÕĞœ¤ìÙ…È±…ÍÍ¥™¥•€ô±…ÍÍ¥™å5…¹Õ…±	…É½‘”¡¥¹ÁÕĞ€˜˜¥¹ÁÕĞ¹Ù…±Õ”¤ì(€€€€€¥˜€ …±…ÍÍ¥™¥•¤ìÍ•ÑMÑ…ÑÕÌ ½‘”¥¹Ù…±¥‘”¸[¥É¥™¥”±•Ì¡¥™™É•Ì½ÔÉ…ÁÁÉ½¡”±„…·¥É„‘Ô½‘”¸œ¤ìÉ•ÑÕÉ¸ìô(€€€€€…•ÁÑ	…É½‘”¡±…ÍÍ¥™¥•¹‰…É½‘”°±…ÍÍ¥™¥•¹‰…É½‘•QåÁ”¤ìÉ•ÑÕÉ¸ì(€€€ô(€ô((€‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ°™Õ¹Ñ¥½¸¡•Ù•¹Ğ¥ì(€€€Ù…È½Á•¸€ô•Ù•¹Ğ¹Ñ…É•Ğ¹±½Í•ÍĞ€˜˜•Ù•¹Ğ¹Ñ…É•Ğ¹±½Í•ÍĞ m‘…Ñ„µÁÉÍ…¸µ½Á•¹tœ¤ì(€€€¥˜€¡½Á•¸¤ì•Ù•¹Ğ¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ì½Á•¹M…¹¹•È¡½Á•¸¤ìÉ•ÑÕÉ¸ìô(€€€Ù…È…Ñ¥½¹9½‘”€ô•Ù•¹Ğ¹Ñ…É•Ğ¹±½Í•ÍĞ€˜˜•Ù•¹Ğ¹Ñ…É•Ğ¹±½Í•ÍĞ m‘…Ñ„µÁÉÍ…¸µ…Ñ¥½¹tœ¤ì(€€€¥˜€¡…Ñ¥½¹9½‘”¤ì•Ù•¹Ğ¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ì¡…¹‘±•Ñ¥½¸¡…Ñ¥½¹9½‘”¹•ÑÑÑÉ¥‰ÕÑ” ‘…Ñ„µÁÉÍ…¸µ…Ñ¥½¸œ¤¤ìô(€ô¤ì(€‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ­•å‘½İ¸œ°™Õ¹Ñ¥½¸¡•Ù•¹Ğ¥ì¥˜€¡•Ù•¹Ğ¹­•ä€ôôô€Í…Á”œ€˜˜‰å%¡M99I}%¤€˜˜€…‰å%¡M99I}%¤¹¡¥‘‘•¸¤±½Í•M…¹¹•È ¤ìô¤ì(€‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Ù¥Í¥‰¥±¥Ñå¡…¹”œ°™Õ¹Ñ¥½¸ ¥ì¥˜€¡‘½Õµ•¹Ğ¹¡¥‘‘•¸¤ÍÑ½Á…µ•É„ ¤ìô¤ì(€İ¥¹‘½Ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È Á…•¡¥‘”œ°ÍÑ½Á…µ•É„¤ì(€İ¥¹‘½Ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ½™™±¥¹”œ°™Õ¹Ñ¥½¸ ¥ì¥˜€¡‰å%¡M99I}%¤€˜˜€…‰å%¡M99I}%¤¹¡¥‘‘•¸¤Í•ÑMÑ…ÑÕÌ !½ÉÌ±¥¹”€è±”Í…¸É•ÍÑ”±½…°¸1qÔÈÀÄå…¹…±åÍ”½µÁ³¡Ñ”…ÑÑ•¹‘É„±„½¹¹•á¥½¸¸œ¤ìô¤ì(€İ¥¹‘½Ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ½¹±¥¹”œ°™Õ¹Ñ¥½¸ ¥ì¥˜€¡‰å%¡M99I}%¤€˜˜€…‰å%¡M99I}%¤¹¡¥‘‘•¸¤Í•ÑMÑ…ÑÕÌ ½¹¹•á¥½¸É•Ù•¹Õ”¸QÔÁ•ÕàÉ•±…¹•È±qÔÈÀÄå…¹…±åÍ”‘ÔÍ…¸•¹É•¥ÍÑË¤¸œ¤ìô¤ì((€™Õ¹Ñ¥½¸‰½½Ğ ¥ìÉ•…Ñ•¥…±½œ ¤ì¥¹ÍÑ…±±¹ÑÉåA½¥¹Ğ ¤ìô(€¥˜€¡‘½Õµ•¹Ğ¹É•…‘åMÑ…Ñ”€ôôô€±½…‘¥¹œœ¤‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È =5½¹Ñ•¹Ñ1½…‘•œ°‰½½Ğ°ì½¹”éÑÉÕ”ô¤ì•±Í”‰½½Ğ ¤ì(€İ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕĞ¡¥¹ÍÑ…±±¹ÑÉåA½¥¹Ğ°ÌÀÀ¤ì(€İ¥¹‘½Ü¹)Õ±Ù½áAÉ½‘ÕÑM…¹¹•È€ô=‰©•Ğ¹™É••é”¡ì½Á•¸é½Á•¹M…¹¹•È°ÍÑ½ÀéÍÑ½Á…µ•É„°±…ÍÍ¥™å5…¹Õ…±	…É½‘”é±…ÍÍ¥™å5…¹Õ…±	…É½‘”ô¤ì)ô¤ ¤ì(ğ½ÍÉ¥ÁĞù€ì()™Õ¹Ñ¥½¸™…¥°¡µ•ÍÍ…”¤ì(€Ñ¡É½Ü¹•ÜÉÉ½È¡)U1Y=`µAI=UPµ	I=µM99H´ÀÄ¥¹Ñ•É…Ñ¥½¸™…¥±•è€‘íµ•ÍÍ…•õ€¤ì)ô()™Õ¹Ñ¥½¸…ÁÁ±åM…¹¹•ÉáÁ•É¥•¹”¡¥¹ÁÕĞ¤ì(€¥˜€¡ÑåÁ•½˜¥¹ÁÕĞ€„ôô€ÍÑÉ¥¹œœñğ€…¥¹ÁÕĞ¹¥¹±Õ‘•Ì œğ½¡•…øœ¤ñğ€…¥¹ÁÕĞ¹¥¹±Õ‘•Ì œğ½‰½‘äøœ¤¤ì(€€€™…¥° •áÁ•Ñ•„½µÁ±•Ñ”!Q50‘½Õµ•¹Ğœ¤ì(€ô(€¥˜€¡¥¹ÁÕĞ¹¥¹±Õ‘•Ì¡5I-H¤¤É•ÑÕÉ¸¥¹ÁÕĞì(€¥˜€ …¥¹ÁÕĞ¹¥¹±Õ‘•Ì ¥ô‰©Õ±Ù½á•¥Í¥½¹!½µ”ˆœ¤¤™…¥° )Õ±Ù½à‘•¥Í¥½¸¡½µ”µÕÍĞ‰”¥¹Ñ•É…Ñ•™¥ÉÍĞœ¤ì(€±•Ğ¡Ñµ°€ô¥¹ÁÕĞ¹É•Á±…” œğ½¡•…øœ°€‘íM99I}MMõq¸ğ½¡•…ù€¤ì(€¡Ñµ°€ô¡Ñµ°¹É•Á±…” œğ½‰½‘äøœ°€‘í5I-Iõq¸‘íM99I}IU9Q%5õq¸ğ½‰½‘äù€¤ì(€É•ÑÕÉ¸¡Ñµ°ì)ô()™Õ¹Ñ¥½¸Ù•É¥™åM…¹¹•ÉáÁ•É¥•¹”¡¡Ñµ°¤ì(€¥˜€ ¡¡Ñµ°¹µ…Ñ  ½©Õ±Ù½àµÁÉ½‘ÕĞµ‰…É½‘”µÍ…¹¹•È´ÀÄ½œ¤ñğmt¤¹±•¹Ñ €ğ€Ì¤™…¥° Í…¹¹•Èµ…É­•È½ÉÕ¹Ñ¥µ”½ÍÑå±•Ì…É”¥¹½µÁ±•Ñ”œ¤ì(€™½È€¡½¹ÍĞÑ½­•¸½˜l(€€€€M…¹¹•ÈÕ¸ÁÉ½‘Õ¥Ğœ°(€€€€‰l•…¹|ÄÌœ°•…¹|àœ°ÕÁ}„œ°ÕÁ}”tˆ°(€€€€¹…Ù¥…Ñ½È¹µ•‘¥…•Ù¥•Ì¹•ÑUÍ•É5•‘¥„œ°(€€€€ÑÉ…¬¹ÍÑ½À ¤œ°(€€€€‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È pˆÙ¥Í¥‰¥±¥Ñå¡…¹•pœˆ°(€€€€Í…¥Í¥È±”½‘”µ…¹Õ•±±•µ•¹Ğœ°(€€€€%9=I5Q%=9L%9MU%M9QLœ°(€€€€İ¥¹‘½Ü¹)Õ±Ù½áAÉ½‘ÕÑM…¹	…­•¹œ°(€€€€•µ…¹‘•Èƒ€)Õ±Ù½àœ°(€€€€9”™…‰É¥ÅÕ”…ÕÕ¸ÁÉ¥à°¡¥ÍÑ½É¥ÅÕ”°‘¥ÍÁ½¹¥‰¥±¥Ó¤½Ôƒ¥½¹½µ¥”œ°(€€€€AÉ½‘Õ¥Ğ•¹É•¥ÍÑË¤¸½¹¹•á¥½¸»¥•ÍÍ…¥É”œ°(€€€€‰‘½Õµ•¹Ğ¹‘½Õµ•¹Ñ±•µ•¹Ğ¹Í•ÑÑÑÉ¥‰ÕÑ” ‘…Ñ„µÁÉÍ…¸µ…Ñ¥Ù”œ°ÑÉÕ”œ¤ˆ°(€t¤ì(€€€¥˜€ …¡Ñµ°¹¥¹±Õ‘•Ì¡Ñ½­•¸¤¤™…¥°¡µ¥ÍÍ¥¹œÍ…¹¹•È½¹ÑÉ…ĞÑ½­•¸è€‘íÑ½­•¹õ€¤ì(€ô(€¥˜€¡¡Ñµ°¹¥¹±Õ‘•Ì ‰‘½Õµ•¹Ğ¹‘½Õµ•¹Ñ±•µ•¹Ğ¹Í•ÑÑÑÉ¥‰ÕÑ” ‘…Ñ„µÁÉÍ…¸µ½Á•¸œ°ÑÉÕ”œ¤ˆ¤¤™…¥° Í…¹¹•È½Á•¸µÍÑ…Ñ”µÕÍĞ¹½ĞÉ•ÕÍ”Ñ¡”•¹ÑÉäÑÉ¥•È…ÑÑÉ¥‰ÕÑ”œ¤ì(€¥˜€ ½ÕÉÉ•¹Ñ}ÁÉ¥•qÌ©p©qÌ¨Åp¸È¼¹Ñ•ÍĞ¡¡Ñµ°¤¤™…¥° ™…‰É¥…Ñ•É•™•É•¹”ÁÉ¥”±½¥Œ¥Ì™½É‰¥‘‘•¸œ¤ì(€¥˜€ ½£¡Ñ”°oŠdu•ÍĞ½¤¹Ñ•ÍĞ¡¡Ñµ°¤¤™…¥° …ÕÑ½µ…Ñ¥ŒÁÉ½µ½Ñ¥½¹…°‰Õäİ½É‘¥¹œ¥Ì™½É‰¥‘‘•¸œ¤ì(€É•ÑÕÉ¸¡Ñµ°ì)ô()µ½‘Õ±”¹•áÁ½ÉÑÌ€ôì(€5I-H°(€M99I}ML°(€M99I}IU9Q%5°(€…ÁÁ±åM…¹¹•ÉáÁ•É¥•¹”°(€Ù•É¥™åM…¹¹•ÉáÁ•É¥•¹”°)ôì(