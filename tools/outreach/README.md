# EverGlow Outreach

Cold email to business owners that books calls. It runs inside a Google Sheet:

1. You put businesses in the **Contacts** sheet: email, first name, business, and optionally one personal line.
2. Every 10 minutes, Google runs the script. During your sending hours it sends a short, plain email asking for
   a 10-minute call, then up to two follow-ups in the same thread (day 3 and day 7). It stops the moment
   someone replies.
3. Each reply is read by Claude and sorted: **wants a call**, question, referral, not interested, unsubscribe,
   out of office.
4. When someone wants a call (or asks something only you can answer), you get an **alert email and a phone
   push**. The alert has their phone number, the time they suggested, and an **Add to calendar** button that
   opens Google Calendar with the event already filled in. A draft reply waits in Gmail for you to check and send.
5. You book the call. The script never replies to anyone on its own.

Unsubscribes go on a permanent Do Not Contact list, bounces are marked, and out-of-office replies don't stop the
sequence.

---

## Read this before you send a single email

The software is the easy part. These decide whether cold email books calls or gets your business flagged as spam.

**1. Don't send from your main address.** Not `everglowchristmaslighting25@gmail.com`, and not an address on
`everglowchristmaslightspa.com`. Cold email draws spam reports. If that address's reputation drops, your quote
replies to homeowners start landing in spam too. Buy a second domain (for example `everglowlightspa.com`,
about $12 a year) and put one Google Workspace mailbox on it (about $7 to $8 a month). Workspace walks you through
SPF, DKIM and DMARC. Do all three: Gmail and Yahoo require them for mail to be delivered reliably.

**2. Warm the new inbox up.** A brand-new address that suddenly sends 30 emails a day to strangers looks like a
spammer. For two to three weeks, use it like a person: email friends, family and vendors, and get replies. The
Settings sheet also ramps you up: 5 a day in week 1, 10 in week 2, and so on, up to 30.

