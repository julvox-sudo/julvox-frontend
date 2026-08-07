const MARKER = '<!-- julvox-product-barcode-scanner-01-hardening -->';

function gtinModulo10Valid(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 2) return false;
  const checkDigit = Number(digits.at(-1));
  let sum = 0;
  let weight = 3;
  for (let index = digits.length - 2; index >= 0; index -= 1) {
    sum += Number(digits[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return ((10 - (sum % 10)) % 10) === checkDigit;
}

function expandUpce(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 8 || !/^[01]/.test(digits)) return null;
  const numberSystem = digits[0];
  const a = digits[1];
  const b = digits[2];
  const c = digits[3];
  const d = digits[4];
  const e = digits[5];
  const f = digits[6];
  const check = digits[7];
  let data;
  if ('012'.includes(f)) data = numberSystem + a + b + f + '00' + '00' + c + d + e;
  else if (f === '3') data = numberSystem + a + b + c + '00' + '000' + d + e;
  else if (f === '4') data = numberSystem + a + b + c + d + '0' + '0000' + e;
  else data = numberSystem + a + b + c + d + e + '0000' + f;
  return data + check;
}

function isValidManualBarcode(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 13 || digits.length === 12) return gtinModulo10Valid(digits);
  if (digits.length === 8) {
    const expandedUpce = expandUpce(digits);
    return gtinModulo10Valid(digits) || Boolean(expandedUpce && gtinModulo10Valid(expandedUpce));
  }
  return false;
}

const HARDENING_RUNTIME = String.raw`
<script id="julvox-product-barcode-scanner-01-hardening-runtime">
(function julvoxProductBarcodeScanner01Hardening(){
  'use strict';
  var HISTORY_FLAG = 'julvoxProductScanner';

  function byId(id){ return document.getElementById(id); }
  function status(text){ var node = byId('prscanStatus'); if (node) node.textContent = text; }
  function digitsOnly(value){ return String(value || '').replace(/\D/g,''); }

  function modulo10Valid(value){
    var digits = digitsOnly(value);
    if (digits.length < 2) return false;
    var checkDigit = Number(digits.charAt(digits.length - 1));
    var sum = 0;
    var weight = 3;
    for (var index = digits.length - 2; index >= 0; index -= 1) {
      sum += Number(digits.charAt(index)) * weight;
      weight = weight === 3 ? 1 : 3;
    }
    return ((10 - (sum % 10)) % 10) === checkDigit;
  }

  function expandUpce(value){
    var digits = digitsOnly(value);
    if (digits.length !== 8 || !/^[01]/.test(digits)) return null;
    var numberSystem = digits.charAt(0);
    var a = digits.charAt(1);
    var b = digits.charAt(2);
    var c = digits.charAt(3);
    var d = digits.charAt(4);
    var e = digits.charAt(5);
    var f = digits.charAt(6);
    var check = digits.charAt(7);
    var data;
    if ('012'.indexOf(f) >= 0) data = numberSystem + a + b + f + '00' + '00' + c + d + e;
    else if (f === '3') data = numberSystem + a + b + c + '00' + '000' + d + e;
    else if (f === '4') data = numberSystem + a + b + c + d + '0' + '0000' + e;
    else data = numberSystem + a + b + c + d + e + '0000' + f;
    return data + check;
  }

  function validManual(value){
    var digits = digitsOnly(value);
    if (digits.length === 13 || digits.length === 12) return modulo10Valid(digits);
    if (digits.length === 8) {
      var expanded = expandUpce(digits);
      return modulo10Valid(digits) || Boolean(expanded && modulo10Valid(expanded));
    }
    return false;
  }

  function scannerOpen(){
    var dialog = byId('julvoxProductScanner');
    return Boolean(dialog && !dialog.hidden);
  }

  function pushScannerHistoryState(){
    try {
      if (history.state && history.state[HISTORY_FLAG]) return;
      var next = Object.assign({}, history.state || {});
      next[HISTORY_FLAG] = true;
      history.pushState(next, '', location.href);
    } catch (_) {}
  }

  function removeScannerHistoryState(){
    try {
      if (history.state && history.state[HISTORY_FLAG]) history.back();
    } catch (_) {}
  }

  document.addEventListener('click', function(event){
    var target = event.target.closest && event.target.closest('[data-prscan-open]');
    if (target) pushScannerHistoryState();
  }, true);

  document.addEventListener('click', function(event){
    var action = event.target.closest && event.target.closest('[data-prscan-action]');
    if (!action) return;
    var actionName = action.getAttribute('data-prscan-action');
    if (actionName === 'manual') {
      var input = byId('prscanManualInput');
      if (!validManual(input && input.value)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        status('Code invalide. Vérifie tous les chiffres, y compris le chiffre de contrôle.');
        if (input) input.setAttribute('aria-invalid','true');
        return;
      }
      if (input) input.removeAttribute('aria-invalid');
    }
    if (actionName === 'close') removeScannerHistoryState();
  }, true);

  document.addEventListener('keydown', function(event){
    if (event.key === 'Escape' && scannerOpen()) removeScannerHistoryState();
  }, true);

  window.addEventListener('popstate', function(){
    if (!scannerOpen()) return;
    var close = document.querySelector('#julvoxProductScanner [data-prscan-action="close"]');
    if (close) close.click();
  });
})();
</script>`;

function fail(message) {
  throw new Error(`JULVOX-PRODUCT-BARCODE-SCANNER-01 hardening failed: ${message}`);
}

function applyScannerHardening(input) {
  if (typeof input !== 'string' || !input.includes('</body>')) fail('expected a complete HTML document');
  if (!input.includes('julvox-product-barcode-scanner-01-runtime')) fail('scanner runtime must be integrated first');
  if (input.includes(MARKER)) return input;
  return input.replace('</body>', `${MARKER}\n${HARDENING_RUNTIME}\n</body>`);
}

function verifyScannerHardening(html) {
  for (const token of [
    'julvox-product-barcode-scanner-01-hardening-runtime',
    'chiffre de contrôle',
    'modulo10Valid',
    'expandUpce',
    "history.pushState(next, '', location.href)",
    "history.back()",
    "window.addEventListener('popstate'",
    "input.setAttribute('aria-invalid','true')",
  ]) {
    if (!html.includes(token)) fail(`missing hardening token: ${token}`);
  }
  return html;
}

module.exports = {
  MARKER,
  HARDENING_RUNTIME,
  gtinModulo10Valid,
  expandUpce,
  isValidManualBarcode,
  applyScannerHardening,
  verifyScannerHardening,
};
