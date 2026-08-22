const test = require('node:test');
const assert = require('node:assert/strict');

const { enforceFailureTruth } = require('../../scripts/julvox-frontend-reconciliation-01-finalize.js');

test('failure truth guard removes deceptive achievement, squad and report success fallbacks', () => {
  const input = `
    const data = await res.json();
    renderAchievements(data, el);
  } catch(e) {
    renderAchievements(getDemoAchievements(), el);
  }

    const data = await res.json();
    showToast('✅ Squad créé ! Code : ' + data.squad_id);
    renderActiveSquad(data);
  } catch(e) {
    const mockId = Math.random().toString(36).substring(2,10).toUpperCase();
    showToast('✅ Squad créé ! Code : ' + mockId);
    renderActiveSquad({ squad_id: mockId, share_url: \`https://julvox.com/?squad=\${mockId}\`, progress: '1/'+count, product_name: product, target_count: count, current_count: 1 });
  }

    const data = await res.json();
    showToast(data.complete ? '🎉 Objectif atteint !' : \`✅ Squad rejoint ! \${data.progress}\`);
  } catch(e) {
    showToast('✅ Squad rejoint ! (démo)');
  }

    await fetch(\`${'${API}'}/deals/${'${reportDealId}'}/report\`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ reason: reportReason, deal_id: reportDealId })
    });
  } catch(e) {}
  closeReport();
  showToast('✅ Merci ! Signalement envoyé. On vérifie ce deal.');
`;

  const output = enforceFailureTruth(input);

  assert.doesNotMatch(output, /renderAchievements\(getDemoAchievements\(\), el\)/);
  assert.doesNotMatch(output, /Squad rejoint ! \(démo\)/);
  assert.doesNotMatch(output, /const mockId = Math\.random/);
  assert.doesNotMatch(output, /catch\(e\) \{\}\n  closeReport/);

  assert.match(output, /if \(!res\.ok\) throw new Error\('achievements_unavailable'\)/);
  assert.match(output, /if \(!res\.ok \|\| !data \|\| !data\.squad_id\)/);
  assert.match(output, /if \(!res\.ok \|\| !data \|\| data\.joined !== true\)/);
  assert.match(output, /if \(!response\.ok\) throw new Error\('deal_report_failed'\)/);
  assert.match(output, /Progression indisponible pour le moment/);
  assert.match(output, /Création du squad impossible/);
  assert.match(output, /Impossible de rejoindre ce squad/);
  assert.match(output, /Signalement non envoyé/);
});
