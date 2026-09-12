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
    if (n > 1) return 'up';
    if (n < -1) return 'down';
    return 'flat';
  }

  /* "up 12 percent" / "down 4 percent" / "about flat" — for speech. */
  function dirSpoken(n) {
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

  return {
    commas: commas, compact: compact, money: money, spoken: spoken,
    pct: pct, dir: dir, dirSpoken: dirSpoken,
    greeting: greeting, clockTime: clockTime, ago: ago,
    clean: clean, pick: pick
  };
})();
