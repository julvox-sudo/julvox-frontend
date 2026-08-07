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
const BARCODE_VALIDATION_TARGET = "if(!/^\\d{8}$|^\\d{12}$|^\\d{13}$/.test(barcode)){ setStatus('Saisis un EAN-8, UPC-A ou EAN-13 valide.'); return; }";
const BARCODE_VALIDATION_FIX = "if(!/^\\d{8}$|^\\d{12}$|^\\d{13}$|^\\d{14}$/.test(barcode)){ setStatus('Saisis un EAN-8, UPC-A, EAN-13 ou GTIN-14 valide.'); return; }";
const BARCODE_PLACEHOLDER_TARGET = 'placeholder="EAN-13, EAN-8 ou UPC-A"';
const BARCODE_PLACEHOLDER_FIX = 'placeholder="EAN-13, GTIN-14, EAN-8 ou UPC-A"';
const CANDIDATE_RENDER_TARGET = "var confidence=Number(c&&c.confidence); var confidenceText=Number.isFinite(confidence)?' — confiance fournie : '+Math.round(confidence*100)+' %':'';\n      return '<label class=\"jvss-candidate\"><input type=\"radio\" name=\"jvssCandidate\" value=\"'+index+'\" '+(index===0?'checked':'')+'><span><strong>'+escapeHtml(candidateName(c))+'</strong><span>'+escapeHtml([c&&c.category,c&&c.model,c&&c.color,c&&c.variant].filter(Boolean).join(' · ')||'Aucun détail supplémentaire vérifié')+'</span><em>'+escapeHtml(matchLabel(c)+confidenceText)+'</em></span></label>';";
const CANDIDATE_RENDER_FIX = "var confidence=Number(c&&c.confidence); var confidenceText=Number.isFinite(confidence)?Math.round(confidence*100)+' %':'non chiffrée'; var sourceText=clean(c&&c.sourceLabel,120)||((c&&c.matchBasis)==='external_barcode'?'Source externe vérifiée':'Catalogue Julvox'); var barcodeText=clean(c&&c.barcode,32); var image=clean(c&&c.imageUrl,2048); var imageHtml=image?'<img src=\"'+escapeHtml(image)+'\" alt=\"\" loading=\"lazy\" style=\"width:72px;height:72px;object-fit:contain;border-radius:12px;background:#fff;border:1px solid rgba(11,29,52,.08);flex:0 0 72px\">':'';\n      return '<label class=\"jvss-candidate\"><input type=\"radio\" name=\"jvssCandidate\" value=\"'+index+'\" '+(index===0?'checked':'')+'>'+imageHtml+'<span><strong>'+escapeHtml(candidateName(c))+'</strong><span>'+escapeHtml([c&&c.category,c&&c.model,c&&c.color,c&&c.variant].filter(Boolean).join(' · ')||'Aucun détail supplémentaire vérifié')+'</span>'+(barcodeText?'<span><strong>Code-barres :</strong> '+escapeHtml(barcodeText)+'</span>':'')+'<span><strong>Source :</strong> '+escapeHtml(sourceText)+'</span><em>'+escapeHtml(matchLabel(c)+' — confiance : '+confidenceText)+'</em></span></label>';";
const CONFIRM_ACTIONS_TARGET = '<div class="jvss-actions"><button class="jvss-btn jvss-btn-accent" id="jvssConfirmBtn" type="button" data-jvss-action="confirm">C’est ce produit</button></div>';
const CONFIRM_ACTIONS_FIX = '<div class="jvss-actions"><button class="jvss-btn jvss-btn-accent" id="jvssConfirmBtn" type="button" data-jvss-action="confirm">C’est bien ce produit</button><button class="jvss-btn" type="button" data-jvss-action="reject">Ce n’est pas le bon produit</button></div>';
const CONFIRM_FUNCTION_TARGET = '  async function confirmCandidate(){';
const CONFIRM_FUNCTION_FIX = "  function rejectCandidate(){ currentIdentification=null; confirmedProduct=null; var card=byId('jvssCandidatesCard'); if(card) card.hidden=true; var analysis=byId('jvssAnalysisCard'); if(analysis) analysis.hidden=true; setStatus('Produit refusé. Modifie le code ou relance une identification.'); var input=byId(currentMode==='barcode'?'jvssBarcode':currentMode==='text'?'jvssText':currentMode==='link'?'jvssLink':'jvssPhoto'); if(input&&input.focus) input.focus(); }\n\n  async function confirmCandidate(){";
const ACTION_DISPATCH_TARGET = "if(type==='close')close();else if(type==='identify')identify();else if(type==='confirm')confirmCandidate();else if(type==='analyze')analyze();";
const ACTION_DISPATCH_FIX = "if(type==='close')close();else if(type==='identify')identify();else if(type==='confirm')confirmCandidate();else if(type==='reject')rejectCandidate();else if(type==='analyze')analyze();";

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
  hardened = replaceRequired(hardened, FROZEN_SCANNER_MUTATION_TARGET, FROZEN_SCANNER_MUTATION_FIX, 'frozen scanner API replacement');
  hardened = replaceRequired(hardened, BARCODE_VALIDATION_TARGET, BARCODE_VALIDATION_FIX, 'GTIN-14 validation');
  hardened = replaceRequired(hardened, BARCODE_PLACEHOLDER_TARGET, BARCODE_PLACEHOLDER_FIX, 'GTIN-14 input hint');
  hardened = replaceRequired(hardened, CANDIDATE_RENDER_TARGET, CANDIDATE_RENDER_FIX, 'product candidate facts');
  hardened = replaceRequired(hardened, CONFIRM_ACTIONS_TARGET, CONFIRM_ACTIONS_FIX, 'explicit product confirmation actions');
  hardened = replaceRequired(hardened, CONFIRM_FUNCTION_TARGET, CONFIRM_FUNCTION_FIX, 'product rejection owner');
  hardened = replaceRequired(hardened, ACTION_DISPATCH_TARGET, ACTION_DISPATCH_FIX, 'product rejection dispatch');
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
  if (html.includes(BARCODE_VALIDATION_TARGET) || !html.includes(BARCODE_VALIDATION_FIX)) throw new Error('Smart Scan still rejects GTIN-14 before backend validation');
  if (!html.includes(BARCODE_PLACEHOLDER_FIX)) throw new Error('Smart Scan GTIN-14 input hint is missing');
  if (!html.includes('C’est bien ce produit') || !html.includes('Ce n’est pas le bon produit')) throw new Error('Smart Scan product confirmation actions are incomplete');
  if (!html.includes('Source :') || !html.includes('Code-barres :')) throw new Error('Smart Scan product card does not expose provenance facts');
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
  BARCODE_VALIDATION_TARGET,
  BARCODE_VALIDATION_FIX,
  hardenSmartScanExperience,
  verifySmartScanHardening,
};