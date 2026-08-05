const { findMatchingBrace } = require('./utils');

function fail(message) {
  throw new Error(`UI-00 production truth transform failed: ${message}`);
}

function canStartRegexLiteral(source, slashIndex) {
  let index = slashIndex - 1;
  while (index >= 0 && /\s/u.test(source[index])) index -= 1;
  if (index < 0) return true;
  if (/[(\[{,:;=!?&|+*%^~<>-]/u.test(source[index])) return true;
  const prefix = source.slice(Math.max(0, index - 24), index + 1);
  return /\b(?:return|case|throw|delete|void|typeof|instanceof|in|of|yield|await|new)$/u.test(prefix);
}

function findMatchingParenthesis(source, openingIndex) {
  let parenDepth = 0;
  let braceDepth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let regexLiteral = false;
  let regexClass = false;
  let templateText = false;
  const templateReturnDepths = [];

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
    if (regexLiteral) {
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if (character === '[') { regexClass = true; continue; }
      if (character === ']' && regexClass) { regexClass = false; continue; }
      if (character === '/' && !regexClass) regexLiteral = false;
      continue;
    }
    if (templateText) {
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if (character === '`') { templateText = false; continue; }
      if (character === '$' && next === '{') {
        templateReturnDepths.push(braceDepth);
        braceDepth += 1;
        templateText = false;
        index += 1;
      }
      continue;
    }

    if (character === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (character === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (character === '/' && canStartRegexLiteral(source, index)) { regexLiteral = true; regexClass = false; continue; }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === '`') { templateText = true; continue; }
    if (character === '{') braceDepth += 1;
    if (character === '}') {
      braceDepth -= 1;
      if (templateReturnDepths.length && braceDepth === templateReturnDepths[templateReturnDepths.length - 1]) {
        templateReturnDepths.pop();
        templateText = true;
      }
      continue;
    }
    if (character === '(') parenDepth += 1;
    if (character === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) return index;
    }
  }
  return -1;
}

function findNextCodeCharacter(source, startIndex) {
  for (let index = startIndex; index < source.length; index += 1) {
    if (/\s/u.test(source[index])) continue;
    if (source[index] === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      if (newline < 0) return -1;
      index = newline;
      continue;
    }
    if (source[index] === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      if (close < 0) return -1;
      index = close + 1;
      continue;
    }
    return index;
  }
  return -1;
}

function namedFunctionSpans(source, name) {
  const expression = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, 'g');
  return [...source.matchAll(expression)].map(match => {
    const parameterStart = source.lastIndexOf('(', match.index + match[0].length - 1);
    const parameterEnd = findMatchingParenthesis(source, parameterStart);
    const braceStart = findNextCodeCharacter(source, parameterEnd + 1);
    const braceEnd = findMatchingBrace(source, braceStart);
    if (parameterStart < 0 || parameterEnd < 0 || braceStart < 0 || source[braceStart] !== '{' || braceEnd < 0) {
      fail(`function ${name} is not balanced`);
    }
    return { start: match.index, end: braceEnd + 1 };
  });
}

function replaceNamedFunctions(source, name, replacement, expectedCount) {
  const spans = namedFunctionSpans(source, name);
  if (spans.length !== expectedCount) fail(`expected exactly ${expectedCount} function ${name}, found ${spans.length}`);
  let output = source;
  for (const span of spans.slice().reverse()) output = `${output.slice(0, span.start)}${replacement}${output.slice(span.end)}`;
  return output;
}

function replaceNamedFunction(source, name, replacement, required = true) {
  const spans = namedFunctionSpans(source, name);
  if (!required && spans.length === 0) return source;
  if (spans.length !== 1) fail(`expected exactly one function ${name}, found ${spans.length}`);
  return `${source.slice(0, spans[0].start)}${replacement}${source.slice(spans[0].end)}`;
}

module.exports = { findMatchingParenthesis, namedFunctionSpans, replaceNamedFunction, replaceNamedFunctions };
