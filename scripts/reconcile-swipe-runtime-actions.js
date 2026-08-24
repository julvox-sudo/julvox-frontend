'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_81_SWIPE_RUNTIME_ACTIONS';
const INSERT_BEFORE = '// ── Résolution intelligente d\'image produit ─────────────────';

const RUNTIME_BLOCK = `// ${MARKER}
function updateSwipeProgress() {
  const progress = document.getElementById('swipeProgress');
  if (!progress) return;
  progress.textContent = '';
  const total = Math.min(Array.isArray(swipeDeals) ? swipeDeals.length : 0, 20);
  for (let i = 0; i < total; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'swipe-dot' + (i === Math.min(swipeIndex, Math.max(total - 1, 0)) ? ' active' : '');
    progress.appendChild(dot);
  }
}

function renderSwipeFinished() {
  const stack = document.getElementById('swipeStack');
  const counter = document.getElementById('swipeCounter');
  if (stack) {
    stack.innerHTML = '<div style="text-align:center;padding:48px 20px;color:var(--txt2)"><div style="font-size:36px;margin-bottom:10px">✓</div><div style="font-size:15px;font-weight:700">Toutes les offres ont été parcourues</div><div style="font-size:12px;color:var(--txt3);margin-top:6px">Change de catégorie ou recharge le feed pour continuer.</div></div>';
  }
  if (counter) counter.textContent = swipeDeals.length + ' / ' + swipeDeals.length;
  updateSwipeProgress();
}

function swipeCard(direction) {
  if (direction !== 'left' && direction !== 'right') return;
  const deal = Array.isArray(swipeDeals) ? swipeDeals[swipeIndex] : null;
  if (!deal) { showToast('Aucune offre restante'); return; }
  const card = document.getElementById('swipeTopCard');
  if (!card || card.dataset.swipeAnimating === '1') return;
  card.dataset.swipeAnimating = '1';

  if (direction === 'right') {
    const trust = window.JulvoxDynamicDealTrust;
    const id = trust && typeof trust.positiveId === 'function' ? trust.positiveId(deal.id) : null;
    if (id) {
      addToFav(id, true);
      if (!swipeLiked.includes(id)) swipeLiked.push(id);
      showToast('❤️ Sauvegardé dans les favoris de cet appareil');
    } else {
      showToast('⚠️ Cette offre ne peut pas être sauvegardée');
    }
  }

  card.classList.add(direction === 'right' ? 'fly-right' : 'fly-left');
  window.setTimeout(function() {
    swipeIndex += 1;
    swipeDragging = false;
    swipeCurrentCard = null;
    if (swipeIndex >= swipeDeals.length) renderSwipeFinished();
    else renderSwipeStack();
  }, 360);
}

function openDealFromSwipe() {
  const rawDeal = Array.isArray(swipeDeals) ? swipeDeals[swipeIndex] : null;
  const trust = window.JulvoxDynamicDealTrust;
  const deal = trust && typeof trust.normalizeDeal === 'function' ? trust.normalizeDeal(rawDeal, true) : null;
  const id = deal && trust && typeof trust.positiveId === 'function' ? trust.positiveId(deal.id) : null;
  if (!deal || !id) { showToast('⚠️ Détails indisponibles pour cette offre'); return; }
  if (!allDeals.some(function(item) { return item && item.id === id; })) allDeals.push(deal);
  openDeal(id);
}

function initSwipeDrag(card, deal) {
  if (!card || !deal || typeof card.addEventListener !== 'function') return;
  const resetCard = function() {
    swipeDragging = false;
    swipeCurrentCard = null;
    swipeDeltaX = 0;
    card.classList.remove('dragging');
    card.style.transform = card.dataset.swipeBaseTransform || '';
    const like = card.querySelector('.swipe-overlay-like');
    const skip = card.querySelector('.swipe-overlay-skip');
    if (like) like.style.opacity = '0';
    if (skip) skip.style.opacity = '0';
  };
  const finishDrag = function(event) {
    if (!swipeDragging || swipeCurrentCard !== card) return;
    if (event && card.hasPointerCapture && card.hasPointerCapture(event.pointerId)) {
      try { card.releasePointerCapture(event.pointerId); } catch (error) {}
    }
    const horizontal = Math.abs(swipeDeltaX);
    const vertical = Math.abs((event && Number.isFinite(event.clientY) ? event.clientY : swipeStartY) - swipeStartY);
    swipeDragging = false;
    card.classList.remove('dragging');
    if (horizontal >= 80 && horizontal > vertical) {
      swipeCard(swipeDeltaX > 0 ? 'right' : 'left');
      return;
    }
    resetCard();
  };

  card.addEventListener('pointerdown', function(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    swipeDragging = true;
    swipeCurrentCard = card;
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
    swipeDeltaX = 0;
    card.dataset.swipeBaseTransform = card.style.transform || '';
    card.classList.add('dragging');
    if (card.setPointerCapture) {
      try { card.setPointerCapture(event.pointerId); } catch (error) {}
    }
  });
  card.addEventListener('pointermove', function(event) {
    if (!swipeDragging || swipeCurrentCard !== card) return;
    swipeDeltaX = event.clientX - swipeStartX;
    const deltaY = event.clientY - swipeStartY;
    if (Math.abs(swipeDeltaX) > Math.abs(deltaY) && event.cancelable) event.preventDefault();
    card.style.transform = 'translateX(' + swipeDeltaX + 'px) rotate(' + (swipeDeltaX / 18) + 'deg)';
    const opacity = Math.min(Math.abs(swipeDeltaX) / 90, 1);
    const like = card.querySelector('.swipe-overlay-like');
    const skip = card.querySelector('.swipe-overlay-skip');
    if (like) like.style.opacity = swipeDeltaX > 0 ? String(opacity) : '0';
    if (skip) skip.style.opacity = swipeDeltaX < 0 ? String(opacity) : '0';
  });
  card.addEventListener('pointerup', finishDrag);
  card.addEventListener('pointercancel', resetCard);
}

`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }
  const anchorCount = countOf(html, INSERT_BEFORE);
  if (anchorCount !== 1) throw new Error(`P6.81 expected one Swipe insertion anchor, got ${anchorCount}`);
  for (const missingDefinition of [
    'function swipeCard(',
    'function openDealFromSwipe(',
    'function initSwipeDrag(',
    'function updateSwipeProgress(',
  ]) {
    if (html.includes(missingDefinition)) throw new Error(`P6.81 unexpected pre-existing definition: ${missingDefinition}`);
  }
  for (const requiredCall of [
    "onclick=\"swipeCard('left')\"",
    "onclick=\"swipeCard('right')\"",
    'onclick="openDealFromSwipe()"',
    'initSwipeDrag(card, deal);',
    'updateSwipeProgress();',
  ]) {
    if (!html.includes(requiredCall)) throw new Error(`P6.81 expected broken Swipe call missing: ${requiredCall}`);
  }
  const output = html.replace(INSERT_BEFORE, RUNTIME_BLOCK + INSERT_BEFORE);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.81 marker count must be 1');
  for (const definition of [
    'function swipeCard(direction) {',
    'function openDealFromSwipe() {',
    'function initSwipeDrag(card, deal) {',
    'function updateSwipeProgress() {',
  ]) {
    if (countOf(html, definition) !== 1) throw new Error(`P6.81 runtime definition count invalid: ${definition}`);
  }
  for (const required of [
    "if (direction !== 'left' && direction !== 'right') return;",
    "addToFav(id, true);",
    "Sauvegardé dans les favoris de cet appareil",
    "swipeIndex += 1;",
    "openDeal(id);",
    "card.addEventListener('pointerdown'",
    "card.addEventListener('pointermove'",
    "card.addEventListener('pointerup'",
    "horizontal >= 80",
    "dot.className = 'swipe-dot'",
    '/deals/feed/swipe?limit=20',
    "if (openTarget === 'swipe')    openSwipePage();",
    'function addToFav(id, silent) {',
    'P6_41_FAVORITES_LOCAL_TRUTH',
    'P6_79_SWIPE_REFERENCE_GAP_TRUTH',
    'P6_80_BUDGET_SELECTION_COPY_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.81 required Swipe boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_81_SWIPE_RUNTIME_ACTIONS_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, RUNTIME_BLOCK, assertHardened, hardenHtml, hardenPublicArtifact };
