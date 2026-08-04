(function initJulvoxApi(globalObject, factory) {
  const exported = factory(globalObject);
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (globalObject && typeof globalObject === 'object') {
    Object.defineProperty(globalObject, 'JULVOX_API', {
      value: exported,
      writable: false,
      configurable: true,
      enumerable: true,
    });
  }
})(typeof window !== 'undefined' ? window : globalThis, function createJulvoxApiModule(globalObject) {
  'use strict';

  const ALLOWED_KINDS = Object.freeze([
    'success',
    'empty',
    'http-error',
    'network-error',
    'parse-error',
  ]);

  function safeMessageForStatus(status) {
    if (status === 400) return 'La requête est invalide. Vérifiez les informations saisies.';
    if (status === 401) return 'Votre session a expiré. Reconnectez-vous.';
    if (status === 403) return 'Cette action n’est pas autorisée.';
    if (status === 404) return 'La ressource demandée est introuvable.';
    if (status === 429) return 'Trop de requêtes. Réessayez plus tard.';
    if (status >= 500) return 'Le service est momentanément indisponible.';
    return 'La requête n’a pas pu aboutir.';
  }

  function normalizedResult({ ok, status, kind, data = null, message = null, retryAfter = null, timedOut = false }) {
    if (!ALLOWED_KINDS.includes(kind)) throw new TypeError(`Unsupported API result kind: ${kind}`);
    return Object.freeze({
      ok: Boolean(ok),
      status: Number.isInteger(status) ? status : 0,
      kind,
      data,
      message,
      retryAfter,
      timedOut: Boolean(timedOut),
    });
  }

  function getRuntime(globalLike = globalObject) {
    return globalLike?.JULVOX_RUNTIME_CONFIG || null;
  }

  function getRuntimeApiBaseUrl(globalLike = globalObject) {
    const raw = getRuntime(globalLike)?.backend?.apiBaseUrl;
    if (typeof raw !== 'string' || raw.trim() === '') return null;
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      return url.origin + url.pathname.replace(/\/$/, '');
    } catch (_) {
      return null;
    }
  }

  function resolveApiUrl(path, globalLike = globalObject) {
    const baseUrl = getRuntimeApiBaseUrl(globalLike);
    if (!baseUrl) return null;
    if (path instanceof URL) {
      if (!path.href.startsWith(baseUrl)) return null;
      return path.href;
    }
    const value = String(path || '');
    if (/^https?:\/\//i.test(value)) {
      return value.startsWith(baseUrl) ? value : null;
    }
    return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
  }

  function defaultIsEmpty(data) {
    if (data === null || data === undefined) return true;
    if (Array.isArray(data)) return data.length === 0;
    return false;
  }

  function createApiClient(options = {}) {
    const runtimeGlobal = options.globalObject || globalObject;
    const fetchImpl = options.fetchImpl || runtimeGlobal?.fetch?.bind(runtimeGlobal);
    const defaultTimeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 12_000;

    async function request(path, requestOptions = {}) {
      const url = resolveApiUrl(path, runtimeGlobal);
      if (!url) {
        return normalizedResult({
          ok: false,
          status: 0,
          kind: 'network-error',
          message: 'Configuration du service indisponible.',
        });
      }
      if (typeof fetchImpl !== 'function') {
        return normalizedResult({
          ok: false,
          status: 0,
          kind: 'network-error',
          message: 'Le réseau est indisponible.',
        });
      }

      const headers = new Headers(requestOptions.headers || {});
      if (requestOptions.token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${requestOptions.token}`);
      }
      const body = requestOptions.body;
      if (body !== undefined && body !== null && !(body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const timeoutMs = Number.isFinite(requestOptions.timeoutMs)
        ? requestOptions.timeoutMs
        : defaultTimeoutMs;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);
      if (requestOptions.signal) {
        if (requestOptions.signal.aborted) controller.abort(requestOptions.signal.reason);
        else requestOptions.signal.addEventListener('abort', () => controller.abort(requestOptions.signal.reason), { once: true });
      }

      try {
        const response = await fetchImpl(url, {
          ...requestOptions,
          headers,
          body: body && headers.get('Content-Type') === 'application/json' && typeof body !== 'string'
            ? JSON.stringify(body)
            : body,
          signal: controller.signal,
        });
        const status = Number(response.status) || 0;
        const retryAfter = response.headers?.get?.('Retry-After') || null;
        const text = status === 204 ? '' : await response.text();

        if (!response.ok) {
          return normalizedResult({
            ok: false,
            status,
            kind: 'http-error',
            message: safeMessageForStatus(status),
            retryAfter,
          });
        }

        if (status === 204 || text.trim() === '') {
          return normalizedResult({ ok: true, status, kind: 'empty', data: null });
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          return normalizedResult({
            ok: false,
            status,
            kind: 'parse-error',
            message: 'La réponse du service est illisible.',
          });
        }

        if (typeof requestOptions.confirm === 'function' && !requestOptions.confirm(data, response)) {
          return normalizedResult({
            ok: false,
            status,
            kind: 'parse-error',
            message: 'La confirmation du service est incomplète.',
          });
        }

        const isEmpty = typeof requestOptions.isEmpty === 'function'
          ? requestOptions.isEmpty(data)
          : defaultIsEmpty(data);
        return normalizedResult({
          ok: true,
          status,
          kind: isEmpty ? 'empty' : 'success',
          data,
        });
      } catch (error) {
        const timedOut = controller.signal.aborted && controller.signal.reason === 'timeout';
        return normalizedResult({
          ok: false,
          status: 0,
          kind: 'network-error',
          message: timedOut ? 'La requête a expiré. Réessayez.' : 'Connexion au service impossible.',
          timedOut,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    async function fetchResponse(input, init = {}) {
      const url = resolveApiUrl(input, runtimeGlobal);
      if (!url) throw new TypeError('Julvox runtime API URL is unavailable or the URL is outside the configured backend.');
      if (typeof fetchImpl !== 'function') throw new TypeError('Fetch is unavailable.');
      const headers = new Headers(init.headers || {});
      const timeoutMs = Number.isFinite(init.timeoutMs) ? init.timeoutMs : defaultTimeoutMs;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);
      try {
        return await fetchImpl(url, { ...init, headers, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return Object.freeze({
      request,
      fetchResponse,
      get: (path, opts = {}) => request(path, { ...opts, method: 'GET' }),
      post: (path, body, opts = {}) => request(path, { ...opts, method: 'POST', body }),
      put: (path, body, opts = {}) => request(path, { ...opts, method: 'PUT', body }),
      delete: (path, opts = {}) => request(path, { ...opts, method: 'DELETE' }),
    });
  }

  const defaultClient = createApiClient();
  return Object.freeze({
    ALLOWED_KINDS,
    createApiClient,
    getRuntimeApiBaseUrl,
    resolveApiUrl,
    safeMessageForStatus,
    ...defaultClient,
  });
});
