const fs = require('fs');
const path = require('path');

const root = process.cwd();
const out = path.join(root, 'dist');
const exclude = new Set(['dist', '.git', '.github', 'node_modules']);
const excludeFiles = new Set(['package-lock.json']);

function copy(src, dest) {
  const name = path.basename(src);
  if (exclude.has(name) || excludeFiles.has(name)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) copy(path.join(src, entry), path.join(dest, entry));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function readRuntimeContract() {
  const contractPath = path.join(root, 'config', 'runtime-contract.json');
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

function integrateRuntimeConfig() {
  const indexPath = path.join(out, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  const contract = readRuntimeContract();

  const headClose = '</head>';
  const runtimeScript = '<script src="/runtime-config.js"></script>';
  const legacyApi = "const API = 'https://julvox-dealscan-backend-production.up.railway.app';";
  const configuredApi = "const API = window.JULVOX_RUNTIME_CONFIG?.backend?.api_base_url || 'https://julvox-dealscan-backend-production.up.railway.app';";
  const legacyManifest = '<link rel="manifest" href="/manifest.json"/>';
  const configuredManifest = `<!-- runtime-contract:pwa.manifest_path -->\n<link rel="manifest" href="${contract.pwa.manifest_path}"/>`;

  if (!html.includes(headClose)) throw new Error('Cannot integrate runtime config: index.html has no </head> marker');
  if (html.includes(runtimeScript)) throw new Error('Cannot integrate runtime config: script is already present in source index.html');

  const apiOccurrences = html.split(legacyApi).length - 1;
  if (apiOccurrences !== 1) {
    throw new Error(`Cannot integrate runtime config: expected exactly one legacy API declaration, found ${apiOccurrences}`);
  }

  const manifestOccurrences = html.split(legacyManifest).length - 1;
  if (manifestOccurrences !== 1) {
    throw new Error(`Cannot integrate runtime config: expected exactly one legacy manifest declaration, found ${manifestOccurrences}`);
  }

  html = html.replace(headClose, `${runtimeScript}\n${headClose}`);
  html = html.replace(legacyApi, configuredApi);
  html = html.replace(legacyManifest, configuredManifest);
  fs.writeFileSync(indexPath, html);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const entry of fs.readdirSync(root)) copy(path.join(root, entry), path.join(out, entry));
integrateRuntimeConfig();
console.log('Static build complete: dist/');