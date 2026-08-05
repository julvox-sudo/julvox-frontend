const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

const contractText = read('config/runtime-contract.json');
const indexHtml = read('dist/index.html');
const serviceWorker = read('dist/sw.js');

let contract;
try {
  contract = JSON.parse(contractText);
} catch (error) {
  fail(`config/runtime-contract.json is not valid JSON: ${error.message}`);
}

if (contract) {
  const configured = contract.application?.public_base_url;
  if (typeof configured !== 'string' || !configured.trim()) {
    fail('Runtime contract is missing application.public_base_url');
  } else {
    let parsed;
    try {
      parsed = new URL(configured);
    } catch (error) {
      fail(`application.public_base_url is not a valid URL: ${error.message}`);
    }

    if (parsed) {
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        fail('application.public_base_url must use HTTP or HTTPS');
      }
      if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
        fail('application.public_base_url must be an origin without path, query or fragment');
      }

      const origin = parsed.origin;
      const head = indexHtml.split('</head>')[0];
      if (!head.includes('runtime-contract:application.public_base_url')) {
        fail('dist/index.html has no public origin traceability marker');
      }
      if (!head.includes(origin)) {
        fail('dist/index.html does not consume application.public_base_url');
      }

      if (!serviceWorker.includes(`const PUBLIC_ORIGIN = '${origin}'; /* runtime-contract:application.public_base_url */`)) {
        fail('dist/sw.js does not define PUBLIC_ORIGIN from application.public_base_url');
      }

      const publicOriginConsumers = [
        ['safe URL base', /new URL\([^,\n]+,\s*PUBLIC_ORIGIN\)/],
        ['notification URL sanitization', /safePublicUrl\([^)]*\.url\)/],
        ['deal navigation URL', /`\$\{PUBLIC_ORIGIN\}\/\?deal=\$\{encodeURIComponent\([^)]*\.dealId\)\}`/],
        ['existing client origin guard', /\.url\.startsWith\(PUBLIC_ORIGIN\)/],
      ];
      for (const [label, pattern] of publicOriginConsumers) {
        if (!pattern.test(serviceWorker)) fail(`dist/sw.js is missing public origin consumption: ${label}`);
      }

      const historicalLiteral = 'https://julvox.com';
      const allowedDeclaration = `const PUBLIC_ORIGIN = '${origin}';`;
      const withoutDeclaration = serviceWorker.replace(allowedDeclaration, '');
      if (withoutDeclaration.includes(historicalLiteral)) {
        fail('dist/sw.js still contains an uncontractualized historical public URL');
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Public origin contract consumption verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Public origin contract consumption verification passed.');
