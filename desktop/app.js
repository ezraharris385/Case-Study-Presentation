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
  var fmt = function (n) { return typeof n === "number" ? n.toLocaleString() : n; };

  // ---- data state ----
  var SHARED = !!CFG.sharedDataOnly;              // shared-data mode: everyone sees /data, no per-device state
  var patch = SHARED ? {} : (LDR.loadPatch(STORAGE_KEY) || {});
  var userLoaded = !SHARED && !!(patch && Object.keys(patch).length);
  var autoloaded = false;
  var D = LDR.apply(BASE, patch);
  var currentView = "map";

  /* ---------- Branding + chrome ---------- */
  $("#firmName").textContent = CFG.firmName;
  $("#engLine").textContent = CFG.engagementLine;
  $("#clientPill").textContent = CFG.clientName;
  $("#asOf").textContent = "As of " + CFG.asOfDate;
  document.title = CFG.clientName + " — Site Cockpit";
  function refreshBanner() {
    var b = $("#sampleBanner"); b.hidden = false;
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
  var map = L.map("map", { center: CFG.map.center, zoom: CFG.map.zoom, minZoom: CFG.map.minZoom, maxZoom: CFG.map.maxZoom });
  var tileLayer = null;
  function swapTiles() {
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(currentDark() ? CFG.map.tilesDark : CFG.map.tilesLight, { attribution: CFG.map.attribution, maxZoom: CFG.map.maxZoom, detectRetina: true }).addTo(map);
  }
  swapTiles();
  var layers = { demo: L.layerGroup(), sites: L.layerGroup().addTo(map), rings: L.layerGroup().addTo(map), nodes: L.layerGroup().addTo(map), labor: L.layerGroup(), alt: L.layerGroup() };

  function siteIcon(i) { return L.divIcon({ className: "", iconSize: [30, 30], iconAnchor: [15, 28], html: '<div class="mk mk--site"><span>' + (i + 1) + "</span></div>" }); }
  function altIcon() { return L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="mk mk--alt">◇</div>' }); }
  function nodeIcon() { return L.divIcon({ className: "", iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="mk mk--node"></div>' }); }

  /* ---------- Demographics rendering ---------- */
  function renderDemographics() {
    var demo = D.demographics; if (!demo) return;
    var metric = demo.metric || LDR.pickDemoMetric(demo.points, demo.geojson);
    var accent = css("--accent"), accentStrong = css("--accent-strong");
    $("#lyr-demo-label").textContent = "Demographics" + (metric ? " · " + metric : "");
    if (demo.points && demo.points.length) {
      var vals = demo.points.map(function (p) { return p.metrics[metric] || 0; });
      var max = Math.max.apply(null, vals) || 1;
      demo.points.forEach(function (p) {
        var v = p.metrics[metric] || 0;
        var r = 6 + 22 * Math.sqrt(v / max);
        var tip = "<strong>" + esc(p.name) + "</strong>" + Object.keys(p.metrics).map(function (k) { return "<br>" + esc(k) + ": " + fmt(p.metrics[k]); }).join("");
        L.circleMarker(p.coords, { radius: r, color: accentStrong, weight: 1, fillColor: accent, fillOpacity: 0.45 })
          .bindTooltip(tip, { direction: "top", sticky: true }).addTo(layers.demo);
      });
      demoLegend("size", metric, max);
    } else if (demo.geojson) {
      var props = (demo.geojson.features || []).map(function (f) { return (f.properties || {})[metric] || 0; });
      var mx = Math.max.apply(null, props) || 1, mn = Math.min.apply(null, props) || 0;
      L.geoJSON(demo.geojson, {
        style: function (f) {
          var v = (f.properties || {})[metric] || 0;
          var t = (v - mn) / (mx - mn || 1);
          return { color: accentStrong, weight: 1, fillColor: accent, fillOpacity: 0.12 + 0.6 * t };
        },
        onEachFeature: function (f, lyr) {
          var pr = f.properties || {};
          lyr.bindTooltip(Object.keys(pr).map(function (k) { return esc(k) + ": " + fmt(pr[k]); }).join("<br>"), { sticky: true });
        },
      }).addTo(layers.demo);
      demoLegend("choropleth", metric, mx, mn);
    }
  }
  function demoLegend(kind, metric, max, min) {
    var el = $("#demoLegend"); el.hidden = false;
    if (kind === "size") {
      el.innerHTML = '<div class="eyebrow">' + esc(metric) + '</div><div class="demo-legend__row"><span class="demo-bub demo-bub--sm"></span><span class="demo-bub demo-bub--md"></span><span class="demo-bub demo-bub--lg"></span><span class="demo-legend__cap">circle size = value</span></div>';
    } else {
      el.innerHTML = '<div class="eyebrow">' + esc(metric) + '</div><div class="demo-ramp"></div><div class="demo-legend__cap num">' + fmt(Math.round(min)) + " – " + fmt(Math.round(max)) + "</div>";
    }
  }

  /* ---------- Render / re-render the whole map ---------- */
  var didFitOnce = false;
  function renderMap(opts) {
    opts = opts || {};
    Object.keys(layers).forEach(function (k) { layers[k].clearLayers(); });
    $("#demoLegend").hidden = true;

    (D.sites || []).forEach(function (s, i) {
      if (!s.coords) return;
      L.marker(s.coords, { icon: siteIcon(i), title: s.name })
        .on("click", function () { openSite(s, i); })
        .bindTooltip(clean(s.name), { direction: "top", offset: [0, -24] }).addTo(layers.sites);
      L.circle(s.coords, { radius: CFG.map.reachMiles * 1609.34, color: css("--ring-color"), weight: 1.5, opacity: 0.7, fillColor: css("--ring-color"), fillOpacity: 0.06 }).addTo(layers.rings);
      L.circle(s.coords, { radius: 20 * 1609.34, color: css("--labor-color"), weight: 1, dashArray: "4 4", opacity: 0.7, fillColor: css("--labor-color"), fillOpacity: 0.05 }).addTo(layers.labor);
    });
    (D.alsoConsidered || []).forEach(function (s) {
      if (!s.coords) return;
      L.marker(s.coords, { icon: altIcon(), title: s.name }).on("click", function () { openAlt(s); }).bindTooltip(clean(s.name), { direction: "top" }).addTo(layers.alt);
    });
    (D.nodes || []).forEach(function (n) {
      L.marker(n.coords, { icon: nodeIcon() }).bindTooltip('<span class="node-tip">' + esc(n.name) + "</span>", { direction: "top", offset: [0, -6] }).addTo(layers.nodes);
    });

    // demographics
    var demoRow = $("#lyr-demo-row");
    if (D.demographics) {
      demoRow.hidden = false;
      renderDemographics();
      if ($("#lyr-demo").checked && !map.hasLayer(layers.demo)) layers.demo.addTo(map);
    } else { demoRow.hidden = true; if (map.hasLayer(layers.demo)) map.removeLayer(layers.demo); }

    // fit
    var pts = (D.sites || []).filter(function (s) { return s.coords; }).map(function (s) { return s.coords; })
      .concat((D.alsoConsidered || []).filter(function (s) { return s.coords; }).map(function (s) { return s.coords; }));
    if (D.demographics && D.demographics.points) pts = pts.concat(D.demographics.points.map(function (p) { return p.coords; }));
    if ((opts.fit !== false) && pts.length) { try { map.fitBounds(L.latLngBounds(pts).pad(0.25)); didFitOnce = true; } catch (e) {} }
    else if (!didFitOnce && !pts.length) { map.setView(CFG.map.center, CFG.map.zoom); }
  }

  // Layer toggles
  function bindLayer(id, grp) { var cb = $(id); cb.addEventListener("change", function () { cb.checked ? grp.addTo(map) : map.removeLayer(grp); }); }
  bindLayer("#lyr-sites", layers.sites); bindLayer("#lyr-rings", layers.rings); bindLayer("#lyr-nodes", layers.nodes);
  bindLayer("#lyr-labor", layers.labor); bindLayer("#lyr-alt", layers.alt); bindLayer("#lyr-demo", layers.demo);

  /* ---------- Drawer ---------- */
  var drawer = $("#drawer"), drawerBody = $("#drawerBody");
  function openDrawer(html) { drawerBody.innerHTML = html; drawer.hidden = false; drawerBody.scrollTop = 0; }
  function closeDrawer() { drawer.hidden = true; currentView = "map"; setActiveNav("map"); }
  $("#drawerClose").addEventListener("click", closeDrawer);

  function scoreBars(scores) {
    return D.criteria.map(function (c) {
      var v = (scores && scores[c.key] != null) ? scores[c.key] : null;
      if (v == null) return "";
      return '<div class="score-row"><span>' + esc(c.label) + '</span><span class="score-track"><span class="score-fill" style="width:' + v + '%"></span></span><span class="score-val num">' + v + "</span></div>";
    }).join("");
  }
  function kv(k, v) { return "<dt>" + esc(k) + "</dt><dd>" + esc(v == null ? "—" : v) + "</dd>"; }

  function openSite(s, i) {
    currentView = "sites"; setActiveNav("sites");
    var drive = (s.drive || []).map(function (d) { return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + " mi</td><td class=\"num\">" + d.min + " min</td></tr>"; }).join("");
    var inc = (s.incentives || []).map(function (x) { return '<span class="pill pill--accent">' + esc(x) + "</span>"; }).join(" ");
    var pros = (s.pros || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    var cons = (s.cons || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    var bars = scoreBars(s.scores);
    openDrawer(
      '<div class="d-eyebrow eyebrow">Finalist site</div><h2 class="d-title">' + esc(clean(s.name)) + "</h2>" +
      '<div class="d-sub">' + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + "</div>" +
      (s.criteriaScore != null ? '<div class="score-head"><span class="score-big num">' + s.criteriaScore + '</span><span class="eyebrow">criteria score / 100</span></div>' : "") +
      bars +
      '<div class="d-section"><h4>Building &amp; site</h4><dl class="kv">' +
        kv("Status", s.status) + kv("Size", s.sizeSF ? fmt(s.sizeSF) + " SF" : "—") + kv("Clear height", s.clearHeight) +
        kv("Dock doors", s.dockDoors) + kv("Trailer parking", s.trailerParking) + kv("Power", s.power) +
        kv("Cold-readiness", s.coldReady) + kv("Refrigeration", s.refrigeration) +
        kv("Rent (NNN)", s.rentNNN != null ? "$" + Number(s.rentNNN).toFixed(2) + " /SF" : "—") +
        kv("Opex", s.opex != null ? "$" + Number(s.opex).toFixed(2) + " /SF" : "—") + kv("Expansion", s.expansion) + "</dl></div>" +
      (drive ? '<div class="d-section"><h4>Drive distances</h4><table class="table"><thead><tr><th>Node</th><th class="num">Dist</th><th class="num">Time</th></tr></thead><tbody>' + drive + "</tbody></table></div>" : "") +
      (s.labor ? '<div class="d-section"><h4>Labor shed</h4><dl class="kv">' +
        kv("Pop. within 10 mi", s.labor.pop10mi ? fmt(s.labor.pop10mi) : "—") + kv("Warehouse workforce", s.labor.workforce ? fmt(s.labor.workforce) : "—") +
        kv("Avg wage", s.labor.avgWage) + kv("Unemployment", s.labor.unemployment) + "</dl></div>" : "") +
      (inc ? '<div class="d-section"><h4>Incentives</h4><div class="chips">' + inc + "</div></div>" : "") +
      ((pros || cons) ? '<div class="d-section"><h4>Assessment</h4><div class="prosCons">' +
        '<div><div class="pc-label pc-label--pro">Strengths</div><ul>' + pros + "</ul></div>" +
        '<div><div class="pc-label pc-label--con">Watch-outs</div><ul>' + cons + "</ul></div></div></div>" : "")
    );
    map.setView(s.coords, 11, { animate: true });
  }
  function openAlt(s) {
    openDrawer('<div class="d-eyebrow eyebrow">Also considered</div><h2 class="d-title">' + esc(clean(s.name)) + "</h2>" +
      '<div class="d-sub">' + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + "</div>" +
      '<dl class="kv">' + kv("Size", s.sizeSF ? fmt(s.sizeSF) + " SF" : "—") + kv("Rent (NNN)", s.rentNNN != null ? "$" + Number(s.rentNNN).toFixed(2) + " /SF" : "—") + "</dl>" +
      (s.whyOut ? '<div class="d-section"><h4>Why it didn\'t make the shortlist</h4><p class="panel-lead">' + esc(s.whyOut) + "</p></div>" : ""));
    if (s.coords) map.setView(s.coords, 10, { animate: true });
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
    swot: function () {
      function cell(cls, title, arr) { return '<div class="quad__cell ' + cls + '"><h5>' + title + "</h5><ul>" + (arr || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"; }
      return head("SWOT", "Strategic read on the engagement") + '<div class="quad">' + cell("quad--s", "Strengths", D.swot.strengths) + cell("quad--w", "Weaknesses", D.swot.weaknesses) + cell("quad--o", "Opportunities", D.swot.opportunities) + cell("quad--t", "Threats", D.swot.threats) + "</div>";
    },
    market: function () {
      var stats = D.market.stats.map(function (s) { return '<div class="stat"><div class="stat__val num">' + esc(s.value) + '</div><div class="stat__lbl">' + esc(s.label) + "</div></div>"; }).join("");
      return head("Chicago industrial market", D.market.headline) + '<div class="stat-grid">' + stats + "</div><p class=\"panel-lead\">" + esc(D.market.note) + '</p><p class="form-note">Source: ' + esc(D.market.source) + "</p>";
    },
    sites: function () {
      var cards = (D.sites || []).map(function (s, i) {
        return '<button class="stat" style="text-align:left;cursor:pointer;width:100%;margin-bottom:8px" data-site="' + i + '"><div style="display:flex;justify-content:space-between;align-items:baseline"><strong>' + (i + 1) + ". " + esc(clean(s.name)) +
          '</strong>' + (s.criteriaScore != null ? '<span class="score-big num" style="font-size:1.4rem">' + s.criteriaScore + "</span>" : "") + "</div>" +
          '<div class="stat__lbl">' + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + (s.rentNNN != null ? " · $" + Number(s.rentNNN).toFixed(2) + " NNN" : "") + "</div></button>";
      }).join("");
      return head("Site detail", "Tap a site to open its full profile (or a pin on the map)") + (cards || '<p class="panel-lead">No sites loaded yet.</p>');
    },
    drive: function () {
      var blocks = (D.sites || []).map(function (s, i) {
        var rows = (s.drive || []).map(function (d) { return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + ' mi</td><td class="num">' + d.min + ' min</td></tr>'; }).join("");
        return '<div class="d-section"><h4>' + (i + 1) + ". " + esc(clean(s.name)) + '</h4>' + (rows ? '<table class="table"><thead><tr><th>Node</th><th class="num">Dist</th><th class="num">Drive</th></tr></thead><tbody>' + rows + "</tbody></table>" : '<p class="form-note">No drive data in the upload — add a <code>drive</code> file or I can compute these.</p>') + "</div>";
      }).join("");
      return head("Drive distances", "To intermodal, air-freight, downtown & interstates") + blocks;
    },
    labor: function () {
      var rows = (D.sites || []).map(function (s, i) { var l = s.labor || {}; return "<tr><td>" + (i + 1) + ". " + esc(s.city) + "</td><td class=\"num\">" + (l.pop10mi ? fmt(l.pop10mi) : "—") + "</td><td class=\"num\">" + (l.workforce ? fmt(l.workforce) : "—") + "</td><td class=\"num\">" + esc(l.avgWage || "—") + "</td><td class=\"num\">" + esc(l.unemployment || "—") + "</td></tr>"; }).join("");
      var demoTable = "";
      if (D.demographics && D.demographics.points && D.demographics.points.length) {
        var metric = D.demographics.metric;
        var top = D.demographics.points.slice().sort(function (a, b) { return (b.metrics[metric] || 0) - (a.metrics[metric] || 0); }).slice(0, 8);
        demoTable = '<div class="d-section"><h4>Demographic areas <span class="form-note">(' + esc(metric) + ", top 8)</span></h4><table class=\"table\"><tbody>" +
          top.map(function (p) { return "<tr><td>" + esc(p.name) + '</td><td class="num">' + fmt(p.metrics[metric]) + "</td></tr>"; }).join("") + "</tbody></table></div>";
      }
      return head("Labor forces", "Workforce within reach of each finalist") +
        '<table class="table"><thead><tr><th>Site</th><th class="num">Pop 10mi</th><th class="num">WH workforce</th><th class="num">Avg wage</th><th class="num">Unemp.</th></tr></thead><tbody>' + rows + "</tbody></table>" +
        '<p class="form-note">Toggle “Demographics” + “Labor shed” on the map for the draw areas.</p>' + demoTable;
    },
    criteria: function () {
      var sites = D.sites || [];
      var rows = D.criteria.map(function (c) {
        var cells = sites.map(function (s) { var v = (s.scores && s.scores[c.key] != null) ? s.scores[c.key] : "—"; return '<td class="num">' + v + "</td>"; }).join("");
        return "<tr><td>" + esc(c.label) + "</td>" + cells + "</tr>";
      }).join("");
      var heads = sites.map(function (s, i) { return '<th class="num">' + (i + 1) + "</th>"; }).join("");
      var totals = sites.map(function (s) { return '<td class="num"><strong>' + (s.criteriaScore != null ? s.criteriaScore : "—") + "</strong></td>"; }).join("");
      return head("Criteria scores", "Per-site scorecard (sites keyed 1–" + sites.length + " on the map)") +
        '<table class="table"><thead><tr><th>Criterion</th>' + heads + "</tr></thead><tbody>" + rows + '<tr><td><strong>Overall</strong></td>' + totals + "</tr></tbody></table>" +
        '<p class="form-note">' + sites.map(function (s, i) { return (i + 1) + " = " + esc(s.city); }).join(" · ") + "</p>";
    },
    lease: function () {
      var rows = D.leaseTerms.terms.map(function (t) { return "<tr><td>" + esc(t.label) + "</td><td>" + esc(t.value) + "</td></tr>"; }).join("");
      return head("Key lease terms", D.leaseTerms.summary) + '<table class="table"><tbody>' + rows + "</tbody></table>";
    },
    tco: function () {
      var yrs = D.tcoAssumptions.termYears;
      var palette = { rent: css("--accent"), opex: css("--navy"), power: css("--warn"), labor: css("--ink-muted"), ti: css("--site-alt") };
      function compute(s) { var t = s.tco || {}, sf = s.sizeSF || 0; var rent = (t.rentPerSF || 0) * sf * yrs, opex = (t.opexPerSF || 0) * sf * yrs, power = (t.powerPerSF || 0) * sf * yrs, labor = (t.laborAnnual || 0) * yrs, ti = (t.tiPerSF || 0) * sf; var gross = rent + opex + power + labor + ti; return { rent: rent, opex: opex, power: power, labor: labor, ti: ti, gross: gross, inc: t.incentivesTotal || 0, net: gross - (t.incentivesTotal || 0) }; }
      var withTco = (D.sites || []).filter(function (s) { return s.tco; });
      if (!withTco.length) return head("Incentives & TCO", "5-year total cost of occupancy") + '<p class="panel-lead">No TCO inputs in the current data. Add TCO columns (rent/opex/power per SF, labor, fit-out, incentives) to see the model.</p>';
      var comps = withTco.map(compute); var maxGross = Math.max.apply(null, comps.map(function (c) { return c.gross; }));
      var blocks = withTco.map(function (s, i) { var c = comps[i]; function seg(k, color) { return '<i style="width:' + (c[k] / c.gross * 100) + "%;background:" + color + '"></i>'; }
        return '<div class="d-section"><h4>' + esc(clean(s.name)) + "</h4><div class=\"stack\" style=\"width:" + (c.gross / maxGross * 100) + '%">' + seg("rent", palette.rent) + seg("opex", palette.opex) + seg("power", palette.power) + seg("labor", palette.labor) + seg("ti", palette.ti) + "</div><dl class=\"kv\" style=\"grid-template-columns:150px 1fr\">" + kv("Gross " + yrs + "-yr", moneyM(c.gross)) + kv("Incentives", "− " + moneyM(c.inc)) + "<dt><strong>Net " + yrs + "-yr TCO</strong></dt><dd><strong>" + moneyM(c.net) + "</strong></dd></dl></div>"; }).join("");
      return head("Incentives & TCO", D.tcoAssumptions.note) + '<div class="stack-legend"><span><i style="background:' + palette.rent + '"></i>Rent</span><span><i style="background:' + palette.opex + '"></i>Opex/tax</span><span><i style="background:' + palette.power + '"></i>Power</span><span><i style="background:' + palette.labor + '"></i>Labor</span><span><i style="background:' + palette.ti + '"></i>Fit-out</span></div>' + blocks;
    },
    timeline: function () { return head("Deliverable timeline", "Path from today to occupancy") + '<ul class="tl">' + D.timeline.map(function (t) { return '<li class="' + (t.status === "done" ? "done" : t.status === "active" ? "active" : "") + '"><div class="tl__phase">' + esc(t.phase) + '</div><div class="tl__label">' + esc(t.label) + '</div><div class="tl__date">' + esc(t.date) + "</div></li>"; }).join("") + "</ul>"; },
    next: function () { return head("Next steps", "What we do coming out of this meeting") + '<ul class="list-clean">' + D.nextSteps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; },
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
      if (item.type === "site") return field(item, choiceRow(item.id, (D.sites || []).map(function (s) { return s.city || clean(s.name); })));
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
    var payload = { _submittedFrom: "desktop", client: CFG.clientName };
    Array.prototype.forEach.call(form.querySelectorAll("[data-q]"), function (el) { var id = el.getAttribute("data-q"); if (el.classList.contains("choice-row")) { var sel = el.querySelector(".is-sel"); payload[id] = sel ? sel.dataset.val : ""; } else if (el.classList.contains("rank-list")) { payload[id] = rankState ? rankState.join(" > ") : ""; } else payload[id] = el.value; });
    var toast = $("#surveyToast"), mode = CFG.survey.mode, url = CFG.survey.endpoint;
    if (!mode || !url) { toast.className = "toast toast--ok"; toast.innerHTML = "Recorded locally (no backend configured yet).<br><strong>Your priorities:</strong> " + esc(payload.priority || "—") + (payload.favorite ? "<br><strong>Leaning:</strong> " + esc(payload.favorite) : ""); return; }
    toast.className = "toast"; toast.textContent = "Submitting…";
    var opts = (mode === "formspree") ? { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) } : { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) };
    fetch(url, opts).then(function () { toast.className = "toast toast--ok"; toast.innerHTML = "Thank you — your priorities were sent to the deal team. ✓"; form.querySelector(".btn").disabled = true; }).catch(function () { toast.className = "toast toast--err"; toast.textContent = "Couldn't reach the server. Please try again."; });
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
