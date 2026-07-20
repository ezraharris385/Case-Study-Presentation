# Collecting survey responses

The take-home survey can **actually collect** what people submit. Two options —
pick one, paste one URL into `shared/config.js`, done.

---

## Option A — Google Sheet (recommended)

You own the data, it's free, and you can watch responses land **live** during Q&A.

1. Go to <https://sheets.new> and make a blank sheet (sign in with your `@wisc.edu` account).
2. **Extensions → Apps Script.**
3. Delete the placeholder code, paste the entire contents of [`apps-script.gs`](./apps-script.gs), and click **Save** (💾).
4. Click **Deploy → New deployment.**
   - Gear icon → **Web app.**
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
   - **Deploy.** Approve the permission prompt (it's your own script).
5. Copy the **Web app URL** (ends in `/exec`).
6. In `shared/config.js` set:
   ```js
   survey: {
     mode: "appscript",
     endpoint: "https://script.google.com/macros/s/XXXXX/exec",
     ...
   }
   ```

Responses append to a **Responses** tab, one row each, headers auto-created.
Leave the sheet open on your laptop during the meeting to show them coming in.

> Note: the browser sends the data as `text/plain` on purpose — that avoids a CORS
> preflight that Apps Script won't answer. The write still succeeds; the page shows a
> success message without reading the response back.

---

## Option B — Formspree (zero code)

1. Sign up at <https://formspree.io>, create a form, copy its endpoint
   (`https://formspree.io/f/xxxx`).
2. In `shared/config.js` set:
   ```js
   survey: { mode: "formspree", endpoint: "https://formspree.io/f/xxxx", ... }
   ```
Free tier caps at 50 submissions/month — fine for a demo, but the Sheet has no cap.

---

## Privacy note (say this on stage)

The survey asks only for **role + business priorities** — no personal data is required.
The one-line consent under the submit button (`survey.consentNote` in config) tells
respondents their answers go to the deal team. Keep it that way; don't add fields that
collect anything sensitive.

## Test it

After deploying, open the survey on the site, submit once, and confirm a row appears
in the sheet (or a submission in Formspree). If nothing lands, re-check that
**Who has access = Anyone** and that the URL ends in `/exec`.
