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
  var map = L.map("map", { center: CFG.map.center, zoom: CFG.map.zoom, minZoom: CFG.map.minZoom, maxZoom: CFG.map.maxZoom });
  var tileLayer = null;
  function swapTiles() {
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(currentDark() ? CFG.map.tilesDark : CFG.map.tilesLight, { attribution: CFG.map.attribution, maxZoom: CFG.map.maxZoom, detectRetina: true }).addTo(map);
  }
  swapTiles();
  var layers = { demo: L.layerGroup(), sites: L.layerGroup().addTo(map), rings: L.layerGroup().addTo(map), nodes: L.layerGroup().addTo(map), labor: L.layerGroup(), alt: L.layerGroup().addTo(map) };

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

  function renderChecklist(list) {
    if (!list || !list.length) return "";
    return '<ul class="chk">' + list.map(function (c) {
      return '<li class="chk--' + c.status + '"><span class="chk__ico">' + (c.status === "met" ? "✓" : "?") + "</span>" + esc(c.label) + "</li>";
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
      '<div class="d-eyebrow eyebrow">Finalist site</div><h2 class="d-title">' + esc(clean(s.name)) + "</h2>" +
      '<div class="d-sub">' + esc(s.address || "") + " · " + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + "</div>" +
      (s.criteriaMet != null ? '<div class="score-head"><span class="score-big num">' + s.criteriaMet + '</span><span class="eyebrow">of ' + s.criteriaTotal + " criteria confirmed</span></div>" : "") +
      (s.rent ? '<div class="d-section"><h4>Occupancy cost (NNN)</h4><dl class="kv">' +
        kv("Base rent", s.rent.base != null ? "$" + s.rent.base.toFixed(2) + " /SF" : "—") +
        kv("Opex + taxes", s.rent.addl != null ? "$" + s.rent.addl.toFixed(2) + " /SF" : "—") +
        "<dt><strong>All-in</strong></dt><dd><strong>$" + (s.rent.allIn != null ? s.rent.allIn.toFixed(2) : "—") + " /SF</strong></dd></dl></div>" : "") +
      '<div class="d-section"><h4>Building &amp; site</h4><dl class="kv">' +
        kv("Status", s.status) + kv("RBA", s.sizeSF ? fmt(s.sizeSF) + " SF" : "—") + kv("Available", s.availSF ? fmt(s.availSF) + " SF" : "—") +
        kv("Smallest unit", s.smallestSF ? fmt(s.smallestSF) + " SF" : "—") + kv("Clear height", s.clearHeight) +
        kv("Dock doors", s.dockDoors) + kv("Drive-in", s.driveIns) + kv("Power", s.power) + kv("Sprinklers", s.sprinklers) +
        kv("Year built", s.yearBuilt) + kv("Owner", s.owner) + "</dl></div>" +
      '<div class="d-section"><h4>Client criteria</h4>' + renderChecklist(s.checklist) + "</div>" +
      (drive ? '<div class="d-section"><h4>Drive distances</h4><table class="table"><thead><tr><th>Node</th><th class="num">Dist</th><th class="num">Drive</th></tr></thead><tbody>' + drive + "</tbody></table></div>" : "") +
      demoMini(s)
    );
    map.setView(s.coords, 11, { animate: true });
  }
  function openAlt(s) {
    openDrawer('<div class="d-eyebrow eyebrow">Also considered</div><h2 class="d-title">' + esc(clean(s.name)) + "</h2>" +
      '<div class="d-sub">' + esc(s.address || "") + (s.city ? " · " + esc(s.city) : "") + (s.submarket ? " · " + esc(s.submarket) : "") + "</div>" +
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
        return '<button class="stat" style="text-align:left;cursor:pointer;width:100%;margin-bottom:8px" data-site="' + i + '"><div style="display:flex;justify-content:space-between;align-items:baseline"><strong>' + (i + 1) + ". " + esc(clean(s.name)) +
          '</strong>' + (s.criteriaMet != null ? '<span class="score-big num" style="font-size:1.3rem">' + s.criteriaMet + "/" + s.criteriaTotal + "</span>" : "") + "</div>" +
          '<div class="stat__lbl">' + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + (s.rent && s.rent.allIn != null ? " · $" + s.rent.allIn.toFixed(2) + " NNN all-in" : "") + "</div></button>";
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
      var rows = (D.sites || []).map(function (s, i) { var l = s.labor || {}; return "<tr><td>" + (i + 1) + ". " + esc(s.city) + "</td><td class=\"num\">" + (l.pop10mi ? fmt(l.pop10mi) : "—") + "</td><td class=\"num\">" + (l.workforce ? fmt(l.workforce) : "—") + "</td><td class=\"num\">" + (l.twEmployment ? fmt(l.twEmployment) : "—") + "</td><td class=\"num\">" + esc(l.unemployment || "—") + "</td></tr>"; }).join("");
      return head("Labor forces", "Workforce within 10 miles of each finalist") +
        '<table class="table"><thead><tr><th>Site</th><th class="num">Pop 10mi</th><th class="num">Labor force</th><th class="num">Transp/whse jobs</th><th class="num">Unemp.</th></tr></thead><tbody>' + rows + "</tbody></table>" +
        '<p class="form-note">Transport &amp; warehousing employment is the cold-chain-relevant labor pool. Toggle “Labor shed” on the map for the ~20-mile draw.</p>';
    },
    criteria: function () {
      var sites = D.sites || [];
      var rows = D.criteria.map(function (c, ci) {
        var cells = sites.map(function (s) { var st = (s.checklist && s.checklist[ci]) ? s.checklist[ci].status : null; return '<td class="num">' + (st === "met" ? '<span class="chk__ico chk--met">✓</span>' : st === "confirm" ? '<span class="chk__ico chk--confirm">?</span>' : "—") + "</td>"; }).join("");
        return "<tr><td>" + esc(c.label) + "</td>" + cells + "</tr>";
      }).join("");
      var heads = sites.map(function (s, i) { return '<th class="num">' + (i + 1) + "</th>"; }).join("");
      var totals = sites.map(function (s) { return '<td class="num"><strong>' + (s.criteriaMet != null ? s.criteriaMet + "/" + s.criteriaTotal : "—") + "</strong></td>"; }).join("");
      return head("Criteria scores", "Client's 10-point checklist — ✓ confirmed from data, ? to verify") +
        '<table class="table"><thead><tr><th>Criterion</th>' + heads + "</tr></thead><tbody>" + rows + '<tr><td><strong>Confirmed</strong></td>' + totals + "</tr></tbody></table>" +
        '<p class="form-note">' + sites.map(function (s, i) { return (i + 1) + " = " + esc(s.city); }).join(" · ") + " · “?” = confirm on tour (floor drains, backup power).</p>";
    },
    demographics: function () {
      var sites = D.sites || [];
      if (!sites.length || !sites[0].demo) return head("Demographics", "") + '<p class="panel-lead">No demographics loaded.</p>';
      var metrics = [["Population (10 mi)", "pop10mi", fmt], ["Median HH income", "medHHinc", function (v) { return "$" + fmt(v); }], ["Avg HH income", "avgHHinc", function (v) { return "$" + fmt(v); }], ["Labor force", "laborForce", fmt], ["Unemployment", "unemploymentPct", function (v) { return v + "%"; }], ["Transp/warehouse jobs", "twEmployment", fmt], ["Manufacturing jobs", "manuf", fmt], ["Median age", "medAge", function (v) { return v; }], ["Bachelor’s+", "bachelorsPlusPct", function (v) { return v + "%"; }], ["Daytime population", "daytimePop", fmt]];
      var heads = sites.map(function (s, i) { return '<th class="num">' + (i + 1) + ". " + esc(s.city) + "</th>"; }).join("");
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
