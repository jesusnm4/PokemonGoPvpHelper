#!/usr/bin/env node
// Runs js/engine.test.js headless, loading the same files as tests.html. No dependencies.
//   node scripts/run-tests.js
// Exits non-zero if any test fails. tests.html remains the source of truth.
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..');
globalThis.window = globalThis;

['data/gamemaster.js', 'data/rankings-great.js', 'data/rankings-ultra.js', 'data/rankings-master.js',
  'js/engine.js', 'js/engine.test.js'].forEach(function (file) {
  vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
});

var results = window.EngineTests.results;
var failed = results.filter(function (r) { return !r.pass; });
results.forEach(function (r) {
  if (!r.pass || process.argv.indexOf('--verbose') !== -1) {
    console.log((r.pass ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  (' + r.detail + ')' : ''));
  }
});
console.log((results.length - failed.length) + ' passed, ' + failed.length + ' failed');
process.exit(failed.length ? 1 : 0);
