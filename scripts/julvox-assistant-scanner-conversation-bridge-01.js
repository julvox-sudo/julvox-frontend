const LOOKUP_ANCHOR = '  renderScanResults(result.data, normalizedEan, el);';
const LOOKUP_FORWARD = `${LOOKUP_ANCHOR}\n  if (typeof window.JULVOX_FORWARD_VERIFIED_SCANNER_LOOKUP === 'function') {\n    window.JULVOX_FORWARD_VERIFIED_SCANNER_LOOKUP(normalizedEan, result.data);\n  }`;

const SEARCH_FOUND_ANCHOR = '      renderScanResult(data.results[0], barcode, resEl);';
const SEARCH_FOUND_FORWARD = `${SEARCH_FOUND_ANCHOR}\n      if (typeof window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP === 'function') {\n        window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP(barcode);\n      }`;
const SEARCH_EMPTY_ANCHOR = '      renderScanNotFound(barcode, resEl);';
const SEARCH_EMPTY_FORWARD = `${SEARCH_EMPTY_ANCHOR}\n      if (typeof window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP === 'function') {\n        window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP(barcode);\n      }`;
const SEARCH_CATCH_ANCHOR = '    renderScanNotFound(barcode, resEl);\n  }\n}';
const SEARCH_CATCH_FORWARD = `    renderScanNotFound(barcode, resEl);\n    if (typeof window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP === 'function') {\n      window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP(barcode);\n    }\n  }\n}`;
const MARKER = 'julvox-assistant-scanner-conversation-bridge-01-runtime';

const RUNTIME = `<script id="${MARKER}">
(function(){
  'use strict';
  function cleanText(value, maximum){
    if(typeof value!=='string') return undefined;
    var text=value.trim().replace(/\\s+/g,' ');
    return text ? text.slice(0,maximum) : undefined;
  }
  function openScannerConversation(scanner){
    if(!scanner || !/^\\d{8,14}$/.test(String(scanner.code||''))) return false;
    if(typeof window.ensureJulvoxAssistantConversation==='function') window.ensureJulvoxAssistantConversation();
    if(typeof window.openAIChat==='function') window.openAIChat();
    if(typeof window.sendJulvoxScannerMessage==='function') return window.sendJulvoxScannerMessage(scanner);
    return false;
  }
  window.JULVOX_FORWARD_VERIFIED_SCANNER_LOOKUP=function(code,data){
    var source=data&&typeof data==='object'?data:{};
    var product=source.product&&typeof source.product==='object'?source.product:{};
    var name=cleanText(product.name,160);
    var verified=source.found===true&&Boolean(name);
    if(!verified) return openScannerConversation({code:String(code||''),verified:false});
    var firstDeal=Array.isArray(source.deals)&&source.deals.length&&source.deals[0]&&typeof source.deals[0]==='object'?source.deals[0]:{};
    var safeProduct={name:name};
    var brand=cleanText(product.brand,80); if(brand) safeProduct.brand=brand;
    var model=cleanText(product.model,120); if(model) safeProduct.model=model;
    var variant=cleanText(product.variant,120); if(variant) safeProduct.variant=variant;
    var price=Number(firstDeal.current_price); if(Number.isFinite(price)&&price>=0) safeProduct.current_price=price;
    return openScannerConversation({code:String(code||''),verified:true,product:safeProduct});
  };
  window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP=function(code){
    return openScannerConversation({code:String(code||''),verified:false});
  };
})();
</script>`;

function replaceExactlyOnce(input, from, to, label) {
  const first = input.indexOf(from);
  if (first < 0) throw new Error(`Scanner conversation bridge missing anchor: ${label}`);
  if (input.indexOf(from, first + from.length) >= 0) throw new Error(`Scanner conversation bridge ambiguous anchor: ${label}`);
  return input.slice(0, first) + to + input.slice(first + from.length);
}

function integrate(input) {
  let html = String(input);
  if (html.includes(`id="${MARKER}"`)) return verify(html);
  if (!html.includes('julvox-assistant-conversational-intelligence-01-runtime')) {
    throw new Error('Scanner conversation bridge requires conversational runtime first');
  }
  html = replaceExactlyOnce(html, LOOKUP_ANCHOR, LOOKUP_FORWARD, 'verified /scan/barcode forwarding');
  html = replaceExactlyOnce(html, SEARCH_FOUND_ANCHOR, SEARCH_FOUND_FORWARD, 'generic search found forwarding');
  html = replaceExactlyOnce(html, SEARCH_EMPTY_ANCHOR, SEARCH_EMPTY_FORWARD, 'generic search empty forwarding');
  html = replaceExactlyOnce(html, SEARCH_CATCH_ANCHOR, SEARCH_CATCH_FORWARD, 'generic search catch forwarding');
  const closing = html.lastIndexOf('</body>');
  if (closing < 0) throw new Error('Scanner conversation bridge missing </body>');
  html = html.slice(0, closing) + RUNTIME + '\n' + html.slice(closing);
  return verify(html);
}

function verify(input) {
  const html = String(input);
  for (const required of [
    `id="${MARKER}"`,
    'JULVOX_FORWARD_VERIFIED_SCANNER_LOOKUP(normalizedEan, result.data)',
    'JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP(barcode)',
    "source.found===true&&Boolean(name)",
    "verified:true,product:safeProduct",
    "verified:false",
    'ensureJulvoxAssistantConversation',
    'sendJulvoxScannerMessage',
  ]) {
    if (!html.includes(required)) throw new Error(`Scanner conversation bridge missing contract: ${required}`);
  }
  if (html.includes("if(typeof window.startNewJulvoxAssistantConversation==='function') window.startNewJulvoxAssistantConversation();")) {
    throw new Error('Scanner conversation bridge must not create a new conversation implicitly');
  }
  return html;
}

module.exports = { MARKER, RUNTIME, integrate, verify };
