const PRICE_HISTORY_MARKER = '// ── PRICE HISTORY CHART (SVG interactif avec curseur) ─────────';
const DISABLED_BLOCK_END = '// ══ FIN ATTENTE ══ */';
const ACTIVE_BLOCK_END = '// ══ FIN ATTENTE ══';
const ACTIVE_PRICE_HISTORY_MARKER = `*/\n\n${PRICE_HISTORY_MARKER}`;

function activatePriceHistoryRuntime(source) {
  const input = String(source);
  const markerCount = input.split(PRICE_HISTORY_MARKER).length - 1;
  if (markerCount === 0) return input;
  if (markerCount !== 1) throw new Error(`UI-00 price history activation failed: expected one history marker, found ${markerCount}`);

  const start = input.indexOf(PRICE_HISTORY_MARKER);
  if (input.slice(Math.max(0, start - 4), start) === '*/\n\n') {
    const disabledEnd = input.indexOf(DISABLED_BLOCK_END, start);
    if (disabledEnd >= 0) throw new Error('UI-00 price history activation failed: active history still has a disabled block terminator');
    return input;
  }

  const end = input.indexOf(DISABLED_BLOCK_END, start);
  if (end < 0) throw new Error('UI-00 price history activation failed: disabled block terminator is missing after history');

  return `${input.slice(0, start)}${ACTIVE_PRICE_HISTORY_MARKER}${input.slice(start + PRICE_HISTORY_MARKER.length, end)}${ACTIVE_BLOCK_END}${input.slice(end + DISABLED_BLOCK_END.length)}`;
}

module.exports = {
  PRICE_HISTORY_MARKER,
  DISABLED_BLOCK_END,
  ACTIVE_BLOCK_END,
  ACTIVE_PRICE_HISTORY_MARKER,
  activatePriceHistoryRuntime,
};
