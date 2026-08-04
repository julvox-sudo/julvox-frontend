const fs = require('fs');
const path = require('path');
const {
  REFERENCE_REPORT_RELATIVE_PATH,
  normalizePublicPath,
  writeJsonDeterministic,
} = require('./public-artifact-utils');

const root = process.cwd();
const dist = path.join(root, 'dist');
const failures = [];
const report = {
  schema_version: 1,
  index_html: {
    local_files: [],
    external_urls: [],
    anchors: [],
    application_routes: [],
    mailto: [],
    data_urls: [],
    cdn_cgi_routes: [],
    other_schemes: [],
  },
  manifest_resources: [],
  service_worker_precache: {
    local_files: [],
    external_urls: [],
  },
  service_worker_fallbacks: [],
  known_preexisting_anomalies: [],
};

function fail(message) {
  failures.push(message);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'en'));
}

function cleanLocalReference(reference) {
  const clean = reference.split(/[?#]/, 1)[0].replace(/^\.\//, '').replace(/^\//, '');
  if (!clean) return null;
  return normalizePublicPath(clean);
}

function requireDistFile(reference, label) {
  let relativePath;
  try {
    relativePath = cleanLocalReference(reference);
  } catch (error) {
    fail(`${label} has an unsafe local reference ${reference}: ${error.message}`);
    return null;
  }
  if (!relativePath) return null;
  const absolute = path.join(dist, ...relativePath.split('/'));
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    fail(`${label} references a missing public file: ${reference}`);
  }
  return relativePath;
}

function isDynamicReference(value) {
  return value.includes('${') || value.includes('{{') || value.includes('<%');
}

function classifyIndexReference(reference, label = 'dist/index.html') {
  const value = reference.trim();
  if (!value) return;
  if (value.startsWith('#')) report.index_html.anchors.push(value);
  else if (value.startsWith('mailto:')) report.index_html.mailto.push(value);
  else if (value.startsWith('data:')) report.index_html.data_urls.push(value.slice(0, 64));
  else if (value.startsWith('/cdn-cgi/')) report.index_html.cdn_cgi_routes.push(value);
  else if (/^(?:https?:)?\/\//i.test(value)) report.index_html.external_urls.push(value);
  else if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) report.index_html.other_schemes.push(value);
  else if (isDynamicReference(value) || value === '/' || value.startsWith('/?') || value.startsWith('?')) {
    report.index_html.application_routes.push(value);
  } else {
    const relativePath = requireDistFile(value, label);
    if (relativePath) report.index_html.local_files.push(relativePath);
  }
}

function classifySrcset(value, label) {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (trimmed.startsWith('data:')) {
    classifyIndexReference(trimmed, label);
    return;
  }
  for (const candidate of trimmed.split(',')) {
    const reference = candidate.trim().split(/\s+/, 1)[0];
    if (reference) classifyIndexReference(reference, label);
  }
}

function inspectCssReferences(cssText, label) {
  const urlPattern = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
  let match;
  while ((match = urlPattern.exec(cssText)) !== null) classifyIndexReference(match[2], label);

  const importPattern = /@import\s+(?!url\()["']([^"']+)["']/gi;
  while ((match = importPattern.exec(cssText)) !== null) classifyIndexReference(match[1], label);
}

function inspectJsonLd(indexHtml) {
  const scriptPattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptPattern.exec(indexHtml)) !== null) {
    let document;
    try {
      document = JSON.parse(match[1]);
    } catch (error) {
      fail(`dist/index.html contains invalid JSON-LD: ${error.message}`);
      continue;
    }

    function visit(value, key = '') {
      if (Array.isArray(value)) {
        for (const item of value) visit(item, key);
        return;
      }
      if (value && typeof value === 'object') {
        for (const [childKey, childValue] of Object.entries(value)) visit(childValue, childKey);
        return;
      }
      if (key === 'logo' && typeof value === 'string' && /\/logo\.png(?:[?#]|$)/i.test(value)) {
        report.known_preexisting_anomalies.push(
          `${value} — pre-existing JSON-LD logo reference outside QUALITY-01A; no local artifact is asserted`,
        );
      }
    }
    visit(document);
  }
}

for (const required of ['index.html', 'manifest.json', 'sw.js']) {
  if (!fs.existsSync(path.join(dist, required))) fail(`dist/${required} is missing`);
}

if (failures.length === 0) {
  const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const attributePattern = /(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = attributePattern.exec(indexHtml)) !== null) classifyIndexReference(match[1]);

  const srcsetPattern = /(?:srcset|imagesrcset)\s*=\s*["']([^"']+)["']/gi;
  while ((match = srcsetPattern.exec(indexHtml)) !== null) classifySrcset(match[1], 'dist/index.html srcset');

  const styleBlockPattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  while ((match = styleBlockPattern.exec(indexHtml)) !== null) inspectCssReferences(match[1], 'dist/index.html style block');

  const styleAttributePattern = /\bstyle\s*=\s*["']([^"']+)["']/gi;
  while ((match = styleAttributePattern.exec(indexHtml)) !== null) inspectCssReferences(match[1], 'dist/index.html style attribute');

  const serviceWorkerRegistrationPattern = /navigator\.serviceWorker\.register\s*\(\s*["']([^"']+)["']/g;
  while ((match = serviceWorkerRegistrationPattern.exec(indexHtml)) !== null) {
    const relativePath = requireDistFile(match[1], 'dist/index.html service worker registration');
    if (relativePath) report.index_html.local_files.push(relativePath);
  }

  inspectJsonLd(indexHtml);

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
  } catch (error) {
    fail(`dist/manifest.json is invalid JSON: ${error.message}`);
  }

  if (manifest) {
    const resources = [];
    for (const icon of manifest.icons || []) resources.push(['manifest icon', icon?.src]);
    for (const shortcut of manifest.shortcuts || []) {
      for (const icon of shortcut?.icons || []) resources.push(['manifest shortcut icon', icon?.src]);
    }
    for (const screenshot of manifest.screenshots || []) resources.push(['manifest screenshot', screenshot?.src]);

    for (const [label, reference] of resources) {
      if (typeof reference !== 'string' || !reference.trim()) {
        fail(`${label} has no src`);
        continue;
      }
      const relativePath = requireDistFile(reference, label);
      if (relativePath) report.manifest_resources.push(relativePath);
    }
  }

  const serviceWorker = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
  const staticAssetsMatch = serviceWorker.match(/const\s+STATIC_ASSETS\s*=\s*\[([\s\S]*?)\];/);
  if (!staticAssetsMatch) {
    fail('dist/sw.js does not expose a parseable STATIC_ASSETS array');
  } else {
    const stringPattern = /["']([^"']+)["']/g;
    while ((match = stringPattern.exec(staticAssetsMatch[1])) !== null) {
      const reference = match[1];
      if (/^https?:\/\//i.test(reference)) report.service_worker_precache.external_urls.push(reference);
      else {
        const relativePath = requireDistFile(reference, 'dist/sw.js STATIC_ASSETS');
        if (relativePath) report.service_worker_precache.local_files.push(relativePath);
      }
    }
  }

  const fallbackPattern = /caches\.match\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = fallbackPattern.exec(serviceWorker)) !== null) {
    const relativePath = requireDistFile(match[1], 'dist/sw.js cache fallback');
    if (relativePath) report.service_worker_fallbacks.push(relativePath);
  }
}

for (const [key, values] of Object.entries(report.index_html)) report.index_html[key] = uniqueSorted(values);
report.manifest_resources = uniqueSorted(report.manifest_resources);
report.service_worker_precache.local_files = uniqueSorted(report.service_worker_precache.local_files);
report.service_worker_precache.external_urls = uniqueSorted(report.service_worker_precache.external_urls);
report.service_worker_fallbacks = uniqueSorted(report.service_worker_fallbacks);
report.known_preexisting_anomalies = uniqueSorted(report.known_preexisting_anomalies);

if (failures.length > 0) {
  console.error('Public reference verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

writeJsonDeterministic(root, REFERENCE_REPORT_RELATIVE_PATH, report);
console.log(`Public references verified and classified in ${REFERENCE_REPORT_RELATIVE_PATH}.`);
