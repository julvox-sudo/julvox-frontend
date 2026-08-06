'use strict';

function neutralizedRenderAnalysisResults(data, el, currentPrice, originalPrice) {
  const payload = data && typeof data === 'object' ? data : {};
  const numberOrNull = value => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  const score = ui00NumericScore(payload.score);
  const fake = payload.fake_promo && typeof payload.fake_promo === 'object' ? payload.fake_promo : {};
  const rarity = payload.rarity && typeof payload.rarity === 'object' ? payload.rarity : {};
  const trend = payload.trend && typeof payload.trend === 'object' ? payload.trend : {};
  const merchant = payload.merchant && typeof payload.merchant === 'object' ? payload.merchant : {};
  const calendar = payload.calendar && typeof payload.calendar === 'object' ? payload.calendar : {};
  const realDiscount = numberOrNull(fake.real_discount_pct);
  const rarityIndex = ui00NumericScore(rarity.index);
  const merchantScore = ui00NumericScore(merchant.score);
  const merchantTierAvailable = merchant.tier !== null
    && merchant.tier !== undefined
    && String(merchant.tier).trim() !== '';
  const rawProbability = numberOrNull(trend.drop_probability);
  const dropProbability = rawProbability !== null && rawProbability >= 0 && rawProbability <= 1
    ? Math.round(rawProbability * 100)
    : null;
  const trendAvailable = (typeof trend.trend === 'string' && trend.trend.trim() !== '')
    || (typeof trend.direction_emoji === 'string' && trend.direction_emoji.trim() !== '');
  const minPrice = numberOrNull(fake.min_price_90d);
  const medianPrice = numberOrNull(fake.median_price);
  const currentNumeric = numberOrNull(currentPrice);
  const historicalRangeAvailable = minPrice !== null && medianPrice !== null && currentNumeric !== null;
  const scoreLabel = score === null ? 'Indicateur indisponible' : 'Indicateur disponible : ' + score + '/100';

  el.innerHTML = `
    <div class="verdict-card" style="background:var(--bg3);border-color:var(--border)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div>
          <div class="verdict-score" style="color:var(--txt)">${score === null ? '—' : score}</div>
          <div style="font-size:11px;color:var(--txt3);margin-top:-2px">${score === null ? 'Données insuffisantes' : '/ 100'}</div>
          <div class="verdict-label" style="color:var(--txt);margin-top:8px">ℹ️ ${scoreLabel}</div>
        </div>
        ${fake.is_fake ? '<div class="fake-badge" style="font-size:12px;padding:5px 10px">⚠️ FAUSSE PROMO</div>' : ''}
      </div>
      <div style="font-size:12px;color:var(--txt2);margin-top:12px">Cet indicateur ne constitue pas encore une recommandation d’achat.</div>
      <div style="font-size:12px;color:var(--txt3);margin-top:4px">Analyse de décision indisponible tant que les preuves nécessaires ne sont pas réunies.</div>
    </div>

    <div class="analysis-grid">
      <div class="analysis-cell">
        <div class="analysis-cell-label">Remise réelle</div>
        <div class="analysis-cell-value">${realDiscount === null ? 'Données insuffisantes' : realDiscount + '%'}</div>
        <div style="font-size:11px;color:var(--txt3);margin-top:2px">Calcul disponible uniquement si le service fournit la donnée</div>
      </div>
      <div class="analysis-cell">
        <div class="analysis-cell-label">Rareté du prix</div>
        <div class="analysis-cell-value">${typeof rarity.label === 'string' && rarity.label.trim() !== '' ? rarity.label : 'Non évalué'}</div>
        <div style="font-size:11px;color:var(--txt3);margin-top:2px">${rarityIndex === null ? 'Données insuffisantes' : 'Indice ' + rarityIndex + '/100'}</div>
      </div>
      <div class="analysis-cell">
        <div class="analysis-cell-label">Indicateur marchand</div>
        <div class="analysis-cell-value">${merchantScore === null ? 'Fiabilité non évaluée' : merchantScore + '/100'}</div>
        <div style="font-size:11px;color:var(--txt3);margin-top:2px">${merchantTierAvailable ? 'Niveau marchand ' + merchant.tier : 'Niveau marchand non évalué'}</div>
      </div>
      <div class="analysis-cell">
        <div class="analysis-cell-label">Tendance 30j</div>
        <div class="analysis-cell-value">${trendAvailable ? (trend.direction_emoji || '') + ' ' + (trend.trend || '') : 'Tendance indisponible'}</div>
        <div style="font-size:11px;color:var(--txt3);margin-top:2px">${dropProbability === null ? 'Probabilité de baisse indisponible' : 'Calcul disponible : ' + dropProbability + '% de probabilité de baisse'}</div>
      </div>
    </div>

    ${historicalRangeAvailable ? `
    <div class="predict-bar">
      <div class="predict-label">Fourchette historique observée</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-top:4px">
        <span style="color:var(--green)">Min : ${minPrice}€</span>
        <span style="color:var(--accent)">Actuel : ${currentNumeric}€</span>
        <span style="color:var(--txt3)">Médiane : ${medianPrice}€</span>
      </div>
      <div class="predict-track" style="margin-top:10px">
        <div class="predict-fill" style="width:100%"></div>
        <div class="predict-cursor" style="left:${Math.min(98, Math.max(2, ((currentNumeric - minPrice) / Math.max(1, medianPrice * 1.3 - minPrice) * 100)))}%"></div>
      </div>
    </div>` : ''}

    ${fake.is_fake && Array.isArray(fake.reasons) && fake.reasons.length ? `
    <div style="background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.25);border-radius:14px;padding:14px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;color:#FF3B30;margin-bottom:8px">⚠️ Signaux de fausse promo</div>
      ${fake.reasons.map(reason => `<div style="font-size:12px;color:var(--txt2);margin-bottom:4px;padding-left:8px">→ ${reason}</div>`).join('')}
    </div>` : ''}

    ${calendar.next_event ? `
    <div class="predictive-alert">
      <div class="predictive-alert-title">📅 Période à surveiller</div>
      <div class="predictive-alert-msg">Indication calendaire disponible. Elle ne constitue pas une recommandation personnalisée.</div>
      ${Array.isArray(calendar.all_events) ? calendar.all_events.slice(0, 2).map(event => `
        <div class="cal-event ${event.days_until <= 30 ? 'soon' : ''}" style="margin-top:10px;padding:10px">
          <div class="cal-days"><div class="cal-days-num">${event.days_until}</div><div class="cal-days-lbl">jours</div></div>
          <div class="cal-info"><div class="cal-name">${event.period}</div><div class="cal-disc">${event.avg_discount}% en moyenne · ${event.date}</div></div>
        </div>`).join('') : ''}
    </div>` : ''}

    <div style="display:flex;gap:10px;margin-top:16px">
      <button onclick="createAlertFromAnalysis()" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px;font-size:13px;font-weight:600;color:var(--txt)">🔔 Créer une alerte</button>
      <button onclick="openPage('analyzePage')" style="flex:1;background:var(--accent);border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:600;color:#fff">⚡ Nouvelle analyse</button>
    </div>
  `;
}

module.exports = { neutralizedRenderAnalysisResults };
