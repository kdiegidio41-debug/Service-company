'use strict';
// In-memory stand-ins for the Google Apps Script services Outreach.gs uses,
// so the whole flow (send → reply → sort → alert) can run under Node.
// They model behaviour the script relies on, not every Google API detail.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'Outreach.gs');

// ───────────────────────────────── chainable no-op builder (conditional formats, validation)

function builder() {
  const target = { build: () => ({ built: true }) };
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      return () => proxy;
    },
  });
  return proxy;
}

// Formatting calls the tests don't care about become chainable no-ops. Anything else unknown throws,
// so a typo in the script (getValuess) fails the tests instead of passing silently.
function withNoOps(obj) {
  const proxy = new Proxy(obj, {
    get(t, prop) {
      if (typeof prop !== 'string' || prop in t) return t[prop];
      if (/^(set|hide|show|auto)/.test(prop)) return () => proxy;
      throw new Error('Fake does not implement ' + prop);
    },
  });
  return proxy;
}

// ───────────────────────────────── Sheets

class FakeRange {
  constructor(sheet, row, col, nr, nc) {
    this.sheet = sheet; this.row = row; this.col = col; this.nr = nr; this.nc = nc;
    return withNoOps(this);
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.nr; r++) {
      const line = [];
      for (let c = 0; c < this.nc; c++) line.push(this.sheet.cell(this.row + r, this.col + c));
      out.push(line);
    }
    return out;
  }
  getValue() { return this.sheet.cell(this.row, this.col); }
  setValues(v) {
    if (v.length !== this.nr || v.some((line) => line.length !== this.nc)) {
      throw new Error('setValues size mismatch: range ' + this.nr + 'x' + this.nc);
    }
    v.forEach((line, r) => line.forEach((x, c) => this.sheet.put(this.row + r, this.col + c, x)));
    return this;
  }
  setValue(v) { this.sheet.put(this.row, this.col, v); return this; }
  clearContent() {
    for (let r = 0; r < this.nr; r++) for (let c = 0; c < this.nc; c++) this.sheet.put(this.row + r, this.col + c, '');
    return this;
  }
  setNumberFormat(f) {
    for (let r = 0; r < this.nr; r++) for (let c = 0; c < this.nc; c++) this.sheet.formats[(this.row + r) + ':' + (this.col + c)] = f;
    return this;
  }
  getRow() { return this.row; }
}

class FakeSheet {
  constructor(name) {
    this.name = name; this.data = []; this.formats = {}; this.hidden = false; this.activeRow = 2; this.activeRows = 1;
    return withNoOps(this);
  }
  getName() { return this.name; }
  cell(r, c) {
    const line = this.data[r - 1];
    const v = line ? line[c - 1] : undefined;
    return v === undefined || v === null ? '' : v;
  }
  put(r, c, v) {
    while (this.data.length < r) this.data.push([]);
    const line = this.data[r - 1];
    while (line.length < c) line.push('');
    // Like Sheets: a numeric-looking string in a non-text cell becomes a number.
    const fmt = this.formats[r + ':' + c];
    if (typeof v === 'string' && fmt !== '@' && /^-?\d+(\.\d+)?(e\d+)?$/i.test(v)) v = Number(v);
    line[c - 1] = v;
  }
  getLastRow() {
    for (let r = this.data.length; r > 0; r--) {
      if (this.data[r - 1].some((v) => v !== '' && v !== undefined && v !== null)) return r;
    }
    return 0;
  }
  getLastColumn() {
    let w = 0;
    this.data.forEach((line) => line.forEach((v, i) => { if (v !== '' && v !== undefined && v !== null) w = Math.max(w, i + 1); }));
    return w;
  }
  getMaxRows() { return Math.max(1000, this.data.length); }
  getRange(r, c, nr, nc) { return new FakeRange(this, r, c, nr || 1, nc || 1); }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  appendRow(values) {
    const r = this.getLastRow() + 1;
    values.forEach((v, i) => this.put(r, i + 1, v));
    return this;
  }
  deleteRows(start, n) { this.data.splice(start - 1, n); }
  clearContents() { this.data = []; return this; }
  hideSheet() { this.hidden = true; return this; }
  getActiveRange() { return { getRow: () => this.activeRow, getNumRows: () => this.activeRows }; }
  // Test helpers
  rowsAsObjects() {
    const values = this.getDataRange().getValues();
    const head = values[0];
    return values.slice(1).map((line) => Object.fromEntries(head.map((h, i) => [h, line[i]])));
  }
}

