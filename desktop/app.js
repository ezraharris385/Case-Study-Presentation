/* ===== Cold-Chain Site Cockpit — desktop app ===== */
(function () {
  "use strict";
  var CFG = window.CASE_CONFIG, D = window.CASE_DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var css = function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); };
  var money = function (n) { return "$" + Math.round(n).toLocaleString(); };
  var moneyM = function (n) { return "$" + (n / 1e6).toFixed(1) + "M"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };

  /* ---------- Branding + chrome ---------- */
  $("#firmName").textContent = CFG.firmName;
  $("#engLine").textContent = CFG.engagementLine;
  $("#clientPill").textContent = CFG.clientName;
  $("#asOf").textContent = "As of " + CFG.asOfDate;
  document.title = CFG.clientName + " — Site Cockpit";
  if (D.sampleData) $("#sampleBanner").hidden = false;

  /* ---------- Theme ---------- */
  var themeToggle = $("#themeToggle");
  var saved = null;
  try { saved = localStorage.getItem("cockpit-theme"); } catch (e) {}
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  function currentDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  themeToggle.addEventListener("click", function () {
    var next = currentDark() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("cockpit-theme", next); } catch (e) {}
    swapTiles();
    restyleVectors();
  });

  /* ---------- Map ---------- */
  var map = L.map("map", {
    center: CFG.map.center, zoom: CFG.map.zoom,
    minZoom: CFG.map.minZoom, maxZoom: CFG.map.maxZoom,
    zoomControl: true, scrollWheelZoom: true,
  });
  var tileLayer = null;
  function swapTiles() {
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(currentDark() ? CFG.map.tilesDark : CFG.map.tilesLight, {
      attribution: CFG.map.attribution, maxZoom: CFG.map.maxZoom, detectRetina: true,
    }).addTo(map);
  }
  swapTiles();

  var layers = {
    sites: L.layerGroup().addTo(map),
    rings: L.layerGroup().addTo(map),
    nodes: L.layerGroup().addTo(map),
    labor: L.layerGroup(),
    alt: L.layerGroup(),
  };
  var vectorRefs = { rings: [], labor: [] };

  function siteIcon(i) {
    return L.divIcon({ className: "", iconSize: [30, 30], iconAnchor: [15, 28],
      html: '<div class="mk mk--site"><span>' + (i + 1) + "</span></div>" });
  }
  function altIcon() {
    return L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11],
      html: '<div class="mk mk--alt">◇</div>' });
  }
  function nodeIcon() {
    return L.divIcon({ className: "", iconSize: [16, 16], iconAnchor: [8, 8],
      html: '<div class="mk mk--node"></div>' });
  }

  // Finalist sites + reach rings
  D.sites.forEach(function (s, i) {
    L.marker(s.coords, { icon: siteIcon(i), title: s.name })
      .on("click", function () { openSite(s); })
      .bindTooltip(s.name.replace(/^SAMPLE — /, ""), { direction: "top", offset: [0, -24] })
      .addTo(layers.sites);
    var ring = L.circle(s.coords, {
      radius: CFG.map.reachMiles * 1609.34, color: css("--ring-color"),
      weight: 1.5, opacity: 0.7, fillColor: css("--ring-color"), fillOpacity: 0.06,
    });
    vectorRefs.rings.push(ring); ring.addTo(layers.rings);
    var labor = L.circle(s.coords, {
      radius: 20 * 1609.34, color: css("--labor-color"),
      weight: 1, dashArray: "4 4", opacity: 0.7, fillColor: css("--labor-color"), fillOpacity: 0.05,
    });
    vectorRefs.labor.push(labor); labor.addTo(layers.labor);
  });

  // Also-considered
  (D.alsoConsidered || []).forEach(function (s) {
    L.marker(s.coords, { icon: altIcon(), title: s.name })
      .on("click", function () { openAlt(s); })
      .bindTooltip(s.name.replace(/^SAMPLE — /, ""), { direction: "top" })
      .addTo(layers.alt);
  });

  // Logistics nodes
  (D.nodes || []).forEach(function (n) {
    L.marker(n.coords, { icon: nodeIcon() })
      .bindTooltip('<span class="node-tip">' + esc(n.name) + "</span>", { direction: "top", offset: [0, -6] })
      .addTo(layers.nodes);
  });

  function restyleVectors() {
    vectorRefs.rings.forEach(function (r) { r.setStyle({ color: css("--ring-color"), fillColor: css("--ring-color") }); });
    vectorRefs.labor.forEach(function (r) { r.setStyle({ color: css("--labor-color"), fillColor: css("--labor-color") }); });
  }

  // Fit map to finalists
  var bounds = L.latLngBounds(D.sites.map(function (s) { return s.coords; }));
  map.fitBounds(bounds.pad(0.35));

  // Layer toggles
  function bindLayer(id, grp) {
    var cb = $(id);
    cb.addEventListener("change", function () { cb.checked ? grp.addTo(map) : map.removeLayer(grp); });
  }
  bindLayer("#lyr-sites", layers.sites);
  bindLayer("#lyr-rings", layers.rings);
  bindLayer("#lyr-nodes", layers.nodes);
  bindLayer("#lyr-labor", layers.labor);
  bindLayer("#lyr-alt", layers.alt);

  /* ---------- Drawer ---------- */
  var drawer = $("#drawer"), drawerBody = $("#drawerBody");
  function openDrawer(html) { drawerBody.innerHTML = html; drawer.hidden = false; drawerBody.scrollTop = 0; }
  function closeDrawer() { drawer.hidden = true; setActiveNav("map"); }
  $("#drawerClose").addEventListener("click", closeDrawer);

  function scoreBars(scores) {
    return D.criteria.map(function (c) {
      var v = (scores && scores[c.key] != null) ? scores[c.key] : 0;
      return '<div class="score-row"><span>' + esc(c.label) + '</span>' +
        '<span class="score-track"><span class="score-fill" style="width:' + v + '%"></span></span>' +
        '<span class="score-val num">' + v + "</span></div>";
    }).join("");
  }

  function openSite(s) {
    setActiveNav("sites");
    var drive = (s.drive || []).map(function (d) {
      return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + " mi</td><td class=\"num\">" + d.min + " min</td></tr>";
    }).join("");
    var inc = (s.incentives || []).map(function (x) { return '<span class="pill pill--accent">' + esc(x) + "</span>"; }).join(" ");
    var pros = (s.pros || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    var cons = (s.cons || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    openDrawer(
      '<div class="d-eyebrow eyebrow">Finalist site</div>' +
      '<h2 class="d-title">' + esc(s.name.replace(/^SAMPLE — /, "")) + "</h2>" +
      '<div class="d-sub">' + esc(s.city) + " · " + esc(s.submarket) + "</div>" +
      '<div class="score-head"><span class="score-big num">' + (s.criteriaScore || "–") + '</span><span class="eyebrow">criteria score / 100</span></div>' +
      scoreBars(s.scores) +
      '<div class="d-section"><h4>Building &amp; site</h4><dl class="kv">' +
        kv("Status", s.status) + kv("Size", (s.sizeSF ? s.sizeSF.toLocaleString() + " SF" : "—")) +
        kv("Clear height", s.clearHeight) + kv("Dock doors", s.dockDoors) +
        kv("Trailer parking", s.trailerParking) + kv("Power", s.power) +
        kv("Cold-readiness", s.coldReady) + kv("Refrigeration", s.refrigeration) +
        kv("Rent (NNN)", s.rentNNN ? "$" + s.rentNNN.toFixed(2) + " /SF" : "—") +
        kv("Opex", s.opex ? "$" + s.opex.toFixed(2) + " /SF" : "—") +
        kv("Expansion", s.expansion) +
      "</dl></div>" +
      '<div class="d-section"><h4>Drive distances</h4><table class="table"><thead><tr><th>Node</th><th class="num">Dist</th><th class="num">Time</th></tr></thead><tbody>' + drive + "</tbody></table></div>" +
      '<div class="d-section"><h4>Labor shed</h4><dl class="kv">' +
        kv("Pop. within 10 mi", s.labor && s.labor.pop10mi ? s.labor.pop10mi.toLocaleString() : "—") +
        kv("Warehouse workforce", s.labor && s.labor.workforce ? s.labor.workforce.toLocaleString() : "—") +
        kv("Avg wage", s.labor && s.labor.avgWage) + kv("Unemployment", s.labor && s.labor.unemployment) +
      "</dl></div>" +
      '<div class="d-section"><h4>Incentives</h4><div class="chips">' + (inc || "—") + "</div></div>" +
      '<div class="d-section"><h4>Assessment</h4><div class="prosCons">' +
        '<div><div class="pc-label pc-label--pro">Strengths</div><ul>' + pros + "</ul></div>" +
        '<div><div class="pc-label pc-label--con">Watch-outs</div><ul>' + cons + "</ul></div>" +
      "</div></div>"
    );
    map.setView(s.coords, 11, { animate: true });
  }

  function openAlt(s) {
    openDrawer(
      '<div class="d-eyebrow eyebrow">Also considered</div>' +
      '<h2 class="d-title">' + esc(s.name.replace(/^SAMPLE — /, "")) + "</h2>" +
      '<div class="d-sub">' + esc(s.city) + " · " + esc(s.submarket) + "</div>" +
      '<dl class="kv">' + kv("Size", s.sizeSF ? s.sizeSF.toLocaleString() + " SF" : "—") +
      kv("Rent (NNN)", s.rentNNN ? "$" + s.rentNNN.toFixed(2) + " /SF" : "—") + "</dl>" +
      '<div class="d-section"><h4>Why it didn\'t make the shortlist</h4><p class="panel-lead">' + esc(s.whyOut) + "</p></div>"
    );
    map.setView(s.coords, 10, { animate: true });
  }
  function kv(k, v) { return "<dt>" + esc(k) + "</dt><dd>" + esc(v == null ? "—" : v) + "</dd>"; }

  /* ---------- Section views ---------- */
  var views = {
    needs: function () {
      var reqs = D.needs.requirements.map(function (r) { return "<tr><td>" + esc(r.label) + "</td><td>" + esc(r.value) + "</td></tr>"; }).join("");
      var db = (D.needs.dealBreakers || []).map(function (x) { return '<span class="pill pill--warn">' + esc(x) + "</span>"; }).join(" ");
      return head("Client needs", "From the initial conversation") +
        '<p class="panel-lead">' + esc(D.needs.summary) + "</p>" +
        '<table class="table"><tbody>' + reqs + "</tbody></table>" +
        '<div class="d-section"><h4>Non-negotiables</h4><div class="chips">' + db + "</div></div>";
    },
    swot: function () {
      function cell(cls, title, arr) {
        return '<div class="quad__cell ' + cls + '"><h5>' + title + "</h5><ul>" +
          arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
      }
      return head("SWOT", "Strategic read on the engagement") +
        '<div class="quad">' + cell("quad--s", "Strengths", D.swot.strengths) + cell("quad--w", "Weaknesses", D.swot.weaknesses) +
        cell("quad--o", "Opportunities", D.swot.opportunities) + cell("quad--t", "Threats", D.swot.threats) + "</div>";
    },
    market: function () {
      var stats = D.market.stats.map(function (s) {
        return '<div class="stat"><div class="stat__val num">' + esc(s.value) + '</div><div class="stat__lbl">' + esc(s.label) + "</div></div>";
      }).join("");
      return head("Chicago industrial market", esc(D.market.headline)) +
        '<div class="stat-grid">' + stats + "</div>" +
        '<p class="panel-lead">' + esc(D.market.note) + "</p>" +
        '<p class="form-note">Source: ' + esc(D.market.source) + "</p>";
    },
    sites: function () {
      var cards = D.sites.map(function (s, i) {
        return '<button class="stat" style="text-align:left;cursor:pointer;width:100%;margin-bottom:8px" data-site="' + i + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline"><strong>' + (i + 1) + ". " + esc(s.name.replace(/^SAMPLE — /, "")) + '</strong>' +
          '<span class="score-big num" style="font-size:1.4rem">' + (s.criteriaScore || "–") + "</span></div>" +
          '<div class="stat__lbl">' + esc(s.city) + " · " + esc(s.submarket) + " · $" + (s.rentNNN || 0).toFixed(2) + " NNN</div></button>";
      }).join("");
      return head("Site detail", "Tap a site to open its full profile (or a pin on the map)") + cards;
    },
    drive: function () {
      var blocks = D.sites.map(function (s, i) {
        var rows = (s.drive || []).map(function (d) { return '<tr><td>' + esc(d.node) + '</td><td class="num">' + d.miles + ' mi</td><td class="num">' + d.min + ' min</td></tr>'; }).join("");
        return '<div class="d-section"><h4>' + (i + 1) + ". " + esc(s.name.replace(/^SAMPLE — /, "")) + '</h4>' +
          '<table class="table"><thead><tr><th>Node</th><th class="num">Dist</th><th class="num">Drive</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
      }).join("");
      return head("Drive distances", "To intermodal, air-freight, downtown & interstates") + blocks;
    },
    labor: function () {
      var rows = D.sites.map(function (s, i) {
        var l = s.labor || {};
        return "<tr><td>" + (i + 1) + ". " + esc(s.city) + "</td><td class=\"num\">" + (l.pop10mi ? l.pop10mi.toLocaleString() : "—") +
          "</td><td class=\"num\">" + (l.workforce ? l.workforce.toLocaleString() : "—") + "</td><td class=\"num\">" + esc(l.avgWage || "—") +
          "</td><td class=\"num\">" + esc(l.unemployment || "—") + "</td></tr>";
      }).join("");
      return head("Labor forces", "Workforce within reach of each finalist") +
        '<table class="table"><thead><tr><th>Site</th><th class="num">Pop 10mi</th><th class="num">WH workforce</th><th class="num">Avg wage</th><th class="num">Unemp.</th></tr></thead><tbody>' + rows + "</tbody></table>" +
        '<p class="form-note">Toggle the “Labor shed” layer on the map for the ~20-mile draw area.</p>';
    },
    criteria: function () {
      var rows = D.criteria.map(function (c) {
        var cells = D.sites.map(function (s) {
          var v = (s.scores && s.scores[c.key] != null) ? s.scores[c.key] : 0;
          return '<td class="num">' + v + "</td>";
        }).join("");
        return "<tr><td>" + esc(c.label) + "</td>" + cells + "</tr>";
      }).join("");
      var heads = D.sites.map(function (s, i) { return '<th class="num">' + (i + 1) + "</th>"; }).join("");
      var totals = D.sites.map(function (s) { return '<td class="num"><strong>' + (s.criteriaScore || "–") + "</strong></td>"; }).join("");
      return head("Criteria scores", "Per-site scorecard (sites keyed 1–" + D.sites.length + " on the map)") +
        '<table class="table"><thead><tr><th>Criterion</th>' + heads + "</tr></thead><tbody>" + rows +
        '<tr><td><strong>Overall</strong></td>' + totals + "</tr></tbody></table>" +
        '<p class="form-note">' + D.sites.map(function (s, i) { return (i + 1) + " = " + esc(s.city); }).join(" · ") + "</p>";
    },
    lease: function () {
      var rows = D.leaseTerms.terms.map(function (t) { return "<tr><td>" + esc(t.label) + "</td><td>" + esc(t.value) + "</td></tr>"; }).join("");
      return head("Key lease terms", esc(D.leaseTerms.summary)) + '<table class="table"><tbody>' + rows + "</tbody></table>";
    },
    tco: function () {
      var yrs = D.tcoAssumptions.termYears;
      var palette = { rent: css("--accent"), opex: css("--navy"), power: css("--warn"), labor: css("--ink-muted"), ti: css("--site-alt") };
      function compute(s) {
        var t = s.tco || {}, sf = s.sizeSF || 0;
        var rent = (t.rentPerSF || 0) * sf * yrs, opex = (t.opexPerSF || 0) * sf * yrs,
            power = (t.powerPerSF || 0) * sf * yrs, labor = (t.laborAnnual || 0) * yrs, ti = (t.tiPerSF || 0) * sf;
        var gross = rent + opex + power + labor + ti;
        var net = gross - (t.incentivesTotal || 0);
        return { rent: rent, opex: opex, power: power, labor: labor, ti: ti, gross: gross, inc: t.incentivesTotal || 0, net: net };
      }
      var comps = D.sites.map(compute);
      var maxGross = Math.max.apply(null, comps.map(function (c) { return c.gross; }));
      var blocks = D.sites.map(function (s, i) {
        var c = comps[i];
        function seg(k, color) { return '<i style="width:' + (c[k] / c.gross * 100) + "%;background:" + color + '"></i>'; }
        return '<div class="d-section"><h4>' + (i + 1) + ". " + esc(s.name.replace(/^SAMPLE — /, "")) + "</h4>" +
          '<div class="stack" style="width:' + (c.gross / maxGross * 100) + '%">' +
          seg("rent", palette.rent) + seg("opex", palette.opex) + seg("power", palette.power) + seg("labor", palette.labor) + seg("ti", palette.ti) + "</div>" +
          '<dl class="kv" style="grid-template-columns:150px 1fr">' +
          kv("Gross " + yrs + "-yr", moneyM(c.gross)) + kv("Incentives", "− " + moneyM(c.inc)) +
          "<dt><strong>Net " + yrs + "-yr TCO</strong></dt><dd><strong>" + moneyM(c.net) + "</strong></dd></dl></div>";
      }).join("");
      return head("Incentives & TCO", esc(D.tcoAssumptions.note)) +
        '<div class="stack-legend">' +
          '<span><i style="background:' + palette.rent + '"></i>Rent</span>' +
          '<span><i style="background:' + palette.opex + '"></i>Opex/tax</span>' +
          '<span><i style="background:' + palette.power + '"></i>Power</span>' +
          '<span><i style="background:' + palette.labor + '"></i>Labor</span>' +
          '<span><i style="background:' + palette.ti + '"></i>Fit-out</span></div>' + blocks;
    },
    timeline: function () {
      var items = D.timeline.map(function (t) {
        return '<li class="' + (t.status === "done" ? "done" : t.status === "active" ? "active" : "") + '">' +
          '<div class="tl__phase">' + esc(t.phase) + '</div><div class="tl__label">' + esc(t.label) + '</div><div class="tl__date">' + esc(t.date) + "</div></li>";
      }).join("");
      return head("Deliverable timeline", "Path from today to occupancy") + '<ul class="tl">' + items + "</ul>";
    },
    next: function () {
      var items = D.nextSteps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
      return head("Next steps", "What we do coming out of this meeting") + '<ul class="list-clean">' + items + "</ul>";
    },
    survey: function () { return surveyHTML(); },
  };
  function head(title, sub) {
    return '<div class="d-eyebrow eyebrow">Component</div><h2 class="d-title">' + esc(title) + "</h2><div class=\"d-sub\">" + esc(sub) + "</div>";
  }

  /* ---------- Survey ---------- */
  var rankState = null;
  function surveyHTML() {
    var q = D.survey;
    var fields = q.questions.map(function (item) {
      if (item.type === "text") return field(item, '<input type="text" data-q="' + item.id + '" placeholder="' + esc(item.placeholder || "") + '">');
      if (item.type === "textarea") return field(item, '<textarea data-q="' + item.id + '" placeholder="' + esc(item.placeholder || "") + '"></textarea>');
      if (item.type === "choice") return field(item, choiceRow(item.id, item.options));
      if (item.type === "site") return field(item, choiceRow(item.id, D.sites.map(function (s) { return s.city; })));
      if (item.type === "rank") { rankState = item.options.slice(); return field(item, '<ul class="rank-list" data-q="' + item.id + '" id="rankList"></ul>'); }
      return "";
    }).join("");
    return head("Take-home survey", esc(q.intro)) + '<form id="surveyForm">' + fields +
      '<button type="submit" class="btn">Submit priorities</button>' +
      '<p class="form-note">' + esc(CFG.survey.consentNote) + "</p>" +
      '<div id="surveyToast"></div></form>';
  }
  function field(item, inner) {
    return '<div class="field"><label>' + esc(item.label) + (item.required ? ' <span style="color:var(--crit)">*</span>' : "") + "</label>" + inner + "</div>";
  }
  function choiceRow(id, opts) {
    return '<div class="choice-row" data-q="' + id + '">' + opts.map(function (o) {
      return '<button type="button" class="choice" data-val="' + esc(o) + '">' + esc(o) + "</button>";
    }).join("") + "</div>";
  }
  function renderRank() {
    var ul = $("#rankList"); if (!ul) return;
    ul.innerHTML = rankState.map(function (o, i) {
      return '<li data-i="' + i + '"><span class="rank-n num">' + (i + 1) + '</span><span>' + esc(o) + '</span>' +
        '<span class="rank-move"><button type="button" data-dir="-1" aria-label="Up">▲</button><button type="button" data-dir="1" aria-label="Down">▼</button></span></li>';
    }).join("");
  }

  // Delegated survey interactions
  document.addEventListener("click", function (e) {
    var choice = e.target.closest(".choice");
    if (choice) {
      var row = choice.parentElement;
      Array.prototype.forEach.call(row.children, function (c) { c.classList.remove("is-sel"); });
      choice.classList.add("is-sel"); return;
    }
    var mv = e.target.closest(".rank-move button");
    if (mv && rankState) {
      var li = mv.closest("li"), i = +li.dataset.i, dir = +mv.dataset.dir, j = i + dir;
      if (j >= 0 && j < rankState.length) { var t = rankState[i]; rankState[i] = rankState[j]; rankState[j] = t; renderRank(); }
    }
  });
  document.addEventListener("submit", function (e) {
    if (e.target.id !== "surveyForm") return;
    e.preventDefault();
    submitSurvey(e.target);
  });

  function collectSurvey(form) {
    var out = { _submittedFrom: "desktop", client: CFG.clientName };
    Array.prototype.forEach.call(form.querySelectorAll("[data-q]"), function (el) {
      var id = el.getAttribute("data-q");
      if (el.classList.contains("choice-row")) { var sel = el.querySelector(".is-sel"); out[id] = sel ? sel.dataset.val : ""; }
      else if (el.classList.contains("rank-list")) { out[id] = rankState ? rankState.join(" > ") : ""; }
      else out[id] = el.value;
    });
    return out;
  }
  function submitSurvey(form) {
    var payload = collectSurvey(form);
    var toast = $("#surveyToast");
    var mode = CFG.survey.mode, url = CFG.survey.endpoint;
    if (!mode || !url) {
      toast.className = "toast toast--ok";
      toast.innerHTML = "Recorded locally (no backend configured yet).<br><strong>Your priorities:</strong> " +
        esc(payload.priority || "—") + (payload.favorite ? "<br><strong>Leaning:</strong> " + esc(payload.favorite) : "");
      return;
    }
    toast.className = "toast"; toast.textContent = "Submitting…";
    var opts;
    if (mode === "formspree") opts = { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) };
    else opts = { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) };
    fetch(url, opts).then(function () {
      toast.className = "toast toast--ok"; toast.innerHTML = "Thank you — your priorities were sent to the deal team. ✓";
      form.querySelector(".btn").disabled = true;
    }).catch(function () {
      toast.className = "toast toast--err"; toast.textContent = "Couldn't reach the server. Please try again.";
    });
  }

  /* ---------- Nav ---------- */
  function setActiveNav(view) {
    Array.prototype.forEach.call(document.querySelectorAll(".navitem"), function (b) {
      b.classList.toggle("is-active", b.dataset.view === view);
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".navitem"), function (btn) {
    btn.addEventListener("click", function () {
      var v = btn.dataset.view;
      setActiveNav(v);
      if (v === "map") { closeDrawer(); return; }
      openDrawer(views[v] ? views[v]() : "");
      if (v === "survey" && rankState) renderRank();
    });
  });
  // delegate site cards inside "sites" view
  drawerBody.addEventListener("click", function (e) {
    var card = e.target.closest("[data-site]");
    if (card) openSite(D.sites[+card.dataset.site]);
  });

  // keyboard: Esc closes drawer
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !drawer.hidden) closeDrawer(); });
})();
