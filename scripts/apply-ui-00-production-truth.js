const fs = require('fs');
const path = require('path');
const baseHelpers = require('./ui00-transforms/utils');
const functionHelpers = require('./ui00-transforms/function-spans');
const helpers = { ...baseHelpers, ...functionHelpers };
const { centralizeApiCalls } = require('./ui00-transforms/centralize-api-calls');
const { repairFlashUrlGuard } = require('./ui00-transforms/repair-flash-url-guard');
const { repairChatRenderer } = require('./ui00-transforms/repair-chat-renderer');
const { ensureLoadingStateHelper } = require('./ui00-transforms/ensure-loading-state-helper');
const { ensureDealCounterGuard } = require('./ui00-transforms/ensure-deal-counter-guard');
const { activatePriceHistoryRuntime } = require('./ui00-transforms/activate-price-history-runtime');
const { ensureMobileSearchFeedback } = require('./ui00-transforms/ensure-mobile-search-feedback');
const { ensureGlobalErrorBoundary } = require('./ui00-transforms/ensure-global-error-boundary');
const stages = [
  require('./ui00-transforms/stage-1'),
  require('./ui00-transforms/stage-2'),
  require('./ui00-transforms/stage-3'),
  require('./ui00-transforms/stage-4'),
  require('./ui00-transforms/stage-5'),
];

const root = process.cwd();
const indexPath = path.join(root, 'dist', 'index.html');
const enhancementsPath = path.join(root, 'dist', 'enhancements_v3.js');

function applyProductionTruth(input) {
  let { html, enhancements } = input;
  const htmlMarked = html.includes(helpers.HTML_MARKER);
  const enhancementsMarked = enhancements.includes(helpers.ENHANCEMENTS_MARKER);
  if (htmlMarked || enhancementsMarked) {
    if (!htmlMarked || !enhancementsMarked) helpers.fail('partial prior transformation detected');
    return helpers.verifyAppliedOutput(html, enhancements);
  }
  html = ensureGlobalErrorBoundary(html);
  for (const stage of stages) ({ html, enhancements } = stage(html, enhancements, helpers));
  html = activatePriceHistoryRuntime(html);
  html = repairFlashUrlGuard(html);
  html = repairChatRenderer(html);
  html = ensureLoadingStateHelper(html);
  html = ensureMobileSearchFeedback(html);
  enhancements = ensureDealCounterGuard(enhancements);
  html = centralizeApiCalls(html);
  enhancements = centralizeApiCalls(enhancements);
  return helpers.verifyAppliedOutput(html, enhancements);
}

if (require.main === module) {
  if (!fs.existsSync(indexPath) || !fs.existsSync(enhancementsPath)) helpers.fail('dist runtime files are missing');
  const result = applyProductionTruth({
    html: fs.readFileSync(indexPath, 'utf8'),
    enhancements: fs.readFileSync(enhancementsPath, 'utf8'),
  });
  fs.writeFileSync(indexPath, result.html, 'utf8');
  fs.writeFileSync(enhancementsPath, result.enhancements, 'utf8');
  console.log('UI-00 production truth applied to dist/.');
}

module.exports = {
  HTML_MARKER: helpers.HTML_MARKER,
  ENHANCEMENTS_MARKER: helpers.ENHANCEMENTS_MARKER,
  applyProductionTruth,
  findMatchingBrace: helpers.findMatchingBrace,
  replaceNamedFunction: helpers.replaceNamedFunction,
  centralizeApiCalls,
  repairFlashUrlGuard,
  repairChatRenderer,
  ensureLoadingStateHelper,
  ensureDealCounterGuard,
  activatePriceHistoryRuntime,
  ensureMobileSearchFeedback,
  ensureGlobalErrorBoundary,
  verifyAppliedOutput: helpers.verifyAppliedOutput,
};