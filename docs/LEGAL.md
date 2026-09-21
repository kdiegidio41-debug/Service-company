# Legal exposure — what the site now covers, and what it can't

**I am not a lawyer and none of this is legal advice.** It is the set of ordinary
protections a small contractor's website should have, plus an honest list of what a
website cannot do for you.

---

## The two things that actually stop you being sued personally

Neither is a website matter. Both matter more than everything below combined.

### 1. Form an LLC before you take a dollar

Right now, if a ladder goes through a window or someone gets hurt, **your personal
assets are on the table** — your savings, your car, anything in your name. A
single-member LLC puts a wall between the business and you.

In Pennsylvania this is a Certificate of Organization filed with the Department of State.
The filing fee is modest and you can do it yourself. Then get an EIN from the IRS (free,
online, ten minutes) and **open a separate business bank account** — mixing personal and
business money is the most common way people lose the protection they paid for.

### 2. Get general liability insurance before the first job

You are putting people on roofs above driveways in freezing weather. This is not a
theoretical risk. Get a quote from an agent who writes contractor policies, and if you
hire anyone at all, ask about workers' compensation — Pennsylvania requires it for
employees.

Until the policy is in force, **the site says nothing about being insured.** That was
deliberate (see below). The day you're covered, put it back — it's one of the strongest
lines you can run.

---

## What changed on the site

### Removed: every insurance and licensing claim

The site claimed **"$2M general liability and workers' comp"** in seven places, including
inside the structured data Google reads. Advertising coverage you don't carry is
deceptive advertising, and it's the first thing a homeowner's insurer asks for after an
accident. All seven are gone. The HTML carries a comment at the hero marking where to
restore it.

Replacements are things that are true today — owner-operated, takedown included, written
scope and price before work starts.

### Removed: the placeholder testimonials

Three reviews reading *"Sample review — replace with a real one"* were on the homepage.
Publishing invented endorsements violates the FTC's endorsement rules and Google's
structured-data policy. The whole section is gone, with a comment showing where to put
real ones. **Never write a review for yourself, and never let a vendor write them for you.**

### Added: a privacy policy

You collect names, phone numbers, email addresses and **home addresses** through the
quote form. Collecting that with no privacy policy is a problem in itself, and it blocks
you from running Google or Meta ads — both require one. `privacy.html` covers what you
collect, why, that you don't sell it, how long you keep it, and how someone gets their
data deleted.

### Added: terms of service

`terms.html` does the job the site most needed: it says plainly that **the estimator's
number is not a quote.** Your quote page shows ranges up to $6,000 from a handful of
answers. Without a disclaimer, a customer can argue the site made them an offer. The
terms also separate your marketing promises from your contractual ones, cover weather and
access, and set Pennsylvania law.

### Strengthened: the texting consent

The form's consent box now says explicitly that you may call, text or email, that rates
may apply, and that STOP opts out. This is your TCPA protection, and it is worth real
money — **$500 per message, $1,500 if a court calls it willful.** Keep a record of who
consented; the form submission is that record.

---

## On "secure"

A static site is about as secure as a website gets. There is **no database, no login, no
CMS, no plugins** — nothing to hack and nothing stored here to steal. That rules out most
of what actually happens to small business sites.

What still matters:

- **HTTPS.** Automatic on GitHub Pages, Netlify and Cloudflare Pages. Never run the form
  over plain HTTP.
- **The form provider holds your leads.** Pick a reputable one (Formspree, Netlify Forms)
  and turn on two-factor authentication on that account and on your email.
- **Your email is the weak point.** Every lead lands there. Use a strong unique password
  and 2FA. That is a bigger real-world risk than the website.
- **Collect less.** The form asks for what's needed to quote a job and nothing more. Never
  add payment card fields to a static form.

---

## Still on you

| | Why it matters |
| --- | --- |
| **Form the LLC** | Separates your personal assets from the business |
| **Get insured** | The actual protection; also unlocks the strongest claim on the site |
| **Check licensing** | PA requires Home Improvement Contractor registration for most residential contractors above a low dollar threshold. Check whether holiday lighting falls under it before you advertise. |
| **Write a service agreement** | The site now points to it repeatedly. It needs to exist, in writing, signed before work. |
| **Put a real email on the site** | `hello@everglowlighting.com` is still a placeholder |
| **Have a lawyer read it once** | A PA small-business attorney reviewing your service agreement and these two pages is a couple of hours of billing. Cheapest insurance you will buy. |

---

## The honest summary

The site no longer claims anything untrue, tells people what you do with their data,
makes clear that an estimate is not a quote, and gets consent before you text anyone.
That removes the obvious ways a website gets a business in trouble.

It does not make you judgment-proof. **A website cannot do that — an LLC and an insurance
policy can.** Do those two things before you put a ladder on anyone's house.
