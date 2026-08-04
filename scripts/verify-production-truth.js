const fs = require('fs');
const path = require('path');

const root = process.cwd();
const forbidden = [
  'getDemoCompareResults',
  'getDemoLeaderboard',
  'getDemoCommDeals',
  'getDemoReport',
  'getDemoScanResult',
  'getDemoWishlist',
  'getDemoAchievements',
  'generateSimulatedHistory',
  'localAnalyzeDeal',
  'Analyse locale',
  'MacBook Air M3',
  'PS5 Slim',
  'Nike Air Max 270',
  'Compte supprimé localement',
  'Deal soumis (vérification en cours)',
  'Alerte enregistrée pour',
];

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

  for (const token of forbidden) {
    if (combined.includes(token)) failures.push(`forbidden production token: ${token}`);
  }

  if (/Math\.floor\(Math\.random\(\)\s*\*\s*58/.test(combined)) failures.push('random verification duration remains');
  if (/(?:vote|votes|score|popularit|confirmation|\bup\b|\bdown\b)[^;\n]{0,180}Math\.random|Math\.random[^;\n]{0,180}(?:vote|votes|score|popularit|confirmation|\bup\b|\bdown\b)/i.test(combined)) {
    failures.push('random vote, score, confirmation or popularity fallback remains');
  }
  if (/const\s+STORE_TRUST(?:_V3)?\s*=\s*\{\s*['"]/.test(combined)) failures.push('local merchant scores remain');
  if (/\b(?:novadeal_score|merchant_trust_score|score)\b[^\n;]{0,120}(?:\|\||\?\?)\s*(?:50|75|82)\b/.test(combined)) {
    failures.push('arbitrary displayed score fallback remains');
  }
  if (/Score NovaDeal™\s+\$\{(?:deal|d)\.novadeal_score\}\/100/.test(combined)) {
    failures.push('an absent score can still be rendered as undefined/100');
  }
  if (!html.includes('function ui00ScoreLabel(value)')) failures.push('explicit unavailable score formatter is missing');
  if (/let\s+rem\s*=\s*3600|dyn_timer_/.test(combined)) failures.push('synthetic flash timer remains');
  if (/\bLIVE\b/.test(combined)) failures.push('unqualified LIVE label remains');
  if (/fetchWithTimeout\(\s*(?:API\s*\+|`\$\{API\})|\bfetch\(\s*(?:API\s*\+|`\$\{API\})/.test(combined)) {
    failures.push('direct backend fetch remains outside API client');
  }
  if (/\bfetch\(\s*window\.JULVOX_RUNTIME_CONFIG\?\.backend/.test(combined)) {
    failures.push('runtime backend URL is fetched directly outside API client');
  }
  if (/\|\|\s*['"]https:\/\/[^'"]*railway\.app/.test(html)) failures.push('hard-coded Railway fallback remains in production HTML');
  if (/railway\.app/.test(client)) failures.push('API client contains a hard-coded Railway URL');
  if (!html.includes('<script src="/api-client.js"></script>')) failures.push('api-client.js is not loaded');
  if (!html.includes('<script src="/ui-00-production-truth.js" defer></script>')) failures.push('UI-00 truth layer is not loaded');
  if (!truth.includes('runConfirmedMutation')) failures.push('mutation confirmation helper is missing');
  if (!truth.includes('isConfirmedServerResult')) failures.push('server result confirmation predicate is missing');
  if (/confirm:\s*data\s*=>\s*Boolean\(data\?\.(?:message|status)/.test(truth)) {
    failures.push('mutation confirmation still accepts a generic message or status');
  }
  if (!truth.includes("data?.rgpd === true")) failures.push('account deletion lacks explicit backend confirmation');
  if (!truth.includes('subscription.unsubscribe()')) failures.push('push subscription lacks rollback after backend failure');
  if (!sw.includes('status: 503')) failures.push('service worker offline response does not expose status 503');
  if (!sw.includes('status: 504')) failures.push('service worker stale response does not expose status 504');
  if (/offline(?:_stale)?[^\n]+deals:\s*\[\]/.test(sw)) failures.push('service worker still fabricates an empty deals result');

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

module.exports = { forbidden, scanProductionTruth };
