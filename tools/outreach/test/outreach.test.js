'use strict';
// Run from the repo root:  node --test tools/outreach/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorld, addrOf } = require('./fakes');

const ADDRESS = 'PO Box 123, Jamison, PA 18929';

// ───────────────────────────────── helpers

function setSetting(w, label, value) {
  const sh = w.ss.getSheetByName('Settings');
  const values = sh.getDataRange().getValues();
  const i = values.findIndex((r) => r[0] === label);
  if (i < 0) throw new Error('No setting labelled ' + label);
  sh.getRange(i + 1, 2).setValue(value);
}

function ready(opts, settings) {
  const w = createWorld(opts);
  w.gs.setupSheets();
  setSetting(w, 'Mailing address (required by law)', ADDRESS);
  setSetting(w, 'Send call alerts to', 'owner@everglow.test');
  setSetting(w, 'Warm-up: emails per day in week 1', 0);
  Object.entries(settings || {}).forEach(([k, v]) => setSetting(w, k, v));
  return w;
}

function addContacts(w, list) {
  const sh = w.ss.getSheetByName('Contacts');
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  list.forEach((c) => sh.appendRow(head.map((h) => (c[h] !== undefined ? c[h] : ''))));
}

function row(w, email) {
  const found = w.ss.getSheetByName('Contacts').rowsAsObjects().find((r) => r.Email === email);
  if (!found) throw new Error('No contact ' + email);
  return found;
}

function at(w, iso) { w.clock.now = new Date(iso); }

function runTicks(w, untilIso, everyMin) {
  const end = new Date(untilIso).getTime();
  while (w.clock.now.getTime() <= end) {
    w.gs.tick();
    w.clock.now = new Date(w.clock.now.getTime() + (everyMin || 10) * 60000);
  }
}

function claudeCalls(w) { return w.fetches.filter((f) => f.url.startsWith('https://api.anthropic.com/')); }
function logEvents(w) { return w.ss.getSheetByName('Log').rowsAsObjects().map((r) => r['What happened']); }

function reply(w, email, extra) {
  const r = row(w, email);
  return w.mail.add(Object.assign({
    threadId: String(r['Thread ID']),
    from: email,
    to: w.me,
    subject: 'Re: ' + r.Subject,
  }, extra));
}

const blank = { phone: '', proposed_time: '', proposed_start: '', referral: '', draft_reply: '' };

function fakeClaude(body) {
  const text = body.messages[0].content;
  if (/Tuesday at 2pm/.test(text)) {
    return Object.assign({}, blank, {
      category: 'INTERESTED', summary: 'Joe wants a call Tuesday at 2pm.', phone: '215-555-0134',
      proposed_time: 'Tuesday at 2pm', proposed_start: '2026-07-21T14:00',
      draft_reply: 'Hi Joe, great. I will call you Tuesday at 2pm at 215-555-0134.',
    });
  }
  if (/already have someone/.test(text)) return Object.assign({}, blank, { category: 'NOT_INTERESTED', summary: 'They already have a lighting company.' });
  if (/out of the office/.test(text)) return Object.assign({}, blank, { category: 'OUT_OF_OFFICE', summary: 'Out until July 20.' });
  return Object.assign({}, blank, { category: 'OTHER', summary: 'Something else.' });
}

// ───────────────────────────────── the whole flow

