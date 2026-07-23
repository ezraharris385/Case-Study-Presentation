/* ============================================================
   CockpitLoader — parse uploaded data files (CSV / XLSX / GeoJSON),
   map them to the cockpit data model, merge over the sample, and
   persist per build. Depends on Papa (CSV) and XLSX (SheetJS) globals.
   ============================================================ */
window.CockpitLoader = (function () {
  "use strict";

  function norm(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function num(v) {
    if (v == null || v === "") return undefined;
    if (typeof v === "number") return isNaN(v) ? undefined : v;
    var m = String(v).replace(/[, $%'"]/g, "").replace(/[^0-9.\-]/g, "");
    if (m === "" || m === "-" || m === ".") return undefined;
    var n = parseFloat(m); return isNaN(n) ? undefined : n;
  }
  function splitList(v) {
    if (v == null || v === "") return [];
    if (Array.isArray(v)) return v;
    return String(v).split(/[;|]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function headerMap(row) { var m = {}; Object.keys(row).forEach(function (k) { m[norm(k)] = k; }); return m; }
  function pick(row, hm, aliases) {
    for (var i = 0; i < aliases.length; i++) {
      var key = hm[aliases[i]];
      if (key !== undefined) { var v = row[key]; if (v !== "" && v != null) return v; }
    }
    return undefined;
  }
  function hasAny(hm, aliases) { return aliases.some(function (a) { return hm[a] !== undefined; }); }

  var LAT = ["lat", "latitude", "y", "ycoord", "ylat"];
  var LNG = ["lng", "lon", "long", "longitude", "x", "xcoord", "xlong"];
  var A = {
    tier: ["tier", "category", "group", "list", "shortlist"],
    name: ["name", "site", "sitename", "property", "propertyname", "building", "label", "address"],
    city: ["city", "municipality", "town", "place"],
    submarket: ["submarket", "market", "corridor", "area", "subarea", "region"],
    status: ["status", "buildingstatus", "availability", "type"],
    sizeSF: ["sizesf", "size", "sf", "squarefeet", "rsf", "buildingsize", "totalsf", "buildingsf"],
    clearHeight: ["clearheight", "clear", "height", "clearht"],
    dockDoors: ["dockdoors", "docks", "dockdoorcount", "doors", "dockcount"],
    trailerParking: ["trailerparking", "trailerstalls", "trailer", "trailerstall"],
    power: ["power", "electrical", "mw", "powercapacity", "electricalcapacity", "kw"],
    coldReady: ["coldready", "coldreadiness", "coldstorage", "freezer", "freezerready", "refrigerated"],
    refrigeration: ["refrigeration", "refrig", "ammonia", "refrigerant"],
    rentNNN: ["rentnnn", "rent", "askingrent", "nnn", "baserent", "rentpersf", "askingrate", "rate"],
    opex: ["opex", "taxescam", "operatingexpenses", "nnnexpenses", "tmi", "expenses"],
    expansion: ["expansion", "expandable", "expansionpotential", "expansionland"],
    criteriaScore: ["criteriascore", "score", "overallscore", "totalscore", "weightedscore", "finalscore", "rating"],
    pop10mi: ["pop10mi", "population10mi", "pop10", "population", "pop", "totalpopulation"],
    workforce: ["workforce", "warehouseworkforce", "laborforce", "laborpool", "employment"],
    avgWage: ["avgwage", "wage", "averagewage", "meanwage", "medianwage", "hourlywage"],
    unemployment: ["unemployment", "unemploymentrate", "unemp"],
    pros: ["pros", "strengths", "advantages", "positives"],
    cons: ["cons", "watchouts", "weaknesses", "risks", "concerns", "negatives"],
    whyOut: ["whyout", "whynot", "reasondropped", "reasonout", "whyeliminated", "droppedbecause", "reason"],
    note: ["note", "notes", "comment", "comments", "remarks"],
  };
  var SCORE = {
    power: ["scorepower", "powerscore"], labor: ["scorelabor", "laborscore"],
    access: ["scoreaccess", "accessscore", "logisticsscore", "logistics"],
    cost: ["scorecost", "costscore"],
    building: ["scorebuilding", "buildingscore", "suitabilityscore"],
    reach: ["scorereach", "reachscore", "marketreachscore"],
  };
  var DEMO_METRIC_KEYS = ["population", "pop", "totalpopulation", "medianincome", "income", "households", "medianage", "laborforce"];

  function isAltTier(v) {
    if (v == null) return false;
    var n = norm(v);
    return n.indexOf("alt") > -1 || n.indexOf("also") > -1 || n.indexOf("consider") > -1 ||
           n.indexOf("backup") > -1 || n.indexOf("drop") > -1 || n.indexOf("elimin") > -1 || n.indexOf("out") > -1;
  }

  function mapSiteRow(row, i) {
    var hm = headerMap(row);
    var name = pick(row, hm, A.name) || ("Site " + (i + 1));
    var s = { id: norm(name) || ("site" + i), tier: isAltTier(pick(row, hm, A.tier)) ? "alt" : "primary", name: name,
      city: pick(row, hm, A.city) || "", submarket: pick(row, hm, A.submarket) || "" };
    var lat = num(pick(row, hm, LAT)), lng = num(pick(row, hm, LNG));
    if (lat != null && lng != null) s.coords = [lat, lng];
    ["status", "clearHeight", "power", "coldReady", "refrigeration", "expansion", "whyOut", "note"].forEach(function (k) {
      var v = pick(row, hm, A[k]); if (v != null) s[k] = v;
    });
    ["sizeSF", "dockDoors", "trailerParking", "rentNNN", "opex", "criteriaScore"].forEach(function (k) {
      var v = num(pick(row, hm, A[k])); if (v != null) s[k] = v;
    });
    var scores = {}, any = false;
    Object.keys(SCORE).forEach(function (k) { var v = num(pick(row, hm, SCORE[k])); if (v != null) { scores[k] = v; any = true; } });
    if (any) s.scores = scores;
    var labor = {};
    var p = num(pick(row, hm, A.pop10mi)); if (p != null) labor.pop10mi = p;
    var w = num(pick(row, hm, A.workforce)); if (w != null) labor.workforce = w;
    var wg = pick(row, hm, A.avgWage); if (wg != null) labor.avgWage = wg;
    var un = pick(row, hm, A.unemployment); if (un != null) labor.unemployment = un;
    if (Object.keys(labor).length) s.labor = labor;
    var pros = splitList(pick(row, hm, A.pros)); if (pros.length) s.pros = pros;
    var cons = splitList(pick(row, hm, A.cons)); if (cons.length) s.cons = cons;
    return s;
  }

  function mapDemoRow(row, i) {
    var hm = headerMap(row);
    var lat = num(pick(row, hm, LAT)), lng = num(pick(row, hm, LNG));
    var name = pick(row, hm, ["name", "label", "area", "tract", "zip", "zipcode", "geoid", "neighborhood", "place", "community"]) || ("Area " + (i + 1));
    var skip = {}; LAT.concat(LNG).forEach(function (a) { skip[a] = 1; });
    var metrics = {};
    Object.keys(row).forEach(function (k) { if (skip[norm(k)]) return; var v = num(row[k]); if (v != null) metrics[k] = v; });
    var o = { name: name, metrics: metrics };
    if (lat != null && lng != null) o.coords = [lat, lng];
    return o;
  }

  function mapReqRows(rows) {
    var reqs = [], deal = [];
    rows.forEach(function (row) {
      var hm = headerMap(row);
      var label = pick(row, hm, ["label", "field", "requirement", "need", "item", "attribute", "name", "category", "criterion"]);
      var value = pick(row, hm, ["value", "detail", "spec", "description", "target", "requirement"]);
      var type = norm(pick(row, hm, ["type", "kind", "flag"]) || "");
      if (label == null && value == null) return;
      if (type.indexOf("deal") > -1 || type.indexOf("breaker") > -1 || type.indexOf("noneg") > -1 || type.indexOf("must") > -1)
        deal.push(value || label);
      else reqs.push({ label: label || "", value: value || "" });
    });
    return { requirements: reqs, dealBreakers: deal };
  }

  function pickDemoMetric(points, geojson) {
    var keys = {};
    if (points) points.forEach(function (p) { Object.keys(p.metrics || {}).forEach(function (k) { keys[k] = 1; }); });
    if (geojson && geojson.features) geojson.features.forEach(function (f) { Object.keys(f.properties || {}).forEach(function (k) { if (typeof f.properties[k] === "number") keys[k] = 1; }); });
    var all = Object.keys(keys);
    for (var i = 0; i < DEMO_METRIC_KEYS.length; i++) {
      var want = DEMO_METRIC_KEYS[i];
      for (var j = 0; j < all.length; j++) if (norm(all[j]) === want || norm(all[j]).indexOf(want) > -1) return all[j];
    }
    return all[0] || null;
  }

  /* ---- detection ---- */
  function detectTable(rows) {
    if (!rows || !rows.length) return "requirements";
    var hm = headerMap(rows[0]);
    var latlng = hasAny(hm, LAT) && hasAny(hm, LNG);
    var siteish = hasAny(hm, A.rentNNN) || hasAny(hm, A.sizeSF) || hasAny(hm, A.criteriaScore) || hasAny(hm, A.submarket) || hasAny(hm, A.coldReady);
    var demoish = hasAny(hm, ["population", "pop", "totalpopulation", "medianincome", "income", "households", "medianage", "laborforce"]);
    if (latlng && siteish) return "sites";
    if (latlng && demoish) return "demographics";
    if (latlng) return "demographics";
    if (siteish) return "sites";
    return "requirements";
  }

  /* ---- file reading ---- */
  function readText(file) { return file.text ? file.text() : new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsText(file); }); }
  function readBuf(file) { return file.arrayBuffer ? file.arrayBuffer() : new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsArrayBuffer(file); }); }

  function parseFile(file) {
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext === "geojson" || ext === "json") {
      return readText(file).then(function (t) {
        var j = JSON.parse(t);
        if (j && (j.type === "FeatureCollection" || j.features)) return { format: "geojson", geojson: j, name: file.name };
        // plain JSON array of rows
        var rows = Array.isArray(j) ? j : (j.rows || []);
        return { format: "table", rows: rows, name: file.name };
      });
    }
    if (ext === "xlsx" || ext === "xls") {
      return readBuf(file).then(function (buf) {
        if (typeof XLSX === "undefined") throw new Error("Excel parser not loaded");
        var wb = XLSX.read(buf, { type: "array" });
        var ws = wb.Sheets[wb.SheetNames[0]];
        return { format: "table", rows: XLSX.utils.sheet_to_json(ws, { defval: "" }), name: file.name };
      });
    }
    return readText(file).then(function (t) {
      if (typeof Papa === "undefined") throw new Error("CSV parser not loaded");
      var res = Papa.parse(t.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy" });
      return { format: "table", rows: res.data, name: file.name };
    });
  }

  /* Parse a file and attach a detected type + a human summary (for the upload UI). */
  function inspect(file) {
    return parseFile(file).then(function (parsed) {
      var type = parsed.format === "geojson" ? "demographics" : detectTable(parsed.rows);
      var count = parsed.format === "geojson" ? ((parsed.geojson.features || []).length) : (parsed.rows || []).length;
      return { file: file, name: file.name, parsed: parsed, type: type, count: count };
    });
  }

  /* Build a combined patch from inspected items (each may carry an overridden .type). */
  function buildPatch(items) {
    var patch = {};
    items.forEach(function (it) {
      var p = it.parsed, type = it.type;
      if (p.format === "geojson") { patch.demographics = { geojson: p.geojson }; return; }
      var rows = p.rows || [];
      if (type === "sites") {
        var sites = rows.map(mapSiteRow).filter(function (s) { return s.coords || s.name; });
        patch.sites = sites.filter(function (s) { return s.tier === "primary"; });
        patch.alsoConsidered = sites.filter(function (s) { return s.tier === "alt"; });
      } else if (type === "demographics") {
        patch.demographics = { points: rows.map(mapDemoRow).filter(function (x) { return x.coords; }) };
      } else {
        patch.needs = mapReqRows(rows);
      }
    });
    if (patch.demographics) {
      patch.demographics.metric = pickDemoMetric(patch.demographics.points, patch.demographics.geojson);
    }
    return patch;
  }

  function mergePatches(base, extra) {
    var out = {};
    Object.keys(base || {}).forEach(function (k) { out[k] = base[k]; });
    Object.keys(extra || {}).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  /* Merge a patch over the base CASE_DATA -> new data object. */
  function apply(base, patch) {
    var d = JSON.parse(JSON.stringify(base));
    patch = patch || {};
    if (patch.sites && patch.sites.length) d.sites = patch.sites;
    if (patch.alsoConsidered) d.alsoConsidered = patch.alsoConsidered;
    if (patch.demographics) d.demographics = patch.demographics;
    if (patch.needs) {
      d.needs = d.needs || {};
      if (patch.needs.requirements && patch.needs.requirements.length) d.needs.requirements = patch.needs.requirements;
      if (patch.needs.dealBreakers && patch.needs.dealBreakers.length) d.needs.dealBreakers = patch.needs.dealBreakers;
      if (String(d.needs.summary || "").indexOf("SAMPLE") === 0) d.needs.summary = "";
    }
    if (patch.sites || patch.demographics || patch.needs) d.sampleData = false;
    d._loaded = !!(patch.sites || patch.demographics || patch.needs);
    return d;
  }

  function summarize(patch) {
    var bits = [];
    if (patch.sites) bits.push(patch.sites.length + " finalist site" + (patch.sites.length === 1 ? "" : "s"));
    if (patch.alsoConsidered && patch.alsoConsidered.length) bits.push(patch.alsoConsidered.length + " also-considered");
    if (patch.demographics) {
      if (patch.demographics.points) bits.push(patch.demographics.points.length + " demographic areas");
      else if (patch.demographics.geojson) bits.push(((patch.demographics.geojson.features || []).length) + " demographic polygons");
    }
    if (patch.needs && patch.needs.requirements) bits.push(patch.needs.requirements.length + " requirements");
    return bits.length ? bits.join(" · ") : "no recognizable data";
  }

  /* localStorage persistence (per-build key). */
  function savePatch(key, patch) { try { localStorage.setItem(key, JSON.stringify(patch)); } catch (e) {} }
  function loadPatch(key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function clearPatch(key) { try { localStorage.removeItem(key); } catch (e) {} }

  return {
    parseFile: parseFile, inspect: inspect, detectTable: detectTable,
    buildPatch: buildPatch, mergePatches: mergePatches, apply: apply, summarize: summarize,
    savePatch: savePatch, loadPatch: loadPatch, clearPatch: clearPatch, pickDemoMetric: pickDemoMetric,
  };
})();
