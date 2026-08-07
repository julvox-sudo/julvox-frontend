const DEFAULT_ASSISTANT_PREFERENCES = Object.freeze({
  identity: 'neutral',
  tone: 'warm',
  address_mode: 'tu',
});

const ALLOWED_ASSISTANT_PREFERENCES = Object.freeze({
  identity: Object.freeze(['neutral', 'feminine', 'masculine']),
  tone: Object.freeze(['warm', 'concise', 'detailed', 'expert']),
  address_mode: Object.freeze(['tu', 'vous']),
});

const MARKER = 'data-assistant-human-presence="lot-a"';
const STYLE_ID = 'julvox-assistant-human-presence-02-styles';
const RUNTIME_ID = 'julvox-assistant-human-presence-02-runtime';

function fail(message) {
  throw new Error(`JULVOX-ASSISTANT-HUMAN-PRESENCE-02 integration failed: ${message}`);
}

function normalizeAssistantPreferences(input) {
  const source = input && typeof input === 'object' ? input : {};
  const output = {};
  for (const key of Object.keys(DEFAULT_ASSISTANT_PREFERENCES)) {
    const value = source[key];
    output[key] = ALLOWED_ASSISTANT_PREFERENCES[key].includes(value)
      ? value
      : DEFAULT_ASSISTANT_PREFERENCES[key];
  }
  return output;
}

function fallbackSelfReference(preferences) {
  const prefs = normalizeAssistantPreferences(preferences);
  const objectPronoun = prefs.address_mode === 'vous' ? 'vous' : 't’';
  if (prefs.identity === 'feminine') {
    return `Je suis ravie de ${objectPronoun}aider et prête à comparer les options avec ${prefs.address_mode === 'vous' ? 'vous' : 'toi'}.`;
  }
  if (prefs.identity === 'masculine') {
    return `Je suis ravi de ${objectPronoun}aider et prêt à comparer les options avec ${prefs.address_mode === 'vous' ? 'vous' : 'toi'}.`;
  }
  return prefs.address_mode === 'vous'
    ? 'Je peux vous aider à y voir plus clair et comparer les options avec vous.'
    : 'Je peux t’aider à y voir plus clair et comparer les options avec toi.';
}

function localDecisionFallback(message, preferences) {
  const prefs = normalizeAssistantPreferences(preferences);
  const normalized = String(message || '').trim().toLowerCase();
  const vous = prefs.address_mode === 'vous';
  const ask = (tu, vousText) => (vous ? vousText : tu);

  if (!normalized || /^(bonjour|salut|hello|bonsoir|coucou|aide|help)\b/.test(normalized)) {
    return `${fallbackSelfReference(prefs)}\n\n${ask('Parle-moi de ce que tu veux acheter, comparer ou de ce qui te fait hésiter.', 'Parlez-moi de ce que vous voulez acheter, comparer ou de ce qui vous fait hésiter.')}`;
  }
  if (/compar|entre\s+.+\s+et\s+|versus|\bvs\b/.test(normalized)) {
    return ask(
      'On peut comparer ces options ensemble. Donne-moi les deux choix et le critère qui compte le plus pour toi.',
      'On peut comparer ces options ensemble. Donnez-moi les deux choix et le critère qui compte le plus pour vous.',
    );
  }
  if (/budget|€|euro|prix|max(?:imum)?/.test(normalized)) {
    return ask(
      'Ton budget est un critère important. Quel montant maximum veux-tu consacrer à cet achat, et sur quoi refuses-tu de faire un compromis ?',
      'Votre budget est un critère important. Quel montant maximum voulez-vous consacrer à cet achat, et sur quoi refusez-vous de faire un compromis ?',
    );
  }
  if (/risque|fiable|durable|garantie|retour|hésit|incertain|peur/.test(normalized)) {
    return ask(
      'Je peux t’aider à séparer les faits, les incertitudes et les risques qui peuvent réellement changer ta décision. Qu’est-ce qui t’inquiète le plus ?',
      'Je peux vous aider à séparer les faits, les incertitudes et les risques qui peuvent réellement changer votre décision. Qu’est-ce qui vous inquiète le plus ?',
    );
  }
  if (/idée|inspir|quoi choisir|que choisir|cherche|acheter|besoin/.test(normalized)) {
    return ask(
      'Commençons par ton besoin réel. Quel usage est prioritaire, quel budget as-tu en tête et quelle contrainte serait rédhibitoire ?',
      'Commençons par votre besoin réel. Quel usage est prioritaire, quel budget avez-vous en tête et quelle contrainte serait rédhibitoire ?',
    );
  }
  return ask(
    'Je peux t’aider à clarifier cette décision. Quel est le critère qui pourrait le plus faire changer ton choix ?',
    'Je peux vous aider à clarifier cette décision. Quel est le critère qui pourrait le plus faire changer votre choix ?',
  );
}

