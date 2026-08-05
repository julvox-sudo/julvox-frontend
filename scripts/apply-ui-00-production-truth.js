const path = require('path');
const { createUi00Helpers } = require('./ui00-transforms/utils');
const functionSpans = require('./ui00-transforms/function-spans');
const { repairFlashUrlGuard } = require('./ui00-transforms/repair-flash-url-guard');
const { repairChatRenderer } = require('./ui00-transforms/repair-chat-renderer');
const { ensureLoadingStateHelper } = require('./ui00-transforms/ensure-loading-state-helper');
const { ensureDealCounterGuard } = require('./ui00-transforms/ensure-deal-counter-guard');
const { activatePriceHistoryRuntime } = require('./ui00-transforms/activate-price-history-runtime');
const { ensureMobileSearchFeedback } = require('./ui00-transforms/ensure-mobile-search-feedback');
const stages = [
  require('./ui00-transforms/stage-1'),
  require('./ui00-transforms/stage-2'),
  require('./ui00-transforms/stage-3'),
  require('./ui00-transforms/stage-4'),
  require('./ui00-transforms/stage-5'),
];

function applyProductionTruth(input) {
  const inputLooksLikeHtml = typeof input === 'string';
  const html = inputLooksLikeHtml ? input : input.html;
  const enhancements = inputLooksLikeHtml
    ? ''
    : (typeof input.enhancements === 'string' ? input.enhancements : '');
  const helpers = createUi00Helpers(html, enhancements);

  if (helpers.ALREADY_APPLIED && !helpers.LEGACY_RESIDUALS_PRESENT) {
    const verified = helpers.verifyAppliedOutput(html, enhancements);
    verified.html = ensureMobileSearchFeedback(verified.html);
    return helpers.verifyAppliedOutput(verified.html, verified.enhancements);
  }

  let output = { html, enhancements };
  for (const stage of stages) output = stage(output.html, output.enhancements, helpers);

  output.html = activatePriceHistoryRuntime(output.html);
  output.html = repairFlashUrlGuard(output.html);
  output.html = repairChatRenderer(output.html);
  output.html = ensureLoadingStateHelper(output.html);
  output.html = ensureMobileSearchFeedback(output.html);
  output.enhancements = ensureDealCounterGuard(output.enhancements);

  return helpers.verifyAppliedOutput(output.html, output.enhancements);
}

if (require.main === module) {
  const { runMutations } = require('./ui00-mutation-installer');
  runMutations({
    repoRoot: path.resolve(__dirname, '..'),
    install: ({ html, enhancements }) => applyProductionTruth({ html, enhancements }),
  });
}

module.exports = {
  applyProductionTruth,
  findNamedFunction: functionSpans.findNamedFunction,
  replaceNamedFunction: functionSpans.replaceNamedFunction,
  removeNamedFunction: functionSpans.removeNamedFunction,
  repairFlashUrlGuard,
  repairChatRenderer,
  ensureLoadingStateHelper,
  ensureDealCounterGuard,
  activatePriceHistoryRuntime,
  ensureMobileSearchFeedback,
  verifyAppliedOutput: (html, enhancements) => createUi00Helpers(html, enhancements).verifyAppliedOutput(html, enhancements),
};
