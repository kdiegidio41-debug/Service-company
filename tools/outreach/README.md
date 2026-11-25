# Outreach

A client-getting machine for a marketing agency that sells monthly retainers (Google Ads, Meta ads, local SEO,
reviews) to local service businesses. It runs inside one Google Sheet, on Google's servers, every 10 minutes.
Your computer doesn't need to be on.

| Piece | What it does |
| --- | --- |
| **Finder** | You type searches like `plumbers in Austin, TX` into the **Searches** tab. It pulls up to 60 businesses per search from Google (rating, review count, phone, website), skips closed ones and ones you already have, then visits each website. It finds an email address and writes down what their marketing is missing: no Google Ads tag, no Meta pixel, no online booking, no form, not set up for phones, a footer that says © 2019. |
| **Writer** | Claude writes one true, specific opening line per business from those findings (*"Saw you have 212 Google reviews at 4.8 stars, but I couldn't find a way to book online."*), picks out the owner's first name when their About page says it, and flags franchises so you don't waste emails on them. **Write my emails with Claude** also drafts your whole 3-email sequence from your Settings. |
| **Sender** | Emails each owner from your Gmail asking for a 15-minute call, then follows up twice in the same thread (day 3 and day 7). It stops the moment they reply, and stays under a daily limit spread across your sending hours. |
| **Sorter** | Claude reads every reply: wants a call, question, referral, not interested, unsubscribe, out of office. |
| **Alert** | When someone wants a call, you get an email and a phone push with their number, the time they suggested, what the finder saw on their site, and an **Add to calendar** button with the event already filled in. A draft reply waits in Gmail. You book the call. Nothing is ever sent to a prospect without a template you approved. |

Businesses with no email address are kept as **No Email** with their phone number, a call list for days you'd
rather dial.

---

## Read this before you send a single email

You asked me not to just tell you what you want to hear. The software is the easy part. These decide whether
this works.

**1. "Marketing for service businesses" is too broad to get replies.** Owners of plumbing and HVAC companies
get several agency emails a week, and they all say "SEO, ads, social". Pick **one trade** (say HVAC, or roofing)
and **one thing you lead with** (say "Google Ads and Local Services Ads that book jobs"). You still sell the
whole retainer once they're a client. A narrow pitch also makes you better faster: you learn one trade's
seasons, prices and jargon, and every client becomes a case study the next prospect cares about. Put that
choice in **Who you target** and **What you offer** in Settings; the writer uses both.

**2. You don't have proof yet, and you can't fake it.** No case studies, no testimonials, no "we've helped 50
businesses". Don't invent any of it. The FTC's rule on fake reviews and testimonials (in force since late 2024)
carries civil penalties of tens of thousands of dollars per violation. The usual honest path: sign your first 2
or 3 clients at a steep discount, or free for 60 to 90 days, in exchange for permission to use their real
numbers and a written testimonial. Once you have one real result, put it in **Results you can point to**. Until
then that box stays blank and Claude is told never to claim results.

**3. A retainer only lasts if you deliver.** Clients who don't see more calls in 60 to 90 days cancel. Before
you sell Google Ads to a stranger, run one campaign start to finish, for a discount client or a friend's
business. Prospects ask sharp questions on the call ("what's my cost per lead going to be?"), and the call is
where you win or lose them.

**4. Don't send from your main email.** Use a separate domain (for example `getnorthpoint.com` if your agency
is `northpoint.com`, about $12 a year) with its own Google Workspace inbox (about $7 to $8 a month). Set up SPF,
DKIM and DMARC (Workspace walks you through it; Gmail and Yahoo require them for reliable delivery). Then use it
like a person for two to three weeks before cold emailing. Cold email draws spam reports, and you don't want
them landing on the address your clients use. The Settings ramp starts at 5 emails a day and climbs to 30.
That's the ceiling per inbox: for more volume, add a second inbox on a second domain; don't raise the number.

