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

  const ALLOWED_KINDS = Object.freeze([
    'success',
    'empty',
    'http-error',
    'network-error',
    'parse-error',
  ]);
  const TIMEOUT_REASON = Object.freeze({ type: 'julvox-timeout' });

  function hasOwn(object, key) {
    return Boolean(object && typeof object === 'object' && Object.prototype.hasOwnProperty.call(object, key));
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

  function normalizedResult({
    ok,
    status,
    kind,
    data = null,
    message = null,
    retryAfter = null,
    timedOut = false,
    aborted = false,
  }) {
    if (!ALLOWED_KINDS.includes(kind)) throw new TypeError(`Unsupported API result kind: ${kind}`);
    return Object.freeze({
      ok: Boolean(ok),
      status: Number.isInteger(status) ? status : 0,
      kind,
      data,
      message,
      retryAfter,
      timedOut: Boolean(timedOut),
      aborted: Boolean(aborted),
    });
  }

  function getRuntime(globalLike = globalObject) {
    if (!hasOwn(globalLike, 'JULVOX_RUNTIME_CONFIG')) return null;
    const runtime = globalLike.JULVOX_RUNTIME_CONFIG;
    return runtime && typeof runtime === 'object' ? runtime : null;
  }

  function decodeRepeatedly(value) {
    let current = String(value);
    for (let index = 0; index < 3; index += 1) {
      try {
        const decoded = decodeURIComponent(current);
        if (decoded === current) break;
        current = decoded;
      } catch (_) {
        return null;
      }
    }
    return current;
  }

  function rawPathFromUrlLike(value) {
    const text = String(value);
    const withoutSchemeAndAuthority = text.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]*/u, '');
    return withoutSchemeAndAuthority.split(/[?#]/u, 1)[0] || '';
  }

  function hasUnsafePath(value) {
    const raw = rawPathFromUrlLike(value);
    if (/\\|[\u0000-\u001F\u007F]/u.test(raw)) return true;
    const decoded = decodeRepeatedly(raw);
    if (decoded === null || /\\|[\u0000-\u001F\u007F]/u.test(decoded)) return true;
    return decoded.split('/').some(segment => segment === '.' || segment === '..');
  }

  function parseHttpUrl(value) {
    if (typeof value !== 'string' || value.trim() === '' || value !== value.trim()) return null;
    if (hasUnsafePath(value)) return null;
    try {
      const url = new URL(value);
      if (!['http:', 'https;'].includes(url.protocol)) return null;
      if (url.username || url.password || url.search || url.hash) return null;
      return url;
    } catch (_) {
      return null;
    }
  }

  function getRuntimeApiBaseUrl(globalLike = globalObject) {
    const runtime = getRuntime(globalLike);
    if (!runtime || !hasOwn(runtime, 'backend')) return null;
    const backend = runtime.backend;
    if (!backend || typeof backend !== 'object' || !hasOwn(backend, 'apiBaseUrl')) return null;
    const url = parseHttpUrl(backend.apiBaseUrl);
    if (!url) return null;
    const pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/u, '');
    return `${url.origin}${pathname}`;
  }

  function isWithinConfiguredBackend(candidate, baseUrl) {
    const base = new URL(baseUrl);
    if (!['http:', 'https;'].includes(candidate.protocol)) return false;
    if (candidate.username || candidate.password || candidate.origin !== base.origin) return false;
    const basePath = base.pathname === '/' ? '' : base.pathname.replace(/\/+$/u, '');
    return !basePath || candidate.pathname === basePath || candidate.pathname.startsWith(`${basePath}/`);
  }

  function resolveApiUrl(path, globalLike = globalObject) {
    const baseUrl = getRuntimeApiBaseUrl(globalLike);
    if (!baseUrl) return null;
    const value = path instanceof URL ? path.href : String(path ?? '');
    if (!value || value !== value.trim() || hasUnsafePath(value)) return null;

    let candidate;
    try {
      if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) {
        candidate = new URL(value);
      } else if (value.startsWith('?')) {
        candidate = new URL(`${baseUrl}${value}`);
      } else {
        const relative = value.replace(/^\/+/, '');
        candidate = new URL(relative, `${baseUrl}/`);
      }
    } catch (_) {
      return null;
    }
    return isWithinConfiguredBackend(candidate, baseUrl) ? candidate.href : null;
  }

  function defaultIsEmpty(data) {
    if (data === null || data === undefined) return true;
    if (Array.isArray(data)) return data.length === 0;
    return false;
  }

  function confirmationFailed(status) {
    return normalizedResult({
      ok: false,
      status,
      kind: 'parse-error',
      message: 'La confirmation du service est incomplète.',
    });
  }

  function isBodyType(value, constructorName) {
    const constructor = globalThis?.[constructorName];
    return typeof constructor === 'function' && value instanceof constructor;
  }

  function prepareBody(body, headers) {
    if (body === undefined || body === null) return body;
    if (typeof body === 'string'
      || isBodyType(body, 'FormData')
      || isBodyType(body, 'URLSearchParams')
      || isBodyType(body, 'Blob')
      || isBodyType(body, 'ArrayBuffer')
      || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(body))) {
      return body;
    }
    const prototype = typeof body === 'object' ? Object.getPrototypeOf(body) : null;
    const isJsonValue = Array.isArray(body) || prototype === Object.prototype || prototype === null;
    if (!isJsonValue) return body;
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return JSON.stringify(body);
  }

  function addBearerToken(headers, token) {
    if (typeof token !== 'string' || token.trim() === '' || headers.has('Authorization')) return;
    headers.set('Authorization', `Bearer ${token.trim()}`);
  }

  function createAbortContext(signal, timeoutMs) {
    const controller = new AbortController();
    let externalAbortHandler = null;
    if (signal) {
      externalAbortHandler = () => controller.abort(signal.reason);
      if (signal.aborted) externalAbortHandler();
      else signal.addEventListener('abort', externalAbortHandler, { once: true });
    }
    const timeoutId = setTimeout(() => controller.abort(TIMEOUT_REASON), timeoutMs);
    return {
      controller,
      cleanup() {
        clearTimeout(timeoutId);
        if (signal && externalAbortHandler) signal.removeEventListener('abort', externalAbortHandler);
      },
    };
  }

  function createApiClient(options = {}) {
    const runtimeGlobal = options.globalObject || globalObject;
    const fetchImpl = options.fetchImpl || runtimeGlobal?.fetch?.bind(runtimeGlobal);
    const defaultTimeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs >= 0
      ? options.timeoutMs
      : 12_000;

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

      const {
        token,
        timeoutMs: requestedTimeout,
        confirm,
        isEmpty,
        signal,
        body,
        headers: suppliedHeaders,
        ...fetchOptions
      } = requestOptions;
      const headers = new Headers(suppliedHeaders || {});
      addBearerToken(headers, token);
      const preparedBody = prepareBody(body, headers);
      const timeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout >= 0
        ? requestedTimeout
        : defaultTimeoutMs;
      const abortContext = createAbortContext(signal, timeoutMs);

      try {
        const response = await fetchImpl(url, {
          ...fetchOptions,
          headers,
          body: preparedBody,
          signal: abortContext.controller.signal,
        });
        const status = Number(response.status) || 0;
        const retryAfter = response.headers?.get?.('Retry-After') || null;
        let text = '';
        try {
          if (status !== 204 && status !== 205) text = await response.text();
        } catch (_) {
          return normalizedResult({
            ok: false,
            status,
            kind: 'network-error',
            message: 'La réponse du service n’a pas pu être lue.',
          });
        }

        if (!response.ok) {
          return normalizedResult({
            ok: false,
            status,
            kind: 'http-error',
            message: safeMessageForStatus(status),
            retryAfter,
          });
        }

        if (status === 204 || status === 205 || text.trim() === '') {
          if (typeof confirm === 'function' && !confirm(null, response)) return confirmationFailed(status);
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

        if (typeof confirm === 'function' && !confirm(data, response)) return confirmationFailed(status);
        const empty = typeof isEmpty === 'function' ? isEmpty(data) : defaultIsEmpty(data);
        return normalizedResult({
          ok: true,
          status,
          kind: empty ? 'empty' : 'success',
          data,
        });
      } catch (_) {
        const timedOut = abortContext.controller.signal.aborted
          && abortContext.controller.signal.reason === TIMEOUT_REASON;
        const aborted = abortContext.controller.signal.aborted && !timedOut;
        return normalizedResult({
          ok: false,
          status: 0,
          kind: 'network-error',
          message: timedOut
            ? 'La requête a expiré. Réessayez.'
            : aborted
              ? 'La requête a été annulée.'
              : 'Connexion au service impossible.',
          timedOut,
          aborted,
        });
      } finally {
        abortContext.cleanup();
      }
    }

    async function fetchResponse(input, init = {}, legacyTimeoutMs) {
      const url = resolveApiUrl(input, runtimeGlobal);
      if (!url) throw new TypeError('Julvox runtime API URL is unavailable or the URL is outside the configured backend.');
      if (typeof fetchImpl !== 'function') throw new TypeError('Fetch is unavailable.');
      const {
        token,
        timeoutMs: requestedTimeout,
        signal,
        body,
        headers: suppliedHeaders,
        confirm: _confirm,
        isEmpty: _isEmpty,
        ...fetchOptions
      } = init;
      const headers = new Headers(suppliedHeaders || {});
      addBearerToken(headers, token);
      const preparedBody = prepareBody(body, headers);
      const timeoutCandidate = Number.isFinite(requestedTimeout) ? requestedTimeout : legacyTimeoutMs;
      const timeoutMs = Number.isFinite(timeoutCandidate) && timeoutCandidate >= 0
        ? timeoutCandidate
        : defaultTimeoutMs;
      const abortContext = createAbortContext(signal, timeoutMs);
      try {
        return await fetchImpl(url, {
          ...fetchOptions,
          headers,
          body: preparedBody,
          signal: abortContext.controller.signal,
        });
      } finally {
        abortContext.cleanup();
      }
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
  return Object.freeze({
    ALLOWED_KINDS,
    createApiClient,
    getRuntimeApiBaseUrl,
    resolveApiUrl,
    safeMessageForStatus,
    ...defaultClient,
  });
});
