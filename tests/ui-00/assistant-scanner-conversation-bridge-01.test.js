const assert = require('node:assert/strict');
const test = require('node:test');

const bridge = require('../../scripts/julvox-assistant-scanner-conversation-bridge-01.js');

const fixture = `<!doctype html><html><body>
<script id="julvox-assistant-conversational-intelligence-01-runtime"></script>
<script>
async function lookupBarcodeValue(ean) {
  const normalizedEan = String(ean ?? '').trim();
  const result = { data: {} };
  renderScanResults(result.data, normalizedEan, el);
}
async function searchBarcode(barcode) {
  try {
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      renderScanResult(data.results[0], barcode, resEl);
    } else {
      renderScanNotFound(barcode, resEl);
    }
  } catch(e) {
    renderScanNotFound(barcode, resEl);
  }
}
</script>
</body></html>`;

test('verified /scan/barcode result is forwarded to the active Assistant conversation', () => {
  const output = bridge.integrate(fixture);
  assert.match(output, /JULVOX_FORWARD_VERIFIED_SCANNER_LOOKUP\(normalizedEan, result\.data\)/);
  assert.match(output, /source\.found===true&&Boolean\(name\)/);
  assert.match(output, /verified:true,product:safeProduct/);
  assert.match(output, /ensureJulvoxAssistantConversation/);
  assert.doesNotMatch(output, /startNewJulvoxAssistantConversation/);
  assert.match(output, /sendJulvoxScannerMessage/);
});

test('generic compare lookup is never promoted to a verified barcode match', () => {
  const output = bridge.integrate(fixture);
  const matches = output.match(/JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP\(barcode\)/g) || [];
  assert.equal(matches.length, 3);
  assert.match(output, /verified:false/);
});

test('bridge copies only explicit product identity and observed first price', () => {
  const runtime = bridge.RUNTIME;
  assert.match(runtime, /safeProduct=\{name:name\}/);
  assert.match(runtime, /product\.brand/);
  assert.match(runtime, /product\.model/);
  assert.match(runtime, /product\.variant/);
  assert.match(runtime, /firstDeal\.current_price/);
  assert.equal(/novadeal_score|discount_pct|saving|max_savings/.test(runtime), false);
});

test('scanner bridge is idempotent and fails closed on missing anchors', () => {
  const once = bridge.integrate(fixture);
  assert.equal(bridge.integrate(once), once);
  assert.throws(
    () => bridge.integrate('<html><body><script id="julvox-assistant-conversational-intelligence-01-runtime"></script></body></html>'),
    /missing anchor/,
  );
});
