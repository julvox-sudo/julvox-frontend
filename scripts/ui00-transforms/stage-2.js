module.exports = function transformStage(html, enhancements, helpers) {
  const { HTML_MARKER, ENHANCEMENTS_MARKER, replaceExactly, replaceAtLeast, replaceNamedFunction, replaceObjectDeclaration, removeBetween, renderLoadFailureCode } = helpers;
    html = replaceNamedFunction(html, 'loadSwipeFeed', `async function loadSwipeFeed() {
  const category = document.getElementById('swipeCategoryFilter')?.value || '';
  const stack = document.getElementById('swipeStack');
  if (!stack) return;
  stack.textContent = 'Chargement des offres…';
  swipeIndex = 0; swipeDeals = []; swipeLiked = [];
  const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : localStorage.getItem('token');
  const path = '/deals/feed/swipe?limit=20' + (category ? '&category=' + encodeURIComponent(category) : '');
  const result = await window.JULVOX_API.get(path, { token, isEmpty: data => !Array.isArray(data?.deals) || data.deals.length === 0 });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(stack, 'error', 'Offres indisponibles.', loadSwipeFeed); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(stack, 'empty', 'Aucune offre disponible.', loadSwipeFeed); return; }
  swipeDeals = result.data.deals;
  renderSwipeStack();
}`, true);

  html = replaceNamedFunction(html, 'loadTikTokScript', `async function loadTikTokScript() {
  const category = document.getElementById('socialCategory')?.value || '';
  const el = document.getElementById('tiktokResults');
  if (!el) return;
  el.textContent = 'Génération en cours…';
  const path = '/content/tiktok-script?style=' + encodeURIComponent(currentTikTokStyle) + (category ? '&category=' + encodeURIComponent(category) : '');
  const result = await window.JULVOX_API.get(path, { isEmpty: data => !Array.isArray(data?.scripts) || data.scripts.length === 0 });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Génération indisponible.', loadTikTokScript); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Aucun script disponible.', loadTikTokScript); return; }
  renderTikTokScript(result.data, el);
}`, true);

  html = replaceNamedFunction(html, 'loadCalendar', `async function loadCalendar(category, btn) {
  document.querySelectorAll('[id^=calCat]').forEach(button => button.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('calendarResults');
  if (!el) return;
  el.textContent = 'Chargement…';
  const result = await window.JULVOX_API.get('/calendar/' + encodeURIComponent(category), {
    isEmpty: data => !Array.isArray(data?.all_events) || data.all_events.length === 0,
  });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Calendrier indisponible.', () => loadCalendar(category, btn)); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Aucune période disponible.', () => loadCalendar(category, btn)); return; }
  renderCalendar(result.data, el, category);
}`, true);

  html = replaceNamedFunction(html, 'loadMyReputation', `async function loadMyReputation() {
  const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : localStorage.getItem('token');
  const el = document.getElementById('myReputationBlock');
  if (!el) return;
  if (!token) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Connecte-toi pour voir ta réputation.', null); return; }
  const result = await window.JULVOX_API.get('/community/my-reputation', {
    token,
    confirm: data => Number.isFinite(data?.points) && Number.isFinite(data?.rank) && data?.level && typeof data.level.name === 'string',
  });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Réputation indisponible.', loadMyReputation); return; }
  renderMyReputation(result.data, el);
}`, true);

  html = replaceNamedFunction(html, 'loadMyCommDeals', `async function loadMyCommDeals(el) {
  if (!currentUser) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Connecte-toi pour voir tes soumissions.', null); return; }
  el.textContent = 'Chargement…';
  const result = await window.JULVOX_API.get('/community/my-deals', {
    token: currentUser.token,
    isEmpty: data => !Array.isArray(data?.deals) || data.deals.length === 0,
  });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Soumissions indisponibles.', () => loadMyCommDeals(el)); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Aucune soumission confirmée.', () => loadMyCommDeals(el)); return; }
  renderCommDeals(result.data.deals, el, 'mine');
}`, true);

  html = replaceNamedFunction(html, 'loadCommLeader', `async function loadCommLeader(el) {
  el.textContent = 'Chargement…';
  const result = await window.JULVOX_API.get('/community/leaderboard', {
    isEmpty: data => !Array.isArray(data?.leaderboard) || data.leaderboard.length === 0,
  });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Classement indisponible.', () => loadCommLeader(el)); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Classement indisponible.', () => loadCommLeader(el)); return; }
  renderLeaderboard(result.data.leaderboard, el);
}`, true);

  html = replaceNamedFunction(html, 'openProPage', `async function openProPage() {
  const el = document.getElementById('proPlans');
  if (!el) { showToast('⚠️ Service Pro expérimental indisponible.'); return; }
  openPage('proPage');
  const result = await window.JULVOX_API.get('/pro/plans', {
    isEmpty: data => !Array.isArray(data?.plans) || data.plans.length === 0,
  });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Offres Pro indisponibles.', openProPage); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Aucune offre Pro confirmée.', openProPage); return; }
  renderProPlans(result.data.plans, el);
}`, true);

  html = replaceNamedFunction(html, 'sendAIMessage', `async function sendAIMessage(preset) {
  const input = document.getElementById('chatInput');
  const message = (preset || input?.value || '').trim();
  if (!message || aiLoading) return;
  if (input) input.value = '';
  aiLoading = true;
  document.getElementById('chatSendBtn')?.setAttribute('disabled','true');
  if (!preset) document.getElementById('quickPrompts').style.display = 'none';
  appendChatBubble('user', message);
  appendTypingIndicator();
  const result = await window.JULVOX_API.post('/ai/chat', { message, session_id: AI_SESSION_ID }, {
    confirm: data => typeof data?.response === 'string' && data.response.trim().length > 0,
  });
  removeTypingIndicator();
  if (!result.ok) appendChatBubble('ai', 'Assistant indisponible. Réessayez plus tard.');
  else { appendChatBubble('ai', result.data.response); trackMission('analyze_deal'); }
  aiLoading = false;
  document.getElementById('chatSendBtn')?.removeAttribute('disabled');
}`, true);

  html = replaceNamedFunction(html, 'appendChatBubble', `function appendChatBubble(role, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (role === 'user' ? 'user' : '');
  const escaped = escapeHtml(String(text ?? ''));
  const rendered = escaped.replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\`(.+?)\`/g, '<code style="background:var(--bg3);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>');
  bubble.innerHTML = role === 'user'
    ? '<div class="bubble-content user">' + rendered + '</div>'
    : '<div class="bubble-avatar">🤖</div><div class="bubble-content ai">' + rendered + '</div>';
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}`, true);

  html = replaceNamedFunction(html, 'loadCashbackBalance', `async function loadCashbackBalance() {
  const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : localStorage.getItem('token');
  const balance = document.getElementById('cbBalance');
  const pending = document.getElementById('cbPending');
  if (!token) { if (balance) balance.textContent = '—'; if (pending) pending.textContent = '—'; return; }
  const result = await window.JULVOX_API.get('/cashback/my-earnings', {
    token,
    confirm: data => Number.isFinite(data?.confirmed) && Number.isFinite(data?.pending),
  });
  if (!result.ok) { if (balance) balance.textContent = 'Indisponible'; if (pending) pending.textContent = 'Indisponible'; return; }
  if (balance) balance.textContent = result.data.confirmed.toFixed(2) + '€';
  if (pending) pending.textContent = result.data.pending.toFixed(2) + '€';
}`, true);

  html = replaceNamedFunction(html, 'loadCashbackRates', `async function loadCashbackRates() {
  const el = document.getElementById('cbRatesList');
  if (!el) return;
  const result = await window.JULVOX_API.get('/cashback/rates', {
    isEmpty: data => !Array.isArray(data?.rates) || data.rates.length === 0,
  });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Taux de cashback indisponibles.', loadCashbackRates); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Aucun taux de cashback confirmé.', loadCashbackRates); return; }
  renderCashbackRates(result.data.rates, el);
}`, true);

  html = replaceNamedFunction(html, 'simulateCashback', `async function simulateCashback() {
  const store = document.getElementById('cbSimStore')?.value;
  const amount = Number.parseFloat(document.getElementById('cbSimAmount')?.value);
  const el = document.getElementById('cbSimResult');
  if (!store || !amount || amount <= 0) { showToast('⚠️ Remplissez les deux champs'); return; }
  const result = await window.JULVOX_API.post('/cashback/simulate', { store, amount }, {
    confirm: data => Number.isFinite(data?.cashback) && Number.isFinite(data?.rate_pct),
  });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Simulation de cashback indisponible.', simulateCashback); return; }
  el.textContent = result.data.cashback + '€ de cashback sur ' + amount + '€ chez ' + store + ' (' + result.data.rate_pct + '%)';
}`, true);
  return { html, enhancements };
};