class FakeSpreadsheet {
  constructor(tz) { this.sheets = []; this.tz = tz; this.toasts = []; this.active = null; this.activeRow = 2; }
  getSheetByName(n) { return this.sheets.find((s) => s.getName() === n) || null; }
  insertSheet(name, index) {
    if (this.getSheetByName(name)) throw new Error('Sheet exists: ' + name);
    const s = new FakeSheet(name);
    if (index === undefined) this.sheets.push(s); else this.sheets.splice(index, 0, s);
    return s;
  }
  getSpreadsheetTimeZone() { return this.tz; }
  toast(msg) { this.toasts.push(msg); }
  getActiveSheet() { return this.active || this.sheets[0]; }
}

// ───────────────────────────────── Gmail

function addrOf(from) {
  const m = String(from).match(/<([^>]+)>/);
  return (m ? m[1] : String(from)).trim().toLowerCase();
}

class MailWorld {
  constructor(me, clock) {
    this.me = me; this.clock = clock;
    this.messages = []; this.seq = 0; this.threadSeq = 0;
    this.drafts = []; this.alerts = []; this.labels = {}; this.searches = []; this.Date = Date;
  }
  add({ threadId, from, to, subject, body, date, headers }) {
    const id = 'm' + (++this.seq).toString(16).padStart(15, '0');
    const tid = threadId || '19' + String(++this.threadSeq).padStart(17, '0');
    const msg = {
      id, threadId: tid, from, to, subject, body: body || '',
      date: date || new this.Date(this.clock.now.getTime()),
      headers: headers || {}, rfcId: '<' + id + '@mail.fake>',
    };
    this.messages.push(msg);
    return msg;
  }
  thread(id) {
    if (!this.messages.some((m) => m.threadId === id)) return null;
    return new FakeThread(this, id);
  }
  sentTo(email) { return this.messages.filter((m) => addrOf(m.from) === this.me && addrOf(m.to) === email); }
}

class FakeThread {
  constructor(world, id) { this.world = world; this.id = id; }
  getId() { return this.id; }
  getMessages() {
    return this.world.messages.filter((m) => m.threadId === this.id)
      .sort((a, b) => a.date - b.date).map((m) => new FakeMessage(this.world, m));
  }
  getPermalink() { return 'https://mail.google.com/mail/#all/' + this.id; }
  addLabel(label) {
    (this.world.labels[label.getName()] = this.world.labels[label.getName()] || []).push(this.id);
    return this;
  }
}

class FakeMessage {
  constructor(world, m) { this.world = world; this.m = m; }
  getId() { return this.m.id; }
  getFrom() { return this.m.from; }
  getTo() { return this.m.to; }
  getSubject() { return this.m.subject; }
  getPlainBody() { return this.m.body; }
  getDate() { return this.m.date; }
  getHeader(name) {
    const k = Object.keys(this.m.headers).find((h) => h.toLowerCase() === name.toLowerCase());
    return k ? this.m.headers[k] : '';
  }
  getThread() { return new FakeThread(this.world, this.m.threadId); }
  createDraftReply(body) {
    this.world.drafts.push({ threadId: this.m.threadId, to: addrOf(this.m.from), body });
    return {};
  }
}

function parseRaw(raw) {
  const text = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const split = text.indexOf('\r\n\r\n');
  if (split < 0) throw new Error('Raw email has no header/body separator');
  const headers = {};
  text.slice(0, split).split('\r\n').forEach((line) => {
    if (/\n|\r/.test(line)) throw new Error('Header injection: ' + line);
    const i = line.indexOf(':');
    headers[line.slice(0, i)] = line.slice(i + 1).trim();
  });
  let body = text.slice(split + 4);
  if (/base64/i.test(headers['Content-Transfer-Encoding'] || '')) body = Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8');
  return { headers, body: body.replace(/\r\n/g, '\n') };
}

function decodeSubject(s) {
  const m = String(s).match(/^=\?UTF-8\?B\?(.*)\?=$/);
  return m ? Buffer.from(m[1], 'base64').toString('utf8') : s;
}

