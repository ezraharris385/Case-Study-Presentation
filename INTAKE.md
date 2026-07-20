# Data intake — paste your real case data here

You don't have to fill this out tidily. **Easiest path: paste your deck text / spreadsheet /
notes in any format** and I'll structure it into `shared/data.js`. This checklist just shows
what the dashboard can display, so you know what's useful. ⭐ = powers the **map** (highest value).

---

## 0. Branding  → `config.js`
- Firm / team name:
- Client (fictional cold-storage co.) name:
- "As of" date:

## 1. Finalist sites (the ones on the map) ⭐
For **each** finalist:
- Name / label + City, State ⭐
- Submarket (e.g. "I-80 / Joliet Intermodal") ⭐
- **Address or lat,long** ⭐ (address is fine — I'll place the pin)
- Status (existing / spec / build-to-suit / land)
- Size (SF), clear height, dock doors, trailer parking
- **Power / electrical capacity** (MW or amps) — key for cold storage
- Cold-readiness (freezer-ready shell / dry / ground-up) + refrigeration (ammonia?)
- Asking rent (NNN, $/SF) + opex/taxes ($/SF)
- Expansion capability
- **Criteria score** (overall 0–100) + per-criterion sub-scores if you have them
- Drive distances/times to key nodes (or tell me the nodes and I'll compute)
- Labor: population within 10 mi, warehouse workforce, avg wage, unemployment
- Incentives available at this site
- Pros / watch-outs

## 2. Also-considered sites (didn't make the cut) — lighter data ⭐
For each: name, city, submarket, (rent/size if known), and **one line on why it was dropped**.

## 3. Criteria & weights
- The list of criteria you scored on (I have a default set — send yours if different).

## 4. Client needs (from the initial call)
- Size, temperature profile (freezer/cooler mix), power, throughput, timeline, headcount
- Deal-breakers / non-negotiables

## 5. SWOT
- Strengths / Weaknesses / Opportunities / Threats (bullets)

## 6. Chicago industrial market
- Any specific stats from your deck (vacancy, avg NNN rent, rent growth, construction, cold-storage note) + source.
  *(I also have live market research running — I can fill gaps with sourced current figures.)*

## 7. Key lease terms
- Structure, term, escalations, free rent, TI allowance, renewal options, expansion rights.

## 8. Incentives & TCO
- Incentive programs per site + rough $ value.
- TCO assumptions: term (yrs), SF, headcount, wage, power $/SF, fit-out $/SF.

## 9. Deliverable timeline
- Milestones + dates.

## 10. Next steps
- The actions coming out of this meeting.

## 11. Survey questions
- Default set is in `data.js`. Tell me anything to add/remove (the responses collect to your Google Sheet).
