'use strict';

function neutralizedRenderProductComparison(data, el) {
  const payload = data && typeof data === 'object' ? data : {};
  const product = payload.product && typeof payload.product === 'object' ? payload.product : {};
  const comps = Array.isArray(payload.comparisons) ? payload.comparisons : [];
  const savingsValue = payload.savings === null || payload.savings === undefined || String(payload.savings).trim() === ''
    ? null
    : Number(payload.savings);
  const savings = Number.isFinite(savingsValue) ? savingsValue : null;
  el.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700">${product.name || ''}</div>
      <div style="font-size:12px;color:var(--txt3);margin-top:2px">${comps.length} marchands comparés · ${savings === null ? 'Économies indisponibles' : 'Économies jusqu’à ' + savings + '€'}</div>
    </div>
    ${comps.map((comparison, index) => {
      const merchantScore = ui00NumericScore(comparison.trust_score);
      const productScore = ui00NumericScore(comparison.novadeal_score);
      return `
      <div class="compare-card ${comparison.is_best_price ? 'best' : ''}">
        <div class="compare-rank ${index === 0 ? 'gold' : ''}">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
        <div style="flex:1">
          <div class="compare-price">${comparison.price}€</div>
          <div class="compare-store">${comparison.store}</div>
          <div class="compare-trust">
            <span style="color:var(--txt2)">${merchantScore === null ? 'Fiabilité non évaluée' : 'Indicateur marchand ' + merchantScore + '/100'}</span>
            ${productScore === null ? '' : `<span style="color:var(--txt3)">· Indicateur produit ${productScore}/100</span>`}
          </div>
        </div>
        <div class="compare-saving">
          ${comparison.vs_best > 0 ? `<div class="compare-saving-amt">+${comparison.vs_best}€</div><div class="compare-saving-lbl">vs meilleur</div>` : '<div style="font-size:12px;color:var(--green);font-weight:700">Meilleur prix observé ✓</div>'}
          <a href="${buildSmartUrl(comparison)}" target="_blank" style="display:block;margin-top:6px;background:var(--accent);color:#fff;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:600;text-align:center">Voir →</a>
        </div>
      </div>`;
    }).join('')}
    <button onclick="runCompareV2()" style="width:100%;margin-top:12px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px;font-size:13px;font-weight:600;color:var(--txt)">← Nouvelle recherche</button>
  `;
}

function neutralizedInjectAnalysisInModal(data, deal) {
  const container = document.getElementById('modalExtra');
  if (!container) return;
  const payload = data && typeof data === 'object' ? data : {};
  const fake = payload.fake_promo && typeof payload.fake_promo === 'object' ? payload.fake_promo : {};
  const rarity = payload.rarity && typeof payload.rarity === 'object' ? payload.rarity : {};
  const trend = payload.trend && typeof payload.trend === 'object' ? payload.trend : {};
  const alerts = Array.isArray(payload.predictive_alert?.alerts) ? payload.predictive_alert.alerts : [];
  const rawProbability = trend.drop_probability === null || trend.drop_probability === undefined || String(trend.drop_probability).trim() === ''
    ? null
    : Number(trend.drop_probability);
  const dropProbability = Number.isFinite(rawProbability) && rawProbability >= 0 && rawProbability <= 1
    ? Math.round(rawProbability * 100)
    : null;

  container.innerHTML = `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      ${fake.is_fake ? '<span class="fake-badge" style="font-size:12px;padding:4px 10px">⚠️ FAUSSE PROMO SUSPECTÉE</span>' : ''}
      ${rarity.badge === 'record' ? '<span class="record-badge" style="font-size:12px;padding:4px 10px">Signal historique : record</span>' : ''}
      ${rarity.badge === 'rare' ? '<span class="rare-badge" style="font-size:12px;padding:4px 10px">Signal historique : rare</span>' : ''}
      <span class="${trend.trend === 'down' ? 'trend-down' : trend.trend === 'up' ? 'trend-up' : 'trend-stable'}">
        ${dropProbability === null ? 'Probabilité de baisse indisponible' : (trend.direction_emoji || '') + ' Calcul disponible : ' + dropProbability + '% de probabilité de baisse'}
      </span>
    </div>
    ${fake.is_fake && Array.isArray(fake.reasons) && fake.reasons.length ? `
    <div style="background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.2);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:#FF3B30;margin-bottom:6px">⚠️ Signaux détectés</div>
      ${fake.reasons.map(reason => `<div style="font-size:11px;color:var(--txt2);margin-bottom:3px">→ ${reason}</div>`).join('')}
    </div>` : ''}
    ${alerts.map(alert => `
    <div class="predictive-alert" style="margin-bottom:8px">
      <div class="predictive-alert-title">${alert.title}</div>
      <div class="predictive-alert-msg">${alert.message}</div>
    </div>`).join('')}
  `;
}

module.exports = { neutralizedRenderProductComparison, neutralizedInjectAnalysisInModal };
