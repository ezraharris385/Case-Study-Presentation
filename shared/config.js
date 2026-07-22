/* ============================================================
   Global configuration — edit these, not the app code.
   ============================================================ */
window.CASE_CONFIG = {
  // ---- Branding (shown in header) ----
  firmName: "CBRE",                      // brokerage / team
  clientName: "FresSpan Foods",          // the (fictional) client company
  engagementLine: "Site Selection — Greater Chicago Cold Storage",
  asOfDate: "July 2026",                 // "as of" date shown on data

  // ---- Map defaults (honed to greater Chicago) ----
  map: {
    center: [41.85, -87.85],  // greater Chicago metro
    zoom: 10,
    minZoom: 7,
    maxZoom: 15,
    // Carto basemaps (no API key). Falls back gracefully if offline.
    tilesLight: "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png",
    tilesDark: "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    // Aerial basemap (no CoStar imagery used). Esri World Imagery — free with attribution.
    tilesSatellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attributionSatellite: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    reachMiles: 10,           // "10-mile reach" ring radius
  },

  // ---- Response collection backend ----
  // See /backend/README.md for 3-minute setup. Two modes supported:
  //   "appscript" : Google Apps Script web app -> Google Sheet (recommended; you own the data, watch it live)
  //   "formspree" : Formspree endpoint (zero-code alternative)
  //   ""          : disabled — survey shows results locally only
  survey: {
    // "formsubmit" = emails each submission via formsubmit.co (no signup; requires a one-time
    //               activation: submit once, then click the confirmation link in the inbox).
    // "formspree"  = Formspree endpoint (paste in `endpoint`).
    mode: "formsubmit",
    email: "esharris3@wisc.edu",   // where survey feedback is emailed
    endpoint: "",                  // only for mode "formspree"
    consentNote: "Your feedback goes to the CBRE deal team. No personal data required.",
  },

  // ---- Auto-load data files from the /data folder on startup ----
  // These load as the shared dataset EVERYONE sees. Paths are relative to each build folder.
  // Empty because the real FresSpan Foods data now lives authoritatively in shared/data.js
  // (richer than flat CSVs). To change what everyone sees, edit shared/data.js (or ask me).
  dataAutoload: [],

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
