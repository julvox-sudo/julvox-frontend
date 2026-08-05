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

  const scoreAccess = String.raw`(?:[A-Za-z_$][\w$]*(?:\[[^\]\n]+\])?(?:\?\.)?\.(?:novadeal_score|merchant_trust_score|score))`;
  output = output.replace(
    new RegExp(`(${scoreAccess})\\s*(?:\\|\\||\\?\\?)\\s*(?:0|50|75|82)\\b`, 'g'),
    'ui00ResolveScore($1)',
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
  const numericFallback = /(?:\|\||\?\?)\s*-?\d+(?:\.\d+)?\b/;
  const businessScore = /(?:novadeal_score|merchant_trust_score|\bscore\b|rating|quality|trust|confidence)/i;
  const interfaceOnly = /(?:filters?|preferences?|threshold|min(?:imum)?|max(?:imum)?)/i;

  for (const statement of statements) {
    if (!numericFallback.test(statement) || !businessScore.test(statement)) continue;
    if (interfaceOnly.test(statement)) continue;
    findings.push(statement.trim());
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