function removeHistoricalAssistantComment(input, pageStart) {
  const commentStart = input.lastIndexOf('<!--', pageStart);
  if (commentStart < 0) return input;
  const commentEnd = input.indexOf('-->', commentStart);
  if (commentEnd < 0 || commentEnd > pageStart) return input;
  const comment = input.slice(commentStart, commentEnd + 3);
  if (!/ASSISTANT\s+IA\s+(?:DEALSCAN|JULVOX)/i.test(comment)) return input;
  return input.slice(0, commentStart) + input.slice(commentEnd + 3);
}

function locateDivById(input, id) {
  const pattern = new RegExp(`<div\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i');
  const match = pattern.exec(input);
  if (!match) fail(`${id} root is missing`);
  const start = match.index;
  const scanner = /<div\b[^>]*>|<\/div\s*>/gi;
  scanner.lastIndex = start;
  let depth = 0;
  let token;
  while ((token = scanner.exec(input)) !== null) {
    if (/^<div\b/i.test(token[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) return { start, end: scanner.lastIndex };
  }
  fail(`${id} root is not balanced`);
}

function replaceAssistantPage(input) {
  const locatedBeforeComment = locateDivById(input, 'aiChatPage');
  const withoutComment = removeHistoricalAssistantComment(input, locatedBeforeComment.start);
  const located = locateDivById(withoutComment, 'aiChatPage');
  return withoutComment.slice(0, located.start) + ASSISTANT_HTML + withoutComment.slice(located.end);
}

function applyHomeContinuity(input) {
  const legacyPattern = /window\.openAIChat\(\);\s*window\.setTimeout\(function\(\)\{\s*window\.sendAIMessage\(safePrompt\);\s*\},\s*80\);/;
  if (!legacyPattern.test(input)) fail('home-to-assistant legacy handoff was not found');
  return input.replace(legacyPattern, 'window.openAIChat({ initialPrompt: safePrompt });');
}

function insertBeforeClosingTag(input, closingTag, addition, id) {
  if (input.includes(`id="${id}"`)) return input;
  const index = input.lastIndexOf(closingTag);
  if (index < 0) fail(`${closingTag} is missing`);
  return input.slice(0, index) + addition + '\n' + input.slice(index);
}

function extractAssistantPage(input) {
  const located = locateDivById(input, 'aiChatPage');
  return input.slice(located.start, located.end);
}

function verifyAssistantHumanPresence(input) {
  if (!input.includes(MARKER)) fail('Lot A marker is missing');
  const page = extractAssistantPage(input);
  for (const required of [
    'Assistant Julvox',
    'Intelligence artificielle',
    'Choisir un produit',
    'Comparer deux options',
    'Explorer des idées',
    'M’aider à décider',
    'Continuer une réflexion',
  ]) {
    if (!page.includes(required)) fail(`required Assistant content is missing: ${required}`);
  }
  for (const [label, pattern] of [
    ['robot emoji', /\u{1F916}/u],
    ['historical Assistant IA label', /Assistant\s+IA/i],
    ['historical DealScan identity', /DealScan/i],
    ['historical NovaDeal identity', /NovaDeal/i],
    ['historical top-deals shortcut', /Top\s+deals/i],
    ['historical false-promo shortcut', /Fausses?\s+promos?/i],
    ['historical premium shortcut', /Premium/i],
  ]) {
    if (pattern.test(page)) fail(`${label} remains in Assistant page`);
  }
  if (/\u{1F916}/u.test(input)) fail('robot emoji remains in public HTML');
  if (!input.includes('assistant_preferences')) fail('frontend assistant_preferences contract is missing');
  if (!input.includes("identity: 'neutral'")) fail('neutral identity default is missing');
  if (!input.includes("tone: 'warm'")) fail('warm tone default is missing');
  if (!input.includes("address_mode: 'tu'")) fail('tu address-mode default is missing');
  if (!input.includes('window.openAIChat({ initialPrompt: safePrompt });')) fail('home-to-assistant atomic handoff is missing');
  if (/window\.setTimeout\(function\(\)\{\s*window\.sendAIMessage\(safePrompt\)/.test(input)) fail('legacy delayed double-step handoff remains');
  return input;
}

function applyAssistantHumanPresence(input) {
  if (input.includes(MARKER)) return verifyAssistantHumanPresence(input);
  let html = replaceAssistantPage(String(input));
  html = applyHomeContinuity(html);
  html = html.split('\u{1F916}').join('');
  html = insertBeforeClosingTag(html, '</head>', ASSISTANT_STYLES, STYLE_ID);
  html = insertBeforeClosingTag(html, '</body>', ASSISTANT_RUNTIME, RUNTIME_ID);
  return verifyAssistantHumanPresence(html);
}

const ASSISTANT_HTML = `
<div class="page julvox-assistant-page" id="aiChatPage" data-assistant-human-presence="lot-a" aria-labelledby="julvoxAssistantTitle">
  <div class="page-head julvox-assistant-head">
    <button class="page-back" type="button" onclick="closePage('aiChatPage')" aria-label="Revenir à Julvox">← Retour</button>
    <div class="julvox-assistant-heading">
      <div class="page-title" id="julvoxAssistantTitle">Assistant Julvox</div>
      <div class="julvox-assistant-disclosure">Intelligence artificielle</div>
    </div>
    <div class="julvox-assistant-availability" role="status"><span aria-hidden="true"></span>Disponible</div>
  </div>
  <div class="page-body julvox-assistant-body">
    <div class="chat-messages julvox-assistant-messages" id="chatMessages" aria-live="polite" aria-relevant="additions text">
      <section class="julvox-assistant-welcome" id="julvoxAssistantWelcome" aria-labelledby="julvoxAssistantWelcomeTitle">
        <p class="julvox-assistant-kicker">Assistant Julvox · Intelligence artificielle</p>
        <h2 id="julvoxAssistantWelcomeTitle">Bonjour.</h2>
        <p>Parle-moi de ce que tu veux acheter, comparer ou de ce qui te fait hésiter.</p>
        <p>Je peux t’aider à clarifier tes besoins, comparer plusieurs options, comprendre leurs avantages et leurs limites, identifier les risques, tenir compte de ton budget et prendre une décision plus sereinement.</p>
        <strong>Qu’aimerais-tu décider aujourd’hui&nbsp;?</strong>
      </section>
    </div>
    <div class="julvox-assistant-quick-prompts" id="quickPrompts" aria-label="Raccourcis de conversation">
      <button class="quick-prompt" type="button" data-assistant-preset="Je veux choisir un produit adapté à mon besoin.">Choisir un produit</button>
      <button class="quick-prompt" type="button" data-assistant-preset="Je veux comparer deux options avant de décider.">Comparer deux options</button>
      <button class="quick-prompt" type="button" data-assistant-preset="Je veux explorer des idées avant de préciser mon choix.">Explorer des idées</button>
      <button class="quick-prompt" type="button" data-assistant-preset="J’hésite et j’ai besoin d’aide pour décider.">M’aider à décider</button>
      <button class="quick-prompt" type="button" data-assistant-preset="Je veux continuer une réflexion déjà commencée.">Continuer une réflexion</button>
    </div>
    <div class="julvox-assistant-status" id="julvoxAssistantStatus" role="status" aria-live="polite"></div>
    <div class="chat-input-row julvox-assistant-composer">
      <input id="chatInput" type="text" maxlength="1200" autocomplete="off" aria-label="Écrire à l’Assistant Julvox" placeholder="Décris ce que tu veux décider…"/>
      <button id="chatSendBtn" type="button" onclick="sendAIMessage()" aria-label="Envoyer le message">Envoyer</button>
    </div>
  </div>
</div>`;

const ASSISTANT_STYLES = `
<style id="${STYLE_ID}">
#aiChatPage.julvox-assistant-page{background:#FCF9F4;color:#0B1D34;}
#aiChatPage .julvox-assistant-head{align-items:center;gap:14px;background:#fffdf9;border-bottom:1px solid rgba(11,29,52,.10);}
#aiChatPage .julvox-assistant-heading{display:grid;gap:3px;min-width:0;}
#aiChatPage .julvox-assistant-heading .page-title{font-family:Sora,Inter,system-ui,sans-serif;font-size:19px;font-weight:650;color:#0B1D34;}
#aiChatPage .julvox-assistant-disclosure{font:600 11px/1.2 Inter,system-ui,sans-serif;letter-spacing:.02em;color:#66747D;}
#aiChatPage .julvox-assistant-availability{margin-left:auto;display:flex;align-items:center;gap:7px;font:600 11px/1 Inter,system-ui,sans-serif;color:#416A63;}
#aiChatPage .julvox-assistant-availability span{width:8px;height:8px;border-radius:50%;background:#0EA7A1;}
#aiChatPage .julvox-assistant-body{display:flex;flex-direction:column;height:calc(100vh - 120px);padding:0;background:#FCF9F4;}
#aiChatPage .julvox-assistant-messages{flex:1;padding:20px 16px;gap:14px;}
#aiChatPage .julvox-assistant-welcome{width:min(680px,100%);margin:auto;background:#fffdf9;border:1px solid rgba(11,29,52,.10);border-radius:22px;padding:22px;box-shadow:0 16px 42px rgba(43,34,23,.08);display:grid;gap:12px;color:#465762;font:500 14px/1.6 Inter,system-ui,sans-serif;}
#aiChatPage .julvox-assistant-welcome h2{margin:0;color:#0B1D34;font:650 24px/1.15 Sora,Inter,system-ui,sans-serif;}
#aiChatPage .julvox-assistant-welcome strong{color:#0B1D34;}
#aiChatPage .julvox-assistant-kicker{margin:0;color:#0B6764;font:650 12px/1.3 Inter,system-ui,sans-serif;}
#aiChatPage .julvox-assistant-quick-prompts{display:flex;gap:8px;overflow-x:auto;padding:10px 16px;border-top:1px solid rgba(11,29,52,.08);background:#fffdf9;scrollbar-width:none;}
#aiChatPage .julvox-assistant-quick-prompts::-webkit-scrollbar{display:none;}
#aiChatPage .quick-prompt{min-height:42px;padding:9px 13px;border-radius:999px;border:1px solid rgba(11,29,52,.13);background:#fff;color:#0B1D34;font:600 12px/1.2 Inter,system-ui,sans-serif;white-space:nowrap;}
#aiChatPage .quick-prompt:focus-visible,#aiChatPage #chatSendBtn:focus-visible,#aiChatPage #chatInput:focus-visible{outline:3px solid rgba(14,167,161,.30);outline-offset:2px;}
#aiChatPage .julvox-assistant-status{min-height:20px;padding:0 16px;background:#fffdf9;color:#65717C;font:600 11px/20px Inter,system-ui,sans-serif;}
#aiChatPage .julvox-assistant-composer{display:flex;gap:8px;padding:10px 16px max(12px,env(safe-area-inset-bottom));background:#fffdf9;border-top:1px solid rgba(11,29,52,.08);}
#aiChatPage #chatInput{flex:1;min-width:0;min-height:44px;border-radius:14px;border:1px solid rgba(11,29,52,.14);background:#fff;color:#0B1D34;padding:10px 13px;font:500 14px/1.3 Inter,system-ui,sans-serif;}
#aiChatPage #chatSendBtn{min-width:88px;min-height:44px;border:0;border-radius:14px;background:#0B1D34;color:#fff;padding:0 16px;font:650 13px/1 Inter,system-ui,sans-serif;}
#aiChatPage #chatSendBtn:disabled{opacity:.55;cursor:default;}
#aiChatPage .julvox-assistant-bubble{max-width:min(78%,680px);border-radius:17px;padding:12px 14px;white-space:pre-wrap;font:500 14px/1.55 Inter,system-ui,sans-serif;}
#aiChatPage .julvox-assistant-message{display:flex;}
#aiChatPage .julvox-assistant-message.user{justify-content:flex-end;}
#aiChatPage .julvox-assistant-message.assistant{justify-content:flex-start;}
#aiChatPage .julvox-assistant-message.user .julvox-assistant-bubble{background:#0B1D34;color:#fff;border-bottom-right-radius:5px;}
#aiChatPage .julvox-assistant-message.assistant .julvox-assistant-bubble{background:#fffdf9;color:#0B1D34;border:1px solid rgba(11,29,52,.10);border-bottom-left-radius:5px;}
@media(max-width:760px){#aiChatPage .julvox-assistant-body{height:calc(100vh - 104px)}#aiChatPage .julvox-assistant-messages{padding:16px 12px}#aiChatPage .julvox-assistant-welcome{padding:18px;border-radius:18px}#aiChatPage .julvox-assistant-quick-prompts,#aiChatPage .julvox-assistant-composer{padding-left:12px;padding-right:12px}#aiChatPage .julvox-assistant-bubble{max-width:88%}}
@media(prefers-reduced-motion:reduce){#aiChatPage *,#aiChatPage *::before,#aiChatPage *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
</style>`;

const ASSISTANT_RUNTIME = `
<script id="${RUNTIME_ID}">
(function julvoxAssistantHumanPresenceLotA(){
  'use strict';
  var DEFAULT_PREFERENCES = Object.freeze({ identity: 'neutral', tone: 'warm', address_mode: 'tu' });
  var ALLOWED = Object.freeze({
    identity: Object.freeze(['neutral','feminine','masculine']),
    tone: Object.freeze(['warm','concise','detailed','expert']),
    address_mode: Object.freeze(['tu','vous'])
  });
  var currentPreferences = normalize(window.JULVOX_ASSISTANT_PREFERENCES || DEFAULT_PREFERENCES);
  var assistantLoading = false;

  function normalize(value){
    var source = value && typeof value === 'object' ? value : {};
    return {
      identity: ALLOWED.identity.indexOf(source.identity) >= 0 ? source.identity : DEFAULT_PREFERENCES.identity,
      tone: ALLOWED.tone.indexOf(source.tone) >= 0 ? source.tone : DEFAULT_PREFERENCES.tone,
      address_mode: ALLOWED.address_mode.indexOf(source.address_mode) >= 0 ? source.address_mode : DEFAULT_PREFERENCES.address_mode
    };
  }

  function clone(value){ return { identity:value.identity, tone:value.tone, address_mode:value.address_mode }; }

  window.JULVOX_ASSISTANT_DEFAULT_PREFERENCES = DEFAULT_PREFERENCES;
  window.JULVOX_ASSISTANT_PREFERENCES = clone(currentPreferences);
  window.getJulvoxAssistantPreferences = function(){ return clone(currentPreferences); };
  window.setJulvoxAssistantPreferences = function(value){
    currentPreferences = normalize(value);
    window.JULVOX_ASSISTANT_PREFERENCES = clone(currentPreferences);
    return clone(currentPreferences);
  };

  function status(text){
    var node = document.getElementById('julvoxAssistantStatus');
    if (node) node.textContent = text || '';
  }

  function messages(){ return document.getElementById('chatMessages'); }

  function hideWelcome(){
    var welcome = document.getElementById('julvoxAssistantWelcome');
    if (welcome) welcome.hidden = true;
    var prompts = document.getElementById('quickPrompts');
    if (prompts) prompts.hidden = true;
  }

  function resetForInitialPrompt(){
    var container = messages();
    if (!container) return;
    container.innerHTML = '';
    var prompts = document.getElementById('quickPrompts');
    if (prompts) prompts.hidden = false;
  }

  function appendMessage(role, text){
    var container = messages();
    if (!container) return;
    var row = document.createElement('div');
    row.className = 'julvox-assistant-message ' + (role === 'user' ? 'user' : 'assistant');
    var bubble = document.createElement('div');
    bubble.className = 'julvox-assistant-bubble';
    bubble.textContent = String(text == null ? '' : text);
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function fallbackSelfReference(prefs){
    var withWord = prefs.address_mode === 'vous' ? 'vous' : 'toi';
    if (prefs.identity === 'feminine') return prefs.address_mode === 'vous' ? 'Je suis ravie de vous aider et prête à comparer les options avec vous.' : 'Je suis ravie de t’aider et prête à comparer les options avec toi.';
    if (prefs.identity === 'masculine') return prefs.address_mode === 'vous' ? 'Je suis ravi de vous aider et prêt à comparer les options avec vous.' : 'Je suis ravi de t’aider et prêt à comparer les options avec toi.';
    return prefs.address_mode === 'vous' ? 'Je peux vous aider à y voir plus clair et comparer les options avec vous.' : 'Je peux t’aider à y voir plus clair et comparer les options avec ' + withWord + '.';
  }

  function localFallback(message, prefs){
    var normalized = String(message || '').trim().toLowerCase();
    var vous = prefs.address_mode === 'vous';
    if (!normalized || /^(bonjour|salut|hello|bonsoir|coucou|aide|help)\\b/.test(normalized)) return fallbackSelfReference(prefs) + '\\n\\n' + (vous ? 'Parlez-moi de ce que vous voulez acheter, comparer ou de ce qui vous fait hésiter.' : 'Parle-moi de ce que tu veux acheter, comparer ou de ce qui te fait hésiter.');
    if (/compar|entre\\s+.+\\s+et\\s+|versus|\\bvs\\b/.test(normalized)) return vous ? 'On peut comparer ces options ensemble. Donnez-moi les deux choix et le critère qui compte le plus pour vous.' : 'On peut comparer ces options ensemble. Donne-moi les deux choix et le critère qui compte le plus pour toi.';
    if (/budget|€|euro|prix|max(?:imum)?/.test(normalized)) return vous ? 'Votre budget est un critère important. Quel montant maximum voulez-vous consacrer à cet achat, et sur quoi refusez-vous de faire un compromis ?' : 'Ton budget est un critère important. Quel montant maximum veux-tu consacrer à cet achat, et sur quoi refuses-tu de faire un compromis ?';
    if (/risque|fiable|durable|garantie|retour|hésit|incertain|peur/.test(normalized)) return vous ? 'Je peux vous aider à séparer les faits, les incertitudes et les risques qui peuvent réellement changer votre décision. Qu’est-ce qui vous inquiète le plus ?' : 'Je peux t’aider à séparer les faits, les incertitudes et les risques qui peuvent réellement changer ta décision. Qu’est-ce qui t’inquiète le plus ?';
    if (/idée|inspir|quoi choisir|que choisir|cherche|acheter|besoin/.test(normalized)) return vous ? 'Commençons par votre besoin réel. Quel usage est prioritaire, quel budget avez-vous en tête et quelle contrainte serait rédhibitoire ?' : 'Commençons par ton besoin réel. Quel usage est prioritaire, quel budget as-tu en tête et quelle contrainte serait rédhibitoire ?';
    return vous ? 'Je peux vous aider à clarifier cette décision. Quel est le critère qui pourrait le plus faire changer votre choix ?' : 'Je peux t’aider à clarifier cette décision. Quel est le critère qui pourrait le plus faire changer ton choix ?';
  }

  window.openAIChat = function(options){
    var settings = options && typeof options === 'object' ? options : {};
    if (typeof window.openPage === 'function') window.openPage('aiChatPage');
    else if (typeof openPage === 'function') openPage('aiChatPage');
    var initialPrompt = String(settings.initialPrompt || '').trim().slice(0,1200);
    if (initialPrompt) {
      resetForInitialPrompt();
      window.sendAIMessage(initialPrompt);
      return;
    }
    window.setTimeout(function(){ document.getElementById('chatInput')?.focus(); }, 120);
  };

  window.sendAIMessage = async function(preset){
    if (assistantLoading) return;
    var input = document.getElementById('chatInput');
    var message = String(preset || (input ? input.value : '') || '').trim().slice(0,1200);
    if (!message) return;
    if (input) input.value = '';
    hideWelcome();
    appendMessage('user', message);
    assistantLoading = true;
    var button = document.getElementById('chatSendBtn');
    if (button) button.disabled = true;
    status('Julvox analyse ta demande…');
    var prefs = window.getJulvoxAssistantPreferences();
    try {
      var sessionId = typeof AI_SESSION_ID !== 'undefined' ? AI_SESSION_ID : 'web_' + Math.random().toString(36).slice(2,10);
      var apiBase = typeof API !== 'undefined' ? API : '';
      var response = await fetch(apiBase + '/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ message: message, session_id: sessionId, assistant_preferences: prefs })
      });
      if (!response.ok) throw new Error('assistant response unavailable');
      var data = await response.json();
      appendMessage('assistant', data.response || localFallback(message, prefs));
      status('');
    } catch (_) {
      appendMessage('assistant', localFallback(message, prefs));
      status('Réponse locale affichée. La connexion avec l’Assistant est momentanément indisponible.');
    } finally {
      assistantLoading = false;
      if (button) button.disabled = false;
      if (input) input.focus();
    }
  };

  document.querySelectorAll('[data-assistant-preset]').forEach(function(button){
    button.addEventListener('click', function(){ window.sendAIMessage(button.getAttribute('data-assistant-preset') || ''); });
  });
  document.getElementById('chatInput')?.addEventListener('keydown', function(event){
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      window.sendAIMessage();
    }
  });
})();
</script>`;

module.exports = {
  ALLOWED_ASSISTANT_PREFERENCES,
  ASSISTANT_HTML,
  ASSISTANT_RUNTIME,
  ASSISTANT_STYLES,
  DEFAULT_ASSISTANT_PREFERENCES,
  applyAssistantHumanPresence,
  applyHomeContinuity,
  extractAssistantPage,
  fallbackSelfReference,
  localDecisionFallback,
  normalizeAssistantPreferences,
  verifyAssistantHumanPresence,
};