test('full flow: send, sort replies, alert, follow up, stop', () => {
  // Tuesday July 14, 2026, 8:05am in New York.
  const w = ready({ claude: fakeClaude, start: new Date('2026-07-14T12:05:00Z') }, {
    'Phone push topic (ntfy)': 'everglow-test-topic-x7q2',
  });
  w.props.CLAUDE_API_KEY = 'sk-ant-test';
  w.ss.getSheetByName('Do Not Contact').appendRow(['blocked.test', 'Competitor', '']);
  addContacts(w, [
    { Email: 'joe@pizza.test', 'First Name': 'Joe', Business: "Joe's Pizza", Town: 'Doylestown', 'Personal Line': 'Saw your new patio.' },
    { Email: 'amy@salon.test', 'First Name': 'Amy', Business: "Amy's Salon" },
    { Email: 'pat@bank.test', 'First Name': 'Pat', Business: 'First Bank' },
    { Email: 'bad@nowhere.test', Business: 'Nowhere Co' },
    { Email: 'sam@cars.test', 'First Name': 'Sam', Business: "Sam's Cars" },
    { Email: 'JOE@pizza.test', 'First Name': 'Joe', Business: "Joe's Pizza (again)" },
    { Email: 'owner@blocked.test', 'First Name': 'Bo', Business: 'Blocked Inc' },
    { Email: 'not-an-email', 'First Name': 'Al', Business: 'Typo LLC' },
    { Email: 'lee@hoa.test', 'First Name': 'Lee', Business: 'Oak HOA' },
  ]);

  // First run of the day: pacing allows exactly one email.
  w.gs.tick();
  assert.equal(w.mail.messages.length, 1, 'only one email at 8:05am');

  runTicks(w, '2026-07-14T21:00:00Z');
  for (const e of ['joe@pizza.test', 'amy@salon.test', 'pat@bank.test', 'bad@nowhere.test', 'sam@cars.test', 'lee@hoa.test']) {
    assert.equal(w.mail.sentTo(e).length, 1, 'one email to ' + e);
  }
  assert.equal(row(w, 'JOE@pizza.test').Status, 'Duplicate');
  assert.equal(row(w, 'owner@blocked.test').Status, 'Do Not Contact');
  assert.equal(row(w, 'not-an-email').Status, 'Error');
  assert.match(row(w, 'not-an-email').Notes, /doesn't look right/);
  assert.equal(w.mail.messages.length, 6, 'nothing to the skipped rows');

  // What Joe received
  const joe1 = w.mail.sentTo('joe@pizza.test')[0];
  assert.equal(joe1.subject, "holiday lighting for Joe's Pizza");
  assert.equal(joe1.raw.headers.From, '"Kris at EverGlow Christmas Lighting" <kris@outreach.test>');
  assert.equal(joe1.raw.headers['List-Unsubscribe'], '<mailto:kris@outreach.test?subject=unsubscribe>');
  assert.match(joe1.body, /^Hi Joe,\n\nSaw your new patio\.\n\nI'm Kris with EverGlow Christmas Lighting\./);
  assert.ok(joe1.body.includes(ADDRESS), 'footer has the mailing address');
  assert.ok(joe1.body.includes('reply "no thanks"'), 'footer has the opt-out');
  assert.match(w.mail.sentTo('bad@nowhere.test')[0].body, /^Hi there,\n\nI'm Kris/, 'blank first name and personal line drop out cleanly');

  const r1 = row(w, 'joe@pizza.test');
  assert.equal(r1.Status, 'Active');
  assert.equal(r1.Step, 1);
  assert.equal(r1['Thread ID'], joe1.threadId, 'thread ID kept as exact text');
  assert.equal(r1['Next Send'].getTime() - r1['Last Sent'].getTime(), 3 * 86400000);
  assert.equal(w.mail.labels.Outreach.length, 6);

  // Evening replies
  at(w, '2026-07-14T22:00:00Z');
  reply(w, 'joe@pizza.test', {
    from: 'Joe Russo <joe@pizza.test>',
    body: "Sure, call me Tuesday at 2pm. My cell is 215-555-0134.\n\nOn Tue, Jul 14, 2026 at 8:05 AM Kris <kris@outreach.test> wrote:\n> Hi Joe,\n> Saw your new patio.",
  });
  reply(w, 'amy@salon.test', { body: 'No thanks, we already have someone.' });
  reply(w, 'pat@bank.test', { body: 'I am out of the office until July 20.', headers: { 'Auto-Submitted': 'auto-replied' } });
  w.mail.add({
    from: 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>', to: w.me,
    subject: 'Delivery Status Notification (Failure)', body: "Address not found. Your message wasn't delivered to bad@nowhere.test",
    headers: { 'X-Failed-Recipients': 'bad@nowhere.test' },
  });
  w.mail.add({ from: 'lee@hoa.test', to: w.me, subject: 'unsubscribe', body: '' });
  w.mail.add({ from: 'deals@shop.test', to: w.me, subject: 'Big sale', body: 'Buy now' });

  at(w, '2026-07-14T22:10:00Z');
  w.gs.tick();

  const joe = row(w, 'joe@pizza.test');
  assert.equal(joe.Status, 'Call Requested');
  assert.equal(joe['Reply Type'], 'Wants a call');
  assert.equal(joe.Phone, '215-555-0134');
  assert.equal(joe['Next Send'], '');
  assert.equal(row(w, 'amy@salon.test').Status, 'Not Interested');
  assert.equal(row(w, 'pat@bank.test').Status, 'Active', 'auto-reply keeps the sequence going');
  assert.equal(row(w, 'pat@bank.test')['Reply Type'], 'Auto-reply');
  assert.equal(row(w, 'bad@nowhere.test').Status, 'Bounced');
  assert.equal(row(w, 'lee@hoa.test').Status, 'Unsubscribed');
  assert.ok(w.ss.getSheetByName('Do Not Contact').rowsAsObjects().some((r) => r['Email or domain'] === 'lee@hoa.test'));

  // Only the three real-text replies went to Claude, and the request is shaped right.
  const calls = claudeCalls(w);
  assert.equal(calls.length, 3);
  const joeCall = calls.find((c) => c.params.payload.includes('Tuesday at 2pm'));
  const req = JSON.parse(joeCall.params.payload);
  assert.equal(joeCall.params.headers['anthropic-version'], '2026-10-21');
  assert.equal(joeCall.params.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  assert.equal(joeCall.params.headers['x-api-key'], 'sk-ant-test');
  assert.equal(req.model, 'claude-opus-5-5');
  assert.equal(req.fallbacks, 'default');
  assert.equal(req.output_config.effort, 'low');
  assert.equal(req.output_config.format.type, 'json_schema');
  assert.equal(req.thinking, undefined, 'thinking is left to the model');
  assert.ok(!req.messages[0].content.includes('> Hi Joe'), 'quoted copy of our email is stripped');
  assert.match(req.messages[0].content, /Arrived: Tuesday, July 14, 2026 6:00 PM/);
  assert.ok(calls.some((c) => c.params.payload.includes('automatic-reply header')), 'Claude is told about the auto-reply header');

  // One alert, for Joe, with a calendar link at the time he named.
  assert.equal(w.mail.alerts.length, 1);
  const alert = w.mail.alerts[0];
  assert.equal(alert.to, 'owner@everglow.test');
  assert.equal(alert.subject, "📞 Call request: Joe's Pizza (Joe)");
  assert.ok(alert.body.includes('215-555-0134'));
  assert.ok(alert.opts.htmlBody.includes('dates=20260721T140000%2F20260721T143000'));
  assert.ok(alert.opts.htmlBody.includes('ctz=America%2FNew_York'));
  assert.ok(alert.body.includes('A draft reply is waiting'));

  const push = w.fetches.find((f) => f.url === 'https://ntfy.sh/');
  const pushBody = JSON.parse(push.params.payload);
  assert.equal(pushBody.topic, 'everglow-test-topic-x7q2');
  assert.equal(pushBody.priority, 5);
  assert.equal(pushBody.actions[0].label, 'Add to calendar');

  assert.equal(w.mail.drafts.length, 1);
  assert.equal(w.mail.drafts[0].to, 'joe@pizza.test');
  assert.equal(w.mail.drafts[0].threadId, joe1.threadId);
  assert.match(w.mail.drafts[0].body, /I will call you Tuesday at 2pm[\s\S]*\nKris\nEverGlow Christmas Lighting\n\(267\) 853-0058$/);
  assert.ok(w.mail.labels['Outreach/Needs you'].includes(joe1.threadId));

  // Running again doesn't re-sort or re-alert anything.
  at(w, '2026-07-14T22:20:00Z');
  w.gs.tick();
  assert.equal(claudeCalls(w).length, 3);
  assert.equal(w.mail.alerts.length, 1);
  assert.match(w.mail.searches[w.mail.searches.length - 1], /^-from:me after:\d+$/);

  // Friday: follow-ups for the two still in the sequence, threaded under email 1.
  at(w, '2026-07-17T12:00:00Z');
  runTicks(w, '2026-07-17T21:00:00Z');
  const sam = w.mail.sentTo('sam@cars.test');
  assert.equal(sam.length, 2);
  assert.equal(sam[1].threadId, sam[0].threadId);
  assert.equal(sam[1].subject, "Re: holiday lighting for Sam's Cars");
  assert.equal(sam[1].raw.headers['In-Reply-To'], sam[0].rfcId);
  assert.equal(sam[1].raw.headers.References, sam[0].rfcId);
  assert.match(sam[1].body, /^Hi Sam,\n\nFollowing up/);
  assert.equal(w.mail.sentTo('pat@bank.test').length, 2);

  // Weekend: nothing goes out.
  const before = w.mail.messages.length;
  at(w, '2026-07-18T12:00:00Z');
  runTicks(w, '2026-07-19T21:00:00Z', 30);
  assert.equal(w.mail.messages.length, before);

  // The next Tuesday: the last email, then the sequence is finished.
  at(w, '2026-07-21T12:00:00Z');
  runTicks(w, '2026-07-21T21:00:00Z');
  assert.equal(w.mail.sentTo('sam@cars.test').length, 3);
  assert.equal(w.mail.sentTo('sam@cars.test')[2].raw.headers.References, sam[0].rfcId + ' ' + sam[1].rfcId);
  assert.equal(row(w, 'sam@cars.test').Status, 'Finished');
  assert.equal(row(w, 'sam@cars.test')['Next Send'], '');

  // A week later nobody gets anything more.
  at(w, '2026-07-27T12:00:00Z');
  runTicks(w, '2026-07-28T21:00:00Z', 30);
  const totals = {};
  w.mail.messages.filter((m) => addrOf(m.from) === w.me).forEach((m) => { totals[addrOf(m.to)] = (totals[addrOf(m.to)] || 0) + 1; });
  assert.deepEqual(totals, {
    'joe@pizza.test': 1, 'amy@salon.test': 1, 'pat@bank.test': 3, 'bad@nowhere.test': 1, 'sam@cars.test': 3, 'lee@hoa.test': 1,
  });

  // A late reply to a finished sequence still alerts you.
  at(w, '2026-07-29T14:00:00Z');
  reply(w, 'sam@cars.test', { body: 'Sorry for the slow reply, can you call me Tuesday at 2pm? 610-555-0199' });
  w.gs.tick();
  assert.equal(row(w, 'sam@cars.test').Status, 'Call Requested');
  assert.equal(w.mail.alerts.length, 2);
});

// ───────────────────────────────── safety

test('never follows up on a reply the checker has not sorted yet', () => {
  const w = ready({ start: new Date('2026-07-14T13:00:00Z') });
  addContacts(w, [{ Email: 'sam@cars.test', 'First Name': 'Sam', Business: "Sam's Cars" }]);
  w.gs.sendDue_(w.gs.readSettings_());
  assert.equal(w.mail.messages.length, 1);
  at(w, '2026-07-17T14:00:00Z');
  reply(w, 'sam@cars.test', { body: 'Call me.' });
  w.gs.sendDue_(w.gs.readSettings_()); // sending without the reply check first
  assert.equal(w.mail.sentTo('sam@cars.test').length, 1);
  assert.equal(row(w, 'sam@cars.test').Status, 'Active');
});

test('refuses to start without a mailing address, and with a misspelled placeholder', () => {
  const w = createWorld();
  w.gs.setupSheets();
  addContacts(w, [{ Email: 'a@b.test', 'First Name': 'A', Business: 'B' }]);
  w.gs.startAutopilot();
  assert.equal(w.triggers.length, 0);
  assert.match(w.ui.alerts[0][1], /Mailing address/);
  assert.equal(w.gs.sendDue_(w.gs.readSettings_()).sent, 0);
  assert.equal(w.mail.messages.length, 0);

  setSetting(w, 'Mailing address (required by law)', ADDRESS);
  w.ss.getSheetByName('Sequence').getRange(2, 4).setValue('Hi {{frist_name}}, ...');
  w.gs.startAutopilot();
  assert.equal(w.triggers.length, 0);
  assert.match(w.ui.alerts[1][1], /Unknown placeholder \{\{frist_name\}\}/);

  w.ss.getSheetByName('Sequence').getRange(2, 4).setValue('Hi {{first_name}}, ...');
  w.gs.startAutopilot();
  assert.equal(w.triggers.length, 1);
  assert.equal(w.triggers[0].fn, 'tick');
  assert.equal(w.triggers[0].minutes, 10);
  assert.match(w.ui.alerts[2][1], /sorted by keywords/, 'warns that no Claude key is set');
  w.gs.startAutopilot();
  assert.equal(w.triggers.length, 1, 'starting twice does not double the trigger');
  w.gs.pauseAutopilot();
  assert.equal(w.triggers.length, 0);
});

test('a blank field without a fallback skips that contact only', () => {
  const w = ready({ start: new Date('2026-07-14T20:00:00Z') });
  w.ss.getSheetByName('Sequence').getRange(2, 4).setValue('Hi {{first_name}}, about {{business}}.');
  addContacts(w, [
    { Email: 'nofirst@x.test', Business: 'No Name Co' },
    { Email: 'ok@x.test', 'First Name': 'Ok', Business: 'Fine Co' },
  ]);
  w.gs.sendDue_(w.gs.readSettings_());
  assert.equal(row(w, 'nofirst@x.test').Status, 'Error');
  assert.match(row(w, 'nofirst@x.test').Notes, /"first_name" is blank/);
  assert.equal(w.mail.sentTo('ok@x.test').length, 1);
});

test('warm-up ramp and daily limit', () => {
  const w = ready({ start: new Date('2026-07-14T12:05:00Z') }, {
    'Warm-up: emails per day in week 1': 2,
    'Warm-up: add this many per week': 2,
  });
  addContacts(w, Array.from({ length: 12 }, (_, i) => ({ Email: 'p' + i + '@x.test', 'First Name': 'P' + i, Business: 'Biz ' + i })));
  runTicks(w, '2026-07-14T21:00:00Z');
  assert.equal(w.mail.messages.length, 2, 'week 1: 2 a day');
  at(w, '2026-07-22T12:05:00Z'); // 8 days later, week 2
  runTicks(w, '2026-07-22T21:00:00Z');
  assert.equal(w.mail.messages.length, 2 + 4, 'week 2: 4 a day');
  // Spread out: never more than one email in the same 10-minute run at this volume.
  const days = w.ss.getSheetByName('Contacts').rowsAsObjects().filter((r) => r['Last Sent']).map((r) => r['Last Sent'].getTime());
  assert.equal(new Set(days).size, days.length);
});

test('outside sending hours: replies are still sorted, nothing is sent', () => {
  const w = ready({ start: new Date('2026-07-14T13:00:00Z') });
  addContacts(w, [{ Email: 'a@x.test', 'First Name': 'A', Business: 'A Co' }]);
  w.gs.tick();
  addContacts(w, [{ Email: 'b@x.test', 'First Name': 'B', Business: 'B Co' }]);
  at(w, '2026-07-15T02:00:00Z'); // 10pm
  reply(w, 'a@x.test', { body: 'Can you give me a call tomorrow? 215-555-0177' });
  w.gs.tick();
  assert.equal(row(w, 'a@x.test').Status, 'Call Requested');
  assert.equal(row(w, 'a@x.test').Phone, '215-555-0177');
  assert.equal(w.mail.sentTo('b@x.test').length, 0);
  assert.equal(w.mail.alerts.length, 1, 'night-time alert still goes out');
});

test('when Claude is down, keywords take over and still alert you', () => {
  const w = ready({ start: new Date('2026-07-14T13:00:00Z'), claude: () => ({ status: 529, text: '{"type":"error"}' }) });
  w.props.CLAUDE_API_KEY = 'sk-ant-test';
  addContacts(w, [{ Email: 'a@x.test', 'First Name': 'A', Business: 'A Co' }]);
  w.gs.tick();
  reply(w, 'a@x.test', { body: 'Your email went to my spam folder, but yes, let\'s talk.' });
  w.gs.tick();
  assert.equal(row(w, 'a@x.test').Status, 'Call Requested', 'spam-folder mention is not an unsubscribe');
  assert.ok(logEvents(w).includes('Claude could not sort this reply, used keywords'));
  assert.ok(logEvents(w).includes('CALL REQUESTED (sorted by keywords)'));
  assert.equal(w.mail.alerts.length, 1);
});

test('a refusal or a malformed answer from Claude falls back to keywords', () => {
  for (const answer of [{ stop_reason: 'refusal' }, { category: 'MAYBE' }]) {
    const w = ready({ start: new Date('2026-07-14T13:00:00Z'), claude: () => answer });
    w.props.CLAUDE_API_KEY = 'sk-ant-test';
    addContacts(w, [{ Email: 'a@x.test', 'First Name': 'A', Business: 'A Co' }]);
    w.gs.tick();
    reply(w, 'a@x.test', { body: 'Not interested, thanks.' });
    w.gs.tick();
    assert.equal(row(w, 'a@x.test').Status, 'Not Interested');
  }
});

test('the row-moved guard stops writes to the wrong person', () => {
  const w = ready();
  addContacts(w, [{ Email: 'a@x.test', 'First Name': 'A', Business: 'A Co' }, { Email: 'b@x.test', 'First Name': 'B', Business: 'B Co' }]);
  const book = w.gs.readContacts_();
  w.ss.getSheetByName('Contacts').getRange(2, 1).setValue('b@x.test'); // someone re-sorted
  w.ss.getSheetByName('Contacts').getRange(3, 1).setValue('a@x.test');
  assert.throws(() => book.rows[0].set('Status', 'Active'), /changed while the script was running/);

  // And it checks before sending, so the moved person can't be emailed twice.
  const env = { now: w.gs.now_(), dnc: { emails: {}, domains: {} }, mine: {}, seen: {}, contacted: {}, fromAddress: w.me };
  assert.throws(() => w.gs.sendNextStep_(book.rows[0], w.gs.readSequence_(), w.gs.readSettings_(), env), /changed/);
  assert.equal(w.mail.messages.length, 0);
});

test('a reply that arrives while rows are moving is sorted on the next run', () => {
  const w = ready({ start: new Date('2026-07-14T13:00:00Z') });
  addContacts(w, [{ Email: 'a@x.test', 'First Name': 'A', Business: 'A Co' }]);
  w.gs.tick();
  reply(w, 'a@x.test', { body: 'Sure, call me at 215-555-0111.' });
  const contacts = w.ss.getSheetByName('Contacts');
  const realGetRange = contacts.getRange.bind(contacts);
  let moving = true; // the email cell reads differently, as if someone sorted the sheet mid-run
  contacts.getRange = (r, c, nr, nc) => {
    const range = realGetRange(r, c, nr, nc);
    if (moving && r === 2 && c === 1 && !nr) return { getValue: () => 'someone-else@x.test' };
    return range;
  };
  w.gs.tick();
  assert.equal(row(w, 'a@x.test').Status, 'Active');
  assert.equal(w.mail.alerts.length, 0);
  moving = false;
  w.gs.tick();
  assert.equal(row(w, 'a@x.test').Status, 'Call Requested');
  assert.equal(w.mail.alerts.length, 1);
});

// ───────────────────────────────── menu items

test('setup is safe to run twice and repairs an existing sheet', () => {
  const w = createWorld();
  const sh = w.ss.insertSheet('Contacts');
  sh.appendRow(['Email', 'First Name', 'Business', 'Website']);
  sh.appendRow(['a@x.test', 'A', 'A Co', 'a.test']);
  w.gs.setupSheets();
  setSetting(w, 'Your name', 'Kristopher');
  w.gs.setupSheets();
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  assert.deepEqual(head.slice(0, 4), ['Email', 'First Name', 'Business', 'Website'], 'your columns stay put');
  assert.equal(new Set(head).size, head.length, 'no duplicate columns');
  assert.ok(head.includes('Thread ID') && head.includes('Status'));
  assert.equal(row(w, 'a@x.test').Website, 'a.test');
  assert.equal(w.gs.readSettings_().senderName, 'Kristopher', 'settings survive a repair');
  assert.equal(w.ss.getSheetByName('Sequence').getLastRow(), 4, 'sequence seeded once');
  assert.equal(w.ss.getSheetByName('_Processed').hidden, true);

  // Extra columns become placeholders.
  w.ss.getSheetByName('Sequence').getRange(2, 4).setValue('Loved {{website}}.');
  assert.deepEqual(Array.from(w.gs.sequenceProblems_()), []);
});

test('preview and test-send for the selected row', () => {
  const w = ready();
  addContacts(w, [{ Email: 'joe@pizza.test', 'First Name': 'Joe', Business: "Joe's Pizza" }]);
  const contacts = w.ss.getSheetByName('Contacts');
  w.ss.active = contacts;
  contacts.activeRow = 2;
  w.gs.previewSelected();
  assert.match(w.ui.dialogs[0].html, /Hi Joe,/);
  assert.match(w.ui.dialogs[0].html, /Joe&#39;s Pizza|Joe's Pizza/);
  w.gs.sendTestOfSelected();
  assert.equal(w.mail.messages.length, 1);
  assert.equal(addrOf(w.mail.messages[0].to), w.me);
  assert.equal(w.mail.messages[0].subject, "[TEST to joe@pizza.test] holiday lighting for Joe's Pizza");
  assert.equal(row(w, 'joe@pizza.test').Step, '', 'the contact is untouched');
});

test('test alert works with keywords when there is no key', () => {
  const w = ready({}, { 'Phone push topic (ntfy)': 'topic-abc' });
  w.gs.sendTestAlert();
  assert.equal(w.mail.alerts.length, 1);
  assert.match(w.mail.alerts[0].subject, /^\[TEST\] 📞 Call request: Test Bistro/);
  assert.ok(w.fetches.some((f) => f.url === 'https://ntfy.sh/'));
  assert.match(w.ui.alerts[0][1], /Sorted by: keywords/);
});

test('API key: saved privately, rejected when it looks wrong', () => {
  const w = ready();
  w.ui.promptAnswer = 'hello';
  w.gs.setApiKey();
  assert.equal(w.props.CLAUDE_API_KEY, undefined);
  w.ui.promptAnswer = ' sk-ant-abc123 ';
  w.gs.setApiKey();
  assert.equal(w.props.CLAUDE_API_KEY, 'sk-ant-abc123');
  const settingsText = JSON.stringify(w.ss.getSheetByName('Settings').getDataRange().getValues());
  assert.ok(!settingsText.includes('sk-ant'), 'the key never lands in the sheet');
});

// ───────────────────────────────── small pieces

test('stripQuoted_ keeps only the new text', () => {
  const { gs } = createWorld();
  assert.equal(gs.stripQuoted_('Yes please.\n\nOn Tue, Jul 14, 2026 at 8:05 AM Kris <k@x.test> wrote:\n> Hi'), 'Yes please.');
  assert.equal(gs.stripQuoted_('Yes.\nOn Tue, Jul 14, 2026 at 8:05 AM Kris Smith\n<k@x.test> wrote:\n> Hi'), 'Yes.');
  assert.equal(gs.stripQuoted_('Sure\r\n\r\nFrom: Kris <k@x.test>\r\nSent: Tuesday\r\nSubject: hi'), 'Sure');
  assert.equal(gs.stripQuoted_('Ok\n________________________________\nFrom: Kris'), 'Ok');
  assert.equal(gs.stripQuoted_('Call me\n-----Original Message-----\nblah'), 'Call me');
  assert.equal(gs.stripQuoted_('> only quoted'), '> only quoted', 'never returns nothing');
});

test('keywordClassify_ sorts the common replies', () => {
  const { gs } = createWorld();
  const s = { phone: '(267) 853-0058' };
  const cat = (t) => gs.keywordClassify_(t, 'Re: holiday lighting', s).category;
  assert.equal(cat('Please remove me from your list'), 'UNSUBSCRIBE');
  assert.equal(cat('Stop emailing me'), 'UNSUBSCRIBE');
  assert.equal(cat('this is spam'), 'UNSUBSCRIBE');
  assert.equal(cat('I am out of the office until Monday'), 'OUT_OF_OFFICE');
  assert.equal(cat("We're all set, thanks"), 'NOT_INTERESTED');
  assert.equal(cat('No thank you.'), 'NOT_INTERESTED');
  assert.equal(cat('Sounds good, call me at 215.555.0101'), 'INTERESTED');
  assert.equal(cat('How much does it cost?'), 'QUESTION');
  assert.equal(cat('Talk to Maria, she runs the building.'), 'OTHER');
  assert.equal(gs.keywordClassify_('Thanks! (267) 853-0058', '', s).phone, '', 'our own number is not their number');
});

test('renderTemplate_ placeholders and fallbacks', () => {
  const { gs } = createWorld();
  const vars = { first_name: 'Ann', business: 'Ann Co', personal_line: '' };
  assert.equal(gs.renderTemplate_('Hi {{ First Name }}, {{business}}', vars), 'Hi Ann, Ann Co');
  assert.equal(gs.renderTemplate_('Hi {{first_name|there}},\n\n{{personal_line|}}\n\nBody', vars), 'Hi Ann,\n\nBody');
  assert.equal(gs.renderTemplate_('Hi {{personal_line| friend }}', vars), 'Hi friend');
  assert.throws(() => gs.renderTemplate_('{{nope}}', vars), /Unknown placeholder/);
  assert.throws(() => gs.renderTemplate_('{{personal_line}}', vars), /blank/);
});

test('email headers: encoding and no header injection', () => {
  const { gs } = createWorld();
  assert.equal(gs.encodeHeader_('Plain subject'), 'Plain subject');
  assert.equal(gs.encodeHeader_('Café lights'), '=?UTF-8?B?' + Buffer.from('Café lights').toString('base64') + '?=');
  const raw = gs.buildRawEmail_({ from: gs.formatFrom_('Kris "K" at X', 'k@x.test'), to: 'a@b.test', subject: 'Hi\r\nBcc: evil@x.test', body: 'x' });
  const head = raw.split('\r\n\r\n')[0];
  assert.ok(!/^Bcc:/m.test(head), 'newline in subject cannot add a header');
  assert.match(head, /^From: "Kris \\"K\\" at X" <k@x.test>$/m);
});

test('small helpers', () => {
  const { gs } = createWorld();
  assert.equal(gs.calStamp_('2026-07-21T23:45', 30), '20260722T001500');
  assert.deepEqual(Array.from(gs.parseDays_('Mon, tue,WEDNESDAY, nope')), [1, 2, 3]);
  assert.equal(gs.parseAddress_('Joe Russo <Joe@Pizza.test>'), 'joe@pizza.test');
  assert.equal(gs.isValidEmail_('joe@pizza.test'), true);
  assert.equal(gs.isValidEmail_('joe@pizza'), false);
  assert.equal(gs.isValidEmail_('joe pizza@x.test'), false);
  assert.equal(gs.colLetter_(1), 'A');
  assert.equal(gs.colLetter_(28), 'AB');
  assert.equal(gs.samePhone_('+1 (267) 853-0058', '267.853.0058'), true);
  assert.equal(gs.isBounce_('mailer-daemon@googlemail.com', 'x'), true);
  assert.equal(gs.isBounce_('joe@x.test', 'Undeliverable: holiday lighting'), true);
  assert.equal(gs.isBounce_('joe@x.test', 'Re: holiday lighting'), false);
});
