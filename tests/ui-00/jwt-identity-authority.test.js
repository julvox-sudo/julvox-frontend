const test = require('node:test');
const assert = require('node:assert/strict');
const { removeUnverifiedJwtIdentity } = require('../../scripts/ui00-transforms/remove-unverified-jwt-identity');

const fixture = `
/**
 * CORRECTIF #8 : décode le sub (firebase_uid) depuis le payload JWT.
 * Le backend attend un firebase_uid court dans l'URL /alerts/{user_id},
 * pas le token JWT complet.
 * Pas besoin de vérifier la signature côté client — on lit juste le payload.
 */
function getUidFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch(e) { return null; }
}
async function openAlerts(){
  const alertsUid = getUidFromToken(currentUser.token) || '';
  const r = await fetch(\`${'${API}'}/alerts/${'${encodeURIComponent(alertsUid)}'}\`, {
    headers: {'Authorization': \`Bearer ${'${currentUser.token}'}\`}
  });
}
`;

test('alert identity comes from authenticated server profile, never an unverified JWT payload', () => {
  const output = removeUnverifiedJwtIdentity(fixture);
  assert.equal(output.includes('getUidFromToken'), false);
  assert.equal(output.includes("JSON.parse(atob(token.split('.')[1]))"), false);
  assert.match(output, /\/account\/profile/);
  assert.match(output, /typeof identity\.uid === 'string'/);
  assert.match(output, /\/alerts\/\$\{encodeURIComponent\(alertsUid\)\}/);
});

test('generic build-transform fixtures without auth code remain unchanged', () => {
  const input = '<html><head></head><body>fixture</body></html>';
  assert.equal(removeUnverifiedJwtIdentity(input), input);
});

test('partial historical identity drift fails closed', () => {
  const partial = fixture.replace(
    /\s*const alertsUid = getUidFromToken[\s\S]*?\n  \}\);/,
    '',
  );
  assert.throws(
    () => removeUnverifiedJwtIdentity(partial),
    /identity boundary drift/,
  );
});