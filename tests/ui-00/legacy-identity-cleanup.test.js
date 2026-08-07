const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BACKEND_TECHNICAL_REFERENCE,
  cleanupIdentityText,
  findForbiddenIdentity,
} = require('../../scripts/product-realign-01b-legacy-identity-cleanup.js');

test('removes historical frontoffice identity while preserving backend and cache technical references', () => {
  const source = `<title>DealScan — NovaDeal™</title>
<meta name="twitter:site" content="@dealscan_fr"/>
<div class="logo">Deal<em>Scan</em></div>
<div>Je suis l'assistant DealScan.</div>
<button>Top deals</button>
<!-- NOVADEAL™ v2 -->
# DealScan by Julvox — Meilleurs deals & promos France
const tags = ['#dealscan'];
if (/dealscan|workbox|precache/i.test(cacheName)) caches.delete(cacheName);
const api = 'https://${BACKEND_TECHNICAL_REFERENCE}';
const score = data.novadeal_score;`;
  const result = cleanupIdentityText(source);
  assert.deepEqual(findForbiddenIdentity(result), []);
  assert.match(result, /Je suis l'assistant Julvox\./);
  assert.match(result, /Sélection Julvox/);
  assert.match(result, /#julvox/);
  assert.match(result, /JULVOX v2/);
  assert.match(result, /# Julvox by Julvox/);
  assert.match(result, /\/dealscan\|workbox\|precache\/i/);
  assert.match(result, /novadeal_score/);
  assert.match(result, new RegExp(BACKEND_TECHNICAL_REFERENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(result, /@dealscan_fr/i);
});

test('cleanup is idempotent', () => {
  const source = 'DealScan NovaDeal™ NOVADEAL™ Top deals #dealscan';
  const once = cleanupIdentityText(source);
  assert.equal(cleanupIdentityText(once), once);
});
