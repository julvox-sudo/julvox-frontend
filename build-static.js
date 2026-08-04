const fs = require('fs');
const path = require('path');
const { loadPublicArtifactManifest, resolveWithinRoot } = require('./scripts/public-artifact-utils');

const root = process.cwd();
const out = path.join(root, 'dist');

function copyPublicFile(relativePath) {
  const source = resolveWithinRoot(root, relativePath);
  const destination = path.join(out, ...relativePath.split('/'));
  if (!fs.existsSync(source)) throw new Error(`Cannot build public artifact: whitelisted source is missing: ${relativePath}`);
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`Cannot build public artifact: symbolic links are forbidden: ${relativePath}`);
  if (!stat.isFile()) throw new Error(`Cannot build public artifact: whitelisted source is not a file: ${relativePath}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function readRuntimeContract() {
  return JSON.parse(fs.readFileSync(path.join(root, 'config', 'runtime-contract.json'), 'utf8'));
}

function replaceExactlyOnce(text, legacy, configured, label) {
  const occurrences = text.split(legacy).length - 1;
  if (occurrences !== 1) throw new Error(`Cannot integrate runtime config: expected exactly one ${label}, found ${occurrences}`);
  return text.replace(legacy, configured);
}

function replaceAllRequired(text, legacy, configured, label) {
  const occurrences = text.split(legacy).length - 1;
  if (occurrences < 1) throw new Error(`Cannot integrate runtime config: expected at least one ${label}, found ${occurrences}`);
  return text.split(legacy).join(configured);
}

function readHttpUrl(value, label) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`Cannot integrate runtime config: ${label} must be a credential-free HTTP(S) origin/path without query or fragment`);
  }
  return parsed;
}

function integrateRuntimeConfig() {
  const indexPath = path.join(out, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  const contract = readRuntimeContract();
  const publicUrl = readHttpUrl(contract.application.public_base_url, 'application.public_base_url');
  const publicBaseUrl = publicUrl.origin;
  const headClose = '</head>';
  const runtimeScript = '<script src="/runtime-config.js"></script>';
  const legacyApi = "const API = 'https://julvox-dealscan-backend-production.up.railway.app';";
  const configuredApi = "const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';";
  const legacyDnsPrefetch = '<link rel="dns-prefetch" href="https://julvox-dealscan-backend-production.up.railway.app"/>';
  const configuredDnsPrefetch = `<!-- runtime-contract:backend.api_base_url -->\n<link rel="dns-prefetch" href="${contract.backend.api_base_url}"/>`;
  const legacyPreconnect = '<link rel="preconnect" href="https://julvox-dealscan-backend-production.up.railway.app" crossorigin/>';
  const configuredPreconnect = `<link rel="preconnect" href="${contract.backend.api_base_url}" crossorigin/>`;
  const legacyManifest = '<link rel="manifest" href="/manifest.json"/>';
  const configuredManifest = `<!-- runtime-contract:pwa.manifest_path -->\n<link rel="manifest" href="${contract.pwa.manifest_path}"/>`;
  const legacyServiceWorker = "navigator.serviceWorker.register('/sw.js?v=17', { scope: '/' })";
  const serviceWorkerUrl = `${contract.pwa.service_worker_path}?v=${contract.pwa.cache_version.replace(/^v/, '')}`;
  const configuredServiceWorker = `navigator.serviceWorker.register('${serviceWorkerUrl}', { scope: '/' }) /* runtime-contract:pwa.service_worker_path+pwa.cache_version */`;
  const legacyEnhancementsScript = '<script src="/enhancements_v3.js" defer></script>';
  const enhancementsScriptPath = contract.runtime.enhancements_script.startsWith('/') ? contract.runtime.enhancements_script : `/${contract.runtime.enhancements_script}`;
  const configuredEnhancementsScript = `<!-- runtime-contract:runtime.enhancements_script -->\n<script src="${enhancementsScriptPath}" defer></script>`;

  if (!html.includes(headClose)) throw new Error('Cannot integrate runtime config: index.html has no </head> marker');
  if (html.includes(runtimeScript)) throw new Error('Cannot integrate runtime config: script is already present in source index.html');
  html = replaceExactlyOnce(html, legacyApi, configuredApi, 'legacy API declaration');
  html = replaceExactlyOnce(html, legacyDnsPrefetch, configuredDnsPrefetch, 'legacy backend DNS prefetch hint');
  html = replaceExactlyOnce(html, legacyPreconnect, configuredPreconnect, 'legacy backend preconnect hint');
  html = replaceExactlyOnce(html, legacyManifest, configuredManifest, 'legacy manifest declaration');
  const registrations = html.split(legacyServiceWorker).length - 1;
  if (registrations < 1) throw new Error('Cannot integrate runtime config: no historical service worker registration found');
  html = html.split(legacyServiceWorker).join(configuredServiceWorker);
  html = replaceExactlyOnce(html, legacyEnhancementsScript, configuredEnhancementsScript, 'legacy enhancements script declaration');

  const brandReplacements = [
    ['<title>DealScan v17 — Meilleurs Deals & Promos vérifiés par NovaDeal™ | julvox.com</title>', `<!-- runtime-contract:application.name+application.tagline -->\n<title>${contract.application.name} — ${contract.application.tagline}</title>`, 'historical application title'],
    ['<meta name="description" content="DealScan analyse automatiquement des milliers de deals chaque jour. Score NovaDeal™ pour détecter les vraies promos. Alertes prix, comparateur multi-marchands, deals vérifiés sur Amazon, Fnac, Darty et 50+ marchands."/>', `<!-- runtime-contract:application.description -->\n<meta name="description" content="${contract.application.description}"/>`, 'historical SEO description'],
    ['<meta name="author" content="Julvox — DealScan"/>', `<meta name="author" content="${contract.application.name}"/>`, 'historical author metadata'],
    ['<meta property="og:title" content="DealScan — Deals vérifiés par NovaDeal™"/>', `<meta property="og:title" content="${contract.application.name} — ${contract.application.tagline}"/>`, 'historical Open Graph title'],
    ['<meta property="og:description" content="Des milliers de deals analysés chaque jour. Score de confiance NovaDeal™, alertes prix automatiques, détection fausses promos."/>', `<meta property="og:description" content="${contract.application.description}"/>`, 'historical Open Graph description'],
    ['<meta property="og:site_name" content="DealScan by Julvox"/>', `<meta property="og:site_name" content="${contract.application.name}"/>`, 'historical Open Graph site name'],
    ['<meta name="twitter:title" content="DealScan — Deals vérifiés NovaDeal™"/>', `<meta name="twitter:title" content="${contract.application.name} — ${contract.application.tagline}"/>`, 'historical Twitter title'],
    ['<meta name="twitter:description" content="Analyse automatique de milliers de deals. Détection fausses promos. Alertes prix gratuites."/>', `<meta name="twitter:description" content="${contract.application.description}"/>`, 'historical Twitter description'],
    ['<meta name="apple-mobile-web-app-title" content="DealScan"/>', `<meta name="apple-mobile-web-app-title" content="${contract.application.name}"/>`, 'historical Apple application title'],
  ];
  for (const [legacy, configured, label] of brandReplacements) html = replaceExactlyOnce(html, legacy, configured, label);
  html = replaceAllRequired(html, '  "name": "DealScan by Julvox",', `  "name": "${contract.application.name}",`, 'historical structured-data website name');
  html = replaceAllRequired(html, '  "description": "Agrégateur de deals et promotions avec score de confiance NovaDeal™",', `  "description": "${contract.application.description}",`, 'historical structured-data description');

  const headEndIndex = html.indexOf(headClose);
  let head = html.slice(0, headEndIndex);
  const bodyAndClose = html.slice(headEndIndex);
  const historicalPublicOrigin = 'https://julvox.com';
  if (head.split(historicalPublicOrigin).length - 1 < 1) throw new Error('Cannot integrate public origin: no historical public URL found in document head');
  head = head.split(historicalPublicOrigin).join(publicBaseUrl);
  head = `<!-- runtime-contract:application.public_base_url -->\n${head}`;
  html = `${head}${bodyAndClose}`.replace(headClose, `${runtimeScript}\n${headClose}`);
  fs.writeFileSync(indexPath, html);
}

function integrateManifestIdentity() {
  const manifestPath = path.join(out, 'manifest.json');
  const contract = readRuntimeContract();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const historical = {
    name: 'DealScan — Deals vérifiés NovaDeal™',
    short_name: 'DealScan',
    description: 'Les meilleures promos analysées automatiquement. Score NovaDeal™ anti-fausses-promos.',
    screenshot_label: 'DealScan — Feed des meilleurs deals',
  };
  if (manifest.name !== historical.name) throw new Error('Cannot integrate manifest identity: historical name changed');
  if (manifest.short_name !== historical.short_name) throw new Error('Cannot integrate manifest identity: historical short_name changed');
  if (manifest.description !== historical.description) throw new Error('Cannot integrate manifest identity: historical description changed');
  if (!Array.isArray(manifest.screenshots) || manifest.screenshots[0]?.label !== historical.screenshot_label) throw new Error('Cannot integrate manifest identity: historical primary screenshot label changed');
  manifest.name = `${contract.application.name} — ${contract.application.tagline}`;
  manifest.short_name = contract.application.name;
  manifest.description = contract.application.description;
  manifest.screenshots[0].label = `${contract.application.name} — ${contract.application.tagline}`;
  manifest._runtime_contract = 'application.name+application.tagline+application.description';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function integrateServiceWorkerRuntime() {
  const serviceWorkerPath = path.join(out, 'sw.js');
  let serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
  const contract = readRuntimeContract();
  const backendOrigin = readHttpUrl(contract.backend.api_base_url, 'backend.api_base_url').origin;
  const publicOrigin = readHttpUrl(contract.application.public_base_url, 'application.public_base_url').origin;
  serviceWorker = replaceExactlyOnce(
    serviceWorker,
    "const BACKEND_ORIGIN = 'https://julvox-dealscan-backend-production.up.railway.app';",
    `const BACKEND_ORIGIN = '${backendOrigin}'; /* runtime-contract:backend.api_base_url */`,
    'service worker backend origin',
  );
  serviceWorker = replaceExactlyOnce(
    serviceWorker,
    "const PUBLIC_ORIGIN = 'https://julvox.com';",
    `const PUBLIC_ORIGIN = '${publicOrigin}'; /* runtime-contract:application.public_base_url */`,
    'service worker public origin',
  );
  fs.writeFileSync(serviceWorkerPath, serviceWorker);
}

const publicManifest = loadPublicArtifactManifest(root, { expectedFileCount: 17 });
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const entry of publicManifest.files) copyPublicFile(entry.path);
integrateRuntimeConfig();
integrateManifestIdentity();
integrateServiceWorkerRuntime();
console.log(`Static build complete: dist/ (${publicManifest.files.length} whitelisted files)`);
