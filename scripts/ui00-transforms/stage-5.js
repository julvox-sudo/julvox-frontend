function qualifyTruthWording(source) {
  return source
    .replace(/>\s*Live\s*</gi, '>Offres<')
    .replace(/(['"`])LIVE\1/g, '$1OFFRES$1')
    .replace(/en temps réel/gi, 'à partir des données disponibles')
    .replace(/temps réel/gi, 'données disponibles')
    .replace(/vérifié il y a/gi, 'mis à jour selon les données disponibles');
}

module.exports = function transformStage(html, enhancements) {
  return {
    html: qualifyTruthWording(html),
    enhancements: qualifyTruthWording(enhancements),
  };
};

module.exports.qualifyTruthWording = qualifyTruthWording;
