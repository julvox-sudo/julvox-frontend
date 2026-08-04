const HTML_MARKER = '<!-- ui-00-production-truth:applied-v3 -->';
const ENHANCEMENTS_MARKER = '/* ui-00-production-truth:applied-v3 */';

function fail(message) {
  throw new Error(`UI-00 production truth transform failed: ${message}`);
}

function countMatches(source, pattern) {
  if (typeof pattern === 'string') return source.split(pattern).length - 1;
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return [...source.matchAll(new RegExp(pattern.source, flags))].length;
}

function replaceExactly(source, pattern, replacement, label, expected = 1) {
  const count = countMatches(source, pattern);
  if (count !== expected) fail(`expected exactly ${expected} ${label}, found ${count}`);
  return source.replace(pattern, replacement);
}

function replaceAtLeast(source, pattern, replacement, label, minimum = 1) {
  const count = countMatches(source, pattern);
  if (count < minimum) fail(`expected at least ${minimum} ${label}, found ${count}`);
  return source.replace(pattern, replacement);
}

function findMatchingBrace(source, openingIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openingIndex; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) { if (character === '\n') lineComment = false; continue; }
    if (blockComment) { if (character === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (character === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (character === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function namedFunctionSpans(source, name) {
  const expression = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, 'g');
  const matches = [...source.matchAll(expression)];
  return matches.map(match => {
    const braceStart = source.indexOf('{', match.index + match[0].length);
    const braceEnd = findMatchingBrace(source, braceStart);
    if (braceStart < 0 || braceEnd < 0) fail(`function ${name} is not balanced`);
    return { start: match.index, end: braceEnd + 1 };
  });
}

function replaceNamedFunctions(source, name, replacement, expectedCount) {
  const spans = namedFunctionSpans(source, name);
  if (spans.length !== expectedCount) fail(`expected exactly ${expectedCount} function ${name}, found ${spans.length}`);
  let output = source;
  for (const span of spans.slice().reverse()) {
    output = `${output.slice(0, span.start)}${replacement}${output.slice(span.end)}`;
  }
  return output;
}

function replaceNamedFunction(source, name, replacement, required = true) {
  const spans = namedFunctionSpans(source, name);
  if (!required && spans.length === 0) return source;
  if (spans.length !== 1) fail(`expected exactly one function ${name}, found ${spans.length}`);
  return `${source.slice(0, spans[0].start)}${replacement}${source.slice(spans[0].end)}`;
}

function replaceObjectDeclaration(source, name, replacement) {
  const expression = new RegExp(`const\\s+${name}\\s*=\\s*\\{`);
  const matches = [...source.matchAll(new RegExp(expression.source, 'g'))];
  if (matches.length !== 1) fail(`expected exactly one object declaration ${name}, found ${matches.length}`);
  const match = matches[0];
  const braceStart = source.indexOf('{', match.index);
  const braceEnd = findMatchingBrace(source, braceStart);
  if (braceEnd < 0) fail(`object declaration ${name} is not balanced`);
  let end = braceEnd + 1;
  if (source[end] === ';') end += 1;
  return `${source.slice(0, match.index)}${replacement}${source.slice(end)}`;
}

function removeBetween(source, start, end, label) {
  const startCount = countMatches(source, start);
  const endCount = countMatches(source, end);
  if (startCount !== 1 || endCount < 1) fail(`cannot locate unique ${label}`);
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  if (endIndex < 0) fail(`cannot locate end of ${label}`);
  return `${source.slice(0, startIndex)}${source.slice(endIndex + end.length)}`;
}

function renderLoadFailureCode(elementName, message, retryExpression) {
  return `if (${elementName}?.dataset?.ui00Confirmed === 'true') {
    window.JULVOX_PRODUCTION_TRUTH.renderPreservedError(${elementName}, ${JSON.stringify(message)}, ${retryExpression});
  } else {
    window.JULVOX_PRODUCTION_TRUTH.renderState(${elementName}, 'error', ${JSON.stringify(message)}, ${retryExpression});
  }`;
}

function verifyAppliedOutput(html, enhancements) {
  const requiredScripts = [
    '<script src="/runtime-config.js"></script>',
    '<script src="/api-client.js"></script>',
    '<script src="/ui-00-production-truth.js" defer></script>',
    '<script src="/enhancements_v3.js" defer></script>',
  ];
  const positions = requiredScripts.map(script => {
    if (countMatches(html, script) !== 1) fail(`required script must appear exactly once: ${script}`);
    return html.indexOf(script);
  });
  if (!positions.every((value, index) => index === 0 || positions[index - 1] < value)) {
    fail('runtime, API client, UI-00 truth and enhancements scripts are not loaded in the required order');
  }
  const forbidden = [
    'getDemoWishlist', 'generateSimulatedHistory', 'getLocalCalendar', 'getDefaultProPlans',
    'getLocalAIResponse', 'getDefaultCbRates', 'fetchWithTimeout', 'fetchWithRetry',
    'julien...', 'marie...', 'thomas...', 'chloe...', 'alex...',
    'Offline demo', 'MacBook Air M3', 'PS5 Slim', 'Nike Air Max 270',
  ];
  for (const token of forbidden) if (html.includes(token)) fail(`forbidden production residue: ${token}`);
  if (/\bfetch\(\s*(?:API\s*\+|`\$\{API\}|url\s*,\s*token)/.test(html)) fail('direct backend fetch remains');
  if (/>\s*Live\s*</i.test(html) || /['\"`]LIVE['\"`]/.test(html) || /temps réel|vérifié il y a/i.test(html)) fail('unqualified real-time wording remains');
  if (/\b(?:timer|timerSec|rem)\s*=\s*[^;\n]*(?:\|\||\?\?)[^;\n]*(?:3600|7200)\b/.test(html)) fail('synthetic countdown fallback remains');
  if (!html.includes(HTML_MARKER) || !enhancements.includes(ENHANCEMENTS_MARKER)) fail('transformation markers are missing');
  if (!enhancements.includes("window.JULVOX_API.get('/deals/trending?limit=8'")) fail('enhancements API loading is not centralized');
  return { html, enhancements };
}
module.exports = {
  HTML_MARKER,
  ENHANCEMENTS_MARKER,
  fail,
  countMatches,
  replaceExactly,
  replaceAtLeast,
  findMatchingBrace,
  replaceNamedFunction,
  replaceNamedFunctions,
  replaceObjectDeclaration,
  removeBetween,
  renderLoadFailureCode,
  verifyAppliedOutput,
};
