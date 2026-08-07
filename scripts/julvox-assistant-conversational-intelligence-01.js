const MARKER = 'julvox-assistant-conversational-intelligence-01-runtime';

const DEFAULT_PREFERENCES = Object.freeze({
  identity: 'neutral',
  tone: 'warm',
  address_mode: 'tu',
});

function normalizePreferences(input) {
  const value = input && typeof input === 'object' ? input : {};
  return {
    identity: ['neutral', 'feminine', 'masculine'].includes(value.identity) ? value.identity : 'neutral',
    tone: ['warm', 'concise', 'detailed', 'expert'].includes(value.tone) ? value.tone : 'warm',
    address_mode: ['tu', 'vous'].includes(value.address_mode) ? value.address_mode : 'tu',
  };
}

function createConversationState() {
  return { turnCount: 0, greeted: false, context: {}, askedFields: [] };
}

function parseBudget(message) {
  const match = String(message || '').match(/(^|\D)(\d{1,3}(?:[ .\u202f]\d{3})+|\d{2,6})(?:[,.]\d{1,2})?\s*(?:€|euros?\b)/i);
  if (!match) return null;
  const digits = match[2].replace(/\D/g, '');
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 && value <= 1000000 ? value : null;
}

function extractContext(message, current = {}) {
  const context = { ...current };
  const text = String(message || '').trim().replace(/\s+/g, ' ');
  const lowered = text.toLowerCase();
  const budget = parseBudget(text);
  if (budget !== null) context.budget_eur = budget;

  const age = text.match(/(^|\D)(\d{1,2})\s*ans\b/i);
  if (age) context.recipient_age = Number.parseInt(age[2], 10);
  const size = text.match(/(^|\D)(\d{2,3})\s*(?:pouces?|")/i);
  if (size) context.tv_size_inches = Number.parseInt(size[2], 10);

  if (/casque audio|\bcasque\b|écouteurs|ecouteurs/i.test(text)) context.product_category = 'casque audio';
  else if (/\b(tv|télé|tele|télévision|television)\b/i.test(text)) context.product_category = 'TV';

  if (/\b(?:pour )?mon fils\b/i.test(text)) context.recipient = 'fils';
  else if (/\b(?:pour )?ma fille\b/i.test(text)) context.recipient = 'fille';
  else if (/\b(?:pour )?mon enfant\b/i.test(text)) context.recipient = 'enfant';

  if (/sport|running|courir|course à pied|course a pied|entraînement|entrainement|salle de sport/i.test(text)) context.usage = 'sport';
  else if (/\bfilms?\b|cinéma|cinema/i.test(text)) context.usage = 'films';

  if (/pièce sombre|piece sombre|dans le noir|\bsombre\b/i.test(text)) context.room_light = 'sombre';
  if (/confort|confortable/i.test(text)) context.priority = 'confort';
  if (/sans compromis|aucun compromis/i.test(text)) context.quality_preference = 'sans compromis';
  if (/intra-auriculaire|intra auriculaire|\bintra\b|écouteurs|ecouteurs/i.test(text)) context.format = 'intra-auriculaire';
  else if (/autour des oreilles|circum-aural|circumaural|over-ear|over ear/i.test(text)) context.format = 'autour des oreilles';

  const exclusion = lowered.match(/\b(?:pas|sans)\s+(apple|samsung|sony|bose|jbl|beats)\b/i);
  if (exclusion) context.exclusion = exclusion[1][0].toUpperCase() + exclusion[1].slice(1).toLowerCase();
  if (/^\d{8,14}$/.test(text)) context.barcode = text;
  return context;
}

function formatEur(value) {
  return `${Number(value).toLocaleString('fr-FR')} €`;
}

function greetingFor(message, preferences, firstTurn) {
  const match = String(message || '').trim().match(/^(bonjour|salut|bonsoir|coucou)\b/i);
  if (match) {
    const word = match[1].toLowerCase();
    if (word === 'bonjour') return 'Bonjour';
    if (word === 'salut') return 'Salut';
    if (word === 'bonsoir') return 'Bonsoir';
    return preferences.tone === 'warm' ? 'Coucou' : 'Bonjour';
  }
  return firstTurn ? 'Bonjour' : '';
}

function selfReference(preferences) {
  const prefs = normalizePreferences(preferences);
  if (prefs.identity === 'feminine') {
    return prefs.address_mode === 'vous'
      ? 'Je suis ravie de vous aider et prête à regarder cela avec vous.'
      : 'Je suis ravie de t’aider et prête à regarder ça avec toi.';
  }
  if (prefs.identity === 'masculine') {
    return prefs.address_mode === 'vous'
      ? 'Je suis ravi de vous aider et prêt à regarder cela avec vous.'
      : 'Je suis ravi de t’aider et prêt à regarder ça avec toi.';
  }
  return prefs.address_mode === 'vous'
    ? 'Je peux vous aider et regarder cela avec vous.'
    : 'Je peux t’aider et regarder ça avec toi.';
}

function markAsked(state, field) {
  if (field && !state.askedFields.includes(field)) state.askedFields.push(field);
}

function scannerFallback(scannerContext, preferences, greeting) {
  const prefs = normalizePreferences(preferences);
  const source = scannerContext && typeof scannerContext === 'object' ? scannerContext : {};
  const code = /^\d{8,14}$/.test(String(source.code || '')) ? String(source.code) : 'ce code';
  const verified = source.verified === true && source.product && typeof source.product === 'object' && String(source.product.name || '').trim();
  const prefix = greeting ? `${greeting}. ` : '';
  if (!verified) {
    const action = prefs.address_mode === 'vous'
      ? 'Vous pouvez prendre une photo du produit, saisir son nom, scanner à nouveau ou ajouter le prix magasin si vous l’avez.'
      : 'Tu peux prendre une photo du produit, saisir son nom, scanner à nouveau ou ajouter le prix magasin si tu l’as.';
    return `${prefix}Je regarde si je trouve une correspondance pour le code ${code}.\n\nJe n’ai pas encore trouvé de correspondance suffisamment fiable pour le code ${code}. Je préfère ne pas inventer le produit.\n\n${action}`;
  }
  const product = source.product;
  const identity = [product.brand, product.name, product.model || product.variant].filter(value => typeof value === 'string' && value.trim()).map(value => `- ${value.trim()}`).join('\n');
  const facts = [];
  if (Number.isFinite(product.current_price)) facts.push(`Prix actuel observé : ${formatEur(product.current_price)}`);
  const stringFacts = [
    ['availability', 'Disponibilité'], ['warranty', 'Garantie'], ['provenance', 'Provenance'], ['freshness', 'Fraîcheur'],
  ];
  stringFacts.forEach(([key, label]) => {
    if (typeof product[key] === 'string' && product[key].trim()) facts.push(`${label} : ${product[key].trim()}`);
  });
  const verdicts = ['ACHETER MAINTENANT', 'ATTENDRE', 'COMPARER DAVANTAGE', 'NE PAS ACHETER', 'INFORMATIONS INSUFFISANTES'];
  const verdict = verdicts.includes(product.verdict) ? product.verdict : 'INFORMATIONS INSUFFISANTES';
  return `${prefix}Je regarde la correspondance vérifiée pour le code ${code}.\n\nJ’ai trouvé :\n${identity}\n\n${facts.length ? facts.map(value => `- ${value}`).join('\n') : '- Aucun autre élément vérifié n’est disponible pour le moment.'}\n\nVerdict : ${verdict}`;
}

function localConversationFallback(message, preferences, state, scannerContext = null) {
  const prefs = normalizePreferences(preferences);
  const active = state || createConversationState();
  const firstTurn = active.turnCount <= 1;
  const greeting = greetingFor(message, prefs, firstTurn);
  const prefix = greeting ? `${greeting}. ` : '';
  if (scannerContext) return scannerFallback(scannerContext, prefs, greeting);

  const lowered = String(message || '').trim().toLowerCase();
  if (['bonjour', 'salut', 'bonsoir', 'coucou'].includes(lowered)) {
    return `${prefix}${selfReference(prefs)} ${prefs.address_mode === 'vous' ? 'Dites-moi ce que vous voulez décider.' : 'Dis-moi ce que tu veux décider.'}`;
  }
  if (/^merci(?: beaucoup)?[.!]?$/.test(lowered)) {
    return prefs.address_mode === 'vous'
      ? 'Avec plaisir. Je garde le contexte en tête et nous pouvons continuer quand vous voulez.'
      : 'Avec plaisir. Je garde le contexte en tête et on peut continuer quand tu veux.';
  }

  const context = active.context || {};
  let analysis;
  let question = '';
  if (context.product_category === 'casque audio') {
    const recipient = prefs.address_mode === 'vous' && context.recipient === 'fils' ? 'votre fils'
      : prefs.address_mode === 'vous' && context.recipient === 'fille' ? 'votre fille'
      : context.recipient === 'fils' ? 'ton fils'
      : context.recipient === 'fille' ? 'ta fille' : 'cet usage';
    if (context.usage === 'sport' && context.budget_eur !== undefined) {
      analysis = `Pour ${recipient} et un usage sportif, avec un budget de ${formatEur(context.budget_eur)}, ${prefs.address_mode === 'vous' ? 'vous pouvez' : 'tu peux'} viser le haut de gamme de cette catégorie. Je privilégierais le maintien, la résistance à la transpiration, le confort, l’autonomie et la qualité sonore.`;
      if (context.quality_preference === 'sans compromis') analysis += ' Avec l’objectif sans compromis, je reste dans cette limite sans la dépasser.';
      if (!context.format && !active.askedFields.includes('format')) {
        question = prefs.address_mode === 'vous'
          ? `${context.recipient === 'fils' ? 'Votre fils préfère-t-il' : context.recipient === 'fille' ? 'Votre fille préfère-t-elle' : 'Préférez-vous'} des écouteurs intra-auriculaires ou un casque autour des oreilles ?`
          : `${context.recipient === 'fils' ? 'Ton fils préfère-t-il' : context.recipient === 'fille' ? 'Ta fille préfère-t-elle' : 'Tu préfères'} des écouteurs intra-auriculaires ou un casque autour des oreilles ?`;
        markAsked(active, 'format');
      }
    } else if (context.usage === 'sport') {
      analysis = `Pour ${recipient} et un usage sportif, je privilégierais d’abord le maintien, la résistance à la transpiration, le confort et l’autonomie.`;
    } else {
      analysis = `Pour ${recipient}, je peux déjà cadrer le choix d’un casque audio autour du confort, de la solidité, du type d’écoute et de l’usage principal.`;
      if (!context.usage && !active.askedFields.includes('usage')) {
        question = 'Quel sera l’usage principal ?';
        markAsked(active, 'usage');
      }
    }
  } else if (context.product_category === 'TV' && context.tv_size_inches && context.budget_eur !== undefined && context.usage && context.room_light) {
    analysis = `Pour une TV ${context.tv_size_inches} pouces à ${formatEur(context.budget_eur)}, surtout pour les films dans une pièce sombre, je privilégierais le contraste, la qualité des noirs, le rendu HDR et l’uniformité de la dalle.`;
  } else if (context.budget_eur !== undefined) {
    analysis = `Je retiens un budget de ${formatEur(context.budget_eur)} et je l’utiliserai comme limite, pas comme invitation à dépenser davantage.`;
  } else {
    analysis = prefs.address_mode === 'vous'
      ? 'Je peux déjà partir de ce que vous avez indiqué pour avancer sans vous faire répéter les mêmes informations.'
      : 'Je peux déjà partir de ce que tu as indiqué pour avancer sans te faire répéter les mêmes informations.';
  }
  return `${prefix}${analysis}${question ? `\n\n${question}` : ''}`;
}

function updateLocalState(state, message) {
  const active = state || createConversationState();
  active.turnCount += 1;
  active.context = extractContext(message, active.context);
  return active;
}

function createSessionId(randomSource = Math.random) {
  return `web_${Date.now().toString(36)}_${String(randomSource()).replace(/\D/g, '').slice(0, 10) || '0'}`;
}

const RUNTIME = `<script id="${MARKER}">
(function(){
  'use strict';
  var localState = ${JSON.stringify(createConversationState())};
  var conversationSessionId = 'web_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,10);
  var loading = false;

  function prefs(){
    return typeof window.getJulvoxAssistantPreferences === 'function'
      ? window.getJulvoxAssistantPreferences()
      : ${JSON.stringify(DEFAULT_PREFERENCES)};
  }
  function resetState(){ localState = { turnCount:0, greeted:false, context:{}, askedFields:[] }; }
  function newSession(){ conversationSessionId = 'web_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,10); resetState(); }
  function messages(){ return document.getElementById('chatMessages'); }
  function status(text){ var node=document.getElementById('julvoxAssistantStatus'); if(node) node.textContent=text||''; }
  function append(role,text){
    var container=messages(); if(!container) return;
    var row=document.createElement('div'); row.className='julvox-assistant-message '+(role==='user'?'user':'assistant');
    var bubble=document.createElement('div'); bubble.className='julvox-assistant-bubble'; bubble.textContent=String(text==null?'':text);
    row.appendChild(bubble); container.appendChild(row); container.scrollTop=container.scrollHeight;
  }
  function hideWelcome(){
    var welcome=document.getElementById('julvoxAssistantWelcome'); if(welcome) welcome.hidden=true;
    var prompts=document.getElementById('quickPrompts'); if(prompts) prompts.hidden=true;
  }
  function resetConversationDom(){
    var container=messages(); if(container) container.innerHTML='';
    var prompts=document.getElementById('quickPrompts'); if(prompts) prompts.hidden=false;
  }
  function parseBudget(message){
    var match=String(message||'').match(/(^|\\D)(\\d{1,3}(?:[ .\\u202f]\\d{3})+|\\d{2,6})(?:[,.]\\d{1,2})?\\s*(?:€|euros?\\b)/i);
    if(!match) return null; var digits=match[2].replace(/\\D/g,''); var value=parseInt(digits,10);
    return Number.isFinite(value)&&value>0&&value<=1000000?value:null;
  }
  function extract(message,current){
    var context=Object.assign({},current||{}); var text=String(message||'').trim().replace(/\\s+/g,' '); var lowered=text.toLowerCase(); var budget=parseBudget(text);
    if(budget!==null) context.budget_eur=budget;
    var age=text.match(/(^|\\D)(\\d{1,2})\\s*ans\\b/i); if(age) context.recipient_age=parseInt(age[2],10);
    var size=text.match(/(^|\\D)(\\d{2,3})\\s*(?:pouces?|\")/i); if(size) context.tv_size_inches=parseInt(size[2],10);
    if(/casque audio|\\bcasque\\b|écouteurs|ecouteurs/i.test(text)) context.product_category='casque audio'; else if(/\\b(tv|télé|tele|télévision|television)\\b/i.test(text)) context.product_category='TV';
    if(/\\b(?:pour )?mon fils\\b/i.test(text)) context.recipient='fils'; else if(/\\b(?:pour )?ma fille\\b/i.test(text)) context.recipient='fille';
    if(/sport|running|courir|course à pied|course a pied|entraînement|entrainement|salle de sport/i.test(text)) context.usage='sport'; else if(/\\bfilms?\\b|cinéma|cinema/i.test(text)) context.usage='films';
    if(/pièce sombre|piece sombre|dans le noir|\\bsombre\\b/i.test(text)) context.room_light='sombre'; if(/confort|confortable/i.test(text)) context.priority='confort'; if(/sans compromis|aucun compromis/i.test(text)) context.quality_preference='sans compromis';
    if(/intra-auriculaire|intra auriculaire|\\bintra\\b|écouteurs|ecouteurs/i.test(text)) context.format='intra-auriculaire'; else if(/autour des oreilles|circum-aural|circumaural|over-ear|over ear/i.test(text)) context.format='autour des oreilles';
    var exclusion=lowered.match(/\\b(?:pas|sans)\\s+(apple|samsung|sony|bose|jbl|beats)\\b/i); if(exclusion) context.exclusion=exclusion[1].charAt(0).toUpperCase()+exclusion[1].slice(1).toLowerCase(); if(/^\\d{8,14}$/.test(text)) context.barcode=text; return context;
  }
  function eur(value){ return Number(value).toLocaleString('fr-FR')+' €'; }
  function greeting(message,p,first){ var m=String(message||'').trim().match(/^(bonjour|salut|bonsoir|coucou)\\b/i); if(m){var w=m[1].toLowerCase();if(w==='bonjour')return'Bonjour';if(w==='salut')return'Salut';if(w==='bonsoir')return'Bonsoir';return p.tone==='warm'?'Coucou':'Bonjour';}return first?'Bonjour':''; }
  function selfRef(p){if(p.identity==='feminine')return p.address_mode==='vous'?'Je suis ravie de vous aider et prête à regarder cela avec vous.':'Je suis ravie de t’aider et prête à regarder ça avec toi.';if(p.identity==='masculine')return p.address_mode==='vous'?'Je suis ravi de vous aider et prêt à regarder cela avec vous.':'Je suis ravi de t’aider et prêt à regarder ça avec toi.';return p.address_mode==='vous'?'Je peux vous aider et regarder cela avec vous.':'Je peux t’aider et regarder ça avec toi.';}
  function mark(field){if(field&&localState.askedFields.indexOf(field)<0)localState.askedFields.push(field);}
  function localFallback(message,p,scanner){
    var first=localState.turnCount<=1;var hello=greeting(message,p,first);var prefix=hello?hello+'. ':'';var lowered=String(message||'').trim().toLowerCase();
    if(scanner){var code=/^\\d{8,14}$/.test(String(scanner.code||''))?String(scanner.code):'ce code';var verified=scanner.verified===true&&scanner.product&&typeof scanner.product==='object'&&String(scanner.product.name||'').trim();if(!verified)return prefix+'Je regarde si je trouve une correspondance pour le code '+code+'.\\n\\nJe n’ai pas encore trouvé de correspondance suffisamment fiable pour le code '+code+'. Je préfère ne pas inventer le produit.\\n\\n'+(p.address_mode==='vous'?'Vous pouvez prendre une photo du produit, saisir son nom, scanner à nouveau ou ajouter le prix magasin si vous l’avez.':'Tu peux prendre une photo du produit, saisir son nom, scanner à nouveau ou ajouter le prix magasin si tu l’as.');var product=scanner.product;var identity=[product.brand,product.name,product.model||product.variant].filter(Boolean).map(function(v){return'- '+String(v).trim();}).join('\\n');var verdict=['ACHETER MAINTENANT','ATTENDRE','COMPARER DAVANTAGE','NE PAS ACHETER','INFORMATIONS INSUFFISANTES'].indexOf(product.verdict)>=0?product.verdict:'INFORMATIONS INSUFFISANTES';return prefix+'Je regarde la correspondance vérifiée pour le code '+code+'.\\n\\nJ’ai trouvé :\\n'+identity+'\\n\\nVerdict : '+verdict;}
    if(['bonjour','salut','bonsoir','coucou'].indexOf(lowered)>=0)return prefix+selfRef(p)+' '+(p.address_mode==='vous'?'Dites-moi ce que vous voulez décider.':'Dis-moi ce que tu veux décider.');
    if(/^merci(?: beaucoup)?[.!]?$/.test(lowered))return p.address_mode==='vous'?'Avec plaisir. Je garde le contexte en tête et nous pouvons continuer quand vous voulez.':'Avec plaisir. Je garde le contexte en tête et on peut continuer quand tu veux.';
    var c=localState.context||{};var analysis='';var question='';
    if(c.product_category==='casque audio'){var recipient=p.address_mode==='vous'&&c.recipient==='fils'?'votre fils':p.address_mode==='vous'&&c.recipient==='fille'?'votre fille':c.recipient==='fils'?'ton fils':c.recipient==='fille'?'ta fille':'cet usage';if(c.usage==='sport'&&c.budget_eur!==undefined){analysis='Pour '+recipient+' et un usage sportif, avec un budget de '+eur(c.budget_eur)+', '+(p.address_mode==='vous'?'vous pouvez':'tu peux')+' viser le haut de gamme de cette catégorie. Je privilégierais le maintien, la résistance à la transpiration, le confort, l’autonomie et la qualité sonore.';if(c.quality_preference==='sans compromis')analysis+=' Avec l’objectif sans compromis, je reste dans cette limite sans la dépasser.';if(!c.format&&localState.askedFields.indexOf('format')<0){question=p.address_mode==='vous'?(c.recipient==='fils'?'Votre fils préfère-t-il des écouteurs intra-auriculaires ou un casque autour des oreilles ?':c.recipient==='fille'?'Votre fille préfère-t-elle des écouteurs intra-auriculaires ou un casque autour des oreilles ?':'Préférez-vous des écouteurs intra-auriculaires ou un casque autour des oreilles ?'):(c.recipient==='fils'?'Ton fils préfère-t-il des écouteurs intra-auriculaires ou un casque autour des oreilles ?':c.recipient==='fille'?'Ta fille préfère-t-elle des écouteurs intra-auriculaires ou un casque autour des oreilles ?':'Tu préfères des écouteurs intra-auriculaires ou un casque autour des oreilles ?');mark('format');}}else{analysis='Pour '+recipient+', je peux déjà cadrer le choix d’un casque audio autour du confort, de la solidité, du type d’écoute et de l’usage principal.';if(!c.usage&&localState.askedFields.indexOf('usage')<0){question='Quel sera l’usage principal ?';mark('usage');}}}
    else if(c.product_category==='TV'&&c.tv_size_inches&&c.budget_eur!==undefined&&c.usage&&c.room_light)analysis='Pour une TV '+c.tv_size_inches+' pouces à '+eur(c.budget_eur)+', surtout pour les films dans une pièce sombre, je privilégierais le contraste, la qualité des noirs, le rendu HDR et l’uniformité de la dalle.';
    else if(c.budget_eur!==undefined)analysis='Je retiens un budget de '+eur(c.budget_eur)+' et je l’utiliserai comme limite, pas comme invitation à dépenser davantage.';
    else analysis=p.address_mode==='vous'?'Je peux déjà partir de ce que vous avez indiqué pour avancer sans vous faire répéter les mêmes informations.':'Je peux déjà partir de ce que tu as indiqué pour avancer sans te faire répéter les mêmes informations.';
    return prefix+analysis+(question?'\\n\\n'+question:'');
  }

  window.startNewJulvoxAssistantConversation=function(){newSession();resetConversationDom();status('');return conversationSessionId;};
  window.openAIChat=function(options){var settings=options&&typeof options==='object'?options:{};if(typeof window.openPage==='function')window.openPage('aiChatPage');else if(typeof openPage==='function')openPage('aiChatPage');var initial=String(settings.initialPrompt||'').trim().slice(0,1200);if(initial){newSession();resetConversationDom();window.sendAIMessage(initial);return;}window.setTimeout(function(){var input=document.getElementById('chatInput');if(input)input.focus();},120);};
  window.sendAIMessage=async function(preset,options){if(loading)return;var input=document.getElementById('chatInput');var message=String(preset||(input?input.value:'')||'').trim().slice(0,1200);if(!message)return;if(input)input.value='';hideWelcome();append('user',message);localState.turnCount+=1;localState.context=extract(message,localState.context);loading=true;var button=document.getElementById('chatSendBtn');if(button)button.disabled=true;status('Julvox analyse ta demande…');var p=prefs();var settings=options&&typeof options==='object'?options:{};var scanner=settings.scanner_context&&typeof settings.scanner_context==='object'?settings.scanner_context:null;try{var apiBase=typeof API!=='undefined'?API:'';var response=await fetch(apiBase+'/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:message,session_id:conversationSessionId,assistant_preferences:p,scanner_context:scanner})});if(!response.ok)throw new Error('assistant response unavailable');var data=await response.json();append('assistant',data.response||localFallback(message,p,scanner));localState.greeted=true;status('');}catch(_){append('assistant',localFallback(message,p,scanner));localState.greeted=true;status('Réponse locale affichée. La connexion avec l’Assistant est momentanément indisponible.');}finally{loading=false;if(button)button.disabled=false;if(input)input.focus();}};
  window.sendJulvoxScannerMessage=function(scannerContext){var scanner=scannerContext&&typeof scannerContext==='object'?scannerContext:{};var code=String(scanner.code||'').trim();if(!/^\\d{8,14}$/.test(code))return false;window.sendAIMessage(code,{scanner_context:scanner});return true;};
})();
</script>`;

function integrate(input) {
  const html = String(input);
  if (html.includes(`id="${MARKER}"`)) return html;
  if (!html.includes('julvox-assistant-human-presence-02-runtime')) {
    throw new Error('Conversational intelligence requires Lot A runtime first');
  }
  const closing = html.lastIndexOf('</body>');
  if (closing < 0) throw new Error('Missing </body>');
  return html.slice(0, closing) + RUNTIME + '\n' + html.slice(closing);
}

function verify(input) {
  const html = String(input);
  for (const required of [
    `id="${MARKER}"`,
    'startNewJulvoxAssistantConversation',
    'sendJulvoxScannerMessage',
    'session_id:conversationSessionId',
    'scanner_context:scanner',
    "localState.turnCount+=1",
    "localState.context=extract(message,localState.context)",
  ]) {
    if (!html.includes(required)) throw new Error(`Missing conversational runtime contract: ${required}`);
  }
  return html;
}

module.exports = {
  DEFAULT_PREFERENCES,
  RUNTIME,
  createConversationState,
  createSessionId,
  extractContext,
  formatEur,
  greetingFor,
  integrate,
  localConversationFallback,
  normalizePreferences,
  scannerFallback,
  selfReference,
  updateLocalState,
  verify,
};
