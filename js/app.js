// Owns state, form wiring and rendering. Team math lives in js/engine.js, data loading in js/data.js.
(function () {
  var KEY = 'pvphelper-state-v1';
  var LEAGUES = ['great', 'ultra', 'master'];
  var STYLES = ['abc', 'abb', 'aba', 'any'];
  var LEAGUE_NAMES = { great: 'Great League', ultra: 'Ultra League', master: 'Master League' };
  var STYLE_NAMES = { abc: 'ABC', abb: 'ABB', aba: 'ABA', any: 'Any' };
  var ROLE_NAMES = { lead: 'Lead', swap: 'Safe swap', closer: 'Closer' };
  var MAX_MATCHES = 8;
  var QUICK_PICKS = 6;

  var state = load();
  var contexts = {};   // league -> Engine context, built once per league
  var teams = [];      // current suggestions (engine teams)
  var described = [];  // Engine.describeTeam() of each, for the detail view
  var runId = 0;       // ignores results from a superseded search

  // ---- Persistence ----

  function load() {
    var s = { league: 'great', style: 'abc', picks: [null, null], selected: 0 };
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (LEAGUES.indexOf(saved.league) !== -1) s.league = saved.league;
      if (STYLES.indexOf(saved.style) !== -1) s.style = saved.style;
      // Pick ids are checked against the league's rankings once they load (see validatePicks).
      if (Array.isArray(saved.picks)) {
        s.picks = [0, 1].map(function (i) { return typeof saved.picks[i] === 'string' ? saved.picks[i] : null; });
      }
    } catch (e) { /* private mode or bad JSON: keep defaults */ }
    return s;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ league: state.league, style: state.style, picks: state.picks }));
    } catch (e) { /* private mode */ }
  }

  // ---- Helpers ----

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function normalize(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function typeChips(types) {
    return types.map(function (t) {
      return '<span class="type" data-type="' + escapeHtml(t) + '">' + escapeHtml(capitalize(t)) + '</span>';
    }).join('');
  }

  // Plain-language reading of a battle rating (500 = even).
  function verdict(rating) {
    if (rating >= 700) return 'strong win';
    if (rating > 550) return 'win';
    if (rating >= 450) return 'toss-up';
    if (rating >= 300) return 'loss';
    return 'hard loss';
  }

  function contextFor(league) {
    return Promise.all([window.PvpData.gamemaster(), window.PvpData.rankings(league)]).then(function (data) {
      if (!contexts[league]) contexts[league] = window.Engine.createContext(data[0], data[1], league);
      return contexts[league];
    });
  }

  function currentPicks() {
    return state.picks.filter(Boolean);
  }

  // ---- Pokémon search (combobox) ----

  function setupCombo(combo) {
    var slot = Number(combo.dataset.slot);
    var input = combo.querySelector('input');
    var list = combo.querySelector('.combo-list');
    var clear = combo.querySelector('.clear');
    var matches = [];
    var active = -1;

    function selectedName() {
      var id = state.picks[slot];
      var ctx = contexts[state.league];
      return id && ctx && ctx.byId[id] ? ctx.byId[id].pokemon.name : '';
    }

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function search(query) {
      var ctx = contexts[state.league];
      var q = normalize(query);
      if (!ctx || !q) return [];
      var other = state.picks[1 - slot];
      var otherDex = other && ctx.byId[other] ? ctx.byId[other].pokemon.dex : null;
      var starts = [], contains = [];
      ctx.ranked.forEach(function (e) {
        if (e.pokemon.dex === otherDex) return;
        var name = normalize(e.pokemon.name);
        var nick = (e.pokemon.nicknames || []).some(function (n) { return normalize(n).indexOf(q) === 0; });
        if (name.indexOf(q) === 0 || nick) starts.push(e);
        else if (name.indexOf(q) !== -1) contains.push(e);
      });
      // ctx.ranked is already in ranking order, so each group stays best-first.
      return starts.concat(contains).slice(0, MAX_MATCHES);
    }

    function renderList() {
      if (!matches.length) {
        list.innerHTML = '<li class="empty" role="option" aria-disabled="true">No ranked Pokémon matches</li>';
      } else {
        var ctx = contexts[state.league];
        list.innerHTML = matches.map(function (e, i) {
          return '<li role="option" id="pick-' + slot + '-opt-' + i + '" data-index="' + i + '"' +
            (i === active ? ' aria-selected="true" class="active"' : '') + '>' +
            '<span class="opt-name">' + escapeHtml(e.pokemon.name) + '</span>' +
            '<span class="opt-meta">' + typeChips(e.pokemon.types) +
            ' <small>#' + (ctx.ranked.indexOf(e) + 1) + '</small></span></li>';
        }).join('');
      }
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      if (active >= 0) input.setAttribute('aria-activedescendant', 'pick-' + slot + '-opt-' + active);
      else input.removeAttribute('aria-activedescendant');
    }

    function choose(entry) {
      input.value = entry.pokemon.name;
      close();
      setPick(slot, entry.id);
    }

    input.addEventListener('input', function () {
      matches = search(input.value);
      active = matches.length ? 0 : -1;
      if (input.value.trim()) renderList(); else close();
    });

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        if (list.hidden) { matches = search(input.value); active = -1; }
        if (!matches.length) return;
        ev.preventDefault();
        var step = ev.key === 'ArrowDown' ? 1 : -1;
        active = (active + step + matches.length) % matches.length;
        renderList();
      } else if (ev.key === 'Enter') {
        if (!list.hidden && active >= 0 && matches[active]) {
          ev.preventDefault();
          choose(matches[active]);
        }
      } else if (ev.key === 'Escape') {
        if (!list.hidden) { ev.preventDefault(); close(); input.value = selectedName(); }
      }
    });

    // mousedown, not click: it fires before the input's blur, which would close the list first.
    list.addEventListener('mousedown', function (ev) {
      var li = ev.target.closest('li[data-index]');
      if (!li) return;
      ev.preventDefault();
      choose(matches[Number(li.dataset.index)]);
    });

    input.addEventListener('blur', function () {
      close();
      // Typing without choosing leaves the previous pick in place.
      input.value = selectedName();
    });

    clear.addEventListener('click', function () {
      input.value = '';
      setPick(slot, null);
      input.focus();
    });

    return {
      sync: function () {
        if (document.activeElement !== input) input.value = selectedName();
        clear.hidden = !state.picks[slot];
      }
    };
  }

  var combos = Array.prototype.map.call(document.querySelectorAll('.combo'), setupCombo);

  function syncCombos() {
    combos.forEach(function (c) { c.sync(); });
  }

  function setPick(slot, id) {
    state.picks[slot] = id;
    // Keep the filled slot first, so "one pick" always means slot 0.
    if (!state.picks[0] && state.picks[1]) state.picks = [state.picks[1], null];
    state.selected = 0;
    save();
    syncCombos();
    renderQuickPicks();
    runSearch();
  }

  // Drops saved picks that are not ranked in the current league.
  function validatePicks(ctx) {
    var dropped = state.picks.filter(function (id) { return id && !ctx.byId[id]; });
    state.picks = state.picks.filter(function (id) { return id && ctx.byId[id]; });
    while (state.picks.length < 2) state.picks.push(null);
    if (dropped.length) save();
    return dropped;
  }

  function renderQuickPicks() {
    var el = document.getElementById('quick-picks');
    var ctx = contexts[state.league];
    if (!ctx || currentPicks().length === 2) { el.innerHTML = ''; return; }
    var taken = currentPicks().map(function (id) { return ctx.byId[id].pokemon.dex; });
    var top = ctx.ranked.filter(function (e) { return taken.indexOf(e.pokemon.dex) === -1; }).slice(0, QUICK_PICKS);
    el.innerHTML = '<span class="quick-label">Popular in ' + LEAGUE_NAMES[state.league] + ':</span> ' +
      top.map(function (e) {
        return '<button type="button" class="chip" data-id="' + escapeHtml(e.id) + '">' + escapeHtml(e.pokemon.name) + '</button>';
      }).join('');
  }

  document.getElementById('quick-picks').addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-id]');
    if (!btn) return;
    setPick(state.picks[0] ? 1 : 0, btn.dataset.id);
  });

  // ---- Results ----

  function resultsEl() { return document.getElementById('results'); }

  function showMessage(html, cls) {
    resultsEl().innerHTML = '<p class="' + (cls || 'placeholder') + '">' + html + '</p>';
  }

  function runSearch(notice) {
    var id = ++runId;
    var league = state.league;
    contextFor(league).then(function (ctx) {
      if (id !== runId) return;
      var dropped = validatePicks(ctx);
      syncCombos();
      renderQuickPicks();
      if (dropped.length) {
        notice = dropped.length === 1 ? 'Your previous pick isn’t ranked in ' + LEAGUE_NAMES[league] + ', so it was removed.'
          : 'Your previous picks aren’t ranked in ' + LEAGUE_NAMES[league] + ', so they were removed.';
      }
      var picks = currentPicks();
      if (!picks.length) {
        teams = [];
        described = [];
        showMessage((notice ? escapeHtml(notice) + ' ' : '') +
          'Pick a Pokémon above to get team suggestions for ' + LEAGUE_NAMES[league] + '.');
        return;
      }
      showMessage('Finding the best teams…');
      // Let the message paint before the search blocks the main thread (up to about a second).
      setTimeout(function () {
        if (id !== runId) return;
        try {
          teams = window.Engine.suggest(ctx, picks, state.style, 5);
        } catch (err) {
          showMessage(escapeHtml(err.message), 'error');
          return;
        }
        if (!teams.length) {
          showMessage('No ' + STYLE_NAMES[state.style] + ' team fits ' + (picks.length === 1 ? 'this pick' : 'these picks') +
            '. Try another team style.');
          return;
        }
        state.selected = Math.min(state.selected, teams.length - 1);
        renderTeams(ctx, notice);
      }, 30);
    }).catch(function (err) {
      if (id !== runId) return;
      showMessage('Could not load Pokémon data (' + escapeHtml(err.message) + '). Try reloading the page.', 'error');
    });
  }

  function renderTeams(ctx, notice) {
    described = teams.map(function (t) { return window.Engine.describeTeam(ctx, t); });
    var picks = currentPicks();
    var heading = picks.length === 1 ? 'Best partners for ' + escapeHtml(ctx.byId[picks[0]].pokemon.name)
      : 'Best third for ' + escapeHtml(ctx.byId[picks[0]].pokemon.name) + ' and ' + escapeHtml(ctx.byId[picks[1]].pokemon.name);

    var list = described.map(function (d, i) {
      return '<li><button type="button" class="team-option" data-team="' + i + '" aria-pressed="' + (i === state.selected) + '">' +
        '<span class="team-rank">' + (i + 1) + '</span>' +
        '<span class="team-names">' + d.members.map(function (m) { return escapeHtml(m.name); }).join(' · ') + '</span>' +
        '<span class="team-score" title="Team score out of 100">' + d.displayScore + '</span></button></li>';
    }).join('');

    resultsEl().innerHTML =
      (notice ? '<p class="notice">' + escapeHtml(notice) + '</p>' : '') +
      '<h2>' + heading + '</h2>' +
      '<p class="hint">' + LEAGUE_NAMES[state.league] + ', ' + STYLE_NAMES[state.style] +
      ' style. Team score (out of 100) rates how well the team covers the league’s top 100 Pokémon.</p>' +
      '<ol class="team-list">' + list + '</ol>' +
      '<div id="team-detail">' + renderDetail(described[state.selected]) + '</div>';
  }

  function renderDetail(d) {
    var members = d.members.map(function (m) {
      var fast = m.moves[0], charged = m.moves.slice(1);
      function move(mv) {
        return '<li>' + (mv.type ? '<span class="type dot" data-type="' + escapeHtml(mv.type) + '" title="' + escapeHtml(capitalize(mv.type)) + '"></span>' : '') +
          escapeHtml(mv.name) + (mv.elite ? ' <abbr class="elite" title="Needs an Elite TM or a Community Day">Elite</abbr>' : '') + '</li>';
      }
      return '<article class="member">' +
        '<p class="role">' + ROLE_NAMES[m.role] + '</p>' +
        '<h3>' + escapeHtml(m.name) + '</h3>' +
        '<p class="types">' + typeChips(m.types) + '</p>' +
        '<dl>' +
        '<dt>Fast move</dt><dd><ul class="moves">' + move(fast) + '</ul></dd>' +
        '<dt>Charged moves</dt><dd><ul class="moves">' + charged.map(move).join('') + '</ul></dd>' +
        '<dt>Rank 1 IVs</dt><dd><span class="ivs" title="Attack / Defense / HP">' + m.ivs.atk + ' / ' + m.ivs.def + ' / ' + m.ivs.hp +
        '</span><br><small>Level ' + m.ivs.level + ' · CP ' + m.ivs.cp + '</small></dd>' +
        '</dl></article>';
    }).join('');

    function threatList(items, strong) {
      return '<ol class="threats">' + items.map(function (t) {
        return '<li><span class="threat-name">' + escapeHtml(t.name) + '</span> ' + typeChips(t.types) +
          '<br><small>' + (strong ? escapeHtml(t.answer) + ': ' : 'Best answer ' + escapeHtml(t.answer) + ': ') +
          '<span class="verdict" title="Battle rating ' + t.rating + ' (500 is even)">' + verdict(t.rating) + '</span></small></li>';
      }).join('') + '</ol>';
    }

    var shared = d.sharedWeaknesses.length
      ? '<p class="shared">Shared weaknesses: ' + d.sharedWeaknesses.map(function (w) {
          return typeChips([w.type]) + ' <small>hits ' + w.count + '</small>';
        }).join(' ') + '</p>'
      : '<p class="shared">No type hits two members super-effectively.</p>';

    return '<p class="coverage">Has a winning answer to <strong>' + d.beats + ' of the top ' + d.threatCount +
      '</strong> Pokémon in the league.</p>' +
      '<div class="members">' + members + '</div>' +
      '<div class="report">' +
      '<section><h3>Top strengths</h3><p class="hint">Top-30 meta threats this team beats most easily.</p>' + threatList(d.strengths, true) + '</section>' +
      '<section><h3>Top weaknesses</h3><p class="hint">Top-30 meta threats with the team’s closest matchups, even if it still wins them.</p>' + threatList(d.weaknesses, false) + shared + '</section>' +
      '</div>';
  }

  resultsEl().addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-team]');
    if (!btn || !described[Number(btn.dataset.team)]) return;
    state.selected = Number(btn.dataset.team);
    Array.prototype.forEach.call(resultsEl().querySelectorAll('.team-option'), function (b) {
      b.setAttribute('aria-pressed', String(b === btn));
    });
    document.getElementById('team-detail').innerHTML = renderDetail(described[state.selected]);
  });

  // ---- Form wiring ----

  function renderDataDate() {
    window.PvpData.gamemaster().then(function (gm) {
      document.getElementById('data-date').textContent = ', game data of ' + gm.timestamp.slice(0, 10);
    }).catch(function () { /* the results panel reports load errors */ });
  }

  function bindRadios(name, field, onChange) {
    var inputs = document.querySelectorAll('input[name="' + name + '"]');
    Array.prototype.forEach.call(inputs, function (input) {
      input.checked = input.value === state[field];
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state[field] = input.value;
        state.selected = 0;
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

  bindRadios('league', 'league', function () { syncCombos(); renderQuickPicks(); runSearch(); });
  bindRadios('style', 'style', function () { runSearch(); });
  bindTheme();
  renderDataDate();
  runSearch();
})();