**3. Volume doesn't book calls. Relevance does.** 30 emails a day from one inbox is the ceiling. For more, add a
second inbox; don't raise the number. A list of 200 businesses you actually looked at beats 5,000 scraped
addresses. Write a **Personal Line** for the best prospects ("Your patio on State Street would look great lit
up"). It's the most effective column in the sheet.

**4. Check addresses before you import them.** Keep bounces under about 3%. Run the list through a verifier
(NeverBounce, ZeroBounce, or the one built into Apollo) and never buy a list. Each bounce counts against the
inbox.

**5. Timing.** Your own playbook (`docs/LEAD_GENERATION.md`, Tier 3) says commercial accounts book in **July
to September**, while property managers set budgets. Emails in late November reach businesses that already
decided. Use the winter and spring to build the list, warm up the inbox in June, and start sending in July.

**6. The law (CAN-SPAM).** Cold B2B email is legal in the US if you follow the rules. Fines run tens of
thousands of dollars per email, so take them seriously. This is not legal advice.

| Rule | Who handles it |
| --- | --- |
| A real postal address in every email | You enter it once in Settings. **Nothing sends until you do.** A P.O. box or virtual mailbox works if you don't want your home address in it. |
| A clear way to opt out | The script adds "reply 'no thanks' and I won't email you again" to every email, plus a hidden unsubscribe header that Gmail and other inboxes can show as an Unsubscribe button. |
| Honor opt-outs within 10 business days, forever | Automatic. Unsubscribes and "remove me" replies go on Do Not Contact, which is checked before every email, including if you re-import them later. |
| No misleading From line or subject | The From line is "Kris at EverGlow Christmas Lighting". Keep subjects honest when you edit them. |
| No false claims | The starter emails only promise what the website already promises. **Don't add "fully insured"** until the policy is active (the main README explains why). |

Other countries are stricter (Canada's CASL, the EU's GDPR). Use this for US businesses only.

**7. Why build this when Instantly or Smartlead exist?** Those cost $30 to $100 a month and include warm-up
networks, inbox rotation and deliverability dashboards. If you outgrow two inboxes or about 60 emails a day,
switch to one of them. Until then this costs about $8 a month plus a few cents of Claude, keeps the data in your
own Google account, and does the one thing you need: tell you right away when someone wants a call.

---

## Setup (about 30 minutes)

### 1. The sending account

Set up the separate domain and Google Workspace mailbox from point 1 above, and warm it up first. Do the steps
below **signed in as that account**.

### 2. The sheet and the script

1. Go to [sheets.new](https://sheets.new) and name the sheet "EverGlow Outreach". In **File → Settings**, set
   the time zone to Eastern Time. Sending hours use it.
2. **Extensions → Apps Script.** Delete everything in `Code.gs` and paste in all of [`Outreach.gs`](Outreach.gs).
3. Click the gear (**Project Settings**) and tick **Show "appsscript.json" manifest file in editor**. Back in
   the editor, open `appsscript.json` and replace its contents with [`appsscript.json`](appsscript.json). That
   turns on the Gmail API, which the script needs to thread follow-ups and add the unsubscribe header.
   (Alternatively: **Services +** → **Gmail API** → **Add**.)
4. Click **Save**, then go back to the sheet and **reload the page**. An **Outreach** menu appears.
5. **Outreach → Set up / repair sheets.** Google asks for permission. Because this is your own script and not
   an app Google has reviewed, it shows "Google hasn't verified this app". Click **Advanced → Go to
   (project name)**. The script asks to read and send email as this account, edit this spreadsheet, and connect
   to outside services (Claude and ntfy).

You now have six tabs: **Contacts, Sequence, Settings, Do Not Contact, Log**, and a hidden `_Processed`.

### 3. Settings

Fill in the **Settings** tab. Every row has an explanation beside it. The ones that matter:

- **Mailing address (required by law).** Nothing sends without it.
- **Send call alerts to:** your main business inbox, so alerts reach you wherever you already look.
- **Phone push topic (ntfy):** see step 5.

### 4. Claude (sorts the replies)

1. Create an account at [platform.claude.com](https://platform.claude.com), add $5 of credit, and create an API key.
2. **Outreach → Set Claude API key**, and paste it. It is stored in the script's private properties, not in
   the sheet, so sharing the sheet doesn't share the key.

Each reply costs about 1 to 2 cents to sort. Without a key the script still works: it sorts by keywords and, when
unsure, alerts you anyway. Claude is much better at "not this year, but try me in August" and "talk to Maria,
she handles the building".

### 5. Phone push (free, recommended)

1. Install the free **ntfy** app on your phone ([ntfy.sh](https://ntfy.sh) links to the iPhone and Android
   versions).
2. Tap **+** and subscribe to a topic with a long, random name, like `everglow-calls-7Kq29xLm4Rt`. Topics on
   ntfy.sh are public to anyone who knows the name, so don't use anything guessable.
3. Paste the same name into **Phone push topic (ntfy)** in Settings.

Call requests arrive as urgent pushes with **Add to calendar** and **Open email** buttons.

### 6. Make sure you see the alerts

- In your **main** Gmail, add a filter for the outreach address: **Never send it to Spam**, **Always mark it
  as important**. Alerts from a new domain otherwise risk the spam folder.
- Add the outreach account to the Gmail app on your phone. **Open email** and the draft replies live there.

### 7. Test it on yourself

1. In **Contacts**, add one row with a personal email address you can reply from. It must not be the outreach
   account, because the script ignores mail from itself.
2. Click that row, then **Outreach → Preview next email for selected row**. Read it the way a stranger would.
3. **Outreach → Send me a test alert.** You should get an alert email (and a push, if you set up ntfy). The
   dialog says whether Claude or keywords sorted it, which also confirms your API key works.
4. **Outreach → Start autopilot.** The first email goes out within 10 minutes during sending hours. From your
   personal account, reply: *"Sure, call me Thursday at 3pm, 215-555-0100."* Within 10 minutes the row turns
   green, the alert arrives, and **Add call to calendar** opens an event for Thursday at 3:00.
5. Delete the test row.

### 8. Add real contacts and start

Use **File → Import → Upload** with a CSV and choose **Append to current sheet** while on the Contacts tab.
Columns: `Email, First Name, Business, Category, Town, Personal Line` (see
[`sample-contacts.csv`](sample-contacts.csv)). Only Email and Business are required. Then **Outreach → Start
autopilot**.

---

## Every day

- **Phone buzzes →** open the alert, tap **Add call to calendar**, set the time, save. Then open the email,
  check the draft Claude wrote, edit, send. Your playbook says the first company to respond often wins the job;
  aim for within the hour.
- **Contacts tab:** green rows want a call, yellow rows need your reply, grey rows are closed.
- **Log tab:** everything the script did, newest at the bottom.

To stop one person, set their Status to **Paused**. Their replies are still watched. To stop everything,
**Outreach → Pause autopilot**.

| Status | Meaning | What the script does next |
| --- | --- | --- |
| *(blank)* or New | Not contacted yet | Sends email 1 when there's room today |
| Active | In the sequence | Sends the next follow-up when it's due |
| Finished | All emails sent, no reply | Nothing more, but still watches for a late reply |
| **Call Requested** | They want to talk | Alerted you, saved a draft. Stops emailing |
| **Needs Reply** | Question, referral, or unclear | Alerted you, saved a draft. Stops emailing |
| Not Interested | Declined | Stops |
| Unsubscribed | Asked to stop | Stops, adds them to Do Not Contact |
| Bounced | Address doesn't work | Stops |
| Paused | You paused them | Sends nothing, still watches for replies |
| Do Not Contact / Duplicate | On the blocklist, or already emailed from another row | Skipped |
| Error | Something's wrong with this row (see Notes) | Skipped until you fix it and set Status back to New, or to Active if they had already been emailed |

---

## Editing the emails

The **Sequence** tab holds the three emails. Change the words freely. The rules that keep them working:

- **Placeholders** use double braces: `{{first_name}}`, `{{business}}`, `{{town}}`, `{{personal_line}}`, any
  other Contacts column (add a column called `Website` and `{{website}}` works), plus `{{my_name}}`,
  `{{my_company}}`, `{{my_phone}}`, `{{my_website}}` from Settings.
- **Fallbacks** follow a `|`: `{{first_name|there}}` becomes "Hi there," when the name is blank, and
  `{{personal_line|}}` disappears when blank. A blank placeholder without a fallback skips that contact with
  an Error, rather than sending "Hi ,". A misspelled placeholder stops **Start autopilot** before anything sends.
- **Only step 1's subject is used.** Follow-ups reply in the same thread as "Re: (step 1 subject)", which
  gets read more than a new email.
- **Wait Days** is days after the previous email.
- The footer (company, phone, website, mailing address and the opt-out line) is added to every email
  automatically. Don't add your own.

What works in cold email: under 100 words, plain text, no links or images in the first email, one easy question
at the end, and a subject that looks like it came from a person (lowercase is fine). Use **Preview** after every
change.

---

## How replies are sorted

Claude reads only what they wrote (the quoted copy of your email is cut off) and picks one category. It also pulls
out their phone number, the time they suggested (turned into a calendar time when it's specific, like "Tuesday
at 2"), and anyone they referred you to, and drafts a short reply. It is told never to state prices, insurance,
dates or guarantees in the draft. Those are yours to fill in.

If Claude is unreachable or there's no key, keyword rules take over. Whenever a reply doesn't clearly fit a
category, it is marked **Needs Reply** and you're alerted. The script would rather bother you than lose a lead.

Bounces and "unsubscribe" emails from Gmail's Unsubscribe link are handled by fixed rules and never reach Claude.
Reply text is sent to Anthropic's API for sorting; your contact list is not.

---

## Costs and limits

| | Cost |
| --- | --- |
| Second domain | about $12 a year |
| Google Workspace mailbox | about $7 to $8 a month |
| Claude | about 1 to 2 cents per reply sorted |
| ntfy, Google Sheets, Apps Script | free |

Google Workspace allows about 2,000 emails a day; this sends 30 at most. Apps Script runs the check every 10
minutes, well inside Google's free daily limits.

---

## Troubleshooting

- **No Outreach menu.** Reload the sheet. If it's still missing, check that the script was saved in
  Extensions → Apps Script.
- **Nothing is sending.** **Outreach → Send now** says why: outside your hours, today's limit reached, spacing
  emails out through the day, or a setting missing.
- **A row says Error.** Read its Notes cell, fix the problem, and set Status back to New (or Active, if they'd
  already been emailed).
- **Alerts never arrive.** Check main Gmail's spam folder and add the filter from step 6. **Outreach → Send me
  a test alert** tests the whole chain.
- **"Claude rejected the API key"** in the Log. Create a new key and use **Outreach → Set Claude API key**.
- **Google emails you "script failed".** Open the Log tab; the reason is usually there. A rare failure
  (Gmail busy) fixes itself on the next run.
- **Sorting the Contacts tab is fine,** but avoid doing it in the few seconds a run takes. If rows move
  mid-run, the script notices and stops rather than writing to the wrong person. Filter views
  (Data → Filter views) are the safest way to slice the list.

---

## For developers

`Outreach.gs` is the whole program: plain Apps Script (V8), no libraries. `appsscript.json` turns on the Gmail
advanced service. Nothing here is part of the website build; `netlify.toml` publishes only the site files.

The tests run the real `Outreach.gs` under Node, against in-memory stand-ins for Sheets, Gmail, the Claude API
and ntfy (`test/fakes.js`). They cover the full flow from first email to alert, follow-up threading, every
reply category, warm-up and pacing, the legal-footer and placeholder checks, and the Claude-is-down fallback.

```bash
cd tools/outreach
npm test
```

The fakes model the Google APIs the script uses; they aren't Google. The first real run (step 7 above) is
the end-to-end check against real Gmail, Sheets and Claude.
