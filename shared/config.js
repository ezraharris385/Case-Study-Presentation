/* ============================================================
   Global configuration — edit these, not the app code.
   ============================================================ */
window.CASE_CONFIG = {
  // ---- Branding (shown in header) ----
  firmName: "Your Firm",                 // your brokerage / team name
  clientName: "Cold-Chain Client",       // the (fictional) client company
  engagementLine: "Site Selection — Greater Chicago Cold Storage",
  asOfDate: "July 2026",                 // "as of" date shown on data

  // ---- Map defaults (honed to greater Chicago) ----
  map: {
    center: [41.85, -87.85],  // greater Chicago metro
    zoom: 10,
    minZoom: 7,
    maxZoom: 15,
    // Carto basemaps (no API key). Falls back gracefully if offline.
    tilesLight: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    tilesDark: "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    reachMiles: 10,           // "10-mile reach" ring radius
  },

  // ---- Response collection backend ----
  // See /backend/README.md for 3-minute setup. Two modes supported:
  //   "appscript" : Google Apps Script web app -> Google Sheet (recommended; you own the data, watch it live)
  //   "formspree" : Formspree endpoint (zero-code alternative)
  //   ""          : disabled — survey shows results locally only
  survey: {
    mode: "",                // set to "appscript" or "formspree" once configured
    endpoint: "",            // paste your deployed web-app URL / Formspree URL here
    consentNote: "Your responses are shared with the deal team to tailor the search. No personal data required.",
  },

  // ---- Auto-load data files from the /data folder on startup ----
  // These load as the shared dataset EVERYONE sees. Paths are relative to each build folder.
  dataAutoload: ["../data/sites.csv", "../data/demographics.csv", "../data/requirements.csv"],

  // ---- Shared-data mode ----
  // true  = the committed /data is the single source of truth. Every visitor sees exactly
  //         the same thing, every time. In-app uploads are a THIS-SCREEN-ONLY preview that
  //         never persists and never affects anyone else. (Recommended for a live demo.)
  // false = in-app uploads save to that person's browser and override /data for them.
  // To change what everyone sees, replace the files in /data and commit them.
  sharedDataOnly: true,

  // The public URL of the PHONE build (used to render the QR code on the desktop build).
  // Fill in after you enable GitHub Pages, e.g.
  //   https://ezraharris385.github.io/case-study-presentation/mobile/
  phoneUrl: "",
};
