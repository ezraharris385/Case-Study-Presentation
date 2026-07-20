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
  var fmt = function (n) { return typeof n === "number" ? n.toLocaleString() : n; };

  var patch = LDR.loadPatch(STORAGE_KEY) || {};
  var userLoaded = !!(patch && Object.keys(patch).length);
  var autoloaded = false;
  var basePatch = null;
  var D = LDR.apply(BASE, patch);

  $("#clientName").textContent = CFG.clientName;
  function refreshBanner() {
    var b = $("#sampleBanner"); b.hidden = false;
    if (userLoaded) { b.innerHTML = "<strong>Your data</strong> — loaded on this device."; b.style.background = "var(--good-soft)"; }
    else if (autoloaded) { b.innerHTML = "<strong>Demo data (Chicago)</strong> — tap ＋ to load yours."; b.style.background = "var(--accent-soft)"; }
    else { b.innerHTML = "<strong>Sample data</strong> — tap ＋ to load yours."; b.style.background = "var(--warn-soft)"; }
  }

  /* Theme */
  var saved = null; try { saved = localStorage.getItem("cockpit-theme"); } catch (e) {}
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  function currentDark() { var t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; }
  $("#themeToggle").addEventListener("click", function () { var next = currentDark() ? "light" : "dark"; document.documentElement.setAttribute("data-theme", next); try { localStorage.setItem("cockpit-theme", next); } catch (e) {} swapTiles(); renderMap({ fit: false }); });

  /* Map */
  var map = L.map("map", { center: CFG.map.center, zoom: CFG.map.zoom, minZoom: CFG.map.minZoom, maxZoom: CFG.map.maxZoom, zoomControl: false });
  L.control.zoom({ position: "topright" }).addTo(map);
  var tileLayer = null;
  function swapTiles() { if (tileLayer) map.removeLayer(tileLayer); tileLayer = L.tileLayer(currentDark() ? CFG.map.tilesDark : CFG.map.tilesLight, { attribution: CFG.map.attribution, maxZoom: CFG.map.maxZoom, detectRetina: true }).addTo(map); }
  swapTiles();
  var layers = { demo: L.layerGroup(), sites: L.layerGroup().addTo(map), rings: L.layerGroup().addTo(map), nodes: L.layerGroup().addTo(map), labor: L.layerGroup(), alt: L.layerGroup() };

  function siteIcon(i) { return L.divIcon({ className: "", iconSize: [34, 34], iconAnchor: [17, 32], html: '<div class="mk mk--site"><span>' + (i + 1) + "</span></div>" }); }
  function altIcon() { return L.divIcon({ className: "", iconSize: [24, 24], iconAnchor: [12, 12], html: '<div class="mk mk--alt">◇</div>' }); }
  function nodeIcon() { return L.divIcon({ className: "", iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="mk mk--node"></div>' }); }

  function renderDemographics() {
    var demo = D.demographics; if (!demo) return;
    var metric = demo.metric || LDR.pickDemoMetric(demo.points, demo.geojson);
    var accent = css("--accent"), accentStrong = css("--accent-strong");
    var chip = $("#chip-demo"); if (chip) chip.textContent = "Demographics" + (metric ? " · " + metric : "");
    if (demo.points && demo.points.length) {
      var max = Math.max.apply(null, demo.points.map(function (p) { return p.metrics[metric] || 0; })) || 1;
      demo.points.forEach(function (p) {
        var v = p.metrics[metric] || 0, r = 6 + 20 * Math.sqrt(v / max);
        var tip = "<strong>" + esc(p.name) + "</strong>" + Object.keys(p.metrics).map(function (k) { return "<br>" + esc(k) + ": " + fmt(p.metrics[k]); }).join("");
        L.circleMarker(p.coords, { radius: r, color: accentStrong, weight: 1, fillColor: accent, fillOpacity: 0.45 }).bindTooltip(tip, { direction: "top", sticky: true }).addTo(layers.demo);
      });
    } else if (demo.geojson) {
      var props = (demo.geojson.features || []).map(function (f) { return (f.properties || {})[metric] || 0; });
      var mx = Math.max.apply(null, props) || 1, mn = Math.min.apply(null, props) || 0;
      L.geoJSON(demo.geojson, { style: function (f) { var v = (f.properties || {})[metric] || 0, t = (v - mn) / (mx - mn || 1); return { color: accentStrong, weight: 1, fillColor: accent, fillOpacity: 0.12 + 0.6 * t }; },
        onEachFeature: function (f, lyr) { var pr = f.properties || {}; lyr.bindTooltip(Object.keys(pr).map(function (k) { return esc(k) + ": " + fmt(pr[k]); }).join("<br>"), { sticky: true }); } }).addTo(layers.demo);
    }
  }

  var didFit = false;
  function renderMap(opts) {
    opts = opts || {};
    Object.keys(layers).forEach(function (k) { layers[k].clearLayers(); });
    (D.sites || []).forEach(function (s, i) {
      if (!s.coords) return;
      L.marker(s.coords, { icon: siteIcon(i) }).on("click", function () { openSite(s); }).addTo(layers.sites);
      L.circle(s.coords, { radius: CFG.map.reachMiles * 1609.34, color: css("--ring-color"), weight: 1.5, opacity: 0.7, fillColor: css("--ring-color"), fillOpacity: 0.06 }).addTo(layers.rings);
      L.circle(s.coords, { radius: 20 * 1609.34, color: css("--labor-color"), weight: 1, dashArray: "4 4", opacity: 0.7, fillColor: css("--labor-color"), fillOpacity: 0.05 }).addTo(layers.labor);
    });
    (D.alsoConsidered || []).forEach(function (s) { if (!s.coords) return; L.marker(s.coords, { icon: altIcon() }).on("click", function () { openAlt(s); }).addTo(layers.alt); });
    (D.nodes || []).forEach(function (n) { L.marker(n.coords, { icon: nodeIcon() }).bindTooltip(esc(n.name), { direction: "top" }).addTo(layers.nodes); });

    var chip = $("#chip-demo");
    if (D.demographics) { chip.hidden = false; renderDemographics(); if (chip.classList.contains("is-on") && !map.hasLayer(layers.demo)) layers.demo.addTo(map); }
    else { chip.hidden = true; if (map.hasLayer(layers.demo)) map.removeLayer(layers.demo); }

    var pts = (D.sites || []).filter(function (s) { return s.coords; }).map(function (s) { return s.coords; })
      .concat((D.alsoConsidered || []).filter(function (s) { return s.coords; }).map(function (s) { return s.coords; }));
    if (D.demographics && D.demographics.points) pts = pts.concat(D.demographics.points.map(function (p) { return p.coords; }));
    if (opts.fit !== false && pts.length) { try { map.fitBounds(L.latLngBounds(pts).pad(0.2)); didFit = true; } catch (e) {} }
    setTimeout(function () { map.invalidateSize(); }, 60);
  }

  Array.prototype.forEach.call(document.querySelectorAll(".chip-toggle"), function (c) {
    c.addEventListener("click", function () { var grp = layers[c.dataset.layer]; if (!grp) return; var on = c.classList.toggle("is-on"); on ? grp.addTo(map) : map.removeLayer(grp); });
  });

  /* Bottom sheet */
  var sheet = $("#sheet"), sheetBody = $("#sheetBody"), scrim = $("#scrim");
  function openSheet(html) { sheetBody.innerHTML = html; sheet.hidden = false; scrim.hidden = false; sheetBody.scrollTop = 0; }
  function closeSheet() { sheet.hidden = true; scrim.hidden = true; }
  scrim.addEventListener("click", closeSheet); $("#sheetGrab").addEventListener("click", closeSheet);

  function scoreBars(scores) { return D.criteria.map(function (c) { var v = (scores && scores[c.key] != null) ? scores[c.key] : null; return v == null ? "" : '<div class="score-row"><span>' + esc(c.label) + '</span><span class="score-track"><span class="score-fill" style="width:' + v + '%"></span></span><span class="score-val num">' + v + "</span></div>"; }).join(""); }
  function kv(k, v) { return "<dt>" + esc(k) + "</dt><dd>" + esc(v == null ? "—" : v) + "</dd>"; }

  function openSite(s) {
    var drive = (s.drive || []).map(function (d) { return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + ' mi</td><td class="num">' + d.min + ' min</td></tr>'; }).join("");
    var inc = (s.incentives || []).map(function (x) { return '<span class="pill pill--accent">' + esc(x) + "</span>"; }).join(" ");
    openSheet('<h2>' + esc(clean(s.name)) + "</h2><div class=\"d-sub\">" + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + "</div>" +
      (s.criteriaScore != null ? '<div class="score-head"><span class="score-big num">' + s.criteriaScore + '</span><span class="eyebrow">score / 100</span></div>' : "") + scoreBars(s.scores) +
      '<div class="d-section"><h4>Building &amp; site</h4><dl class="kv">' + kv("Status", s.status) + kv("Size", s.sizeSF ? fmt(s.sizeSF) + " SF" : "—") + kv("Clear height", s.clearHeight) + kv("Dock doors", s.dockDoors) + kv("Power", s.power) + kv("Cold-ready", s.coldReady) + kv("Rent (NNN)", s.rentNNN != null ? "$" + Number(s.rentNNN).toFixed(2) + " /SF" : "—") + kv("Expansion", s.expansion) + "</dl></div>" +
      (drive ? '<div class="d-section"><h4>Drive distances</h4><table class="table"><tbody>' + drive + "</tbody></table></div>" : "") +
      (s.labor ? '<div class="d-section"><h4>Labor shed</h4><dl class="kv">' + kv("Pop 10mi", s.labor.pop10mi ? fmt(s.labor.pop10mi) : "—") + kv("Workforce", s.labor.workforce ? fmt(s.labor.workforce) : "—") + kv("Avg wage", s.labor.avgWage) + "</dl></div>" : "") +
      (inc ? '<div class="d-section"><h4>Incentives</h4><div class="chips">' + inc + "</div></div>" : ""));
    if (s.coords) map.setView(s.coords, 10, { animate: true });
  }
  function openAlt(s) { openSheet('<h2>' + esc(clean(s.name)) + '</h2><div class="d-sub">' + esc(s.city) + " · also-considered</div><dl class=\"kv\">" + kv("Size", s.sizeSF ? fmt(s.sizeSF) + " SF" : "—") + kv("Rent (NNN)", s.rentNNN != null ? "$" + Number(s.rentNNN).toFixed(2) : "—") + "</dl>" + (s.whyOut ? '<div class="d-section"><h4>Why it didn\'t make the cut</h4><p>' + esc(s.whyOut) + "</p></div>" : "")); if (s.coords) map.setView(s.coords, 9, { animate: true }); }

  /* Tabs */
  function activate(tab) {
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) { b.classList.toggle("is-active", b.dataset.tab === tab); });
    Array.prototype.forEach.call(document.querySelectorAll(".tabview"), function (v) { v.classList.toggle("is-active", v.id === "tab-" + tab); });
    if (tab === "map") setTimeout(function () { map.invalidateSize(); }, 60);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) { b.addEventListener("click", function () { activate(b.dataset.tab); }); });

  /* Sites list */
  function renderSitesList() {
    $("#sitesList").innerHTML = '<div class="sec-title">Finalist sites</div>' + (D.sites || []).map(function (s, i) {
      return '<button class="mcard" data-site="' + i + '"><div class="mcard__top"><span class="mcard__name">' + (i + 1) + ". " + esc(clean(s.name)) + '</span>' + (s.criteriaScore != null ? '<span class="mcard__score num">' + s.criteriaScore + "</span>" : "") + '</div><div class="mcard__sub">' + esc(s.city) + (s.submarket ? " · " + esc(s.submarket) : "") + '</div><div class="mcard__row">' + (s.rentNNN != null ? '<span class="pill">$' + Number(s.rentNNN).toFixed(2) + " NNN</span>" : "") + (s.sizeSF ? '<span class="pill">' + (s.sizeSF / 1000).toFixed(0) + "k SF</span>" : "") + "</div></button>";
    }).join("") + ((D.alsoConsidered && D.alsoConsidered.length) ? ('<div class="sec-title" style="margin-top:18px">Also considered</div>' + D.alsoConsidered.map(function (s, i) { return '<button class="mcard" data-alt="' + i + '"><div class="mcard__top"><span class="mcard__name">' + esc(clean(s.name)) + '</span><span class="pill pill--alt">not selected</span></div><div class="mcard__sub">' + esc(s.city) + "</div></button>"; }).join("")) : "");
  }
  $("#sitesList").addEventListener("click", function (e) { var s = e.target.closest("[data-site]"), a = e.target.closest("[data-alt]"); if (s) openSite(D.sites[+s.dataset.site]); else if (a) openAlt(D.alsoConsidered[+a.dataset.alt]); });

  /* Info accordion */
  function infoSections() {
    return [
      { t: "Client needs", h: function () { var r = (D.needs.requirements || []).map(function (x) { return "<tr><td>" + esc(x.label) + "</td><td>" + esc(x.value) + "</td></tr>"; }).join(""); var db = (D.needs.dealBreakers || []).map(function (x) { return '<span class="pill pill--warn">' + esc(x) + "</span>"; }).join(" "); return (D.needs.summary && !/^SAMPLE/.test(D.needs.summary) ? "<p>" + esc(D.needs.summary) + "</p>" : "") + '<table class="table"><tbody>' + r + '</tbody></table>' + (db ? '<div style="margin-top:10px" class="chips">' + db + "</div>" : ""); } },
      { t: "SWOT", h: function () { function cell(cls, title, arr) { return '<div class="quad__cell ' + cls + '"><h5>' + title + "</h5><ul>" + (arr || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"; } return '<div class="quad">' + cell("quad--s", "Strengths", D.swot.strengths) + cell("quad--w", "Weaknesses", D.swot.weaknesses) + cell("quad--o", "Opportunities", D.swot.opportunities) + cell("quad--t", "Threats", D.swot.threats) + "</div>"; } },
      { t: "Chicago market", h: function () { return '<table class="table"><tbody>' + D.market.stats.map(function (s) { return "<tr><td>" + esc(s.label) + '</td><td class="num">' + esc(s.value) + "</td></tr>"; }).join("") + "</tbody></table><p style=\"margin-top:10px\">" + esc(D.market.note) + "</p>"; } },
      { t: "Demographics", h: function () { if (!(D.demographics && D.demographics.points)) return '<p class="form-note">Load a demographics file to populate this + the map layer.</p>'; var m = D.demographics.metric; var rows = D.demographics.points.slice().sort(function (a, b) { return (b.metrics[m] || 0) - (a.metrics[m] || 0); }).slice(0, 12).map(function (p) { return "<tr><td>" + esc(p.name) + '</td><td class="num">' + fmt(p.metrics[m]) + "</td></tr>"; }).join(""); return '<table class="table"><thead><tr><th>Area</th><th class="num">' + esc(m) + '</th></tr></thead><tbody>' + rows + "</tbody></table>"; } },
      { t: "Drive distances", h: function () { return (D.sites || []).map(function (s, i) { var rows = (s.drive || []).map(function (d) { return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + ' mi</td><td class="num">' + d.min + ' min</td></tr>'; }).join(""); return '<h5 style="font-family:var(--font-display);margin:10px 0 4px">' + (i + 1) + ". " + esc(clean(s.name)) + '</h5>' + (rows ? '<table class="table"><tbody>' + rows + "</tbody></table>" : '<p class="form-note">No drive data.</p>'); }).join(""); } },
      { t: "Labor forces", h: function () { var rows = (D.sites || []).map(function (s, i) { var l = s.labor || {}; return "<tr><td>" + (i + 1) + ". " + esc(s.city) + '</td><td class="num">' + (l.pop10mi ? fmt(l.pop10mi) : "—") + '</td><td class="num">' + esc(l.avgWage || "—") + "</td></tr>"; }).join(""); return '<table class="table"><thead><tr><th>Site</th><th class="num">Pop 10mi</th><th class="num">Wage</th></tr></thead><tbody>' + rows + "</tbody></table>"; } },
      { t: "Key lease terms", h: function () { return '<table class="table"><tbody>' + D.leaseTerms.terms.map(function (t) { return "<tr><td>" + esc(t.label) + "</td><td>" + esc(t.value) + "</td></tr>"; }).join("") + "</tbody></table>"; } },
      { t: "Incentives & TCO", h: function () { var yrs = D.tcoAssumptions.termYears; var withT = (D.sites || []).filter(function (s) { return s.tco; }); if (!withT.length) return '<p class="form-note">No TCO inputs in the current data.</p>'; var rows = withT.map(function (s) { var t = s.tco, sf = s.sizeSF || 0; var gross = ((t.rentPerSF || 0) + (t.opexPerSF || 0) + (t.powerPerSF || 0)) * sf * yrs + (t.laborAnnual || 0) * yrs + (t.tiPerSF || 0) * sf; return "<tr><td>" + esc(clean(s.name)) + '</td><td class="num">' + moneyM(gross - (t.incentivesTotal || 0)) + "</td></tr>"; }).join(""); return '<table class="table"><thead><tr><th>Site</th><th class="num">Net ' + yrs + "-yr TCO</th></tr></thead><tbody>" + rows + "</tbody></table>"; } },
      { t: "Timeline", h: function () { return '<ul class="list-clean">' + D.timeline.map(function (t) { return "<li><strong>" + esc(t.phase) + ":</strong> " + esc(t.label) + ' <span style="color:var(--ink-muted)">(' + esc(t.date) + ")</span></li>"; }).join("") + "</ul>"; } },
      { t: "Next steps", h: function () { return '<ul class="list-clean">' + D.nextSteps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; } },
    ];
  }
  function renderInfo() {
    $("#infoMount").innerHTML = '<div class="sec-title">The case</div>' + infoSections().map(function (s, i) { return '<div class="acc" data-acc="' + i + '"><button class="acc__head">' + esc(s.t) + '<span class="caret">›</span></button><div class="acc__body">' + s.h() + "</div></div>"; }).join("");
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
      if (item.type === "site") return field(item, choiceRow(item.id, (D.sites || []).map(function (s) { return s.city || clean(s.name); })));
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
  function submitSurvey(form) {
    var payload = { _submittedFrom: "mobile", client: CFG.clientName };
    Array.prototype.forEach.call(form.querySelectorAll("[data-q]"), function (el) { var id = el.getAttribute("data-q"); if (el.classList.contains("choice-row")) { var sel = el.querySelector(".is-sel"); payload[id] = sel ? sel.dataset.val : ""; } else if (el.classList.contains("rank-list")) { payload[id] = rankState ? rankState.join(" > ") : ""; } else payload[id] = el.value; });
    var toast = $("#surveyToast"), mode = CFG.survey.mode, url = CFG.survey.endpoint;
    if (!mode || !url) { toast.className = "toast toast--ok"; toast.innerHTML = "Recorded locally (no backend configured yet).<br><strong>Priorities:</strong> " + esc(payload.priority || "—"); return; }
    toast.className = "toast"; toast.textContent = "Submitting…";
    var opts = (mode === "formspree") ? { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) } : { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) };
    fetch(url, opts).then(function () { toast.className = "toast toast--ok"; toast.innerHTML = "Thank you — sent to the deal team. ✓"; form.querySelector(".btn").disabled = true; }).catch(function () { toast.className = "toast toast--err"; toast.textContent = "Couldn't reach the server. Please try again."; });
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
    LDR.savePatch(STORAGE_KEY, patch); userLoaded = true; D = LDR.apply(BASE, patch);
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
