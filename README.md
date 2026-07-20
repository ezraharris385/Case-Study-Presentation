# Cold-Chain Site Cockpit

An interactive, map-first site-selection dashboard for a cold-storage client search in
the Greater Chicago / Midwest industrial market. Built for a client follow-up meeting:
pull the **desktop** build up on the screen, hand out the **phone** build via QR so the
room can explore the sites and leave their priorities in a take-home survey.

> ⚠️ Ships with clearly-labeled **sample data**. Swap in the real case data in
> `shared/data.js` (see *Plugging in your data* below) and the "sample data" banners disappear.

## Two builds, one data file

| Build | Who / where | URL |
|---|---|---|
| **Desktop** (`/desktop/`) | On-screen during the meeting | `…/desktop/` |
| **Phone** (`/mobile/`) | The QR code | `…/mobile/` |

Both read the same `shared/data.js`, `shared/config.js`, and `shared/theme.css`, so you
edit the data **once**.

```
shared/    theme.css · config.js · data.js   ← the one place you edit content
desktop/   index.html · styles.css · app.js  ← projector build (map hero + side nav + drawer)
mobile/    index.html · styles.css · app.js  ← QR build (map + bottom tabs + bottom sheet)
backend/   apps-script.gs · README.md        ← survey response collector
assets/    qr-mobile.png (generated on deploy)
index.html  landing page: desktop link + phone QR
```

## Deploy (GitHub Pages)

1. Push this branch (already the working branch).
2. On GitHub: **Settings → Pages**.
   - **Source:** *Deploy from a branch*
   - **Branch:** `claude/internship-client-dashboard-gwpcz6` · **Folder:** `/ (root)` · **Save**
3. Wait ~1 minute. Your site is at:
   - Landing: `https://ezraharris385.github.io/case-study-presentation/`
   - Desktop: `https://ezraharris385.github.io/case-study-presentation/desktop/`
   - Phone: `https://ezraharris385.github.io/case-study-presentation/mobile/`
4. Put the **phone** URL into `shared/config.js → phoneUrl`, then regenerate the QR
   (`assets/qr-mobile.png`) — or just use the QR on the landing page.

> Tip: the landing page shows the phone QR automatically, so on stage you can open the
> landing URL and let the room scan it.

## Collect survey responses

The take-home survey can write real responses to a Google Sheet you own (recommended)
or Formspree. 3-minute setup in [`backend/README.md`](./backend/README.md). Until you
configure it, the survey still works and echoes results locally.

## Plugging in your data

Everything the app shows lives in `shared/data.js`, commented field-by-field. Replace the
`SAMPLE —` entries with the real:

- **sites** — the finalists (coords, specs, power, rent, drive times, labor, incentives, criteria scores, pros/cons)
- **alsoConsidered** — sites that didn't make the shortlist (lighter data; shown as hollow pins)
- **needs · swot · market · criteria · leaseTerms · timeline · tco · nextSteps**
- Set `sampleData: false` to hide the banners.

Also set branding in `shared/config.js` (`firmName`, `clientName`, `asOfDate`).

## Local preview

```bash
cd Case-Study-Presentation
python3 -m http.server 8000
# open http://localhost:8000/desktop/  and  http://localhost:8000/mobile/
```
(Serve from the repo root so the `../shared/` paths resolve.)
