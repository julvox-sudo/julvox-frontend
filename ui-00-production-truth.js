(function initProductionTruth(globalObject,factory){const exported=factory(globalObject);if(typeof module!=='undefined'&&module.exports)module.exports=exported;if(globalObject&&typeof globalObject==='object')Object.defineProperty(globalObject,'JULVOX_PRODUCTION_TRUTH',{value:exported,writable:false,configurable:false,enumerable:true,});})(typeof window!=='undefined'?window:globalThis,function createProductionTruth(globalObject){'use strict';const VALID_CAPABILITY_STATUSES=Object.freeze(['supported','partial','experimental','unavailable','demo-only']);const STATUS_LABELS=Object.freeze({supported:'Disponible',partial:'Disponibilité partielle',experimental:'Expérimental',unavailable:'Indisponible','demo-only':'Démonstration'});const SUCCESS_KINDS=Object.freeze(['success','empty']);const mutationLocks=new Set();let installed=false;let capabilityObserver=null;const own=(object,key)=>Boolean(object&&typeof object==='object'&&Object.prototype.hasOwnProperty.call(object,key));const runtime=()=>own(globalObject,'JULVOX_RUNTIME_CONFIG')&&globalObject.JULVOX_RUNTIME_CONFIG&&typeof globalObject.JULVOX_RUNTIME_CONFIG==='object'?globalObject.JULVOX_RUNTIME_CONFIG:null;const capabilities=()=>{const value=runtime()?.application?.capabilities;return value&&typeof value==='object'?value:{};};function getCapabilityStatus(name){const definition=own(capabilities(),name)?capabilities()[name]:null;return VALID_CAPABILITY_STATUSES.includes(definition?.status)?definition.status:'unavailable';}const isDemoMode=()=>runtime()?.runtime?.environment==='demo';function isCapabilityAvailable(name){const status=getCapabilityStatus(name);return status!=='unavailable'&&(status!=='demo-only'||isDemoMode());}const escapeHtml=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');const retryButtonHtml=()=>'<button type="button" data-ui00-retry style="margin-top:12px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--txt);cursor:pointer">Réessayer</button>';function renderState(element,kind,message,retry){if(!element)return;const button=typeof retry==='function'?retryButtonHtml():'';element.innerHTML=`<div data-ui00-state="${escapeHtml(kind)}" style="text-align:center;padding:24 px;color:var(--txt2)"><div style="font-size:24 px;margin-bottom:8 px">${kind === 'empty' ? '∅' : '⚠️'}</div><div>${escapeHtml(message)}</div>${button}</div>`;if(button)element.querySelector?.('[data-ui00-retry]')?.addEventListener?.('click',retry,{once:true});}function renderPreservedError(element,message,retry){if(!element)return;element.querySelector?.('[data-ui00-preserved-error]')?.remove?.();const documentLike=element.ownerDocument||globalObject?.document;if(!documentLike?.createElement)return;const notice=documentLike.createElement('div');notice.dataset.ui00PreservedError='true';notice.setAttribute('role','status');notice.style.cssText='margin:10px 0;padding:10px 12px;border:1px solid var(--border);border-radius:10px;color:var(--txt2);text-align:center';notice.innerHTML=`<div>${escapeHtml(message)}</div>${typeof retry==='function'?retryButtonHtml():''}`;
        notice.querySelector?.('[data-ui00-retry]')?.addEventListener?.('click', retry, { once: true });
        element.prepend?.(notice);
    }
    function removeCapabilityBadge(element) { element?.querySelectorAll?.('[data-ui00-capability-badge]')?.forEach?.(badge => badge.remove?.()); }
    function addCapabilityBadge(element, status) {
        if (!element || ['supported', 'unavailable'].includes(status))
            return;
        const target = element.querySelector?.('.page-title, .sec-title, h1, h2') || element;
        if (!target?.ownerDocument?.createElement || target.querySelector?.(`[data-ui00-capability-badge="${status}"]`))
            return;
        const badge = target.ownerDocument.createElement('span');
        badge.dataset.ui00CapabilityBadge = status;
        badge.textContent = STATUS_LABELS[status];
        badge.style.cssText = 'display:inline-block;margin-left:8px;padding:2px 7px;border:1px solid currentColor;border-radius:999px;font-size:10px;font-weight:600;vertical-align:middle;opacity:.8';
        target.appendChild?.(badge);
    }
    function applyCapabilityState(element, name) {
        if (!element)
            return null;
        const status = getCapabilityStatus(name);
        const available = isCapabilityAvailable(name);
        element.dataset.capability = name;
        element.dataset.capabilityStatus = status;
        element.setAttribute?.('data-capability-label', STATUS_LABELS[status]);
        removeCapabilityBadge(element);
        element.hidden = !available;
        if (!available) {
            if ('disabled' in element)
                element.disabled = true;
            element.setAttribute?.('aria-hidden', 'true');
            element.setAttribute?.('title', STATUS_LABELS[status]);
        }
        else {
            element.removeAttribute?.('aria-hidden');
            if (status !== 'supported') {
                element.setAttribute?.('aria-description', STATUS_LABELS[status]);
                element.setAttribute?.('title', STATUS_LABELS[status]);
                addCapabilityBadge(element, status);
            }
            else
                element.removeAttribute?.('aria-description');
        }
        return status;
    }
    function isConfirmedServerResult(result) {
        return result?.ok === true && SUCCESS_KINDS.includes(result.kind) && Number.isInteger(result.status) && result.status >= 200 && result.status < 300;
    }
    async function runConfirmedMutation({ operation, onPending, onSuccess, onError, rollback }) {
        if (typeof operation !== 'function')
            throw new TypeError('operation must be a function');
        onPending?.();
        let result;
        try {
            result = await operation();
        }
        catch (_) {
            result = { ok: false, status: 0, kind: 'network-error', message: 'Connexion au service impossible.' };
        }
        if (isConfirmedServerResult(result)) {
            onSuccess?.(result);
            return result;
        }
        rollback?.(result);
        onError?.(result);
        return result;
    }
    async function withMutationLock(key, operation, onDuplicate) {
        if (mutationLocks.has(key)) {
            onDuplicate?.();
            return Object.freeze({ ok: false, status: 0, kind: 'network-error', message: 'Une requête identique est déjà en cours.', duplicate: true });
        }
        mutationLocks.add(key);
        try {
            return await operation();
        }
        finally {
            mutationLocks.delete(key);
        }
    }
    const api = () => globalObject?.JULVOX_API || null;
    const token = () => globalObject?.currentUser?.token || globalObject?.localStorage?.getItem?.('token') || null;
    const toast = message => globalObject?.showToast?.(message);
    const errorMessage = (result, fallback) => result?.message || fallback;
    const duplicateToast = () => toast('⏳ Cette action est déjà en cours.');
    const identifier = value => (Number.isInteger(value) && value > 0) || (typeof value === 'string' && value.trim());
    const statusIn = (data, allowed) => typeof data?.status === 'string' && allowed.includes(data.status);
    const deletion = (data, response) => response?.status === 204 || data?.deleted === true || statusIn(data, ['deleted', 'removed']);
    const locked = (key, action) => withMutationLock(key, action, duplicateToast);
    const auth = warning => {
        const value = token();
        if (!value) {
            toast(warning);
            globalObject.openAuth?.('login');
        }
        return value;
    };
    function installMutationOverrides() {
        const installer = globalObject?.JULVOX_INSTALL_UI00_MUTATIONS;
        if (typeof installer !== 'function') return;
        installer({ globalObject, api, token, toast, errorMessage, identifier, statusIn, deletion, locked, auth });
    }
    const CAPABILITY_SURFACES = Object.freeze({
        favorites: ['#favPage', '#bn-favs', '[onclick*="openFavPage"]'], community: ['#communityPage', '#bn-community', '[onclick*="openCommunityPage"]'],
        premium: ['#premiumPage', '#ddUpgrade', '[onclick*="openPremiumPage"]'], stripe: ['.stripe-btn', '[onclick*="payWithStripe"]'], paypal: ['.paypal-btn', '[onclick*="payWithPayPal"]'],
        push: ['#notifsPage', '[onclick*="enableNotifPermission"]'], offline: ['#offlineBar'], ai: ['#aiChatPage', '[onclick*="openAIChat"]'], recommendations: ['[onclick*="openRecoPage"]', '[onclick*="Recommendations"]'],
        pro_api: ['[onclick*="openProPage"]'], gamification: ['[onclick*="loadAchievements"]', '[onclick*="loadDailyMissions"]'], reports: ['#reportOverlay', '[onclick*="openReport"]'], scanner: ['[onclick*="startScanner"]', '[onclick*="startBarcodeScanner"]', '[onclick*="searchBarcode"]'],
    });
    const CAPABILITY_ENTRYPOINTS = Object.freeze({ scanner: ['startScanner', 'startBarcodeScanner', 'lookupBarcode', 'lookupBarcodeValue', 'searchBarcode', 'onBarcodeDetected'], local_analysis: ['localAnalyzeDeal', 'injectLocalAnalysis'] });
    function guardCapabilityEntrypoint(name, functionName) {
        const original = globalObject?.[functionName];
        if (typeof original !== 'function' || original.__julvoxCapabilityGuard === name)
            return;
        function guarded(...args) { if (!isCapabilityAvailable(name)) {
            toast(`⚠️${STATUS_LABELS[getCapabilityStatus(name)]}`);
            return false;
        } return original.apply(this, args); }
        Object.defineProperty(guarded, '__julvoxCapabilityGuard', { value: name });
        globalObject[functionName] = guarded;
    }
    function applyKnownCapabilitySurfaces(root = globalObject?.document) {
        if (!root?.querySelectorAll)
            return;
        for (const [name, selectors] of Object.entries(CAPABILITY_SURFACES))
            for (const selector of selectors)
                root.querySelectorAll(selector)?.forEach?.(element => applyCapabilityState(element, name));
        for (const [name, functions] of Object.entries(CAPABILITY_ENTRYPOINTS))
            for (const functionName of functions)
                guardCapabilityEntrypoint(name, functionName);
    }
    function installCapabilityObserver() {
        if (capabilityObserver || typeof globalObject?.MutationObserver !== 'function' || !globalObject.document?.body)
            return;
        capabilityObserver = new globalObject.MutationObserver(records => records.forEach(record => record.addedNodes?.forEach?.(node => { if (node?.nodeType === 1)
            applyKnownCapabilitySurfaces(node); })));
        capabilityObserver.observe(globalObject.document.body, { childList: true, subtree: true });
    }
    function install() {
        applyKnownCapabilitySurfaces();
        globalObject.document?.querySelectorAll?.('[data-capability]')?.forEach?.(element => applyCapabilityState(element, element.dataset.capability));
        installCapabilityObserver();
        if (!installed) {
            installMutationOverrides();
            installed = true;
        }
    }
    if (globalObject?.document) {
        if (globalObject.document.readyState === 'loading')
            globalObject.document.addEventListener('DOMContentLoaded', install, { once: true });
        else
            install();
    }
    return Object.freeze({ VALID_CAPABILITY_STATUSES, STATUS_LABELS, getCapabilityStatus, isCapabilityAvailable, isDemoMode, applyCapabilityState, applyKnownCapabilitySurfaces, renderState, renderPreservedError, isConfirmedServerResult, runConfirmedMutation, withMutationLock, install });
});
