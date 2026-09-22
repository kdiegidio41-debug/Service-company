/* =========================================================================
   EverGlow — site settings. Edit these before you go live.

   endpoint: where quote requests are sent (JSON POST). Both the homepage
             form and quote.html use it. Easiest options:
               Formspree   → 'https://formspree.io/f/xxxxxxxx'
               Zapier/Make → your catch-hook URL
               Your CRM    → a Jobber / Housecall Pro webhook
             While it is '' the forms run in DEMO MODE: they validate and show
             the success message, but nothing is sent anywhere.
   fallbackEmail: used for the pre-filled email shown if a submission fails,
                  so a lead is never lost. (Phone numbers live in the HTML.)
   ========================================================================= */
window.EVERGLOW = {
  endpoint: '',
  fallbackEmail: 'hello@everglowlighting.com'
};
