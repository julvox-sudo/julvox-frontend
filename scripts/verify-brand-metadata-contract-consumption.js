const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'runtime-contract.json'), 'utf8'));
const sourceHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const distHtml = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');

function headOf(html, label) {
  const headClose = html.indexOf('</head>');
  if (headClose === -1) throw new Error(`${label} has no </head> marker.`);
  return html.slice(0, headClose);
}

const sourceHead = headOf(sourceHtml, 'Source index.html');
const distHead = headOf(distHtml, 'Built index.html');
const { name, tagline, description } = contract.application;

const exactExpected = [
  `<meta name="description" content="${description}"/>`,
  `<meta name="author" content="${name}"/>`,
  `<meta property="og:title" content="${name} — ${tagline}"/>`,
  `<meta property="og:description" content="${description}"/>`,
  `<meta property="og:site_name" content="${name}"/>`,
  `<meta name="twitter:title" content="${name} — ${tagline}"/>`,
  `<meta name="twitter:description" content="${description}"/>`,
  `<meta name="apple-mobile-web-app-title" content="${name}"/>`,
];

const structuredExpected = [
  `  "name": "${name}",`,
  `  "description": "${description}",`,
];

const legacyValues = [
  'DealScan analyse automatiquement des milliers de deals chaque jour.',
  'DealScan — Deals vérifiés par NovaDeal™',
  'DealScan by Julvox',
  'Analyse automatique de milliers de deals.',
  'Agrégateur de deals et promotions avec score de confiance NovaDeal™',
];

const errors = [];

for (const field of ['name', 'tagline', 'description']) {
  if (typeof contract.application?.[field] !== 'string' || !contract.application[field].trim()) {
    errors.push(`Runtime contract is missing application.${field}.`);
  }
}

for (const fragment of exactExpected) {
  const occurrences = distHead.split(fragment).length - 1;
  if (occurrences !== 1) {
    errors.push(`Built index.html head must contain exactly one expected brand metadata fragment: ${fragment}`);
  }
}

for (const fragment of structuredExpected) {
  const occurrences = distHead.split(fragment).length - 1;
  if (occurrences < 1) {
    errors.push(`Built index.html structured data must contain the expected brand fragment: ${fragment}`);
  }
}

for (const legacyValue of legacyValues) {
  if (!sourceHead.includes(legacyValue)) {
    errors.push(`Source index.html head must preserve the historical value used by the migration: ${legacyValue}`);
  }
  if (distHead.includes(legacyValue)) {
    errors.push(`Built index.html head still contains historical brand metadata: ${legacyValue}`);
  }
}

const markerOccurrences = distHead.split('runtime-contract:application.description').length - 1;
if (markerOccurrences !== 1) {
  errors.push(`Brand metadata trace marker must appear exactly once, found ${markerOccurrences}.`);
}

if (errors.length) {
  console.error('Brand metadata contract consumption verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Brand metadata contract consumption verified for ${name}.`);
