'use strict';

const PRODUCT_REALIGN_MARKER = '/* product-realign-01a:neutralized-v1 */';

const UNJUSTIFIED_DECISION_PATTERNS = Object.freeze([
  ['score threshold produces a buy-now recommendation', /Achetez maintenant/i],
  ['score threshold produces a wait recommendation', /function\s+getVerdict[\s\S]{0,900}text\s*:\s*['"]Attendez['"]/i],
  ['score alone asserts an historical low', /Prix historiquement bas/i],
  ['swipe score threshold produces historical badges', /score\s*>=\s*90\s*\?\s*'<span class="record-badge">[^']*RECORD<\/span>'\s*:\s*score\s*>=\s*85\s*\?\s*'<span class="rare-badge">[^']*RARE<\/span>'/i],
  ['missing drop probability becomes 50 percent', /drop_probability\s*\|\|\s*0\.5/],
  ['missing merchant tier becomes tier 2', /merchant\.tier\s*\|\|\s*2/],
  ['missing rarity becomes index 0', /rarity\.index\s*\|\|\s*0/],
  ['missing comparison savings become zero euros', /data\.savings\s*\|\|\s*0/],
  ['missing modal savings become zero euros', /original_price\s*\?\s*\(deal\.original_price\s*-\s*deal\.current_price\)\.toFixed\(2\)\s*:\s*0/],
  ['merchant score is rendered without a missing-value guard', /\$\{(?:merchant\.score|c\.trust_score|ui00ResolveScore\(merchant\.score\))\}(?:\/100)?/],
  ['merchant score is called confidence', /Confiance marchand/i],
  ['composite score is called confidence', /Score de confiance (?:NovaDeal™|algorithmique)/i],
  ['community validation ratio is called confidence', /confiance communauté/i],
  ['merchant ranking claims reliability from an average score', /Marchands les plus fiables ce mois/i],
  ['community score can render null directly', /NovaDeal™\s+\$\{score\}/],
  ['invalid percentage token remains', /(?:null|undefined|NaN)%/i],
]);

function findUnjustifiedDecisionClaims(source) {
  const text = String(source);
  return UNJUSTIFIED_DECISION_PATTERNS
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label);
}

module.exports = {
  PRODUCT_REALIGN_MARKER,
  UNJUSTIFIED_DECISION_PATTERNS,
  findUnjustifiedDecisionClaims,
};
