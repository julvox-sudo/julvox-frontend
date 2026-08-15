const MARKER = 'julvox-global-error-boundary-v1';

const RUNTIME = `<script id="${MARKER}">
(function installJulvoxGlobalErrorBoundary(){
  'use strict';
  var shown=false;
  function render(){
    if(shown)return;
    if(!document.body){document.addEventListener('DOMContentLoaded',render,{once:true});return;}
    shown=true;
    var existing=document.getElementById('julvox-global-error-notice');
    if(existing)return;
    var notice=document.createElement('div');
    notice.id='julvox-global-error-notice';
    notice.setAttribute('role','alert');
    notice.setAttribute('aria-live','assertive');
    notice.style.cssText='position:fixed;left:12px;right:12px;bottom:84px;z-index:2147483647;max-width:760px;margin:auto;padding:12px 14px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:#18181f;color:#f0f0f5;box-shadow:0 8px 30px rgba(0,0,0,.35);font:500 14px/1.4 Inter,system-ui,sans-serif';
    notice.innerHTML='<strong>Julvox a rencontré un problème.</strong><br><span>Recharge la page. Si le problème persiste, réessaie plus tard.</span> <button type="button" data-julvox-reload style="margin-left:8px;padding:5px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:#24242e;color:inherit;cursor:pointer">Recharger</button>';
    notice.querySelector('[data-julvox-reload]').addEventListener('click',function(){location.reload();},{once:true});
    document.body.appendChild(notice);
  }
  window.addEventListener('error',render);
  window.addEventListener('unhandledrejection',render);
})();
</script>`;

function ensureGlobalErrorBoundary(html) {
  const source = String(html);
  if (source.includes(`id="${MARKER}"`)) return source;
  if (!source.includes('</head>')) throw new Error('global error boundary requires </head>');
  return source.replace('</head>', `${RUNTIME}\n</head>`);
}

module.exports = { MARKER, RUNTIME, ensureGlobalErrorBoundary };