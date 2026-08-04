function centralizeApiCalls(source) {
  return source
    .replace(/\bfetchWithTimeout\(\s*(?=API\s*\+|`\$\{API\})/g, 'window.JULVOX_API.fetchResponse(')
    .replace(/\bfetchWithRetry\(\s*(?=API\s*\+|`\$\{API\})/g, 'window.JULVOX_API.fetchResponse(')
    .replace(/\bfetch\(\s*(?=API\s*\+|`\$\{API\})/g, 'window.JULVOX_API.fetchResponse(');
}

module.exports = { centralizeApiCalls };
