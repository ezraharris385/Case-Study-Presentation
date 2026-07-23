/* ===== Cold-Chain Site Cockpit — phone app (data-driven) ===== */
(function () {
  "use strict";
  var CFG = window.CASE_CONFIG, BASE = window.CASE_DATA, LDR = window.CockpitLoader;
  var STORAGE_KEY = "cockpit-data-mobile";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var css = function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); };
  var moneyM = function (n) { return "$" + (n / 1e6).toFixed(1) + "M"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var clean = function (s) { return String(s || "").replace(/^SAMPLE — /, ""); };
  var siteLabel = function (s) { return clean((s && (s.address || s.city || s.name)) || ""); };
  var fmt = function (n) { return typeof n === "number" ? n.toLocaleString() : n; };

  var SHARED = !!CFG.sharedDataOnly;
  var patch = SHARED ? {} : (LDR.loadPatch(STORAGE_KEY) || {});
  var userLoaded = !SHARED && !!(patch && Object.keys(patch).length);
  var autoloaded = false;
  var basePatch = null;
  var D = LDR.apply(BASE, patch);

  $("#clientName").textContent = CFG.clientName;
  function refreshBanner() {
    var b = $("#sampleBanner");
    if (!userLoaded && D.sampleData === false) { b.hidden = true; return; }
    b.hidden = false;
    if (userLoaded) { b.innerHTML = SHARED ? "<strong>Preview — this screen only</strong> (not shared; refresh to reset)." : "<strong>Your data</strong> — loaded on this device."; b.style.background = "var(--good-soft)"; }
    else if (autoloaded) { b.innerHTML = "<strong>Demo data (Chicago)</strong> — tap ＋ to load yours."; b.style.background = "var(--accent-soft)"; }
    else { b.innerHTML = "<strong>Sample data</strong> — tap ＋ to load yours."; b.style.background = "var(--warn-soft)"; }
  }

  /* Theme */
  var saved = null; try { saved = localStorage.getItem("cockpit-theme"); } catch (e) {}
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  function currentDark() { var t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; }
  $("#themeToggle").addEventListener("click", function () { var next = currentDark() ? "light" : "dark"; document.documentElement.setAttribute("data-theme", next); try { localStorage.setItem("cockpit-theme", next); } catch (e) {} swapTiles(); renderMap({ fit: false }); });

  /* Map */
  var map = L.map("map", { center: CFG.map.center, zoom: CFG.map.zoom, minZoom: CFG.map.minZoom, maxZoom: CFG.map.maxZoom, zoomControl: false, preferCanvas: true, tap: false, zoomAnimationThreshold: 4 });
  var vectorRenderer = L.canvas({ padding: 0.5 });
  L.control.zoom({ position: "topright" }).addTo(map);
  var baseMode = "street";
  var tileLayer = null;
  function swapTiles() {
    if (tileLayer) map.removeLayer(tileLayer);
    var url, attr, maxZ = CFG.map.maxZoom;
    if (baseMode === "satellite") { url = CFG.map.tilesSatellite; attr = CFG.map.attributionSatellite; maxZ = 18; }
    else { url = currentDark() ? CFG.map.tilesDark : CFG.map.tilesLight; attr = CFG.map.attribution; }
    tileLayer = L.tileLayer(url, { attribution: attr, maxZoom: maxZ, detectRetina: true, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 3 }).addTo(map);
  }
  swapTiles();
  var groups = { alt: L.layerGroup() };
  function isoStyle(t) { return t <= 15 ? { color: css("--navy"), weight: 2.2, opacity: 0.95, lineJoin: "round", fillColor: css("--navy"), fillOpacity: 0.05 } : { color: css("--navy"), weight: 1.6, opacity: 0.7, dashArray: "5 4", lineJoin: "round", fill: false }; }

  function siteIcon(i) { return L.divIcon({ className: "", iconSize: [30, 38], iconAnchor: [15, 36], html: '<div class="pin pin--site"><span>' + (i + 1) + "</span></div>" }); }
  function altIcon() { return L.divIcon({ className: "", iconSize: [22, 29], iconAnchor: [11, 28], html: '<div class="pin pin--alt"></div>' }); }
  function nodeIcon() { return L.divIcon({ className: "", iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="mk mk--node"></div>' }); }

  /* ---------- Layer state: pick which sites show, then global overlay toggles ---------- */
  var on = { site: {}, alt: false, bench: {}, feat: { ring: true, iso: false, labor: false } };
  var panelOpen = false;
  function initState() {
    (D.nodes || []).forEach(function (n) { if (!(n.id in on.bench)) on.bench[n.id] = true; });
    (D.sites || []).forEach(function (s) { if (!(s.id in on.site)) on.site[s.id] = true; });
  }

  var refSite = {}, refRing = {}, refIso = {}, refLabor = {}, refBench = {};
  function clearRefs() { [refSite, refRing, refIso, refLabor, refBench].forEach(function (o) { Object.keys(o).forEach(function (k) { if (map.hasLayer(o[k])) map.removeLayer(o[k]); }); }); }
  function buildLayers() {
    clearRefs(); refSite = {}; refRing = {}; refIso = {}; refLabor = {}; refBench = {};
    groups.alt.clearLayers();
    (D.sites || []).forEach(function (s, i) {
      if (!s.coords) return;
      refSite[s.id] = L.marker(s.coords, { icon: siteIcon(i) }).on("click", function () { openSite(s); });
      refRing[s.id] = L.circle(s.coords, { radius: CFG.map.reachMiles * 1609.34, renderer: vectorRenderer, color: css("--ring-color"), weight: 1.5, opacity: 0.7, fillColor: css("--ring-color"), fillOpacity: 0.05 });
      refLabor[s.id] = L.circle(s.coords, { radius: 20 * 1609.34, renderer: vectorRenderer, color: css("--labor-color"), weight: 1, dashArray: "4 4", opacity: 0.7, fillColor: css("--labor-color"), fillOpacity: 0.04 });
      var ig = L.layerGroup();
      (s.iso || []).slice().sort(function (a, b) { return b.time - a.time; }).forEach(function (c) { L.geoJSON({ type: "Feature", geometry: c.geometry }, { style: isoStyle(c.time), interactive: false, renderer: vectorRenderer, smoothFactor: 2 }).addTo(ig); });
      refIso[s.id] = ig;
    });
    (D.alsoConsidered || []).forEach(function (s) { if (!s.coords) return; L.marker(s.coords, { icon: altIcon() }).on("click", function () { openAlt(s); }).addTo(groups.alt); });
    (D.nodes || []).forEach(function (n) { refBench[n.id] = L.marker(n.coords, { icon: nodeIcon() }).bindTooltip(esc(clean(n.name)), { direction: "top" }); });
  }
  function setVis(layer, show) { if (!layer) return; if (show) { if (!map.hasLayer(layer)) layer.addTo(map); } else if (map.hasLayer(layer)) map.removeLayer(layer); }
  function syncMap() {
    setVis(groups.alt, on.alt);
    Object.keys(refBench).forEach(function (id) { setVis(refBench[id], on.bench[id]); });
    Object.keys(refSite).forEach(function (id) {
      var live = !!on.site[id];
      setVis(refSite[id], live);
      setVis(refRing[id], live && on.feat.ring);
      setVis(refIso[id], live && on.feat.iso);
      setVis(refLabor[id], live && on.feat.labor);
    });
    var leg = $("#mDriveLegend"); if (leg) leg.hidden = !on.feat.iso;
  }

  var didFit = false;
  function renderMap(opts) {
    opts = opts || {};
    initState(); buildLayers(); syncMap();
    var pts = (D.sites || []).filter(function (s) { return s.coords; }).map(function (s) { return s.coords; })
      .concat((D.alsoConsidered || []).filter(function (s) { return s.coords; }).map(function (s) { return s.coords; }));
    if (opts.fit !== false && pts.length) { try { map.fitBounds(L.latLngBounds(pts).pad(0.2)); didFit = true; } catch (e) {} }
    setTimeout(function () { map.invalidateSize(); }, 60);
    buildPanel();
  }

  /* ---------- Collapsible layers panel: pick sites, flip global overlays ---------- */
  function shortNode(n) { return clean(n.name).replace(/\s*\(.*\)/, "").replace("Int’l", "").trim(); }
  function buildPanel() {
    function row(attr, val, label, sw, onv) { return '<label class="mlay__row"><input type="checkbox" data-' + attr + '="' + val + '"' + (onv ? " checked" : "") + '><i class="mlay__sw mlay__sw--' + sw + '"></i><span>' + label + "</span></label>"; }
    var siteRows = (D.sites || []).map(function (s, i) { return row("site", s.id, (i + 1) + ". " + esc(siteLabel(s)), "site", on.site[s.id]); }).join("");
    var featRows = row("feat", "ring", "10-mile reach", "ring", on.feat.ring) + row("feat", "iso", "Drive-time reach", "iso", on.feat.iso) + row("feat", "labor", "Labor shed", "labor", on.feat.labor);
    var benchRows = (D.nodes || []).map(function (n) { return row("bench", n.id, esc(shortNode(n)), "node", on.bench[n.id]); }).join("");
    var body =
      '<div class="mlay__seg"><button class="mlay__segbtn' + (baseMode === "street" ? " is-on" : "") + '" data-base="street">◱ Map</button><button class="mlay__segbtn' + (baseMode === "satellite" ? " is-on" : "") + '" data-base="satellite">🛰 Satellite</button></div>' +
      '<div class="mlay__group"><div class="mlay__title">Sites on the map</div>' + siteRows + row("grp", "alt", "Also-considered", "alt", on.alt) + "</div>" +
      '<div class="mlay__group"><div class="mlay__title">Overlays <span class="mlay__hint">apply to shown sites</span></div>' + featRows + "</div>" +
      '<div class="mlay__group"><div class="mlay__title">Benchmarks</div>' + benchRows + "</div>";
    $("#mlayers").innerHTML =
      '<button class="mlay__fab' + (panelOpen ? " is-open" : "") + '" id="mlayFab">' + (panelOpen ? "✕ Close" : "☰ Layers") + "</button>" +
      '<div class="mlay__panel"' + (panelOpen ? "" : " hidden") + ">" + body + "</div>";
  }
  $("#mlayers").addEventListener("click", function (e) {
    var fab = e.target.closest("#mlayFab"); if (fab) { panelOpen = !panelOpen; buildPanel(); return; }
    var bb = e.target.closest(".mlay__segbtn"); if (bb) { baseMode = bb.dataset.base; swapTiles(); buildPanel(); return; }
  });
  $("#mlayers").addEventListener("change", function (e) {
    var t = e.target; if (!t.dataset) return;
    if (t.dataset.site) { on.site[t.dataset.site] = t.checked; syncMap(); }
    else if (t.dataset.feat) { on.feat[t.dataset.feat] = t.checked; syncMap(); }
    else if (t.dataset.bench) { on.bench[t.dataset.bench] = t.checked; syncMap(); }
    else if (t.dataset.grp === "alt") { on.alt = t.checked; syncMap(); }
  });

  /* Bottom sheet */
  var sheet = $("#sheet"), sheetBody = $("#sheetBody"), scrim = $("#scrim");
  function openSheet(html) { sheetBody.innerHTML = html; sheet.hidden = false; scrim.hidden = false; sheetBody.scrollTop = 0; }
  function closeSheet() { sheet.hidden = true; scrim.hidden = true; }
  scrim.addEventListener("click", closeSheet); $("#sheetGrab").addEventListener("click", closeSheet); $("#sheetClose").addEventListener("click", closeSheet);

  function renderChecklist(list) { if (!list || !list.length) return ""; return '<ul class="chk">' + list.map(function (c) { return c.status === "met" ? '<li class="chk--met"><span class="chk__ico">✓</span><span class="chk__lbl">' + esc(c.label) + "</span></li>" : '<li class="chk--rfd"><span class="chk__ico chk__ico--rfd">–</span><span class="chk__lbl">' + esc(c.label) + '</span><em class="chk__note">requires further due diligence</em></li>'; }).join("") + "</ul>"; }
  function demoMini(s) { var d = s.demo; if (!d) return ""; return '<div class="d-section"><h4>10-mile demographics</h4><dl class="kv">' + kv("Population", fmt(d.pop10mi)) + kv("Median HH income", d.medHHinc ? "$" + fmt(d.medHHinc) : "—") + kv("Labor force", fmt(d.laborForce)) + kv("Unemployment", d.unemploymentPct != null ? d.unemploymentPct + "%" : "—") + kv("Transp/whse jobs", fmt(d.twEmployment)) + kv("Bachelor’s+", d.bachelorsPlusPct != null ? d.bachelorsPlusPct + "%" : "—") + "</dl></div>"; }
  function kv(k, v) { return "<dt>" + esc(k) + "</dt><dd>" + esc(v == null ? "—" : v) + "</dd>"; }

  function openSite(s) {
    var drive = (s.drive || []).map(function (d) { return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + ' mi</td><td class="num">' + d.min + ' min</td></tr>'; }).join("");
    openSheet('<h2>' + esc(siteLabel(s)) + "</h2><div class=\"d-sub\">" + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + "</div>" +
      (s.rentDisplay ? '<div class="rentchip"><span class="eyebrow">Asking rent</span><strong>' + esc(s.rentDisplay) + "</strong></div>" : "") +
      '<div class="d-section"><h4>Building &amp; site</h4><dl class="kv">' + kv("Status", s.status) + kv("RBA", s.sizeSF ? fmt(s.sizeSF) + " SF" : "—") + kv("Available", s.availSF ? fmt(s.availSF) + " SF" : "—") + kv("Clear height", s.clearHeight) + kv("Dock doors", s.dockDoors) + kv("Drive-in", s.driveIns) + kv("Power", s.power) + kv("Year built", s.yearBuilt) + "</dl></div>" +
      '<div class="d-section"><h4>Site characteristics</h4>' + renderChecklist(s.checklist) + "</div>" +
      ((s.incentives && s.incentives.length) ? '<div class="d-section"><h4>Incentives <span class="form-note">(high level)</span></h4><ul class="list-clean">' + s.incentives.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "") +
      ((s.leaseTerms && s.leaseTerms.length) ? '<div class="d-section"><h4>Lease terms to prioritize</h4><div class="chips">' + s.leaseTerms.map(function (x) { return '<span class="pill">' + esc(x) + "</span>"; }).join(" ") + "</div></div>" : "") +
      (drive ? '<div class="d-section"><h4>Drive to benchmarks</h4><table class="table"><tbody>' + drive + "</tbody></table></div>" : "") +
      demoMini(s));
    if (s.coords) map.flyTo(s.coords, 15, { duration: 0.8 });
  }
  function openAlt(s) { openSheet('<h2>' + esc(siteLabel(s)) + '</h2><div class="d-sub">' + (s.city ? esc(s.city) + " · " : "") + "also-considered</div><dl class=\"kv\">" + kv("RBA", s.sizeSF ? fmt(s.sizeSF) + " SF" : "—") + kv("Available", s.availSF ? fmt(s.availSF) + " SF" : "—") + kv("Clear height", s.clearHeight) + kv("Dock doors", s.dockDoors) + kv("Power", s.power) + "</dl><p class=\"form-note\" style=\"margin-top:10px\">Screened; not shortlisted to the final three.</p>"); if (s.coords) map.setView(s.coords, 11, { animate: true }); }

  /* Tabs */
  function activate(tab) {
    closeSheet();
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) { b.classList.toggle("is-active", b.dataset.tab === tab); });
    Array.prototype.forEach.call(document.querySelectorAll(".tabview"), function (v) { v.classList.toggle("is-active", v.id === "tab-" + tab); });
    if (tab === "map") setTimeout(function () { map.invalidateSize(); }, 60);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) { b.addEventListener("click", function () { activate(b.dataset.tab); }); });

  /* Sites list */
  function renderSitesList() {
    $("#sitesList").innerHTML = '<div class="sec-title">Finalist sites</div>' + (D.sites || []).map(function (s, i) {
      return '<button class="mcard" data-site="' + i + '"><div class="mcard__top"><span class="mcard__name">' + (i + 1) + ". " + esc(siteLabel(s)) + '</span></div><div class="mcard__sub">' + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + '</div><div class="mcard__row">' + (s.rentDisplay ? '<span class="pill pill--accent">' + esc(s.rentDisplay) + "</span>" : "") + (s.availSF ? '<span class="pill">' + (s.availSF / 1000).toFixed(0) + "k SF avail</span>" : "") + "</div></button>";
    }).join("") + ((D.alsoConsidered && D.alsoConsidered.length) ? ('<div class="sec-title" style="margin-top:18px">Also considered</div>' + D.alsoConsidered.map(function (s, i) { return '<button class="mcard" data-alt="' + i + '"><div class="mcard__top"><span class="mcard__name">' + esc(siteLabel(s)) + '</span><span class="pill pill--alt">not selected</span></div><div class="mcard__sub">' + esc(s.city) + "</div></button>"; }).join("")) : "");
  }
  $("#sitesList").addEventListener("click", function (e) { var s = e.target.closest("[data-site]"), a = e.target.closest("[data-alt]"); if (s) openSite(D.sites[+s.dataset.site]); else if (a) openAlt(D.alsoConsidered[+a.dataset.alt]); });

  /* Info accordion */
  function infoSections() {
    var sites = D.sites || [];
    var legend = function () { return '<p class="form-note">' + sites.map(function (s, i) { return (i + 1) + " = " + esc(siteLabel(s)); }).join(" · ") + "</p>"; };
    return [
      { t: "Client needs", h: function () { var r = (D.needs.requirements || []).map(function (x) { return "<tr><td>" + esc(x.label) + "</td><td>" + esc(x.value) + "</td></tr>"; }).join(""); return '<table class="table"><tbody>' + r + "</tbody></table>"; } },
      { t: "Incentives", h: function () { return sites.map(function (s, i) { return '<h5 style="font-family:var(--font-display);margin:10px 0 4px">' + (i + 1) + ". " + esc(siteLabel(s)) + '</h5><ul class="list-clean">' + (s.incentives || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; }).join("") + '<p class="form-note">Cook County (Class 6b territory) — subject to application.</p>'; } },
      { t: "Lease terms to prioritize", h: function () { return sites.map(function (s, i) { return '<h5 style="font-family:var(--font-display);margin:10px 0 4px">' + (i + 1) + ". " + esc(siteLabel(s)) + ' <span class="form-note">· ' + esc(s.rentDisplay || "") + '</span></h5><div class="chips">' + (s.leaseTerms || []).map(function (x) { return '<span class="pill">' + esc(x) + "</span>"; }).join(" ") + "</div>"; }).join(""); } },
      { t: "Demographics (10-mi)", h: function () {
        if (!sites.length || !sites[0].demo) return '<p class="form-note">No demographics.</p>';
        var metrics = [["Population", "pop10mi", fmt], ["Median HH inc", "medHHinc", function (v) { return "$" + fmt(v); }], ["Labor force", "laborForce", fmt], ["Unemployment", "unemploymentPct", function (v) { return v + "%"; }], ["Transp/whse jobs", "twEmployment", fmt], ["Bachelor’s+", "bachelorsPlusPct", function (v) { return v + "%"; }]];
        var heads = sites.map(function (s, i) { return '<th class="num">' + (i + 1) + "</th>"; }).join("");
        var rows = metrics.map(function (m) { var cells = sites.map(function (s) { return '<td class="num">' + (s.demo[m[1]] != null ? m[2](s.demo[m[1]]) : "—") + "</td>"; }).join(""); return "<tr><td>" + m[0] + "</td>" + cells + "</tr>"; }).join("");
        return '<table class="table"><thead><tr><th>Metric</th>' + heads + "</tr></thead><tbody>" + rows + "</tbody></table>" + legend();
      } },
      { t: "Drive to benchmarks", h: function () { return sites.map(function (s, i) { var rows = (s.drive || []).map(function (d) { return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + ' mi</td><td class="num">' + d.min + ' min</td></tr>'; }).join(""); return '<h5 style="font-family:var(--font-display);margin:10px 0 4px">' + (i + 1) + ". " + esc(siteLabel(s)) + "</h5>" + (rows ? '<table class="table"><tbody>' + rows + "</tbody></table>" : ""); }).join(""); } },
      { t: "Labor forces", h: function () { var rows = sites.map(function (s, i) { var l = s.labor || {}; return "<tr><td>" + (i + 1) + ". " + esc(siteLabel(s)) + '</td><td class="num">' + (l.workforce ? fmt(l.workforce) : "—") + '</td><td class="num">' + (l.twEmployment ? fmt(l.twEmployment) : "—") + '</td><td class="num">' + esc(l.unemployment || "—") + "</td></tr>"; }).join(""); return '<table class="table"><thead><tr><th>Site</th><th class="num">Labor force</th><th class="num">T&amp;W jobs</th><th class="num">Unemp</th></tr></thead><tbody>' + rows + "</tbody></table>"; } },
    ];
  }
  function renderInfo() {
    $("#infoMount").innerHTML = '<div class="sec-title">The case</div>' + infoSections().map(function (s, i) { return '<div class="acc" data-acc="' + i + '"><button class="acc__head">' + esc(s.t) + '<span class="caret">›</span></button><div class="acc__body">' + s.h() + "</div></div>"; }).join("") + '<p class="form-note" style="margin-top:16px;line-height:1.5">Market data via CoStar. Aerials via Esri. Educational CBRE internship case study — illustrative only, not for redistribution.</p>';
  }
  $("#infoMount").addEventListener("click", function (e) { var head = e.target.closest(".acc__head"); if (head) head.parentElement.classList.toggle("is-open"); });

  /* Survey */
  var rankState = null;
  function mountSurvey() {
    var q = D.survey;
    var fields = q.questions.map(function (item) {
      if (item.type === "text") return field(item, '<input type="text" data-q="' + item.id + '" placeholder="' + esc(item.placeholder || "") + '">');
      if (item.type === "textarea") return field(item, '<textarea data-q="' + item.id + '" placeholder="' + esc(item.placeholder || "") + '"></textarea>');
      if (item.type === "choice") return field(item, choiceRow(item.id, item.options));
      if (item.type === "site") return field(item, choiceRow(item.id, (D.sites || []).map(function (s) { return siteLabel(s); })));
      if (item.type === "rank") { rankState = item.options.slice(); return field(item, '<ul class="rank-list" data-q="' + item.id + '" id="rankList"></ul>'); }
      return "";
    }).join("");
    $("#surveyMount").innerHTML = '<div class="sec-title">' + esc(q.intro) + '</div><form id="surveyForm">' + fields + '<button type="submit" class="btn">Submit priorities</button><p class="form-note">' + esc(CFG.survey.consentNote) + '</p><div id="surveyToast"></div></form>';
    if (rankState) renderRank();
  }
  function field(item, inner) { return '<div class="field"><label>' + esc(item.label) + (item.required ? ' <span style="color:var(--crit)">*</span>' : "") + "</label>" + inner + "</div>"; }
  function choiceRow(id, opts) { return '<div class="choice-row" data-q="' + id + '">' + opts.map(function (o) { return '<button type="button" class="choice" data-val="' + esc(o) + '">' + esc(o) + "</button>"; }).join("") + "</div>"; }
  function renderRank() { var ul = $("#rankList"); if (!ul) return; ul.innerHTML = rankState.map(function (o, i) { return '<li data-i="' + i + '"><span class="rank-n num">' + (i + 1) + '</span><span>' + esc(o) + '</span><span class="rank-move"><button type="button" data-dir="-1" aria-label="Up">▲</button><button type="button" data-dir="1" aria-label="Down">▼</button></span></li>'; }).join(""); }
  document.addEventListener("click", function (e) {
    var choice = e.target.closest(".choice");
    if (choice && choice.parentElement.classList.contains("choice-row")) { var row = choice.parentElement; Array.prototype.forEach.call(row.children, function (c) { c.classList.remove("is-sel"); }); choice.classList.add("is-sel"); return; }
    var mv = e.target.closest(".rank-move button");
    if (mv && rankState) { var li = mv.closest("li"), i = +li.dataset.i, j = i + (+mv.dataset.dir); if (j >= 0 && j < rankState.length) { var t = rankState[i]; rankState[i] = rankState[j]; rankState[j] = t; renderRank(); } }
  });
  document.addEventListener("submit", function (e) { if (e.target.id !== "surveyForm") return; e.preventDefault(); submitSurvey(e.target); });
  function surveyUrl() {
    var s = CFG.survey || {};
    if (s.mode === "formsubmit" && (s.formToken || s.email)) return "https://formsubmit.co/ajax/" + encodeURIComponent(s.formToken || s.email);
    if (s.mode === "formspree" && s.endpoint) return s.endpoint;
    return "";
  }
  function submitSurvey(form) {
    var payload = { _from: "mobile", client: CFG.clientName, _subject: "Cold-chain site survey — " + CFG.clientName };
    Array.prototype.forEach.call(form.querySelectorAll("[data-q]"), function (el) { var id = el.getAttribute("data-q"); if (el.classList.contains("choice-row")) { var sel = el.querySelector(".is-sel"); payload[id] = sel ? sel.dataset.val : ""; } else if (el.classList.contains("rank-list")) { payload[id] = rankState ? rankState.join(" > ") : ""; } else payload[id] = el.value; });
    var toast = $("#surveyToast"), btn = form.querySelector(".btn"), url = surveyUrl();
    if (!url) { toast.className = "toast toast--ok"; toast.innerHTML = "Thank you — your feedback has been noted."; btn.disabled = true; return; }
    toast.className = "toast"; toast.textContent = "Sending…"; btn.disabled = true;
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) throw 0; toast.className = "toast toast--ok"; toast.innerHTML = "Thank you — your feedback has been sent to the CBRE team."; })
      .catch(function () { toast.className = "toast toast--err"; toast.textContent = "Sorry, that didn’t go through — please try once more."; btn.disabled = false; });
  }

  /* Uploader */
  var modal = $("#loaderModal"), fileItems = [];
  function openLoader() { modal.hidden = false; }
  function closeLoader() { modal.hidden = true; }
  $("#openLoader").addEventListener("click", openLoader);
  $("#loaderClose").addEventListener("click", closeLoader);
  $("#loaderScrim").addEventListener("click", closeLoader);
  $("#dropzone").addEventListener("click", function () { $("#fileInput").click(); });
  $("#fileInput").addEventListener("change", function (e) { addFiles(e.target.files); });
  function addFiles(list) { Array.prototype.forEach.call(list, function (file) { LDR.inspect(file).then(function (item) { fileItems.push(item); renderFileList(); }).catch(function (err) { fileItems.push({ name: file.name, error: err.message || "parse error" }); renderFileList(); }); }); }
  function renderFileList() {
    $("#filelist").innerHTML = fileItems.map(function (it, i) {
      if (it.error) return '<div class="fileitem fileitem--err"><span>⚠ ' + esc(it.name) + '</span><button class="fileitem__x" data-rm="' + i + '">✕</button></div>';
      var sel = ["sites", "demographics", "requirements"].map(function (t) { return '<option value="' + t + '"' + (t === it.type ? " selected" : "") + ">" + t + "</option>"; }).join("");
      return '<div class="fileitem"><span class="fileitem__name">' + esc(it.name) + '</span><span class="pill">' + it.count + '</span><select data-type="' + i + '">' + sel + '</select><button class="fileitem__x" data-rm="' + i + '">✕</button></div>';
    }).join("");
    $("#applyBtn").disabled = !fileItems.some(function (it) { return !it.error; });
  }
  $("#filelist").addEventListener("click", function (e) { var rm = e.target.closest("[data-rm]"); if (rm) { fileItems.splice(+rm.dataset.rm, 1); renderFileList(); } });
  $("#filelist").addEventListener("change", function (e) { var sel = e.target.closest("[data-type]"); if (sel) fileItems[+sel.dataset.type].type = sel.value; });
  $("#applyBtn").addEventListener("click", function () {
    var good = fileItems.filter(function (it) { return !it.error; });
    var newPatch = LDR.buildPatch(good);
    patch = LDR.mergePatches(patch && Object.keys(patch).length ? patch : (autoloaded ? basePatch : {}), newPatch);
    if (!SHARED) LDR.savePatch(STORAGE_KEY, patch); userLoaded = true; D = LDR.apply(BASE, patch);
    fileItems = []; renderFileList();
    $("#loaderMsg").className = "loader-msg loader-msg--ok"; $("#loaderMsg").textContent = "Loaded: " + LDR.summarize(patch);
    didFit = false; renderAll({ fit: true });
    setTimeout(closeLoader, 800);
  });
  $("#resetBtn").addEventListener("click", function () {
    LDR.clearPatch(STORAGE_KEY); patch = {}; userLoaded = false;
    D = basePatch ? LDR.apply(BASE, basePatch) : LDR.apply(BASE, {});
    $("#loaderMsg").textContent = ""; didFit = false; renderAll({ fit: true });
  });

  /* Auto-load */
  function autoLoad() {
    var urls = CFG.dataAutoload || []; if (!urls.length) return;
    Promise.all(urls.map(function (u) { return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.blob().then(function (b) { return LDR.inspect(new File([b], u.split("/").pop())); }); }).catch(function () { return null; }); }))
      .then(function (items) { var good = items.filter(Boolean); if (!good.length) return; basePatch = LDR.buildPatch(good); if (!patch || !Object.keys(patch).length) { autoloaded = true; D = LDR.apply(BASE, basePatch); didFit = false; renderAll({ fit: true }); } });
  }

  /* Render everything */
  function renderAll(opts) { renderMap(opts); renderSitesList(); renderInfo(); mountSurvey(); refreshBanner(); }

  window.__cockpit = { get data() { return D; }, get loaded() { return userLoaded; }, get autoloaded() { return autoloaded; } };
  renderAll({ fit: true });
  if (!patch || !Object.keys(patch).length) autoLoad();
})();
