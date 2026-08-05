const MALFORMED_FLASH_URL_GUARD = "if (url && /^https?:///i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');";
const SAFE_FLASH_URL_GUARD = "if (url && (url.startsWith('https://') || url.startsWith('http://'))) window.open(url, '_blank', 'noopener,noreferrer');";

function repairFlashUrlGuard(source) {
  const input = String(source);
  const malformedCount = input.split(MALFORMED_FLASH_URL_GUARD).length - 1;
  const safeCount = input.split(SAFE_FLASH_URL_GUARD).length - 1;

  if (malformedCount === 1 && safeCount === 0) {
    return input.replace(MALFORMED_FLASH_URL_GUARD, SAFE_FLASH_URL_GUARD);
  }
  if (malformedCount === 0 && safeCount === 1) return input;
  throw new Error(`UI-00 flash URL guard repair failed: expected one malformed or safe guard, found malformed=${malformedCount}, safe=${safeCount}`);
}

module.exports = {
  MALFORMED_FLASH_URL_GUARD,
  SAFE_FLASH_URL_GUARD,
  repairFlashUrlGuard,
};
