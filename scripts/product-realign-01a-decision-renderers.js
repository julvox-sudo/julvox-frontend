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

function neutralizedBuildSwipeCard(deal, isTop) {
  const payload = deal && typeof deal === 'object' ? deal : {};
  const score = ui00NumericScore(payload.novadeal_score);
  const rarity = payload.rarity && typeof payload.rarity === 'object' ? payload.rarity : {};
  const rarityBadge = typeof rarity.badge === 'string' ? rarity.badge.trim().toLowerCase() : '';
  const discountValue = Number(payload.discount_pct);
  const discount = Number.isFinite(discountValue) && discountValue !== 0
    ? `-${Math.round(discountValue)}%`
    : '';
  const scColor = score === null ? 'var(--txt3)' : score >= 85 ? '#00D084' : score >= 65 ? '#FFB800' : '#FF5C2B';

  const card = document.createElement('div');
  card.className = 'swipe-card';
  card.innerHTML = `
    <div class="swipe-overlay-like" id="overlayLike">❤️ SUPER</div>
    <div class="swipe-overlay-skip" id="overlaySkip">✕ PASSER</div>
    <div class="swipe-img">${(payload.image_url && payload.image_url.startsWith('http')) ? `<img src="${payload.image_url}" alt="${payload.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.parentNode.textContent='${getCatEmoji(payload.category)}'"/>` : getCatEmoji(payload.category)}</div>
    <div class="swipe-body">
      <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
        ${payload.is_fake ? '<span class="fake-badge">⚠️ SUSPECT</span>' : ''}
        ${rarityBadge === 'record' ? '<span class="record-badge">Signal historique : record</span>' : ''}
        ${rarityBadge === 'rare' ? '<span class="rare-badge">Signal historique : rare</span>' : ''}
        ${discount ? `<span style="background:rgba(255,92,43,.15);color:var(--accent);font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px">${discount}</span>` : ''}
      </div>
      <div class="swipe-name">${payload.name || ''}</div>
      <div style="font-size:12px;color:var(--txt3);margin:4px 0">${payload.store || ''}</div>
      <div style="display:flex;align-items:flex-end;gap:10px;margin-top:8px">
        <div class="swipe-price">${payload.current_price}€</div>
        ${payload.original_price ? `<div style="font-size:14px;color:var(--txt3);text-decoration:line-through;margin-bottom:3px">${payload.original_price}€</div>` : ''}
        <div style="margin-left:auto;background:${scColor}22;border:1px solid ${scColor}44;border-radius:8px;padding:4px 8px">
          ${score === null
    ? '<span style="font-size:11px;font-weight:700;color:var(--txt3)">Indicateur indisponible</span>'
    : `<span style="font-size:11px;font-weight:700;color:${scColor}">★ ${score}</span>`}
        </div>
      </div>
    </div>
  `;
  return card;
}

module.exports = { neutralizedBuildSwipeCard, neutralizedGetVerdict, neutralizedRenderTrustDetail };
