const PHOTO_BUG = "function photoChanged(event){ resetPhotoMemory(); var file=event.target.files&&event.target.files[0];";
const PHOTO_FIX = "function photoChanged(event){ var file=event.target.files&&event.target.files[0]; resetPhotoMemory(); photoDraftId='';";
const PHOTO_DRAFT_STATE_TARGET = "var photoObjectUrl = '';\n  var cameraPoll = 0;";
const PHOTO_DRAFT_STATE_FIX = "var photoObjectUrl = '';\n  var photoDraftId = '';\n  var cameraPoll = 0;";
const SAVE_SIGNATURE_TARGET = 'async function saveDraft(silent){';
const SAVE_SIGNATURE_FIX = 'async function saveDraft(silent,includePhoto){';
const SAVE_PHOTO_TARGET = "if(currentMode==='photo'&&photoFile){ try{await savePhotoDraft(id,photoFile);data.photoLocal=true;";
const SAVE_PHOTO_FIX = "if(includePhoto!==false&&currentMode==='photo'&&photoFile){ try{await savePhotoDraft(id,photoFile);photoDraftId=id;data.photoLocal=true;";
const AUTO_SAVE_TARGET = 'await saveDraft(true);';
const AUTO_SAVE_FIX = 'await saveDraft(true,false);';
const RESTORE_TARGET = "if(row&&row.blob){photoFile=new File([row.blob],row.name||'photo-produit',{type:row.type||row.blob.type});";
const RESTORE_FIX = "if(row&&row.blob){photoDraftId=id;photoFile=new File([row.blob],row.name||'photo-produit',{type:row.type||row.blob.type});";
const PROCESS_TARGET = "if(currentMode==='photo') resetPhotoMemory();";
const PROCESS_FIX = "if(currentMode==='photo'){ if(photoDraftId){await deletePhotoDraft(photoDraftId);photoDraftId='';} resetPhotoMemory(); }";
const FROZEN_SCANNER_MUTATION_TARGET = "var scanner=window.JulvoxProductScanner||{};scanner.open=function(){open('barcode');};scanner.stop=function(){close();};window.JulvoxProductScanner=scanner;";
const FROZEN_SCANNER_MUTATION_FIX = "var scanner=window.JulvoxProductScanner||{};window.JulvoxProductScanner=Object.assign({},scanner,{open:function(){open('barcode');},stop:function(){close();}});";

function replaceRequired(html, target, replacement, label) {
  if (html.includes(replacement)) return html;
  if (!html.includes(target)) throw new Error(`Smart Scan hardening target not found: ${label}`);
  return html.replace(target, replacement);
}

function hardenSmartScanExperience(html) {
  if (typeof html !== 'string') throw new Error('Smart Scan hardening expects HTML text');
  let hardened = html;
  hardened = replaceRequired(hardened, PHOTO_BUG, PHOTO_FIX, 'photo file capture');
  hardened = replaceRequired(hardened, PHOTO_DRAFT_STATE_TARGET, PHOTO_DRAFT_STATE_FIX, 'photo draft state');
  hardened = replaceRequired(hardened, SAVE_SIGNATURE_TARGET, SAVE_SIGNATURE_FIX, 'save draft signature');
  hardened = replaceRequired(hardened, SAVE_PHOTO_TARGET, SAVE_PHOTO_FIX, 'explicit photo persistence');
  hardened = hardened.split(AUTO_SAVE_TARGET).join(AUTO_SAVE_FIX);
  hardened = replaceRequired(hardened, RESTORE_TARGET, RESTORE_FIX, 'restored photo tracking');
  hardened = hardened.split(PROCESS_TARGET).join(PROCESS_FIX);
  hardened = replaceRequired(
    hardened,
    FROZEN_SCANNER_MUTATION_TARGET,
    FROZEN_SCANNER_MUTATION_FIX,
    'frozen scanner API replacement',
  );
  return hardened;
}

function verifySmartScanHardening(html) {
  if (html.includes(PHOTO_BUG)) throw new Error('Smart Scan photo input still clears before capture');
  if (!html.includes(PHOTO_FIX)) throw new Error('Smart Scan photo input hardening missing');
  if (!html.includes(PHOTO_DRAFT_STATE_FIX)) throw new Error('Smart Scan does not track restored photo drafts');
  if (!html.includes(SAVE_SIGNATURE_FIX) || !html.includes(SAVE_PHOTO_FIX)) throw new Error('Smart Scan explicit photo draft persistence hardening missing');
  if (html.includes(AUTO_SAVE_TARGET)) throw new Error('Smart Scan still auto-persists photo-capable drafts while offline');
  const autoSafeCount = (html.match(/saveDraft\(true,false\)/g) || []).length;
  if (autoSafeCount < 2) throw new Error('Smart Scan offline paths must save metadata without auto-persisting photos');
  if (!html.includes(RESTORE_FIX)) throw new Error('Smart Scan restored photo draft is not tracked');
  if (!html.includes(PROCESS_FIX)) throw new Error('Smart Scan processed photo draft is not deleted immediately');
  if (html.includes(FROZEN_SCANNER_MUTATION_TARGET)) throw new Error('Smart Scan still mutates the frozen legacy scanner API');
  if (!html.includes(FROZEN_SCANNER_MUTATION_FIX)) throw new Error('Smart Scan frozen scanner API replacement hardening missing');
  return true;
}

module.exports = {
  PHOTO_BUG,
  PHOTO_FIX,
  AUTO_SAVE_TARGET,
  AUTO_SAVE_FIX,
  PROCESS_FIX,
  FROZEN_SCANNER_MUTATION_TARGET,
  FROZEN_SCANNER_MUTATION_FIX,
  hardenSmartScanExperience,
  verifySmartScanHardening,
};
