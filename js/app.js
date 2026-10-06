// Owns state and form wiring. Engine and data hooks arrive in milestones 2-4 (see PLAN.md).
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

  function bindRadios(name, field) {
    var inputs = document.querySelectorAll('input[name="' + name + '"]');
    Array.prototype.forEach.call(inputs, function (input) {
      input.checked = input.value === state[field];
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state[field] = input.value;
        save();
      });
    });
  }

  function bindTheme() {
    var select = document.getElementById('theme');
    select.value = window.Theme.get();
    select.addEventListener('change', function () { window.Theme.set(select.value); });
  }

  bindRadios('league', 'league');
  bindRadios('style', 'style');
  bindTheme();
})();
