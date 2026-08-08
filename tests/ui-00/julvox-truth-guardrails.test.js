const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');

const { enforceTruthGuardrails } = require('../../scripts/julvox-frontend-reconciliation-01-finalize.js');

const legacyDecisionSource = `
function getVerdict(s) {
  if (s>=90) return {emoji:'🏆',text:'Exceptionnel',detail:'Prix historiquement bas · Achetez maintenant'};
  if (s>=75) return {emoji:'✅',text:'Très bon deal',detail:'Nettement en dessous de la médiane'};
  if (s>=60) return {emoji:'👍',text:'Bon deal',detail:'Prix inférieur à la moyenne'};
  return {emoji:'⏳',text:'Attendez',detail:'Des prix plus bas sont probables'};
}
function probabilityLabel(trend) {
  return \`${'${Math.round((trend.drop_probability||0.5)*100)}% prob. baisse'}\`;
}
const score = 95;
  const verdicts = [
    [90,'🏆','Achetez maintenant','#00D084'],
    [75,'✅','Très bon deal','#00D084'],
    [60,'👍','Bon deal','#FFB800'],
    [40,'😐','Prix correct','#9999BB'],
    [0,'⏳','Attendez','#FF5C2B'],
  ];
  const [,emoji,text,color] = verdicts.find(([min]) => score >= min);
`;

function execute(source) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.getVerdict = getVerdict; this.probabilityLabel = probabilityLabel;`, context);
  return context;
}

test('score 95 sans preuve ne fabrique aucun verdict acheter', () => {
  const output = enforceTruthGuardrails(legacyDecisionSource);
  const context = execute(output);
  assert.equal(context.getVerdict(95).text, 'Informations insuffisantes');
  assert.doesNotMatch(output, /Achetez maintenant/);
});

test('score 20 sans preuve ne fabrique aucun verdict attendre', () => {
  const output = enforceTruthGuardrails(legacyDecisionSource);
  const context = execute(output);
  assert.equal(context.getVerdict(20).text, 'Informations insuffisantes');
  assert.doesNotMatch(output, /Attendez/);
});

test('drop_probability absente reste inconnue et aucune valeur 0.5 n est inventée', () => {
  const output = enforceTruthGuardrails(legacyDecisionSource);
  const context = execute(output);
  assert.equal(context.probabilityLabel({}), 'Probabilité inconnue');
  assert.doesNotMatch(output, /drop_probability\|\|0\.5/);
});

test('drop_probability observée est conservée sans fallback arbitraire', () => {
  const output = enforceTruthGuardrails(legacyDecisionSource);
  const context = execute(output);
  assert.equal(context.probabilityLabel({ drop_probability: 0.2 }), '20% prob. baisse');
});

test('prix historique absent ne produit aucune mention historiquement bas', () => {
  const output = enforceTruthGuardrails(legacyDecisionSource);
  assert.doesNotMatch(output, /Prix historiquement bas/);
});

test('Decision Engine absent ou non invoqué laisse la donnée décisionnelle insuffisante', () => {
  const output = enforceTruthGuardrails(legacyDecisionSource);
  const context = execute(output);
  for (const score of [0, 20, 60, 95, 100]) {
    assert.equal(context.getVerdict(score).text, 'Informations insuffisantes');
    assert.match(context.getVerdict(score).detail, /Decision Engine/);
  }
});

test('un verdict textuel provenant explicitement du Decision Engine n est pas réécrit globalement', () => {
  const engineBackedText = '<p data-source="decision-engine">Achetez maintenant</p><p>Attendez</p>';
  assert.equal(enforceTruthGuardrails(engineBackedText), engineBackedText);
});
