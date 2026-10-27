/* dashboard.js: the PMS Per-stock Dashboard, version 1 (9-Oct-2026, Systems Architect, session 2).
   Built to Richard's choices of 9-Oct-2026 (decisions D-BB-11 to D-BB-33 in projects/SA - Position Management System/decisions.md):
   Treatment 4 with his seven additions; the Master Dashboard chart with the exit levels; Treatment B for volume under it on one time axis;
   the sell-side lines on one chart with a right-hand axis for a series of oddly larger range; Treatment C for peers; the valuation
   charts with the colour bands; the sliding overlay; the six-panel summary view. No profit and loss anywhere (Message 88; D-BB-28).
   READ, NEVER RECOMPUTE: every criterion reading, threshold, level and loss figure comes from the data file, which takes them from the
   Framework 14 reader. The page only draws, and decides colours ("met", "within reach", "clear") from the reader's own readings. */
/* version 2 (27-Oct-2026, Richard's rebuild, D-PMS-V4-33 to V4-57): one column, his items only, in his order; the agreed charts
   reused unchanged except where he asked: negative numbers in brackets everywhere; quarters and years marked on the time axes;
   the consensus charts one per measure in one column; analyst ratings above the target price chart; Net Upgrade Breadth as
   stacked counts behind the line; the peer table edited. */
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
  /* Richard, 27-Oct-2026 (D-PMS-V4-36): "Always display negative numbers as (X) not -X" */
  function br(sv) { sv = String(sv); return /^-/.test(sv) && !/^-0(\.0*)?%?$/.test(sv) ? '(' + sv.slice(1) + ')' : sv.replace(/^-/, ''); }
  function sg(v, sv) { return v > 0 ? '+' + sv : br((v < 0 ? '-' : '') + sv); }
  function pct0(v) { return v == null ? 'n/a' : br(Math.round(v * 100) + '%'); }
  function pctS(v) { return v == null ? 'n/a' : sg(Math.round(v * 100), Math.abs(Math.round(v * 100)) + '%'); }
  function sgn(v, dp) { return v == null ? 'n/a' : sg(+v.toFixed(dp == null ? 1 : dp), Math.abs(v).toFixed(dp == null ? 1 : dp)); }
  function pctI(v) { return v == null ? 'n/a' : sg(v, Math.abs(v) + '%'); }
  function intS(v) { return v == null ? 'n/a' : sg(v, String(Math.abs(v))); }
  function ratingColor(g) { return { A: '#C0DD97', B: '#EAF3DE', C: '#FAEEDA', D: '#F5C4B3', F: '#F7C1C1' }[g] || '#eaeef2'; }
  function fmtVol(v) { if (v == null) return 'n/a'; var a = Math.abs(v); return a >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : a >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v)); }
  function lastOnOrBefore(arr, key, d) { var r = null; for (var i = 0; i < arr.length; i++) { if (arr[i][key] <= d) r = arr[i]; else break; } return r; }
  function monthTicks(d0, d1) { var out = [], a = D(d0), b = D(d1), y = a.getUTCFullYear(), m = a.getUTCMonth() + 1; for (;;) { if (m > 11) { m = 0; y++; } var t = new Date(Date.UTC(y, m, 1)); if (t > b) break; out.push(t.toISOString().slice(0, 10)); m++; } return out; }
  /* round 2 (17-Oct-2026): round axis numbers, so every scale reads at a glance */
  function niceTicks(lo, hi, n) { if (!(hi > lo)) return [lo]; var raw = (hi - lo) / Math.max(1, n || 4), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p, st = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p, out = []; for (var v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(10)); return out; }
  function fmtN0(v) { var a = Math.abs(v); if (Math.abs(v - Math.round(v)) < 1e-9) return Math.round(v).toLocaleString('en-GB'); return a >= 1000 ? Math.round(v).toLocaleString('en-GB') : a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toFixed(3); }
  function fmtN(v) { if (v == null) return 'n/a'; return br(fmtN0(v)); }
  function monthLabels(svg, pts, H, mode) {
    pts.forEach(function (o, i) { var d = D(o.d), mo = d.getUTCMonth(), q = mo % 3 === 0; if (mode === 'quarter' && !q) return;
      txt(svg, o.x, H - 18, mode === 'initial' ? MON[mo][0] : MON[mo], { 'text-anchor': 'middle', 'font-size': 10, fill: q ? C.ink2 : C.ink3, 'font-weight': q ? 600 : 400 });
      if (mo === 0 || (i === 0 && mo <= 9)) txt(svg, o.x, H - 4, String(d.getUTCFullYear()), { 'text-anchor': (i === 0 && mo !== 0) ? 'start' : 'middle', 'font-size': 10, fill: C.ink, 'font-weight': 700 }); });
  }
  function isQuarterStart(s) { var mo = D(s).getUTCMonth(); return mo % 3 === 0; }
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
  window.DU = { warnBanner: warnBanner, fmtD: fmtD, fmtDY: fmtDY, esc: esc, pctS: pctS, pct0: pct0, pctI: pctI, intS: intS, br: br, sgn: sgn, ratingColor: ratingColor, fmtVol: fmtVol };

  /* ------------------------------------------------------------------ a stacked time chart (SVG), one level deeper on hover */
  function stack(container, opts) {
    var W = opts.width || container.clientWidth || 900, L = opts.left || 48, R = opts.right == null ? 150 : opts.right, gap = 24;
    var d0 = opts.d0, d1 = opts.d1;
    /* round 2: each pane's title sits in its own band directly on top of its pane, with clear space above (Richard, image 2) */
    var TB = function (p) { return p.title ? 22 : 0; };
    var T = 6 + TB(opts.panels[0]);
    /* round 3 (Richard, image 7: "each month listed and quarters and years more clearly indicated"): every month is labelled,
       by its first letter where months are close together, with the year on its own row */
    /* 27-Oct-2026: monthly data (month-end readings) can put each month's gridline and label on its month-end (opts.monthEnd), so a reading sits on its own month's label */
    var ME = !!opts.monthEnd, ticks = ME ? monthTicks(d0, addDays(d1, 1)).map(function (t) { return addDays(t, -1); }).filter(function (t) { return t >= d0 && t <= d1; }) : monthTicks(d0, d1), pxm = (W - L - R) / Math.max(1, ticks.length + 0.5);
    var mode = opts.tickEvery ? 'every' : pxm >= 26 ? 'abbr' : pxm >= 8 ? 'initial' : 'quarter';
    var H = opts.panels.reduce(function (a, p, i) { return a + p.h + gap + (i ? TB(p) : 0); }, T) + 18 + (mode === 'every' ? 0 : 12);
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: 'display:block;max-width:100%;font-family:Segoe UI,system-ui,sans-serif' }, container);
    var span = D(d1) - D(d0) || 1;
    var x = function (s) { return L + (D(s) - D(d0)) / span * (W - L - R); };
    var y0 = T;
    opts.panels.forEach(function (p, pi) {
      if (pi && p.title) y0 += TB(p);
      var g = el('g', { transform: 'translate(0,' + y0 + ')' }, svg);
      var lo = p.yDomain[0], hi = p.yDomain[1], lo2 = p.yDomain2 ? p.yDomain2[0] : null, hi2 = p.yDomain2 ? p.yDomain2[1] : null;
      var y = function (v) { return p.h - (v - lo) / (hi - lo) * p.h; };
      var y2 = function (v) { return p.h - (v - lo2) / (hi2 - lo2) * p.h; };
      var yt = p.yTicks || niceTicks(lo, hi, p.h > 120 ? 4 : 3);
      yt.forEach(function (v) { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: C.grid, 'stroke-width': 1 }, g); txt(g, L - 6, Math.max(10, Math.min(p.h - 1, y(v) + 4)), (p.yFmt || fmtN)(v), { 'text-anchor': 'end', 'font-size': 10, fill: C.ink3 }); });
      if (p.yDomain2) (p.yTicks2 || niceTicks(lo2, hi2, 3)).forEach(function (v) { txt(g, W - R + 4, Math.max(10, Math.min(p.h - 1, y2(v) + 4)), (p.yFmt2 || fmtN)(v), { 'font-size': 10, fill: C.ink3 }); });
      /* round 2: thin month lines, thicker quarter-end lines (Richard, image 4) */
      /* 27-Oct-2026 (Richard: "make the quarters and years more clearly called out (subtly/elegantly)"): a month line, a firmer quarter line, a darker year line */
      ticks.forEach(function (t) { var tb = ME ? addDays(t, 1) : t, yr = D(tb).getUTCMonth() === 0, q = isQuarterStart(tb); el('line', { x1: x(t), x2: x(t), y1: 0, y2: p.h, stroke: yr ? '#8c959f' : q ? '#c4cbd3' : C.grid, 'stroke-width': yr ? 1.3 : 1 }, g); });
      (p.thresholds || []).forEach(function (th) {
        if (th.zone === 'below') el('rect', { x: L, y: y(th.v), width: W - L - R, height: Math.max(0, p.h - y(th.v)), fill: th.fill || C.redFill }, g);
        if (th.zone === 'above') el('rect', { x: L, y: 0, width: W - L - R, height: Math.max(0, y(th.v)), fill: th.fill || C.redFill }, g);
      });
      (p.markers || opts.markers || []).forEach(function (m, mi) { if (m.d < d0 || m.d > d1) return; el('line', { x1: x(m.d), x2: x(m.d), y1: 0, y2: p.h, stroke: m.color || C.entry, 'stroke-width': 1, 'stroke-dasharray': '3 3' }, g); if (pi === 0 && m.label) txt(g, x(m.d) + 3, 11 + 11 * (mi % 2), m.label, { fill: m.color || C.entry, 'font-size': 10, halo: true }); });
      var ends = [];
      p.series.forEach(function (s) {
        var yy = s.axis === 'right' ? y2 : y;
        var pts = s.pts.filter(function (q) { return q.v !== null && q.v !== undefined && q.d >= d0 && q.d <= d1; });
        if (s.kind === 'stacked') {
          /* 27-Oct-2026 (Richard, D-PMS-V4-34): counts as a coloured stacked area, the number written in each band at each reading */
          var sp = s.pts.filter(function (q) { return q.d >= d0 && q.d <= d1; }), segs = [], cur = [];
          sp.forEach(function (q, i) { if (i && (D(q.d) - D(sp[i - 1].d)) / 864e5 > (s.gap || 45)) { segs.push(cur); cur = []; } cur.push(q); }); if (cur.length) segs.push(cur);
          segs.forEach(function (seg) {
            var base = seg.map(function () { return 0; });
            s.layers.forEach(function (Ly) {
              var top = seg.map(function (q, i) { return base[i] + (q[Ly.k] || 0); });
              if (seg.length === 1) { var cx0 = x(seg[0].d); el('rect', { x: cx0 - 7, y: yy(top[0]), width: 14, height: Math.max(0, yy(base[0]) - yy(top[0])), fill: Ly.color }, g); }
              else { var dpa = ''; seg.forEach(function (q, i) { dpa += (i ? 'L' : 'M') + x(q.d).toFixed(1) + ',' + yy(top[i]).toFixed(1); }); for (var bi = seg.length - 1; bi >= 0; bi--) dpa += 'L' + x(seg[bi].d).toFixed(1) + ',' + yy(base[bi]).toFixed(1); el('path', { d: dpa + 'Z', fill: Ly.color, stroke: 'none' }, g); }
              if (s.numbers) seg.forEach(function (q, i) { var v = q[Ly.k] || 0; if (!v) return; var ya = yy(base[i]), yb = yy(top[i]); if (ya - yb < 10) return; txt(g, Math.max(L + 5, Math.min(W - R - 5, x(q.d))), (ya + yb) / 2 + 3.5, String(v), { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 600, fill: Ly.ink || C.ink, halo: true }); });
              base = top;
            });
          });
          if (s.endLabels && sp.length) { var lq = sp[sp.length - 1], cb = 0; s.layers.forEach(function (Ly) { var v = lq[Ly.k] || 0; ends.push({ x: p.labelEdge ? W - R + 6 : x(lq.d) + 6, y: yy(cb + v / 2) + 4, t: Ly.label + ' ' + (s.endFmt ? s.endFmt(v) : v), c: Ly.ink || C.ink2 }); cb += v; }); }
        }
        else if (s.kind === 'bar') { var bw = s.bw || 4; pts.forEach(function (q) { var a = yy(Math.min(q.v, s.cap || q.v)), z = yy(0); el('rect', { x: x(q.d) - bw / 2 + (s.off || 0), y: Math.min(a, z), width: bw, height: Math.abs(z - a) || 1, fill: s.color }, g); }); }
        else if (s.kind === 'dots') { pts.forEach(function (q) { el('circle', { cx: x(q.d), cy: yy(q.v), r: s.r || 3.5, fill: s.hollow ? C.surface : s.color, stroke: s.hollow ? s.color : C.surface, 'stroke-width': 1.5 }, g); }); }
        else if (pts.length) {
          var dp = ''; pts.forEach(function (q, i) { var brk = !i || (s.gap && (D(q.d) - D(pts[i - 1].d)) / 864e5 > s.gap); dp += (brk ? 'M' : 'L') + x(q.d).toFixed(1) + ',' + yy(q.v).toFixed(1); });
          if (s.gap) pts.forEach(function (q, i) { var lone = (!i || (D(q.d) - D(pts[i - 1].d)) / 864e5 > s.gap) && (i === pts.length - 1 || (D(pts[i + 1].d) - D(q.d)) / 864e5 > s.gap); if (lone) el('circle', { cx: x(q.d), cy: yy(q.v), r: 2.6, fill: s.color }, g); });
          el('path', { d: dp, fill: 'none', stroke: s.color, 'stroke-width': s.w || 1.6, 'stroke-dasharray': s.dash || '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: s.opacity || 1 }, g);
          if (s.endLabel) { var q = pts[pts.length - 1]; ends.push({ x: p.labelEdge ? W - R + 6 : x(q.d) + 6, y: yy(q.v) + 4, t: s.endLabel, c: s.color }); }
        }
      });
      /* round 2: end labels pushed apart so two lines ending close together never print on top of each other */
      var gapE = p.labelGap || 12; ends.forEach(function (e) { e.y = Math.max(10, e.y); }); ends.sort(function (a, b) { return a.y - b.y; }); for (var ei = 1; ei < ends.length; ei++) if (ends[ei].y - ends[ei - 1].y < gapE) ends[ei].y = ends[ei - 1].y + gapE;
      if (ends.length && ends[ends.length - 1].y > p.h + 8) { var sh = ends[ends.length - 1].y - (p.h + 8); ends.forEach(function (e) { e.y -= sh; }); for (var ej = ends.length - 2; ej >= 0; ej--) if (ends[ej + 1].y - ends[ej].y < gapE) ends[ej].y = ends[ej + 1].y - gapE; }
      ends.forEach(function (e) { txt(g, e.x, e.y, e.t, { fill: e.c, 'font-size': p.labelSize || 10.5, 'font-weight': 600, halo: true }); });
      (p.thresholds || []).forEach(function (th) { if (th.noline) return; el('line', { x1: L, x2: W - R, y1: y(th.v), y2: y(th.v), stroke: th.color, 'stroke-width': 1.2, 'stroke-dasharray': '5 3' }, g); if (th.label) txt(g, L + 4, y(th.v) - 3, th.label, { fill: th.color, 'font-size': 10, halo: true }); });
      (p.rightLabels || []).forEach(function (rl) { txt(g, W - R + 8, Math.max(10, Math.min(p.h - 2, y(rl.v))) + 4 + (rl.dy || 0), rl.text, { fill: rl.color || C.ink2, 'font-size': 10.5, 'font-weight': 600 }); });
      if (p.title) { el('rect', { x: L, y: y0 - 20, width: W - L - R, height: 19, fill: C.bg2 }, svg); el('line', { x1: L, x2: L, y1: y0 - 20, y2: y0 - 1, stroke: C.ink3, 'stroke-width': 3 }, svg); txt(svg, L + 7, y0 - 6, p.title, { fill: C.ink, 'font-size': p.title.length > 120 ? 10.5 : 11.5, 'font-weight': 600 }); }
      el('line', { x1: L, x2: W - R, y1: p.h, y2: p.h, stroke: C.border }, g);
      y0 += p.h + gap;
    });
    /* round 2: every month labelled where there is room (else each quarter), with the year on January and on the first label */
    if (mode === 'every') { var every = opts.tickEvery, firstLab = true;
      ticks.forEach(function (t) { var d = D(t); if (d.getUTCMonth() % every !== 0) return; var yr = d.getUTCMonth() === 0 || firstLab; firstLab = false; txt(svg, x(t), H - 6, MON[d.getUTCMonth()] + (yr ? ' ' + d.getUTCFullYear() : ''), { 'text-anchor': 'middle', 'font-size': 10, fill: yr ? C.ink2 : C.ink3, 'font-weight': yr ? 600 : 400 }); }); }
    else monthLabels(svg, ticks.map(function (t) { return { x: x(t), d: t }; }), H, mode);
    var cross = el('line', { x1: 0, x2: 0, y1: T, y2: H - 18, stroke: C.ink3, 'stroke-width': 1, 'stroke-dasharray': '2 2', opacity: 0 }, svg);
    var tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; container.style.position = 'relative'; container.appendChild(tip);
    svg.addEventListener('mousemove', function (ev) {
      var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width);
      if (px < L || px > W - R) { cross.setAttribute('opacity', 0); tip.style.display = 'none'; return; }
      var t = new Date(D(d0).getTime() + (px - L) / (W - L - R) * span).toISOString().slice(0, 10);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('opacity', 1);
      var h = '<b>' + fmtDY(t) + '</b>';
      opts.panels.forEach(function (p) { p.series.forEach(function (s) { if (!s.label) return; if (s.kind === 'stacked') { var sq = s.pts.filter(function (q) { return q.d <= t; }); if (!sq.length) return; var lq = sq[sq.length - 1]; h += '<div>' + esc(s.label) + ' <span class="mut">(' + fmtD(lq.d) + ')</span>: ' + s.layers.map(function (Ly) { return '<span style="color:' + (Ly.tip || '#fff') + '">' + esc(Ly.label) + ' ' + (lq[Ly.k] || 0) + (s.unit || '') + '</span>'; }).join(', ') + '</div>'; return; } var pts = s.pts.filter(function (q) { return q.v != null && q.d <= t; }); if (!pts.length) return; var q = pts[pts.length - 1]; h += '<div><span style="color:' + s.color + '">&#9679;</span> ' + esc(s.label) + ': ' + esc((s.fmt || String)(q.v)) + (q.d !== t ? ' <span class="mut">(' + fmtD(q.d) + ')</span>' : '') + '</div>'; }); });
      tip.innerHTML = h; tip.style.display = 'block'; tip.style.left = Math.max(0, Math.min(ev.clientX - r.left + 14, r.width - 290)) + 'px'; tip.style.top = (ev.clientY - r.top + 10) + 'px';
    });
    svg.addEventListener('mouseleave', function () { cross.setAttribute('opacity', 0); tip.style.display = 'none'; });
    return svg;
  }

  /* ------------------------------------------------------------------ the distance ladder: one row per Sell Criterion, nearest first */
  function ladder(container, rows, opts) {
    opts = opts || {}; var W = opts.width || container.clientWidth || 900, LW = opts.labelWidth || 330, RW = opts.rightWidth || 300, rh = 56;
    var H = rows.length * rh + 24;
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: 'display:block;max-width:100%;font-family:Segoe UI,system-ui,sans-serif' }, container);
    rows.forEach(function (r, i) {
      var y = 24 + i * rh, x0 = LW, x1 = W - RW;
      var x = function (v) { return x0 + (Math.max(r.lo, Math.min(r.hi, v)) - r.lo) / (r.hi - r.lo) * (x1 - x0); };
      var g = el('g', {}, svg);
      el('rect', { x: 0, y: y - 20, width: W, height: rh, fill: i % 2 ? C.bg2 : C.surface }, g);
      var words = r.label.split(' '), l1 = [], l2 = []; words.forEach(function (w) { ((l1.join(' ') + ' ' + w).length <= 46 && !l2.length ? l1 : l2).push(w); });
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
      /* round 3 (17-Oct-2026): the right-hand readings are short sentences, wrapped to the column */
      var wrap = function (s, n) { var out = [], cur = ''; String(s || '').split(' ').forEach(function (w) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) out.push(cur); return out; };
      var n1 = Math.floor((RW - 16) / 6.4), n2 = Math.floor((RW - 16) / 5.3), ty = y - 9;
      var l1s = wrap(r.text, n1).slice(0, 3), l2s = wrap(info ? 'Information only: the moving-average stop decides the sale.' : r.text2, n2).slice(0, Math.max(1, 4 - l1s.length));
      l1s.forEach(function (l) { txt(g, x1 + 12, ty, l, { fill: col, 'font-size': 11.5, 'font-weight': 700 }); ty += 13; });
      l2s.forEach(function (l) { txt(g, x1 + 12, ty, l, { fill: info ? C.neutral : C.ink2, 'font-size': 10 }); ty += 12; });
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
      text: c1.fires ? 'Met: Industry RS was ' + c1.value + ' on ' + fmtD(c1.reading_day) + '.' : 'Industry RS was ' + c1.value + ' on ' + fmtD(c1.reading_day) + ', ' + (c1.value - 30) + ' points above 30.', text2: e ? 'It was ' + e.ind + ' when tranche 1 was bought.' : '' });
    var sl = function (d) { var q = d ? fridayFor(d) : null; var x = q ? dailyAt(q.d) : null; return x ? x.slope : null; };
    m.rows.push({ id: 'C2', label: 'The 200-day average of relative price: change over the month', sub: 'read each Friday; sells at 0 or below', lo: -0.04, hi: 0.08, trigger: 0, triggerSide: 'below', fmt: function (v) { return br((v * 100).toFixed(0) + '%'); }, state: info ? 'info' : c2.fires ? 'fires' : near(c2.value, 0, 0.01) ? 'near' : 'clear',
      marks: [{ v: e ? e.slope : null, kind: 'entry', label: 'bought' }, { v: sl(m.me3), kind: 'm3' }, { v: sl(m.me1), kind: 'm1' }, { v: c2.value, kind: 'latest' }, { v: c2.today, kind: 'today' }],
      text: (c2.fires ? 'Met: the average ' : 'The average ') + (Math.abs(c2.value) < 0.0005 ? 'was flat (a change of less than 0.1%)' : (c2.value >= 0 ? 'rose ' : 'fell ') + Math.abs(c2.value * 100).toFixed(1) + '%') + ' over the month to ' + fmtD(c2.reading_day) + '.', text2: e && e.slope != null ? 'When tranche 1 was bought, it had ' + (e.slope >= 0 ? 'risen ' : 'fallen ') + Math.abs(e.slope * 100).toFixed(1) + '% over the month.' : '' });
    var v3 = c3.value, s3met = v3.sector_rs < 50, s3other = v3.stock_rs < 70;
    var r3 = function (d, k) { var q = d ? rsAt(d) : null; return q ? q[k] : null; };
    m.rows.push({ id: 'C3s', label: 'Sector RS below 50 (sells with Stock RS below 70)', sub: 'read at the month-end; sells the whole holding', lo: 0, hi: 99, trigger: 50, triggerSide: 'below', state: info ? 'info' : c3.fires ? 'fires' : (s3met || s3other || near(v3.sector_rs, 50, 10)) ? 'near' : 'clear',
      marks: [{ v: e ? e.sec : null, kind: 'entry', label: 'bought' }, { v: r3(m.me3, 'sec'), kind: 'm3' }, { v: r3(m.me1, 'sec'), kind: 'm1' }, { v: v3.sector_rs, kind: 'latest' }, { v: (c3.today || {}).sector_rs, kind: 'today' }],
      text: c3.fires ? 'Met: Sector RS was ' + v3.sector_rs + ' and Stock RS ' + v3.stock_rs + ' at the ' + fmtD(c3.reading_day) + ' month-end.' : s3met ? 'Sector RS was ' + v3.sector_rs + ' at the ' + fmtD(c3.reading_day) + ' month-end, below 50, but Stock RS ' + v3.stock_rs + ' was not below 70.' : 'Sector RS was ' + v3.sector_rs + ' at the ' + fmtD(c3.reading_day) + ' month-end, ' + (v3.sector_rs - 50) + ' above 50.', text2: e ? 'It was ' + e.sec + ' when tranche 1 was bought.' : '' });
    m.rows.push({ id: 'C34', label: 'Stock RS: 70 line (sells with Sector RS below 50); 50 line (sells with analysts cutting)', sub: 'read at the month-end; sells the whole holding', lo: 0, hi: 99, trigger: 70, trigger2: 50, triggerSide: 'below', state: info ? 'info' : (c3.fires || c4.fires) ? 'fires' : (v3.stock_rs < 70 || near(v3.stock_rs, 70, 10)) ? 'near' : 'clear',
      marks: [{ v: e ? e.s : null, kind: 'entry', label: 'bought' }, { v: r3(m.me3, 's'), kind: 'm3' }, { v: r3(m.me1, 's'), kind: 'm1' }, { v: v3.stock_rs, kind: 'latest' }, { v: (c3.today || {}).stock_rs, kind: 'today' }],
      text: 'Stock RS was ' + v3.stock_rs + ' at the ' + fmtD(c3.reading_day) + ' month-end, ' + (v3.stock_rs < 50 ? 'below both lines.' : v3.stock_rs < 70 ? 'below 70 but above 50.' : (v3.stock_rs - 70) + ' above 70.'), text2: e ? 'It was ' + e.s + ' when tranche 1 was bought.' : '' });
    var v4 = c4.value || {}, b4 = minNub({ sales: v4.ss_sales_nub100, tp: v4.ss_pt_nub100 });
    m.rows.push({ id: 'C4b', label: 'Net Upgrade Breadth, the weaker of the two counts (sells with Stock RS below 50)', sub: 'read at the month-end on the 100-day count', lo: -1, hi: 1, trigger: 0, triggerSide: 'below', fmt: function (v) { return pctS(v); }, state: info ? 'info' : c4.fires ? 'fires' : (b4 != null && b4 <= 0.1) ? 'near' : 'clear',
      marks: [{ v: e ? minNub(nubAt(e.grid_day)) : null, kind: 'entry', label: 'bought' }, { v: m.me3 ? minNub(nubAt(m.me3)) : null, kind: 'm3' }, { v: m.me1 ? minNub(nubAt(m.me1)) : null, kind: 'm1' }, { v: b4, kind: 'latest' }],
      text: v4.analyst_data === false ? 'No analyst data was held at the ' + fmtD(c4.reading_day) + ' month-end.' : (c4.fires ? 'Met: ' : '') + 'Net Upgrade Breadth was ' + (v4.ss_sales_nub100 == null ? 'not available' : pctS(v4.ss_sales_nub100)) + ' on sales estimates and ' + (v4.ss_pt_nub100 == null ? 'not available' : pctS(v4.ss_pt_nub100)) + ' on target prices at the ' + fmtD(c4.reading_day) + ' month-end.',
      text2: 'Stock RS was ' + v4.stock_rs + (v4.stock_rs < 50 ? ', below 50, so this rule can sell.' : ', above 50, so this rule cannot sell yet.') });
    var dl = dailyAt(m.asof) || {}, cl = dl.c;
    var rd = function (d) { var q = d ? dailyAt(d) : null; return q ? q.rdh : null; };
    m.rows.push({ id: 'C5', label: 'Relative price against its 52-week high (sells more than 25% below)', sub: 'read at the month-end; sells the whole holding', lo: -0.5, hi: 0, trigger: -0.25, triggerSide: 'below', fmt: function (v) { return pct0(v); }, state: info ? 'info' : c5.fires ? 'fires' : near(c5.value, -0.25, 0.05) ? 'near' : 'clear',
      marks: [{ v: e ? e.rdh : null, kind: 'entry', label: 'bought' }, { v: rd(m.me3), kind: 'm3' }, { v: rd(m.me1), kind: 'm1' }, { v: c5.value, kind: 'latest' }, { v: c5.today, kind: 'today' }],
      text: (c5.fires ? 'Met: relative price was ' : 'Relative price was ') + Math.round(-c5.value * 100) + '% below its 52-week high at the ' + fmtD(c5.reading_day) + ' month-end.', text2: (dl.trig && cl) ? (dl.trig <= cl ? 'Today the share price is ' + Math.round((cl - dl.trig) / cl * 100) + '% above the price at which this rule sells, about ' + Math.round(dl.trig) + '.' : 'Today the share price is ' + Math.round((dl.trig - cl) / dl.trig * 100) + '% below the price at which this rule sells, about ' + Math.round(dl.trig) + '.') : '' });
    if (m.tranches.length) {
      var tr = m.tranches.slice().sort(function (a, b) { return a.distance_to_level_pct - b.distance_to_level_pct; })[0];
      var lv = (Hd.levels.filter(function (x) { return x.tranche === tr.tranche_number; })[0] || { pts: [] }).pts;
      var fallAt = function (d) { if (!d) return null; var q = null; for (var i = 0; i < lv.length; i++) { if (lv[i][0] <= d) q = lv[i]; else break; } var c = dailyAt(d); return (q && c && c.c) ? (c.c - q[1]) / c.c : null; };
      var lt = tr.distance_to_level_pct / 100;
      m.rows.push({ id: 'C6', label: 'The nearest tranche\'s distance to its 30% level', sub: 'a close below it, with Stock RS below 70, sells it', lo: -0.1, hi: 0.35, trigger: 0, triggerSide: 'below', fmt: function (v) { return pct0(v); }, state: info ? 'info' : tr.state !== 'no trigger' ? 'fires' : lt <= 0.10 ? 'near' : 'clear',
        marks: [{ v: 0.30, kind: 'entry', label: 'bought' }, { v: fallAt(m.me3), kind: 'm3' }, { v: fallAt(m.me1), kind: 'm1' }, { v: lt, kind: 'latest' }],
        text: (function () { if (tr.state === 'no trigger') return 'Tranche ' + tr.tranche_number + ' can fall a further ' + Math.round(tr.distance_to_level_pct) + '% before it reaches its 30% level.'; var rel = /close >= ([0-9.]+)/.exec(tr.state), td = tr.trigger && tr.trigger.day; if (info) return 'Tranche ' + tr.tranche_number + ' fell below its 30% level' + (td ? ' on ' + fmtD(td) : '') + '; for a Probing Bet this is information only.'; return 'Met' + (td ? ' on ' + fmtD(td) : '') + ': tranche ' + tr.tranche_number + ' is in its release window, sold after a close at or above ' + (rel ? (+rel[1]).toFixed(2) : 'its release price') + ' or on the 63rd trading day.'; })(),
        text2: (tr.state !== 'no trigger' ? 'The price is ' + Math.round(tr.distance_to_level_pct) + '% above the 30% level; ' : '') + 'Stock RS today is ' + tr.stock_rs_today + '.' });
    }
    var order = { fires: 0, near: 1, clear: 2, info: 3 };
    /* 18-Oct-2026 re-check: "nearest first" now means nearest, measured as the distance from the reading the rule acts on to the
       line that sells, as a share of the row's scale (before, rows of the same colour kept their build order) */
    m.rows.forEach(function (r) { var la = r.marks.filter(function (q) { return q.kind === 'latest'; })[0]; r.dist = (la && la.v != null) ? (la.v - r.trigger) / (r.hi - r.lo) : 9; });
    /* a two-part Sell Criterion is only as near as its further part */
    var rsD = function (v, line) { return v == null ? 9 : (v - line) / 99; }, nubD = (b4 == null ? 9 : b4 / 2);
    m.rows.forEach(function (r) {
      if (r.id === 'C3s') r.dist = Math.max(rsD(v3.sector_rs, 50), rsD(v3.stock_rs, 70));
      if (r.id === 'C4b') r.dist = Math.max(nubD, rsD(v4.stock_rs, 50));
      if (r.id === 'C34') r.dist = Math.min(Math.max(rsD(v3.stock_rs, 70), rsD(v3.sector_rs, 50)), Math.max(rsD(v3.stock_rs, 50), nubD));
    });
    m.rowsSorted = m.rows.slice().sort(function (a, b) { return (order[a.state] - order[b.state]) || (a.dist - b.dist); });
    m.nearestRow = m.rows.filter(function (r) { return r.state === 'near' || r.state === 'clear'; }).sort(function (a, b) { return a.dist - b.dist; })[0] || m.rows[0];
    var c3t = c3.today || {}, early = [];
    if (!c3.fires && c3t.sector_rs < 50 && c3t.stock_rs < 70) early.push('Sector RS is ' + c3t.sector_rs + ', below 50, with Stock RS ' + c3t.stock_rs + ', below 70');
    if (!c5.fires && c5.today != null && c5.today < -0.25) early.push('relative price is ' + Math.round(-c5.today * 100) + '% below its 52-week high');
    m.earlyText = early.length ? 'On today\'s daily readings, ' + early.join(', and ') + ', so ' + (early.length > 1 ? 'those Sell Criteria' : 'that Sell Criterion') + ' would be met if the month-end reading stays there.' : '';
    return m;
  }

  /* ------------------------------------------------------------------ text pieces */
  function stateWords(m) {
    if (m.probing) { var sx0 = /EXIT CONFIRMED (\d{4}-\d{2}-\d{2})/.exec((m.H.stops && m.H.stops[0] && m.H.stops[0].label) || ''); return 'Early Innings Probing Bet: its moving-average stop decides the sale' + (sx0 ? '. Its stop exit was confirmed on ' + fmtD(sx0[1]) + ', so the rule sells it at the next Tuesday session.' : ', and its price is above its stop.') + ' The six Sell Criteria are shown for information.'; }
    if (/^AWAITING/.test(m.order)) return 'AWAITING REPLACEMENT: ' + m.metCount + ' of the six Sell Criteria ' + (m.metCount === 1 ? 'is' : 'are') + ' met; it is sold when a replacement is bought, under your one-off in/out link.';
    if (/^SELL/.test(m.order)) return m.order;
    if (m.order === 'no signal' || !m.order) return 'No Sell Criterion is met.';
    return m.order;
  }
  function oneLine(m) {
    var stop = (m.H.stops && m.H.stops[0]) ? String(m.H.stops[0].label || '').replace(/(\d{4})-(\d{2})-(\d{2})/g, function (s) { return fmtD(s); }).replace(/^[A-Z ]+(?= )/, function (s) { return s.toLowerCase(); }) : '';
    var lose = ' What we could lose: ' + (m.estNearer != null ? Math.max(0, m.estNearer).toFixed(2) : 'n/a') + '% of capital.';
    if (m.probing) { var sx = /EXIT CONFIRMED (\d{4}-\d{2}-\d{2})/.exec((m.H.stops && m.H.stops[0] && m.H.stops[0].label) || ''); return m.name + ' is an Early Innings Probing Bet, so its moving-average stop decides the sale. ' + (sx ? 'Its stop exit was confirmed on ' + fmtD(sx[1]) + ' and it is not yet sold, so the rule sells it at the next Tuesday session.' : 'Its price is above its stop.') + lose; }
    var nr = m.nearestRow;
    return (m.metCount ? m.metCount + ' of the six Sell Criteria ' + (m.metCount === 1 ? 'is' : 'are') + ' met' + (/^AWAITING/.test(m.order) ? '; it is held under your one-off in/out link until a replacement is bought.' : '.') : 'No Sell Criterion is met. ' + (m.earlyText || 'Nearest to selling: ' + (nr ? nr.text : ''))) + lose;
  }

  function below(v) { return v == null ? 'n/a against' : Math.round(Math.abs(v) * 100) + '% ' + (v < 0 ? 'below' : 'above'); }
  /* round 3 (17-Oct-2026): the holding page said "yes" to an add for a Probing Bet whose stop exit is confirmed (IMCD, D'Ieteren);
     the front page was fixed in round 2, this fixes the holding page. The data's add rule does not yet know about stop exits. */
  function roomWords(m, add) {
    var sx = m.probing ? /EXIT CONFIRMED (\d{4}-\d{2}-\d{2})/.exec((m.H.stops && m.H.stops[0] && m.H.stops[0].label) || '') : null;
    if (sx) return '<b>No:</b> its moving-average stop exit was confirmed on ' + fmtD(sx[1]) + ', so the rule allows no add.';
    if (add.allowed) return '<b>Yes:</b> the rule allows a next add of ' + add.next_add_pct + '% of capital (' + (add.room_pct != null ? add.room_pct.toFixed(2) : 'n/a') + '% of room below its ' + add.limit_pct + '% limit).';
    if (/Sell Criterion has fired/.test(add.why || '')) return '<b>No:</b> a Sell Criterion is met, so the rule allows no add.';
    return '<b>No:</b> it holds ' + esc(String(add.why || '').split(';')[0].replace(/ \(.*\)$/, '')) + '.';
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
      '<div style="margin-top:8px"><span class="pill ' + pill + '">' + esc(m.status) + '</span> ' + (m.oneOff ? '<span class="pill grey">held under your one-off in/out link</span>' : '') + '</div>' +
      '<div class="kv" style="margin-top:6px"><span class="k">Order sheet</span><span class="v">' + esc(stateWords(m)) + '</span></div></div>' +
      '<div class="kv"><span class="k">Position</span><span class="v"><span class="big">' + R.size_pct.toFixed(2) + '%</span> of capital in ' + m.tranches.length + ' tranche' + (m.tranches.length === 1 ? '' : 's') + '</span>' +
      '<span class="k">Tranches</span><span class="v">' + m.tranches.map(function (tr) { return 'tranche ' + tr.tranche_number + ': ' + tr.size_pct.toFixed(2) + '%, bought ' + fmtDY(tr.entry_date) + (tr.entry_date_caution ? ' <span class="mut">(record start, not necessarily the purchase date)</span>' : ''); }).join('<br>') + '</span>' +
      '<span class="k">Room to add</span><span class="v">' + roomWords(m, add) + '</span></div>' +
      '<div class="kv"><span class="k">What we could lose (% of capital)</span><span class="v"><span class="big">' + (m.estNearer != null ? Math.max(0, m.estNearer).toFixed(2) : 'n/a') + '%</span> if the price falls to each tranche\'s nearer exit level; ' + (m.est != null ? Math.max(0, m.est).toFixed(2) : 'n/a') + '% if it falls to the 30% levels only.' + (m.est < 0 ? ' <span class="mut">The price is already below a 30% level, so that tranche is in its release window.</span>' : '') + '</span>' +
      '<span class="k">Readings when tranche 1 was bought (' + (e ? fmtDY(e.entry_date) : 'n/a') + ')</span><span class="v">' + (e ? 'Stock RS ' + e.s + ', Sector RS ' + e.sec + ' and Industry RS ' + e.ind + '; relative price ' + below(e.rdh) + ' its 52-week high.' : 'n/a') + '</span>' +
      '<span class="k">Readings today (' + fmtD(m.asof) + ')</span><span class="v">Stock RS ' + (c3.today || {}).stock_rs + ', Sector RS ' + (c3.today || {}).sector_rs + ' and Industry RS ' + c1.today + '; relative price ' + below(c5.today) + ' its 52-week high.</span></div>';
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
      /* round 2 (Richard, image 1): each line's label says in words what the price on it means */
      var fp = function (v) { return v == null ? '' : v < 100 ? v.toFixed(2) : v.toFixed(1); };
      var trw = function (trs) { return trs.length > 1 ? 'tranches ' + trs.slice(0, -1).join(', ') + ' and ' + trs[trs.length - 1] : 'tranche ' + trs[0]; };
      Object.keys(groups).forEach(function (k, gi) { var g = groups[k], by = {}; g[0].pts.forEach(function (q) { by[q[0]] = q[1]; }); var trs = g.map(function (x) { return x.tranche; });
        lines.push({ label: short ? '30% level ' + fp(g[0].level) : fp(g[0].level) + ': 30% below the highest close since ' + trw(trs) + (trs.length > 1 ? ' were' : ' was') + ' bought', color: '#cf222e', dash: [3, 3], width: 1.7, byDate: by, labelDy: 14 }); });
      var bt = {}; H.daily.forEach(function (q) { if (q.trig) bt[q.d] = q.trig; });
      var lastT = H.daily[H.daily.length - 1].trig;
      lines.push({ label: short ? '52-week-high line ' + (lastT ? fp(lastT) : '') : (lastT ? fp(lastT) + ': ' : '') + 'below this price, relative price is more than 25% under its 52-week high', color: '#bf3989', dash: [6, 3], width: 1.4, byDate: bt, labelDy: -5 });
    } else {
      var sg = {};
      (H.stops || []).forEach(function (s) { var k = (s.stop_level || 0).toFixed(4) + s.stop_ma; (sg[k] = sg[k] || []).push(s); });
      Object.keys(sg).forEach(function (k) { var g = sg[k], by = {}; g[0].pts.forEach(function (q) { by[q[0]] = q[1]; });
        var trs = g.map(function (s) { var tr = m.tranches.filter(function (x) { return x.entry_date === s.entry_date; })[0]; return tr ? tr.tranche_number : '?'; });
        lines.push({ label: (g[0].stop_level ? (Math.round(g[0].stop_level * 100) / 100) + ': ' : '') + 'the stop, the ' + String(g[0].stop_ma).replace('D', '-day') + ' average less 2%' + (short ? '' : ', for tranche' + (trs.length > 1 ? 's ' : ' ') + trs.join(', ')), color: '#cf222e', dash: [3, 3], width: 1.8, byDate: by, labelDy: 14 }); });
    }
    var marks = m.tranches.map(function (tr, i) { return { d: tr.entry_date, label: 'tranche ' + tr.tranche_number + ', ' + fmtD(tr.entry_date), row: i }; });
    return { lines: lines, marks: marks };
  }

  /* round 2 (17-Oct-2026, Richard's images 2, 3 and 5): under the price chart, on its trading days, two panes:
     "Buying and selling pressure" (volume bars, with each distribution day marked on its own bar; the up/down ratio and the
     distribution-day count are said in a sentence above, rather than drawn as two more panes), and the relative price pane,
     moved here from the relative strength section. Each title sits in its own band on top of its pane. */
  function pressureSentence(m) {
    var q = m.H.volume[m.H.volume.length - 1]; if (!q) return '';
    var r = q.ud20, s1 = r == null ? (q.ud20_no_down ? 'Over the last 20 sessions there was no down day, so buyers had the market to themselves.' : 'The up/down volume ratio over the last 20 sessions is not available.')
      : 'Over the last 20 sessions, volume on up days was <b>' + r.toFixed(2) + ' times</b> volume on down days, so ' + (r >= 1.2 ? '<b>buyers traded more heavily</b>' : r >= 1 ? 'buyers traded slightly more heavily' : r >= 0.8 ? 'sellers traded slightly more heavily' : '<b>sellers traded more heavily</b> (below 0.8 is the Master Dashboard\'s sign of sellers in force)') + '.';
    var s2 = 'There ' + (q.dist25 === 1 ? 'was <b>1 distribution day</b>' : 'were <b>' + q.dist25 + ' distribution days</b>') + ' in the last 25 sessions (a down close on volume above 1.25 times the 50-day average; each is marked &#9660; on its bar, and the shaded band on the chart is those 25 sessions); ' + (q.dist25 >= 6 ? '<b>that is at or above 6, the Master Dashboard\'s warning level</b>.' : '6 or more is the Master Dashboard\'s warning level.');
    return s1 + ' ' + s2;
  }
  function drawVolume(host, m, layout, opts) {
    opts = opts || {};
    host.innerHTML = '';
    if (!layout || !layout.dates || !layout.dates.length) return;
    var V = m.H.volume, by = {}; V.forEach(function (q) { by[q.d] = q; });
    var DL = {}; m.daily.forEach(function (q) { DL[q.d] = q; });
    var W = layout.W, pad = layout.pad, n = layout.dates.length, bw = layout.barW;
    var xi = function (i) { return pad.l + i * bw + bw / 2; };
    var compact = !!opts.compact, TB = compact ? 0 : 22;
    var h1 = compact ? (opts.h1 || 120) : 90, h2 = compact ? 0 : 90, gap = 26;
    var top1 = 6 + TB, top2 = top1 + h1 + gap + TB;
    var Htot = compact ? top1 + h1 + 4 : top2 + h2 + 36;
    var svg = el('svg', { width: W, height: Htot, viewBox: '0 0 ' + W + ' ' + Htot, style: 'display:block;max-width:100%;font-family:Segoe UI,system-ui,sans-serif' }, host);
    var rows = layout.dates.map(function (d) { return by[d] || null; });
    var vals = rows.filter(Boolean);
    var vmax = Math.max.apply(null, vals.map(function (q) { return q.v; }).concat([1])), v50m = Math.max.apply(null, vals.map(function (q) { return q.v50; }).concat([1]));
    var cap = Math.min(vmax, 3 * v50m) * 1.05;
    var band = function (top, title) { if (!title) return; el('rect', { x: pad.l, y: top - 20, width: W - pad.l - pad.r, height: 19, fill: C.bg2 }, svg); el('line', { x1: pad.l, x2: pad.l, y1: top - 20, y2: top - 1, stroke: C.ink3, 'stroke-width': 3 }, svg); txt(svg, pad.l + 7, top - 6, title, { fill: C.ink, 'font-size': title.length > 115 ? 10.5 : 11.5, 'font-weight': 600 }); };
    // month lines on both panes (quarter-ends thicker), month labels under the last pane
    var monthIdx = []; for (var i = 1; i < n; i++) if (layout.dates[i].slice(0, 7) !== layout.dates[i - 1].slice(0, 7)) monthIdx.push(i);
    var yBot = compact ? top1 + h1 : top2 + h2;
    monthIdx.forEach(function (i) { var md = layout.dates[i].slice(0, 7) + '-01', yr = D(md).getUTCMonth() === 0, q = isQuarterStart(md), xx = pad.l + i * bw; [[top1, top1 + h1]].concat(compact ? [] : [[top2, top2 + h2]]).forEach(function (yy) { el('line', { x1: xx, x2: xx, y1: yy[0], y2: yy[1], stroke: yr ? '#8c959f' : q ? '#c4cbd3' : C.grid, 'stroke-width': yr ? 1.3 : 1 }, svg); }); });
    if (!compact) { var room = (W - pad.l - pad.r) / Math.max(1, monthIdx.length + 0.5);
      monthLabels(svg, monthIdx.map(function (i) { return { x: pad.l + i * bw, d: layout.dates[i].slice(0, 7) + '-01' }; }), Htot, room >= 26 ? 'abbr' : room >= 8 ? 'initial' : 'quarter'); }
    // tranche marks
    m.tranches.forEach(function (tr) { var k = layout.dates.indexOf(tr.entry_date); if (k < 0) { for (var j = 0; j < n; j++) { if (layout.dates[j] >= tr.entry_date) { k = j; break; } } } if (k < 0 || layout.dates[0] > tr.entry_date) return; el('line', { x1: xi(k), x2: xi(k), y1: top1, y2: yBot, stroke: C.entry, 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg); });
    // pane 1: buying and selling pressure
    band(top1, compact ? '' : 'Volume, with its 20D (blue) and 50D (grey) averages; \u25BC a distribution day; shaded: the last 25 sessions');
    if (n > 25) { var sx0 = pad.l + (n - 25) * bw; el('rect', { x: sx0, y: top1, width: W - pad.r - sx0, height: h1, fill: 'rgba(31,35,40,0.06)' }, svg); }
    var y1 = function (v) { return top1 + h1 - Math.min(v, cap) / cap * h1; };
    var bwx = Math.max(1, bw * 0.78);
    rows.forEach(function (q, i) { if (!q) return; var hgt = Math.max(1, top1 + h1 - y1(q.v)), dist = !q.up && q.v50 > 0 && q.v > 1.25 * q.v50;
      el('rect', { x: xi(i) - bwx / 2, y: top1 + h1 - hgt, width: bwx, height: hgt, fill: dist ? 'rgba(207,34,46,0.95)' : q.up ? 'rgba(26,127,55,0.50)' : 'rgba(207,34,46,0.40)' }, svg);
      if (q.v > cap) el('rect', { x: xi(i) - bwx / 2, y: top1, width: bwx, height: 2, fill: C.ink }, svg);
      if (dist) txt(svg, xi(i), Math.max(top1 + 8, top1 + h1 - hgt - 2), '▼', { 'text-anchor': 'middle', 'font-size': compact ? 7 : 9, fill: C.red }); });
    var line = function (key, color, dash, yfn, w, src) { var dp = ''; (src || rows).forEach(function (q, i) { if (!q || q[key] == null) { return; } dp += (dp ? 'L' : 'M') + xi(i).toFixed(1) + ',' + yfn(q[key]).toFixed(1); }); if (dp) el('path', { d: dp, fill: 'none', stroke: color, 'stroke-width': w || 1.5, 'stroke-dasharray': dash || '' }, svg); };
    line('v20', C.stock, '', y1); line('v50', C.ink3, '4 3', y1);
    txt(svg, pad.l - 6, top1 + 10, fmtVol(cap), { 'text-anchor': 'end', 'font-size': 10, fill: C.ink3 }); txt(svg, pad.l - 6, top1 + h1, '0', { 'text-anchor': 'end', 'font-size': 10, fill: C.ink3 });
    el('line', { x1: pad.l, x2: W - pad.r, y1: top1 + h1, y2: top1 + h1, stroke: C.border }, svg);
    // pane 2: relative price, on the same trading days
    var y2 = null, drows = layout.dates.map(function (d) { var q = DL[d]; return q ? { rel: q.rel, rma: q.rma, rhi: q.rhi, z: q.rhi != null ? q.rhi * 0.75 : null, rdh: q.rdh } : null; });
    if (!compact) {
      band(top2, 'Relative price (blue), its 200D MA (grey, dashed), its 52W high (grey) and 25% below the 52W high (red, dotted)');
      var rv = []; drows.forEach(function (q) { if (q) ['rel', 'rhi', 'z', 'rma'].forEach(function (k) { if (q[k] != null) rv.push(q[k]); }); });
      if (rv.length) {
        var lo = Math.min.apply(null, rv), hi = Math.max.apply(null, rv), padv = (hi - lo) * 0.08 || 1; lo -= padv; hi += padv;
        y2 = function (v) { return top2 + h2 - (v - lo) / (hi - lo) * h2; };
        niceTicks(lo, hi, 3).forEach(function (v) { el('line', { x1: pad.l, x2: W - pad.r, y1: y2(v), y2: y2(v), stroke: C.grid }, svg); txt(svg, pad.l - 6, y2(v) + 4, fmtN(v), { 'text-anchor': 'end', 'font-size': 10, fill: C.ink3 }); });
        line('z', C.red, '2 2', y2, 1, drows); line('rhi', C.ink3, '', y2, 1, drows); line('rma', C.ma, '6 3', y2, 1.4, drows); line('rel', C.rel, '', y2, 1.7, drows);
        var lastD = null; for (var k2 = drows.length - 1; k2 >= 0; k2--) if (drows[k2] && drows[k2].rel != null) { lastD = { i: k2, q: drows[k2] }; break; }
        if (lastD) txt(svg, xi(lastD.i) - 4, y2(lastD.q.rel) + (lastD.q.rel > lastD.q.rma ? -7 : 14), 'relative price ' + pct0(lastD.q.rdh) + ' against its 52W high', { 'text-anchor': 'end', fill: C.rel, 'font-size': 10.5, 'font-weight': 600, halo: true });
      }
      el('line', { x1: pad.l, x2: W - pad.r, y1: top2 + h2, y2: top2 + h2, stroke: C.border }, svg);
    }
    // hover
    var cross = el('line', { x1: 0, x2: 0, y1: top1, y2: yBot, stroke: C.ink3, 'stroke-dasharray': '2 2', opacity: 0 }, svg);
    var tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; host.style.position = 'relative'; host.appendChild(tip);
    svg.addEventListener('mousemove', function (ev) { var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width), i = Math.round((px - pad.l - bw / 2) / bw); if (i < 0 || i >= n) { tip.style.display = 'none'; cross.setAttribute('opacity', 0); return; } var q = rows[i], dq = drows[i]; if (!q) return; cross.setAttribute('x1', xi(i)); cross.setAttribute('x2', xi(i)); cross.setAttribute('opacity', 1);
      var dist = !q.up && q.v50 > 0 && q.v > 1.25 * q.v50;
      tip.innerHTML = '<b>' + fmtDY(q.d) + '</b><div>volume ' + fmtVol(q.v) + ' (' + (q.up ? 'an up day' : 'a down day') + (dist ? ', a distribution day' : '') + ')</div><div>20-day average ' + fmtVol(q.v20) + '; 50-day ' + fmtVol(q.v50) + '</div><div>up-day against down-day volume, 20 sessions: ' + (q.ud20 == null ? (q.ud20_no_down ? 'no down day' : 'n/a') : q.ud20.toFixed(2)) + '</div><div>distribution days in 25 sessions: ' + q.dist25 + '</div>' + (dq && dq.rel != null ? '<div>relative price ' + dq.rel.toFixed(1) + ', ' + pct0(dq.rdh) + ' against its 52-week high</div>' : '');
      tip.style.display = 'block'; tip.style.left = Math.max(0, Math.min(ev.clientX - r.left + 14, r.width - 290)) + 'px'; tip.style.top = (ev.clientY - r.top + 10) + 'px'; });
    svg.addEventListener('mouseleave', function () { tip.style.display = 'none'; cross.setAttribute('opacity', 0); });
  }

  /* ------------------------------------------------------------------ relative strength and relative price (Treatment 4's chart stack) */
  function rsPanel(m, h, compact) {
    var rsW = m.rs.filter(function (q) { return q.k !== 'o'; }), me = m.rs.filter(function (q) { return q.k === 'me'; }), fr = rsW;
    var frO = m.rs.filter(function (q) { return q.k === 'fr' && q.d <= m.lastFriday; }), lme = me[me.length - 1] || {}, lfr = frO[frO.length - 1] || {};
    var pts = function (a, k) { return a.map(function (q) { return { d: q.d, v: q[k] }; }); };
    return { title: compact ? '' : 'Relative strength, 0 to 99, each Friday: Stock RS (blue), Sector RS (magenta), Industry RS (green); dots mark the month-end readings', h: h,
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
  /* round 2 (Richard, image 6): its own section under section 1, with the sixth rule (a tranche 30% below its highest close
     since purchase, with Stock RS below 70) added and the row names drawn in full */
  function statusPanel(m) {
    var fr = m.rs.filter(function (q) { return q.k !== 'o'; }), me = m.rs.filter(function (q) { return q.k === 'me'; });
    var dAt = function (d) { return lastOnOrBefore(m.daily, 'd', d) || {}; };
    var nAt = function (d) { var n = m.nub.filter(function (q) { return q.d <= d; }); return n.length ? n[n.length - 1] : null; };
    var lv = (m.H.levels || []).map(function (L) { var tr = m.tranches.filter(function (x) { return x.tranche_number === L.tranche; })[0]; return { from: tr ? tr.entry_date : null, pts: L.pts }; });
    var levelAt = function (pts, d) { var v = null; for (var i = 0; i < pts.length; i++) { if (pts[i][0] <= d) v = pts[i][1]; else break; } return v; };
    var trOn = function (q) { var c = dAt(q.d).c; if (c == null || q.s >= 70) return false; return lv.some(function (L) { if (!L.from || q.d < L.from) return false; var v = levelAt(L.pts, q.d); return v != null && c < v; }); };
    var rows = [
      { k: 'Industry RS below 30', pts: fr.map(function (q) { return { d: q.d, on: q.ind < 30 }; }) },
      { k: 'Relative price\'s 200-day average falling', pts: fr.map(function (q) { return { d: q.d, on: (dAt(q.d).slope || 0) <= 0 }; }) },
      { k: 'Sector RS below 50 with Stock RS below 70', pts: me.map(function (q) { return { d: q.d, on: q.sec < 50 && q.s < 70 }; }) },
      { k: 'Stock RS below 50 with analysts cutting', pts: me.map(function (q) { var n = nAt(q.d); return { d: q.d, on: !!(n && q.s < 50 && ((n.sales != null && n.sales < 0) || (n.tp != null && n.tp < 0))) }; }) },
      { k: 'Relative price over 25% below its 52-week high', pts: me.map(function (q) { return { d: q.d, on: (dAt(q.d).rdh || 0) < -0.25 }; }) }];
    if (!m.probing && lv.length) rows.push({ k: 'A tranche 30% below its high, with Stock RS below 70', pts: fr.map(function (q) { return { d: q.d, on: trOn(q) }; }) });
    var N = rows.length, series = []; rows.forEach(function (r, i) { series.push({ kind: 'dots', pts: r.pts.map(function (q) { return { d: q.d, v: N - i - 0.5 }; }), color: C.border, r: 2.5 }); series.push({ kind: 'dots', pts: r.pts.filter(function (q) { return q.on; }).map(function (q) { return { d: q.d, v: N - i - 0.5 }; }), color: C.red, r: 4 }); });
    return { title: '', h: N * 18, series: series, yDomain: [0, N], yTicks: [], rightLabels: rows.map(function (r, i) { return { v: N - i - 0.5, text: r.k, color: C.ink2 }; }) };
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

  /* round 2 (Richard's images 7 and 8; Q7 = A): the consensus for the two named financial years, in the company's own units,
     over 24 months, one small chart per measure, with the target price against the share price; the 1, 3 and 6-month revisions
     in green or red beside each title; the indexed chart and the table are gone. The breadth pane is kept below. */
  var YC = ['#0969da', '#bc4c00'];
  function revHtml(rv, yr) { if (!rv) return ''; var one = function (lab, v) { if (v == null) return '<span class="rv mut">' + lab + ' n/a</span>'; var c = v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero'; return '<span class="rv ' + c + '">' + lab + ' ' + (v > 0 ? '+' : '') + v + '%</span>'; }; return '<span class="rvs" title="the change in the consensus over the last 1, 3 and 6 months, as the sell-side momentum store reports it">' + (yr ? 'revisions to the ' + yr + ' consensus' : 'revisions') + one('1 month', rv.L1M) + one('3 months', rv.L3M) + one('6 months', rv.L6M) + '</span>'; }
  function ssRender(host, m, W, only) {
    host.innerHTML = '';
    var SS = m.H.ss || {}, Yr = SS.years, M = SS.metrics || {}, d1 = m.asof, d0 = addDays(m.asof, -730);
    var one = !!only, cols = one || W < 760 ? 1 : 2, cw = Math.floor((W - (cols - 1) * 16) / cols);
    var grid = document.createElement('div'); grid.className = 'ssgrid'; grid.style.gridTemplateColumns = 'repeat(' + cols + ',minmax(0,1fr))'; host.appendChild(grid);
    var lastD = function (x) { var a = ((x || {}).daily || []).concat((x || {}).daily_unjoined || []).filter(function (q) { return q.v != null; }).sort(function (p, q) { return p.d < q.d ? -1 : 1; }); return a[a.length - 1] || null; };
    var lastMonthly = null;
    var cell = function (title, rv, nowTxt, yr) { var c = document.createElement('div'); c.className = 'sscell'; c.innerHTML = one ? '' : '<div class="sst"><b>' + title + '</b></div><div class="ssnow">' + (nowTxt || '') + ' ' + revHtml(rv, yr) + '</div>'; grid.appendChild(c); var h = document.createElement('div'); c.appendChild(h); return h; };
    var names = { eps: 'Earnings per share', ebitda: 'Earnings before interest, tax, depreciation and amortisation', sales: 'Sales' };
    var keys = only ? [only] : ['eps', 'ebitda', 'sales'];
    var drawn = 0;
    keys.forEach(function (k) {
      var X = Yr && Yr[k], labs = (Yr && Yr.labels) || [];
      var ser = [], vals = [];
      labs.forEach(function (y, yi) { var pts = ((X || {})[y] || []).filter(function (q) { return q.v != null && q.d >= d0; }); if (!pts.length) return; pts.forEach(function (q) { vals.push(q.v); }); var last = pts[pts.length - 1];
        ser.push({ pts: pts, color: YC[yi], w: 2, label: 'financial year ' + y + ' consensus', fmt: fmtN, endLabel: y + ': ' + fmtN(last.v), endDy: yi ? -6 : 8 }); });
      var dl = ((M[k] || {}).daily || []).filter(function (q) { return q.v != null && q.d >= d0; });
      if (dl.length && ser.length && labs[0] && ser[0].label.indexOf(labs[0]) >= 0) { dl.forEach(function (q) { vals.push(q.v); }); ser.push({ pts: dl, color: YC[0], w: 1.4, dash: '2 3', label: 'daily reading (financial year ' + labs[0] + ')', fmt: fmtN }); }
      var dn = lastD(M[k]), nowTxt = dn && labs[0] ? 'Today\'s ' + labs[0] + ' consensus: <b>' + fmtN(dn.v) + '</b> (' + fmtD(dn.d) + ').' : '';
      ser.forEach(function (sr) { if (sr.dash) return; var lp = sr.pts[sr.pts.length - 1]; if (lp && (!lastMonthly || lp.d > lastMonthly)) lastMonthly = lp.d; });
      var host2 = cell(names[k] + (labs.length ? ', financial years ' + labs.join(' and ') : ''), (M[k] || {}).rev, nowTxt, labs[0]);
      if (!ser.length) { host2.innerHTML = '<div class="mut" style="padding:8px 0">The stored monthly files hold no consensus for ' + (labs.join(' or ') || 'a named year') + ' for ' + esc(m.name) + ', so there is no chart.</div>'; return; }
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pd = (hi - lo) * 0.12 || Math.abs(hi) * 0.05 || 1;
      stack(host2, { d0: d0, d1: d1, width: cw, left: 52, right: 86, markers: m.tranches.length ? [{ d: m.tranches[0].entry_date }] : [], panels: [{ h: one ? 150 : 95, series: ser, yDomain: [lo - pd, hi + pd] }] });
      drawn++;
    });
    if (!only) {
      var tp = M.tp || {}, tpp = (tp.monthly || []).concat(tp.daily || []).filter(function (q) { return q.v != null && q.d >= d0; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; });
      var px = m.daily.filter(function (q) { return q.c != null && q.d >= d0; }).map(function (q) { return { d: q.d, v: q.c }; });
      var tn = lastD(tp), h3 = cell('Target price (the mean of the analysts\') against the share price', tp.rev, tn ? 'Today\'s mean target price: <b>' + fmtN(tn.v) + '</b> (' + fmtD(tn.d) + ').' : '', null);
      if (!tpp.length && !px.length) h3.innerHTML = '<div class="mut">No target price history is held.</div>';
      else { var vv = tpp.concat(px).map(function (q) { return q.v; }), lo3 = Math.min.apply(null, vv), hi3 = Math.max.apply(null, vv), p3 = (hi3 - lo3) * 0.1 || 1;
        var lt = tpp[tpp.length - 1], lp = px[px.length - 1];
        stack(h3, { d0: d0, d1: d1, width: cw, left: 52, right: 86, markers: m.tranches.length ? [{ d: m.tranches[0].entry_date }] : [], panels: [{ h: 95, yDomain: [lo3 - p3, hi3 + p3], series: [{ pts: px, color: C.ink3, w: 1.2, label: 'share price', fmt: fmtN, endLabel: lp ? 'price ' + fmtN(lp.v) : '', endDy: (lt && lp && lp.v > lt.v) ? -6 : 8 }, { pts: tpp, color: C.ink, w: 2, label: 'target price (mean)', fmt: fmtN, endLabel: lt ? 'target ' + fmtN(lt.v) : '', endDy: (lt && lp && lp.v > lt.v) ? 8 : -6 }] }] }); }
      var bp = ssPanels(m, d0, false, 10, 90).panels[1];
      if (lastMonthly) { var kn = document.createElement('div'); kn.className = 'key'; kn.textContent = 'The monthly consensus lines end at ' + fmtDY(lastMonthly) + ', the last month-end in the stored monthly files; today\'s value is written above each chart.'; host.appendChild(kn); }
      if (bp) { var bh = document.createElement('div'); bh.style.marginTop = '8px'; host.appendChild(bh); bp.title = 'Net Upgrade Breadth on the 100-day count, at month-ends (with Stock RS below 50, a reading below zero on sales estimates or target prices sells)'; stack(bh, { d0: d0, d1: d1, width: W, right: 30, markers: [], panels: [bp] }); }
    }
    return drawn;
  }

  /* ------------------------------------------------------------------ valuation over time, with the valuation page's colour bands */
  var ZONES = [{ c: '#5fbf6f', a: 0.55 }, { c: '#a8dba0', a: 0.55 }, { c: '#d9efc4', a: 0.60 }, { c: '#fbf1b8', a: 0.70 }, { c: '#f7cf9a', a: 0.65 }, { c: '#f2a4a4', a: 0.60 }];
  var LEVEL_COLOURS = ['#6fbf73', '#7fbf6f', '#c9c25a', '#e0a45c', '#e06f6f'];
  function valChart(host, m, f, years, W, Hh, compact) {
    var V = m.H.valuation; host.innerHTML = '';
    if (!V) { host.innerHTML = '<div class="mut">No valuation file for this stock.</div>'; return; }
    var n0 = V.months.length, start = Math.max(0, n0 - years * 12), win = V.months.slice(start), vals = V[f].slice(start), n = win.length;
    var bands = V.bands && V.bands[f];
    /* round 2 (Richard, image 9): no history means a sentence, not an empty chart */
    if (!vals.some(function (v) { return v != null; })) { var cur0 = (V.current || {})[f]; host.innerHTML = '<div class="nohist">No ' + (f === 'pe' ? 'price to earnings' : 'enterprise value to sales') + ' history is held for ' + esc(m.name) + ', so there is no chart.' + (cur0 != null ? ' Today\'s ' + (f === 'pe' ? 'price to earnings' : 'enterprise value to sales') + ', 24 months forward, is <b>' + cur0.toFixed(f === 'evs' ? 2 : 1) + 'x</b>.' : '') + '</div>'; return; }
    var padL = compact ? 8 : 12, padR = compact ? 40 : 52, padT = 10, padB = 22, pw = W - padL - padR, ph = Hh - padT - padB;
    var levels = bands ? [bands.p10, bands.p35, bands.p50, bands.p75, bands.p90] : [];
    /* round 2 (Richard, image 9): the scale fits the stock's usual range (its bands), not its outlier months; a month above the
       top of the scale is drawn at the edge with a marker and its true value */
    var sorted = vals.filter(function (v) { return v != null; }).sort(function (p, q) { return p - q; });
    var q95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    var lo = sorted[0], hi = bands ? Math.max(bands.p90 * 1.2, Math.min(sorted[sorted.length - 1], bands.p90 * 1.6)) : Math.min(sorted[sorted.length - 1], q95 * 1.3);
    levels.concat(bands && bands.mean != null ? [bands.mean] : []).forEach(function (v) { lo = Math.min(lo, v); });
    var cur = (V.current || {})[f]; if (cur != null) { lo = Math.min(lo, cur); hi = Math.max(hi, Math.min(cur, hi * 1.5)); }
    var a = Math.max(0, lo - (hi - lo) * 0.10), b = hi + (hi - lo) * 0.06;
    var x = function (i) { return padL + (n <= 1 ? pw / 2 : i * pw / (n - 1)); }, y = function (v) { return padT + ph - (v - a) / (b - a) * ph; };
    var svg = el('svg', { width: W, height: Hh, viewBox: '0 0 ' + W + ' ' + Hh, style: 'display:block;max-width:100%;font-family:Segoe UI,system-ui,sans-serif' }, host);
    if (bands) {
      var edges = [a].concat(levels.slice().sort(function (p, q) { return p - q; }), [b]);
      for (var z = 0; z < 6; z++) el('rect', { x: padL, y: y(edges[z + 1]), width: pw, height: Math.max(0, y(edges[z]) - y(edges[z + 1])), fill: ZONES[z].c, 'fill-opacity': ZONES[z].a }, svg);
      levels.forEach(function (v, i) { el('line', { x1: padL, x2: padL + pw, y1: y(v), y2: y(v), stroke: LEVEL_COLOURS[i], 'stroke-width': 1.2 }, svg); });
      if (bands.mean != null) el('line', { x1: padL, x2: padL + pw, y1: y(bands.mean), y2: y(bands.mean), stroke: '#9a8a2e', 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }, svg);
    }
    win.forEach(function (mm, i) { if (mm.slice(5) === '01') { el('line', { x1: x(i), x2: x(i), y1: padT, y2: padT + ph, stroke: 'rgba(0,0,0,0.08)' }, svg); if (!compact || (+mm.slice(0, 4)) % (years > 5 ? 2 : 1) === 0) txt(svg, x(i), padT + ph + 14, mm.slice(0, 4), { 'text-anchor': 'middle', 'font-size': 10, fill: C.ink3 }); } });
    var yc = function (v) { return y(Math.min(v, b)); };
    var dp = ''; vals.forEach(function (v, i) { if (v == null) return; dp += (dp && vals[i - 1] != null ? 'L' : 'M') + x(i).toFixed(1) + ',' + yc(v).toFixed(1); });
    el('path', { d: dp, fill: 'none', stroke: '#333', 'stroke-width': compact ? 2 : 2.6, 'stroke-linejoin': 'round' }, svg);
    var offI = -1; vals.forEach(function (v, i) { if (v != null && v > b && (offI < 0 || v > vals[offI])) offI = i; });
    if (offI >= 0) txt(svg, Math.max(padL + 4, Math.min(padL + pw - 120, x(offI) + 4)), padT + 11, '\u25B2 above the scale, up to ' + vals[offI].toFixed(0) + 'x', { 'font-size': 10, fill: C.ink2, halo: true });
    el('rect', { x: padL, y: padT, width: pw, height: ph, fill: 'none', stroke: '#e8e3d4' }, svg);
    // the tranches, by date (month i spans (i-1 .. i], the month-end sits at i, as the valuation page places a daily date)
    var dateX = function (iso) { var i = win.indexOf(iso.slice(0, 7)); if (i < 0) return null; var d = +iso.slice(8, 10), dim = new Date(+iso.slice(0, 4), +iso.slice(5, 7), 0).getDate(); return padL + ((i - 1) + d / dim) * pw / (n - 1); };
    m.tranches.forEach(function (tr, k) { var xx = dateX(tr.entry_date); if (xx == null) return; el('line', { x1: xx, x2: xx, y1: padT, y2: padT + ph, stroke: C.entry, 'stroke-dasharray': '3 3', 'stroke-width': 1.2 }, svg); if (!compact) txt(svg, xx - 3, padT + ph - 6 - (k % 3) * 12, 'tranche ' + tr.tranche_number, { fill: C.entry, 'font-size': 10, halo: true, 'text-anchor': 'end' }); });
    niceTicks(a, b, compact ? 3 : 5).forEach(function (v) { if (y(v) < padT + 4 || y(v) > padT + ph) return; el('line', { x1: padL + pw, x2: padL + pw + 3, y1: y(v), y2: y(v), stroke: C.ink3 }, svg); txt(svg, padL + pw + 5, y(v) + 4, (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2)) + 'x', { 'font-size': 10, fill: C.ink3 }); });
    // hover
    var tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; host.style.position = 'relative'; host.appendChild(tip);
    svg.addEventListener('mousemove', function (ev) { var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width), i = Math.round((px - padL) / (pw / (n - 1))); if (i < 0 || i >= n) { tip.style.display = 'none'; return; } tip.innerHTML = '<b>' + MON[+win[i].slice(5, 7) - 1] + '-' + win[i].slice(0, 4) + '</b><div>' + (f === 'pe' ? 'price to earnings' : 'enterprise value to sales') + ', 24 months forward: ' + (vals[i] == null ? 'n/a' : vals[i].toFixed(f === 'evs' ? 2 : 1) + 'x') + '</div>'; tip.style.display = 'block'; tip.style.left = Math.max(0, Math.min(ev.clientX - r.left + 14, r.width - 200)) + 'px'; tip.style.top = (ev.clientY - r.top + 10) + 'px'; });
    svg.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
  }
  function ordinal(n) { if (n == null) return 'n/a'; var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function pctNow(V, f) { var g = V.grade_basis, cur = V.current[f]; if (f === 'pe' && g && g.pe != null && g.pct != null && cur && Math.abs(g.pe - cur) / cur <= 0.01) return g.pct; return V.pct_now[f]; }
  function valLine(m, f) {
    var V = m.H.valuation; if (!V) return '';
    if (!(V[f] || []).some(function (v) { return v != null; })) return '';
    var cur = V.current[f], pc = pctNow(V, f), ae = V.at_entry, ev = f === 'pe' ? ae.pe : ae.evs, ep = f === 'pe' ? ae.pe_pct : ae.evs_pct;
    var fx = function (v) { return v == null ? 'n/a' : (f === 'evs' || v < 10 ? v.toFixed(2) : v.toFixed(1)) + 'x'; };
    var s = 'Today it is <b>' + fx(cur) + '</b>' + (pc != null ? ', in the ' + ordinal(pc) + ' percentile of its own ten years.' : '; its percentile in its own ten years is not available.') + (ae && ae.month && ev != null ? ' When tranche 1 was bought (' + MON[+ae.month.slice(5, 7) - 1] + ' ' + ae.month.slice(0, 4) + ') it was <b>' + fx(ev) + '</b>' + (ep != null ? ', in the ' + ordinal(ep) + ' percentile.' : '.') : '');
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
    /* round 2 (Richard, image 10): the four quarters shaded, and each dot coloured by its quarter: green, strengthening with
       upgrades; red, weakening with downgrades; amber, mixed. Purple ring: this holding; blue ring: a holding of ours. */
    var x0c = Math.max(L, Math.min(W - R, sx(0))), y0c = Math.max(T, Math.min(Hh - B, sy(0)));
    el('rect', { x: x0c, y: T, width: W - R - x0c, height: y0c - T, fill: 'rgba(26,127,55,0.07)' }, svg);
    el('rect', { x: L, y: y0c, width: x0c - L, height: Hh - B - y0c, fill: 'rgba(207,34,46,0.07)' }, svg);
    el('rect', { x: L, y: T, width: x0c - L, height: y0c - T, fill: 'rgba(154,103,0,0.05)' }, svg);
    el('rect', { x: x0c, y: y0c, width: W - R - x0c, height: Hh - B - y0c, fill: 'rgba(154,103,0,0.05)' }, svg);
    if (!compact) { txt(svg, W - R - 6, T + 12, 'strengthening, with upgrades', { 'text-anchor': 'end', 'font-size': 10, fill: C.industry }); txt(svg, L + 6, Hh - B - 6, 'weakening, with downgrades', { 'font-size': 10, fill: C.red }); }
    el('line', { x1: sx(0), x2: sx(0), y1: T, y2: Hh - B, stroke: C.ink3, 'stroke-dasharray': '4 3' }, svg); el('line', { x1: L, x2: W - R, y1: sy(0), y2: sy(0), stroke: C.ink3, 'stroke-dasharray': '4 3' }, svg);
    var xl = { m1: '1 month', m3: '3 months', m6: '6 months' }[xk], fyp = ((m.H.ss2 || {}).fy ? ', FY' + m.H.ss2.fy : ''), yl = yk === 'eps3' ? 'EPS revisions, 3M' + fyp + ', %' : 'Revenue revisions, 3M' + fyp + ', %';
    txt(svg, W - R, Hh - (compact ? 4 : 10), 'change in Stock RS over ' + xl + ' →', { 'text-anchor': 'end', 'font-size': compact ? 9.5 : 11, fill: C.ink2 });
    txt(svg, sx(0) + 6, T - (compact ? 4 : 14), '↑ ' + yl, { 'font-size': compact ? 9.5 : 11, fill: C.ink2 });
    var rr = function (p) { return Math.max(compact ? 3 : 4, Math.min(compact ? 11 : 16, Math.sqrt((p.q.r.mc || 300) / 60) * (compact ? 0.7 : 1))); };
    var quad = function (p) { return p.x > 0 && p.y > 0 ? C.industry : p.x < 0 && p.y < 0 ? C.red : (p.x === 0 && p.y === 0) ? C.ink3 : C.amber; };
    var ring = function (p) { return p.q.g === 'self' ? C.entry : (p.q.r.held && p.q.r.t !== m.t) ? C.stock : null; };
    pts.sort(function (a, b) { return (a.q.g === 'self') - (b.q.g === 'self'); });
    pts.forEach(function (p) {
      var rg_ = ring(p);
      var c = el('circle', { cx: sx(p.x), cy: sy(p.yc), r: rr(p), fill: quad(p), 'fill-opacity': p.q.g === 'self' ? 0.85 : p.q.g === 'coh' ? 0.6 : 0.3, stroke: rg_ || C.surface, 'stroke-width': rg_ ? (p.q.g === 'self' ? 3 : 2.2) : 1 }, svg);
      var ti = el('title', {}, c); ti.textContent = p.q.r.name + ' (' + (p.q.g === 'self' ? 'this holding' : p.q.g === 'coh' ? 'cohort peer' : 'sector peer') + '): Stock RS ' + p.q.r.rs.now + ', change over ' + xl + ' ' + intS(p.x) + '; ' + yl.replace(', %', '') + ' ' + pctI(p.y);
      if (p.off) txt(svg, sx(p.x), sy(p.yc) + (p.off === 'up' ? rr(p) + 11 : -rr(p) - 4), (p.off === 'up' ? '▲ ' : '▼ ') + pctI(p.y), { 'text-anchor': 'middle', 'font-size': 9.5, fill: C.ink2 });
    });
    var labs = pts.filter(function (p) { return !compact || p.q.g === 'self' || p.q.r.held || Math.abs(p.x) > 15; }).map(function (p) { return { p: p, lx: sx(p.x) + rr(p) + 2, ly: sy(p.yc) + 4 }; }).sort(function (a, b) { return a.ly - b.ly; });
    for (var i = 1; i < labs.length; i++) { for (var j = 0; j < i; j++) { if (Math.abs(labs[i].lx - labs[j].lx) < 120 && Math.abs(labs[i].ly - labs[j].ly) < 12) labs[i].ly = labs[j].ly + 12; } }
    labs.forEach(function (o) { var right = o.lx > W - R - 70; txt(svg, right ? o.lx - 2 * rr(o.p) - 6 : o.lx, o.ly, o.p.q.r.name, { 'font-size': compact ? 9.5 : 10.5, fill: o.p.q.g === 'self' ? C.entry : C.ink, 'font-weight': o.p.q.g === 'self' ? 700 : 400, 'text-anchor': right ? 'end' : 'start', halo: true }); });
    if (!compact) { txt(svg, L - 4, sy(yhi) + 4, pctI(yhi), { 'text-anchor': 'end', 'font-size': 10, fill: C.ink2 }); txt(svg, L - 4, sy(ylo) + 4, pctI(ylo), { 'text-anchor': 'end', 'font-size': 10, fill: C.ink2 }); txt(svg, sx(xlo), Hh - B + 14, intS(xlo), { 'font-size': 10, fill: C.ink2 }); txt(svg, sx(xhi), Hh - B + 14, intS(xhi), { 'text-anchor': 'end', 'font-size': 10, fill: C.ink2 }); }
    return pts.length;
  }
  function peersTable(m) {
    /* 27-Oct-2026 (Richard, 27b and AQ4): "Remove the "pool" labels and make the columns the same width. Improve formatting. Remove
       the "sell side" momentum and technical momentum ratings columns. Add in Revenue revisions"; the ranked 3-month EPS revisions
       chart's content sits here as a column, headed with its named FY */
    var P = m.H.peers, fy = (m.H.ss2 || {}).fy ? ' FY' + m.H.ss2.fy : '';
    var d = function (r, k) { var a = r.rs.now, b = r.rs[k]; return (a == null || b == null) ? null : a - b; };
    var cc = function (v, big) { return v == null || v === 0 ? '' : (v > 0 ? 'pos' : 'neg') + (Math.abs(v) >= big ? ' lg' : ''); };
    var na = '<span class="mut">n/a</span>';
    var dc = function (v) { return '<td class="num ' + cc(v, 10) + '">' + (v == null ? na : intS(v)) + '</td>'; };
    var rv = function (v) { return '<td class="num ' + cc(v, 5) + '">' + (v == null ? na : pctI(v)) + '</td>'; };
    var nm = function (r) { return '<span class="pn">' + esc(r.name) + '</span>' + (r.held && r.t !== m.t ? '<span class="chip held" title="a holding of ours">held</span>' : ''); };
    var row = function (r, self) { return '<tr class="' + (self ? 'self' : '') + '"><td>' + nm(r) + '</td><td class="num">' + (r.rs.now == null ? na : r.rs.now) + '</td>' + dc(d(r, 'm1')) + dc(d(r, 'm3')) + dc(d(r, 'm6')) + rv(r.eps3) + rv(r.sales3) + '<td class="num ' + cc(r.nubs, 0.25) + '">' + (r.nubs == null ? na : pctS(r.nubs)) + '</td></tr>'; };
    var worst = function (a) { return a.slice().sort(function (x, y) { var p = d(x, 'm3'), q = d(y, 'm3'); return (p == null ? 999 : p) - (q == null ? 999 : q); }); };
    var h = '<table class="tbl peers"><colgroup>' + new Array(9).join('<col>') + '</colgroup><thead><tr><th>Company</th><th class="num">Stock RS</th><th class="num">Stock RS change, 1M</th><th class="num">Stock RS change, 3M</th><th class="num">Stock RS change, 6M</th><th class="num">EPS revisions, 3M,' + fy + '</th><th class="num">Revenue revisions, 3M,' + fy + '</th><th class="num">NUB, Sales, 100-day</th></tr></thead><tbody>';
    h += row(P.self, true);
    h += '<tr class="grp"><td colspan="8">Cohort peers (' + P.cohort.length + ' of ' + P.cohort_total + ', the largest by market value), weakest 3M Stock RS change first</td></tr>' + worst(P.cohort).map(function (r) { return row(r); }).join('');
    h += '<tr class="grp"><td colspan="8">Sector peers (' + P.sector.length + ' of ' + P.sector_total + ', the largest by market value), weakest 3M Stock RS change first</td></tr>' + worst(P.sector).map(function (r) { return row(r); }).join('');
    return h + '</tbody></table>';
  }

  /* ------------------------------------------------------------------ ratings, context, judgement, placeholders, Experiment */
  function renderRatings(el_, m) {
    var order = ['thesis_change_forces', 'foundations_robustness', 'setups_fit', 'case_riskiness', 'sellside_momentum', 'thematic_fit_momentum', 'technical_momentum', 'tsr_valuation'];
    var R = m.H.ratings || {}, h = '<div class="ratings">';
    order.forEach(function (k, i) { var r = R[k]; if (!r) return; h += '<div class="rt ' + (i < 4 ? 'bu' : 'td') + '" title="' + esc((r.owner || '') + (r.history ? '. ' + r.history : '')) + '"><div class="rt-g" style="background:' + ratingColor(r.grade) + '">' + esc(r.grade || '–') + '</div><div class="rt-n">' + esc(r.name) + '</div><div class="rt-d">' + (r.as_at ? 'as at ' + fmtDY(r.as_at) : '') + '</div></div>'; });
    el_.innerHTML = h + '</div><div class="mut" style="margin-top:4px">The first four ratings are Bottom-up/Stock-driven, set by the Investment Analyst in the memo. The last four are Top Down/Exogenously-driven and are computed weekly. On Case Riskiness, A means a simple, low-risk case. Hover a rating to see who owns it.</div>';
  }
  /* round 2 (Richard, image 11): full sentences, each readable on its own */
  function renderContext(el_, m) {
    var b = m.H.beta, nm = esc(m.name), memo = m.H.memo, h = '';
    var mv = function (x, n) {
      if (!x) return '';
      return '<p>Over the ' + n + ' sessions to ' + fmtD(x.to) + ', ' + nm + '\'s shares ' + (x.stock >= 0 ? 'rose ' : 'fell ') + Math.abs(x.stock).toFixed(1) + '%. ' +
        'The market explains ' + sgn(x.explained_by_beta) + '% of that move through ' + nm + '\'s beta of ' + b.beta + ' (against the Stoxx Europe 600), so ' + nm + '\'s own move was <b>' + sgn(x.stock_specific) + '%</b>. ' +
        'That own move is ' + x.times_usual + ' times the usual size of ' + nm + '\'s own moves over ' + n + ' sessions (' + x.usual_size + '%)' + (x.times_usual > 2 ? ', which makes it <b>unusual</b>.' : ', which is within its usual range.') + '</p>';
    };
    h += '<div class="ctxblock"><b>Its own move, after the market\'s part</b>' + (b ? mv(b.s5, 5) + mv(b.s20, 20) : '<p class="mut">No beta reading is held for ' + nm + '.</p>') + '</div>';
    if (memo) {
      var sents = (memo.verdict || '').split(/(?<=\.)\s+/), lead = sents.slice(0, 2).join(' ');
      h += '<div class="ctxblock"><b>The Investment Analyst\'s memo</b><p>The Investment Analyst\'s memo on ' + nm + ' is dated ' + (memo.memo_date ? fmtDY(memo.memo_date) : 'n/a') + ' and is at the ' + esc(memo.stage || 'unnamed') + ' stage. Its verdict begins: &ldquo;' + esc(lead) + '&rdquo;</p></div>';
    } else h += '<div class="ctxblock"><b>The Investment Analyst\'s memo</b><p class="mut">No memo is held for ' + nm + '.</p></div>';
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
    if (!J.length) { el_.innerHTML = '<h2>10. The Assistant Portfolio Manager\'s judgement</h2><div class="mut">No block for this holding in the latest APM PMS Q&amp;A SOP note.</div>'; return; }
    var a = J[0], open = ['What it means for the position', 'My judgement', 'What would change my view'];
    var stale = a.date && m.asof && (D(m.asof) - D(a.date)) / 864e5 > 1;
    var h = '<h2><span><span class="jud-tag">10. The Assistant Portfolio Manager\'s judgement</span> <span class="mut">from the APM PMS Q&amp;A SOP\'s note of ' + fmtDY(a.date) + (stale ? '; this week\'s appears here as soon as Tuesday\'s note is written' : '') + '</span></span></h2>' + blockHtml(a.markdown, open);
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


  /* ------------------------------------------------------------------ version 2 (27-Oct-2026): the sell-side items, one column */
  var SNAMES = { eps: 'EPS', sales: 'Revenue (sales)', ebitda: 'EBITDA' };
  function cellIn(host, title) { var c = document.createElement('div'); c.className = 'sscell'; c.innerHTML = '<div class="sst">' + title + '</div>'; host.appendChild(c); var h = document.createElement('div'); c.appendChild(h); return h; }
  /* item 3: the snake charts, the live dashboard's consensus chart per named FY (round 2), one measure under the next */
  function snakeRender(host, m, W) {
    host.innerHTML = '';
    var SS = m.H.ss || {}, Yr = SS.years, M = SS.metrics || {}, d1 = m.asof, d0 = addDays(m.asof, -730), labs = (Yr && Yr.labels) || [];
    ['eps', 'sales', 'ebitda'].forEach(function (k) {
      var X = Yr && Yr[k], ser = [], vals = [];
      labs.forEach(function (y, yi) { var pts = ((X || {})[y] || []).filter(function (q) { return q.v != null && q.d >= d0; }); if (!pts.length) return; pts.forEach(function (q) { vals.push(q.v); }); var last = pts[pts.length - 1];
        ser.push({ pts: pts, color: YC[yi], w: 2, label: 'FY' + y + ' consensus', fmt: fmtN, endLabel: 'FY' + y + ': ' + fmtN(last.v), endDy: yi ? -6 : 8 }); });
      var dl = ((M[k] || {}).daily || []).filter(function (q) { return q.v != null && q.d >= d0; });
      if (dl.length && ser.length && labs[0] && ser[0].label.indexOf(labs[0]) >= 0) { dl.forEach(function (q) { vals.push(q.v); }); var ld = dl[dl.length - 1]; ser[0].endLabel = ''; ser.push({ pts: dl, color: YC[0], w: 1.4, dash: '2 3', label: 'daily reading (FY' + labs[0] + ')', fmt: fmtN, endLabel: 'FY' + labs[0] + ': ' + fmtN(ld.v) + ' (' + fmtD(ld.d) + ')' }); }
      var h2 = cellIn(host, SNAMES[k] + ' consensus, FY' + labs.join(' and FY') + ' <span class="mut">(last 24 months)</span>');
      if (!ser.length) { h2.innerHTML = '<div class="nohist">No stored ' + SNAMES[k] + ' consensus for FY' + labs.join(' or FY') + ' for ' + esc(m.name) + '.</div>'; return; }
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pd = (hi - lo) * 0.12 || Math.abs(hi) * 0.05 || 1;
      stack(h2, { d0: d0, d1: addDays(d1, 8), monthEnd: true, width: W, left: 56, right: 150, markers: m.tranches.length ? [{ d: m.tranches[0].entry_date }] : [], panels: [{ h: 120, labelEdge: true, series: ser, yDomain: [lo - pd, hi + pd] }] });
    });
  }
  /* item 4: the % of Buys, Other and Sells (Richard, Q5 = A: Buys = Buy + Overweight, Sells = Sell + Underweight, Other = Hold),
     above the live dashboard's target price against share price chart */
  function ratingsRender(host, m, W, rows) {
    host.innerHTML = '';
    var S2 = m.H.ss2 || {}, d1 = m.asof, d0 = addDays(m.asof, -730), sc = S2.tp_scale || 1;
    var rp = (S2.ratings || []).filter(function (q) { return q.d >= d0; }).map(function (q) { var n = q.buys + q.other + q.sells; return n ? { d: q.d, b: Math.round(q.buys / n * 100), o: Math.round(q.other / n * 100), s: Math.round(q.sells / n * 100), n: n } : null; }).filter(Boolean);
    rp.forEach(function (q) { var t = q.b + q.o + q.s; if (t !== 100) q.o += 100 - t; });
    var tp = ((m.H.ss.metrics || {}).tp || {}), tpp = (tp.monthly || []).concat(tp.daily || [], tp.daily_unjoined || []).filter(function (q) { return q.v != null && q.d >= d0; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; }).map(function (q) { return { d: q.d, v: q.v * sc }; });
    var seen = {}; tpp = tpp.filter(function (q) { if (seen[q.d]) return false; seen[q.d] = 1; return true; });
    var px = (rows && rows.length ? rows.map(function (r) { return { d: r.date || r.d, v: r.close != null ? r.close : r.c }; }) : m.daily.map(function (q) { return { d: q.d, v: q.c }; })).filter(function (q) { return q.v != null && q.d >= d0 && q.d <= d1; });
    var panels = [];
    if (rp.length) panels.push({ title: 'Analyst ratings, % of analysts (month-ends)', h: 90, labelEdge: true, yDomain: [0, 100], yTicks: [0, 50, 100], yFmt: function (v) { return v + '%'; },
      series: [{ kind: 'stacked', gap: 45, pts: rp, label: 'ratings', unit: '%', endLabels: true, endFmt: function (v) { return v + '%'; },
        layers: [{ k: 'b', label: 'Buys', color: 'rgba(26,127,55,0.42)', ink: '#1a7f37', tip: '#7ee2a8' }, { k: 'o', label: 'Other', color: 'rgba(139,148,158,0.30)', ink: '#57606a', tip: '#d0d7de' }, { k: 's', label: 'Sells', color: 'rgba(207,34,46,0.42)', ink: '#cf222e', tip: '#ffaba8' }] }] });
    if (tpp.length || px.length) { var vv = tpp.concat(px).map(function (q) { return q.v; }), lo3 = Math.min.apply(null, vv), hi3 = Math.max.apply(null, vv), p3 = (hi3 - lo3) * 0.1 || 1, lt = tpp[tpp.length - 1], lp = px[px.length - 1];
      panels.push({ title: 'Average PT against SP' + (sc !== 1 ? ' (PT converted from pounds to pence)' : ''), h: 120, labelEdge: true, yDomain: [lo3 - p3, hi3 + p3],
        series: [{ pts: px, color: C.ink3, w: 1.2, label: 'SP', fmt: fmtN, endLabel: lp ? 'SP ' + fmtN(lp.v) : '', endDy: (lt && lp && lp.v > lt.v) ? -6 : 8 }, { pts: tpp, color: C.ink, w: 2, label: 'average PT', fmt: fmtN, endLabel: lt ? 'PT ' + fmtN(lt.v) : '', endDy: (lt && lp && lp.v > lt.v) ? 8 : -6 }] }); }
    if (!panels.length) { host.innerHTML = '<div class="nohist">No ratings or PT history is stored for ' + esc(m.name) + '.</div>'; return; }
    stack(host, { d0: d0, d1: addDays(d1, 8), monthEnd: true, width: W, left: 56, right: 150, markers: m.tranches.length ? [{ d: m.tranches[0].entry_date }] : [], panels: panels });
  }
  /* item 5: Net Upgrade Breadth, next FY, last twelve months (Richard, D-PMS-V4-34, AQ5, AQ6): stacked counts (green raising,
     red cutting, grey no change) with the number in each band, behind the NUB line */
  var NUBK = [['eps', 'EPS'], ['sales', 'Revenue (sales)'], ['ebitda', 'EBITDA'], ['tp', 'PT'], ['buys', 'Buys']];
  function nubRender(host, m, W) {
    host.innerHTML = '';
    var S2 = m.H.ss2 || {}, NC = S2.nubc || {}, d1 = m.asof, d0 = addDays(m.asof, -365);
    var GR = { k: 'up', label: 'raising', color: 'rgba(26,127,55,0.38)', ink: '#116329', tip: '#7ee2a8' }, NC_ = { k: 'nc', label: 'no change', color: 'rgba(139,148,158,0.28)', ink: '#424a53', tip: '#d0d7de' }, RD = { k: 'dn', label: 'cutting', color: 'rgba(207,34,46,0.38)', ink: '#a40e26', tip: '#ffaba8' };
    NUBK.forEach(function (kk) {
      /* a month with no analyst counted has no breadth: it is left as a gap, never drawn as zero */
      var k = kk[0], arr = (NC[k] || []).filter(function (q) { return q.d >= d0 && q.d <= d1 && (k === 'buys' ? (q.buys + q.other + q.sells) > 0 : q.n > 0); });
      var buys = k === 'buys';
      var pts = arr.map(function (q) { if (buys) { var n = q.buys + q.other + q.sells; return { d: q.d, up: q.buys, nc: q.other, dn: q.sells, n: n, v: n ? q.buys / n : null, fy: null, src: 'monthly' }; } return { d: q.d, up: q.up, dn: q.dn, nc: Math.max(0, q.n - q.up - q.dn), n: q.n, v: q.n ? (q.up - q.dn) / q.n : null, fy: q.fy, src: q.src }; });
      var last = pts[pts.length - 1];
      var fys = pts.map(function (q) { return q.fy; }).filter(Boolean), fyNow = fys.length ? fys[fys.length - 1] : null;
      var head = kk[1] + (buys ? ': Buys, Other and Sells (counts) with % Buys' : ': NUB' + (fyNow ? ', FY' + fyNow : '') + ', 100-day count');
      var latest = !last ? '' : buys ? fmtD(last.d) + ': ' + last.up + ' of ' + last.n + ' Buys (' + Math.round(last.v * 100) + '%)' : fmtD(last.d) + ': ' + last.up + ' of ' + last.n + ' raising, ' + last.dn + ' cutting, ' + last.nc + ' no change; NUB ' + pctS(last.v);
      var h2 = cellIn(host, head + (latest ? ' <span class="mut">&middot; ' + latest + '</span>' : ''));
      if (!pts.length) { h2.innerHTML = '<div class="nohist">No stored ' + kk[1] + ' counts for ' + esc(m.name) + ' in the last twelve months.</div>'; return; }
      var mx = Math.max.apply(null, pts.map(function (q) { return q.n; }).concat([1]));
      var markers = [];
      for (var i = 1; i < pts.length; i++) if (pts[i].fy && pts[i - 1].fy && pts[i].fy !== pts[i - 1].fy) markers.push({ d: pts[i].d, label: 'FY' + pts[i].fy + ' from here', color: C.ink3 });
      var layers = buys ? [{ k: 'up', label: 'Buys', color: GR.color, ink: GR.ink, tip: GR.tip }, { k: 'nc', label: 'Other', color: NC_.color, ink: NC_.ink, tip: NC_.tip }, { k: 'dn', label: 'Sells', color: RD.color, ink: RD.ink, tip: RD.tip }] : [GR, NC_, RD];
      var line = { pts: pts.map(function (q) { return { d: q.d, v: q.v }; }), color: C.ink, w: 1.7, axis: 'right', gap: 45, label: buys ? '% Buys' : 'NUB', fmt: function (v) { return buys ? Math.round(v * 100) + '%' : pctS(v); } };
      stack(h2, { d0: d0, d1: addDays(d1, 12), monthEnd: true, width: W, left: 56, right: 56, markers: markers, panels: [{ h: 112, yDomain: [0, mx * 1.08], yTicks: niceTicks(0, mx, 3).filter(function (v) { return v === Math.round(v); }), yFmt: function (v) { return String(v); },
        yDomain2: buys ? [0, 1.08] : [-1.08, 1.08], yTicks2: buys ? [0, 0.5, 1] : [-1, 0, 1], yFmt2: function (v) { return buys ? Math.round(v * 100) + '%' : pctS(v); },
        series: [{ kind: 'stacked', gap: 45, numbers: true, pts: pts, label: buys ? 'ratings' : 'analysts', layers: layers }, line] }] });
    });
  }

  /* ------------------------------------------------------------------ the Market chart, front page (Richard, 27b Q3 and 27c, D-PMS-V4-23, V4-37, V4-38):
     the Stoxx Europe 600 and each industry rebased to the index, last 3 and last 12 months; a different autumnal colour per line,
     no conditional colouring; each line named in small letters on the right, no key */
  var AUTUMN = ['#8c2d04', '#b35806', '#c97b28', '#a6761d', '#7f6a12', '#6b6b2a', '#4d6b35', '#356b5a', '#2f5f73', '#4f5b86', '#6a4c7d', '#8e3b62', '#a8423b', '#7a4a2a', '#9c6b4e', '#5c5348', '#8a7f3a', '#b0703c'];
  function marketRender(host, M, W, win, title) {
    host.innerHTML = '';
    var X = M && M.windows && M.windows[String(win)];
    if (!X) { host.innerHTML = '<div class="nohist">No market series for this window.</div>'; return; }
    var ds = X.dates, names = Object.keys(X.series), idx = M.index || 'Stoxx Europe 600';
    var ind = names.filter(function (n) { return n !== idx; }).sort();
    var vals = []; names.forEach(function (n) { X.series[n].forEach(function (v) { if (v != null) vals.push(v); }); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pd = (hi - lo) * 0.05 || 1;
    var ret = function (a) { var f = a[0], l = a[a.length - 1]; return (f && l) ? (l / f - 1) : null; };
    var fmtR = function (r) { if (r == null) return ''; var v = Math.round(r * 1000) / 10; return v > 0 ? '+' + v.toFixed(1) + '%' : v < 0 ? '(' + Math.abs(v).toFixed(1) + '%)' : '0.0%'; };
    var series = ind.map(function (n, i) { var a = X.series[n]; return { pts: ds.map(function (d, k) { return { d: d, v: a[k] }; }), color: AUTUMN[i % AUTUMN.length], w: 1.25, label: n + ' ' + fmtR(ret(a)), fmt: function (v) { return v.toFixed(1); }, endLabel: n + ' ' + fmtR(ret(a)) }; });
    var ia = X.series[idx];
    series.push({ pts: ds.map(function (d, k) { return { d: d, v: ia[k] }; }), color: '#1f2328', w: 2.6, label: idx + ' ' + fmtR(ret(ia)), fmt: function (v) { return v.toFixed(1); }, endLabel: idx + ' ' + fmtR(ret(ia)) });
    var cell = cellIn(host, title + ' <span class="mut">(' + fmtD(ds[0]) + '-' + D(ds[0]).getUTCFullYear() + ' to ' + fmtD(ds[ds.length - 1]) + '-' + D(ds[ds.length - 1]).getUTCFullYear() + ')</span>');
    var Hh = Math.max(300, (series.length + 1) * 12 + 20);
    stack(cell, { d0: ds[0], d1: ds[ds.length - 1], width: W, left: 52, right: 290, markers: [], panels: [{ h: Hh, labelEdge: true, labelGap: 11.5, labelSize: 9.5, series: series, yDomain: [lo - pd, hi + pd], yFmt: function (v) { return Math.round(v); } }] });
  }

  window.DASH = { C: C, marketRender: marketRender, snakeRender: snakeRender, ratingsRender: ratingsRender, nubRender: nubRender, ssRender: ssRender, pressureSentence: pressureSentence, niceTicks: niceTicks, stack: stack, ladder: ladder, model: model, oneLine: oneLine, stateWords: stateWords, renderHeader: renderHeader, renderFund: renderFund, overlayFor: overlayFor, drawVolume: drawVolume,
    rsPanel: rsPanel, relPanel: relPanel, statusPanel: statusPanel, ssPanels: ssPanels, ssLegend: ssLegend, ssTable: ssTable, valChart: valChart, valLine: valLine, pctNow: pctNow, peersPicture: peersPicture, peersTable: peersTable,
    renderRatings: renderRatings, renderContext: renderContext, renderJudgement: renderJudgement, renderPlaceholders: renderPlaceholders, renderExperiment: renderExperiment, overlay: overlay, CRIT_WORDS: CRIT_WORDS, addDays: addDays, ordinal: ordinal };
})();
