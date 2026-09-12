/* =========================================================================
   JARVIS — small shared helpers
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.util = (function () {
  'use strict';

  function commas(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* 12,400 → "12.4k" for tight HUD panels. */
  function compact(n) {
    n = Math.round(n);
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(Math.abs(n) < 10000 ? 1 : 0) + 'k';
    return String(n);
  }

  function money(n, cur) {
    return (cur || '$') + commas(n);
  }

  /* Spoken numbers want to be readable, not exact: "about twelve thousand". */
  function spoken(n) {
    n = Math.round(n);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + ' million';
    if (n >= 10000) return commas(Math.round(n / 100) * 100);
    return commas(n);
  }

  function pct(n, digits) {
    var d = digits === undefined ? 1 : digits;
    return (n >= 0 ? '+' : '') + n.toFixed(d) + '%';
  }

  function dir(n) {
    if (n === null || n === undefined) return 'flat';
    if (n > 1) return 'up';
    if (n < -1) return 'down';
    return 'flat';
  }

  /* "up 12 percent" / "down 4 percent" / "about flat" — for speech. */
  function dirSpoken(n) {
    if (n === null || n === undefined) return 'with no prior week to compare';
    var a = Math.abs(n);
    if (a < 1.5) return 'about flat week over week';
    return (n > 0 ? 'up ' : 'down ') + a.toFixed(0) + ' percent week over week';
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function clockTime(d) {
    d = d || new Date();
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }

  function ago(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  /* Title-case a topic the user spoke, without mangling acronyms. */
  function clean(s) {
    return (s || '').replace(/\s+/g, ' ').trim().replace(/[.!?,]+$/, '');
  }

  function pick(arr, n) {
    var copy = arr.slice(), out = [];
    while (copy.length && out.length < n) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
  }

  var WORDS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, hundred: 100, thousand: 1000, million: 1000000
  };

  /* Pull a number out of something a person said or typed. Speech gives us
     "$1,200", "3.4k", "twelve" and "1.2 million" all for the same idea. */
  function parseNum(text) {
    if (!text) return null;
    var t = String(text).toLowerCase().replace(/,/g, '');

    var m = t.match(/(-?\d+(?:\.\d+)?)\s*(k|m|thousand|million|grand)?/);
    if (m) {
      var n = parseFloat(m[1]);
      var unit = m[2];
      if (unit === 'k' || unit === 'thousand' || unit === 'grand') n *= 1000;
      else if (unit === 'm' || unit === 'million') n *= 1000000;
      return n;
    }

    var w = t.match(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundred|thousand|million)\b/);
    if (w) return WORDS[w[1]];
    return null;
  }

  return {
    parseNum: parseNum,
    commas: commas, compact: compact, money: money, spoken: spoken,
    pct: pct, dir: dir, dirSpoken: dirSpoken,
    greeting: greeting, clockTime: clockTime, ago: ago,
    clean: clean, pick: pick
  };
})();
