const MALFORMED_CHAT_RENDERER = "const rendered = escaped.replace(/\n/g, '<br>').replace(/**(.+?)**/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code style=\"background:var(--bg3);padding:1px 5px;border-radius:4px;font-size:12px\">$1</code>');";
const SAFE_CHAT_RENDERER = "const rendered = escaped.replace(/\\n/g, '<br>').replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>').replace(/\\`(.+?)\\`/g, '<code style=\"background:var(--bg3);padding:1px 5px;border-radius:4px;font-size:12px\">$1</code>');";

function repairChatRenderer(source) {
  const input = String(source);
  const malformedCount = input.split(MALFORMED_CHAT_RENDERER).length - 1;
  const safeCount = input.split(SAFE_CHAT_RENDERER).length - 1;
  if (malformedCount === 1 && safeCount === 0) return input.replace(MALFORMED_CHAT_RENDERER, SAFE_CHAT_RENDERER);
  if (malformedCount === 0 && safeCount === 1) return input;
  throw new Error(`UI-00 chat renderer repair failed: expected one malformed or safe renderer, found malformed=${malformedCount}, safe=${safeCount}`);
}

module.exports = { MALFORMED_CHAT_RENDERER, SAFE_CHAT_RENDERER, repairChatRenderer };
