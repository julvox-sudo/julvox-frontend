'use strict';

function normalizeNumericScore(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 100 ? numeric : null;
}

function resolveNumericScore(...values) {
  for (const value of values) {
    const numeric = normalizeNumericScore(value);
    if (numeric !== null) return numeric;
  }
  return null;
}

function scoreSortValue(...values) {
  const numeric = resolveNumericScore(...values);
  return numeric === null ? Number.NEGATIVE_INFINITY : numeric;
}

const RUNTIME_HELPERS = `function ui00NumericScore(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}
function ui00ResolveScore(...values) {
  for (const value of values) {
    const score = ui00NumericScore(value);
    if (score !== null) return score;
  }
  return null;
}
function ui00ScoreSortValue(...values) {
  const score = ui00ResolveScore(...values);
  return score === null ? Number.NEGATIVE_INFINITY : score;
}`;

const SCORE_LIKE = /(?:score|rating|quality|trust|confidence)/i;
const INTERFACE_ONLY = /(?:filters?|preferences?|threshold|min(?:imum)?|max(?:imum)?)/i;
const COUNTER_LIKE = /(?:votes?|count|total|price|duration|timer|page|limit)/i;

function normalizeScoreFallbacks(source) {
  let output = source;

  // A missing score sorts after every valid 0–100 score without becoming a displayed score.
  output = output.replace(
    /\((\w+)\.novadeal_score\s*\|\|\s*0\)\s*-\s*\((\w+)\.novadeal_score\s*\|\|\s*0\)/g,
    (_, left, right) => `ui00ScoreSortValue(${left}.novadeal_score, ${left}.score)-ui00ScoreSortValue(${right}.novadeal_score, ${right}.score)`,
  );

  // Backend NovaDeal score has priority. Invalid first candidates do not hide a valid second score.
  output = output.replace(
    /\(\s*(deal|d)\.novadeal_score\s*(?:\|\||\?\?)\s*\1\.score\s*\)\s*(?:\|\||\?\?)\s*(?:0|50|75|82)\b/g,
    (_, ref) => `ui00ResolveScore(${ref}.novadeal_score, ${ref}.score)`,
  );
  output = output.replace(
    /\b(deal|d)\.novadeal_score\s*(?:\|\||\?\?)\s*\1\.score\s*(?:\|\||\?\?)\s*(?:0|50|75|82)\b/g,
    (_, ref) => `ui00ResolveScore(${ref}.novadeal_score, ${ref}.score)`,
  );
  output = output.replace(
    /\b(deal|d)\.score\s*(?:\|\||\?\?)\s*\1\.novadeal_score\s*(?:\|\||\?\?)\s*(?:0|50|75|82)\b/g,
    (_, ref) => `ui00ResolveScore(${ref}.novadeal_score, ${ref}.score)`,
  );

  const propertyAccess = String.raw`([A-Za-z_$][\w$]*(?:\[[^\]\n]+\])?(?:\?\.)?\.([A-Za-z_$][\w$]*))`;
  output = output.replace(
    new RegExp(`${propertyAccess}\\s*(?:\\|\\||\\?\\?)\\s*(?:0|50|75|82)\\b`, 'gi'),
    (match, access, property) => SCORE_LIKE.test(property) && !INTERFACE_ONLY.test(property) && !COUNTER_LIKE.test(property)
      ? `ui00ResolveScore(${access})`
      : match,
  );
  output = output.replace(
    /(STORE_TRUST(?:_V3)?\[[^\]\n]+\])\s*(?:\|\||\?\?)\s*(?:0|50|75|82)\b/g,
    'ui00ResolveScore($1)',
  );

  return output;
}

function findArbitraryScoreFallbacks(source) {
  const findings = [];
  const statements = String(source).split(/[;\n]/);
  const numericFallback = /(?:\|\||\?\?)\s*-?\d+(?:\.\d+)?\b/g;

  for (const statement of statements) {
    numericFallback.lastIndex = 0;
    let match;
    while ((match = numericFallback.exec(statement))) {
      const before = statement.slice(0, match.index);
      const operandMatch = before.match(/([A-Za-z_$][\w$]*(?:(?:\?\.)|\.)[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*)\s*$/);
      const operand = operandMatch?.[1] || '';
      const target = statement.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/)?.[1] || '';
      const context = `${target} ${operand}`;
      if (INTERFACE_ONLY.test(context)) continue;
      if (SCORE_LIKE.test(operand) || (SCORE_LIKE.test(target) && !COUNTER_LIKE.test(operand))) {
        findings.push(statement.trim());
        break;
      }
    }
  }
  return findings;
}

module.exports = {
  RUNTIME_HELPERS,
  findArbitraryScoreFallbacks,
  normalizeNumericScore,
  normalizeScoreFallbacks,
  resolveNumericScore,
  scoreSortValue,
};
