// Owns state and form wiring. Engine hooks arrive in milestones 3-4 (see PLAN.md).
(function () {
  var KEY = 'pvphelper-state-v1';
  var LEAGUES = { great: 1500, ultra: 2500, master: 10000 };
  var STYLES = ['abc', 'abb', 'aba', 'any'];

  var state = load();

  function load() {
    var s = { league: 'great', style: 'abc' };
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (LEAGUES[saved.league]) s.league = saved.league;
      if (STYLES.indexOf(saved.style) !== -1) s.style = saved.style;
    } catch (e) { /* private mode or bad JSON: keep defaults */ }
    return s;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  var LEAGUE_NAMES = { great: 'Great League', ultra: 'Ultra League', master: 'Master League' };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Placeholder until the engine lands: proves the league's rankings load.
  function renderResults() {
    var results = document.getElementById('results');
    var league = state.league;
    results.innerHTML = '<p class="placeholder">Loading ' + LEAGUE_NAMES[league] + ' rankings…</p>';
    Promise.all([window.PvpData.gamemaster(), window.PvpData.rankings(league)]).then(function (data) {
      if (state.league !== league) return;
      var byId = data[0].pokemonById;
      var top = data[1].slice(0, 5).map(function (r) {
        return '<li>' + escapeHtml(byId[r.id].name) + ' <small>' + r.score + '</small></li>';
      }).join('');
      results.innerHTML =
        '<p class="placeholder">' + data[1].length + ' ranked Pokémon in ' + LEAGUE_NAMES[league] +
        '. Team suggestions arrive in milestone 4. Current top 5:</p><ol class="top-list">' + top + '</ol>';
    }).catch(showLoadError);
  }

  function renderDataDate() {
    window.PvpData.gamemaster().then(function (gm) {
      document.getElementById('data-date').textContent = ', game data of ' + gm.timestamp.slice(0, 10);
    }).catch(function () { /* the results panel reports load errors */ });
  }

  function showLoadError(err) {
    document.getElementById('results').innerHTML =
      '<p class="error">Could not load Pokémon data (' + escapeHtml(err.message) + '). Try reloading the page.</p>';
  }

  function bindRadios(name, field, onChange) {
    var inputs = document.querySelectorAll('input[name="' + name + '"]');
    Array.prototype.forEach.call(inputs, function (input) {
      input.checked = input.value === state[field];
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state[field] = input.value;
        save();
        if (onChange) onChange();
      });
    });
  }

  function bindTheme() {
    var select = document.getElementById('theme');
    select.value = window.Theme.get();
    select.addEventListener('change', function () { window.Theme.set(select.value); });
  }

  bindRadios('league', 'league', renderResults);
  bindRadios('style', 'style');
  bindTheme();
  renderDataDate();
  renderResults();
})();
