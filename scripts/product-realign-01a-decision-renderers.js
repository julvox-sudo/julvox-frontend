'use strict';

function neutralizedGetVerdict(value) {
  const score = ui00NumericScore(value);
  if (score === null) {
    return {
      emoji: 'ℹ️',
      text: 'Indicateur indisponible',
      detail: 'Analyse de décision indisponible tant que les preuves nécessaires ne sont pas réunies.',
    };
  }
  return {
    emoji: 'ℹ️',
    text: 'Indicateur disponible : ' + score + '/100',
    detail: 'Cet indicateur ne constitue pas encore une recommandation d’achat.',
  };
}

function neutralizedRenderTrustDetail(deal) {
  const merchant = deal?.merchant || deal?.merchant_trust || null;
  const score = ui00NumericScore(merchant?.score);
  const tierAvailable = merchant?.tier !== null
    && merchant?.tier !== undefined
    && String(merchant.tier).trim() !== '';
  const tierLabel = tierAvailable
    ? 'Niveau marchand ' + escHtml(merchant.tier)
    : 'Niveau marchand non évalué';
  if (score === null) {
    return '<div style="background:var(--bg3);border-radius:14px;padding:14px;margin-bottom:12px"><div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--txt2)">Indicateur marchand</div><div style="font-size:12px;color:var(--txt3)">Fiabilité non évaluée</div><div style="font-size:11px;color:var(--txt3);margin-top:4px">' + tierLabel + '</div></div>';
  }
  return '<div style="background:var(--bg3);border-radius:14px;padding:14px;margin-bottom:12px"><div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--txt2)">Indicateur marchand</div><div style="display:flex;justify-content:space-between;font-size:12px"><span>' + tierLabel + '</span><strong>' + score + '/100</strong></div><div style="font-size:11px;color:var(--txt3);margin-top:6px">Cet indicateur n’est pas un niveau de confiance.</div></div>';
}

module.exports = { neutralizedGetVerdict, neutralizedRenderTrustDetail };
