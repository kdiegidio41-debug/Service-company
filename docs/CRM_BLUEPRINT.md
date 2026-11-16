# EverGlow — Own-CRM Blueprint (clean-room)

*What it would take to replace Flyra with software EverGlow owns, when it's worth doing, and
the plan if it is. Written November 2026, in the middle of install season.*

---

## 0. Ground rules: what "reverse engineering" can and can't mean here

**Not on the table: copying Flyra's code.** The app runs on Flyra's servers behind a login.
The only code that ever reaches a browser is a minified front-end bundle, which is
copyrighted, and Flyra's terms forbid copying or scraping the service. Copying it would put
the account at risk (Flyra holds the customer list, estimates and payment history) and
expose the business to a copyright claim. It also wouldn't help: the part worth copying, the
server logic, never leaves their servers.

**On the table: a clean-room build.** Features, workflows and data concepts ("an estimate
has line items and becomes an invoice") aren't owned by anyone. The legitimate way to learn
what Flyra does is to use it and read its public API surface. That's what §2 is built from.
Rules for the build:

- Write every line of code, every screen and every customer-facing message from scratch.
- Don't copy Flyra's UI layouts, icons, wording, or email/SMS templates.
- Don't scrape `app.flyra.io`. Use only its documented API (`developers.flyra.io`) and your
  own data exports.

---

## 1. Decide first: stay, extend, or build

| Option | Cost | Time | Risk | Verdict |
| --- | --- | --- | --- | --- |
| **Stay on Flyra** | $129/mo (Solo plan, 3 seats), about $1,550/yr | 0 | Low | **Right answer for Season 1.** |
| **Extend Flyra** through its REST API and webhooks | $129/mo + $0–20/mo hosting | 20–60 hrs per feature | Low: Flyra still runs payments, texting and scheduling | Right answer for anything Flyra is missing (see §8). |
| **Build your own** | $30–80/mo to run (hosting, database, SMS, email, maps) + Stripe fees you pay either way | 300–600 hrs for a single-company MVP; Flyra itself is team-years of work | High: payments, texting compliance and uptime become your problem | Only worth it to **sell it to other companies** or as a deliberate learning project. |

**The honest math on "build to save money":** running your own still costs $30–80 a month,
so the saving is $600–1,200 a year. At even $20/hour, a 400-hour MVP costs $8,000 of your
time. It takes 7–13 years to pay back, and that's before the first Saturday you lose fixing
a broken invoice page in December.

**When building does make sense:**

1. **You want to sell it.** No generic field-service CRM is built around the holiday-lighting
   season (§3). A niche SaaS for lighting companies, which you'd use yourself first, is a
   real business idea. That changes the architecture (multi-company from day one, Stripe
   Connect) and it's a second company, not a side project.
2. **You want to learn to build software,** and EverGlow is the test customer. That's fine,
   as long as the real customers stay on Flyra until the new system has run a full season
   alongside it.

---

## 2. What Flyra actually is: the feature map

Built from Flyra's public API surface: about 450 distinct actions across 17 modules. **This is
the scope you'd be rebuilding.** The "v1?" column shows how little of it an EverGlow MVP needs.

| Module | What it covers | ~Actions | v1? |
| --- | --- | --- | --- |
| **Customers & properties** | Customers, multiple contacts and properties each, tags, notes, photos, custom fields, balances, activity timeline, saved cards, CSV import/export, "customers within X miles" | 40 | **Yes** (no custom fields or radius search) |
| **Leads & pipelines** | Leads, pipelines with custom stages, lead sources, public lead forms, Facebook/Instagram/Google lead sync, lead-to-customer conversion, objection library, leads report | 35 | **Yes** (one fixed pipeline) |
| **Estimates** | Line items from a price book, photos, mockups, default attachments, branded background, public link, e-signature, approve/decline, deposit, convert to invoice | 25 | **Yes**: the core of the business |
| **Jobs & scheduling** | Jobs, crew assignment, status flow, recurring jobs, checklists and templates, job photos, supplies used, complaints, tips, quality checks, availability, open-slot finder, customer self-booking | 55 | **Yes** (no self-booking, quality checks or tips) |
| **Invoices & payments** | Invoices, split/partial payments, charge saved card, refunds, payment reminders, receipts, processing-fee pass-through, payouts, Stripe connection, discounts | 30 | **Yes** (deposit + balance only) |
| **Subscriptions** | Recurring service plans, templates, pause/resume/cancel, agreements, auto-charge, cancellation "save center", MRR and retention | 35 | No: lighting is seasonal, not monthly |
| **Texting & email** | Two-way SMS inbox, mass texts with credits, quick replies, scheduled messages, blocked numbers, email threads, custom sending domain, team chat | 40 | **Partly**: two-way SMS with consent tracking, no mass texts |
| **Phone system** | Business number, phone menu, voicemail greeting, forwarding, call recording, caller-ID name, spam screening, transfers, call outcomes | 20 | No: use Google Voice or a cell |
| **Automations** | Event-triggered workflows (lead created, estimate sent, job completed...), folders, approval queue, snooze, test runs | 25 | **5 hard-coded ones** (§4), no builder |
| **Team, HR & payroll** | Employees, invites, roles and permissions, working hours, timesheets, pay rates, commission, per-linear-foot pay, bonuses, pay statements, contracts with e-sign, onboarding files with expiry dates, live GPS | 60 | No: a spreadsheet or Gusto |
| **Door-to-door sales** | Map pins, pin types, territories, knocking sessions, sales teams, sprints and prizes, leaderboard, yard signs, QR codes, area measuring | 40 | No (yard-sign log is a v2 maybe) |
| **Routing** | Daily route plans, route optimization, publishing routes to crews | 8 | No: Google Maps multi-stop |
| **Equipment** | Equipment list, check-out/return, service records | 8 | No |
| **Expenses** | Expenses, receipt import, categories, profit report | 8 | No: your accounting app |
| **Reviews & referrals** | Review requests, review log, referral links, rewards | 12 | **Review request only** |
| **Reports** | Revenue, MRR, retention, estimate funnel, jobs by lead source, map and review reports | 15 | **The five metrics in BUSINESS_PLAN.md §11**, nothing else |
| **Platform** | API keys, webhooks, Google Calendar and Google Ads, Meta conversion reporting, global search, multi-company accounts, notification settings | 20 | No (single company) |

Roughly **a quarter of Flyra** is in scope for v1, and that quarter still includes the hardest
parts: money, texting and e-signatures.

---

## 3. What EverGlow needs that Flyra doesn't do well (the reason to build at all)

Flyra is built for general home services (cleaning, landscaping, HVAC, plumbing). A lighting
company runs on a **season loop**, and that's where a purpose-built tool can win:

```
 Aug–Oct           Oct–Dec            Nov–Dec            Jan             Jan–Jul           Aug
 Quote ──► 50% deposit ──► Install ──► 24-Hour Fix calls ──► Takedown ──► Kit in storage ──► Renewal quote
   ▲                                                                                          │
   └──────────────────────────────── same customer, 65–70% price ◄───────────────────────────┘
```

| Feature | Why it matters (from BUSINESS_PLAN.md) | Flyra today |
| --- | --- | --- |
| **Linear-foot measuring → one season price** | Price per foot internally, quote one number externally. Enforce the $850 minimum. | Price book exists, but per-foot rates are currently set to $0 and nothing stops an under-minimum quote |
| **Install + takedown created as a pair** | Every install is a January takedown you've already sold. | Two separate jobs, created by hand |
| **Kit & storage tracking** | Labeled kit per address and zone: strand counts, bulb color, failed strands, shelf location. Turns a 3.5-hr reinstall into 2 hrs. **This is the moat.** | Not a concept in Flyra; its equipment module tracks company tools, not customer kits |
| **Renewal engine** | In August, auto-draft next season's estimate from last year's kit at 65–70% of the year-one price. "Same design, or add the oak?" | Would be manual estimates |
| **Capacity cap + waitlist** | Book to 85% of crew capacity; "we're full, want the Season 2 list?" | No capacity limit |
| **24-Hour Fix service calls** | Free service calls until takedown, tracked against the install. | Possible as $0 jobs, not tracked as a promise |
| **Blue-hour photo → text → review ask** | The photo texted that night is what earns the review and the referral. | Review request exists; photo-text step is manual |

If you only build one thing, build the **kit tracker + renewal engine**. It's what you'll want
in January (takedown) and August (renewals), and Flyra doesn't do it.

---

## 4. MVP scope (v1, one company)

**Screens**

1. **Today:** jobs on the calendar, open service calls, leads not answered in 15 minutes.
2. **Leads:** one pipeline: New → Contacted → Quoted → Won / Lost. A lead auto-creates from the
   website forms.
3. **Customer:** contacts, property, photos, every estimate/job/invoice, the kit, texting thread.
4. **Estimate builder:** roofline ft (1-story / 2-story), trees, shrubs, wreaths, garland and
   markers at the BUSINESS_PLAN.md §4 rates. Shows packages, enforces the $850 minimum,
   produces one season price. Public link, e-signature, pay the 50% deposit by card.
5. **Calendar:** installs, service calls, takedowns; drag to reschedule; capacity bar per week.
6. **Invoices:** balance invoice after install, payment link, paid/unpaid.
7. **Kits:** per-customer kit list, storage location, condition notes, "ready for next season."
8. **Renewals:** the August list: last year's price, renewal price, one click to send.

**The five hard-coded automations**

1. New lead → text within 1 minute (only if they ticked the consent box).
2. Estimate sent → follow-up on day 2 and day 5, then stop.
3. Deposit paid → create install job + paired takedown job, text confirmation.
4. Install completed → send balance invoice; next morning, review request.
5. August 1 → draft renewal estimates for every stored kit.

**Explicitly out of v1:** payroll, timesheets, phone system, door-to-door maps, subscriptions,
route optimization, equipment, expenses, custom automation builder, multi-company, mobile
app (a responsive web app works on the crew's phones).

---

## 5. Data model (core tables)

```
organizations     id, name, timezone, settings (rates, minimum, deposit %)
users             id, org_id, name, email, phone, role (owner | crew)
customers         id, org_id, name, email, phone, sms_consent_at, sms_consent_source, opted_out_at
properties        id, customer_id, address, lat, lng, stories, notes, photos[]
leads             id, org_id, customer_id?, source, stage, lost_reason, first_response_at, created_at
estimates         id, customer_id, property_id, season (2026), status, total_cents,
                  deposit_pct, public_token, signed_at, signer_name, signer_ip, doc_hash
estimate_items    id, estimate_id, kind (roofline_1s | roofline_2s | tree | shrub | wreath | ...),
                  qty, unit (ft | each), unit_price_cents
jobs              id, customer_id, property_id, estimate_id, kind (install | service | takedown),
                  status, scheduled_start, scheduled_end, completed_at, crew_user_ids[]
invoices          id, customer_id, estimate_id, kind (deposit | balance), total_cents, status,
                  stripe_payment_link_id
payments          id, invoice_id, amount_cents, stripe_payment_intent_id, received_at, refunded_cents
kits              id, property_id, season_built, shelf_location, status (installed | stored | retired)
kit_items         id, kit_id, zone (front roofline, oak tree...), item, length_ft, bulb, count, condition
messages          id, customer_id, direction, body, twilio_sid, status, sent_at
events            id, org_id, type, entity, entity_id, payload, created_at   (audit log + automation trigger)
```

Money is always stored in **integer cents**. Every table has `created_at`/`updated_at`.
`events` doubles as the audit trail and the automation trigger source.

---

## 6. Stack (boring on purpose)

| Layer | Pick | Why |
| --- | --- | --- |
| App | **Next.js + TypeScript** | One language front to back; huge amount of documentation and examples |
| Database + login + file storage | **Supabase (Postgres)** | Auth, row-level security, photo storage and backups in one free-to-start service |
| Payments | **Stripe Checkout / Payment Links** | Card numbers never touch your server, which keeps PCI scope minimal. Stripe Connect only if you sell to other companies |
| Texting | **Twilio** + 10DLC registration | Registration takes weeks; start it before anything else |
| Email | Resend or Postmark | Receipts, estimate links |
| Hosting | Vercel or Netlify | Push to deploy, free tier fits one company |
| Maps | Google Maps (satellite, for measuring rooflines) | Already part of the quoting process |

---

## 7. What Flyra handles for you today that you'd inherit

These are the reasons a homemade CRM gets a business in trouble. Each needs a plan before
launch, not after.

- **Payments (PCI):** never collect card numbers in your own forms. Use Stripe-hosted pages.
- **Texting law (TCPA) and carrier rules (10DLC):** register the brand and campaign, record
  consent with time and source, honor STOP instantly, never auto-text someone who didn't tick
  the box. Fines run $500–1,500 per message.
- **E-signatures (ESIGN/UETA):** store who signed, when, from what IP, and a hash of the exact
  document they saw.
- **Pennsylvania Home Improvement Consumer Protection Act:** contract terms and the 3-day
  cancellation right have to be built into the estimate/contract flow (see README).
- **Customer data:** backups, access control, a plan for a lost laptop or a leaked password.
- **Uptime in season:** if your CRM is down on December 3rd, you can't see the install
  schedule. With Flyra, keeping it running is their job; with your own, it's yours.

---

## 8. The cheaper path: extend Flyra instead of replacing it

Flyra has a REST API (base `https://app.flyra.io`, docs at `https://developers.flyra.io`).
Every Flyra action is available at `POST /v2026-06-01/actions/{action_name}`, plus named
routes for customers, estimates and messages, and outgoing **webhooks**. An Admin creates an
API key at `https://app.flyra.io/developer` (it starts `flr_live_`).

**Never put that key in website JavaScript.** It belongs in a server-side environment
variable (for example a Netlify Function's environment settings), never in `assets/js/` and
never in this repo.

Worth building on top of Flyra, in order:

1. **Quote planner → priced Flyra estimate.** `quote.html` already computes a ballpark. A
   small server function can create the Flyra customer and an estimate with real line items
   and text it, so a website lead has a priced quote in minutes, not the next day. (The site
   is currently deployed by zip upload; server functions need the Netlify CLI or a
   GitHub-linked deploy.)
2. **Kit tracker** (§3): a small app with its own database that reads customers from Flyra
   and stores kits, shelf locations and condition. For the first 20–30 kits, a shared Google
   Sheet with one tab per customer does the same job for $0.
3. **Renewal drafts:** in August, read last season's accepted estimates from Flyra and create
   renewal estimates at 65–70%.
4. **Takedown pairing:** a webhook on job completion that creates the January takedown job.

Each of these is 20–60 hours, keeps payments and texting inside Flyra, and is exactly the code
you'd reuse if you later build your own CRM.

---

## 9. Timeline, if you build

| When | What | Done when |
| --- | --- | --- |
| **Now – Jan 15** | **Don't build.** Run the season in Flyra. Keep a running list of every time Flyra slows you down; that list is the real spec. | Takedowns finished |
| **January** | Export everything from Flyra (customers, estimates, jobs, payments). Track kits in a sheet during takedown. Start Twilio 10DLC registration. | Every kit labeled and logged |
| **Feb – Apr** | Build the core: customers, leads, estimate builder with e-sign + deposit, calendar, invoices. Use it for offseason gutter/window jobs. | 10 real paid jobs through it |
| **May – Jul** | Texting, the five automations, kit tracker, renewal engine. | Every stored kit has a renewal draft |
| **August** | Send renewals from the new system; keep Flyra running in parallel. | Renewals paid without a support emergency |
| **Sept 1: go/no-go** | Switch only if it handled renewals cleanly. Otherwise run Season 2 on Flyra and keep building. | Decision made with a full calendar ahead |

Cancel Flyra only after the new system has taken real money for a full season. Saving $129 a
month is never worth a broken December.
