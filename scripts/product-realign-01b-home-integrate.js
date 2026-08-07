const fs = require('fs');
const path = require('path');
const home = require('./product-realign-01b-home.js');
const pwaInstallHardening = require('./product-realign-01b-pwa-install-hardening.js');
const pwaRefreshHardening = require('./product-realign-01b-pwa-refresh-hardening.js');
const officialBrand = require('./product-realign-01b-brand-integrate.js');
const legacyIdentityCleanup = require('./product-realign-01b-legacy-identity-cleanup.js');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error('PRODUCT-REALIGN-01B home integration failed: dist/index.html is missing');
}

const integratedHome = home.applyHomeExperience(fs.readFileSync(indexPath, 'utf8'));
fs.writeFileSync(
  indexPath,
  pwaInstallHardening.applyPwaInstallHardening(integratedHome),
  'utf8',
);

const manifestPath = path.join(root, 'dist', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = home.applyPwaStartupManifest(
    fs.readFileSync(manifestPath, 'utf8'),
  );
  manifest.screenshots = [];
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

officialBrand.integrate(root);

const serviceWorkerPath = path.join(root, 'dist', 'sw.js');
const serviceWorkerWithShell = pwaInstallHardening.applyOfflineShellToServiceWorker(
  fs.readFileSync(serviceWorkerPath, 'utf8'),
);
fs.writeFileSync(
  serviceWorkerPath,
  pwaRefreshHardening.applyOfflineRefreshHardening(serviceWorkerWithShell),
  'utf8',
);

legacyIdentityCleanup.cleanupPublicIdentity(root);

console.log(
  'PRODUCT-REALIGN-01B locked home, HOTFIX-05 startup, PWA install/offline refresh hardening, official A2.2 brand and legacy identity cleanup integrated into dist.',
);
