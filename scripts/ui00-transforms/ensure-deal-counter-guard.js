const UNSAFE_COUNTER_ANCHOR = "  const start = parseInt(targetEl.textContent.replace(/\\D/g, '')) || 0;\n  const duration = 1500;";
const SAFE_COUNTER_ANCHOR = "  const start = parseInt(targetEl.textContent.replace(/\\D/g, '')) || 0;\n  if (start === targetValue) return;\n  const duration = 1500;";

function ensureDealCounterGuard(source) {
  const input = String(source);
  const unsafeCount = input.split(UNSAFE_COUNTER_ANCHOR).length - 1;
  const safeCount = input.split(SAFE_COUNTER_ANCHOR).length - 1;
  const functionCount = (input.match(/function\s+animateDealCounter\s*\(/g) || []).length;

  if (unsafeCount === 1 && safeCount === 0) {
    return input.replace(UNSAFE_COUNTER_ANCHOR, SAFE_COUNTER_ANCHOR);
  }
  if (unsafeCount === 0 && safeCount === 1) return input;
  if (functionCount === 0 && unsafeCount === 0 && safeCount === 0) return input;
  throw new Error(`UI-00 deal counter guard failed: function=${functionCount}, unsafe=${unsafeCount}, safe=${safeCount}`);
}

module.exports = { UNSAFE_COUNTER_ANCHOR, SAFE_COUNTER_ANCHOR, ensureDealCounterGuard };
