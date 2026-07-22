/* ===== Cold-Chain Site Cockpit — desktop app (data-driven) ===== */
(function () {
  "use strict";
  var CFG = window.CASE_CONFIG, BASE = window.CASE_DATA, LDR = window.CockpitLoader;
  var STORAGE_KEY = "cockpit-data-desktop";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var css = function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); };
  var moneyM = function (n) { return "$" + (n / 1e6).toFixed(1) + "M"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var clean = function (s) { return String(s || "").replace(/^SAMPLE — /, ""); };
  var siteLabel = function (s) { return clean((s && (s.address || s.city || s.name)) || ""); };
  var fmt = function (n) { return typeof n === "number" ? n.toLocaleString() : n; };

  // ---- data state ----
  var SHARED = !!CFG.sharedDataOnly;              // shared-data mode: everyone sees /data, no per-device state
  var patch = SHARED ? {} : (LDR.loadPatch(STORAGE_KEY) || {});
  var userLoaded = !SHARED && !!(patch && Object.keys(patch).length);
  var autoloaded = false;
  var D = LDR.apply(BASE, patch);
  var currentView = "map";

  /* ---------- Branding + chrome ---------- */
  $("#engLine").textContent = CFG.engagementLine;
  $("#clientName").textContent = CFG.clientName;
  $("#asOf").textContent = "As of " + CFG.asOfDate;
  document.title = "CBRE · " + CFG.clientName + " — Site Cockpit";
  function refreshBanner() {
    var b = $("#sampleBanner");
    if (!userLoaded && D.sampleData === false) { b.hidden = true; return; }
    b.hidden = false;
    if (userLoaded) { b.innerHTML = SHARED ? '<strong>Preview — this screen only.</strong> Not shared or saved; refresh to return to the shared data.' : '<strong>Your data.</strong> Loaded on this device — reset any time from “Load data”.'; b.style.background = "var(--good-soft)"; }
    else if (autoloaded) { b.innerHTML = '<strong>Demo data (greater Chicago).</strong> Loaded from <code>/data</code> — click “Load data” to drop in your own.'; b.style.background = "var(--accent-soft)"; }
    else { b.innerHTML = '<strong>Sample data.</strong> Placeholder figures — click “Load data” to add yours.'; b.style.background = "var(--warn-soft)"; }
  }

  /* ---------- Theme ---------- */
  var themeToggle = $("#themeToggle");
  var saved = null; try { saved = localStorage.getItem("cockpit-theme"); } catch (e) {}
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  function currentDark() { var t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; }
  themeToggle.addEventListener("click", function () {
    var next = currentDark() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("cockpit-theme", next); } catch (e) {}
    swapTiles(); renderMap({ fit: false });
  });

  /* ---------- Map skeleton ---------- */
  var map = L.map("map", { center: CFG.map.center, zoom: CFG.map.zoom, minZoom: CFG.map.minZoom, maxZoom: CFG.map.maxZoom, preferCanvas: true, zoomAnimationThreshold: 4 });
  var vectorRenderer = L.canvas({ padding: 0.5 });
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

  var groups = { sites: L.layerGroup(), alt: L.layerGroup() };
  function isoStyle(t) { return t <= 15 ? { color: css("--navy"), weight: 2.2, opacity: 0.95, lineJoin: "round", fillColor: css("--navy"), fillOpacity: 0.05 } : { color: css("--navy"), weight: 1.6, opacity: 0.7, dashArray: "5 4", lineJoin: "round", fill: false }; }
  function siteIcon(i) { return L.divIcon({ className: "", iconSize: [28, 36], iconAnchor: [14, 34], html: '<div class="pin pin--site"><span>' + (i + 1) + "</span></div>" }); }
  function altIcon() { return L.divIcon({ className: "", iconSize: [20, 27], iconAnchor: [10, 26], html: '<div class="pin pin--alt"></div>' }); }
  function nodeIcon() { return L.divIcon({ className: "", iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="mk mk--node"></div>' }); }

  /* ---------- Layer state: pick which sites show, then global overlay toggles ---------- */
  var on = { site: {}, alt: false, bench: {}, feat: { ring: true, iso: false, labor: false } };
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
      refSite[s.id] = L.marker(s.coords, { icon: siteIcon(i), title: siteLabel(s) }).on("click", function () { openSite(s, i); }).bindTooltip(siteLabel(s), { direction: "top", offset: [0, -24] });
      refRing[s.id] = L.circle(s.coords, { radius: CFG.map.reachMiles * 1609.34, renderer: vectorRenderer, color: css("--ring-color"), weight: 1.5, opacity: 0.7, fillColor: css("--ring-color"), fillOpacity: 0.05 });
      refLabor[s.id] = L.circle(s.coords, { radius: 20 * 1609.34, renderer: vectorRenderer, color: css("--labor-color"), weight: 1, dashArray: "4 4", opacity: 0.7, fillColor: css("--labor-color"), fillOpacity: 0.04 });
      var ig = L.layerGroup();
      (s.iso || []).slice().sort(function (a, b) { return b.time - a.time; }).forEach(function (c) { L.geoJSON({ type: "Feature", geometry: c.geometry }, { style: isoStyle(c.time), interactive: false, renderer: vectorRenderer, smoothFactor: 2 }).addTo(ig); });
      refIso[s.id] = ig;
    });
    (D.alsoConsidered || []).forEach(function (s) { if (!s.coords) return; L.marker(s.coords, { icon: altIcon(), title: siteLabel(s) }).on("click", function () { openAlt(s); }).bindTooltip(siteLabel(s), { direction: "top" }).addTo(groups.alt); });
    (D.nodes || []).forEach(function (n) { refBench[n.id] = L.marker(n.coords, { icon: nodeIcon() }).bindTooltip('<span class="node-tip">' + esc(n.name) + "</span>", { direction: "top", offset: [0, -6] }); });
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
    updateDriveLegend();
  }
  function updateDriveLegend() {
    var leg = document.getElementById("legend"); if (!leg) return;
    var ex = leg.querySelector(".legend__drive");
    if (on.feat.iso) {
      if (!ex) { var d = document.createElement("span"); d.className = "legend__drive"; d.innerHTML = '<span><i class="leg-line"></i>15-min drive</span><span><i class="leg-line leg-line--dash"></i>30-min drive</span>'; leg.appendChild(d); }
    } else if (ex) { ex.remove(); }
  }

  var didFitOnce = false;
  function renderMap(opts) {
    opts = opts || {};
    initState(); buildLayers(); syncMap();
    var pts = (D.sites || []).filter(function (s) { return s.coords; }).map(function (s) { return s.coords; })
      .concat((D.alsoConsidered || []).filter(function (s) { return s.coords; }).map(function (s) { return s.coords; }));
    if ((opts.fit !== false) && pts.length) { try { map.fitBounds(L.latLngBounds(pts).pad(0.25)); didFitOnce = true; } catch (e) {} }
    else if (!didFitOnce && !pts.length) { map.setView(CFG.map.center, CFG.map.zoom); }
    buildLayersPanel();
  }

  /* ---------- Layers panel: pick sites, then flip global overlays ---------- */
  function buildLayersPanel() {
    function row(attr, val, label, sw, onv) { return '<label class="layers__row"><input type="checkbox" data-' + attr + '="' + val + '"' + (onv ? " checked" : "") + '> <i class="layers__sw layers__sw--' + sw + '"></i><span>' + label + "</span></label>"; }
    var siteRows = (D.sites || []).map(function (s, i) { return row("site", s.id, (i + 1) + ". " + esc(siteLabel(s)), "site", on.site[s.id]); }).join("");
    var featRows = row("feat", "ring", "10-mile reach", "ring", on.feat.ring) + row("feat", "iso", "Drive-time reach", "iso", on.feat.iso) + row("feat", "labor", "Labor shed", "labor", on.feat.labor);
    var benchRows = (D.nodes || []).map(function (n) { return row("bench", n.id, esc(clean(n.name)), "node", on.bench[n.id]); }).join("");
    $("#layers").innerHTML =
      '<div class="layers__seg"><button class="layers__segbtn' + (baseMode === "street" ? " is-on" : "") + '" data-base="street">◱ Map</button><button class="layers__segbtn' + (baseMode === "satellite" ? " is-on" : "") + '" data-base="satellite">🛰 Satellite</button></div>' +
      '<div class="layers__group"><div class="layers__title eyebrow">Sites on the map</div>' + siteRows + row("grp", "alt", "Also-considered", "alt", on.alt) + "</div>" +
      '<div class="layers__group"><div class="layers__title eyebrow">Overlays <span class="layers__hint">apply to shown sites</span></div>' + featRows + "</div>" +
      '<div class="layers__group"><div class="layers__title eyebrow">Benchmarks</div>' + benchRows + "</div>";
  }
  document.addEventListener("click", function (e) {
    var bb = e.target.closest(".layers__segbtn"); if (bb) { baseMode = bb.dataset.base; swapTiles(); buildLayersPanel(); return; }
  });
  document.addEventListener("change", function (e) {
    var t = e.target; if (!t.dataset) return;
    if (t.dataset.site) { on.site[t.dataset.site] = t.checked; syncMap(); }
    else if (t.dataset.feat) { on.feat[t.dataset.feat] = t.checked; syncMap(); }
    else if (t.dataset.bench) { on.bench[t.dataset.bench] = t.checked; syncMap(); }
    else if (t.dataset.grp === "alt") { on.alt = t.checked; syncMap(); }
  });

  /* ---------- Drawer ---------- */
  var drawer = $("#drawer"), drawerBody = $("#drawerBody");
  function openDrawer(html) { drawerBody.innerHTML = html; drawer.hidden = false; drawerBody.scrollTop = 0; }
  function closeDrawer() { drawer.hidden = true; currentView = "map"; setActiveNav("map"); }
  $("#drawerClose").addEventListener("click", closeDrawer);

  function renderChecklist(list) {
    if (!list || !list.length) return "";
    return '<ul class="chk">' + list.map(function (c) {
      return c.status === "met"
        ? '<li class="chk--met"><span class="chk__ico">✓</span><span class="chk__lbl">' + esc(c.label) + "</span></li>"
        : '<li class="chk--rfd"><span class="chk__ico chk__ico--rfd">–</span><span class="chk__lbl">' + esc(c.label) + '</span><em class="chk__note">requires further due diligence</em></li>';
    }).join("") + "</ul>";
  }
  function demoMini(s) {
    var d = s.demo; if (!d) return "";
    return '<div class="d-section"><h4>10-mile demographics</h4><dl class="kv">' +
      kv("Population", fmt(d.pop10mi)) + kv("Median HH income", d.medHHinc ? "$" + fmt(d.medHHinc) : "—") +
      kv("Labor force", fmt(d.laborForce)) + kv("Unemployment", d.unemploymentPct != null ? d.unemploymentPct + "%" : "—") +
      kv("Transp/warehouse jobs", fmt(d.twEmployment)) + kv("Median age", d.medAge) +
      kv("Bachelor’s+", d.bachelorsPlusPct != null ? d.bachelorsPlusPct + "%" : "—") + kv("Daytime population", fmt(d.daytimePop)) + "</dl></div>";
  }
  function kv(k, v) { return "<dt>" + esc(k) + "</dt><dd>" + esc(v == null ? "—" : v) + "</dd>"; }

  function openSite(s, i) {
    currentView = "sites"; setActiveNav("sites");
    var drive = (s.drive || []).map(function (d) { return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + " mi</td><td class=\"num\">" + d.min + " min</td></tr>"; }).join("");
    openDrawer(
      '<div class="d-eyebrow eyebrow">Finalist site</div><h2 class="d-title">' + esc(siteLabel(s)) + "</h2>" +
      '<div class="d-sub">' + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + "</div>" +
      (s.rentDisplay ? '<div class="rentchip"><span class="eyebrow">Asking rent</span><strong>' + esc(s.rentDisplay) + "</strong></div>" : "") +
      '<div class="d-section"><h4>Building &amp; site</h4><dl class="kv">' +
        kv("Status", s.status) + kv("RBA", s.sizeSF ? fmt(s.sizeSF) + " SF" : "—") + kv("Available", s.availSF ? fmt(s.availSF) + " SF" : "—") +
        kv("Smallest unit", s.smallestSF ? fmt(s.smallestSF) + " SF" : "—") + kv("Clear height", s.clearHeight) +
        kv("Dock doors", s.dockDoors) + kv("Drive-in", s.driveIns) + kv("Power", s.power) + kv("Sprinklers", s.sprinklers) +
        kv("Year built", s.yearBuilt) + kv("Owner", s.owner) + "</dl></div>" +
      '<div class="d-section"><h4>Site characteristics</h4>' + renderChecklist(s.checklist) + "</div>" +
      ((s.incentives && s.incentives.length) ? '<div class="d-section"><h4>Incentives <span class="form-note">(high level)</span></h4><ul class="list-clean">' + s.incentives.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "") +
      ((s.leaseTerms && s.leaseTerms.length) ? '<div class="d-section"><h4>Lease terms to prioritize</h4><div class="chips">' + s.leaseTerms.map(function (x) { return '<span class="pill">' + esc(x) + "</span>"; }).join(" ") + "</div></div>" : "") +
      (drive ? '<div class="d-section"><h4>Drive to benchmarks</h4><table class="table"><thead><tr><th>Benchmark</th><th class="num">Dist</th><th class="num">Drive</th></tr></thead><tbody>' + drive + "</tbody></table></div>" : "") +
      demoMini(s)
    );
    if (s.coords) map.flyTo(s.coords, 15, { duration: 0.8 });
  }
  function openAlt(s) {
    openDrawer('<div class="d-eyebrow eyebrow">Also considered</div><h2 class="d-title">' + esc(siteLabel(s)) + "</h2>" +
      '<div class="d-sub">' + (s.city ? esc(s.city) : "") + (s.submarket ? " · " + esc(s.submarket) : "") + "</div>" +
      '<dl class="kv">' + kv("RBA", s.sizeSF ? fmt(s.sizeSF) + " SF" : "—") + kv("Available", s.availSF ? fmt(s.availSF) + " SF" : "—") +
      kv("Clear height", s.clearHeight) + kv("Dock doors", s.dockDoors) + kv("Power", s.power) + kv("Owner", s.owner) + "</dl>" +
      '<p class="form-note" style="margin-top:12px">Screened in the search; not shortlisted to the final three.</p>');
    if (s.coords) map.setView(s.coords, 11, { animate: true });
  }

  /* ---------- Section views ---------- */
  function head(title, sub) { return '<div class="d-eyebrow eyebrow">Component</div><h2 class="d-title">' + esc(title) + "</h2><div class=\"d-sub\">" + esc(sub) + "</div>"; }
  var views = {
    needs: function () {
      var reqs = (D.needs.requirements || []).map(function (r) { return "<tr><td>" + esc(r.label) + "</td><td>" + esc(r.value) + "</td></tr>"; }).join("");
      var db = (D.needs.dealBreakers || []).map(function (x) { return '<span class="pill pill--warn">' + esc(x) + "</span>"; }).join(" ");
      return head("Client needs", D.needs.summary && !/^SAMPLE/.test(D.needs.summary) ? D.needs.summary : "From the initial conversation") +
        '<table class="table"><tbody>' + reqs + "</tbody></table>" + (db ? '<div class="d-section"><h4>Non-negotiables</h4><div class="chips">' + db + "</div></div>" : "");
    },
    sites: function () {
      var cards = (D.sites || []).map(function (s, i) {
        return '<button class="stat" style="text-align:left;cursor:pointer;width:100%;margin-bottom:8px" data-site="' + i + '"><div style="display:flex;justify-content:space-between;align-items:baseline"><strong>' + (i + 1) + ". " + esc(siteLabel(s)) +
          '</strong>' + (s.rentDisplay ? '<span class="pill pill--accent">' + esc(s.rentDisplay) + "</span>" : "") + "</div>" +
          '<div class="stat__lbl">' + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + (s.availSF ? " · " + fmt(s.availSF) + " SF avail" : "") + "</div></button>";
      }).join("");
      return head("Site detail", "Tap a site to open its full profile (or a pin on the map)") + (cards || '<p class="panel-lead">No sites loaded yet.</p>');
    },
    drive: function () {
      var blocks = (D.sites || []).map(function (s, i) {
        var rows = (s.drive || []).map(function (d) { return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + ' mi</td><td class="num">' + d.min + ' min</td></tr>'; }).join("");
        return '<div class="d-section"><h4>' + (i + 1) + ". " + esc(siteLabel(s)) + '</h4>' + (rows ? '<table class="table"><thead><tr><th>Benchmark</th><th class="num">Dist</th><th class="num">Drive</th></tr></thead><tbody>' + rows + "</tbody></table>" : "") + "</div>";
      }).join("");
      return head("Drive to benchmarks", "Drive time to O’Hare, downtown &amp; regional benchmarks") + blocks;
    },
    labor: function () {
      var rows = (D.sites || []).map(function (s, i) { var l = s.labor || {}; return "<tr><td>" + (i + 1) + ". " + esc(siteLabel(s)) + "</td><td class=\"num\">" + (l.pop10mi ? fmt(l.pop10mi) : "—") + "</td><td class=\"num\">" + (l.workforce ? fmt(l.workforce) : "—") + "</td><td class=\"num\">" + (l.twEmployment ? fmt(l.twEmployment) : "—") + "</td><td class=\"num\">" + esc(l.unemployment || "—") + "</td></tr>"; }).join("");
      return head("Labor forces", "Workforce within 10 miles of each finalist") +
        '<table class="table"><thead><tr><th>Site</th><th class="num">Pop 10mi</th><th class="num">Labor force</th><th class="num">Transp/whse jobs</th><th class="num">Unemp.</th></tr></thead><tbody>' + rows + "</tbody></table>" +
        '<p class="form-note">Transport &amp; warehousing employment is the cold-chain-relevant labor pool. Toggle “Labor shed” on the map for the ~20-mile draw.</p>';
    },
    incentives: function () {
      var blocks = (D.sites || []).map(function (s, i) {
        var items = (s.incentives || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
        return '<div class="d-section"><h4>' + (i + 1) + ". " + esc(siteLabel(s)) + '</h4><ul class="list-clean">' + items + "</ul></div>";
      }).join("");
      return head("Incentives", "High-level programs the sites may qualify for — subject to application") + blocks +
        '<p class="form-note">All three sit in Cook County (Class 6b territory). Eligibility &amp; value to be confirmed with the county and municipalities.</p>';
    },
    lease: function () {
      var blocks = (D.sites || []).map(function (s, i) {
        var pills = (s.leaseTerms || []).map(function (x) { return '<span class="pill">' + esc(x) + "</span>"; }).join(" ");
        return '<div class="d-section"><h4>' + (i + 1) + ". " + esc(siteLabel(s)) + ' <span class="form-note">· ' + esc(s.rentDisplay || "") + '</span></h4><div class="chips">' + pills + "</div></div>";
      }).join("");
      return head("Lease terms to prioritize", "The terms most peculiar to each property to focus negotiation") + blocks;
    },
    demographics: function () {
      var sites = D.sites || [];
      if (!sites.length || !sites[0].demo) return head("Demographics", "") + '<p class="panel-lead">No demographics loaded.</p>';
      var metrics = [["Population (10 mi)", "pop10mi", fmt], ["Median HH income", "medHHinc", function (v) { return "$" + fmt(v); }], ["Avg HH income", "avgHHinc", function (v) { return "$" + fmt(v); }], ["Labor force", "laborForce", fmt], ["Unemployment", "unemploymentPct", function (v) { return v + "%"; }], ["Transp/warehouse jobs", "twEmployment", fmt], ["Manufacturing jobs", "manuf", fmt], ["Median age", "medAge", function (v) { return v; }], ["Bachelor’s+", "bachelorsPlusPct", function (v) { return v + "%"; }], ["Daytime population", "daytimePop", fmt]];
      var heads = sites.map(function (s, i) { return '<th class="num">' + (i + 1) + ". " + esc(siteLabel(s)) + "</th>"; }).join("");
      var rows = metrics.map(function (m) { var cells = sites.map(function (s) { return '<td class="num">' + (s.demo[m[1]] != null ? m[2](s.demo[m[1]]) : "—") + "</td>"; }).join(""); return "<tr><td>" + m[0] + "</td>" + cells + "</tr>"; }).join("");
      return head("Demographics", "10-mile trade area around each finalist (current-year estimates)") +
        '<table class="table"><thead><tr><th>Metric</th>' + heads + "</tr></thead><tbody>" + rows + "</tbody></table>";
    },
    survey: function () { return surveyHTML(); },
  };

  /* ---------- Survey ---------- */
  var rankState = null;
  function surveyHTML() {
    var q = D.survey;
    var fields = q.questions.map(function (item) {
      if (item.type === "text") return field(item, '<input type="text" data-q="' + item.id + '" placeholder="' + esc(item.placeholder || "") + '">');
      if (item.type === "textarea") return field(item, '<textarea data-q="' + item.id + '" placeholder="' + esc(item.placeholder || "") + '"></textarea>');
      if (item.type === "choice") return field(item, choiceRow(item.id, item.options));
      if (item.type === "site") return field(item, choiceRow(item.id, (D.sites || []).map(function (s) { return siteLabel(s); })));
      if (item.type === "rank") { rankState = item.options.slice(); return field(item, '<ul class="rank-list" data-q="' + item.id + '" id="rankList"></ul>'); }
      return "";
    }).join("");
    return head("Take-home survey", q.intro) + '<form id="surveyForm">' + fields + '<button type="submit" class="btn">Submit priorities</button><p class="form-note">' + esc(CFG.survey.consentNote) + '</p><div id="surveyToast"></div></form>';
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
  function submitSurvey(form) {
    var payload = { _from: "desktop", client: CFG.clientName, _subject: "Cold-chain site survey — " + CFG.clientName };
    Array.prototype.forEach.call(form.querySelectorAll("[data-q]"), function (el) { var id = el.getAttribute("data-q"); if (el.classList.contains("choice-row")) { var sel = el.querySelector(".is-sel"); payload[id] = sel ? sel.dataset.val : ""; } else if (el.classList.contains("rank-list")) { payload[id] = rankState ? rankState.join(" > ") : ""; } else payload[id] = el.value; });
    var toast = $("#surveyToast"), btn = form.querySelector(".btn");
    var url = surveyUrl();
    if (!url) { toast.className = "toast toast--ok"; toast.innerHTML = "Thank you — your feedback has been noted."; btn.disabled = true; return; }
    toast.className = "toast"; toast.textContent = "Sending…"; btn.disabled = true;
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) throw 0; toast.className = "toast toast--ok"; toast.innerHTML = "Thank you — your feedback has been sent to the CBRE team."; })
      .catch(function () { toast.className = "toast toast--err"; toast.textContent = "Sorry, that didn’t go through — please try once more."; btn.disabled = false; });
  }
  function surveyUrl() {
    var s = CFG.survey || {};
    if (s.mode === "formsubmit" && s.email) return "https://formsubmit.co/ajax/" + encodeURIComponent(s.email);
    if (s.mode === "formspree" && s.endpoint) return s.endpoint;
    return "";
  }

  /* ---------- Nav ---------- */
  function setActiveNav(view) { Array.prototype.forEach.call(document.querySelectorAll(".navitem"), function (b) { b.classList.toggle("is-active", b.dataset.view === view); }); }
  Array.prototype.forEach.call(document.querySelectorAll(".navitem"), function (btn) {
    btn.addEventListener("click", function () { var v = btn.dataset.view; currentView = v; setActiveNav(v); if (v === "map") { closeDrawer(); return; } openDrawer(views[v] ? views[v]() : ""); if (v === "survey" && rankState) renderRank(); });
  });
  drawerBody.addEventListener("click", function (e) { var card = e.target.closest("[data-site]"); if (card) openSite(D.sites[+card.dataset.site], +card.dataset.site); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (!$("#loaderModal").hidden) closeLoader(); else if (!drawer.hidden) closeDrawer(); } });

  function refreshView() { if (currentView !== "map" && currentView !== "sites" && views[currentView]) { openDrawer(views[currentView]()); if (currentView === "survey" && rankState) renderRank(); } else closeDrawer(); }

  /* ---------- Data loader UI ---------- */
  var modal = $("#loaderModal"), fileItems = [];
  function openLoader() { modal.hidden = false; }
  function closeLoader() { modal.hidden = true; }
  $("#openLoader").addEventListener("click", openLoader);
  $("#loaderClose").addEventListener("click", closeLoader);
  $("#loaderScrim").addEventListener("click", closeLoader);
  $("#browseBtn").addEventListener("click", function () { $("#fileInput").click(); });
  var dz = $("#dropzone");
  $("#fileInput").addEventListener("change", function (e) { addFiles(e.target.files); });
  ["dragenter", "dragover"].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("is-over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("is-over"); }); });
  dz.addEventListener("drop", function (e) { addFiles(e.dataTransfer.files); });

  function addFiles(list) {
    Array.prototype.forEach.call(list, function (file) {
      LDR.inspect(file).then(function (item) { fileItems.push(item); renderFileList(); }).catch(function (err) {
        fileItems.push({ name: file.name, error: err.message || "parse error" }); renderFileList();
      });
    });
  }
  function renderFileList() {
    var el = $("#filelist");
    el.innerHTML = fileItems.map(function (it, i) {
      if (it.error) return '<div class="fileitem fileitem--err"><span>⚠ ' + esc(it.name) + '</span><span class="form-note">' + esc(it.error) + '</span><button class="fileitem__x" data-rm="' + i + '">✕</button></div>';
      var sel = ["sites", "demographics", "requirements"].map(function (t) { return '<option value="' + t + '"' + (t === it.type ? " selected" : "") + ">" + t + "</option>"; }).join("");
      return '<div class="fileitem"><span class="fileitem__name">' + esc(it.name) + '</span><span class="pill">' + it.count + ' rows</span><select data-type="' + i + '">' + sel + '</select><button class="fileitem__x" data-rm="' + i + '">✕</button></div>';
    }).join("");
    $("#applyBtn").disabled = !fileItems.some(function (it) { return !it.error; });
  }
  $("#filelist").addEventListener("click", function (e) { var rm = e.target.closest("[data-rm]"); if (rm) { fileItems.splice(+rm.dataset.rm, 1); renderFileList(); } });
  $("#filelist").addEventListener("change", function (e) { var sel = e.target.closest("[data-type]"); if (sel) fileItems[+sel.dataset.type].type = sel.value; });

  $("#applyBtn").addEventListener("click", function () {
    var good = fileItems.filter(function (it) { return !it.error; });
    var newPatch = LDR.buildPatch(good);
    patch = LDR.mergePatches(patch && Object.keys(patch).length ? patch : (autoloaded ? basePatch : {}), newPatch);
    if (!SHARED) LDR.savePatch(STORAGE_KEY, patch);
    userLoaded = true;
    D = LDR.apply(BASE, patch);
    fileItems = []; renderFileList();
    $("#loaderMsg").className = "loader-msg loader-msg--ok"; $("#loaderMsg").textContent = "Loaded: " + LDR.summarize(patch);
    didFitOnce = false; renderMap({ fit: true }); refreshBanner(); refreshView();
    setTimeout(closeLoader, 900);
  });
  var basePatch = null;
  $("#resetBtn").addEventListener("click", function () {
    LDR.clearPatch(STORAGE_KEY); patch = {}; userLoaded = false;
    if (basePatch) { patch = {}; D = LDR.apply(BASE, basePatch); }
    else D = LDR.apply(BASE, {});
    $("#loaderMsg").className = "loader-msg"; $("#loaderMsg").textContent = "";
    didFitOnce = false; renderMap({ fit: true }); refreshBanner(); refreshView();
  });

  /* ---------- /data auto-load ---------- */
  function autoLoad() {
    var urls = CFG.dataAutoload || [];
    if (!urls.length) return;
    Promise.all(urls.map(function (u) {
      return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.blob().then(function (b) { return LDR.inspect(new File([b], u.split("/").pop())); }); }).catch(function () { return null; });
    })).then(function (items) {
      var good = items.filter(Boolean);
      if (!good.length) return;
      basePatch = LDR.buildPatch(good);
      if (!patch || !Object.keys(patch).length) { // only if user hasn't loaded their own
        autoloaded = true; D = LDR.apply(BASE, basePatch);
        didFitOnce = false; renderMap({ fit: true }); refreshBanner(); refreshView();
      }
    });
  }

  /* ---------- Boot ---------- */
  window.__cockpit = { get data() { return D; }, get loaded() { return !!D._loaded; }, get autoloaded() { return autoloaded; } };
  refreshBanner();
  renderMap({ fit: true });
  if (!patch || !Object.keys(patch).length) autoLoad();
})();
