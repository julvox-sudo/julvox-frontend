const MARKER = 'julvox-p5-conversation-resume-01';
const RENDER_ANCHOR = "  function renderConversation(conversation){resetDom();var history=conversation&&Array.isArray(conversation.messages)?conversation.messages:[];if(history.length)hideWelcome();history.forEach(function(item){if(item&&(item.role==='user'||item.role==='assistant'))append(item.role,item.content);});}";
const SEND_ANCHOR = "window.sendAIMessage=async function(preset,options){if(loading)return;";

function cleanResumeValue(value, limit) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 500);
}

function uniqueResumeValues(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const normalized = cleanResumeValue(value, 300);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function formatResumeBudget(context) {
  const source = context && typeof context === 'object' ? context : {};
  const budget = source.budget;
  if (!Number.isInteger(budget) || budget <= 0) return '';
  const rendered = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(budget);
  const currency = cleanResumeValue(source.currency, 3).toUpperCase();
  return currency === 'EUR' ? `${rendered} €` : currency ? `${rendered} ${currency}` : rendered;
}

function resumeNeed(context) {
  const source = context && typeof context === 'object' ? context : {};
  const product = source.identified_product && typeof source.identified_product === 'object' ? source.identified_product : {};
  return cleanResumeValue(product.name, 300)
    || cleanResumeValue(source.product_type, 160)
    || cleanResumeValue(source.product_category, 160);
}

function resumeConstraints(context) {
  const source = context && typeof context === 'object' ? context : {};
  const rows = [];
  const recipient = cleanResumeValue(source.recipient, 80);
  const usage = cleanResumeValue(source.usage, 160);
  const preferredFormat = cleanResumeValue(source.preferred_format, 160);
  const brand = cleanResumeValue(source.brand_preference, 160);
  if (recipient) rows.push(`destinataire : ${recipient}`);
  if (usage) rows.push(`usage : ${usage}`);
  if (preferredFormat) rows.push(`format : ${preferredFormat}`);
  if (brand) rows.push(`marque indiquée ici : ${brand}`);

  const priorities = uniqueResumeValues(Array.isArray(source.priorities) ? source.priorities : []);
  if (priorities.length) rows.push(`priorités : ${priorities.join(', ')}`);
  const exclusions = uniqueResumeValues(Array.isArray(source.exclusions) ? source.exclusions : []);
  if (exclusions.length) rows.push(`à éviter : ${exclusions.join(', ')}`);

  const constraints = source.constraints && typeof source.constraints === 'object' ? source.constraints : {};
  if (Number.isInteger(constraints.tv_size_inches)) rows.push(`taille TV : ${constraints.tv_size_inches} pouces`);
  if (
    typeof constraints.viewing_distance_m === 'number'
    && Number.isFinite(constraints.viewing_distance_m)
    && constraints.viewing_distance_m > 0
  ) {
    rows.push(`distance : ${String(constraints.viewing_distance_m).replace('.', ',')} m`);
  }
  const roomLight = cleanResumeValue(constraints.room_light, 120);
  if (roomLight) rows.push(`luminosité : ${roomLight}`);
  const quality = cleanResumeValue(constraints.quality_preference, 120);
  if (quality) rows.push(`qualité : ${quality}`);
  return rows;
}

function pendingResumeLabel(value) {
  const labels = Object.freeze({
    product_type: 'type de produit',
    brand_preference: 'marque éventuelle',
    budget: 'budget',
    usage: 'usage principal',
    preferred_format: 'format préféré dans cette conversation',
    viewing_distance_m: 'distance de visionnage',
    recap_confirmation: 'confirmation du récapitulatif',
    recap_correction: 'correction du récapitulatif',
  });
  return labels[cleanResumeValue(value, 80)] || '';
}

function resumeStage(conversation) {
  const source = conversation && typeof conversation === 'object' ? conversation : {};
  const clarification = source.clarification && typeof source.clarification === 'object' ? source.clarification : {};
  const readiness = cleanResumeValue(clarification.readiness, 40);
  if (source.status === 'closed') {
    return {
      code: 'CONVERSATION_COMPLETED',
      label: 'Cette conversation était clôturée. Son contexte enregistré reste disponible.',
    };
  }
  if (cleanResumeValue(source.decision_id || source.decisionId, 128)) {
    return {
      code: 'DECISION_AVAILABLE',
      label: 'Une décision est déjà enregistrée dans cette conversation. Elle reste un instantané historique.',
    };
  }
  if (readiness === 'ready_for_product_search' && clarification.recap_confirmed === true) {
    return { code: 'RECAP_CONFIRMED', label: 'Le récapitulatif est confirmé.' };
  }
  if (readiness === 'awaiting_recap_confirmation') {
    return { code: 'RECAP_PENDING', label: 'Le récapitulatif est prêt et attend sa confirmation.' };
  }
  if (readiness === 'product_identified') {
    return { code: 'PRODUCT_NEED_KNOWN', label: 'Le produit est identifié dans cette conversation.' };
  }
  if (readiness === 'collecting') {
    const pending = pendingResumeLabel(clarification.pending_question);
    return {
      code: 'COLLECTING',
      label: pending
        ? `Une information restait à préciser : ${pending}.`
        : 'Le besoin est encore en cours de précision.',
    };
  }
  return { code: 'UNKNOWN', label: '' };
}

function buildResumeContext(conversation) {
  const source = conversation && typeof conversation === 'object' ? conversation : {};
  const context = source.context && typeof source.context === 'object' ? source.context : {};
  const clarification = source.clarification && typeof source.clarification === 'object' ? source.clarification : {};
  const stage = resumeStage(source);
  return {
    need: resumeNeed(context),
    budget: formatResumeBudget(context),
    constraints: resumeConstraints(context),
    stageCode: stage.code,
    stageLabel: stage.label,
    pendingQuestion: pendingResumeLabel(clarification.pending_question),
    recapConfirmed: clarification.recap_confirmed === true,
    decisionAvailable: Boolean(cleanResumeValue(source.decision_id || source.decisionId, 128)),
    answeredFields: Array.isArray(clarification.answered_fields)
      ? clarification.answered_fields.map((value) => cleanResumeValue(value, 80)).filter(Boolean)
      : [],
  };
}

function buildResumeCueText(summary) {
  const data = summary && typeof summary === 'object' ? summary : {};
  const lines = ['Reprise de cette conversation'];
  if (cleanResumeValue(data.need, 300)) lines.push(`Tu cherchais : ${cleanResumeValue(data.need, 300)}`);
  if (cleanResumeValue(data.budget, 80)) lines.push(`Budget connu ici : ${cleanResumeValue(data.budget, 80)}`);
  const constraints = Array.isArray(data.constraints)
    ? data.constraints.map((value) => cleanResumeValue(value, 300)).filter(Boolean)
    : [];
  if (constraints.length) lines.push(`Contexte connu ici : ${constraints.join(' · ')}`);
  if (cleanResumeValue(data.stageLabel, 500)) {
    lines.push(`Nous en étions ici : ${cleanResumeValue(data.stageLabel, 500)}`);
  }
  if (data.decisionAvailable === true && data.stageCode !== 'DECISION_AVAILABLE') {
    lines.push('Une décision est déjà enregistrée ici ; elle reste un instantané historique.');
  }
  const hasSpecific = Boolean(
    data.need || data.budget || constraints.length || data.stageLabel || data.decisionAvailable,
  );
  lines.push(
    hasSpecific
      ? 'On peut reprendre à partir de là.'
      : 'On peut reprendre cette conversation à partir du dernier échange enregistré.',
  );
  return lines.join('\n');
}

const RUNTIME_PATCH = `  /* ${MARKER} */
  ${cleanResumeValue.toString()}
  ${uniqueResumeValues.toString()}
  ${formatResumeBudget.toString()}
  ${resumeNeed.toString()}
  ${resumeConstraints.toString()}
  ${pendingResumeLabel.toString()}
  ${resumeStage.toString()}
  ${buildResumeContext.toString()}
  ${buildResumeCueText.toString()}
  function clearResumeContext(){var existing=document.querySelector('[data-julvox-resume-context="true"]');if(existing)existing.remove();}
  function appendResumeContext(conversation){var container=messages();if(!container)return;clearResumeContext();var summary=buildResumeContext(conversation);var text=buildResumeCueText(summary);if(!text)return;hideWelcome();var row=document.createElement('div');row.className='julvox-assistant-message assistant julvox-p5-resume-context';row.setAttribute('role','status');row.setAttribute('aria-label','Reprise de cette conversation');var bubble=document.createElement('div');bubble.className='julvox-assistant-bubble';bubble.setAttribute('data-julvox-resume-context','true');bubble.style.whiteSpace='pre-line';bubble.textContent=text;row.appendChild(bubble);container.appendChild(row);container.scrollTop=container.scrollHeight;}
  function renderConversation(conversation){resetDom();var history=conversation&&Array.isArray(conversation.messages)?conversation.messages:[];if(history.length)hideWelcome();history.forEach(function(item){if(item&&(item.role==='user'||item.role==='assistant'))append(item.role,item.content);});appendResumeContext(conversation);}`;

function fail(message) {
  throw new Error(`JULVOX-P5-CONVERSATION-RESUME-01 integration failed: ${message}`);
}

function verify(input) {
  const html = String(input || '');
  if ((html.match(new RegExp(MARKER, 'g')) || []).length !== 1) fail('marker must appear exactly once');
  for (const prerequisite of [
    'julvox-conversation-source-of-truth-02-runtime',
    'julvox-p5-decision-history-01-runtime',
    'julvox-p5-decision-timeline-01-runtime',
    'julvox-p5-structured-explainability-01-runtime',
  ]) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  if (html.includes(RENDER_ANCHOR)) fail('canonical render anchor was not upgraded');
  if (!html.includes('data-julvox-resume-context')) fail('resume cue is missing');
  if (!html.includes(SEND_ANCHOR + 'clearResumeContext();')) {
    fail('resume cue must be transient once the user sends a new turn');
  }
  for (const forbidden of ['fetch(', 'localStorage', 'POST', 'PATCH', 'preference memory', 'DecisionEngine']) {
    if (RUNTIME_PATCH.includes(forbidden)) fail(`runtime patch contains forbidden authority ${forbidden}`);
  }
  return html;
}

function integrate(input) {
  let html = String(input || '');
  if (html.includes(MARKER)) return verify(html);
  for (const prerequisite of [
    'id="julvox-conversation-source-of-truth-02-runtime"',
    'id="julvox-p5-decision-history-01-runtime"',
    'id="julvox-p5-decision-timeline-01-runtime"',
    'id="julvox-p5-structured-explainability-01-runtime"',
  ]) {
    if (!html.includes(prerequisite)) fail(`missing prerequisite ${prerequisite}`);
  }
  const renderCount = html.split(RENDER_ANCHOR).length - 1;
  if (renderCount !== 1) fail(`canonical render anchor count is ${renderCount}`);
  const sendCount = html.split(SEND_ANCHOR).length - 1;
  if (sendCount !== 1) fail(`send anchor count is ${sendCount}`);
  html = html.replace(RENDER_ANCHOR, RUNTIME_PATCH);
  html = html.replace(SEND_ANCHOR, `${SEND_ANCHOR}clearResumeContext();`);
  return verify(html);
}

module.exports = {
  MARKER,
  RENDER_ANCHOR,
  SEND_ANCHOR,
  RUNTIME_PATCH,
  cleanResumeValue,
  formatResumeBudget,
  resumeNeed,
  resumeConstraints,
  pendingResumeLabel,
  resumeStage,
  buildResumeContext,
  buildResumeCueText,
  integrate,
  verify,
};
