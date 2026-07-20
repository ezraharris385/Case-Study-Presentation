/* ============================================================
   CASE DATA — single source of truth for BOTH builds.
   Everything below marked "SAMPLE" is illustrative placeholder
   data so the map renders during development. Replace with the
   real case data (the intake template maps 1:1 to these fields).
   Units are noted inline. Coordinates are [lat, lng].
   ============================================================ */
window.CASE_DATA = {

  sampleData: true, // <- flip to false once real data is in; hides the "sample data" banner

  /* ---- Client needs (from the initial call) ---- */
  needs: {
    summary: "SAMPLE — Replace with the needs captured on the initial call.",
    requirements: [
      { label: "Facility size", value: "250,000–300,000 SF" },
      { label: "Temperature", value: "70% freezer (-10°F) / 30% cooler (34°F)" },
      { label: "Power", value: "≥ 4 MW service, redundant feed" },
      { label: "Throughput", value: "Regional DC — 40 dock doors, cross-dock" },
      { label: "Timeline", value: "Occupancy within 12–18 months" },
      { label: "Labor", value: "180–220 FTE at stabilization" },
    ],
    dealBreakers: ["No rail-served requirement", "Must be ≤ 45 min to O'Hare cold air-freight", "Ammonia-permittable"],
  },

  /* ---- SWOT ---- */
  swot: {
    strengths:  ["SAMPLE — established Midwest customer base", "Strong balance sheet for build-to-suit"],
    weaknesses: ["SAMPLE — aging existing facility at capacity", "Labor retention in freezer roles"],
    opportunities: ["SAMPLE — e-grocery / cold-chain demand growth", "State + county incentives for large employers"],
    threats: ["SAMPLE — rising power costs", "Industrial rent escalation in core submarkets"],
  },

  /* ---- Chicago industrial market snapshot ---- */
  market: {
    headline: "SAMPLE — Greater Chicago industrial market",
    stats: [
      { label: "Industrial vacancy", value: "5.4%", trend: "up" },
      { label: "Avg asking rent (NNN)", value: "$8.10 /SF", trend: "up" },
      { label: "Rent growth (YoY)", value: "+6.2%", trend: "up" },
      { label: "Under construction", value: "18.5M SF", trend: "down" },
      { label: "Cold-storage rent premium", value: "2–3× dry", trend: "flat" },
    ],
    note: "SAMPLE — Cold storage remains supply-constrained; power availability and freezer-ready shells are the binding constraints, not land.",
    source: "Placeholder — replace with your market source (CBRE/JLL/C&W, etc.)",
  },

  /* ---- Scoring criteria (shown as per-site scorecard; not a live ranker) ---- */
  criteria: [
    { key: "power",      label: "Power & utilities",     hint: "Electrical capacity, redundancy, ammonia permitting" },
    { key: "labor",      label: "Labor availability",    hint: "Workforce depth, wages, freezer-role retention" },
    { key: "access",     label: "Logistics access",      hint: "Interstate, intermodal, air-freight drive times" },
    { key: "cost",       label: "Occupancy cost",        hint: "Rent + opex + taxes" },
    { key: "incentives", label: "Incentives",            hint: "State/local abatements & credits" },
    { key: "building",   label: "Building suitability",  hint: "Clear height, freezer-readiness, expansion" },
    { key: "reach",      label: "Market reach",          hint: "Population / customers within drive time" },
  ],

  /* ---- PRIMARY sites (full data — the finalists) ---- */
  sites: [
    {
      id: "elwood",
      tier: "primary",
      name: "SAMPLE — Elwood / CenterPoint",
      city: "Elwood, IL",
      submarket: "I-80 / Joliet Intermodal",
      coords: [41.397, -88.108],
      status: "Existing shell + expansion pad",
      sizeSF: 285000,
      clearHeight: "40'",
      dockDoors: 44,
      trailerParking: 120,
      power: "5 MW available, dual feed",
      coldReady: "Freezer-convertible shell",
      refrigeration: "Ammonia-permittable",
      rentNNN: 7.25,          // $/SF/yr
      opex: 2.10,             // $/SF/yr taxes+CAM+insurance
      expansion: "Up to +150,000 SF on pad",
      criteriaScore: 86,      // overall 0–100
      scores: { power: 90, labor: 82, access: 95, cost: 80, incentives: 88, building: 84, reach: 78 },
      drive: [ // to key nodes — miles & minutes
        { node: "BNSF Logistics Park", miles: 3, min: 6 },
        { node: "I-80", miles: 2, min: 4 },
        { node: "O'Hare (ORD)", miles: 46, min: 52 },
        { node: "Chicago Loop", miles: 42, min: 50 },
      ],
      labor: { pop10mi: 210000, workforce: 96000, avgWage: "$19.80/hr", unemployment: "4.6%" },
      incentives: ["Will County property-tax abatement", "IL Enterprise Zone (materials/utility)", "EDGE credits (jobs)"],
      tco: { rentPerSF: 7.25, opexPerSF: 2.10, powerPerSF: 3.40, laborAnnual: 8600000, tiPerSF: 45, incentivesTotal: 6200000 },
      pros: ["Best logistics access (intermodal + I-80)", "Freezer-convertible shell shortens timeline"],
      cons: ["Longer reach to dense north/west consumers", "IL property-tax load"],
      note: "SAMPLE site — replace with real finalist.",
    },
    {
      id: "i55",
      tier: "primary",
      name: "SAMPLE — Bolingbrook / I-55",
      city: "Bolingbrook, IL",
      submarket: "I-55 Corridor",
      coords: [41.699, -88.069],
      status: "Spec building, cold-capable",
      sizeSF: 262000,
      clearHeight: "36'",
      dockDoors: 40,
      trailerParking: 88,
      power: "4 MW available",
      coldReady: "Dry shell, cold build-out required",
      refrigeration: "Ammonia-permittable",
      rentNNN: 8.95,
      opex: 2.65,
      expansion: "Limited (site-constrained)",
      criteriaScore: 81,
      scores: { power: 78, labor: 90, access: 88, cost: 68, incentives: 72, building: 80, reach: 92 },
      drive: [
        { node: "I-55", miles: 1, min: 3 },
        { node: "O'Hare (ORD)", miles: 26, min: 32 },
        { node: "Chicago Loop", miles: 30, min: 38 },
        { node: "UP Global IV", miles: 16, min: 20 },
      ],
      labor: { pop10mi: 640000, workforce: 330000, avgWage: "$20.90/hr", unemployment: "4.1%" },
      incentives: ["IL Enterprise Zone (partial)", "Local TIF (case-by-case)"],
      tco: { rentPerSF: 8.95, opexPerSF: 2.65, powerPerSF: 3.55, laborAnnual: 9600000, tiPerSF: 78, incentivesTotal: 2800000 },
      pros: ["Deepest labor pool + closest to consumers", "Fastest to O'Hare cold air-freight"],
      cons: ["Highest occupancy cost", "Cold build-out lengthens timeline & TI"],
      note: "SAMPLE site — replace with real finalist.",
    },
    {
      id: "kenosha",
      tier: "primary",
      name: "SAMPLE — Kenosha / I-94",
      city: "Kenosha, WI",
      submarket: "SE Wisconsin / I-94",
      coords: [42.568, -87.898],
      status: "Build-to-suit land",
      sizeSF: 300000,
      clearHeight: "40'",
      dockDoors: 48,
      trailerParking: 140,
      power: "6 MW available",
      coldReady: "Ground-up freezer BTS",
      refrigeration: "Ammonia-permittable",
      rentNNN: 6.80,
      opex: 1.55,
      expansion: "Up to +200,000 SF (land)",
      criteriaScore: 83,
      scores: { power: 94, labor: 76, access: 82, cost: 90, incentives: 92, building: 88, reach: 70 },
      drive: [
        { node: "I-94", miles: 2, min: 4 },
        { node: "O'Hare (ORD)", miles: 48, min: 55 },
        { node: "Milwaukee", miles: 35, min: 40 },
        { node: "Chicago Loop", miles: 52, min: 60 },
      ],
      labor: { pop10mi: 190000, workforce: 92000, avgWage: "$18.40/hr", unemployment: "3.9%" },
      incentives: ["WEDC Enterprise Zone credits", "WI Business Development Tax Credit", "No state personal-property tax", "TIF"],
      tco: { rentPerSF: 6.80, opexPerSF: 1.55, powerPerSF: 3.05, laborAnnual: 8100000, tiPerSF: 0, incentivesTotal: 9500000 },
      pros: ["Lowest all-in cost + strongest incentives", "Chicago + Milwaukee combined reach", "Cheapest power"],
      cons: ["Longest lead time (ground-up)", "Shallower local labor; further from O'Hare"],
      note: "SAMPLE site — replace with real finalist.",
    },
  ],

  /* ---- ALSO-CONSIDERED sites (lighter data; not scored) ---- */
  alsoConsidered: [
    {
      id: "rockford", tier: "alt", name: "SAMPLE — Rockford / I-39", city: "Rockford, IL",
      submarket: "I-39 / I-90", coords: [42.246, -89.06],
      rentNNN: 5.90, sizeSF: 320000,
      whyOut: "Lowest rent but labor depth and consumer reach too thin for regional DC role.",
    },
    {
      id: "gary", tier: "alt", name: "SAMPLE — NW Indiana / I-80-94", city: "Hammond, IN",
      submarket: "Northwest Indiana", coords: [41.593, -87.35],
      rentNNN: 6.40, sizeSF: 240000,
      whyOut: "Good tax profile, but available power fell short of the 4 MW minimum.",
    },
  ],

  /* ---- Logistics reference nodes (fixed geography, not client data) ---- */
  nodes: [
    { id: "ord", name: "O'Hare Int'l (ORD)", type: "airport",   coords: [41.978, -87.904] },
    { id: "mdw", name: "Midway (MDW)",        type: "airport",   coords: [41.786, -87.752] },
    { id: "loop", name: "Chicago Loop",       type: "downtown",  coords: [41.878, -87.629] },
    { id: "bnsf", name: "BNSF Logistics Park", type: "intermodal", coords: [41.383, -88.121] },
    { id: "up",   name: "UP Global IV",        type: "intermodal", coords: [41.515, -88.199] },
    { id: "mke",  name: "Milwaukee",           type: "downtown",  coords: [43.038, -87.906] },
  ],

  /* ---- Key lease terms (target structure) ---- */
  leaseTerms: {
    summary: "SAMPLE — target lease structure across the finalists.",
    terms: [
      { label: "Structure", value: "Triple-net (NNN)" },
      { label: "Term", value: "15 years" },
      { label: "Escalations", value: "3.0% annual" },
      { label: "Free rent", value: "6–9 months (construction/fit-out)" },
      { label: "TI allowance", value: "$25–45 /SF (refrigeration)" },
      { label: "Renewal options", value: "Two 5-year options at FMV" },
      { label: "Expansion right", value: "ROFO on adjacent pad" },
    ],
  },

  /* ---- Deliverable timeline (milestones) ---- */
  timeline: [
    { phase: "Today", label: "Needs alignment + site tour package", date: "Jul 2026", status: "done" },
    { phase: "30 days", label: "LOIs issued to finalists", date: "Aug 2026", status: "active" },
    { phase: "60 days", label: "Incentive negotiations + power studies", date: "Sep 2026", status: "next" },
    { phase: "90 days", label: "Lease execution / BTS commitment", date: "Oct 2026", status: "next" },
    { phase: "12–18 mo", label: "Fit-out + occupancy", date: "2027", status: "next" },
  ],

  /* ---- TCO model assumptions (global) ---- */
  tcoAssumptions: {
    termYears: 5,
    note: "SAMPLE — 5-year total cost of occupancy. Adjust term/SF/headcount to match the client's model.",
  },

  /* ---- Next steps ---- */
  nextSteps: [
    "SAMPLE — Confirm the client's weighting of power vs. labor vs. cost (captured via the survey).",
    "Schedule site tours for the two leading finalists.",
    "Open incentive conversations with Will County and WEDC.",
    "Commission a power-availability study at the freezer-ready shells.",
  ],

  /* ---- Take-home survey questions ---- */
  survey: {
    intro: "Two minutes to sharpen the search. Tell us what matters most for this facility.",
    questions: [
      { id: "role", type: "text", label: "Your name & role", required: true, placeholder: "e.g. VP Supply Chain" },
      { id: "priority", type: "rank", label: "Rank what matters most for this site",
        options: ["Power & utilities", "Labor availability", "Logistics access", "Occupancy cost", "Incentives", "Speed to occupancy"] },
      { id: "temp", type: "choice", label: "Primary temperature profile",
        options: ["Mostly freezer", "Mostly cooler", "Balanced freezer/cooler", "Not sure yet"] },
      { id: "timeline", type: "choice", label: "How urgent is occupancy?",
        options: ["ASAP (<12 mo)", "12–18 months", "18–24 months", "Flexible"] },
      { id: "favorite", type: "site", label: "Which site feels right so far?" }, // options built from sites at runtime
      { id: "notes", type: "textarea", label: "Anything else we should weigh?", placeholder: "Deal-breakers, must-haves, questions…" },
    ],
  },
};
