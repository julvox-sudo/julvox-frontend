(function initJulvoxApi(globalObject, factory) {
  const exported = factory(globalObject);
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (globalObject && typeof globalObject === 'object') {
    Object.defineProperty(globalObject, 'JULVOX_API', {
      value: exported,
      writable: false,
      configurable: false,
      enumerable: true,
    });
  }
})(typeof window !== 'undefined' ? window : globalThis, function createJulvoxApiModule(globalObject) {
  'use strict';

  const ALLOWED_KINDS = Object.freeze(['success', 'empty', 'http-error', 'network-error', 'parse-error']);
  const TIMEOUT_REASON = Object.freeze({ code: 'JULVOX_TIMEOUT' });
  const hasOwn = (object, key) => Boolean(object && typeof object === 'object'
    && Object.prototype.hasOwnProperty.call(object, key));

  function result({ ok, status, kind, data = null, message = null, retryAfter = null, timedOut = false, aborted = false }) {
    if (!ALLOWED_KINDS.includes(kind)) throw new TypeError(`Unsupported API result kind: ${kind}`);
    return Object.freeze({ ok: Boolean(ok), status: Number.isInteger(status) ? status : 0, kind, data, message, retryAfter, timedOut: Boolean(timedOut), aborted: Boolean(aborted) });
  }

  function safeMessageForStatus(status) {
    if (status === 400) return 'La requête est invalide. Vérifiez les informations saisies.';
    if (status === 401) return 'Votre session a expiré. Reconnectez-vous.';
    if (status === 403) return 'Cette action n’est pas autorisée.';
    if (status === 404) return 'La ressource demandée est introuvable.';
    if (status === 409) return 'La ressource a changé. Actualisez puis réessayez.';
    if (status === 422) return 'Les données envoyées ne peuvent pas être traitées.';
    if (status === 429) return 'Trop de requêtes. Réessayez plus tard.';
    if (status >= 500) return 'Le service est momentanément indisponible.';
    return 'La requête n’a pas pu aboutir.';
  }

  function decodePath(value) {
    let decoded = String(value);
    for (let index = 0; index < 3; index += 1) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch (_) { return null; }
    }
    return decoded;
  }

  function hasUnsafePath(value) {
    const text = String(value);
    if (/\\|[\u0000-\u001f\u007f]/u.test(text)) return true;
    const withoutAuthority = text.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]*/u, '');
    const pathOnly = withoutAuthority.split(/[?#]/u, 1)[0];
    const decoded = decodePath(pathOnly);
    return decoded === null || /\\|[\u0000-\u001f\u007f]/u.test(decoded)
      || decoded.split('/').some(segment => segment === '.' || segment === '..');
  }

  function parseBaseUrl(value) {
    if (typeof value !== 'string' || value.trim() === '' || value !== value.trim() || hasUnsafePath(value)) return null;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
      const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/u, '');
      return `${url.origin}${path}`;
    } catch (_) { return null; }
  }

  function getRuntimeApiBaseUrl(globalLike = globalObject) {
    if (!hasOwn(globalLike, 'JULVOX_RUNTIME_CONFIG')) return null;
    const runtime = globalLike.JULVOX_RUNTIME_CONFIG;
    if (!runtime || typeof runtime !== 'object' || !hasOwn(runtime, 'backend')) return null;
    const backend = runtime.backend;
    if (!backend || typeof backend !== 'object' || !hasOwn(backend, 'apiBaseUrl')) return null;
    return parseBaseUrl(backend.apiBaseUrl);
  }

  function withinBase(candidate, base) {
    if (!['http:', 'https:'].includes(candidate.protocol) || candidate.username || candidate.password || candidate.origin !== base.origin) return false;
    const prefix = base.pathname === '/' ? '' : base.pathname.replace(/\/+$/u, '');
    return !prefix || candidate.pathname === prefix || candidate.pathname.startsWith(`${prefix}/`);
  }

  function resolveApiUrl(path, globalLike = globalObject) {
    const baseValue = getRuntimeApiBaseUrl(globalLike);
    if (!baseValue) return null;
    const value = path instanceof URL ? path.href : String(path ?? '');
    if (!value || value !== value.trim() || hasUnsafePath(value)) return null;
    const base = new URL(baseValue);
    try {
      let candidate;
      if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) candidate = new URL(value);
      else if (value.startsWith('?')) candidate = new URL(`${baseValue}${value}`);
      else candidate = new URL(value.replace(/^\/+/, ''), `${baseValue}/`);
      return withinBase(candidate, base) ? candidate.href : null;
    } catch (_) { return null; }
  }

  function normalizedEmpty(status, confirm, response) {
    if (typeof confirm === 'function' && !confirm(null, response)) {
      return result({ ok: false, status, kind: 'parse-error', message: 'La confirmation du service est incomplète.' });
    }
    return result({ ok: true, status, kind: 'empty', data: null });
  }

  function isBodyType(value, name) {
    const constructor = globalThis?.[name];
    return typeof constructor === 'function' && value instanceof constructor;
  }

  function prepareBody(body, headers) {
    if (body === undefined || body === null || typeof body === 'string'
      || isBodyType(body, 'FormData') || isBodyType(body, 'URLSearchParams')
      || isBodyType(body, 'Blob') || isBodyType(body, 'ArrayBuffer')
      || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(body))) return body;
    const prototype = typeof body === 'object' ? Object.getPrototypeOf(body) : null;
    if (!Array.isArray(body) && prototype !== Object.prototype && prototype !== null) return body;
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return JSON.stringify(body);
  }

  function addToken(headers, token) {
    if (typeof token === 'string' && token.trim() && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token.trim()}`);
    }
  }

  function abortContext(signal, timeoutMs) {
    const controller = new AbortController();
    const onAbort = () => controller.abort(signal.reason);
    if (signal?.aborted) onAbort();
    else signal?.addEventListener?.('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(TIMEOUT_REASON), timeoutMs);
    return {
      signal: controller.signal,
      cleanup() {
        clearTimeout(timer);
        signal?.removeEventListener?.('abort', onAbort);
      },
    };
  }

  function createApiClient(options = {}) {
    const runtimeGlobal = options.globalObject || globalObject;
    const fetchImpl = options.fetchImpl || runtimeGlobal?.fetch?.bind(runtimeGlobal);
    const defaultTimeout = Number.isFinite(options.timeoutMs) && options.timeoutMs >= 0 ? options.timeoutMs : 12_000;

    async function request(path, requestOptions = {}) {
      const url = resolveApiUrl(path, runtimeGlobal);
      if (!url || typeof fetchImpl !== 'function') {
        return result({ ok: false, status: 0, kind: 'network-error', message: url ? 'Le réseau est indisponible.' : 'Configuration du service indisponible.' });
      }
      const { token, timeoutMs: requestedTimeout, confirm, isEmpty, signal, body, headers: suppliedHeaders, ...fetchOptions } = requestOptions;
      const headers = new Headers(suppliedHeaders || {});
      addToken(headers, token);
      const preparedBody = prepareBody(body, headers);
      const timeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout >= 0 ? requestedTimeout : defaultTimeout;
      const context = abortContext(signal, timeoutMs);
      try {
        const response = await fetchImpl(url, { ...fetchOptions, headers, body: preparedBody, signal: context.signal });
        const status = Number(response.status) || 0;
        const retryAfter = response.headers?.get?.('Retry-After') || null;
        let text = '';
        try {
          if (status !== 204 && status !== 205) text = await response.text();
        } catch (_) {
          return result({ ok: false, status, kind: 'network-error', message: 'La réponse du service n’a pas pu être lue.' });
        }
        if (!response.ok) return result({ ok: false, status, kind: 'http-error', message: safeMessageForStatus(status), retryAfter });
        if (status === 204 || status === 205 || text.trim() === '') return normalizedEmpty(status, confirm, response);
        let data;
        try { data = JSON.parse(text); }
        catch (_) { return result({ ok: false, status, kind: 'parse-error', message: 'La réponse du service est illisible.' }); }
        if (typeof confirm === 'function' && !confirm(data, response)) {
          return result({ ok: false, status, kind: 'parse-error', message: 'La confirmation du service est incomplète.' });
        }
        const empty = typeof isEmpty === 'function' ? isEmpty(data) : data === null || data === undefined || (Array.isArray(data) && data.length === 0);
        return result({ ok: true, status, kind: empty ? 'empty' : 'success', data });
      } catch (_) {
        const timedOut = context.signal.aborted && context.signal.reason === TIMEOUT_REASON;
        const aborted = context.signal.aborted && !timedOut;
        return result({
          ok: false, status: 0, kind: 'network-error', timedOut, aborted,
          message: timedOut ? 'La requête a expiré. Réessayez.' : aborted ? 'La requête a été annulée.' : 'Connexion au service impossible.',
        });
      } finally { context.cleanup(); }
    }

    async function fetchResponse(input, init = {}, legacyTimeoutMs) {
      const url = resolveApiUrl(input, runtimeGlobal);
      if (!url) throw new TypeError('Julvox runtime API URL is unavailable or the URL is outside the configured backend.');
      if (typeof fetchImpl !== 'function') throw new TypeError('Fetch is unavailable.');
      const { token, timeoutMs: requestedTimeout, signal, body, headers: suppliedHeaders, confirm: _confirm, isEmpty: _isEmpty, ...fetchOptions } = init;
      const headers = new Headers(suppliedHeaders || {});
      addToken(headers, token);
      const preparedBody = prepareBody(body, headers);
      const candidate = Number.isFinite(requestedTimeout) ? requestedTimeout : legacyTimeoutMs;
      const timeoutMs = Number.isFinite(candidate) && candidate >= 0 ? candidate : defaultTimeout;
      const context = abortContext(signal, timeoutMs);
      try { return await fetchImpl(url, { ...fetchOptions, headers, body: preparedBody, signal: context.signal }); }
      finally { context.cleanup(); }
    }

    return Object.freeze({
      request,
      fetchResponse,
      get: (path, opts = {}) => request(path, { ...opts, method: 'GET' }),
      post: (path, body, opts = {}) => request(path, { ...opts, method: 'POST', body }),
      put: (path, body, opts = {}) => request(path, { ...opts, method: 'PUT', body }),
      patch: (path, body, opts = {}) => request(path, { ...opts, method: 'PATCH', body }),
      delete: (path, opts = {}) => request(path, { ...opts, method: 'DELETE' }),
    });
  }

  const defaultClient = createApiClient();
  return Object.freeze({ ALLOWED_KINDS, createApiClient, getRuntimeApiBaseUrl, resolveApiUrl, safeMessageForStatus, ...defaultClient });
});
