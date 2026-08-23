const fs = require('fs');
const path = require('path');
const { findArbitraryScoreFallbacks } = require('./ui-00-score-contract.js');

const root = process.cwd();
const forbiddenTokens = [
  'getDemoCompareResults', 'getDemoLeaderboard', 'getDemoCommDeals', 'getDemoReport',
  'getDemoScanResult', 'getDemoWishlist', 'getDemoAchievements', 'generateSimulatedHistory',
  'localAnalyzeDeal', 'injectLocalAnalysis', 'getLocalCalendar', 'getDefaultProPlans',
  'getLocalAIResponse', 'getDefaultCbRates', 'MacBook Air M3', 'PS5 Slim', 'Nike Air Max 270',
  'Compte supprimé localement', 'Deal soumis (vérification en cours)', 'Alerte enregistrée pour',
  "uid:'julien...'", "uid:'marie...'", "uid:'thomas...'", "uid:'chloe...'", "uid:'alex...'",
  "price_monthly:49", "price_monthly:99", "price_monthly:299",
  'const defaultRates = {Amazon:3', 'Offline demo',
];

function hasDemoOnlyGate(source) {
  const truth = String(source);
  const explicitDemoEnvironment = /\bisDemoMode\b[\s\S]{0,180}runtime\(\)\?\.\s*runtime\?\.\s*environment\s*===\s*['"]demo['"]/.test(truth);
  const unknownFailsUnavailable = /VALID_CAPABILITY_STATUSES\.includes\(definition\?\.status\)\s*\?\s*definition\.status\s*:\s*['"]unavailable['"]/.test(truth);
  const demoOnlyRequiresDemo = /status\s*!==\s*['"]demo-only['"]\s*\|\|\s*isDemoMode\(\)/.test(truth);
  return explicitDemoEnvironment && unknownFailsUnavailable && demoOnlyRequiresDemo;
}

function hasHonestServiceWorkerErrors(source) {
  const sw = String(source);
  const helperPassesStatus = /function\s+jsonError\s*\(\s*status\s*,[\s\S]{0,500}?new\s+Response\([\s\S]{0,300}?\{\s*status\s*,/.test(sw);
  const unavailable503 = /\bjsonError\(\s*503\s*,\s*['"]offline['"]/.test(sw);
  const stale504 = /\bjsonError\(\s*504\s*,\s*['"]offline_stale['"]/.test(sw);
  const noFabricatedSuccess = !/\bjsonError\(\s*200\s*,\s*['"]offline(?:_stale)?['"]/.test(sw);
  return helperPassesStatus && unavailable503 && stale504 && noFabricatedSuccess;
}

function scanProductionTruth(files, baseDir = root) {
  const failures = [];
  const read = relativePath => {
    const filePath = path.join(baseDir, relativePath);
    if (!fs.existsSync(filePath)) { failures.push(`missing ${relativePath}`); return ''; }
    return fs.readFileSync(filePath, 'utf8');
  };
  const html = read(files?.html || 'dist/index.html');
  const enhancements = read(files?.enhancements || 'dist/enhancements_v3.js');
  const client = read(files?.client || 'dist/api-client.js');
  const truth = read(files?.truth || 'dist/ui-00-production-truth.js');
  const sw = read(files?.sw || 'dist/sw.js');
  const combined = `${html}\n${enhancements}`;

  for (const token of forbiddenTokens) {
    if (combined.includes(token)) failures.push(`forbidden production token: ${token}`);
  }

  const scriptTags = [
    '<script src="/runtime-config.js"></script>',
    '<script src="/api-client.js"></script>',
    '<script src="/ui-00-production-truth.js" defer></script>',
    '<script src="/enhancements_v3.js" defer></script>',
  ];
  const positions = scriptTags.map(tag => {
    const count = html.split(tag).length - 1;
    if (count !== 1) failures.push(`script tag must appear exactly once: ${tag}`);
    return html.indexOf(tag);
  });
  if (!positions.every((position, index) => position >= 0 && (index === 0 || positions[index - 1] < position))) {
    failures.push('runtime config, API client, UI-00 truth and enhancements load order is invalid');
  }

  for (const marker of [
    'ui-00-production-truth:applied-v3',
    'ui-00-final-product-truth:applied-v3',
    'ui-00-residual-product-truth:applied-v3',
  ]) {
    if (!html.includes(marker)) failures.push(`missing build transformation marker: ${marker}`);
  }
  if (!enhancements.includes('ui-00-production-truth:applied-v3')) failures.push('enhancements transformation marker is missing');

  if (/Math\.floor\(Math\.random\(\)\s*\*\s*58/.test(combined)) failures.push('random verification duration remains');
  if (/(?:vote|votes|score|popularit|confirmation|\bup\b|\bdown\b)[^;\n]{0,180}Math\.random|Math\.random[^;\n]{0,180}(?:vote|votes|score|popularit|confirmation|\bup\b|\bdown\b)/i.test(combined)) {
    failures.push('random vote, score, confirmation or popularity fallback remains');
  }
  if (/const\s+STORE_TRUST(?:_V3)?\s*=\s*\{\s*['"]/.test(combined)) failures.push('local merchant scores remain');
  if (findArbitraryScoreFallbacks(combined).length) failures.push('arbitrary displayed score fallback remains');
  if (/\b(?:timer|timerSec|rem)\s*=\s*[^;\n]*(?:\|\||\?\?)[^;\n]*(?:3600|7200)\b/.test(combined)) failures.push('synthetic countdown fallback remains');
  if (/>\s*Live\s*</i.test(combined) || /['"`]LIVE['"`]/.test(combined) || /temps réel|vérifié il y a/i.test(combined)) failures.push('unqualified real-time claim remains');
  if (/fetchWithTimeout\(|fetchWithRetry\(/.test(combined)) failures.push('legacy direct fetch helper remains');
  if (/\bfetch\(\s*(?:API\s*\+|`\$\{API\}|url\s*,\s*token)/.test(combined)) failures.push('direct backend fetch remains outside API client');
  if (/\.backend\?\.api_base_url|\.backend\.api_base_url/.test(combined + client + truth)) failures.push('legacy api_base_url property is consumed at runtime');
  if (/\|\|\s*['"]https:\/\/[^'"]*railway\.app/.test(html) || /railway\.app/.test(client)) failures.push('hard-coded Railway fallback remains');

  if (!client.includes('patch: (path, body, opts = {})')) failures.push('API client PATCH method is missing');
  if (!client.includes('candidate.username || candidate.password')) failures.push('API client URL credentials rejection is missing');
  if (!client.includes("configurable: false")) failures.push('API client global is reconfigurable');
  if (!truth.includes('ui-00-runtime:composed-v1') || !truth.includes('JULVOX_INSTALL_UI00_MUTATIONS')) failures.push('UI-00 public runtime composition is missing');
  if (!truth.includes('withMutationLock')) failures.push('mutation duplicate guard is missing');
  if (!truth.includes('Number.isFinite(data?.votes_validate) && Number.isFinite(data?.votes_reject)')) failures.push('community vote confirmation accepts incomplete counters');
  if (!truth.includes('Number.isFinite(data?.votes_ok) && Number.isFinite(data?.votes_ko)')) failures.push('promotion vote confirmation accepts incomplete counters');
  for (const token of [
    'response?.status === 200',
    "data?.status === 'anonymized'",
    "data?.scope === 'profile_and_covered_local_identity_graph'",
    'data?.full_erasure === false',
  ]) {
    if (!truth.includes(token)) failures.push(`account deletion anonymization confirmation is missing: ${token}`);
  }
  if (truth.includes('response?.status === 204 || data?.rgpd === true')) failures.push('legacy account deletion 204/rgpd confirmation remains');
  if (!truth.includes('subscription.unsubscribe()')) failures.push('push subscription rollback is missing');
  if (!truth.includes('CAPABILITY_SURFACES') || !truth.includes('CAPABILITY_ENTRYPOINTS')) failures.push('capability behavior mapping is missing');
  if (!hasDemoOnlyGate(truth)) failures.push('demo-only environment gate is missing');

  if (!sw.includes("request.method !== 'GET'")) failures.push('service worker does not refuse caching mutations');
  if (!sw.includes("request.headers?.has?.('Authorization')")) failures.push('service worker does not refuse caching authenticated requests');
  if (!sw.includes("request.credentials === 'include'")) failures.push('service worker does not refuse credentialed public GET requests');
  if (!sw.includes('isCacheablePublicResponse') || !sw.includes('Set-Cookie') || !sw.includes('no-store|private')) failures.push('service worker does not reject private/no-store public responses');
  if (!sw.includes('safePublicUrl')) failures.push('service worker notification redirects are not restricted to the public origin');
  if (!sw.includes('julvox-public-api-')) failures.push('service worker does not isolate the Julvox public GET cache');
  if (sw.includes('syncPendingVotes') || sw.includes("event.tag === 'sync-votes'")) failures.push('service worker still queues or replays vote mutations');
  if (!hasHonestServiceWorkerErrors(sw)) failures.push('service worker 503/504 responses are missing');
  if (/offline(?:_stale)?[^\n]+deals:\s*\[\]/.test(sw)) failures.push('service worker fabricates an empty deals result');
  if (!/['"]Cache-Control['"]\s*:\s*['"]no-store['"]/.test(sw)) failures.push('service worker API error responses are cacheable');

  return failures;
}

if (require.main === module) {
  const failures = scanProductionTruth();
  if (failures.length) {
    console.error('Production truth verification failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('Production truth verification passed.');
}

module.exports = { forbiddenTokens, hasDemoOnlyGate, hasHonestServiceWorkerErrors, scanProductionTruth };
