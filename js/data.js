// Loads the PvPoke snapshot in data/*.js and indexes it. No DOM beyond script injection.
// The data files assign into PvpData.raw; script tags (not fetch) keep file:// working.
(function () {
  var PvpData = window.PvpData = window.PvpData || { raw: {} };
  var pending = {};

  function loadScript(key, src) {
    if (PvpData.raw[key]) return Promise.resolve(PvpData.raw[key]);
    if (pending[key]) return pending[key];
    pending[key] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = function () {
        if (PvpData.raw[key]) resolve(PvpData.raw[key]);
        else reject(new Error(src + ' loaded but did not define ' + key));
      };
      script.onerror = function () {
        delete pending[key];
        reject(new Error('Could not load ' + src));
      };
      document.head.appendChild(script);
    });
    return pending[key];
  }

  function indexBy(list, field) {
    var map = {};
    list.forEach(function (item) { map[item[field]] = item; });
    return map;
  }

  var gamemaster = null;

  // Resolves to { timestamp, pokemon: [...], moves: [...], pokemonById, movesById }.
  PvpData.gamemaster = function () {
    if (gamemaster) return Promise.resolve(gamemaster);
    return loadScript('gamemaster', 'data/gamemaster.js').then(function (raw) {
      gamemaster = {
        timestamp: raw.timestamp,
        pokemon: raw.pokemon,
        moves: raw.moves,
        pokemonById: indexBy(raw.pokemon, 'id'),
        movesById: indexBy(raw.moves, 'moveId')
      };
      return gamemaster;
    });
  };

  // league: 'great' | 'ultra' | 'master'. Resolves to the ranked list, best first.
  PvpData.rankings = function (league) {
    var key = 'rankings-' + league;
    return loadScript(key, 'data/' + key + '.js');
  };
})();
