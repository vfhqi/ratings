/* dashboard.js: the PMS Per-stock Dashboard, version 1 (9-Oct-2026, Systems Architect, session 2).
   Built to Richard's choices of 9-Oct-2026 (decisions D-BB-11 to D-BB-33 in projects/SA - Position Management System/decisions.md):
   Treatment 4 with his seven additions; the Master Dashboard chart with the exit levels; Treatment B for volume under it on one time axis;
   the sell-side lines on one chart with a right-hand axis for a series of oddly larger range; Treatment C for peers; the valuation
   charts with the colour bands; the sliding overlay; the six-panel summary view. No profit and loss anywhere (Message 88; D-BB-28).
   READ, NEVER RECOMPUTE: every criterion reading, threshold, level and loss figure comes from the data file, which takes them from the
   Framework 14 reader. The page only draws, and decides colours ("met", "within reach", "clear") from the reader's own readings. */
(function () {
  'use strict';
  var C = {
    ink: '#1f2328', ink2: '#656d76', ink3: '#8b949e', border: '#d0d7de', grid: '#eaeef2', surface: '#ffffff', bg2: '#f6f8fa',
    stock: '#0969da', sector: '#bf3989', industry: '#1a7f37', price: '#1f2328', rel: '#0969da', ma: '#8b949e',
    red: '#cf222e', redFill: 'rgba(207,34,46,0.10)', amber: '#9a6700', neutral: '#8b949e', entry: '#8250df',
    eps: '#0969da', ebitda: '#bf3989', sales: '#1a7f37', tp: '#1f2328'
  };
  window.DC = C;
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(parent, x, y, s, attrs) { attrs = attrs || {}; var halo = attrs.halo; delete attrs.halo; var base = { x: x, y: y, 'font-size': 11, fill: C.ink2, 'font-family': 'Segoe UI, system-ui, sans-serif' }; for (var k in attrs) base[k] = attrs[k]; var t = el('text', base, parent); if (halo) { t.setAttribute('stroke', C.surface); t.setAttribute('stroke-width', 3); t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke-linejoin', 'round'); } t.textContent = s; return t; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function D(s) { return new Date(s + 'T00:00:00Z'); }
  function fmtD(s) { if (!s) return 'n/a'; var d = D(s); return d.getUTCDate() + '-' + MON[d.getUTCMonth()]; }
  function fmtDY(s) { if (!s) return 'n/a'; return fmtD(s) + '-' + D(s).getUTCFullYear(); }
  function addDays(s, n) { var d = D(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function pct0(v) { return v == null ? 'n/a' : Math.round(v * 100) + '%'; }
  function pctS(v) { return v == null ? 'n/a' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%'; }
  function sgn(v, dp) { return v == null ? 'n/a' : (v > 0 ? '+' : '') + v.toFixed(dp == null ? 1 : dp); }
  function ratingColor(g) { return { A: '#C0DD97', B: '#EAF3DE', C: '#FAEEDA', D: '#F5C4B3', F: '#F7C1C1' }[g] || '#eaeef2'; }
  function fmtVol(v) { if (v == null) return 'n/a'; var a = Math.abs(v); return a >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : a >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v)); }
  function lastOnOrBefore(arr, key, d) { var r = null; for (var i = 0; i < arr.length; i++) { if (arr[i][key] <= d) r = arr[i]; else break; } return r; }
  function monthTicks(d0, d1) { var out = [], a = D(d0), b = D(d1), y = a.getUTCFullYear(), m = a.getUTCMonth() + 1; for (;;) { if (m > 11) { m = 0; y++; } var t = new Date(Date.UTC(y, m, 1)); if (t > b) break; out.push(t.toISOString().slice(0, 10)); m++; } return out; }
  /* 9-Oct-2026 re-check: say so on the page when the readings are older than the last weekday, or a holding failed to build.
     The page never shows old readings as if they were current, and never drops a holding silently. */
  function warnBanner(M, name) {
    var out = [], now = new Date(), d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    do { d.setUTCDate(d.getUTCDate() - 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
    var prevWk = d.toISOString().slice(0, 10);
    if (M && M.asof && M.asof < prevWk) out.push('These readings are as at ' + fmtDY(M.asof) + ', older than the last weekday (' + fmtDY(prevWk) + '): the nightly update has not run since. Check the Framework 14 reader and this page\'s nightly job before acting on them.');
    if (M && M.failed && M.failed.length) out.push('No page could be built in the last update for: ' + M.failed.map(function (x) { return esc((M.failed_names || {})[x] || x); }).join(', ') + '. ' + (M.failed.length === 1 ? 'It is' : 'They are') + ' missing from the list below, not cleared.');
    return out.length ? '<div class="err">' + out.join('<br>') + '</div>' : '';
  }
  window.DU = { warnBanner: warnBanner, fmtD: fmtD, fmtDY: fmtDY, esc: esc, pctS: pctS, pct0: pct0, ratingColor: ratingColor, fmtVol: fmtVol };

  /* ------------------------------------------------------------------ a stacked time chart (SVG), one level deeper on hover */
  function stack(container, opts) {
    var W = opts.width || container.clientWidth || 900, L = opts.left || 48, R = opts.right == null ? 150 : opts.right, T = 14, gap = 24;
    var d0 = opts.d0, d1 = opts.d1;
    var H = opts.panels.reduce(function (a, p) { return a + p.h + gap; }, T) + 18;
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: 'display:block;max-width:100%;font-family:Segoe UI,system-ui,sans-serif' }, container);
    var span = D(d1) - D(d0) || 1;
    var x = function (s) { return L + (D(s) - D(d0)) / span * (W - L - R); };
    var y0 = T, ticks = monthTicks(d0, d1);
    opts.panels.forEach(function (p, pi) {
      var g = el('g', { transform: 'translate(0,' + y0 + ')' }, svg);
      var lo = p.yDomain[0], hi = p.yDomain[1], lo2 = p.yDomain2 ? p.yDomain2[0] : null, hi2 = p.yDomain2 ? p.yDomain2[1] : null;
      var y = function (v) { return p.h - (v - lo) / (hi - lo) * p.h; };
      var y2 = function (v) { return p.h - (v - lo2) / (hi2 - lo2) * p.h; };
      var yt = p.yTicks || [lo, (lo + hi) / 2, hi];
      yt.forEach(function (v) { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: C.grid, 'stroke-width': 1 }, g); txt(g, L - 6, Math.max(10, Math.min(p.h - 1, y(v) + 4)), (p.yFmt || String)(v), { 'text-anchor': 'end', 'font-size': 10, fill: C.ink3 }); });
      if (p.yDomain2) (p.yTicks2 || [lo2, (lo2 + hi2) / 2, hi2]).forEach(function (v) { txt(g, W - R + 4, Math.max(10, Math.min(p.h - 1, y2(v) + 4)), (p.yFmt2 || String)(v), { 'font-size': 10, fill: C.ink3 }); });
      ticks.forEach(function (t) { el('line', { x1: x(t), x2: x(t), y1: 0, y2: p.h, stroke: C.grid }, g); });
      (p.thresholds || []).forEach(function (th) {
        if (th.zone === 'below') el('rect', { x: L, y: y(th.v), width: W - L - R, height: Math.max(0, p.h - y(th.v)), fill: th.fill || C.redFill }, g);
        if (th.zone === 'above') el('rect', { x: L, y: 0, width: W - L - R, height: Math.max(0, y(th.v)), fill: th.fill || C.redFill }, g);
      });
      (p.markers || opts.markers || []).forEach(function (m, mi) { if (m.d < d0 || m.d > d1) return; el('line', { x1: x(m.d), x2: x(m.d), y1: 0, y2: p.h, stroke: m.color || C.entry, 'stroke-width': 1, 'stroke-dasharray': '3 3' }, g); if (pi === 0 && m.label) txt(g, x(m.d) + 3, 11 + 11 * (mi % 2), m.label, { fill: m.color || C.entry, 'font-size': 10, halo: true }); });
      p.series.forEach(function (s) {
        var yy = s.axis === 'right' ? y2 : y;
        var pts = s.pts.filter(function (q) { return q.v !== null && q.v !== undefined && q.d >= d0 && q.d <= d1; });
        if (s.kind === 'bar') { var bw = s.bw || 4; pts.forEach(function (q) { var a = yy(Math.min(q.v, s.cap || q.v)), z = yy(0); el('rect', { x: x(q.d) - bw / 2 + (s.off || 0), y: Math.min(a, z), width: bw, height: Math.abs(z - a) || 1, fill: s.color }, g); }); }
        else if (s.kind === 'dots') { pts.forEach(function (q) { el('circle', { cx: x(q.d), cy: yy(q.v), r: s.r || 3.5, fill: s.hollow ? C.surface : s.color, stroke: s.hollow ? s.color : C.surface, 'stroke-width': 1.5 }, g); }); }
        else if (pts.length) {
          var dp = ''; pts.forEach(function (q, i) { dp += (i ? 'L' : 'M') + x(q.d).toFixed(1) + ',' + yy(q.v).toFixed(1); });
          el('path', { d: dp, fill: 'none', stroke: s.color, 'stroke-width': s.w || 1.6, 'stroke-dasharray': s.dash || '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: s.opacity || 1 }, g);
          if (s.endLabel) { var q = pts[pts.length - 1]; txt(g, x(q.d) + 6, yy(q.v) + 4 + (s.endDy || 0), s.endLabel, { fill: s.color, 'font-size': 10.5, 'font-weight': 600, halo: true }); }
        }
      });
      (p.thresholds || []).forEach(function (th) { if (th.noline) return; el('line', { x1: L, x2: W - R, y1: y(th.v), y2: y(th.v), stroke: th.color, 'stroke-width': 1.2, 'stroke-dasharray': '5 3' }, g); if (th.label) txt(g, L + 4, y(th.v) - 3, th.label, { fill: th.color, 'font-size': 10, halo: true }); });
      (p.rightLabels || []).forEach(function (rl) { txt(g, W - R + 8, Math.max(10, Math.min(p.h - 2, y(rl.v))) + 4 + (rl.dy || 0), rl.text, { fill: rl.color || C.ink2, 'font-size': 10.5, 'font-weight': 600 }); });
      if (p.title) { var tt = txt(svg, L, y0 - 5, p.title, { fill: C.ink, 'font-size': p.title.length > 130 ? 10 : 11.5, 'font-weight': 600 }); }
      el('line', { x1: L, x2: W - R, y1: p.h, y2: p.h, stroke: C.border }, g);
      y0 += p.h + gap;
    });
    var every = opts.tickEvery || (ticks.length > 30 ? 6 : ticks.length > 14 ? 2 : 1);
    ticks.forEach(function (t) { var d = D(t); if (d.getUTCMonth() % every === 0) txt(svg, x(t), H - 6, MON[d.getUTCMonth()] + (d.getUTCMonth() === 0 ? ' ' + d.getUTCFullYear() : ''), { 'text-anchor': 'middle', 'font-size': 10, fill: C.ink3 }); });
    var cross = el('line', { x1: 0, x2: 0, y1: T, y2: H - 18, stroke: C.ink3, 'stroke-width': 1, 'stroke-dasharray': '2 2', opacity: 0 }, svg);
    var tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; container.style.position = 'relative'; container.appendChild(tip);
    svg.addEventListener('mousemove', function (ev) {
      var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width);
      if (px < L || px > W - R) { cross.setAttribute('opacity', 0); tip.style.display = 'none'; return; }
      var t = new Date(D(d0).getTime() + (px - L) / (W - L - R) * span).toISOString().slice(0, 10);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('opacity', 1);
      var h = '<b>' + fmtDY(t) + '</b>';
      opts.panels.forEach(function (p) { p.series.forEach(function (s) { if (!s.label) return; var pts = s.pts.filter(function (q) { return q.v != null && q.d <= t; }); if (!pts.length) return; var q = pts[pts.length - 1]; h += '<div><span style="color:' + s.color + '">&#9679;</span> ' + esc(s.label) + ': ' + esc((s.fmt || String)(q.v)) + (q.d !== t ? ' <span class="mut">(' + fmtD(q.d) + ')</span>' : '') + '</div>'; }); });
      tip.innerHTML = h; tip.style.display = 'block'; tip.style.left = Math.max(0, Math.min(ev.clientX - r.left + 14, r.width - 290)) + 'px'; tip.style.top = (ev.clientY - r.top + 10) + 'px';
    });
    svg.addEventListener('mouseleave', function () { cross.setAttribute('opacity', 0); tip.style.display = 'none'; });
    return svg;
  }

  /* ------------------------------------------------------------------ the distance ladder: one row per Sell Criterion, nearest first */
  function ladder(container, rows, opts) {
    opts = opts || {}; var W = opts.width || container.clientWidth || 900, LW = opts.labelWidth || 330, RW = opts.rightWidth || 300, rh = 54;
    var H = rows.length * rh + 30;
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: 'display:block;max-width:100%;font-family:Segoe UI,system-ui,sans-serif' }, container);
    rows.forEach(function (r, i) {
      var y = 24 + i * rh, x0 = LW, x1 = W - RW;
      var x = function (v) { return x0 + (Math.max(r.lo, Math.min(r.hi, v)) - r.lo) / (r.hi - r.lo) * (x1 - x0); };
      var g = el('g', {}, svg);
      el('rect', { x: 0, y: y - 20, width: W, height: rh, fill: i % 2 ? C.bg2 : C.surface }, g);
      var words = r.label.split(' '), l1 = [], l2 = []; words.forEach(function (w) { ((l1.join(' ') + ' ' + w).length <= 52 && !l2.length ? l1 : l2).push(w); });
      txt(g, 10, y - 5, l1.join(' '), { fill: C.ink, 'font-size': 12, 'font-weight': 600 });
      if (l2.length) txt(g, 10, y + 9, l2.join(' '), { fill: C.ink, 'font-size': 12, 'font-weight': 600 });
      if (r.sub) txt(g, 10, y + (l2.length ? 23 : 10), r.sub, { fill: C.ink3, 'font-size': 10 });
      var info = r.state === 'info';
      el('line', { x1: x0, x2: x1, y1: y + 2, y2: y + 2, stroke: C.border, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
      var zx0 = r.triggerSide === 'below' ? x0 : x(r.trigger), zx1 = r.triggerSide === 'below' ? x(r.trigger) : x1;
      el('line', { x1: zx0, x2: zx1, y1: y + 2, y2: y + 2, stroke: info ? C.neutral : C.red, 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0.35 }, g);
      el('line', { x1: x(r.trigger), x2: x(r.trigger), y1: y - 9, y2: y + 13, stroke: info ? C.neutral : C.red, 'stroke-width': 2 }, g);
      txt(g, x(r.trigger), y + 25, 'sells at ' + (r.fmt || String)(r.trigger), { 'text-anchor': 'middle', 'font-size': 9.5, fill: info ? C.neutral : C.red });
      if (r.trigger2 != null) { el('line', { x1: x(r.trigger2), x2: x(r.trigger2), y1: y - 9, y2: y + 13, stroke: info ? C.neutral : C.red, 'stroke-width': 2, 'stroke-dasharray': '3 2' }, g); txt(g, x(r.trigger2), y + 25, 'and at ' + (r.fmt || String)(r.trigger2), { 'text-anchor': 'middle', 'font-size': 9.5, fill: info ? C.neutral : C.red }); }
      var en = r.marks.filter(function (m) { return m.kind === 'entry'; })[0], la = r.marks.filter(function (m) { return m.kind === 'latest'; })[0];
      if (en && la && en.v != null && la.v != null) el('line', { x1: x(en.v), x2: x(la.v), y1: y + 2, y2: y + 2, stroke: C.ink2, 'stroke-width': 1.5 }, g);
      r.marks.forEach(function (m) {
        if (m.v === null || m.v === undefined) return; var cx = x(m.v);
        if (m.kind === 'entry') el('circle', { cx: cx, cy: y + 2, r: 5.5, fill: C.surface, stroke: C.entry, 'stroke-width': 2 }, g);
        else if (m.kind === 'latest') el('circle', { cx: cx, cy: y + 2, r: 6, fill: r.state === 'fires' ? C.red : r.state === 'near' ? C.amber : info ? C.neutral : C.ink, stroke: C.surface, 'stroke-width': 1.5 }, g);
        else if (m.kind === 'today') el('circle', { cx: cx, cy: y + 2, r: 3, fill: C.surface, stroke: C.ink2, 'stroke-width': 1.5 }, g);
        else el('circle', { cx: cx, cy: y + 2, r: 3, fill: C.ink3 }, g);
        if (m.label && m.kind === 'entry') txt(g, cx, y - 10, m.label, { 'text-anchor': 'middle', 'font-size': 9.5, fill: C.entry, halo: true });
      });
      var col = r.state === 'fires' ? C.red : r.state === 'near' ? C.amber : info ? C.neutral : C.ink;
      txt(g, x1 + 12, y - 1, r.text, { fill: col, 'font-size': 12, 'font-weight': 700 });
      if (r.text2) txt(g, x1 + 12, y + 13, r.text2, { fill: C.ink3, 'font-size': 10 });
      if (info) txt(g, x1 + 12, y + 25, 'information only: the moving-average stop governs', { fill: C.neutral, 'font-size': 9.5 });
    });
    return svg;
  }

  /* ------------------------------------------------------------------ the model: the data file turned into what the panels draw */
  var CRIT_WORDS = { C1: 'Industry RS below 30', C2: 'The 200-day average of relative price falling over the month', C3: 'Sector RS below 50 and Stock RS below 70', C4: 'Stock RS below 50 and analysts cutting', C5: 'Relative price more than 25% below its 52-week high', C6: 'A tranche 30% below its highest close since purchase, with Stock RS below 70' };
  function model(Hd) {
    var R = Hd.reading, m = { H: Hd, R: R };
    m.t = Hd.ticker; m.name = Hd.name; m.ind = Hd.industry; m.sec = Hd.sector; m.coh = Hd.cohort_name || Hd.cohort; m.probing = !!Hd.probing;
    m.status = R.holding_status === 'Core Investment' ? 'Middle Innings Core Investment' : (R.holding_status || ''); m.oneOff = !!R.one_off_in_out_link; m.order = R.order_state || '';
    m.asof = Hd._meta.asof; m.lastFriday = Hd._meta.last_friday; m.lastME = Hd._meta.last_month_end;
    m.daily = Hd.daily; m.rs = Hd.rs; m.nub = Hd.nub; m.tranches = R.tranches || [];
    m.e = Hd.at_entry.length ? Hd.at_entry[0] : null;
    m.d0 = m.daily[0].d; m.d1 = m.asof;
    m.est = R.est_max_loss_pct_of_capital; m.estNearer = R.est_loss_nearer_pct_of_capital;
    m.c = function (id) { return R.criteria.filter(function (x) { return x.id === id; })[0]; };
    m.fired = R.criteria.filter(function (c) { return c.fires; }).map(function (c) { return c.id; });
    m.trFired = m.tranches.filter(function (x) { return x.state !== 'no trigger'; });
    m.metCount = m.fired.length + (m.trFired.length ? 1 : 0);
    var me = m.rs.filter(function (q) { return q.k === 'me'; }).map(function (q) { return q.d; });
    m.me3 = me.length >= 4 ? me[me.length - 4] : null; m.me1 = me.length >= 2 ? me[me.length - 2] : null;
    var fridayFor = function (d) { var f = m.rs.filter(function (q) { return (q.k === 'fr' || q.k === 'me') && q.d <= d; }); return f.length ? f[f.length - 1] : null; };
    var rsAt = function (d) { return m.rs.filter(function (q) { return q.d === d; })[0] || lastOnOrBefore(m.rs, 'd', d); };
    var dailyAt = function (d) { return lastOnOrBefore(m.daily, 'd', d); };
    var nubAt = function (d) { var n = m.nub.filter(function (q) { return q.d <= d; }); return n.length ? n[n.length - 1] : null; };
    var minNub = function (n) { if (!n) return null; var a = [n.sales, n.tp].filter(function (v) { return v != null; }); return a.length ? Math.min.apply(null, a) : null; };
    var near = function (v, trig, band) { return v != null && (v - trig) <= band; };
    var e = m.e, info = m.probing;
    var f1 = function (d, k) { var q = d ? fridayFor(d) : null; return q ? q[k] : null; };
    m.rows = [];
    var c1 = m.c('C1'), c2 = m.c('C2'), c3 = m.c('C3'), c4 = m.c('C4'), c5 = m.c('C5');
    m.rows.push({ id: 'C1', label: 'Industry RS below 30', sub: 'read each Friday; sells the whole holding', lo: 0, hi: 99, trigger: 30, triggerSide: 'below', state: info ? 'info' : c1.fires ? 'fires' : near(c1.value, 30, 10) ? 'near' : 'clear',
      marks: [{ v: e ? e.ind : null, kind: 'entry', label: 'bought' }, { v: f1(m.me3, 'ind'), kind: 'm3' }, { v: f1(m.me1, 'ind'), kind: 'm1' }, { v: c1.value, kind: 'latest' }, { v: c1.today, kind: 'today' }],
      text: c1.value + ' at ' + fmtD(c1.reading_day) + (c1.fires ? ': met' : ' (' + (c1.value - 30) + ' points above 30)'), text2: e ? 'bought at ' + e.ind : '' });
    var sl = function (d) { var q = d ? fridayFor(d) : null; var x = q ? dailyAt(q.d) : null; return x ? x.slope : null; };
    m.rows.push({ id: 'C2', label: 'The 200-day average of relative price: change over the month', sub: 'read each Friday; sells at 0 or below', lo: -0.04, hi: 0.08, trigger: 0, triggerSide: 'below', fmt: function (v) { return (v * 100).toFixed(0) + '%'; }, state: info ? 'info' : c2.fires ? 'fires' : near(c2.value, 0, 0.01) ? 'near' : 'clear',
      marks: [{ v: e ? e.slope : null, kind: 'entry', label: 'bought' }, { v: sl(m.me3), kind: 'm3' }, { v: sl(m.me1), kind: 'm1' }, { v: c2.value, kind: 'latest' }, { v: c2.today, kind: 'today' }],
      text: (c2.value * 100).toFixed(1) + '% at ' + fmtD(c2.reading_day) + (c2.fires ? ': met' : ''), text2: e && e.slope != null ? 'bought at ' + (e.slope * 100).toFixed(1) + '%' : '' });
    var v3 = c3.value, s3met = v3.sector_rs < 50, s3other = v3.stock_rs < 70;
    var r3 = function (d, k) { var q = d ? rsAt(d) : null; return q ? q[k] : null; };
    m.rows.push({ id: 'C3s', label: 'Sector RS below 50 (sells with Stock RS below 70)', sub: 'read at the month-end; sells the whole holding', lo: 0, hi: 99, trigger: 50, triggerSide: 'below', state: info ? 'info' : c3.fires ? 'fires' : (s3met || s3other || near(v3.sector_rs, 50, 10)) ? 'near' : 'clear',
      marks: [{ v: e ? e.sec : null, kind: 'entry', label: 'bought' }, { v: r3(m.me3, 'sec'), kind: 'm3' }, { v: r3(m.me1, 'sec'), kind: 'm1' }, { v: v3.sector_rs, kind: 'latest' }, { v: (c3.today || {}).sector_rs, kind: 'today' }],
      text: v3.sector_rs + ' at ' + fmtD(c3.reading_day) + (c3.fires ? ', Stock RS ' + v3.stock_rs + ': met' : s3met ? ', below 50; Stock RS ' + v3.stock_rs + ' holds it' : ' (' + (v3.sector_rs - 50) + ' above 50)'), text2: e ? 'bought at ' + e.sec : '' });
    m.rows.push({ id: 'C34', label: 'Stock RS: 70 line (sells with Sector RS below 50); 50 line (sells with analysts cutting)', sub: 'read at the month-end; sells the whole holding', lo: 0, hi: 99, trigger: 70, trigger2: 50, triggerSide: 'below', state: info ? 'info' : (c3.fires || c4.fires) ? 'fires' : (v3.stock_rs < 70 || near(v3.stock_rs, 70, 10)) ? 'near' : 'clear',
      marks: [{ v: e ? e.s : null, kind: 'entry', label: 'bought' }, { v: r3(m.me3, 's'), kind: 'm3' }, { v: r3(m.me1, 's'), kind: 'm1' }, { v: v3.stock_rs, kind: 'latest' }, { v: (c3.today || {}).stock_rs, kind: 'today' }],
      text: v3.stock_rs + ' at ' + fmtD(c3.reading_day) + (v3.stock_rs < 50 ? ': below both lines' : v3.stock_rs < 70 ? ': below 70' : ' (' + (v3.stock_rs - 70) + ' above 70)'), text2: e ? 'bought at ' + e.s : '' });
    var v4 = c4.value || {}, b4 = minNub({ sales: v4.ss_sales_nub100, tp: v4.ss_pt_nub100 });
    m.rows.push({ id: 'C4b', label: 'Net Upgrade Breadth, the weaker of the two counts (sells with Stock RS below 50)', sub: 'read at the month-end on the 100-day count', lo: -1, hi: 1, trigger: 0, triggerSide: 'below', fmt: function (v) { return (v > 0 ? '+' : '') + Math.round(v * 100) + '%'; }, state: info ? 'info' : c4.fires ? 'fires' : (b4 != null && b4 <= 0.1) ? 'near' : 'clear',
      marks: [{ v: e ? minNub(nubAt(e.grid_day)) : null, kind: 'entry', label: 'bought' }, { v: m.me3 ? minNub(nubAt(m.me3)) : null, kind: 'm3' }, { v: m.me1 ? minNub(nubAt(m.me1)) : null, kind: 'm1' }, { v: b4, kind: 'latest' }],
      text: v4.analyst_data === false ? 'no analyst data at ' + fmtD(c4.reading_day) : 'sales ' + pctS(v4.ss_sales_nub100) + ', target prices ' + pctS(v4.ss_pt_nub100) + ' at ' + fmtD(c4.reading_day) + (c4.fires ? ': met' : ''),
      text2: 'with Stock RS ' + v4.stock_rs + (v4.stock_rs < 50 ? ' (below 50)' : ' (above 50, so this cannot sell yet)') });
    var dl = dailyAt(m.asof) || {}, cl = dl.c;
    var rd = function (d) { var q = d ? dailyAt(d) : null; return q ? q.rdh : null; };
    m.rows.push({ id: 'C5', label: 'Relative price against its 52-week high (sells more than 25% below)', sub: 'read at the month-end; sells the whole holding', lo: -0.5, hi: 0, trigger: -0.25, triggerSide: 'below', fmt: function (v) { return Math.round(v * 100) + '%'; }, state: info ? 'info' : c5.fires ? 'fires' : near(c5.value, -0.25, 0.05) ? 'near' : 'clear',
      marks: [{ v: e ? e.rdh : null, kind: 'entry', label: 'bought' }, { v: rd(m.me3), kind: 'm3' }, { v: rd(m.me1), kind: 'm1' }, { v: c5.value, kind: 'latest' }, { v: c5.today, kind: 'today' }],
      text: Math.round(c5.value * 100) + '% at ' + fmtD(c5.reading_day) + (c5.fires ? ': met' : ''), text2: (dl.trig && cl) ? (dl.trig <= cl ? 'the trigger price today is about ' + Math.round(dl.trig) + ', ' + Math.round((cl - dl.trig) / cl * 100) + '% below the share price' : 'today the share price is ' + Math.round((dl.trig - cl) / dl.trig * 100) + '% below the trigger, about ' + Math.round(dl.trig)) : '' });
    if (m.tranches.length) {
      var tr = m.tranches.slice().sort(function (a, b) { return a.distance_to_level_pct - b.distance_to_level_pct; })[0];
      var lv = (Hd.levels.filter(function (x) { return x.tranche === tr.tranche_number; })[0] || { pts: [] }).pts;
      var fallAt = function (d) { if (!d) return null; var q = null; for (var i = 0; i < lv.length; i++) { if (lv[i][0] <= d) q = lv[i]; else break; } var c = dailyAt(d); return (q && c && c.c) ? (c.c - q[1]) / c.c : null; };
      var lt = tr.distance_to_level_pct / 100;
      m.rows.push({ id: 'C6', label: 'The nearest tranche: the fall still needed to its 30% level (sells that tranche, with Stock RS below 70)', sub: 'read every day', lo: -0.1, hi: 0.35, trigger: 0, triggerSide: 'below', fmt: function (v) { return Math.round(v * 100) + '%'; }, state: info ? 'info' : tr.state !== 'no trigger' ? 'fires' : lt <= 0.10 ? 'near' : 'clear',
        marks: [{ v: 0.30, kind: 'entry', label: 'bought (30% by construction)' }, { v: fallAt(m.me3), kind: 'm3' }, { v: fallAt(m.me1), kind: 'm1' }, { v: lt, kind: 'latest' }],
        text: 'tranche ' + tr.tranche_number + ': ' + Math.round(tr.distance_to_level_pct) + '% to its 30% level' + (tr.state !== 'no trigger' ? ' (' + tr.state.split(' (')[0] + ')' : ''), text2: 'Stock RS today ' + tr.stock_rs_today + '; what we could lose to it: ' + (m.est != null ? Math.max(0, m.est).toFixed(2) : 'n/a') + '% of capital' });
    }
    var order = { fires: 0, near: 1, clear: 2, info: 3 };
    m.rowsSorted = m.rows.slice().sort(function (a, b) { return order[a.state] - order[b.state]; });
    m.nearestRow = m.rows.filter(function (r) { return r.state === 'near' || r.state === 'clear'; }).sort(function (a, b) { return order[a.state] - order[b.state]; })[0] || m.rows[0];
    return m;
  }

  /* ------------------------------------------------------------------ text pieces */
  function stateWords(m) {
    if (m.probing) return 'Early Innings Probing Bet: the moving-average stop governs; the six Sell Criteria are shown for information';
    if (/^AWAITING/.test(m.order)) return 'AWAITING REPLACEMENT: ' + m.metCount + ' of 6 Sell Criteria met; sold when a replacement is bought (your one-off link for the old holdings)';
    if (/^SELL/.test(m.order)) return m.order;
    if (m.order === 'no signal' || !m.order) return 'No Sell Criterion met';
    return m.order;
  }
  function oneLine(m) {
    var stop = (m.H.stops && m.H.stops[0]) ? String(m.H.stops[0].label || '').replace(/(\d{4})-(\d{2})-(\d{2})/g, function (s) { return fmtD(s); }).replace(/^[A-Z ]+(?= )/, function (s) { return s.toLowerCase(); }) : '';
    if (m.probing) return 'This holding is an Early Innings Probing Bet: its moving-average stop governs' + (stop ? ' (' + stop + ')' : '') + '; the six Sell Criteria below are information';
    var nr = m.nearestRow, nm = nr ? nr.label.split(' (')[0].split(':')[0] : '';
    return (m.metCount ? m.metCount + ' of 6 Sell Criteria met' + (/^AWAITING/.test(m.order) ? '; held under your one-off link until a replacement is bought' : '') : 'No Sell Criterion met; nearest to selling: ' + nm + ' (' + (nr ? nr.text : '') + ')') + '; what we could lose: ' + (m.estNearer != null ? Math.max(0, m.estNearer).toFixed(2) : 'n/a') + '% of capital';
  }

  function renderHeader(el_, m) {
    var R = m.R, e = m.e, now = m.H.at_now || null;
    var pill = m.probing ? 'blue' : /^AWAITING|^SELL/.test(m.order) || m.metCount ? 'red' : 'grey';
    var c3 = m.c('C3'), c1 = m.c('C1'), c5 = m.c('C5');
    var add = R.add_rule || {};
    el_.innerHTML =
      '<div><h1>' + esc(m.name) + ' <span class="mut" style="font-size:12px;font-weight:400">' + esc(m.t) + '</span></h1>' +
      '<div class="sub">' + esc(m.ind) + ' &middot; ' + esc(m.sec) + '</div>' +
      '<div class="sub mut">Cohort: ' + esc(m.coh || 'no named cohort') + '</div>' +
      '<div style="margin-top:8px"><span class="pill ' + pill + '">' + esc(m.status) + '</span> ' + (m.oneOff ? '<span class="pill grey">one-off in/out link</span>' : '') + '</div>' +
      '<div class="kv" style="margin-top:6px"><span class="k">Order sheet</span><span class="v">' + esc(stateWords(m)) + '</span></div></div>' +
      '<div class="kv"><span class="k">Position</span><span class="v"><span class="big">' + R.size_pct.toFixed(2) + '%</span> of capital in ' + m.tranches.length + ' tranche' + (m.tranches.length === 1 ? '' : 's') + '</span>' +
      '<span class="k">Tranches</span><span class="v">' + m.tranches.map(function (tr) { return 'tranche ' + tr.tranche_number + ': ' + tr.size_pct.toFixed(2) + '%, bought ' + fmtDY(tr.entry_date) + (tr.entry_date_caution ? ' <span class="mut">(record start, not necessarily the purchase date)</span>' : ''); }).join('<br>') + '</span>' +
      '<span class="k">Room to add</span><span class="v">' + (add.allowed ? 'yes: next add ' + add.next_add_pct + '% of capital (' + (add.room_pct != null ? add.room_pct.toFixed(2) : 'n/a') + '% of room below the ' + add.limit_pct + '% limit)' : 'no: ' + esc(add.why || '')) + '</span></div>' +
      '<div class="kv"><span class="k">What we could lose (% of capital)</span><span class="v"><span class="big">' + (m.estNearer != null ? Math.max(0, m.estNearer).toFixed(2) : 'n/a') + '%</span> to the nearer exit level; ' + (m.est != null ? Math.max(0, m.est).toFixed(2) : 'n/a') + '% to the 30% levels only' + (m.est < 0 ? ' <span class="mut">(the price is already below a 30% level: that tranche is in its release window)</span>' : '') + '</span>' +
      '<span class="k">Readings at entry (tranche 1, ' + (e ? fmtDY(e.entry_date) : 'n/a') + ')</span><span class="v">' + (e ? 'Stock RS ' + e.s + ' &middot; Sector RS ' + e.sec + ' &middot; Industry RS ' + e.ind + ' &middot; relative price ' + pct0(e.rdh) + ' vs its 52W high' : 'n/a') + '</span>' +
      '<span class="k">Now (' + fmtD(m.asof) + ')</span><span class="v">Stock RS ' + (c3.today || {}).stock_rs + ' &middot; Sector RS ' + (c3.today || {}).sector_rs + ' &middot; Industry RS ' + c1.today + ' &middot; relative price ' + pct0(c5.today) + ' vs its 52W high</span></div>';
  }

  function renderFund(el_, m) {
    var H = m.H, nx = H.next_results, T = H.tilts, parts = [];
    parts.push('<span><span class="k">Next results</span>' + (nx ? fmtDY(nx.date) + ' <span class="mut">(' + esc((nx.status || '').toLowerCase()) + ', the earnings calendar)</span>' : '<span class="mut">no date in the earnings calendar</span>') + '</span>');
    if (T) {
      var one = function (lab, x, missing) {
        if (!x) return lab + ' <span class="mut">' + missing + '</span>';
        var why = (x.why || '').slice(0, 600) + (x.matched_by === 'code' ? ' [Matched by its code: the target table names this row "' + x.key + '".]' : '');
        return lab + ' <span class="tilt" title="' + esc(why) + '">' + esc(x.tilt) + '</span>' + esc(x.word || '');
      };
      var dt = (T.file || '').replace(/^fff-target-|\.json$/g, '');
      parts.push('<span><span class="k">Portfolio Fitness for Fighting target tilts (' + esc(fmtDY(dt)) + ')</span>' +
        one('industry', T.industry, 'no row') + ' &middot; ' + one('sector', T.sector, 'no row for this sector in the target table') + ' &middot; ' + one('geography (' + esc(H.country) + ')', T.geography, 'no row') +
        ' <span class="mut">hover a letter for the reason</span></span>');
    } else parts.push('<span><span class="k">Portfolio Fitness for Fighting target tilts</span><span class="mut">no target table found</span></span>');
    el_.innerHTML = parts.join('');
  }

  /* ------------------------------------------------------------------ the share price chart (the Master Dashboard's) and Treatment B for volume under it */
  function overlayFor(m, short) {
    var H = m.H, lines = [];
    if (!m.probing) {
      var groups = {};
      H.levels.forEach(function (lv) { var k = lv.level.toFixed(4); (groups[k] = groups[k] || []).push(lv); });
      Object.keys(groups).forEach(function (k, gi) { var g = groups[k], by = {}; g[0].pts.forEach(function (q) { by[q[0]] = q[1]; }); var trs = g.map(function (x) { return x.tranche; });
        lines.push({ label: (short ? '30%: ' : '30% level ') + (Math.round(g[0].level * 100) / 100) + (short ? '' : ' (tranche' + (trs.length > 1 ? 's ' : ' ') + trs.join(', ') + ')'), color: '#cf222e', dash: [3, 3], width: 1.7, byDate: by, labelDy: 14 }); });
      var bt = {}; H.daily.forEach(function (q) { if (q.trig) bt[q.d] = q.trig; });
      var lastT = H.daily[H.daily.length - 1].trig;
      lines.push({ label: (short ? '52W trigger ' : 'relative 52W high trigger ') + (lastT ? Math.round(lastT) : ''), color: '#bf3989', dash: [6, 3], width: 1.4, byDate: bt, labelDy: -5 });
    } else {
      var sg = {};
      (H.stops || []).forEach(function (s) { var k = (s.stop_level || 0).toFixed(4) + s.stop_ma; (sg[k] = sg[k] || []).push(s); });
      Object.keys(sg).forEach(function (k) { var g = sg[k], by = {}; g[0].pts.forEach(function (q) { by[q[0]] = q[1]; });
        var trs = g.map(function (s) { var tr = m.tranches.filter(function (x) { return x.entry_date === s.entry_date; })[0]; return tr ? tr.tranche_number : '?'; });
        lines.push({ label: 'stop: ' + String(g[0].stop_ma).replace('D', '-day') + ' average less 2%' + (g[0].stop_level ? ' ' + (Math.round(g[0].stop_level * 100) / 100) : '') + (short ? '' : ' (tranche' + (trs.length > 1 ? 's ' : ' ') + trs.join(', ') + ')'), color: '#cf222e', dash: [3, 3], width: 1.8, byDate: by, labelDy: 14 }); });
    }
    var marks = m.tranches.map(function (tr, i) { return { d: tr.entry_date, label: 'tranche ' + tr.tranche_number + ', ' + fmtD(tr.entry_date), row: i }; });
    return { lines: lines, marks: marks };
  }

  function drawVolume(host, m, layout, opts) {
    opts = opts || {};
    host.innerHTML = '';
    if (!layout || !layout.dates || !layout.dates.length) return;
    var V = m.H.volume, by = {}; V.forEach(function (q) { by[q.d] = q; });
    var W = layout.W, pad = layout.pad, n = layout.dates.length, bw = layout.barW;
    var xi = function (i) { return pad.l + i * bw + bw / 2; };
    var hs = opts.compact ? [opts.h1 || 120, 46, 40] : [150, 72, 58], gap = opts.compact ? 16 : 22, T = opts.compact ? 6 : 16;
    var Htot = T + hs[0] + gap + hs[1] + gap + hs[2] + 22;
    var svg = el('svg', { width: W, height: Htot, viewBox: '0 0 ' + W + ' ' + Htot, style: 'display:block;max-width:100%;font-family:Segoe UI,system-ui,sans-serif' }, host);
    var rows = layout.dates.map(function (d) { return by[d] || null; });
    var vals = rows.filter(Boolean);
    var vmax = Math.max.apply(null, vals.map(function (q) { return q.v; }).concat([1])), v50m = Math.max.apply(null, vals.map(function (q) { return q.v50; }).concat([1]));
    var cap = Math.min(vmax, 3 * v50m) * 1.05;
    var tops = [T, T + hs[0] + gap, T + hs[0] + gap + hs[1] + gap];
    var panelBox = function (i, title) { el('line', { x1: pad.l, x2: W - pad.r, y1: tops[i] + hs[i], y2: tops[i] + hs[i], stroke: C.border }, svg); txt(svg, pad.l, tops[i] - 4, title, { fill: C.ink, 'font-size': opts.compact ? 10.5 : 11.5, 'font-weight': 600 }); };
    // tranche marks
    m.tranches.forEach(function (tr) { var k = layout.dates.indexOf(tr.entry_date); if (k < 0) { for (var j = 0; j < n; j++) { if (layout.dates[j] >= tr.entry_date) { k = j; break; } } } if (k < 0 || layout.dates[0] > tr.entry_date) return; el('line', { x1: xi(k), x2: xi(k), y1: T, y2: tops[2] + hs[2], stroke: C.entry, 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg); });
    // panel 1: bars and averages
    var y1 = function (v) { return tops[0] + hs[0] - Math.min(v, cap) / cap * hs[0]; };
    panelBox(0, opts.compact ? '' : 'Daily volume (green: an up day; red: a down day) with its 20-day (blue) and 50-day (grey, dashed) averages');
    rows.forEach(function (q, i) { if (!q) return; var hgt = Math.max(1, tops[0] + hs[0] - y1(q.v)); el('rect', { x: xi(i) - Math.max(1, bw * 0.78) / 2, y: tops[0] + hs[0] - hgt, width: Math.max(1, bw * 0.78), height: hgt, fill: q.up ? 'rgba(26,127,55,0.55)' : 'rgba(207,34,46,0.55)' }, svg); if (q.v > cap) el('rect', { x: xi(i) - Math.max(1, bw * 0.78) / 2, y: tops[0], width: Math.max(1, bw * 0.78), height: 2, fill: C.ink }, svg); });
    var line = function (key, color, dash, yfn, w) { var dp = ''; rows.forEach(function (q, i) { if (!q || q[key] == null) return; dp += (dp ? 'L' : 'M') + xi(i).toFixed(1) + ',' + yfn(q[key]).toFixed(1); }); if (dp) el('path', { d: dp, fill: 'none', stroke: color, 'stroke-width': w || 1.5, 'stroke-dasharray': dash || '' }, svg); };
    line('v20', C.stock, '', y1); line('v50', C.ink3, '4 3', y1);
    txt(svg, pad.l - 6, tops[0] + 10, fmtVol(cap), { 'text-anchor': 'end', 'font-size': 10, fill: C.ink3 }); txt(svg, pad.l - 6, tops[0] + hs[0], '0', { 'text-anchor': 'end', 'font-size': 10, fill: C.ink3 });
    // panel 2: the up/down volume ratio over 20 sessions (the Master Dashboard's own measure)
    var y2 = function (v) { return tops[1] + hs[1] - Math.min(v, 3) / 3 * hs[1]; };
    panelBox(1, opts.compact ? 'Up-day against down-day volume, 20 sessions' : 'Up-day volume against down-day volume over the last 20 sessions (the Master Dashboard\'s measure): above 1, buyers trade more heavily; below 0.8, sellers in force');
    el('rect', { x: pad.l, y: y2(0.8), width: W - pad.l - pad.r, height: tops[1] + hs[1] - y2(0.8), fill: 'rgba(207,34,46,0.07)' }, svg);
    el('line', { x1: pad.l, x2: W - pad.r, y1: y2(1), y2: y2(1), stroke: C.ink3, 'stroke-dasharray': '4 3' }, svg);
    if (!opts.compact) txt(svg, pad.l + 4, y2(1) - 3, '1', { 'font-size': 10, fill: C.ink3, halo: true });
    txt(svg, pad.l + 4, y2(0.8) + 11, '0.8', { 'font-size': 10, fill: C.red, halo: true });
    line('ud20', C.ink, '', y2);
    // panel 3: distribution days in 25 sessions (the Master Dashboard's definition)
    var y3 = function (v) { return tops[2] + hs[2] - Math.min(v, 12) / 12 * hs[2]; };
    panelBox(2, opts.compact ? 'Distribution days, 25 sessions' : 'Distribution days in the last 25 sessions (a close below the previous close on volume above 1.25 times the 50-day average); 6 or more: the Master Dashboard\'s invalidation signal');
    el('rect', { x: pad.l, y: tops[2], width: W - pad.l - pad.r, height: y3(6) - tops[2], fill: 'rgba(207,34,46,0.07)' }, svg);
    el('line', { x1: pad.l, x2: W - pad.r, y1: y3(6), y2: y3(6), stroke: C.red, 'stroke-dasharray': '4 3' }, svg);
    txt(svg, pad.l + 4, y3(6) - 3, '6', { 'font-size': 10, fill: C.red, halo: true });
    rows.forEach(function (q, i) { if (!q) return; var yy = y3(q.dist25); el('rect', { x: xi(i) - Math.max(1, bw * 0.78) / 2, y: yy, width: Math.max(1, bw * 0.78), height: Math.max(0, tops[2] + hs[2] - yy), fill: q.dist25 >= 6 ? 'rgba(207,34,46,0.65)' : 'rgba(101,109,118,0.45)' }, svg); });
    // right-hand readings
    var lastQ = vals[vals.length - 1];
    if (lastQ && !opts.compact) {
      txt(svg, W - pad.r + 4, tops[0] + 22, fmtVol(lastQ.v20), { 'font-size': 10.5, fill: C.stock, 'font-weight': 600 });
      txt(svg, W - pad.r + 4, y2(Math.min(3, lastQ.ud20 == null ? 3 : lastQ.ud20)) - 3, lastQ.ud20 == null ? (lastQ.ud20_no_down ? 'no down day' : 'n/a') : lastQ.ud20.toFixed(2), { 'font-size': 10.5, fill: C.ink, 'font-weight': 600 });
      txt(svg, W - pad.r + 4, tops[2] + 12, String(lastQ.dist25), { 'font-size': 10.5, fill: lastQ.dist25 >= 6 ? C.red : C.ink, 'font-weight': 600 });
    }
    // hover
    var cross = el('line', { x1: 0, x2: 0, y1: T, y2: tops[2] + hs[2], stroke: C.ink3, 'stroke-dasharray': '2 2', opacity: 0 }, svg);
    var tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; host.style.position = 'relative'; host.appendChild(tip);
    svg.addEventListener('mousemove', function (ev) { var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width), i = Math.round((px - pad.l - bw / 2) / bw); if (i < 0 || i >= n) { tip.style.display = 'none'; cross.setAttribute('opacity', 0); return; } var q = rows[i]; if (!q) return; cross.setAttribute('x1', xi(i)); cross.setAttribute('x2', xi(i)); cross.setAttribute('opacity', 1);
      tip.innerHTML = '<b>' + fmtDY(q.d) + '</b><div>volume ' + fmtVol(q.v) + ' (' + (q.up ? 'up day' : 'down day') + ')</div><div>20-day average ' + fmtVol(q.v20) + '; 50-day ' + fmtVol(q.v50) + '</div><div>up/down volume, 20 sessions: ' + (q.ud20 == null ? (q.ud20_no_down ? 'no down day' : 'n/a') : q.ud20.toFixed(2)) + '</div><div>distribution days, 25 sessions: ' + q.dist25 + '</div>';
      tip.style.display = 'block'; tip.style.left = Math.max(0, Math.min(ev.clientX - r.left + 14, r.width - 290)) + 'px'; tip.style.top = (ev.clientY - r.top + 10) + 'px'; });
    svg.addEventListener('mouseleave', function () { tip.style.display = 'none'; cross.setAttribute('opacity', 0); });
  }

  /* ------------------------------------------------------------------ relative strength and relative price (Treatment 4's chart stack) */
  function rsPanel(m, h, compact) {
    var rsW = m.rs.filter(function (q) { return q.k !== 'o'; }), me = m.rs.filter(function (q) { return q.k === 'me'; }), fr = rsW;
    var frO = m.rs.filter(function (q) { return q.k === 'fr' && q.d <= m.lastFriday; }), lme = me[me.length - 1] || {}, lfr = frO[frO.length - 1] || {};
    var pts = function (a, k) { return a.map(function (q) { return { d: q.d, v: q[k] }; }); };
    return { title: compact ? '' : 'Relative strength, 0 to 99, each Friday: Stock RS (blue), Sector RS (magenta), Industry RS (green); each trigger line in its own colour', h: h,
      series: [{ pts: pts(rsW, 's'), color: C.stock, w: 1.6, label: 'Stock RS', endLabel: compact ? String(lme.s) : 'Stock RS ' + lme.s + ' at ' + fmtD(m.lastME), endDy: 0 },
        { pts: pts(rsW, 'sec'), color: C.sector, w: 1.6, label: 'Sector RS', endLabel: compact ? String(lme.sec) : 'Sector RS ' + lme.sec + ' at ' + fmtD(m.lastME), endDy: 12 },
        { pts: pts(rsW, 'ind'), color: C.industry, w: 1.6, label: 'Industry RS', endLabel: compact ? String(lfr.ind) : 'Industry RS ' + lfr.ind + ' at ' + fmtD(m.lastFriday), endDy: -12 },
        { kind: 'dots', pts: pts(me, 's'), color: C.stock, r: compact ? 2.2 : 3 }, { kind: 'dots', pts: pts(me, 'sec'), color: C.sector, r: compact ? 2.2 : 3 }],
      thresholds: compact ? [{ v: 70, color: C.stock }, { v: 50, color: C.sector }, { v: 30, color: C.industry, zone: 'below', fill: 'rgba(207,34,46,0.06)' }]
        : [{ v: 80, color: C.stock, label: 'Stock RS 80: the Pool\'s test' }, { v: 70, color: C.stock, label: 'Stock RS 70: sells with Sector RS below 50' }, { v: 50, color: C.sector, label: 'Sector RS 50: sells with Stock RS below 70 (and Stock RS 50: sells with analysts cutting)' }, { v: 30, color: C.industry, label: 'Industry RS 30: below it, sells', zone: 'below', fill: 'rgba(207,34,46,0.06)' }],
      yDomain: [0, 100], yTicks: [0, 50, 100] };
  }
  function relPanel(m, h) {
    var p = function (k) { return m.daily.map(function (q) { return { d: q.d, v: q[k] }; }); };
    var zone = m.daily.map(function (q) { return { d: q.d, v: q.rhi != null ? q.rhi * 0.75 : null }; });
    var vals = p('rel').concat(p('rhi')).map(function (q) { return q.v; }).filter(function (v) { return v != null; });
    var last = m.daily[m.daily.length - 1];
    return { title: 'Relative price (the stock against all other European companies of EUR 500m or more): its 200-day average, its 52-week high, and the line 25% below the high', h: h,
      series: [{ pts: zone, color: C.red, w: 0.9, dash: '2 2', label: '25% below the 52-week high', fmt: function (v) { return v.toFixed(1); }, opacity: 0.7 }, { pts: p('rhi'), color: C.ink3, w: 1, label: '52-week high of relative price', fmt: function (v) { return v.toFixed(1); } },
        { pts: p('rma'), color: C.ma, w: 1.4, dash: '6 3', label: '200-day average of relative price', fmt: function (v) { return v.toFixed(1); }, endLabel: '200-day average', endDy: -10 }, { pts: p('rel'), color: C.rel, w: 1.6, label: 'Relative price', fmt: function (v) { return v.toFixed(1); }, endLabel: 'relative price ' + pct0(last.rdh) + ' vs high', endDy: 4 }],
      yDomain: [Math.min.apply(null, vals) * 0.9, Math.max.apply(null, vals) * 1.05], yFmt: function (v) { return Math.round(v); } };
  }
  function statusPanel(m) {
    var fr = m.rs.filter(function (q) { return q.k !== 'o'; }), me = m.rs.filter(function (q) { return q.k === 'me'; });
    var dAt = function (d) { return lastOnOrBefore(m.daily, 'd', d) || {}; };
    var nAt = function (d) { var n = m.nub.filter(function (q) { return q.d <= d; }); return n.length ? n[n.length - 1] : null; };
    var rows = [
      { k: 'Industry RS below 30 (Fridays)', pts: fr.map(function (q) { return { d: q.d, on: q.ind < 30 }; }) },
      { k: '200-day average of relative price falling (Fridays)', pts: fr.map(function (q) { return { d: q.d, on: (dAt(q.d).slope || 0) <= 0 }; }) },
      { k: 'Sector RS below 50 and Stock RS below 70 (month-ends)', pts: me.map(function (q) { return { d: q.d, on: q.sec < 50 && q.s < 70 }; }) },
      { k: 'Stock RS below 50 and analysts cutting (month-ends)', pts: me.map(function (q) { var n = nAt(q.d); return { d: q.d, on: !!(n && q.s < 50 && ((n.sales != null && n.sales < 0) || (n.tp != null && n.tp < 0))) }; }) },
      { k: 'More than 25% below the relative 52-week high (month-ends)', pts: me.map(function (q) { return { d: q.d, on: (dAt(q.d).rdh || 0) < -0.25 }; }) }];
    var series = []; rows.forEach(function (r, i) { series.push({ kind: 'dots', pts: r.pts.map(function (q) { return { d: q.d, v: 5 - i - 0.5 }; }), color: C.border, r: 2.5 }); series.push({ kind: 'dots', pts: r.pts.filter(function (q) { return q.on; }).map(function (q) { return { d: q.d, v: 5 - i - 0.5 }; }), color: C.red, r: 4 }); });
    return { title: 'Which Sell Criteria read as met at each reading, drawn from the series above (red: met); the order sheet acts only on the reader\'s own readings', h: 84, series: series, yDomain: [0, 5], yTicks: [], rightLabels: rows.map(function (r, i) { return { v: 5 - i - 0.5, text: r.k.replace(/ \(.*\)/, ''), color: C.ink2 }; }) };
  }

  /* ------------------------------------------------------------------ Treatment S-B: the sell-side levels indexed on one chart, the breadth beneath */
  var SSK = [['eps', 'Earnings per share estimates', 'next calendar year'], ['ebitda', 'EBITDA estimates', 'earnings before interest, tax, depreciation and amortisation; next calendar year'], ['sales', 'Sales estimates', 'next calendar year'], ['tp', 'Target price', 'mean']];
  function ssModel(m, since) {
    var M = m.H.ss.metrics, out = [];
    SSK.forEach(function (k) {
      var x = M[k[0]]; if (!x || !x.base || !x.base.v) { out.push({ key: k[0], label: k[1], sub: k[2], pts: [], none: true, x: x }); return; }
      var b = x.base.v;
      var pts = x.monthly.filter(function (q) { return q.d >= since && q.v != null; }).map(function (q) { return { d: q.d, v: q.v / b * 100 }; });
      var dl = (x.daily || []).filter(function (q) { return q.v != null; }).map(function (q) { return { d: q.d, v: q.v / b * 100 }; });
      var all = pts.concat(dl);
      var vals = all.map(function (q) { return q.v; });
      var nowQ = dl.length ? x.daily[x.daily.length - 1] : (x.monthly.length ? x.monthly[x.monthly.length - 1] : null);
      out.push({ key: k[0], label: k[1], sub: k[2], pts: all, range: vals.length ? Math.max.apply(null, vals) - Math.min.apply(null, vals) : 0, x: x, base: x.base, now: nowQ, joined: !!x.join, note: x.join_note });
    });
    var ok = out.filter(function (s) { return !s.none && s.pts.length; });
    ok.forEach(function (s) { var others = ok.filter(function (o) { return o !== s; }).map(function (o) { return o.range; }); var widest = others.length ? Math.max.apply(null, others) : 0; s.right = others.length >= 1 && widest > 0 && s.range > 2 * widest; });
    var rights = ok.filter(function (s) { return s.right; }); if (rights.length > 1) { rights.sort(function (a, b) { return b.range - a.range; }); rights.slice(1).forEach(function (s) { s.right = false; }); }
    return out;
  }
  function ssPanels(m, since, compact, hTop, hBot) {
    var S = ssModel(m, since), col = { eps: C.eps, ebitda: C.ebitda, sales: C.sales, tp: C.tp };
    var left = S.filter(function (s) { return !s.none && !s.right; }), right = S.filter(function (s) { return s.right; });
    var dom = function (arr) { var v = []; arr.forEach(function (s) { s.pts.forEach(function (q) { v.push(q.v); }); }); v.push(100); var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), pad = (hi - lo) * 0.08 || 2; return [lo - pad, hi + pad]; };
    var series = S.filter(function (s) { return !s.none; }).map(function (s) { return { pts: s.pts, color: col[s.key], w: s.right ? 1.1 : 1.8, axis: s.right ? 'right' : 'left', label: s.label + (s.right ? ' (right-hand axis)' : ''), fmt: function (v) { return v.toFixed(1); } }; });
    var P1 = { title: compact ? '' : 'The four consensus levels, each indexed to 100 at the month-end before tranche 1 (' + fmtDY(m.H.ss.base_date) + '); monthly, with the daily readings since 29-Sep joined where they are on the same basis', h: hTop, series: series, yDomain: dom(left), yFmt: function (v) { return Math.round(v); }, thresholds: [{ v: 100, color: C.ink3, label: compact ? '' : '100: the level at the month-end before tranche 1' }] };
    if (right.length) { P1.yDomain2 = dom(right); P1.yFmt2 = function (v) { return Math.round(v); }; }
    var out = { S: S, right: right, panels: [P1] };
    if (!compact) {
      var M = m.H.ss.metrics, bseries = [];
      [['eps', M.eps && M.eps.breadth], ['ebitda', M.ebitda && M.ebitda.breadth]].forEach(function (a) { if (a[1] && a[1].length) bseries.push({ pts: a[1].filter(function (q) { return q.d >= since; }).map(function (q) { return { d: q.d, v: q.breadth }; }), color: col[a[0]], w: 1.4, label: 'Net Upgrade Breadth, ' + (a[0] === 'eps' ? 'earnings per share estimates' : 'EBITDA estimates') + ' (month-end)', fmt: pctS }); });
      bseries.push({ pts: m.nub.filter(function (q) { return q.d >= since; }).map(function (q) { return { d: q.d, v: q.sales }; }), color: col.sales, w: 1.8, label: 'Net Upgrade Breadth, sales estimates (month-end, the count the Sell Criterion reads)', fmt: pctS });
      bseries.push({ pts: m.nub.filter(function (q) { return q.d >= since; }).map(function (q) { return { d: q.d, v: q.tp }; }), color: col.tp, w: 1.8, label: 'Net Upgrade Breadth, target prices (month-end, the count the Sell Criterion reads)', fmt: pctS });
      out.panels.push({ title: 'Net Upgrade Breadth on the 100-day count, the four metrics, at month-ends: with Stock RS below 50, a reading below zero on sales estimates or target prices sells', h: hBot, series: bseries, thresholds: [{ v: 0, color: C.red, zone: 'below', fill: 'rgba(207,34,46,0.07)' }], yDomain: [-1, 1], yTicks: [-1, 0, 1], yFmt: function (v) { return (v * 100) + '%'; } });
    }
    return out;
  }
  function ssLegend(info) {
    var col = { eps: C.eps, ebitda: C.ebitda, sales: C.sales, tp: C.tp };
    return '<div class="legend">' + info.S.filter(function (s) { return !s.none; }).map(function (s) { return '<span><i class="' + (s.right ? 'thin' : '') + '" style="border-top-color:' + col[s.key] + '"></i>' + esc(s.label) + (s.right ? ' <b>: right-hand axis</b> (its range is more than twice the widest of the others)' : '') + '</span>'; }).join('') +
      info.S.filter(function (s) { return s.none; }).map(function (s) { return '<span class="mut">' + esc(s.label) + ': no history</span>'; }).join('') + '</div>';
  }
  function ssTable(m, info) {
    var fmtL = function (k, v) { return v == null ? 'n/a' : (k === 'ebitda' || k === 'sales') ? Math.round(v).toLocaleString('en-GB') : v.toFixed(2); };
    var h = '<table class="tbl" style="margin-top:6px"><tr><th>Metric</th><th class="num">Now</th><th class="num">At the month-end before tranche 1</th><th class="num">Change since then</th><th class="num">Revisions 1M</th><th class="num">3M</th><th class="num">6M</th><th>Daily readings</th></tr>';
    info.S.forEach(function (s) {
      var x = s.x || {}, now = s.now, base = s.base, ch = (now && base && base.v) ? (now.v / base.v - 1) : null, rv = x.rev || {};
      var rc = function (v) { return '<td class="num">' + (v == null ? '<span class="mut">n/a</span>' : (v > 0 ? '+' : '') + v + '%') + '</td>'; };
      h += '<tr><td><b>' + esc(s.label) + '</b> <span class="mut">' + esc(s.sub) + '</span></td><td class="num">' + (now ? fmtL(s.key, now.v) + ' <span class="mut">' + fmtD(now.d) + '</span>' : 'n/a') + '</td><td class="num">' + (base ? fmtL(s.key, base.v) + ' <span class="mut">' + fmtD(base.d) + '</span>' : 'n/a') + '</td><td class="num">' + (ch == null ? 'n/a' : (ch > 0 ? '+' : '') + (ch * 100).toFixed(1) + '%') + '</td>' + rc(rv.L1M) + rc(rv.L3M) + rc(rv.L6M) + '<td class="mut" style="font-size:11px">' + esc(s.none ? 'no monthly history' : s.joined ? 'joined' : (s.note || '').replace(/^not joined: /, 'not joined: ')) + '</td></tr>';
    });
    return h + '</table><div class="key">Revisions: the change in the consensus over the last 1, 3 and 6 months, in per cent, as the sell-side momentum store reports them (what the Sell-side Momentum rating reads). The monthly history runs to the last month-end the monthly files hold.</div>';
  }

  /* ------------------------------------------------------------------ valuation over time, with the valuation page's colour bands */
  var ZONES = [{ c: '#5fbf6f', a: 0.55 }, { c: '#a8dba0', a: 0.55 }, { c: '#d9efc4', a: 0.60 }, { c: '#fbf1b8', a: 0.70 }, { c: '#f7cf9a', a: 0.65 }, { c: '#f2a4a4', a: 0.60 }];
  var LEVEL_COLOURS = ['#6fbf73', '#7fbf6f', '#c9c25a', '#e0a45c', '#e06f6f'];
  function valChart(host, m, f, years, W, Hh, compact) {
    var V = m.H.valuation; host.innerHTML = '';
    if (!V) { host.innerHTML = '<div class="mut">No valuation file for this stock.</div>'; return; }
    var n0 = V.months.length, start = Math.max(0, n0 - years * 12), win = V.months.slice(start), vals = V[f].slice(start), n = win.length;
    var bands = V.bands && V.bands[f];
    var padL = compact ? 8 : 12, padR = compact ? 40 : 52, padT = 10, padB = 22, pw = W - padL - padR, ph = Hh - padT - padB;
    var lo = Infinity, hi = -Infinity; vals.forEach(function (v) { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
    var levels = bands ? [bands.p10, bands.p35, bands.p50, bands.p75, bands.p90] : [];
    levels.concat(bands && bands.mean != null ? [bands.mean] : []).forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    var a = Math.max(0, lo - (hi - lo) * 0.12), b = hi + (hi - lo) * 0.12;
    var x = function (i) { return padL + (n <= 1 ? pw / 2 : i * pw / (n - 1)); }, y = function (v) { return padT + ph - (v - a) / (b - a) * ph; };
    var svg = el('svg', { width: W, height: Hh, viewBox: '0 0 ' + W + ' ' + Hh, style: 'display:block;max-width:100%;font-family:Segoe UI,system-ui,sans-serif' }, host);
    if (bands) {
      var edges = [a].concat(levels.slice().sort(function (p, q) { return p - q; }), [b]);
      for (var z = 0; z < 6; z++) el('rect', { x: padL, y: y(edges[z + 1]), width: pw, height: Math.max(0, y(edges[z]) - y(edges[z + 1])), fill: ZONES[z].c, 'fill-opacity': ZONES[z].a }, svg);
      levels.forEach(function (v, i) { el('line', { x1: padL, x2: padL + pw, y1: y(v), y2: y(v), stroke: LEVEL_COLOURS[i], 'stroke-width': 1.2 }, svg); });
      if (bands.mean != null) el('line', { x1: padL, x2: padL + pw, y1: y(bands.mean), y2: y(bands.mean), stroke: '#9a8a2e', 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }, svg);
    }
    win.forEach(function (mm, i) { if (mm.slice(5) === '01') { el('line', { x1: x(i), x2: x(i), y1: padT, y2: padT + ph, stroke: 'rgba(0,0,0,0.08)' }, svg); if (!compact || (+mm.slice(0, 4)) % (years > 5 ? 2 : 1) === 0) txt(svg, x(i), padT + ph + 14, mm.slice(0, 4), { 'text-anchor': 'middle', 'font-size': 10, fill: C.ink3 }); } });
    var dp = ''; vals.forEach(function (v, i) { if (v == null) return; dp += (dp && vals[i - 1] != null ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); });
    el('path', { d: dp, fill: 'none', stroke: '#333', 'stroke-width': compact ? 2 : 2.6, 'stroke-linejoin': 'round' }, svg);
    el('rect', { x: padL, y: padT, width: pw, height: ph, fill: 'none', stroke: '#e8e3d4' }, svg);
    // the tranches, by date (month i spans (i-1 .. i], the month-end sits at i, as the valuation page places a daily date)
    var dateX = function (iso) { var i = win.indexOf(iso.slice(0, 7)); if (i < 0) return null; var d = +iso.slice(8, 10), dim = new Date(+iso.slice(0, 4), +iso.slice(5, 7), 0).getDate(); return padL + ((i - 1) + d / dim) * pw / (n - 1); };
    m.tranches.forEach(function (tr, k) { var xx = dateX(tr.entry_date); if (xx == null) return; el('line', { x1: xx, x2: xx, y1: padT, y2: padT + ph, stroke: C.entry, 'stroke-dasharray': '3 3', 'stroke-width': 1.2 }, svg); if (!compact) txt(svg, xx + 3, padT + 12 + (k % 3) * 12, 'tranche ' + tr.tranche_number, { fill: C.entry, 'font-size': 10, halo: true }); });
    var tv = [a + (b - a) * 0.1, (a + b) / 2, b - (b - a) * 0.1];
    tv.forEach(function (v) { txt(svg, padL + pw + 5, y(v) + 4, (v >= 10 ? v.toFixed(0) : f === 'evs' ? v.toFixed(2) : v.toFixed(1)) + 'x', { 'font-size': 10, fill: C.ink3 }); });
    // hover
    var tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; host.style.position = 'relative'; host.appendChild(tip);
    svg.addEventListener('mousemove', function (ev) { var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width), i = Math.round((px - padL) / (pw / (n - 1))); if (i < 0 || i >= n) { tip.style.display = 'none'; return; } tip.innerHTML = '<b>' + MON[+win[i].slice(5, 7) - 1] + '-' + win[i].slice(0, 4) + '</b><div>' + (f === 'pe' ? 'P/E' : 'EV / Sales') + ', 24 months forward: ' + (vals[i] == null ? 'n/a' : vals[i].toFixed(f === 'evs' ? 2 : 1) + 'x') + '</div>'; tip.style.display = 'block'; tip.style.left = Math.max(0, Math.min(ev.clientX - r.left + 14, r.width - 200)) + 'px'; tip.style.top = (ev.clientY - r.top + 10) + 'px'; });
    svg.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
  }
  function ordinal(n) { if (n == null) return 'n/a'; var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function pctNow(V, f) { var g = V.grade_basis, cur = V.current[f]; if (f === 'pe' && g && g.pe != null && g.pct != null && cur && Math.abs(g.pe - cur) / cur <= 0.01) return g.pct; return V.pct_now[f]; }
  function valLine(m, f) {
    var V = m.H.valuation; if (!V) return '';
    var cur = V.current[f], pc = pctNow(V, f), ae = V.at_entry, ev = f === 'pe' ? ae.pe : ae.evs, ep = f === 'pe' ? ae.pe_pct : ae.evs_pct;
    var fx = function (v) { return v == null ? 'n/a' : (f === 'evs' || v < 10 ? v.toFixed(2) : v.toFixed(1)) + 'x'; };
    var s = 'Now <b>' + fx(cur) + '</b>, the ' + ordinal(pc) + ' percentile of its own ten years &middot; at entry (' + MON[+ae.month.slice(5, 7) - 1] + '-' + ae.month.slice(0, 4) + ') <b>' + fx(ev) + '</b>, the ' + ordinal(ep);
    var g = V.grade_basis;
    if (f === 'pe' && g && g.pe != null && cur && Math.abs(g.pe - cur) / cur > 0.03) s += '<br><span class="mut">The valuation grade reads ' + fx(g.pe) + ', the ' + ordinal(g.pct) + ' percentile (today\'s price over the same earnings); this chart is FactSet\'s own month-end series, as on the valuation page.</span>';
    return s;
  }

  /* ------------------------------------------------------------------ Treatment C for peers: the picture, with the short table beside it */
  function peersPicture(host, m, ax, W, Hh, compact) {
    var P = m.H.peers, self = P.self;
    var xk = ax.x, yk = ax.y;
    var rows = [{ r: self, g: 'self' }].concat(P.cohort.map(function (r) { return { r: r, g: 'coh' }; }), P.sector.map(function (r) { return { r: r, g: 'sec' }; }));
    var seen = {}; rows = rows.filter(function (q) { if (seen[q.r.t]) return false; seen[q.r.t] = 1; return true; });
    var pts = rows.map(function (q) { var a = q.r.rs.now, b = q.r.rs[xk]; return { q: q, x: (a != null && b != null) ? a - b : null, y: q.r[yk] }; }).filter(function (p) { return p.x != null && p.y != null; });
    var L = compact ? 34 : 48, R = compact ? 16 : 110, T = compact ? 14 : 28, B = compact ? 22 : 40;
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var YC = 40, yin = ys.filter(function (v) { return Math.abs(v) <= YC; }), xlo = Math.min.apply(null, [-30].concat(xs)) - 6, xhi = Math.max.apply(null, [30].concat(xs)) + 6, ylo = Math.max(-YC, Math.min.apply(null, [-10].concat(yin)) - 2), yhi = Math.min(YC, Math.max.apply(null, [10].concat(yin)) + 2);
    pts.forEach(function (p) { p.off = p.y > yhi ? 'up' : p.y < ylo ? 'down' : null; p.yc = Math.max(ylo, Math.min(yhi, p.y)); });
    var sx = function (v) { return L + (v - xlo) / (xhi - xlo) * (W - L - R); }, sy = function (v) { return T + (1 - (v - ylo) / (yhi - ylo)) * (Hh - T - B); };
    host.innerHTML = '';
    var svg = el('svg', { width: W, height: Hh, viewBox: '0 0 ' + W + ' ' + Hh, style: 'display:block;max-width:100%;font-family:Segoe UI,system-ui,sans-serif' }, host);
    el('line', { x1: sx(0), x2: sx(0), y1: T, y2: Hh - B, stroke: C.ink3, 'stroke-dasharray': '4 3' }, svg); el('line', { x1: L, x2: W - R, y1: sy(0), y2: sy(0), stroke: C.ink3, 'stroke-dasharray': '4 3' }, svg);
    var xl = { m1: '1 month', m3: '3 months', m6: '6 months' }[xk], yl = yk === 'eps3' ? 'earnings per share revisions over 3 months, %' : 'sales revisions over 3 months, %';
    txt(svg, W - R, Hh - (compact ? 4 : 10), 'change in Stock RS over ' + xl + ' →', { 'text-anchor': 'end', 'font-size': compact ? 9.5 : 11, fill: C.ink2 });
    txt(svg, sx(0) + 6, T - (compact ? 4 : 14), '↑ ' + yl, { 'font-size': compact ? 9.5 : 11, fill: C.ink2 });
    var rr = function (p) { return Math.max(compact ? 3 : 4, Math.min(compact ? 11 : 16, Math.sqrt((p.q.r.mc || 300) / 60) * (compact ? 0.7 : 1))); };
    var colr = function (p) { return p.q.g === 'self' ? C.entry : p.q.r.held ? C.stock : C.ink3; };
    pts.forEach(function (p) {
      var c = el('circle', { cx: sx(p.x), cy: sy(p.yc), r: rr(p), fill: p.q.g === 'sec' ? C.surface : colr(p), 'fill-opacity': p.q.g === 'self' ? 0.9 : p.q.g === 'sec' ? 1 : 0.55, stroke: p.q.g === 'sec' ? colr(p) : C.surface, 'stroke-width': p.q.g === 'sec' ? 1.8 : 1.5 }, svg);
      var ti = el('title', {}, c); ti.textContent = p.q.r.name + ' (' + (p.q.g === 'self' ? 'this holding' : p.q.g === 'coh' ? 'cohort peer' : 'sector peer') + '): Stock RS ' + p.q.r.rs.now + ', change over ' + xl + ' ' + (p.x > 0 ? '+' : '') + p.x + '; ' + yl.replace(', %', '') + ' ' + (p.y > 0 ? '+' : '') + p.y + '%';
      if (p.off) txt(svg, sx(p.x), sy(p.yc) + (p.off === 'up' ? rr(p) + 11 : -rr(p) - 4), (p.off === 'up' ? '▲ ' : '▼ ') + (p.y > 0 ? '+' : '') + p.y + '%', { 'text-anchor': 'middle', 'font-size': 9.5, fill: C.ink2 });
    });
    var labs = pts.filter(function (p) { return !compact || p.q.g === 'self' || p.q.r.held || Math.abs(p.x) > 15; }).map(function (p) { return { p: p, lx: sx(p.x) + rr(p) + 2, ly: sy(p.yc) + 4 }; }).sort(function (a, b) { return a.ly - b.ly; });
    for (var i = 1; i < labs.length; i++) { for (var j = 0; j < i; j++) { if (Math.abs(labs[i].lx - labs[j].lx) < 120 && Math.abs(labs[i].ly - labs[j].ly) < 12) labs[i].ly = labs[j].ly + 12; } }
    labs.forEach(function (o) { var right = o.lx > W - R - 70; txt(svg, right ? o.lx - 2 * rr(o.p) - 6 : o.lx, o.ly, o.p.q.r.name, { 'font-size': compact ? 9.5 : 10.5, fill: o.p.q.g === 'self' ? C.entry : C.ink, 'font-weight': o.p.q.g === 'self' ? 700 : 400, 'text-anchor': right ? 'end' : 'start', halo: true }); });
    if (!compact) { txt(svg, L - 4, sy(yhi) + 4, '+' + yhi + '%', { 'text-anchor': 'end', 'font-size': 10, fill: C.ink2 }); txt(svg, L - 4, sy(ylo) + 4, ylo + '%', { 'text-anchor': 'end', 'font-size': 10, fill: C.ink2 }); txt(svg, sx(xlo), Hh - B + 14, String(xlo), { 'font-size': 10, fill: C.ink2 }); txt(svg, sx(xhi), Hh - B + 14, '+' + xhi, { 'text-anchor': 'end', 'font-size': 10, fill: C.ink2 }); }
    return pts.length;
  }
  function peersTable(m) {
    var P = m.H.peers;
    var d = function (r, k) { var a = r.rs.now, b = r.rs[k]; return (a == null || b == null) ? null : a - b; };
    var dc = function (v) { return '<td class="num">' + (v == null ? '<span class="mut">n/a</span>' : (v > 0 ? '+' : '') + v) + '</td>'; };
    var rv = function (v) { return '<td class="num">' + (v == null ? '<span class="mut">n/a</span>' : (v > 0 ? '+' : '') + v + '%') + '</td>'; };
    var rg = function (g) { return g ? '<span class="rg" style="background:' + ratingColor(g) + '">' + esc(g) + '</span>' : '<span class="mut">&ndash;</span>'; };
    var nm = function (r) { return esc(r.name) + (r.held && r.t !== m.t ? '<span class="chip held" title="a holding of ours">held</span>' : '') + (r.pool ? '<span class="chip pool" title="in the Pool of Stocks Eligible for Middle Innings Portfolio Selection">Pool</span>' : ''); };
    var row = function (r, self) { return '<tr class="' + (self ? 'self' : '') + '"><td>' + nm(r) + '</td><td class="num">' + (r.rs.now == null ? 'n/a' : r.rs.now) + '</td>' + dc(d(r, 'm1')) + dc(d(r, 'm3')) + dc(d(r, 'm6')) + '<td class="num">' + rg(r.ssm) + '</td><td class="num">' + rg(r.tm) + '</td>' + rv(r.eps3) + '<td class="num">' + (r.nubs == null ? '<span class="mut">n/a</span>' : pctS(r.nubs)) + '</td></tr>'; };
    var worst = function (a) { return a.slice().sort(function (x, y) { var p = d(x, 'm3'), q = d(y, 'm3'); return (p == null ? 999 : p) - (q == null ? 999 : q); }); };
    var h = '<table class="tbl"><tr><th>Company</th><th class="num">Stock RS</th><th class="num">Change 1M</th><th class="num">3M</th><th class="num">6M</th><th class="num">Sell-side Momentum</th><th class="num">Technical Momentum</th><th class="num">Earnings per share revisions 3M</th><th class="num">Net Upgrade Breadth, sales estimates</th></tr>';
    h += row(P.self, true);
    h += '<tr class="grp"><td colspan="9">Cohort peers (' + P.cohort.length + ' of ' + P.cohort_total + ', the largest by market value; filled dots), negative first</td></tr>' + worst(P.cohort).map(function (r) { return row(r); }).join('');
    h += '<tr class="grp"><td colspan="9">Sector peers (' + P.sector.length + ' of ' + P.sector_total + '; hollow dots), negative first</td></tr>' + worst(P.sector).map(function (r) { return row(r); }).join('');
    return h + '</table>';
  }

  /* ------------------------------------------------------------------ ratings, context, judgement, placeholders, Experiment */
  function renderRatings(el_, m) {
    var order = ['thesis_change_forces', 'foundations_robustness', 'setups_fit', 'case_riskiness', 'sellside_momentum', 'thematic_fit_momentum', 'technical_momentum', 'tsr_valuation'];
    var R = m.H.ratings || {}, h = '<div class="ratings">';
    order.forEach(function (k, i) { var r = R[k]; if (!r) return; h += '<div class="rt ' + (i < 4 ? 'bu' : 'td') + '" title="' + esc((r.owner || '') + (r.history ? '. ' + r.history : '')) + '"><div class="rt-g" style="background:' + ratingColor(r.grade) + '">' + esc(r.grade || '–') + '</div><div class="rt-n">' + esc(r.name) + '</div><div class="rt-d">' + (r.as_at ? 'as at ' + fmtDY(r.as_at) : '') + '</div></div>'; });
    el_.innerHTML = h + '</div><div class="mut" style="margin-top:4px">Four Bottom-up/Stock-driven ratings (set by the Investment Analyst in the memo), then four Top Down/Exogenously-driven (computed weekly). Case Riskiness: A = simple and low-risk. Hover a rating for its owner.</div>';
  }
  function renderContext(el_, m) {
    var b = m.H.beta, ex = m.H.experiment;
    var h = '<div class="grid2"><div><b>Its own move, after the market\'s part</b>' + (b ? ' <span class="mut">(Stoxx Europe 600, Dimson beta ' + b.beta + ')</span><ul style="margin:4px 0 0 18px">' +
      '<li>5 sessions to ' + fmtD(b.s5.to) + ': its own move ' + sgn(b.s5.stock_specific) + '%, ' + b.s5.times_usual + ' times its usual size (' + b.s5.usual_size + '%); the market\'s part ' + sgn(b.s5.explained_by_beta) + '%</li>' +
      '<li>20 sessions: its own move ' + sgn(b.s20.stock_specific) + '%, ' + b.s20.times_usual + ' times its usual size; the market\'s part ' + sgn(b.s20.explained_by_beta) + '%</li></ul>' : '<div class="mut">no beta reading</div>') + '</div>';
    var memo = m.H.memo;
    h += '<div><b>The Investment Analyst\'s memo</b>' + (memo ? ' <span class="mut">(' + esc(memo.stage || '') + ', ' + (memo.memo_date ? fmtDY(memo.memo_date) : '') + ')</span><div style="margin-top:4px">' + esc((memo.verdict || '').split('. ').slice(0, 2).join('. ')) + (memo.verdict && memo.verdict.split('. ').length > 2 ? '.' : '') + '</div>' : '<div class="mut">no memo</div>') + '</div></div>';
    el_.innerHTML = h;
  }
  function mdInline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>'); }
  function blockHtml(md, openSet) {
    var secs = [], cur = null;
    md.split('\n').forEach(function (l) {
      var hm = l.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (hm && !/^\s*- /.test(l)) { cur = { title: hm[1].replace(/:$/, ''), body: hm[2] ? [hm[2]] : [] }; secs.push(cur); return; }
      if (!cur) { cur = { title: 'The holding this week', body: [] }; secs.push(cur); }
      cur.body.push(l);
    });
    var toHtml = function (body) { var h = '', depth = -1; body.forEach(function (l) { var mm = l.match(/^(\s*)- (.*)$/); if (mm) { var d = mm[1].length >= 2 ? 1 : 0; while (depth < d) { h += '<ul>'; depth++; } while (depth > d) { h += '</ul>'; depth--; } h += '<li>' + mdInline(mm[2]) + '</li>'; } else if (l.trim()) { while (depth >= 0) { h += '</ul>'; depth--; } h += '<p>' + mdInline(l) + '</p>'; } }); while (depth >= 0) { h += '</ul>'; depth--; } return h; };
    return secs.map(function (s) { var open = openSet.some(function (o) { return s.title.indexOf(o) === 0; }); return '<details ' + (open ? 'open' : '') + '><summary>' + mdInline(s.title) + '</summary>' + toHtml(s.body) + '</details>'; }).join('');
  }
  function renderJudgement(el_, m) {
    var J = m.H.judgement || [];
    if (!J.length) { el_.innerHTML = '<h2>9. The Assistant Portfolio Manager\'s judgement</h2><div class="mut">No block for this holding in the latest APM PMS Q&amp;A SOP note.</div>'; return; }
    var a = J[0], open = ['What it means for the position', 'My judgement', 'What would change my view'];
    var stale = a.date && m.asof && (D(m.asof) - D(a.date)) / 864e5 > 1;
    var h = '<h2><span><span class="jud-tag">9. The Assistant Portfolio Manager\'s judgement</span> <span class="mut">from the APM PMS Q&amp;A SOP\'s note of ' + fmtDY(a.date) + (stale ? '; this week\'s appears here as soon as Tuesday\'s note is written' : '') + '</span></span></h2>' + blockHtml(a.markdown, open);
    if (J[1]) h += '<details><summary>The previous week\'s judgement (note of ' + fmtDY(J[1].date) + ')</summary><div style="padding-left:14px">' + blockHtml(J[1].markdown, []) + '</div></details>';
    el_.innerHTML = h;
  }
  function renderPlaceholders(el_) {
    el_.innerHTML = '<div class="grid2"><div class="placeholder"><b>Version 2 (November): the company</b><br>Results and communications since entry on a timeline; the memo\'s key questions and what has answered them. Needs a results record per holding, kept from now. The next results date is in the header from 9-Oct.</div>' +
      '<div class="placeholder"><b>Version 2 (November): thematics and Portfolio Fitness for Fighting</b><br>The named gap the holding closes or widens; the thematics register entries that touch it. The target tilt letters on its industry, sector and geography are in the header from 9-Oct.</div></div>';
  }
  function renderExperiment(el_, m) {
    var ex = m.H.experiment;
    el_.innerHTML = '<h2>Appendix: the Experiment <span class="mut">which stocks its own moves have tracked over the last 3 and 6 months (rank correlation of the moves left after the market\'s and its country\'s part)</span></h2>' +
      (ex && ex.top && ex.top.length ? '<table class="tbl" style="max-width:820px"><tr><th>Company</th><th>Link</th><th class="num">3 months</th><th class="num">6 months</th><th>Strength</th></tr>' + ex.top.map(function (x) { return '<tr><td>' + esc(x.name) + (x.held ? '<span class="chip held" title="a holding of ours">held</span>' : '') + '</td><td>' + esc((x.links || []).join(', ')) + '</td><td class="num">' + (x.c63 == null ? 'n/a' : (+x.c63).toFixed(2)) + '</td><td class="num">' + (x.c126 == null ? 'n/a' : (+x.c126).toFixed(2)) + '</td><td>' + esc(x.strength) + '</td></tr>'; }).join('') + '</table>' : '<div class="mut">no Experiment reading</div>');
  }

  /* ------------------------------------------------------------------ the sliding overlay */
  function overlay(m, links) {
    var O = m.H.overlay, ov = document.getElementById('ov'), scrim = document.getElementById('scrim');
    var open = function (o) { ov.classList.toggle('open', o); scrim.classList.toggle('open', o); if (o) document.getElementById('ov-q').focus(); };
    document.getElementById('ovbtn').onclick = function () { open(!ov.classList.contains('open')); };
    document.getElementById('ov-close').onclick = function () { open(false); }; scrim.onclick = function () { open(false); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); if ((e.key === 'p' || e.key === 'P') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) open(!ov.classList.contains('open')); });
    document.getElementById('ov-name').textContent = m.name;
    var cols = [['Industry: ' + m.ind, O.industry], ['Sector: ' + m.sec, O.sector], ['Cohort: ' + (m.H.cohort_name || 'no named cohort'), O.cohort], ['Geography: listed in ' + m.H.country, O.geography]];
    var href = function (r) { return r.held ? links.holding(r.t) : links.stockView(r.t); };
    var render = function (q) { document.getElementById('ov-cols').innerHTML = cols.map(function (c) { var list = c[1] || []; return '<div class="ov-col"><h5>' + esc(c[0]) + ' <span class="mut">(' + list.length + ')</span></h5><div class="ov-list">' + list.filter(function (r) { return !q || (r.name + ' ' + r.t).toLowerCase().indexOf(q) >= 0; }).map(function (r) { return '<a class="' + (r.t === m.t ? 'self' : '') + '" href="' + esc(href(r)) + '"' + (r.held ? '' : ' target="_blank" rel="noopener" title="opens the Master Dashboard\'s Stock View in a new tab"') + '><span>' + esc(r.name) + (r.held && r.t !== m.t ? ' <span class="h">held</span>' : '') + (r.pool ? ' <span class="pl" title="in the Pool of Stocks Eligible for Middle Innings Portfolio Selection">Pool</span>' : '') + '</span><span class="rs">' + (r.rs == null ? '' : r.rs) + '</span></a>'; }).join('') + '</div></div>'; }).join(''); };
    render(''); document.getElementById('ov-q').oninput = function (e) { render(e.target.value.toLowerCase()); };
    if (location.hash === '#overlay') open(true);
  }

  window.DASH = { C: C, stack: stack, ladder: ladder, model: model, oneLine: oneLine, stateWords: stateWords, renderHeader: renderHeader, renderFund: renderFund, overlayFor: overlayFor, drawVolume: drawVolume,
    rsPanel: rsPanel, relPanel: relPanel, statusPanel: statusPanel, ssPanels: ssPanels, ssLegend: ssLegend, ssTable: ssTable, valChart: valChart, valLine: valLine, pctNow: pctNow, peersPicture: peersPicture, peersTable: peersTable,
    renderRatings: renderRatings, renderContext: renderContext, renderJudgement: renderJudgement, renderPlaceholders: renderPlaceholders, renderExperiment: renderExperiment, overlay: overlay, CRIT_WORDS: CRIT_WORDS, addDays: addDays, ordinal: ordinal };
})();
