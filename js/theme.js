// Stamps data-theme on <html> before first paint. Loaded blocking in <head>.
(function () {
  var KEY = 'pvphelper-theme';
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function readPref() {
    try { return localStorage.getItem(KEY) || 'system'; } catch (e) { return 'system'; }
  }

  function resolve(pref) {
    if (pref === 'light' || pref === 'dark') return pref;
    return media && media.matches ? 'dark' : 'light';
  }

  function apply(pref) {
    document.documentElement.dataset.theme = resolve(pref);
  }

  function set(pref) {
    try { localStorage.setItem(KEY, pref); } catch (e) { /* private mode */ }
    apply(pref);
  }

  if (media && media.addEventListener) {
    media.addEventListener('change', function () {
      if (readPref() === 'system') apply('system');
    });
  }

  apply(readPref());
  window.Theme = { get: readPref, set: set };
})();
