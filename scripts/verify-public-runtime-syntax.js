const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
const CRITICAL_GLOBAL_HANDLERS = Object.freeze([
  'bnClick',
  'openFlashPage',
  'openPromosPage',
  'openTrendsPage',
  'openCommunityPage',
  'openFavPage',
  'handleSearch',
  'filterCat',
  'setSort',
  'setMinSc',
  'loadDeals',
]);

function fail(message) {
  throw new Error(`Public runtime syntax verification failed: ${message}`);
}

function extractExecutableInlineScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes) && !/type\s*=\s*["']application\/ld\+json["']/.test(attributes))
    .map(([, , source]) => source);
}

function syntaxContext(source, error) {
  const stack = String(error.stack || '');
  const match = stack.match(/inline-script-\d+\.js:(\d+)/);
  if (!match) return '';
  const lineNumber = Number.parseInt(match[1], 10);
  const lines = source.split('\n');
  const start = Math.max(1, lineNumber - 6);
  const end = Math.min(lines.length, lineNumber + 6);
  return lines
    .slice(start - 1, end)
    .map((line, offset) => `${start + offset === lineNumber ? '>' : ' '} ${String(start + offset).padStart(5, ' ')} | ${line}`)
    .join('\n');
}

function verifyPublicRuntimeSyntax(html) {
  const scripts = extractExecutableInlineScripts(html);
  if (!scripts.length) fail('no executable inline script was found');
  scripts.forEach((source, index) => {
    try {
      new vm.Script(source, { filename: `dist/index.html:inline-script-${index + 1}.js` });
    } catch (error) {
      const stackContext = String(error.stack || '')
        .split('\n')
        .slice(0, 4)
        .join('\n');
      const nearbySource = syntaxContext(source, error);
      fail(`inline script ${index + 1} does not parse: ${error.message}\n${stackContext}${nearbySource ? `\n${nearbySource}` : ''}`);
    }
  });

  const runtime = scripts.join('\n');
  for (const handler of CRITICAL_GLOBAL_HANDLERS) {
    const declaration = new RegExp(`(?:async\\s+)?function\\s+${handler}\\s*\\(`);
    if (!declaration.test(runtime)) fail(`critical mobile handler is missing: ${handler}`);
  }
  if (!/Réessayer/.test(html)) fail('the retry control is missing from the public artifact');
  return { inlineScriptCount: scripts.length, criticalHandlerCount: CRITICAL_GLOBAL_HANDLERS.length };
}

if (require.main === module) {
  if (!fs.existsSync(indexPath)) fail('dist/index.html is missing');
  const result = verifyPublicRuntimeSyntax(fs.readFileSync(indexPath, 'utf8'));
  console.log(`Public runtime syntax verified: ${result.inlineScriptCount} inline scripts, ${result.criticalHandlerCount} critical handlers.`);
}

module.exports = { CRITICAL_GLOBAL_HANDLERS, extractExecutableInlineScripts, syntaxContext, verifyPublicRuntimeSyntax };