**5. Look at the leads before they go out.** **New leads wait for my OK** is on by default. Skim the Review rows
each day: is the opening line true, is the email right, is it a business you want? Approve the good ones. Once
you trust it, you can turn approval off.

**6. The law (CAN-SPAM).** Cold B2B email is legal in the US if you follow the rules, and fines run tens of
thousands of dollars per email. Not legal advice.

| Rule | Who handles it |
| --- | --- |
| A real postal address in every email | You enter it once in Settings. **Nothing sends until you do.** A P.O. box or virtual mailbox is fine. |
| A clear way to opt out | Added to every email ("reply 'no thanks' and I won't email you again"), plus a hidden unsubscribe header inboxes can show as a button. |
| Honor opt-outs within 10 business days, forever | Automatic. Unsubscribes go on Do Not Contact, which is checked before every email, including if you re-import them later. |
| No misleading From line, subject or claims | The From line is "Your name at Agency name". Keep subjects and claims honest when you edit. |

Other countries are stricter (Canada's CASL, the EU's GDPR). Use this for US businesses only.

**7. Google's rules for its business data.** The finder uses Google's official Places API, not page scraping
(scraping Google Maps breaks Google's terms and gets blocked). Google's Places terms limit how long you may store
some of the data it returns. I couldn't load Google's policy page from where this was built, so read the
"Policies" and "Terms" pages for Places API (New) before you lean on it. Keep only what you use for outreach,
and clear out rows you'll never contact. The email address and findings come from each business's own public
website, not from Google. Apollo (free tier) or a CSV from another list provider works too: import it, and the
finder researches any row that has a Website and no Email.

---

## Setup (about 45 minutes)

### 1. The sending account

Set up the separate domain and Workspace inbox (point 4 above) and start warming it up. Do everything below
**signed in as that account**.

### 2. The sheet and the script

1. Go to [sheets.new](https://sheets.new) and name the sheet "Outreach". In **File → Settings**, set the time
   zone. Sending hours use it.
2. **Extensions → Apps Script.** Delete everything in `Code.gs` and paste in all of [`Outreach.gs`](Outreach.gs).
3. Click the gear (**Project Settings**) and tick **Show "appsscript.json" manifest file in editor**. Open
   `appsscript.json` and replace its contents with [`appsscript.json`](appsscript.json). That turns on the Gmail
   API, which threads the follow-ups and adds the unsubscribe header.
4. **Save**, go back to the sheet and **reload the page**. An **Outreach** menu appears.
5. **Outreach → Set up / repair sheets.** Google shows "Google hasn't verified this app", because it's your own
   script. Click **Advanced → Go to (project name)**. It asks to read and send email as this account, edit this
   spreadsheet, and connect to outside services (Google Places, Claude, ntfy, and the websites it researches).

You now have tabs for **Contacts, Searches, Sequence, Settings, Do Not Contact, Log** (plus a hidden
`_Processed`).

### 3. Settings

Fill in the **Settings** tab; each row explains itself. Required: **Your name**, **Agency name**, **Mailing
address**. Worth getting right: **Who you target**, **What you offer**, **Send call alerts to** (your main
inbox).

### 4. Claude (writes and sorts)

1. Create an account at [platform.claude.com](https://platform.claude.com), add $5 to $10 of credit, and create an
   API key.
2. **Outreach → Set Claude API key**. It's kept in the script's private properties, not the sheet.
3. **Outreach → Write my emails with Claude**, then read all three emails in the **Sequence** tab and fix
   anything that isn't true for you. (Or keep the starter emails, which are already written for an agency.)

Rough cost: 1 to 2 cents per business researched and per reply sorted. Without a key, the finder still finds
emails and findings, emails go out without an opening line, and replies are sorted by keywords.

### 5. Google Places (finds the businesses)

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project, and add a billing
   account. Google requires one even for the free monthly allowance.
2. **APIs & Services → Library**, search for **Places API (New)**, and **Enable** it.
3. **APIs & Services → Credentials → Create credentials → API key.** Edit the key, and under **API
   restrictions** choose **Restrict key → Places API (New)**, so a leaked key can't be used for anything else.
4. **Outreach → Set Google Places API key** and paste it.
5. Set a spending cap: in **Billing → Budgets & alerts**, add a budget (say $10) with an email alert, and on the
   Places API (New) **Quotas** page lower the daily request limit (100 a day is plenty: each search uses up to
   3). Google prices Places per 1,000 requests with a monthly free allowance; I couldn't load the current price
   list from here, so check it on Google's pricing page.

### 6. Phone push (free, recommended)

Install the **ntfy** app ([ntfy.sh](https://ntfy.sh) links to the iPhone and Android versions), subscribe to a
long random topic name like `calls-7Kq29xLm4Rt`, and paste the same name into **Phone push topic (ntfy)**.
Anyone who knows the name can read the pushes, so don't use anything guessable.

In your main Gmail, add a filter for the outreach address: **Never send it to Spam**, **Always mark it as
important**. Add the outreach account to the Gmail app on your phone too: the drafts and threads live there.

### 7. Test it on yourself

1. In **Searches**, add one search, e.g. `HVAC companies in Austin, TX`. Then **Outreach → Find businesses
   now**. In a minute or two, Contacts fills with Review, No Email and Skipped rows. Read a few Findings and
   Personal Lines.
2. Add a row with **your own personal email** (not the outreach account) and your business name. Click it and
   **Outreach → Preview next email for selected row**. Read it the way a stranger would.
3. **Outreach → Send me a test alert** checks the alert email, the push and your Claude key in one go.
4. **Outreach → Start autopilot.** Your test row gets email 1 within 10 minutes during sending hours. Reply from
   your personal account: *"Sure, call me Thursday at 3pm, 512-555-0100."* Within 10 minutes the row turns
   green, the alert arrives, and **Add call to calendar** opens an event for Thursday at 3:00.
5. Delete the test row.

---

## Every day (15 minutes)

1. **Add searches.** One trade, a handful of nearby cities: `roofing contractors in Round Rock, TX`,
   `roofing contractors in Cedar Park, TX`. Autopilot runs one search per cycle and researches 15 businesses per
   cycle, so a dozen searches are done within a couple of hours.
2. **Review the blue rows.** Fix any opening line that's off. Select the good rows, then **Outreach → Approve
   selected rows**. Set any you don't want to Paused, or delete them.
3. **When your phone buzzes:** open the alert, tap **Add call to calendar**, set the time, save. Then open the
   email, check the draft, send. The first agency to answer usually gets the meeting, so aim for within the hour.
4. **Before each call,** read the row's **Findings**. Those are your talking points.

| Status | Meaning | What happens next |
| --- | --- | --- |
| Finding Email | Just added by the finder | It visits their website on the next run |
| **Review** | Has an email and an opening line, waiting for your OK | Nothing until you approve it |
| *(blank)* or New | Ready to email | Email 1 goes out when there's room today |
| Active | In the sequence | The next follow-up goes out when it's due |
| Finished | All 3 emails sent, no reply | Nothing more, but a late reply still alerts you |
| **Call Requested** | They want to talk | You were alerted and a draft is saved. No more emails |
| **Needs Reply** | Question, referral, or unclear | You were alerted and a draft is saved. No more emails |
| Not Interested / Unsubscribed / Bounced | Closed | No more emails. Unsubscribes go on Do Not Contact |
| No Email | No email address found | Call list: the phone number is in the row |
| Skipped | Looks like a franchise or chain | Set it to Review if you want it anyway |
| Paused | You paused them | Nothing sends; replies are still watched |
| Do Not Contact / Duplicate | Blocked, or already emailed from another row | Skipped |
| Error | Something's wrong with this row (see Notes) | Fix it, then set Status back to New (or Active if they'd been emailed) |

---

## Editing the emails

The **Sequence** tab holds the three emails.

- **Placeholders** use double braces: `{{first_name}}`, `{{business}}`, `{{town}}`, `{{category}}`,
  `{{rating}}`, `{{reviews}}`, `{{personal_line}}`, any other Contacts column you add, plus `{{my_name}}`,
  `{{my_company}}`, `{{my_phone}}`, `{{my_website}}`.
- **Fallbacks** follow a `|`: `{{first_name|there}}` becomes "Hi there," when there's no name, and
  `{{personal_line|}}` disappears when blank. A blank placeholder without a fallback skips that contact with an
  Error instead of sending "Hi ,". A misspelled one stops **Start autopilot** before anything sends.
- **Only step 1's subject is used.** Follow-ups reply in the same thread.
- **Wait Days** counts from the previous email.
- The footer (agency, phone, website, mailing address, opt-out line) is added automatically.

What gets replies: under 100 words, plain text, no links in the first email, the opening line about *them*,
one easy question at the end. **Preview** after every change.

---

## How the research works, and its limits

- Up to 3 pages per business: the homepage, the contact page (only if the homepage has no email), and the about
  page (for the owner's name and something specific to say). It prefers an address on their own domain, then a
  Gmail-style one. It skips addresses on other domains, which usually belong to the web designer, and
  no-reply, careers and billing addresses.
- It decodes the email addresses Cloudflare hides on many small-business sites.
- **Findings are only what's visible in the page source.** If a site uses Google Tag Manager, ads and pixel tags
  can load through it unseen, so the finder says "Uses Google Tag Manager" and claims nothing is missing. Some
  sites build their pages in the browser with JavaScript; for those the finder sees less and may find no email.
- The opening line is written only from the findings and page text, and Claude is told not to guess, not to
  flatter, and to ignore any instructions hidden in a website. It can still be wrong, which is why approval is
  on by default.

---

## Costs

| | Cost |
| --- | --- |
| Second domain | about $12 a year |
| Google Workspace inbox | about $7 to $8 a month |
| Claude | about 1 to 2 cents per business researched or reply sorted |
| Google Places | per request, with a monthly free allowance; check Google's pricing page and set a cap (step 5) |
| ntfy, Sheets, Apps Script | free |

When you outgrow two inboxes or about 60 emails a day, look at Instantly or Smartlead (about $30 to $100 a
month). They add warm-up networks and inbox rotation. Your lead list and research carry straight over as a CSV.

---

## Troubleshooting

- **No Outreach menu.** Reload the sheet; check the script was saved.
- **A search says "Error: Google Places said 403 …".** Places API (New) isn't enabled, billing isn't set up, or
  the key is restricted to a different API. The message after the colon is Google's own explanation. Clear the
  Status cell to run the search again.
- **Lots of No Email rows.** Normal for some trades: many small shops only list a phone number. Call them, or try
  a nearby city or a different trade.
- **Nothing is sending.** **Outreach → Send now** says why: outside your hours, today's limit reached, spacing
  emails out, a setting missing, or no rows set to New.
- **Alerts never arrive.** Check main Gmail's spam folder and add the filter from step 6. **Outreach → Send me a
  test alert** tests the whole chain.
- **A row says Error.** Read its Notes, fix it, then set Status back to New (or Active).
- **The Log tab** records everything the script did, newest at the bottom.

---

## For developers

`Outreach.gs` is the whole program: plain Apps Script (V8), no libraries. `appsscript.json` turns on the Gmail
advanced service.

The tests run the real `Outreach.gs` under Node, against in-memory stand-ins for Sheets, Gmail, Google Places,
websites, the Claude API and ntfy (`test/fakes.js`). They cover the finder (pagination, dedupe, closed and
listing-site businesses, dead sites, Cloudflare-hidden emails, designer emails, franchises, approval), the
writer, sending, follow-up threading, every reply category, warm-up and pacing, the legal checks, and the
Claude-is-down fallback.

```bash
cd tools/outreach
npm test
```

The stand-ins model the APIs as documented; they aren't Google. In particular, the Places request was written
without access to Google's current docs. Your first real search (step 7) is the check, and if Google rejects
anything, its exact error lands in the Searches tab.
