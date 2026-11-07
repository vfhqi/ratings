/* onescreen.js — the PMS Per-stock Dashboard's one-screen six-panel view (D-PMS-V4-151, Richard 6-Nov-2026; the agreed design is the
   mockup version 4, projects/SA - Position Management System/_work/ricky-2026-11-06-one-screen-mockup/). Built on dashboard.js (DASH) and
   chart-renderer-dashboard.js; the volume, RS, estimates, breadth and peers panes are the live panes at panel size. */
(function () {
  'use strict';
  var C = DASH.C, NS = 'http://www.w3.org/2000/svg', MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function el(tag, a, p) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function txt(p, x, y, s, a) { a = a || {}; var halo = a.halo; delete a.halo; var b = { x: x, y: y, 'font-size': 10, fill: C.ink2, 'font-family': 'Segoe UI, system-ui, sans-serif' }; for (var k in a) b[k] = a[k]; var t = el('text', b, p); if (halo) { t.setAttribute('stroke', '#fff'); t.setAttribute('stroke-width', 3); t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke-linejoin', 'round'); } t.textContent = s; return t; }
  function D(s) { return new Date(s + 'T00:00:00Z'); }
  function addDays(s, n) { var d = D(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function fmtD(s) { var d = D(s); return d.getUTCDate() + '-' + MON[d.getUTCMonth()]; }
  function fmtDY(s) { return fmtD(s) + '-' + D(s).getUTCFullYear(); }
  function br(v, s) { return v < 0 ? '(' + s + ')' : s; }
  function pctS(v) { if (v == null) return 'n/a'; var r = Math.round(v * 100); return r > 0 ? '+' + r + '%' : r < 0 ? '(' + (-r) + '%)' : '0%'; }
  function pctS1(c) { if (c == null) return 'n/a'; var v = Math.round(c * 1000) / 10; return v > 0 ? '+' + v.toFixed(1) + '%' : v < 0 ? '(' + Math.abs(v).toFixed(1) + '%)' : '0.0%'; }
  function fmtN(v) { if (v == null) return 'n/a'; var a = Math.abs(v), s = a >= 1000 ? Math.round(a).toLocaleString('en-GB') : a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a.toFixed(2); return br(v, s); }
  function fmtVol(v) { if (v == null) return 'n/a'; var a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : a >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v)); }
  var niceTicks = DASH.niceTicks;
  function weekday(s) { var g = D(s).getUTCDay(); return g > 0 && g < 6; }
  function sizeOf(e) { var r = e.getBoundingClientRect(); return { w: Math.floor(r.width), h: Math.floor(r.height) }; }
  function buttons(host, list, cur, onPick, label) {
    host.innerHTML = (label ? '<span class="lb">' + label + '</span>' : '') + list.map(function (k) { return '<button class="' + (k[0] === cur ? 'on' : '') + '" data-k="' + k[0] + '">' + k[1] + '</button>'; }).join('');
    host.onclick = function (e) { var b = e.target.closest('button'); if (b) onPick(b.dataset.k); };
  }
  var TRC = { up: '#1a7f37', dn: '#cf222e', flat: '#6e7781' }, TRBG = { up: 'rgba(26,127,55,0.07)', dn: 'rgba(207,34,46,0.07)', flat: null };
  var FYDASH = ['', '7 4', '2 3'], FYW = [2.4, 2.0, 2.0];
  function trKind(c, band) { return c == null ? 'flat' : c <= -band ? 'dn' : c >= band ? 'up' : 'flat'; }

  /* ================= a small time chart: the live page's stack(), cut down to one pane for a sub-panel ================= */
  function mini(host, o) {
    Array.prototype.slice.call(host.children).forEach(function (c) { if (!c.classList.contains('ov6')) host.removeChild(c); });
    var sz = sizeOf(host), W = Math.max(100, sz.w), Hh = Math.max(90, sz.h);
    var L = o.L == null ? 34 : o.L, R = o.R == null ? 40 : o.R, T = o.T == null ? 8 : o.T, B = 26, ph = Hh - T - B;
    /* the margins widen to the longest axis number, so a six-figure scale (Carlsberg's revenue, DKK) is never cut off (UI QC 6-Nov-2026) */
    var tl = (o.yTicks || niceTicks(o.yDomain[0], o.yDomain[1], 3)).map(function (v) { return String((o.yFmt || fmtN)(v)).length; }), tmax = tl.length ? Math.max.apply(null, tl) : 0;
    L = Math.max(L, Math.round(tmax * 5.6 + 7)); if (o.rightTicks) R = Math.max(R, Math.round(tmax * 5.6 + 6));
    var d0 = o.d0, d1 = o.d1, span = (D(d1) - D(d0)) || 1, x = function (s) { return L + (D(s) - D(d0)) / span * (W - L - R); };
    var svg = el('svg', { width: W, height: Hh, viewBox: '0 0 ' + W + ' ' + Hh, style: 'display:block;font-family:Segoe UI,system-ui,sans-serif' }, host);
    var cid = 'cl' + Math.random().toString(36).slice(2, 8); el('defs', {}, svg).innerHTML = '<clipPath id="' + cid + '"><rect x="' + L + '" y="' + (T - 2) + '" width="' + (W - L - R) + '" height="' + (ph + 4) + '"/></clipPath><pattern id="h' + cid + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#8b949e" stroke-width="1" opacity="0.35"/></pattern>';
    var hp = o.headPx || 0, lo = o.yDomain[0], hi = o.yDomain[1], y = function (v) { return T + ph - (v - lo) / (hi - lo) * (ph - hp); };
    var y2 = o.yDomain2 ? function (v) { return T + ph - (v - o.yDomain2[0]) / (o.yDomain2[1] - o.yDomain2[0]) * (ph - hp); } : y;
    if (o.bg) el('rect', { x: L, y: T, width: W - L - R, height: ph, fill: o.bg }, svg);
    /* time furniture, as on the volume panes: a faint line each Monday on short windows, a firmer line at each month, firmer at a quarter, darkest at a year */
    var days = span / 864e5, wk = days <= 100;
    for (var t = d0; t <= d1; t = addDays(t, 1)) { var dt = D(t), first = dt.getUTCDate() === 1, mon = dt.getUTCDay() === 1;
      if (first) { var mo = dt.getUTCMonth(), yr = mo === 0, q = mo % 3 === 0; el('line', { x1: x(t), x2: x(t), y1: T, y2: T + ph, stroke: yr ? 'rgba(31,35,40,0.55)' : q ? 'rgba(31,35,40,0.36)' : 'rgba(31,35,40,0.22)', 'stroke-width': yr ? 1.6 : q ? 1.3 : 1 }, svg); }
      else if (wk && mon) el('line', { x1: x(t), x2: x(t), y1: T, y2: T + ph, stroke: 'rgba(31,35,40,0.07)' }, svg); }
    (o.yTicks || niceTicks(lo, hi, 3)).forEach(function (v) { if (v < lo || v > hi) return; el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: C.grid }, svg); txt(svg, L - 4, Math.max(T + 8, Math.min(T + ph, y(v) + 3.5)), (o.yFmt || fmtN)(v), { 'text-anchor': 'end', 'font-size': 9.5, fill: C.ink3 }); });
    if (o.rightTicks) (o.yTicks || niceTicks(lo, hi, 3)).forEach(function (v) { if (v < lo || v > hi) return; txt(svg, W - R + 3, Math.max(T + 8, Math.min(T + ph, y(v) + 3.5)), (o.yFmt || fmtN)(v), { 'font-size': 9.5, fill: C.ink3 }); });
    if (o.yDomain2 && o.yTicks2) o.yTicks2.forEach(function (v) { txt(svg, W - R + 3, Math.max(T + 8, Math.min(T + ph, y2(v) + 3.5)), (o.yFmt2 || fmtN)(v), { 'font-size': 9.5, fill: C.ink3 }); });
    (o.markers || []).forEach(function (mk) { if (mk.d < d0 || mk.d > d1) return; el('line', { x1: x(mk.d), x2: x(mk.d), y1: T, y2: T + ph, stroke: mk.color || C.entry, 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg); if (mk.label) txt(svg, x(mk.d) + 2, T + 8, mk.label, { 'font-size': 9, fill: mk.color || C.entry, halo: true }); });
    var g = el('g', { 'clip-path': 'url(#' + cid + ')' }, svg), ends = [];
    /* a stretch with no daily reading stored (the daily store began on different days for different counts): left blank and hatched, never bridged by a line */
    var dly = function (q) { return q.src === 'daily' || q.src === 'latest'; }, hole = function (s, a, b) { return !!s.holes && dly(a) && dly(b) && (D(b.d) - D(a.d)) / 864e5 > 7; };
    var holesDone = {};
    o.series.forEach(function (s) { if (!s.holes) return; var sp0 = s.pts; for (var i = 1; i < sp0.length; i++) { var a = sp0[i - 1], b = sp0[i]; if (!hole(s, a, b) || b.d < d0 || holesDone[a.d + b.d]) continue; holesDone[a.d + b.d] = 1;
      var xa = Math.max(L, x(a.d) + 3), xb = Math.min(W - R, x(b.d) - 3); if (xb <= xa) continue; el('rect', { x: xa, y: T, width: xb - xa, height: ph, fill: 'url(#h' + cid + ')' }, svg);
      if (xb - xa > 130) txt(svg, (xa + xb) / 2, T + ph / 2, 'no daily', { 'text-anchor': 'middle', 'font-size': 9, fill: C.ink3, halo: true }), txt(svg, (xa + xb) / 2, T + ph / 2 + 10, 'readings stored', { 'text-anchor': 'middle', 'font-size': 9, fill: C.ink3, halo: true }); } });
    /* keep the last reading before the window's first day, so each line enters from the left edge (clipped there) */
    var inWin = function (pts) { var out = [], prev = null; pts.forEach(function (q) { if (q.d < d0) prev = q; else if (q.d <= d1) out.push(q); }); return prev ? [prev].concat(out) : out; };
    /* labels (counts, percentages) written only where they do not crowd: from the latest backwards, at least minGap pixels apart */
    var thin = function (pts, minGap) { var keep = {}, lastX = 1e9; for (var i = pts.length - 1; i >= 0; i--) { var px = x(pts[i].d); if (pts[i].d < d0) continue; if (lastX - px >= minGap) { keep[pts[i].d] = 1; lastX = px; } } return keep; };
    o.series.forEach(function (s) {
      var yy = s.axis === 'right' ? y2 : y;
      if (s.kind === 'stacked') {
        var sp = inWin(s.pts), segs = [], cur = [];
        sp.forEach(function (q, i) { if (i && ((D(q.d) - D(sp[i - 1].d)) / 864e5 > (s.gap || 45) || hole(s, sp[i - 1], q))) { segs.push(cur); cur = []; } cur.push(q); }); if (cur.length) segs.push(cur);
        var lab = s.numbers ? thin(sp, s.numGap || 24) : {};
        segs.forEach(function (seg) { var base = seg.map(function () { return 0; });
          s.layers.forEach(function (Ly) { var top = seg.map(function (q, i) { return base[i] + (q[Ly.k] || 0); });
            if (seg.length === 1) el('rect', { x: x(seg[0].d) - 5, y: yy(top[0]), width: 10, height: Math.max(0, yy(base[0]) - yy(top[0])), fill: Ly.color }, g);
            else { var dpa = ''; seg.forEach(function (q, i) { dpa += (i ? 'L' : 'M') + x(q.d).toFixed(1) + ',' + yy(top[i]).toFixed(1); }); for (var bi = seg.length - 1; bi >= 0; bi--) dpa += 'L' + x(seg[bi].d).toFixed(1) + ',' + yy(base[bi]).toFixed(1); el('path', { d: dpa + 'Z', fill: Ly.color, stroke: 'none' }, g); }
            if (s.numbers) seg.forEach(function (q, i) { if (!lab[q.d]) return; var v = q[Ly.k] || 0; if (!v) return; var ya = yy(base[i]), yb = yy(top[i]); if (ya - yb < 9.5) return; txt(svg, Math.max(L + 5, Math.min(W - R - 5, x(q.d))), (ya + yb) / 2 + 3.5, String(v), { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700, fill: Ly.num || Ly.ink, halo: true }); });
            base = top; }); });
        if (s.endLabels && sp.length) { var lq = sp[sp.length - 1], cb = 0; s.layers.forEach(function (Ly) { var v = lq[Ly.k] || 0; ends.push({ y: yy(cb + v / 2) + 3.5, t: Ly.label + ' ' + (s.endFmt ? s.endFmt(v) : v), c: Ly.ink, w: 500 }); cb += v; }); }
      } else if (s.kind === 'hline') { el('line', { x1: L, x2: W - R, y1: yy(s.v), y2: yy(s.v), stroke: s.color, 'stroke-width': s.w || 1.2, 'stroke-dasharray': s.dash || '' }, svg); }
      else {
        var pts = inWin(s.pts.filter(function (q) { return q.v != null; })); if (!pts.length) return;
        var dp = ''; pts.forEach(function (q, i) { var brk = !i || (s.gap && (D(q.d) - D(pts[i - 1].d)) / 864e5 > s.gap) || hole(s, pts[i - 1], q); dp += (brk ? 'M' : 'L') + x(q.d).toFixed(1) + ',' + yy(q.v).toFixed(1); });
        el('path', { d: dp, fill: 'none', stroke: s.color, 'stroke-width': s.w || 1.5, 'stroke-dasharray': s.dash || '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: s.opacity || 1 }, g);
        if (s.dotAt) pts.forEach(function (q) { if (q.d >= d0 && s.dotAt(q)) el('circle', { cx: x(q.d), cy: yy(q.v), r: s.dotR || 2.4, fill: s.color, stroke: '#fff', 'stroke-width': 1 }, g); });
        if (s.ptLabel) { var kp = thin(pts, s.labGap || 30); pts.forEach(function (q) { if (!kp[q.d]) return; var lb = s.ptLabel(q); if (lb) txt(svg, Math.max(L + 12, Math.min(W - R - 16, x(q.d))), Math.max(T + 7, yy(q.v) - 5), lb, { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 700, fill: s.color, halo: true }); }); }
        if (s.endLabel) { var lp = pts[pts.length - 1]; ends.push({ y: yy(lp.v) + 3.5, t: s.endLabel, c: s.color, w: 650 }); }
      }
    });
    /* the value at the start of the window and at the end of each line (Richard, 6-Nov 14:02), written beside the line, kept apart */
    var SE = { s: [], e: [] };
    o.series.forEach(function (s) { if (!s.se) return; var yy = s.axis === 'right' ? y2 : y, all = s.pts.filter(function (q) { return q.v != null; }), prev = null, inw = [];
      all.forEach(function (q) { if (q.d <= d0) prev = q; else if (q.d <= d1) inw.push(q); }); var a = prev || inw[0], b = inw.length ? inw[inw.length - 1] : prev; if (!a || !b) return;
      SE.s.push({ y: yy(a.v) - 4, t: s.se(a.v), c: s.color }); SE.e.push({ y: yy(b.v) - 4, t: s.se(b.v), c: s.color, x: x(b.d) }); });
    ['s', 'e'].forEach(function (side) { var A = SE[side].sort(function (p, q) { return p.y - q.y; }); for (var i = 1; i < A.length; i++) if (A[i].y - A[i - 1].y < 11) A[i].y = A[i - 1].y + 11;
      A.forEach(function (q) { txt(svg, side === 's' ? L + 3 : Math.min(W - R - 3, q.x), Math.max(T + 8, Math.min(T + ph - 2, q.y)), q.t, { 'text-anchor': side === 's' ? 'start' : 'end', 'font-size': 9.5, 'font-weight': 700, fill: q.c, halo: true }); }); });
    el('line', { x1: L, x2: W - R, y1: T + ph, y2: T + ph, stroke: C.border }, svg);
    /* the right-hand margin's end labels, pushed apart */
    ends.sort(function (a, b) { return a.y - b.y; }); for (var i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 11) ends[i].y = ends[i - 1].y + 11;
    var over = ends.length ? ends[ends.length - 1].y - (T + ph + 6) : 0; if (over > 0) { ends.forEach(function (e) { e.y -= over; }); for (var k = ends.length - 2; k >= 0; k--) if (ends[k + 1].y - ends[k].y < 11) ends[k].y = ends[k + 1].y - 11; }
    ends.forEach(function (e) { txt(svg, W - R + 4, Math.max(T + 6, e.y), e.t, { fill: e.c, 'font-size': 9.5, 'font-weight': e.w || 600, halo: true }); });
    /* dates: each Monday's day number on short windows (every other one when tight), the month names beneath, quarter months in bold */
    var yl = T + ph + 11;
    if (wk) { var pxw = 7 * (W - L - R) / days, step = pxw >= 22 ? 1 : 2, c = 0; for (var t2 = d0; t2 <= d1; t2 = addDays(t2, 1)) { if (D(t2).getUTCDay() !== 1) continue; if (c++ % step) continue; txt(svg, x(t2), yl, String(D(t2).getUTCDate()), { 'text-anchor': 'middle', 'font-size': 9, fill: C.ink3 }); } }
    var ms = d0; for (var t3 = addDays(d0, 1); ; t3 = addDays(t3, 1)) { var end = t3 > d1; if (!end && D(t3).getUTCDate() !== 1) continue; var a = x(ms), b = x(end ? d1 : t3), mo2 = D(ms).getUTCMonth(); var nm = b - a > 46 ? MON[mo2] + ' ' + String(D(ms).getUTCFullYear()).slice(2) : b - a > 20 ? MON[mo2] : ''; if (nm) txt(svg, (a + b) / 2, wk ? yl + 11 : yl + 3, nm, { 'text-anchor': 'middle', 'font-size': 9.5, fill: C.ink, 'font-weight': mo2 % 3 === 0 ? 700 : 500 }); if (end) break; ms = t3; }
    /* hover: the readings on or before the day */
    var cross = el('line', { x1: 0, x2: 0, y1: T, y2: T + ph, stroke: C.ink3, 'stroke-dasharray': '2 2', opacity: 0 }, svg);
    var tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; host.appendChild(tip);
    svg.addEventListener('mousemove', function (ev) { var r = svg.getBoundingClientRect(), px = ev.clientX - r.left; if (px < L || px > W - R) { cross.setAttribute('opacity', 0); tip.style.display = 'none'; return; }
      var td = new Date(D(d0).getTime() + (px - L) / (W - L - R) * span).toISOString().slice(0, 10); cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('opacity', 1);
      var h = '<b>' + fmtDY(td) + '</b>';
      o.series.forEach(function (s) { if (!s.label) return; var sq = s.pts.filter(function (q) { return q.d <= td; }); if (!sq.length) return; var lq = sq[sq.length - 1];
        if (s.kind === 'stacked') h += '<div>' + s.label + ' <span class="mut">(' + fmtD(lq.d) + ')</span>: ' + s.layers.map(function (Ly) { return '<span style="color:' + Ly.tip + '">' + Ly.label + ' ' + (lq[Ly.k] || 0) + (s.unit || '') + '</span>'; }).join(', ') + '</div>';
        else if (lq.v != null) h += '<div><span style="color:' + s.color + '">&#9679;</span> ' + s.label + ': ' + (s.fmt || fmtN)(lq.v) + (lq.d !== td ? ' <span class="mut">(' + fmtD(lq.d) + ')</span>' : '') + '</div>'; });
      tip.innerHTML = h; tip.style.display = 'block'; tip.style.left = Math.max(0, Math.min(px + 12, W - 240)) + 'px'; tip.style.top = Math.min(ev.clientY - r.top + 10, Hh - 60) + 'px'; });
    svg.addEventListener('mouseleave', function () { cross.setAttribute('opacity', 0); tip.style.display = 'none'; });
  }
  function subCell(host) { var c = document.createElement('div'); c.className = 'sub'; c.innerHTML = '<div class="sb"></div>'; host.appendChild(c); return c.querySelector('.sb'); }
  function cardH(sb, html, left, wide) { var d = ov(sb, html, left, null, null, wide); return d.offsetHeight + 6; }
  function ov(sb, html, left, place, pad, wide) { var d = document.createElement('div'); d.className = 'ov6'; d.innerHTML = html; d.style.left = (wide ? 2 : left + 2) + 'px'; if (wide) { d.style.right = '2px'; d.style.maxWidth = 'none'; } if (place === 'bottom') d.style.bottom = ((pad == null ? 28 : pad) + 2) + 'px'; else d.style.top = '2px'; sb.appendChild(d); return d; }
  function chipsRow(sw, lab, val, cs, fmt) { return '<div class="r">' + sw + '<span class="v">' + lab + ' ' + val + '</span>' + cs.map(function (c) { var k = c[1] == null ? 'flat' : trKind(c[1], c[2]); return '<span class="cg ' + k + '">' + c[0] + ' ' + (c[1] == null ? 'n/a' : (fmt || pctS1)(c[1])) + '</span>'; }).join('') + '</div>'; }
  var TBH = '<span></span><span></span><span class="h">1M</span><span class="h">3M</span><span class="h">6M %</span>';
  function tbRow(swv, lab, cs, fmt) { return '<span>' + swv + '</span><span class="lab">' + lab + '</span>' + cs.map(function (c) { var k = c[0] == null ? 'flat' : trKind(c[0], c[1]); var v = c[0] == null ? 'n/a' : fmt ? fmt(c[0]) : (function (x) { var r = Math.round(x * 1000) / 10; return r > 0 ? '+' + r.toFixed(1) : r < 0 ? '(' + Math.abs(r).toFixed(1) + ')' : '0.0'; })(c[0]); return '<span class="n ' + k + '">' + v + '</span>'; }).join(''); }
  function sw(yi, col) { return '<svg width="18" height="8"><line x1="1" x2="17" y1="4" y2="4" stroke="' + col + '" stroke-width="' + (FYW[yi] || 2) + '" stroke-dasharray="' + (FYDASH[yi] || '') + '"/></svg>'; }

  var m = null, X = null, chartRows = null, MECHD = {}, OPTS = {}, st = { vol: 'L3M', est: 'L6M', nub: 'L3M', px: 'm3', py: 'eps3', pv: 'chart', rsz: '12M', estL: 'rows', p6: 'peers', vf: 'pe' };
  /* the settings chosen are kept in this browser and used for the next stock opened (Richard, 6-Nov-2026 15:13: "Remember the historical settings
     (e.g. what timeframe) when I load a new stock"): every panel's window, item 1's zoom, scale and MAs shown, RS's zoom, the peers chart or table */
  var KEY = 'pmsOneScreenSettings';
  function restore() { try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!o) return; for (var k in st) if (k !== 'estL' && typeof o[k] === 'string') st[k] = o[k];   /* the estimates layout is fixed: three stacked (Richard, 6-Nov 15:41) */
    if (typeof o.spz === 'string') chartZoom = o.spz; if (o.scale === 'lin' || o.scale === 'log') chartScaleMode = o.scale; if (o.mas) for (var mk in o.mas) chartVis[mk] = !!o.mas[mk]; } catch (e) { /* none kept */ } }   /* run at start: holding.html sets its own defaults after this file loads */
  function save() { try { var o = {}; for (var k in st) o[k] = st[k]; o.spz = chartZoom; o.scale = chartScaleMode; o.mas = {}; ['ma5', 'ma10', 'ma20', 'ma50', 'ma100', 'ma150', 'ma200'].forEach(function (k) { o.mas[k] = !!chartVis[k]; }); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* not kept: fine */ } }
  var WIN = { L1M: 30, L3M: 91, L6M: 182 };
  /* the sell-side series: the stored month-ends (re-marked as month-ends), then every stored daily reading (ss2.daily, ss.years_daily:
     scripts/pms_dashboard_extract.py 1.9, D-PMS-V4-152). A file without daily rows shows its month-ends only, with no gaps hatched. */
  function merge(monthly, daily) {
    var f = daily && daily.length ? daily[0].d : '9999-12-31';
    var mo = (monthly || []).filter(function (q) { return q.d < f; }).map(function (q) { var o = {}; for (var k in q) o[k] = q[k]; o.src = 'monthly'; return o; });
    return mo.concat((daily || []).map(function (q) { var o = {}; for (var k in q) o[k] = q[k]; o.src = 'daily'; return o; }));
  }
  function buildX(mm) {
    var S2 = mm.H.ss2 || {}, NC = S2.nubc || {}, D2 = S2.daily || {}, Y = (mm.H.ss || {}).years || {}, YD = (mm.H.ss || {}).years_daily || {}, out = { nubc: {}, years: {} };
    out.nubc.eps = merge(NC.eps, D2.eps); out.nubc.sales = merge(NC.sales, D2.sales); out.nubc.tp = merge(NC.tp, D2.tp); out.nubc.buys = merge(NC.buys, D2.ratings);
    out.ratings = merge(S2.ratings, D2.ratings);
    ['eps', 'sales'].forEach(function (k) { out.years[k] = {}; (Y.labels || []).forEach(function (y) { out.years[k][y] = merge((Y[k] || {})[y], (YD[k] || {})[y]); }); });
    return out;
  }
  function header() {
    var R = m.R;
    document.getElementById('os-nm').innerHTML = DU.esc(m.name) + ' <span class="tk">' + DU.esc(m.t) + '</span>';
    document.getElementById('os-hsub').innerHTML = DU.esc(m.ind) + ' &middot; ' + DU.esc(m.sec) + ' &middot; ' + (m.notHeld ? '<span class="pill grey os-pill">Not held</span>'
      : '<span class="pill ' + (m.probing ? 'blue' : 'grey') + ' os-pill">' + DU.esc(m.status) + '</span> <b>' + R.size_pct.toFixed(2) + '%</b> of capital now, ' + m.tranches.length + ' tranche' + (m.tranches.length === 1 ? '' : 's'));
    document.getElementById('os-asof').textContent = 'readings as at ' + fmtDY(m.asof) + ' (Fridays read ' + fmtD(m.lastFriday) + '; month-end read ' + fmtD(m.lastME) + ')';
  }
  var started = false;
  function visible() { return document.body.classList.contains('os-on'); }
  window.ONESCREEN = {
    /* the estimates panel's layout: 'cols' three side by side (live), 'rows' three stacked, 'grid' 2x2 with Buys, Holds and Sells (mockups of 6-Nov-2026 15:13) */
    setEstLayout: function (l) { st.estL = l; if (started && visible()) drawEst(); },
    /* called by holding.html once the stock's file is loaded; draws only while the one-screen view is showing */
    start: function (model, opts) { restore(); m = model; OPTS = opts || {}; MECHD = {}; ((OPTS.mech && OPTS.mech.dates) || []).forEach(function (q) { MECHD[q.date] = q.why; }); X = buildX(m); header(); started = true; if (visible()) drawAll(); },
    show: function () { if (started) drawAll(); },
    /* the RS panel's zoom, read and set by the full page's item 3 (7-Nov-2026: its own timeframe on both views, one remembered choice) */
    rsz: function (v) { if (v) { st.rsz = v; save(); } else if (!started) restore(); return st.rsz; },
    /* the full page's item 1 saves its zoom, scale and layers here too (7-Nov-2026), so one setting serves both views */
    saveNow: function () { if (started) save(); }
  };
  var lw = window.innerWidth, lh = window.innerHeight, tmr;
  window.addEventListener('resize', function () { clearTimeout(tmr); tmr = setTimeout(function () { if (!started || !visible()) return; if (Math.abs(window.innerWidth - lw) < 2 && Math.abs(window.innerHeight - lh) < 2) return; lw = window.innerWidth; lh = window.innerHeight; drawAll(); }, 200); });
  function drawAll() { drawSP(); drawVol(); drawEst(); drawNub(); drawPeers(); }

  /* ================= 1. SP and MAs: the live chart, drawn to the panel's size ================= */
  function drawSP() {
    save();
    var z = document.getElementById('os-zooms'), s = document.getElementById('os-scales');
    buttons(z, ['1M', '3M', '6M', '12M', '2Y', '3Y', '5Y'].map(function (k) { return [k, k]; }), chartZoom, function (k) { chartZoom = k; drawSP(); });
    buttons(s, [['lin', 'LIN'], ['log', 'LOG']], chartScaleMode, function (k) { chartScaleMode = k; drawSP(); });
    /* the Layers buttons, on item 1's title line (Richard, 6-Nov 14:02): the same MAs and colours as the live Layers row, written once as "MAs" then each period; click to show or hide */
    var MAS = [['ma5', '5D', '#8b0000'], ['ma10', '10D', '#e88a9a'], ['ma20', '20D', '#e74c3c'], ['ma50', '50D', '#ff8c00'], ['ma100', '100D', '#2ca02c'], ['ma150', '150D', '#1a5276'], ['ma200', '200D (absolute)', '#4a3d9e']];
    ['obv', 'vol', 'vol50', 'vol20'].forEach(function (k) { chartVis[k] = false; });
    document.getElementById('os-legend').innerHTML = '<span class="lb">MAs</span>' + MAS.map(function (a) { var on = chartVis[a[0]]; return '<button class="ma' + (on ? ' on' : '') + '" data-k="' + a[0] + '" style="color:' + a[2] + ';border-color:' + (on ? a[2] : 'transparent') + '">' + a[1] + '</button>'; }).join('');
    document.getElementById('os-legend').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; chartVis[b.dataset.k] = !chartVis[b.dataset.k]; drawSP(); };
    window.toggleChartLayer = function (layer) { chartVis[layer] = !chartVis[layer]; drawSP(); };
    chartTicker = m.t;
    var host = document.getElementById('os-chart-container'), hh = host.parentNode.getBoundingClientRect().height;
    loadChartData(m.t, function (rows) {
      chartRows = rows;
      drawMasterChart(m.t, { canvasId: 'os-canvas', containerId: 'os-chart-container', height: Math.max(220, Math.floor(hh)), upto: m.asof, overlay: DASH.overlayFor(m, true), pad: { t: 26, r: 82, b: 30, l: 6 }, priceTicks: 14, malX: 40 });
      drawRS();
      drawEst();
    });
  }

  /* ================= 3. RS: the live pane (dashboard.js drawRS), at the panel's size, with its end labels kept ================= */
  function drawRS() {
    /* its own zoom, not linked to item 1's (Richard, 6-Nov-2026 15:13: "When I change the timeframe for the SP chart, do not link that change to the RS chart") */
    buttons(document.getElementById('os-tg3'), [['3M', '3M'], ['6M', '6M'], ['12M', '12M'], ['2Y', '2Y']], st.rsz, function (k) { st.rsz = k; drawRS(); });
    save();
    var host = document.getElementById('os-rsc'); host.innerHTML = '';
    if (!chartRows || !chartRows.length) return;
    var lay = { dates: getChartSlice(chartRows.filter(function (r) { return r.d <= m.asof; }), st.rsz).map(function (r) { return r.d; }) }; if (!lay.dates.length) return;
    var sz = sizeOf(host), W = sz.w, Hh = sz.h, pad = { l: 26, r: 24 }, n = lay.dates.length, bw = (W - pad.l - pad.r) / n;
    var xi = function (i) { return pad.l + i * bw + bw / 2; };
    var pts = m.rs.filter(function (q) { return q.k === 'fr' || q.k === 'me' || q.k === 'o'; });
    var idxOf = function (d) { var k = -1; for (var j = 0; j < n; j++) { if (lay.dates[j] <= d) k = j; else break; } return k; };
    var P = pts.map(function (q) { return { i: idxOf(q.d), q: q }; }).filter(function (o) { return o.i >= 0 && o.q.d >= lay.dates[0]; });
    var top = 18, h = Hh - top - 28;
    var svg = el('svg', { width: W, height: Hh, viewBox: '0 0 ' + W + ' ' + Hh, style: 'display:block;font-family:Segoe UI,system-ui,sans-serif' }, host);
    var y = function (v) { return top + h - v / 99 * h; };
    /* alternate weeks shaded, month, quarter and year lines, as on the live pane */
    var ds = lay.dates.map(D), wkI = 0, ws = 0, monF = function (i) { if (!i) return true; return ds[i].getUTCDay() < ds[i - 1].getUTCDay() || (ds[i] - ds[i - 1]) / 864e5 >= 7; }, msF = function (i) { return i > 0 && ds[i].getUTCMonth() !== ds[i - 1].getUTCMonth(); };
    for (var i = 0; i <= n; i++) { if (i === n || (i > 0 && monF(i))) { if (wkI % 2 === 1) el('rect', { x: pad.l + ws * bw, y: top, width: (i - ws) * bw, height: h, fill: 'rgba(31,35,40,0.035)' }, svg); wkI++; ws = i; } }
    for (var j = 1; j < n; j++) { if (!msF(j)) continue; var mo = ds[j].getUTCMonth(); el('line', { x1: pad.l + j * bw, x2: pad.l + j * bw, y1: top, y2: top + h, stroke: mo === 0 ? 'rgba(31,35,40,0.55)' : mo % 3 === 0 ? 'rgba(31,35,40,0.36)' : 'rgba(31,35,40,0.22)', 'stroke-width': mo === 0 ? 1.8 : mo % 3 === 0 ? 1.4 : 1 }, svg); }
    el('rect', { x: pad.l, y: y(30), width: W - pad.l - pad.r, height: top + h - y(30), fill: 'rgba(207,34,46,0.06)' }, svg);
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99].forEach(function (v) { if (h < 200 && [10, 20, 40, 60, 80].indexOf(v) >= 0) return; el('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), stroke: C.grid }, svg); var lc = v === 70 ? C.stock : v === 50 ? C.sector : v === 30 ? C.industry : C.ink3; txt(svg, pad.l - 4, y(v) + 3.5, String(v), { 'text-anchor': 'end', 'font-size': 9.5, fill: lc, 'font-weight': [70, 50, 30].indexOf(v) >= 0 ? 700 : 400 }); txt(svg, W - pad.r + 4, y(v) + 3.5, String(v), { 'font-size': 9.5, fill: lc, 'font-weight': [70, 50, 30].indexOf(v) >= 0 ? 700 : 400 }); });
    [[70, C.stock], [50, C.sector], [30, C.industry]].forEach(function (a) { el('line', { x1: pad.l, x2: W - pad.r, y1: y(a[0]), y2: y(a[0]), stroke: a[1], 'stroke-width': 1.1, 'stroke-dasharray': '5 3', opacity: 0.8 }, svg); });
    var ends = [];
    [['s', C.stock, 'Stock RS'], ['sec', C.sector, 'Sector RS'], ['ind', C.industry, 'Industry RS']].forEach(function (s) {
      var dp = ''; P.forEach(function (o) { var v = o.q[s[0]]; if (v == null) return; dp += (dp ? 'L' : 'M') + xi(o.i).toFixed(1) + ',' + y(v).toFixed(1); });
      if (dp) el('path', { d: dp, fill: 'none', stroke: s[1], 'stroke-width': 1.7, 'stroke-linejoin': 'round' }, svg);
      P.forEach(function (o) { var v = o.q[s[0]]; if (v != null && o.q.k === 'me') el('circle', { cx: xi(o.i), cy: y(v), r: 2.8, fill: s[1], stroke: '#fff', 'stroke-width': 1 }, svg); });
      var Lq = null; for (var k = P.length - 1; k >= 0; k--) if (P[k].q[s[0]] != null) { Lq = P[k]; break; }
      if (Lq) ends.push({ y: y(Lq.q[s[0]]) - 5, x: xi(Lq.i), t: s[2] + ' ' + Lq.q[s[0]], c: s[1] });
    });
    ends.sort(function (a, b) { return a.y - b.y; }); for (var e = 1; e < ends.length; e++) if (ends[e].y - ends[e - 1].y < 12) ends[e].y = ends[e - 1].y + 12;
    ends.forEach(function (q) { txt(svg, q.x - 4, Math.max(top + 9, q.y), q.t, { fill: q.c, 'font-size': 10, 'font-weight': 700, 'text-anchor': 'end', halo: true }); });
    el('line', { x1: pad.l, x2: W - pad.r, y1: top + h, y2: top + h, stroke: C.border }, svg);
    /* tranches, labelled above the pane */
    var labRows = []; m.tranches.slice().sort(function (a, b) { return a.entry_date < b.entry_date ? -1 : 1; }).forEach(function (tr) { var k = idxOf(tr.entry_date); if (k < 0 || tr.entry_date < lay.dates[0]) return; k = lay.dates[k] === tr.entry_date ? k : k + 1; el('line', { x1: xi(k), x2: xi(k), y1: top - 4, y2: top + h, stroke: C.entry, 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg); var lab = 'tranche ' + tr.tranche_number + ', ' + fmtD(tr.entry_date), wl = lab.length * 5.3, x0 = xi(k) + 3 + wl > W - 2 ? xi(k) - 3 - wl : xi(k) + 3;
      /* two rows (above the plot, then just inside it), so tranches bought close together never print on top of each other */
      for (var rw = 0; rw < 3; rw++) { if ((labRows[rw] = labRows[rw] || []).some(function (o) { return x0 < o[1] + 6 && x0 + wl > o[0] - 6; })) continue;
        labRows[rw].push([x0, x0 + wl]); txt(svg, x0, rw ? top - 2 + rw * 11 : top - 6, lab, { fill: C.entry, 'font-size': 9.5, halo: true }); break; } });
    /* dates: the month names, quarter months in bold */
    var ms = 0; for (var q = 1; q <= n; q++) { if (q < n && !msF(q)) continue; var x0 = pad.l + ms * bw, x1 = pad.l + q * bw, mo3 = ds[ms].getUTCMonth(), nm = x1 - x0 > 44 ? MON[mo3] + ' ' + String(ds[ms].getUTCFullYear()).slice(2) : x1 - x0 > 20 ? MON[mo3] : ''; if (nm) txt(svg, (x0 + x1) / 2, top + h + 14, nm, { 'text-anchor': 'middle', 'font-size': 10, fill: C.ink, 'font-weight': mo3 % 3 === 0 ? 700 : 500 }); ms = q; }
    var cross = el('line', { x1: 0, x2: 0, y1: top, y2: top + h, stroke: C.ink3, 'stroke-dasharray': '2 2', opacity: 0 }, svg);
    var tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; host.appendChild(tip);
    svg.addEventListener('mousemove', function (ev) { var r = svg.getBoundingClientRect(), px = ev.clientX - r.left, i2 = Math.floor((px - pad.l) / bw); if (i2 < 0 || i2 >= n) { tip.style.display = 'none'; cross.setAttribute('opacity', 0); return; } var o = null; P.forEach(function (p) { if (p.i <= i2) o = p; }); if (!o) return; cross.setAttribute('x1', xi(o.i)); cross.setAttribute('x2', xi(o.i)); cross.setAttribute('opacity', 1); tip.innerHTML = '<b>' + fmtDY(o.q.d) + '</b> <span class="mut">(' + (o.q.k === 'me' ? 'month-end' : o.q.k === 'fr' ? 'Friday' : 'latest day') + ')</span><div>Stock RS ' + o.q.s + '; Sector RS ' + o.q.sec + '; Industry RS ' + o.q.ind + '</div>'; tip.style.display = 'block'; tip.style.left = Math.max(0, Math.min(px + 12, W - 230)) + 'px'; tip.style.top = (ev.clientY - r.top + 10) + 'px'; });
    svg.addEventListener('mouseleave', function () { tip.style.display = 'none'; cross.setAttribute('opacity', 0); });
  }

  /* ================= 2. Volume: the live four panes (dashboard.js drawVolume), each in its own square-ish sub-panel ================= */
  function drawVol() {
    save();
    buttons(document.getElementById('os-tg2'), [['L1M', 'L1M'], ['L3M', 'L3M']], st.vol, function (k) { st.vol = k; drawVol(); });
    var host = document.getElementById('os-vol4'); host.innerHTML = '';
    var V = m.H.volume, from = addDays(m.asof, -WIN[st.vol]), rows = V.filter(function (q) { return q.d > from && q.d <= m.asof; }), n = rows.length;
    var DL = {}; m.daily.forEach(function (q) { DL[q.d] = q; });
    var q0 = rows[n - 1] || {};
    var hA = subCell(host), hB = subCell(host), hC = subCell(host), hD = subCell(host);
    var GREEN = '#1a7f37';
    function frame(hh, padR) { var sz = sizeOf(hh), W = sz.w, H = sz.h, pad = { l: 34, r: padR }, bw = (W - pad.l - pad.r) / n; var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: 'display:block;font-family:Segoe UI,system-ui,sans-serif' }, hh);
      var ds = rows.map(function (q) { return D(q.d); }), mon = function (i) { if (!i) return true; return ds[i].getUTCDay() < ds[i - 1].getUTCDay() || (ds[i] - ds[i - 1]) / 864e5 >= 7; }, mst = function (i) { return i > 0 && ds[i].getUTCMonth() !== ds[i - 1].getUTCMonth(); };
      var F = { W: W, H: H, pad: pad, bw: bw, n: n, svg: svg, top: 6, ph: H - 6 - 26, xi: function (i) { return pad.l + i * bw + bw / 2; }, edge: function (i) { return pad.l + i * bw; }, ds: ds, mon: mon, mst: mst };
      /* alternate weeks shaded, a line each Monday, firmer at a month, quarter and year: the live panes' time furniture */
      var wk = 0, ws = 0; for (var i = 0; i <= n; i++) { if (i === n || (i > 0 && mon(i))) { if (wk % 2 === 1) el('rect', { x: F.edge(ws), y: F.top, width: F.edge(i) - F.edge(ws), height: F.ph, fill: 'rgba(31,35,40,0.035)' }, svg); wk++; ws = i; } }
      for (var j = 1; j < n; j++) { if (!mon(j) && !mst(j)) continue; var ms = mst(j), mo = ds[j].getUTCMonth(); el('line', { x1: F.edge(j), x2: F.edge(j), y1: F.top, y2: F.top + F.ph, stroke: ms && mo === 0 ? 'rgba(31,35,40,0.55)' : ms && mo % 3 === 0 ? 'rgba(31,35,40,0.36)' : ms ? 'rgba(31,35,40,0.22)' : 'rgba(31,35,40,0.08)', 'stroke-width': ms && mo % 3 === 0 ? 1.4 : 1 }, svg); }
      m.tranches.forEach(function (tr) { var k = -1; for (var i2 = 0; i2 < n; i2++) if (rows[i2].d >= tr.entry_date) { k = i2; break; } if (k < 0 || rows[0].d > tr.entry_date) return; el('line', { x1: F.xi(k), x2: F.xi(k), y1: F.top, y2: F.top + F.ph, stroke: C.entry, 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg); });
      return F; }
    function dates(F) { var y = F.top + F.ph + 11, every = F.bw >= 13, c = 0, lastX = -99;
      for (var i = 0; i < F.n; i++) { var isMon = F.mon(i), d = F.ds[i].getUTCDate(); if (every) { txt(F.svg, F.xi(i), y, String(d), { 'text-anchor': 'middle', 'font-size': 9, fill: isMon ? C.ink : C.ink3, 'font-weight': isMon ? 700 : 400 }); continue; } if (isMon && (c++ % (F.bw * 5 >= 22 ? 1 : 2) === 0) && F.xi(i) - lastX >= 16) { lastX = F.xi(i); txt(F.svg, F.xi(i), y, String(d), { 'text-anchor': 'middle', 'font-size': 9, fill: C.ink2 }); } }
      var ms = 0; for (var q = 1; q <= F.n; q++) { if (q < F.n && !F.mst(q)) continue; var x0 = F.edge(ms), x1 = F.edge(q), mo = F.ds[ms].getUTCMonth(), nm = x1 - x0 > 44 ? MON[mo] + ' ' + String(F.ds[ms].getUTCFullYear()).slice(2) : x1 - x0 > 20 ? MON[mo] : ''; if (nm) txt(F.svg, (x0 + x1) / 2, y + 11, nm, { 'text-anchor': 'middle', 'font-size': 9.5, fill: C.ink, 'font-weight': mo % 3 === 0 ? 700 : 500 }); ms = q; }
      el('line', { x1: F.pad.l, x2: F.W - F.pad.r, y1: F.top + F.ph, y2: F.top + F.ph, stroke: C.border }, F.svg); }
    function hover(hh, F, html) { var cross = el('line', { x1: 0, x2: 0, y1: F.top, y2: F.top + F.ph, stroke: C.ink3, 'stroke-dasharray': '2 2', opacity: 0 }, F.svg); var tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; hh.appendChild(tip);
      F.svg.addEventListener('mousemove', function (ev) { var r = F.svg.getBoundingClientRect(), px = ev.clientX - r.left, i = Math.floor((px - F.pad.l) / F.bw); if (i < 0 || i >= F.n) { tip.style.display = 'none'; cross.setAttribute('opacity', 0); return; } cross.setAttribute('x1', F.xi(i)); cross.setAttribute('x2', F.xi(i)); cross.setAttribute('opacity', 1); tip.innerHTML = '<b>' + fmtDY(rows[i].d) + '</b>' + html(i); tip.style.display = 'block'; tip.style.left = Math.max(0, Math.min(px + 12, F.W - 250)) + 'px'; tip.style.top = Math.min(ev.clientY - r.top + 10, F.H - 50) + 'px'; });
      F.svg.addEventListener('mouseleave', function () { tip.style.display = 'none'; cross.setAttribute('opacity', 0); }); }
    function endLab(F, list) { list.sort(function (a, b) { return a.y - b.y; }); for (var i = 1; i < list.length; i++) if (list[i].y - list[i - 1].y < 11) list[i].y = list[i - 1].y + 11; list.forEach(function (e) { txt(F.svg, F.W - F.pad.r + 4, e.y, e.t, { fill: e.c, 'font-size': 9.5, 'font-weight': 650 }); }); }
    /* pane A: daily volume */
    var cA = cardH(hA, '<b>Daily volume</b> &#9660; distribution, &#9650; accumulation day', 34);
    var F = frame(hA, 30); el('defs', {}, F.svg).innerHTML = '<pattern id="vhatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#57606a" stroke-width="1.5" opacity="0.75"/></pattern>'; var vmax = Math.max.apply(null, rows.map(function (q) { return q.v; }).concat([1])), v50m = Math.max.apply(null, rows.map(function (q) { return q.v50 || 0; }).concat([1]));
    var capRaw = Math.min(vmax, 3 * v50m) * 1.05, NT = niceTicks(0, capRaw, 3), cap = NT[NT.length - 1] >= capRaw ? NT[NT.length - 1] : capRaw, yA = function (v) { return F.top + F.ph - Math.min(v, cap) / cap * (F.ph - cA); };
    NT.forEach(function (v) { if (v > cap) return; el('line', { x1: F.pad.l, x2: F.W - F.pad.r, y1: yA(v), y2: yA(v), stroke: C.grid }, F.svg); txt(F.svg, F.pad.l - 4, yA(v) + 3.5, v ? fmtVol(v) : '0', { 'text-anchor': 'end', 'font-size': 9.5, fill: C.ink3 }); });
    if (q0.v50) [0.5, 1, 1.25, 2, 3].forEach(function (k) { var v = k * q0.v50; if (v > cap) return; txt(F.svg, F.W - F.pad.r + 3, yA(v) + 3.5, k + 'x', { 'font-size': 9, fill: k === 1.25 ? C.red : C.ink3, 'font-weight': k === 1.25 ? 700 : 400 }); });
    var bwx = Math.max(1, Math.min(F.bw * 0.72, 14));
    rows.forEach(function (q, i) { var hgt = Math.max(1, F.top + F.ph - yA(q.v)), r = q.v50 > 0 ? q.v / q.v50 : null, dist = !q.up && r > 1.25, acc = q.up && r > 1.25, quiet = r != null && r < 0.5, mech = MECHD[q.d];
      var fill = dist ? 'rgba(207,34,46,0.95)' : acc ? 'rgba(26,127,55,0.95)' : quiet ? (q.up ? 'rgba(26,127,55,0.20)' : 'rgba(207,34,46,0.17)') : q.up ? 'rgba(26,127,55,0.50)' : 'rgba(207,34,46,0.40)';
      el('rect', { x: F.xi(i) - bwx / 2, y: F.top + F.ph - hgt, width: bwx, height: hgt, fill: fill }, F.svg);
      if (mech) el('rect', { x: F.xi(i) - bwx / 2, y: F.top + F.ph - hgt, width: bwx, height: hgt, fill: 'url(#vhatch)' }, F.svg);
      if (dist || acc) txt(F.svg, F.xi(i), Math.max(F.top + 8, F.top + F.ph - hgt - 2), dist ? '▼' : '▲', { 'text-anchor': 'middle', 'font-size': F.bw >= 6 ? 9 : 7.5, fill: dist ? C.red : GREEN }); });
    var dp = ''; rows.forEach(function (q, i) { if (q.v50) dp += (dp ? 'L' : 'M') + F.xi(i).toFixed(1) + ',' + yA(q.v50 * 1.25).toFixed(1); }); if (dp) el('path', { d: dp, fill: 'none', stroke: C.red, 'stroke-width': 1.1, 'stroke-dasharray': '2 3', opacity: 0.75 }, F.svg);
    dates(F); hover(hA, F, function (i) { var q = rows[i], rr = q.v50 > 0 ? q.v / q.v50 : null; return '<div>volume ' + fmtVol(q.v) + (rr != null ? ', ' + rr.toFixed(2) + ' times the 50D average' : '') + ' (' + (q.up ? 'an up day' : 'a down day') + ')</div>' + (MECHD[q.d] ? '<div>an index review or option expiry day</div>' : ''); });
    /* pane B: average volume per day, up days against down days (the house convention: the last N rows, every day included) */
    var VV = V.filter(function (q) { return q && q.v != null; }), UD = {};
    for (var k = 0; k < VV.length; k++) { if (VV[k].d <= from) continue; var o = {}; [20, 50].forEach(function (N) { var su = 0, nu = 0, sd = 0, nd = 0; for (var j = Math.max(1, k - N + 2); j <= k; j++) { if (VV[j].up) { su += VV[j].v; nu++; } else { sd += VV[j].v; nd++; } } o['u' + N] = nu ? su / nu : null; o['d' + N] = nd ? sd / nd : null; }); UD[VV[k].d] = o; }
    var ser = function (key) { return rows.map(function (q) { return UD[q.d] ? UD[q.d][key] : null; }); }, u20 = ser('u20'), d20 = ser('d20'), u50 = ser('u50'), d50 = ser('d50');
    var cB = cardH(hB, '<b>Average volume, up against down days</b>; solid 20, dashed 50 sessions', 34);
    F = frame(hB, 40); var bv = u20.concat(d20, u50, d50).filter(function (v) { return v != null; }), bLo = Math.min.apply(null, bv), bHi = Math.max.apply(null, bv), bp = (bHi - bLo) * 0.1 || bHi * 0.05; bLo = Math.max(0, bLo - bp); bHi += bp;
    var yB = function (v) { return F.top + F.ph - (v - bLo) / (bHi - bLo) * (F.ph - cB); };
    niceTicks(bLo, bHi, 3).forEach(function (v) { if (v < bLo) return; el('line', { x1: F.pad.l, x2: F.W - F.pad.r, y1: yB(v), y2: yB(v), stroke: C.grid }, F.svg); txt(F.svg, F.pad.l - 4, yB(v) + 3.5, fmtVol(v), { 'text-anchor': 'end', 'font-size': 9.5, fill: C.ink3 }); });
    for (var i2 = 0; i2 < n; i2++) { if (u20[i2] == null || d20[i2] == null) continue; el('rect', { x: F.edge(i2), y: Math.min(yB(u20[i2]), yB(d20[i2])), width: F.bw + 0.4, height: Math.max(0.5, Math.abs(yB(u20[i2]) - yB(d20[i2]))), fill: u20[i2] >= d20[i2] ? 'rgba(26,127,55,0.16)' : 'rgba(207,34,46,0.16)' }, F.svg); }
    var path = function (vals, col, w, dash) { var d = ''; vals.forEach(function (v, i) { if (v == null) return; d += (d ? 'L' : 'M') + F.xi(i).toFixed(1) + ',' + yB(v).toFixed(1); }); if (d) el('path', { d: d, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-dasharray': dash || '', 'stroke-linejoin': 'round' }, F.svg); };
    path(u50, GREEN, 1.4, '6 3'); path(d50, C.red, 1.4, '6 3'); path(u20, GREEN, 2); path(d20, C.red, 2);
    endLab(F, [[u20, GREEN], [d20, C.red]].map(function (a) { return { y: yB(a[0][n - 1]) + 3.5, t: fmtVol(a[0][n - 1]), c: a[1] }; }));
    dates(F); hover(hB, F, function (i) { return '<div>last 20 sessions: up days ' + fmtVol(u20[i]) + ', down days ' + fmtVol(d20[i]) + '</div><div>last 50 sessions: up days ' + fmtVol(u50[i]) + ', down days ' + fmtVol(d50[i]) + '</div>'; });
    /* pane C: distribution days */
    var cC = cardH(hC, '<b>Distribution days, last 25 sessions</b>; warning at 6', 34);
    F = frame(hC, 30); var dmax = Math.max(8, Math.max.apply(null, rows.map(function (q) { return q.dist25 || 0; }))), yC = function (v) { return F.top + F.ph - v / dmax * (F.ph - cC); };
    [0, 3, 6].forEach(function (v) { el('line', { x1: F.pad.l, x2: F.W - F.pad.r, y1: yC(v), y2: yC(v), stroke: v === 6 ? C.red : C.grid, 'stroke-dasharray': v === 6 ? '5 3' : '', opacity: v === 6 ? 0.7 : 1 }, F.svg); txt(F.svg, F.pad.l - 4, yC(v) + 3.5, String(v), { 'text-anchor': 'end', 'font-size': 9.5, fill: v === 6 ? C.red : C.ink3, 'font-weight': v === 6 ? 700 : 400 }); });
    var dd = ''; rows.forEach(function (q, i) { if (q.dist25 == null) return; dd += (dd ? 'L' : 'M') + F.edge(i).toFixed(1) + ',' + yC(q.dist25).toFixed(1) + 'L' + F.edge(i + 1).toFixed(1) + ',' + yC(q.dist25).toFixed(1); });
    if (dd) { el('path', { d: dd + 'L' + (F.W - F.pad.r) + ',' + (F.top + F.ph) + 'L' + F.pad.l + ',' + (F.top + F.ph) + 'Z', fill: 'rgba(207,34,46,0.10)' }, F.svg); el('path', { d: dd, fill: 'none', stroke: C.red, 'stroke-width': 1.7 }, F.svg); }
    endLab(F, [{ y: yC(q0.dist25) + 3.5, t: String(q0.dist25), c: C.red }]);
    dates(F); hover(hC, F, function (i) { return '<div>distribution days in 25 sessions: ' + rows[i].dist25 + '</div>'; });
    /* pane D: relative price against its 52W high */
    var dD = ov(hD, '<b>Relative price against its 52W high</b>; sell line (25%)', 34, 'bottom'), cD = dD.offsetHeight + 6;
    F = frame(hD, 36); var rd = rows.map(function (q) { var x_ = DL[q.d]; return x_ && x_.rdh != null ? x_.rdh * 100 : null; }), rdv = rd.filter(function (v) { return v != null; });
    var dLo = Math.min(-35, Math.floor((Math.min.apply(null, rdv.concat([0])) - 3) / 5) * 5), yD = function (v) { return F.top + F.ph - cD - (v - dLo) / (0 - dLo) * (F.ph - cD); };
    for (var t = 0; t >= dLo; t -= 10) { el('line', { x1: F.pad.l, x2: F.W - F.pad.r, y1: yD(t), y2: yD(t), stroke: C.grid }, F.svg); txt(F.svg, F.pad.l - 4, yD(t) + 3.5, t ? '(' + (-t) + '%)' : '0%', { 'text-anchor': 'end', 'font-size': 9.5, fill: C.ink3 }); }
    el('rect', { x: F.pad.l, y: yD(-25), width: F.W - F.pad.l - F.pad.r, height: yD(dLo) - yD(-25), fill: 'rgba(207,34,46,0.06)' }, F.svg);
    el('line', { x1: F.pad.l, x2: F.W - F.pad.r, y1: yD(-25), y2: yD(-25), stroke: C.red, 'stroke-dasharray': '3 2', 'stroke-width': 1.3 }, F.svg);
    txt(F.svg, F.pad.l - 4, yD(-25) + 3.5, '(25%)', { 'text-anchor': 'end', 'font-size': 9.5, fill: C.red, 'font-weight': 700 });
    var dr = ''; rd.forEach(function (v, i) { if (v == null) return; dr += (dr ? 'L' : 'M') + F.xi(i).toFixed(1) + ',' + yD(v).toFixed(1); }); if (dr) el('path', { d: dr, fill: 'none', stroke: C.rel, 'stroke-width': 1.8 }, F.svg);
    var lr = rd[n - 1]; if (lr != null) endLab(F, [{ y: yD(lr) + 3.5, t: '(' + Math.round(-lr) + '%)', c: C.rel }]);
    dates(F); hover(hD, F, function (i) { return rd[i] != null ? '<div>relative price (' + Math.round(-rd[i]) + '%) below its 52W high</div>' : ''; });
  }

  /* ================= 4. SS estimate upgrades: EPS and revenue by named FY (item 4 today), PT with the analyst ratings behind it (item 5 today) ================= */
  function drawEst() {
    if (!m) return;
    save();
    buttons(document.getElementById('os-tg4'), [['L6M', 'L6M'], ['L3M', 'L3M'], ['L1M', 'L1M']], st.est, function (k) { st.est = k; drawEst(); });
    var host = document.getElementById('os-est3'); host.innerHTML = ''; host.className = 'q3 os-est-' + st.estL; var GRID = st.estL === 'grid';
    var days = WIN[st.est], d0 = addDays(m.asof, -days), d1 = addDays(m.asof, 3), band = st.est === 'L1M' ? 0.005 : 0.01, Yr = m.H.ss.years, labs = Yr.labels, names = Yr.names;
    var chgD = function (pts, dd) { if (!pts.length) return null; var L_ = pts[pts.length - 1], b = null; pts.forEach(function (q) { if (q.d <= addDays(L_.d, -dd)) b = q; }); return b && b.v ? L_.v / b.v - 1 : null; };
    var chg = function (pts) { return chgD(pts, days); };
    document.getElementById('os-p4say').textContent = names.map(function (n_, i) { return n_.replace('FY20', 'FY') + ' ' + ['solid', 'dashed', 'dotted'][i]; }).join(', ');
    var tr = m.tranches.map(function (t) { return { d: t.entry_date, color: C.entry }; });
    var L0 = 36;
    [['eps', 'EPS'], ['sales', 'Revenue (sales)']].forEach(function (kk) {
      var ser = [], vals = [], rowsH = [], bgK = 'flat', n_ = Yr.n[kk[0]] || {};
      labs.forEach(function (y, yi) { var pts = ((X.years[kk[0]] || {})[y] || []).filter(function (q) { return q.v != null && (q.src !== 'daily' || weekday(q.d)); }); if (!pts.length) return;
        pts.filter(function (q) { return q.d >= addDays(d0, -40); }).forEach(function (q) { vals.push(q.v); });
        var c = chg(pts), k_ = trKind(c, band); if (yi === 1) bgK = k_;
        ser.push({ pts: pts, holes: true, se: fmtN, color: TRC[k_], w: FYW[yi], dash: FYDASH[yi], label: names[yi] + ' consensus', fmt: fmtN, dotAt: function (q) { return q.d === pts[pts.length - 1].d; }, dotR: 2.8 });
        rowsH.unshift(tbRow(sw(yi, TRC[k_]), names[yi].replace('FY20', 'FY') + ' ' + fmtN(pts[pts.length - 1].v), [[chgD(pts, 30), 0.005], [chgD(pts, 91), 0.01], [chgD(pts, 182), 0.005]])); });
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pd = (hi - lo) * 0.1 || Math.abs(hi) * 0.02 || 1;
      var nTxt = labs.map(function (y) { var q = n_[y]; return q && q.n != null ? q.n : null; }).filter(function (v) { return v != null; });
      var h = subCell(host), hp = cardH(h, '<div class="t1"><b>' + kk[1] + ' consensus</b>, ' + Yr.currency + (nTxt.length ? ' <span class="hh">&middot; ' + Math.max.apply(null, nTxt) + ' analysts</span>' : '') + '</div>', L0, true);
      mini(h, { d0: d0, d1: d1, L: L0, R: 34, T: 4, headPx: hp, rightTicks: true, yDomain: [lo - pd, hi + pd], yTicks: niceTicks(lo - pd, hi + pd, 8), series: ser, bg: TRBG[bgK], markers: tr });
    });
    /* PT, with the analyst ratings (% of analysts: Buys, Other, Sells) as the coloured stacked area behind it, on its own 0-100% scale */
    var S2 = m.H.ss2, sc = S2.tp_scale || 1, tp = m.H.ss.metrics.tp, seen = {};
    var tpp = (tp.monthly || []).concat(tp.daily || []).filter(function (q) { return q.v != null; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; }).filter(function (q) { if (seen[q.d]) return false; seen[q.d] = 1; return true; }).map(function (q) { return { d: q.d, v: q.v * sc }; });
    var px = (chartRows && chartRows.length ? chartRows.map(function (r) { return { d: r.d || r.date, v: r.c != null ? r.c : r.close }; }) : m.daily.map(function (q) { return { d: q.d, v: q.c }; })).filter(function (q) { return q.v != null && q.d <= m.asof; });
    var rp = X.ratings.filter(function (q) { return q.src !== 'daily' || weekday(q.d); }).map(function (q) { var n = q.buys + q.other + q.sells; if (!n) return null; var b = Math.round(q.buys / n * 100), s = Math.round(q.sells / n * 100); return { d: q.d, src: q.src, b: b, s: s, o: 100 - b - s, n: n }; }).filter(Boolean);
    var vv = tpp.concat(px).filter(function (q) { return q.d >= addDays(d0, -40); }).map(function (q) { return q.v; }), lo3 = Math.min.apply(null, vv), hi3 = Math.max.apply(null, vv), p3 = (hi3 - lo3) * 0.08 || 1;
    var pk = trKind(chg(tpp), band), bNow = rp[rp.length - 1];
    var ptsDiff = function (dd) { var b = null; rp.forEach(function (q) { if (q.d <= addDays(bNow.d, -dd)) b = q; }); return b ? bNow.b - b.b : null; };
    var fPts = function (v) { return v > 0 ? '+' + v + ' pts' : v < 0 ? '(' + (-v) + ' pts)' : '0 pts'; };
    var RAT = { kind: 'stacked', axis: 'right', gap: 45, holes: true, pts: rp, label: 'analyst ratings', unit: '%',
      layers: [{ k: 'b', label: 'Buys', color: 'rgba(26,127,55,0.26)', ink: '#1a7f37', tip: '#7ee2a8' }, { k: 'o', label: 'Other', color: 'rgba(139,148,158,0.20)', ink: '#57606a', tip: '#d0d7de' }, { k: 's', label: 'Sells', color: 'rgba(207,34,46,0.26)', ink: '#cf222e', tip: '#ffaba8' }] };
    var ratLine = '<span style="color:#1a7f37">Buys ' + bNow.b + '%</span> &middot; <span style="color:#57606a">' + (GRID ? 'Holds ' : 'Other ') + bNow.o + '%</span> &middot; <span style="color:#cf222e">Sells ' + bNow.s + '%</span>';
    var hP = subCell(host), hpP = cardH(hP, '<div class="t1"><b>Average PT against SP</b>' + (GRID ? '' : ' <span class="hh">&middot; analyst ratings behind:</span> ' + ratLine) + '</div>', L0, true);
    var ptSeries = [{ pts: px, se: function (v) { return 'SP ' + fmtN(v); }, color: '#57606a', w: 1.1, label: 'SP', fmt: fmtN }, { pts: tpp, se: function (v) { return 'PT ' + fmtN(v); }, color: TRC[pk], w: 2.6, label: 'average PT', fmt: fmtN, dotAt: function (q) { return q.d === tpp[tpp.length - 1].d; }, dotR: 3 }];
    mini(hP, { d0: d0, d1: d1, L: L0, R: 34, T: 4, headPx: hpP, rightTicks: true, yDomain: [lo3 - p3, hi3 + p3], yTicks: niceTicks(lo3 - p3, hi3 + p3, 8), yDomain2: [0, 100], markers: tr, series: GRID ? ptSeries : [RAT].concat(ptSeries) });
    if (GRID) {
      /* layout 2 (Richard, 6-Nov 15:13: "4 sub-panels, 2x2, with Buys/Holds/Sells added as a new panel"): the analyst ratings in their own panel, the
         same stacked area as item 5 on the full page (Buys = Buy + Overweight, Holds = Hold, Sells = Sell + Underweight, % of analysts) */
      var RAT2 = { kind: 'stacked', gap: 45, holes: true, pts: rp, label: 'analyst ratings', unit: '%', endLabels: true, endFmt: function (v) { return v + '%'; },
        layers: [{ k: 'b', label: 'Buys', color: 'rgba(26,127,55,0.42)', ink: '#1a7f37', tip: '#7ee2a8' }, { k: 'o', label: 'Holds', color: 'rgba(139,148,158,0.30)', ink: '#57606a', tip: '#d0d7de' }, { k: 's', label: 'Sells', color: 'rgba(207,34,46,0.42)', ink: '#cf222e', tip: '#ffaba8' }] };
      var hR = subCell(host), hpR = cardH(hR, '<div class="t1"><b>Analyst ratings: Buys, Holds and Sells</b> <span class="hh">&middot; % of analysts (' + bNow.n + ' now)</span></div>', L0, true);
      mini(hR, { d0: d0, d1: d1, L: L0, R: 66, T: 4, headPx: hpR, yDomain: [0, 100], yTicks: [0, 25, 50, 75, 100], yFmt: function (v) { return v + '%'; }, markers: tr, series: [RAT2] });
    }
  }

  /* ================= 5. SS upgrade breadth: the live Net Upgrade Breadth charts (item 6 today), daily where the daily store has the counts ================= */
  function drawNub() {
    save();
    buttons(document.getElementById('os-tg5'), [['L1M', 'L1M'], ['L3M', 'L3M']], st.nub, function (k) { st.nub = k; drawNub(); });
    var host = document.getElementById('os-nub4'); host.innerHTML = '';
    var d0 = addDays(m.asof, -WIN[st.nub]), d1 = addDays(m.asof, 3), NC = X.nubc;
    document.getElementById('os-p5say').textContent = 'FY' + (m.H.ss2.fy || '') + ', 100-day counts';
    var GR = { k: 'up', label: 'raising', color: 'rgba(26,127,55,0.38)', ink: '#116329', num: '#0f6b2c', tip: '#7ee2a8' }, NCH = { k: 'nc', label: 'no change', color: 'rgba(139,148,158,0.28)', ink: '#424a53', num: '#57606a', tip: '#d0d7de' }, RD = { k: 'dn', label: 'cutting', color: 'rgba(207,34,46,0.38)', ink: '#a40e26', num: '#c4101f', tip: '#ffaba8' };
    [['eps', 'EPS'], ['sales', 'Revenue (sales)'], ['tp', 'PT'], ['buys', 'Buys, Other and Sells']].forEach(function (kk) {
      var k = kk[0], buys = k === 'buys';
      var pts = (NC[k] || []).filter(function (q) { return (q.src !== 'daily' || weekday(q.d)) && (buys ? q.buys + q.other + q.sells > 0 : q.n > 0); }).map(function (q) { if (buys) { var n = q.buys + q.other + q.sells; return { d: q.d, src: q.src, up: q.buys, nc: q.other, dn: q.sells, n: n, v: q.buys / n }; } return { d: q.d, src: q.src, up: q.up, dn: q.dn, nc: Math.max(0, q.n - q.up - q.dn), n: q.n, v: (q.up - q.dn) / q.n }; });
      var last = pts[pts.length - 1];
      var lat = buys ? last.up + ' of ' + last.n + ' Buys (' + Math.round(last.v * 100) + '%), ' + last.dn + ' Sells' : last.up + ' raising, ' + last.dn + ' cutting, ' + last.nc + ' no change: <b>' + pctS(last.v) + '</b>';
      var mx = Math.max.apply(null, pts.filter(function (q) { return q.d >= addDays(d0, -40); }).map(function (q) { return q.n; }).concat([1]));
      var lf = function (v) { return buys ? Math.round(v * 100) + '%' : pctS(v); };
      var h = subCell(host), L0 = 22, hp = cardH(h, '<b>' + kk[1] + '</b>', L0);
      mini(h, { d0: d0, d1: d1, L: L0, R: 40, T: 4, headPx: hp, yDomain: [0, mx * 1.08], yTicks: niceTicks(0, mx, 5).filter(function (v) { return v === Math.round(v); }), yFmt: String,
        yDomain2: buys ? [0, 1.12] : [-1.08, 1.2], yTicks2: buys ? [0, 0.25, 0.5, 0.75, 1] : [-1, -0.5, 0, 0.5, 1], yFmt2: lf, markers: m.tranches.map(function (t) { return { d: t.entry_date, color: C.entry }; }),
        series: [{ kind: 'stacked', gap: 45, holes: true, numbers: true, numGap: 22, pts: pts, label: buys ? 'ratings' : 'analysts', layers: buys ? [{ k: 'up', label: 'Buys', color: GR.color, ink: GR.ink, num: GR.num, tip: GR.tip }, { k: 'nc', label: 'Other', color: NCH.color, ink: NCH.ink, num: NCH.num, tip: NCH.tip }, { k: 'dn', label: 'Sells', color: RD.color, ink: RD.ink, num: RD.num, tip: RD.tip }] : [GR, NCH, RD] },
          { kind: 'hline', axis: 'right', v: 0, color: '#000', w: 1.3 },
          { pts: pts.map(function (q) { return { d: q.d, v: q.v, src: q.src }; }), axis: 'right', color: '#0a3d91', w: 1.8, gap: 45, holes: true, label: buys ? '% Buys' : 'Net Upgrade Breadth', fmt: lf, dotAt: function () { return true; }, dotR: 1.8, ptLabel: function (q) { return lf(q.v); }, labGap: 40 }] });
    });
  }

  /* ================= 6. Peers: the live chart and table, smaller ================= */
  function drawPeers() {
    save();
    /* chart or table, one at a time (Richard, 6-Nov 14:02: "add a toggle between CHART and TABLE and only display either/or in the panel") */
    /* Peers or Valuation in this panel (Richard, 6-Nov 15:42: "Add a toggle for the bottom right frame that toggles between "6. Peers: cohort and
       sector" as you have it now and "valuation" charts, and in the valuation charts panel, have a toggle between P/E and EV/Sales") */
    var p6 = st.p6 === 'val' ? 'val' : 'peers', pv = st.pv || 'chart', show = function (id, on) { document.getElementById(id).style.display = on ? '' : 'none'; };
    buttons(document.getElementById('os-p6v'), [['peers', 'Peers'], ['val', 'Valuation']], p6, function (k) { st.p6 = k; drawPeers(); });
    show('os-peerv', p6 === 'peers'); show('os-valf', p6 === 'val'); show('os-vallink', false);   /* the Master Dashboard link removed (Richard, 7-Nov-2026: "Remove bits in red") */
    if (p6 === 'val') { show('os-peerx', false); show('os-peery', false); drawVal(); return; }
    document.getElementById('os-p6t').textContent = '6. Peers: cohort and sector';
    buttons(document.getElementById('os-peerv'), [['chart', 'Chart'], ['table', 'Table']], pv, function (k) { st.pv = k; drawPeers(); });
    document.getElementById('os-pw').className = 'pw ' + pv;
    document.getElementById('os-peerx').style.display = document.getElementById('os-peery').style.display = pv === 'chart' ? '' : 'none';
    if (pv === 'table') { var tb = document.getElementById('os-pc-tbl'); tb.innerHTML = DASH.peersTable(m); fitTable(tb); return; }
    buttons(document.getElementById('os-peerx'), [['m1', '1M'], ['m3', '3M'], ['m6', '6M']], st.px, function (k) { st.px = k; drawPeers(); });
    buttons(document.getElementById('os-peery'), [['eps3', 'EPS'], ['sales3', 'revenue']], st.py, function (k) { st.py = k; drawPeers(); });
    var host = document.getElementById('os-pc-plot'), sz = sizeOf(host);
    peersMini(host, { x: st.px, y: st.py }, sz.w, sz.h);
  }


  /* the valuation charts: the Master Dashboard's own valuation page, embedded as the full page's items 7 and 8 embed it (Richard, 27-Oct: "The
     valuation charts should be the one from the master dashboard"), 10 years, tranche purchases marked; fitted to the panel */
  var valSrc = null, valTitle = '';
  function hasF(V, f) { return !!(V && (V[f] || []).some(function (v) { return v != null; })); }
  function drawVal() {
    /* r9b (7-Nov-2026, main login): a stock with only one multiple shows the one it has, its title says which is missing, and the other
       button is greyed out with a tooltip; the remembered choice is kept for the next stock (UI QC 6-Nov-2026: Volex has no EV/Sales history,
       and the remembered EV/Sales gave a dead-end message) */
    var V = m.H.valuation, NM = { pe: '24M fwd P/E', evs: '24M fwd EV/Sales' }, SH = { pe: 'P/E', evs: 'EV/Sales' };
    var want = st.vf === 'evs' ? 'evs' : 'pe', alt = want === 'pe' ? 'evs' : 'pe', f = (hasF(V, want) || !hasF(V, alt)) ? want : alt, nm = NM[f];
    var gone = f === 'pe' ? 'evs' : 'pe', missing = hasF(V, f) && !hasF(V, gone) ? gone : null;
    buttons(document.getElementById('os-valf'), [['pe', 'P/E'], ['evs', 'EV/Sales']], f, function (k) { st.vf = k; save(); drawVal(); });
    if (missing) { var mb = document.querySelector('#os-valf button[data-k="' + missing + '"]'); if (mb) { mb.disabled = true; mb.title = 'No ' + NM[missing] + ' history is stored for ' + m.name; } }
    valTitle = '6. Valuation: ' + nm + (f !== want ? ' only' : '') + ', 10 years';   /* "only": the other multiple has no history (its button says so) */
    valTitleSet('');
    document.getElementById('os-pw').className = 'pw val';
    var host = document.getElementById('os-val');
    if (!hasF(V, f)) { valSrc = null; var cur = V && V.current ? V.current[f] : null; host.innerHTML = '<div class="nohist" style="margin:12px">No ' + nm + ' history is stored for ' + DU.esc(m.name) + ', so the Master Dashboard has no chart.' + (cur != null ? ' Today\'s ' + nm + ' is <b>' + cur.toFixed(2) + 'x</b>.' : '') + '</div>'; return; }
    var trd = m.tranches.slice().sort(function (p, q) { return p.tranche_number - q.tranche_number; }).map(function (tr) { return tr.entry_date; }).join(',');
    var MB = window.PMS_MASTER_BASE || 'https://vfhqi.github.io/master/';
    var url = MB + 'valuation.html?t=' + encodeURIComponent(m.t) + '&embed=1&pms=1&win=10&field=' + f + (trd ? '&tr=' + trd : '');
    var fr = host.querySelector('iframe');
    if (!fr || valSrc !== url) { host.innerHTML = ''; fr = document.createElement('iframe'); fr.title = nm + ', the Master Dashboard valuation chart'; fr.className = 'osval'; fr.src = url; valSrc = url; host.appendChild(fr);
      fr.addEventListener('load', function () { fr._loaded = true; [50, 400, 1200, 2500, 5000].forEach(function (t) { setTimeout(function () { fitVal(true); }, t); }); });
      /* r9b live QC (7-Nov-2026): on Richard's connection the Master page took 32 s to load fully, and until its load event the panel showed the
         whole page uncropped; so the crop is applied as soon as the page's chart box exists, and the load event then redraws it at full size */
      var tries = 0, iv = setInterval(function () { tries++; var d = null; try { d = fr.contentDocument; } catch (e) { /* another origin */ }
        if ((d && d.getElementById('chartbox') && fitVal()) || fr._loaded || tries > 600 || !fr.isConnected) clearInterval(iv); }, 100); }
    fitVal();
  }
  /* r9b (7-Nov-2026, Richard: "Remove bits in red", "Expand chart to fill space at bottom", "Change Size of text etc. so it is readable"):
     the Master Dashboard's own valuation chart (one source of truth, never redrawn here) is shown alone, at full size, filling the panel.
     The embedded page is the panel's exact size and is never shrunk; a style put into it hides everything but the chart (its header,
     control rows, legend, notes and source line) and gives the chart the panel's height; the page then redraws itself at that size, so its
     text is at the Master Dashboard's own size. Its current multiple is carried into the panel title. (r8 shrank the whole page to about
     0.44, text about 5px.) */
  /* the title carries the chart's current multiple when the title line has room; never pushes the buttons off the panel (UI QC 7-Nov-2026) */
  function valTitleSet(cv) { var e = document.getElementById('os-p6t'), ph = e.parentNode; e.textContent = valTitle + (cv ? ', now ' + cv : ''); if (cv && ph.scrollWidth > ph.clientWidth + 1) e.textContent = valTitle; }
  function fitVal(redraw) {
    var host = document.getElementById('os-val'), fr = host && host.querySelector('iframe'); if (!fr) return false;
    var W = host.clientWidth, H = host.clientHeight; if (!W || !H) return false;
    fr.style.transform = 'none'; fr.style.width = W + 'px'; fr.style.height = H + 'px';
    try {
      var d = fr.contentDocument; if (!d || !d.head || !d.getElementById('chartbox')) return false;
      var css = d.getElementById('os-crop'), fresh = !css; if (!css) { css = d.createElement('style'); css.id = 'os-crop'; d.head.appendChild(css); }
      var t = 'html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}' +
        '.wrap{margin:0!important;padding:0!important;max-width:none!important}' +
        'header,#controls,#legend,#note,#foot{display:none!important}' +
        '.card{margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:none!important}' +
        '#chartbox canvas{height:' + H + 'px!important}';
      if (css.textContent !== t) { css.textContent = t; fresh = true; }
      if (fresh || redraw !== false) fr.contentWindow.dispatchEvent(new Event('resize'));   /* the page redraws itself on resize (valuation.html: "if (REC) draw()") */
      var c = d.getElementById('cur'), cv = c && c.firstChild && c.firstChild.nodeType === 3 ? c.firstChild.textContent.trim() : '';
      valTitleSet(cv && cv !== '–' ? cv : '');
      return true;
    } catch (e) { /* another origin (a local test): the page is shown at the panel's size as it comes */ return false; }
  }

  /* item 6's chart: the live peers picture (dashboard.js peersPicture, its full form), smaller: the same quarters, dots, rings, numbered axes and names; titles shortened to fit */
  function peersMini(host, ax, W, Hh) {
    var P = m.H.peers, self = P.self, xk = ax.x, yk = ax.y, intS = function (v) { return v > 0 ? '+' + v : v < 0 ? '(' + (-v) + ')' : '0'; }, pctI = function (v) { return v > 0 ? '+' + v + '%' : v < 0 ? '(' + (-v) + '%)' : '0%'; };
    var rows = [{ r: self, g: 'self' }].concat(P.cohort.map(function (r) { return { r: r, g: 'coh' }; }), P.sector.map(function (r) { return { r: r, g: 'sec' }; }));
    var seen = {}; rows = rows.filter(function (q) { if (seen[q.r.t]) return false; seen[q.r.t] = 1; return true; });
    var pts = rows.map(function (q) { var a = q.r.rs.now, b = q.r.rs[xk]; return { q: q, x: (a != null && b != null) ? a - b : null, y: q.r[yk] }; }).filter(function (p) { return p.x != null && p.y != null; });
    var L = 40, R = 8, T = 6, B = 34, xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var YC = 40, yin = ys.filter(function (v) { return Math.abs(v) <= YC; }), xlo = Math.min.apply(null, [-30].concat(xs)) - 6, xhi = Math.max.apply(null, [30].concat(xs)) + 6, ylo = Math.max(-YC, Math.min.apply(null, [-10].concat(yin)) - 2), yhi = Math.min(YC, Math.max.apply(null, [10].concat(yin)) + 2);
    pts.forEach(function (p) { p.off = p.y > yhi ? 'up' : p.y < ylo ? 'down' : null; p.yc = Math.max(ylo, Math.min(yhi, p.y)); });
    var sx = function (v) { return L + (v - xlo) / (xhi - xlo) * (W - L - R); }, sy = function (v) { return T + (1 - (v - ylo) / (yhi - ylo)) * (Hh - T - B); };
    host.innerHTML = '';
    var svg = el('svg', { width: W, height: Hh, viewBox: '0 0 ' + W + ' ' + Hh, style: 'display:block;position:absolute;left:0;top:0;font-family:Segoe UI,system-ui,sans-serif' }, host);
    var x0c = Math.max(L, Math.min(W - R, sx(0))), y0c = Math.max(T, Math.min(Hh - B, sy(0)));
    el('rect', { x: x0c, y: T, width: W - R - x0c, height: y0c - T, fill: 'rgba(26,127,55,0.07)' }, svg);
    el('rect', { x: L, y: y0c, width: x0c - L, height: Hh - B - y0c, fill: 'rgba(207,34,46,0.07)' }, svg);
    el('rect', { x: L, y: T, width: x0c - L, height: y0c - T, fill: 'rgba(154,103,0,0.05)' }, svg);
    el('rect', { x: x0c, y: y0c, width: W - R - x0c, height: Hh - B - y0c, fill: 'rgba(154,103,0,0.05)' }, svg);
    var xl = { m1: '1M', m3: '3M', m6: '6M' }[xk], fyp = ((m.H.ss2 || {}).fy ? ', FY' + m.H.ss2.fy : '');
    niceTicks(xlo, xhi, 5).forEach(function (v) { if (v === 0) return; el('line', { x1: sx(v), x2: sx(v), y1: T, y2: Hh - B, stroke: 'rgba(0,0,0,0.05)' }, svg); txt(svg, sx(v), Hh - B + 12, intS(v), { 'text-anchor': 'middle', 'font-size': 9.5, fill: C.ink2 }); });
    niceTicks(ylo, yhi, 5).forEach(function (v) { if (v === 0) return; el('line', { x1: L, x2: W - R, y1: sy(v), y2: sy(v), stroke: 'rgba(0,0,0,0.05)' }, svg); txt(svg, L - 4, sy(v) + 3.5, pctI(v), { 'text-anchor': 'end', 'font-size': 9.5, fill: C.ink2 }); });
    txt(svg, sx(0), Hh - B + 12, '0', { 'text-anchor': 'middle', 'font-size': 9.5, fill: C.ink2, 'font-weight': 600 }); txt(svg, L - 4, sy(0) + 3.5, '0%', { 'text-anchor': 'end', 'font-size': 9.5, fill: C.ink2, 'font-weight': 600 });
    txt(svg, L + (W - L - R) / 2, Hh - 6, 'Change in Stock RS over ' + xl + ' (points) → stronger', { 'text-anchor': 'middle', 'font-size': 10, fill: C.ink, 'font-weight': 600 });
    var yt = txt(svg, 0, 0, (yk === 'eps3' ? 'EPS' : 'Revenue') + ' revision, 3M' + fyp + ' (%) → upgrades', { 'text-anchor': 'middle', 'font-size': 10, fill: C.ink, 'font-weight': 600 }); yt.setAttribute('transform', 'translate(9,' + (T + (Hh - T - B) / 2) + ') rotate(-90)');
    var q4 = function (x_, y_, a, b, c, anc) { txt(svg, x_, y_, a, { 'text-anchor': anc, 'font-size': 9, fill: c, 'font-weight': 650, halo: true }); txt(svg, x_, y_ + 10, b, { 'text-anchor': anc, 'font-size': 9, fill: c, 'font-weight': 650, halo: true }); };
    q4(W - R - 4, T + 11, 'Strengthening,', 'with upgrades', C.industry, 'end'); q4(L + 4, Hh - B - 16, 'Weakening,', 'with downgrades', C.red, 'start');
    q4(L + 4, T + 11, 'Weakening,', 'with upgrades', C.amber, 'start'); q4(W - R - 4, Hh - B - 16, 'Strengthening,', 'with downgrades', C.amber, 'end');
    el('line', { x1: sx(0), x2: sx(0), y1: T, y2: Hh - B, stroke: C.ink3, 'stroke-dasharray': '4 3' }, svg); el('line', { x1: L, x2: W - R, y1: sy(0), y2: sy(0), stroke: C.ink3, 'stroke-dasharray': '4 3' }, svg);
    var rr = function (p) { return Math.max(3.5, Math.min(12, Math.sqrt((p.q.r.mc || 300) / 60) * 0.8)); };
    var quad = function (p) { return p.x > 0 && p.y > 0 ? C.industry : p.x < 0 && p.y < 0 ? C.red : (p.x === 0 && p.y === 0) ? C.ink3 : C.amber; };
    var ring = function (p) { return p.q.g === 'self' ? C.entry : (p.q.r.held && p.q.r.t !== m.t) ? C.stock : null; };
    pts.sort(function (a, b) { return (a.q.g === 'self') - (b.q.g === 'self'); });
    pts.forEach(function (p) { var rg_ = ring(p); var c = el('circle', { cx: sx(p.x), cy: sy(p.yc), r: rr(p), fill: quad(p), 'fill-opacity': p.q.g === 'self' ? 0.85 : p.q.g === 'coh' ? 0.6 : 0.3, stroke: rg_ || '#fff', 'stroke-width': rg_ ? (p.q.g === 'self' ? 2.6 : 2) : 1 }, svg);
      var ti = el('title', {}, c); ti.textContent = p.q.r.name + ' (' + (p.q.g === 'self' ? 'this holding' : p.q.g === 'coh' ? 'cohort peer' : 'sector peer') + '): Stock RS ' + p.q.r.rs.now + ', change over ' + xl + ' ' + intS(p.x) + '; revision ' + pctI(p.y);
      if (p.off) txt(svg, sx(p.x), sy(p.yc) + (p.off === 'up' ? rr(p) + 10 : -rr(p) - 3), (p.off === 'up' ? '▲ ' : '▼ ') + pctI(p.y), { 'text-anchor': 'middle', 'font-size': 9, fill: C.ink2 }); });
    var labs = pts.map(function (p) { return { p: p, lx: sx(p.x) + rr(p) + 2, ly: sy(p.yc) + 3.5 }; }).sort(function (a, b) { return a.ly - b.ly; });
    labs.forEach(function (o) { o.w = String(o.p.q.r.name).length * 5.4; o.right = o.lx + o.w > W - R - 4; o.x0 = o.right ? o.lx - 2 * rr(o.p) - 5 - o.w : o.lx; });
    /* names kept apart by their real widths (UI QC 6-Nov-2026: "Coca-Cola Europacific Partners" ran into "Campari"): a name that would touch one
       already placed moves down a line, then up, until clear */
    for (var i = 1; i < labs.length; i++) { var tries = 0, clash = function () { return labs.slice(0, i).some(function (o) { return labs[i].x0 < o.x0 + o.w + 4 && labs[i].x0 + labs[i].w + 4 > o.x0 && Math.abs(labs[i].ly - o.ly) < 11; }); };
      var y0 = labs[i].ly; while (clash() && tries < 8) { tries++; labs[i].ly = y0 + (tries % 2 ? 1 : -1) * Math.ceil(tries / 2) * 11; } }
    labs.forEach(function (o) { txt(svg, o.x0, o.ly, o.p.q.r.name, { 'font-size': 9.5, fill: o.p.q.g === 'self' ? C.entry : C.ink, 'font-weight': o.p.q.g === 'self' ? 700 : 400, halo: true }); });
  }
  var KEY6 = '<span style="color:#1a7f37">&#9679;</span><span style="color:#9a6700">&#9679;</span><span style="color:#cf222e">&#9679;</span> dot colour: its quarter &middot; darker: cohort peer, paler: sector peer &middot; size: market value &middot; <span style="color:#8250df">&#9711;</span> this holding, <span style="color:#0969da">&#9711;</span> another holding of ours';
  /* the peers table sized to its panel, so it never needs a scroll bar (Richard, 6-Nov 14:14): the font and row padding step down until it fits */
  function fitTable(tb) { var t = tb.querySelector('table'); if (!t) return; var steps = [[12, 5], [11.5, 4], [11, 3.5], [10.5, 3], [10, 2.5], [9.5, 2], [9, 1.5], [8.5, 1], [8, 0.5]];
    for (var i = 0; i < steps.length; i++) { t.style.setProperty('font-size', steps[i][0] + 'px', 'important'); Array.prototype.forEach.call(t.querySelectorAll('th'), function (c) { c.style.setProperty('font-size', (steps[i][0] - 1.5) + 'px', 'important'); c.style.setProperty('padding-top', '2px', 'important'); c.style.setProperty('padding-bottom', '3px', 'important'); }); Array.prototype.forEach.call(t.querySelectorAll('td'), function (c) { c.style.setProperty('padding-top', steps[i][1] + 'px', 'important'); c.style.setProperty('padding-bottom', steps[i][1] + 'px', 'important'); });
      if (tb.scrollHeight <= tb.clientHeight + 1) break; }
    /* r9b (7-Nov-2026): still too tall at the smallest step (a short window, e.g. 1366x657): the line under the table goes before any scroll bar appears */
    var pk = tb.querySelector('.pkey'); if (pk) pk.style.display = tb.scrollHeight > tb.clientHeight + 1 ? 'none' : ''; }

})();