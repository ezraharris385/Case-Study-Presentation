/* ============================================================
   Global configuration — edit these, not the app code.
   ============================================================ */
window.CASE_CONFIG = {
  // ---- Branding (shown in header) ----
  firmName: "Your Firm",                 // your brokerage / team name
  clientName: "Cold-Chain Client",       // the (fictional) client company
  engagementLine: "Site Selection — Greater Chicago Cold Storage",
  asOfDate: "July 2026",                 // "as of" date shown on data

  // ---- Map defaults ----
  map: {
    center: [41.75, -88.05],  // greater Chicago
    zoom: 9,
    minZoom: 7,
    maxZoom: 14,
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

  // The public URL of the PHONE build (used to render the QR code on the desktop build).
  // Fill in after you enable GitHub Pages, e.g.
  //   https://ezraharris385.github.io/case-study-presentation/mobile/
  phoneUrl: "",
};
