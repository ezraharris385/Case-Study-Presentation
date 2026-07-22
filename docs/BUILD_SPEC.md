# Build spec — pending changes (execute AFTER all photos are in)

> Status: **holding — do not build until user says go.** Captured from user direction.

## Branding
- Firm = **CBRE**. Add CBRE wordmark/logo. (Confirm: official logo file vs. rendered wordmark; CBRE-green theme y/n.)

## Rent display — replace base/opex/all-in with a simple range + structure
- **Birchwood** (Des Plaines): `$9–11 Industrial Gross`
- **Sellstrom** (Palatine): `$9–11 NNN`
- **Wilke** (Arlington Heights): `$8–10 NNN`

## Remove
- **Scorecard**: remove the "X of 10 criteria" number and the criteria-as-a-score framing / tab.
- **TCO / costs**: none anywhere.
- **Cold-storage specifics**: keep only high level. None of the three are existing cold-storage facilities — don't imply cold-ready.
- **Survey questions to delete** (mobile): "how urgent is occupancy", "which site feels right", "primary temperature profile".
  - Keep: name & role, priority ranking, and the free-text box.

## Site characteristics (reframe — NOT scoring, just highlighting the data)
- For each characteristic: if the property meets it → **✓ check**; if not → text **"requires further diligence."**
- Do **not** show a count/tally or a score number. Just show the checks.
- Floor drains / backup power → "requires further diligence" (not present in data).

## Incentives (new, high level only)
- Per site, as applicable. Keep high level — e.g., Cook County **Class 6b** eligibility, enterprise zone/TIF where relevant. **No dollar amounts, no TCO.**

## Lease terms (new section — just list the NAMES, do NOT elaborate)
Assign the most important / peculiar-to-the-property terms per site, chosen from:
`Lease structure · Rent escalations · Expense caps · Direct metering · Power cost structure · Audit rights · Temperature guarantees · Expansion rights · Code compliance`

## Map
- Rename **"nodes" → "Benchmarks"** everywhere (layer label, legend, drive-distance table column).
- **Granular layer toggles**: individual on/off for each benchmark AND each labor shed (all on, or turn off specific ones).

## Survey backend
- **Email submissions to the user** (survey feedback → email). Options: Formspree (auto-emails) or Apps Script `MailApp.sendEmail` (email + Sheet). Confirm destination email (esharris3@wisc.edu?).

## Attribution / compliance (images sourced from CoStar)
- Credit each image to its **listing brokerage** (Birchwood = Brennan Investment Group; Sellstrom = MWI Property Group / Midwest Industrial Funds; Wilke = TBD).
- Add an educational disclaimer footer; avoid CoStar-watermarked imagery; keep the site effectively unlisted. (Not legal advice.)

## Photo assets — durable sources
| Site | Flyer/brochure PDF (durable) | Loose photos catalogued |
|---|---|---|
| Birchwood (Des Plaines) | ✅ `1780_Birchwood…Brochure.pdf` (Brennan) | plat, Brennan site plan, interior, aerial, +2 |
| Sellstrom (Palatine) | ✅ `Palatine_Corporate_Center…150_Sellstrom.pdf` (MWI) | site plan/specs, interior, aerial, MWI office plan |
| Wilke (Arlington Heights) | ❌ NEEDED | dock-doors exterior |

## Open confirmations before build
1. CBRE logo file vs. rendered wordmark; CBRE-green theme?
2. This batch's 2 photos = Birchwood? (assumed yes)
3. Wilke brochure/flyer PDF?
4. Survey email destination + Formspree vs. Sheet+email?
5. OK to use my CRE judgment on the per-site lease-term assignments?