function makeGmailApp(world) {
  const labelObjs = {};
  return {
    search(query, start, max) {
      world.searches.push(query);
      let cutoff = 0;
      const nd = query.match(/newer_than:(\d+)d/);
      const after = query.match(/after:(\d+)/);
      if (nd) cutoff = world.clock.now.getTime() - Number(nd[1]) * 86400000;
      if (after) cutoff = Number(after[1]) * 1000;
      const notMe = /-from:me/.test(query);
      const ids = [];
      world.messages
        .filter((m) => m.date.getTime() >= cutoff && (!notMe || addrOf(m.from) !== world.me))
        .sort((a, b) => b.date - a.date)
        .forEach((m) => { if (ids.indexOf(m.threadId) === -1) ids.push(m.threadId); });
      return ids.slice(start, start + max).map((id) => new FakeThread(world, id));
    },
    getThreadById(id) { return world.thread(id); },
    getAliases() { return []; },
    sendEmail(to, subject, body, opts) { world.alerts.push({ to, subject, body, opts }); },
    getUserLabelByName(name) { return labelObjs[name] || null; },
    createLabel(name) { labelObjs[name] = { getName: () => name }; return labelObjs[name]; },
  };
}

function makeAdvancedGmail(world) {
  return {
    Users: {
      Messages: {
        send(resource, user) {
          if (user !== 'me') throw new Error('user must be me');
          const parsed = parseRaw(resource.raw);
          if (resource.threadId && !world.thread(resource.threadId)) throw new Error('Unknown threadId');
          const from = parsed.headers.From || world.me;
          if (addrOf(from) !== world.me) throw new Error('From must be the account: ' + from);
          const msg = world.add({
            threadId: resource.threadId,
            from,
            to: parsed.headers.To,
            subject: decodeSubject(parsed.headers.Subject),
            body: parsed.body,
            headers: parsed.headers,
          });
          msg.raw = parsed;
          return { id: msg.id, threadId: msg.threadId };
        },
        get(user, id) {
          const m = world.messages.find((x) => x.id === id);
          return { id, payload: { headers: [{ name: 'Message-ID', value: m.rfcId }] } };
        },
      },
    },
  };
}

