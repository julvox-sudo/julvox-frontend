function replaceExactlyOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${matches ? matches.length : 0}`);
  }
  return source.replace(pattern, replacement);
}

function removeUnverifiedJwtIdentity(html) {
  let output = String(html);

  const helperPattern = /\/\*\*[\s\S]*?CORRECTIF #8[\s\S]*?\*\/\s*function getUidFromToken\(token\) \{\s*try \{\s*const payload = JSON\.parse\(atob\(token\.split\('\.'\)\[1\]\)\);\s*return payload\.sub \|\| null;\s*\} catch\(e\) \{ return null; \}\s*\}\s*/g;
  const alertPattern = /const alertsUid = getUidFromToken\(currentUser\.token\) \|\| '';\s*const r = await fetch\(`\$\{API\}\/alerts\/\$\{encodeURIComponent\(alertsUid\)\}`, \{\s*headers: \{'Authorization': `Bearer \$\{currentUser\.token\}`\}\s*\}\);/g;

  const helperMatches = output.match(helperPattern) || [];
  const alertMatches = output.match(alertPattern) || [];
  if (helperMatches.length === 0 && alertMatches.length === 0) {
    return output;
  }
  if (helperMatches.length !== 1 || alertMatches.length !== 1) {
    throw new Error(
      `unverified JWT identity boundary drift: helper=${helperMatches.length} alerts=${alertMatches.length}`,
    );
  }

  output = replaceExactlyOnce(output, helperPattern, '', 'unverified JWT identity helper');

  const authoritativeLookup = `const identityResponse = await fetch(\`${'${API}'}/account/profile\`, {\n      headers: {'Authorization': \`Bearer ${'${currentUser.token}'}\`}\n    });\n    if (!identityResponse.ok) throw new Error('Identité Julvox indisponible');\n    const identity = await identityResponse.json();\n    const alertsUid = typeof identity.uid === 'string' ? identity.uid.trim() : '';\n    if (!alertsUid) throw new Error('Identité Julvox invalide');\n    const r = await fetch(\`${'${API}'}/alerts/${'${encodeURIComponent(alertsUid)}'}\`, {\n      headers: {'Authorization': \`Bearer ${'${currentUser.token}'}\`}\n    });`;
  output = replaceExactlyOnce(output, alertPattern, authoritativeLookup, 'alert identity lookup');

  if (output.includes('getUidFromToken(') || output.includes("JSON.parse(atob(token.split('.')[1]))")) {
    throw new Error('unverified JWT identity decode remains in public artifact');
  }
  return output;
}

module.exports = { removeUnverifiedJwtIdentity };