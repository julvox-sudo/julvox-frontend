const PHOTO_BUG = "function photoChanged(event){ resetPhotoMemory(); var file=event.target.files&&event.target.files[0];";
const PHOTO_FIX = "function photoChanged(event){ var file=event.target.files&&event.target.files[0]; resetPhotoMemory();";

function hardenSmartScanExperience(html) {
  if (typeof html !== 'string') throw new Error('Smart Scan hardening expects HTML text');
  if (!html.includes(PHOTO_BUG)) {
    if (html.includes(PHOTO_FIX)) return html;
    throw new Error('Smart Scan photo input hardening target not found');
  }
  return html.replace(PHOTO_BUG, PHOTO_FIX);
}

function verifySmartScanHardening(html) {
  if (html.includes(PHOTO_BUG)) throw new Error('Smart Scan photo input still clears before capture');
  if (!html.includes(PHOTO_FIX)) throw new Error('Smart Scan photo input hardening missing');
  return true;
}

module.exports = { PHOTO_BUG, PHOTO_FIX, hardenSmartScanExperience, verifySmartScanHardening };