// ───────────────────────────────── Utilities.formatDate

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatDate(date, tz, pattern) {
  if (Object.prototype.toString.call(date) !== '[object Date]' || isNaN(date.getTime())) throw new Error('formatDate needs a Date');
  const parts = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, weekday: 'long',
  }).formatToParts(date).forEach((p) => { parts[p.type] = p.value; });
  const Y = Number(parts.year), M = Number(parts.month), D = Number(parts.day);
  const H = Number(parts.hour) % 24, m = Number(parts.minute), s = Number(parts.second);
  const dow = DAYS.indexOf(parts.weekday) + 1;
  const pad = (n, w) => String(n).padStart(w, '0');
  const h12 = H % 12 === 0 ? 12 : H % 12;
  const tokens = {
    yyyy: () => String(Y), MMMM: () => MONTHS[M - 1], MMM: () => MONTHS[M - 1].slice(0, 3), MM: () => pad(M, 2), M: () => String(M),
    dd: () => pad(D, 2), d: () => String(D), HH: () => pad(H, 2), H: () => String(H), hh: () => pad(h12, 2), h: () => String(h12),
    mm: () => pad(m, 2), m: () => String(m), ss: () => pad(s, 2), a: () => (H < 12 ? 'AM' : 'PM'),
    EEEE: () => DAYS[dow - 1], EEE: () => DAYS[dow - 1].slice(0, 3), u: () => String(dow),
  };
  let out = '';
  for (let i = 0; i < pattern.length;) {
    const ch = pattern[i];
    if (ch === "'") {
      const end = pattern.indexOf("'", i + 1);
      out += pattern.slice(i + 1, end);
      i = end + 1;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (pattern[j] === ch) j++;
      const run = pattern.slice(i, j);
      if (!tokens[run]) throw new Error('Fake formatDate does not support "' + run + '"');
      out += tokens[run]();
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// ───────────────────────────────── World

/**
 * Builds a fresh sandbox with Outreach.gs loaded.
 * opts.claude(requestBody) → classification object, or { status, text } for an HTTP error.
 */
function createWorld(opts) {
  opts = opts || {};
  const tz = opts.tz || 'America/New_York';
  const me = opts.me || 'kris@outreach.test';
  const clock = { now: opts.start || new Date('2026-07-14T12:05:00Z') };
  const mail = new MailWorld(me, clock);
  const ss = new FakeSpreadsheet(tz);
  const props = {};
  const triggers = [];
  const fetches = [];
  const ui = {
    alerts: [], dialogs: [], promptAnswer: '',
    Button: { OK: 'OK', CANCEL: 'CANCEL', YES: 'YES', NO: 'NO' },
    ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO' },
    createMenu() { const m = { addItem: () => m, addSeparator: () => m, addSubMenu: () => m, addToUi: () => m }; return m; },
    alert(...args) { ui.alerts.push(args); return args[2] === 'YES_NO' ? (ui.yesNo || 'YES') : 'OK'; },
    prompt() { return { getSelectedButton: () => 'OK', getResponseText: () => ui.promptAnswer }; },
    showModalDialog(out, title) { ui.dialogs.push({ html: out.html, title }); },
  };

  const sandbox = {
    console: { log() {}, error: console.error },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      getActive: () => ss,
      getActiveSheet: () => ss.getActiveSheet(),
      getUi: () => ui,
      newConditionalFormatRule: builder,
      newDataValidation: builder,
    },
    Session: {
      getEffectiveUser: () => ({ getEmail: () => me }),
      getScriptTimeZone: () => tz,
    },
    GmailApp: makeGmailApp(mail),
    Gmail: makeAdvancedGmail(mail),
    Utilities: {
      Charset: { UTF_8: 'UTF-8' },
      sleep() {},
      base64Encode: (s) => Buffer.from(String(s), 'utf8').toString('base64'),
      base64EncodeWebSafe: (s) => Buffer.from(String(s), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      formatDate,
    },
    UrlFetchApp: {
      fetch(url, params) { return route(url, params || {}); },
      // Like the real one: one network failure fails the whole batch.
      fetchAll(requests) {
        fetchAllCalls.push(requests.length);
        return requests.map((r) => route(r.url, r));
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: (k) => { delete props[k]; },
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger(fn) {
        const t = { fn, getHandlerFunction: () => fn };
        const b = { timeBased: () => b, everyMinutes: (n) => { t.minutes = n; return b; }, create: () => { triggers.push(t); return t; } };
        return b;
      },
    },
    HtmlService: {
      createHtmlOutput(html) { const o = { html, setWidth: () => o, setHeight: () => o }; return o; },
    },
  };
  const fetchAllCalls = [];
  // opts.sites: { 'https://a.test': '<html>...' | { status, body } | 'down' }
  const sites = opts.sites || {};
  function route(url, params) {
    fetches.push({ url, params });
    if (url.startsWith('https://api.anthropic.com/')) {
      const body = JSON.parse(params.payload);
      const answer = opts.claude ? opts.claude(body, params) : { status: 500, text: 'no fake' };
      if (answer && answer.status) return response(answer.status, answer.text || '');
      return response(200, JSON.stringify({
        id: 'msg_fake', type: 'message', role: 'assistant', model: body.model, stop_reason: answer.stop_reason || 'end_turn',
        content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text: JSON.stringify(answer) }],
      }));
    }
    if (url.startsWith('https://ntfy.sh/')) return response(200, '{}');
    if (url.startsWith('https://places.googleapis.com/')) {
      const answer = opts.places ? opts.places(JSON.parse(params.payload), params) : { status: 403, json: { error: { message: 'no fake' } } };
      return response(answer.status || 200, JSON.stringify(answer.json));
    }
    const key = Object.keys(sites).find((k) => k === url || k === url.replace(/\/$/, '') || k + '/' === url);
    if (key) {
      const site = sites[key];
      if (site === 'down') throw new Error('Address unavailable: ' + url);
      return typeof site === 'string' ? response(200, site) : response(site.status, site.body || '');
    }
    const host = (url.match(/^https?:\/\/([^/]+)/) || [])[1];
    if (Object.keys(sites).some((k) => k.includes('//' + host))) return response(404, 'Not found');
    throw new Error('Unexpected fetch to ' + url);
  }

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: 'Outreach.gs' });
  // Dates must come from the sandbox's own Date, as they would inside Apps Script.
  const SDate = vm.runInContext('Date', sandbox);
  mail.Date = SDate;
  sandbox.now_ = () => new SDate(clock.now.getTime());

  return { gs: sandbox, ss, mail, clock, props, triggers, fetches, fetchAllCalls, ui, me, tz };
}

function response(code, text) {
  return { getResponseCode: () => code, getContentText: () => text };
}

module.exports = { createWorld, formatDate, parseRaw, decodeSubject, addrOf };
