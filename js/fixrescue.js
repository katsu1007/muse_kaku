/* 器具の救済：壁も器具も同じレイヤーに描く図面では、読み取りエンジン（old/index.html）が
 * 「壁のレイヤー」と見たレイヤーを丸ごと外すため、そのレイヤーの器具が全部消えてしまう。
 * ここはエンジンに手を入れず、読み込みの時にエンジンと同じ図形データ（KE の ents）を
 * もう一度だけ見て、壁レイヤーのうち扉の円弧もある物（＝器具も一緒に描いてある物）だけを
 * 救い、壁の線を除いて器具を探し直す独立した部品。探し方の本体は、KAKU NEXT で実測済みの
 * 救済（v1.30.0、js/fixtures.js の KF_build）を、こちらのデータ形式に合わせて写した物。
 * 見つけた器具には src:'rescue' と ly（レイヤー名）を付け、エンジンの器具とは分けて覚える。
 * エンジンが既に拾っている物と重なる候補は出さない（エンジン優先・二重に数えない）。 */

/* ---- 座標の向き：エンジン内部の向き（KF_P の世界）と、案件の図面の向きの変換。
 * old/index.html の KF_L / KF_G / KF_gbox / KF_gback と同じ回転（rot は KAKU_fix.rot） ---- */
const rotL = (p, r) => { if (!r) return p; const c = Math.cos(-r), s = Math.sin(-r); return [c * p[0] - s * p[1], s * p[0] + c * p[1]]; };
const rotG = (p, r) => { if (!r) return p; const c = Math.cos(r), s = Math.sin(r); return [c * p[0] - s * p[1], s * p[0] + c * p[1]]; };
const gbox = (b, r) => { if (!r) return b.slice(); const c = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]].map(p => rotG(p, r)); return [Math.min(...c.map(p => p[0])), Math.min(...c.map(p => p[1])), Math.max(...c.map(p => p[0])), Math.max(...c.map(p => p[1]))]; };
const SIDES_V = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] };
const gback = (sd, r) => { if (!sd || !r) return sd || ''; const v = rotG(SIDES_V[sd], r); return Math.abs(v[0]) > Math.abs(v[1]) ? (v[0] > 0 ? 'E' : 'W') : (v[1] > 0 ? 'N' : 'S'); };

const pip = (x, y, poly) => { let inn = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const xa = poly[a][0], ya = poly[a][1], xb = poly[b][0], yb = poly[b][1];
    if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) inn = !inn; }
  return inn; };

/* エンジン（KF）と同じレイヤーの外し方・救済の条件 */
const KF_SKIP = /寸法|DIM|通り?芯|GRID|基準|文字|TEXT|ANNO|注記|ハッチ|HATCH|図枠|FRAME|^E-|電気|電灯|動力|コンセント|ELEC|DENKI|配線|WIRE|弱電|照明/i;
const KF_SAN = /衛生|設備|器具|機器|厨房|FIXT|SAN|PLUMB|EQ|WC|便|洗面/i;
const FURN_RE = /家具|什器|備品|データ|デスク|FURN|DATA/i;   /* 家具・データ系の名前の層は救済しない */
const KF_OUT = { toilet: 1, counter: 1 };

/* 曲線を短い直線でつないで描いた所：10cm未満の、縦でも横でもない線の数 */
function KF_bent(pts) { let n = 0; for (let k = 1; k < pts.length; k++) { const dx = pts[k][0] - pts[k - 1][0], dy = pts[k][1] - pts[k - 1][1], L = Math.hypot(dx, dy); if (L > 0 && L < .1 && Math.abs(dx) > L * .05 && Math.abs(dy) > L * .05) n++; } return n; }

/* 救済の対象レイヤー：壁レイヤー（長い直線が長さの6割以上・6本以上）なのに、
 * 扉の円弧（半径45〜125cm・ほぼ90°）も同じレイヤーにある物。エンジンが丸ごと外した所だけ */
export function rescueLayers(ents) {
  const st = {};
  (ents || []).forEach(e => {
    if (!e || e.k === 'text' || e.k === 'insert' || e.k === 'solid') return;
    const s = st[e.ly || ''] || (st[e.ly || ''] = { t: 0, l: 0, n: 0, door: false });
    if (e.k === 'arc' && e.r >= .45 && e.r <= 1.25 && Math.abs(Math.abs(e.sweep || 0) - 90) < 25 && !KF_SKIP.test(e.ly || '')) s.door = true;
    if (e.k === 'circle') { s.t += 2 * Math.PI * (e.r || 0); return; }
    let pts = null, cv = 0;
    if (e.k === 'line') pts = [e.a, e.b];
    else if (e.k === 'poly') { pts = e.closed && e.pts.length > 2 ? [...e.pts, e.pts[0]] : e.pts; if (e.bul || KF_bent(e.pts) >= 4) cv = 1; }
    else if (e.k === 'arc') { pts = e.pts; cv = 1; }
    else if (e.k === 'circle') cv = 1;
    if (!pts) return;
    for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); s.t += d; if (d >= 1.2 && !cv) { s.l += d; s.n++; } }
  });
  return Object.keys(st).filter(ly => { const s = st[ly]; return s.n >= 6 && s.l / s.t >= .6 && s.door && !KF_SKIP.test(ly) && !FURN_RE.test(ly); });
}

/* ---- ここから下は KAKU NEXT の KF_build（救済込み）の写し。座標は m、向きはエンジン内部の向き ---- */
let curP = null;
function KF_P() { return curP; }
function KF_build(ents, P, roles) {
  roles = roles || {};
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  P.segs.forEach(s => { X0 = Math.min(X0, s[0], s[2]); X1 = Math.max(X1, s[0], s[2]); Y0 = Math.min(Y0, s[1], s[3]); Y1 = Math.max(Y1, s[1], s[3]); });
  X0 -= .3; Y0 -= .3; X1 += .3; Y1 += .3;
  const L = [];
  ents.forEach(e => { if (e.k === 'text' || e.k === 'insert' || e.k === 'solid') return; let pts, cv = 0, circ = 0;
    if (e.k === 'line') { pts = [e.a, e.b]; if (KF_bent(pts)) cv = 1; }
    else if (e.k === 'poly') { pts = e.pts.slice(); if (e.closed && pts.length > 2) pts.push(pts[0]); if (e.bul || KF_bent(pts) >= 4) cv = 1; }
    else if (e.k === 'arc') { pts = (e.pts || []).slice(); cv = 1; }
    else if (e.k === 'circle' && e.ell) { pts = e.ell.slice(); cv = 1; }
    else if (e.k === 'circle') { const c = e.c, r = e.r; if (!(r > 0)) return; const n = r < .05 ? 8 : 16; pts = Array.from({ length: n + 1 }, (_, k) => [c[0] + r * Math.cos(k * 2 * Math.PI / n), c[1] + r * Math.sin(k * 2 * Math.PI / n)]); cv = 1; circ = 1; }
    if (!pts || pts.length < 2) return; let b = [Infinity, Infinity, -Infinity, -Infinity]; pts.forEach(p => { b = [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])]; });
    if (b[0] < X0 || b[2] > X1 || b[1] < Y0 || b[3] > Y1) return;
    L.push({ ly: e.ly || '', dash: !!e.dash, pts, b, cv, circ, k: e.k, cl: e.k === 'poly' && !!e.closed, r: e.r, c: e.c, sw: e.sweep }); });
  /* 壁の層：線の長さの大半が1.2m以上の長い線の層 */
  const st = {}; L.forEach(o => { const s = st[o.ly] || (st[o.ly] = { t: 0, l: 0, n: 0 }); for (let k = 1; k < o.pts.length; k++) { const d = Math.hypot(o.pts[k][0] - o.pts[k - 1][0], o.pts[k][1] - o.pts[k - 1][1]); s.t += d; if (d >= 1.2 && !o.cv) { s.l += d; s.n++; } } });
  const wallLy = ly => { const s = st[ly]; return s && s.n >= 6 && s.l / s.t >= .6; };
  /* 扉の円弧（半径45〜125cm・ほぼ90°）はどの層でも拾う */
  const doors = []; L.forEach(o => { if (o.k === 'arc' && o.r >= .45 && o.r <= 1.25 && Math.abs(Math.abs(o.sw || 0) - 90) < 25 && !KF_SKIP.test(o.ly)) doors.push({ c: o.c, r: o.r, m: o.pts[Math.floor(o.pts.length / 2)], ly: o.ly }); });
  /* 扉の円弧がある層は「壁も器具も同じ層に描く図面」の層。壁層の判定で丸ごと外すと器具まで消えるので、
     そういう層は壁層扱いせず、下の壁線除去（wl・longMix）に任せる */
  const doorLy = new Set(doors.map(d => d.ly));
  const K = []; L.forEach(o => { const wl2 = wallLy(o.ly); if (KF_SKIP.test(o.ly) || (wl2 && !(doorLy.has(o.ly) && !FURN_RE.test(o.ly))) || /^(dev|wire|both)$/.test(roles[o.ly] || '') && !KF_SAN.test(o.ly)) return;
    o.resc = wl2 ? 1 : 0; K.push(o); });
  /* 壁と器具が同じ層に描いてある図面では、壁の二重線（0.9m以上の平行な2本が9〜25cm離れて並ぶ）を器具とつながないように外す */
  const mixLy = new Set(doors.map(d => d.ly));
  const ax = K.map(o => { if (o.k !== 'line' || !mixLy.has(o.ly)) return null; const [a, b] = o.pts, h = Math.abs(a[1] - b[1]) < .005, v = Math.abs(a[0] - b[0]) < .005; if (!h && !v) return null; const lo = Math.min(h ? a[0] : a[1], h ? b[0] : b[1]), hi = Math.max(h ? a[0] : a[1], h ? b[0] : b[1]); return hi - lo >= .9 ? { h, at: h ? a[1] : a[0], lo, hi } : null; });
  const wl = new Set(); const AX = ax.map((q, i) => q && { ...q, i }).filter(Boolean).sort((p, q) => p.at - q.at);
  AX.forEach((p, k) => { for (let j = k + 1; j < AX.length && AX[j].at - p.at <= .25; j++) { const q = AX[j]; if (q.h !== p.h || q.at - p.at < .09) continue; const ov = Math.min(p.hi, q.hi) - Math.max(p.lo, q.lo); if (ov >= .7 * Math.min(p.hi - p.lo, q.hi - q.lo)) { wl.add(p.i); wl.add(q.i); } } });
  /* 扉と同じ層では、0.9m以上のただの線も壁として外す（器具はポリラインや曲線、短い線で描かれている） */
  const longMix = o => o.k === 'line' && mixLy.has(o.ly) && Math.hypot(o.pts[1][0] - o.pts[0][0], o.pts[1][1] - o.pts[0][1]) >= .9;
  const C = K.filter((o, i) => !wl.has(i) && !longMix(o) && !(o.k === 'line' && Math.hypot(o.pts[1][0] - o.pts[0][0], o.pts[1][1] - o.pts[0][1]) > 3) && !(o.k === 'arc' && o.r >= .45));
  const fx = []; let n = 0;
  const group = (C, depth) => { const par = C.map((_, i) => i), f = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; }; const ord = C.map((_, i) => i).sort((a, b) => C[a].b[0] - C[b].b[0]), pad = .015;
    for (let a = 0; a < ord.length; a++) { const i = ord[a], A = C[i].b; for (let q = a + 1; q < ord.length; q++) { const j = ord[q], B = C[j].b; if (B[0] > A[2] + pad) break; if (C[i].ly !== C[j].ly || B[1] > A[3] + pad || A[1] > B[3] + pad) continue; par[f(i)] = f(j); } }
    const G = {}; C.forEach((o, i) => { (G[f(i)] = G[f(i)] || []).push(o); });
    const bbx = g => g.reduce((b, o) => [Math.min(b[0], o.b[0]), Math.min(b[1], o.b[1]), Math.max(b[2], o.b[2]), Math.max(b[3], o.b[3])], [Infinity, Infinity, -Infinity, -Infinity]);
    let GS = Object.values(G).map(g => ({ g, b: bbx(g) })); GS.sort((p, q) => (q.b[2] - q.b[0]) * (q.b[3] - q.b[1]) - (p.b[2] - p.b[0]) * (p.b[3] - p.b[1]));
    for (let i = GS.length - 1; i >= 0; i--) { const a = GS[i].b; const k = GS.findIndex((o, j) => j < i && o.g[0].ly === GS[i].g[0].ly && Math.max(o.b[2] - o.b[0], o.b[3] - o.b[1]) <= 3.6 && o.b[0] <= a[0] && o.b[1] <= a[1] && o.b[2] >= a[2] && o.b[3] >= a[3]); if (k >= 0) { GS[k].g.push(...GS[i].g); GS.splice(i, 1); } }
    const mk = g => { let b = [Infinity, Infinity, -Infinity, -Infinity], cv = 0, circ = 0, burn = 0; g.forEach(o => { if (o.circ && o.r >= .05 && o.r <= .14) burn++; b = [Math.min(b[0], o.b[0]), Math.min(b[1], o.b[1]), Math.max(b[2], o.b[2]), Math.max(b[3], o.b[3])]; cv += o.cv; circ += o.circ; });
      const rect = !cv && KF_SAN.test(g[0].ly || '') && g.length >= 2, rb = rect ? KF_rbowls(g) : 0; if (rect) { burn = g.filter(o => o.cl && Math.abs((o.b[2] - o.b[0]) - (o.b[3] - o.b[1])) < .03 && (o.b[2] - o.b[0]) >= .12 && (o.b[2] - o.b[0]) <= .3).length; }
      const bowl = rect ? rb : KF_bowls(g), tub = g.reduce((m, o) => o.cv ? Math.max(m, o.b[2] - o.b[0], o.b[3] - o.b[1]) : m, 0), w = b[2] - b[0], h = b[3] - b[1], t0 = rect && !(rb || g.some(o => o.cl && o.pts.length >= 7)) ? null : KF_guess(w, h, rect ? 1 : cv, circ, g.length, burn, bowl, tub), t = (g[0].resc && !cv && !circ) ? null : t0;
      return { b, cv, circ, w, h, t, n: g.length, ly: g[0].ly, bowl }; };
    const put = r => fx.push({ id: 'f' + (++n), b: r.b.map(v => Math.round(v * 1000) / 1000), t: r.t, ot: r.t, cv: r.cv, circ: r.circ, n: r.n, ly: r.ly, bw: r.bowl });
    GS.map(o => o.g).forEach(g => { const r = mk(g), w = r.w, h = r.h;
      if (!r.t) {
        const lg = KF_lshape(g, r.b); if (lg) { const B = r.b, band = l => ({ S: [B[0], B[1], B[2], B[1] + l.D], N: [B[0], B[3] - l.D, B[2], B[3]], W: [B[0], B[1], B[0] + l.D, B[3]], E: [B[2] - l.D, B[1], B[2], B[3]] })[l.sd], bs = lg.map(band);
          const inB = o => bs.some(q => o.b[0] >= q[0] - .02 && o.b[1] >= q[1] - .02 && o.b[2] <= q[2] + .02 && o.b[3] <= q[3] + .02);
          const inner = g.filter(o => !inB(o) && o.cv); const sub = g.filter(inB);
          const bowl = inner.length ? 0 : KF_bowls(sub), burn = inner.length ? 0 : sub.filter(o => o.circ && o.r >= .05 && o.r <= .14).length, len = lg[0].L + lg[1].L + Math.max(lg[0].D, lg[1].D);
          const t = burn >= 2 || bowl >= 2 && len >= 3 ? 'kitchen' : bowl >= 1 ? 'counter' : null; if (t) { const lb = lg.slice().sort((p, q) => q.L - p.L)[0]; fx.push({ id: 'f' + (++n), b: r.b.map(v => Math.round(v * 1000) / 1000), t, ot: t, cv: r.cv, circ: r.circ, n: r.n, ly: r.ly, bw: bowl, L: lg.map(l => l.sd).join(''), back: lb.sd, bd: 0 }); return; } }
        let rest = g, got = false; g.filter(o => o.cl && (o.b[2] - o.b[0]) >= .25 && (o.b[3] - o.b[1]) >= .25 && Math.max(o.b[2] - o.b[0], o.b[3] - o.b[1]) <= 3.6).sort((p, q) => (q.b[2] - q.b[0]) * (q.b[3] - q.b[1]) - (p.b[2] - p.b[0]) * (p.b[3] - p.b[1])).forEach(o => {
          if (!rest.includes(o)) return; const sub = rest.filter(q => q.b[0] >= o.b[0] - .01 && q.b[1] >= o.b[1] - .01 && q.b[2] <= o.b[2] + .01 && q.b[3] <= o.b[3] + .01); if (sub.length === g.length || sub.length < 3) return;
          const A = (o.b[2] - o.b[0]) * (o.b[3] - o.b[1]); if (sub.some(q => q !== o && q.cl && (q.b[2] - q.b[0]) * (q.b[3] - q.b[1]) > A * .3)) return; const r2 = mk(sub); if (r2.t) { put(r2); rest = rest.filter(q => !sub.includes(q)); got = true; } });
        if (got) { if (rest.length && depth < 2) group(rest, depth + 1); return; }
        if (depth < 2 && g.length > 3 && Math.max(w, h) > 1.2 && Math.max(w, h) < 12) {
          const run = {}; g.forEach(o => { if (o.k !== 'line') return; const [p, q] = o.pts, hz = Math.abs(p[1] - q[1]) < .005, vt = Math.abs(p[0] - q[0]) < .005; if (!hz && !vt) return; const k = (hz ? 'h' : 'v') + Math.round((hz ? p[1] : p[0]) * 100); o._rk = k; run[k] = (run[k] || 0) + Math.hypot(q[0] - p[0], q[1] - p[1]); });
          const big = o => (o.b[2] - o.b[0]) >= w * .85 && (o.b[3] - o.b[1]) >= h * .85 || (o.k === 'line' || o.k === 'poly' && !o.cv) && Math.max(o.b[2] - o.b[0], o.b[3] - o.b[1]) >= Math.max(w, h) * .8 || o._rk && run[o._rk] >= Math.max(w, h) * .6;
          const rest2 = g.filter(o => !big(o)); if (rest2.length && rest2.length < g.length) group(rest2, depth + 1); } return; }
      put(r); }); };
  group(C, 0);
  /* ほかの器具の中に入っている物（カウンターの鉢など）は外す */
  for (let k = fx.length - 1; k >= 0; k--) { const a = fx[k].b; if (fx.some((o, j) => j !== k && o.b[0] <= a[0] + .01 && o.b[1] <= a[1] + .01 && o.b[2] >= a[2] - .01 && o.b[3] >= a[3] - .01 && (o.b[2] - o.b[0]) * (o.b[3] - o.b[1]) > (a[2] - a[0]) * (a[3] - a[1]))) fx.splice(k, 1); }
  fx.forEach(x => KF_orient(x, P));
  /* 壁との向きで見分け直す：便器は壁から奥へ長い（幅の1.15倍以上）。手洗器は壁に沿って広い */
  fx.forEach(x => { if (!x.back || !(x.t === 'sink' || x.t === 'toilet')) return; const hor = x.back === 'N' || x.back === 'S', w = hor ? x.b[2] - x.b[0] : x.b[3] - x.b[1], d = hor ? x.b[3] - x.b[1] : x.b[2] - x.b[0]; x.w = w; x.d = d;
    if (x.t === 'sink' && x.bd <= .1 && d >= .4 && d <= .9 && w >= .28 && w <= .5 && x.cv >= 1) { if (d >= 1.15 * w) x.t = x.ot = 'toilet'; else if (d >= 1.05 * w) x.t = x.ot = 'unknown'; }
    if (x.t === 'sink' && w >= .3 && w <= .45 && d >= .28 && d <= .47 && d >= .8 * w && d <= 1.3 * w) x.uc = 1; });
  /* 手洗器・小便器は壁に付いている物だけ（椅子・丸テーブルなどを外す） */
  for (let k = fx.length - 1; k >= 0; k--) if ((fx[k].t === 'sink' || fx[k].t === 'unknown') && !(fx[k].back && fx[k].bd <= .1)) fx.splice(k, 1);
  KF_urinals(fx);
  /* 1台だけの小便器の形の物は、部屋の名前が男子便所なら小便器 */
  fx.forEach(x => { if (!x.uc || x.t !== 'sink') return; const c = [(x.b[0] + x.b[2]) / 2, (x.b[1] + x.b[3]) / 2]; const f = P.faces.find(f => pip(c[0], c[1], f.poly)); if (f && /男子|男性|紳士|MEN|小便/i.test(f.name || '')) x.t = x.ot = 'urinal'; });
  return fx;
}
/* 同じ大きさの小さい器具が並んでいたら小便器（NEXT の KF_urinals の写し） */
function KF_urinals(fx) {
  const T = fx.filter(x => x.t === 'toilet' && x.back && !x.v); T.forEach(a => { const hor = a.back === 'N' || a.back === 'S', pa = KF_backPos(a), wa = a.b[2] - a.b[0], ha = a.b[3] - a.b[1];
    const row = T.filter(b => b.back === a.back && Math.abs(KF_backPos(b) - pa) < .06 && Math.abs((b.b[2] - b.b[0]) - wa) < .03 && Math.abs((b.b[3] - b.b[1]) - ha) < .03); if (row.length < 2) return;
    const c = row.map(b => hor ? (b.b[0] + b.b[2]) / 2 : (b.b[1] + b.b[3]) / 2).sort((p, q) => p - q); const gp = c.slice(1).map((v, i) => v - c[i]); if (Math.max(...gp) <= .85) row.forEach(b => { b.t = b.ot = 'urinal'; }); });
  const U = fx.filter(x => x.uc && x.t === 'sink'); U.forEach(a => { const hor = a.back === 'N' || a.back === 'S', pa = KF_backPos(a);
    const row = U.filter(b => b.back === a.back && Math.abs(KF_backPos(b) - pa) < .06); if (row.length < 2) return; const c = row.map(b => hor ? (b.b[0] + b.b[2]) / 2 : (b.b[1] + b.b[3]) / 2).sort((p, q) => p - q);
    if (c.slice(1).every((v, i) => v - c[i] <= 1.2)) row.forEach(b => { b.t = b.ot = 'urinal'; }); });
  const S = fx.filter(x => x.t === 'sink'); const used = new Set();
  S.forEach(a => { if (used.has(a)) return; const w = a.b[2] - a.b[0], h = a.b[3] - a.b[1]; [true, false].forEach(hor => { if (used.has(a)) return;
    const row = S.filter(b => !used.has(b) && Math.abs((b.b[2] - b.b[0]) - w) < .03 && Math.abs((b.b[3] - b.b[1]) - h) < .03 && Math.abs(hor ? b.b[1] - a.b[1] : b.b[0] - a.b[0]) < .03);
    if (row.length < 3) return; const c = row.map(b => hor ? (b.b[0] + b.b[2]) / 2 : (b.b[1] + b.b[3]) / 2).sort((u, v) => u - v), g = c.slice(1).map((v, i) => v - c[i]);
    if (!(Math.max(...g) - Math.min(...g) < .05 && Math.max(...g) < 1.2)) return; const cnt = {}; row.forEach(b => { if (b.back && (hor ? /[NS]/ : /[EW]/).test(b.back)) cnt[b.back] = (cnt[b.back] || 0) + 1; }); const bk = Object.keys(cnt).sort((u, v) => cnt[v] - cnt[u])[0];
    row.forEach(b => { b.t = b.ot = 'urinal'; if (bk) b.back = bk; used.add(b); }); }); });
}
/* L字のキッチン・カウンター（NEXT の KF_lshape の写し） */
function KF_lshape(g, b) { const W = b[2] - b[0], H = b[3] - b[1]; if (W < .9 || H < .9 || W > 4.5 || H > 4.5) return null; const S = [];
  g.forEach(o => { if (o.cv) return; for (let k = 1; k < o.pts.length; k++) { const p = o.pts[k - 1], q = o.pts[k], dx = q[0] - p[0], dy = q[1] - p[1]; if (Math.hypot(dx, dy) < .3) continue;
    if (Math.abs(dy) < .005) S.push({ h: 1, at: p[1], a: Math.min(p[0], q[0]), z: Math.max(p[0], q[0]) }); else if (Math.abs(dx) < .005) S.push({ h: 0, at: p[0], a: Math.min(p[1], q[1]), z: Math.max(p[1], q[1]) }); } });
  const legs = []; [['S', 1, b[1], 1], ['N', 1, b[3], -1], ['W', 0, b[0], 1], ['E', 0, b[2], -1]].forEach(([sd, h, edge, dir]) => { const lo = h ? b[0] : b[1], hi = h ? b[2] : b[3];
    const back = S.some(l => l.h === h && Math.abs(l.at - edge) < .03 && l.z - l.a >= .5);
    let best = null; S.forEach(l => { if (l.h !== h) return; const D = (l.at - edge) * dir; if (D < .45 || D > .85 || l.z - l.a < Math.max(.7, D + .15)) return;
      const cap = S.some(m => m.h !== h && Math.abs(m.at - (Math.abs(l.z - hi) < .06 ? hi : lo)) < .03 && Math.abs((m.z - m.a) - D) < .05); if (!back && !cap) return; if (!(Math.abs(l.a - lo) < .06 || Math.abs(l.z - hi) < .06)) return; if (!best || l.z - l.a > best.z - best.a) best = { ...l, D }; });
    if (best) legs.push({ sd, D: best.D, L: best.z - best.a }); });
  const adj = (a, c) => (a === 'S' || a === 'N') !== (c === 'S' || c === 'N'); const pr = []; for (let i = 0; i < legs.length; i++) for (let j = i + 1; j < legs.length; j++) if (adj(legs[i].sd, legs[j].sd)) pr.push([legs[i], legs[j]]); if (!pr.length) return null; pr.sort((p, q) => Math.abs(p[0].D - p[1].D) - Math.abs(q[0].D - q[1].D) || (p[0].D + p[1].D) - (q[0].D + q[1].D)); return pr[0]; }
/* 鉢の数（NEXT の KF_bowls の写し） */
function KF_bowls(g) { const C = g.filter(o => Math.max(o.b[2] - o.b[0], o.b[3] - o.b[1]) <= .65); if (!C.some(o => o.cv) || C.length > 3000) return 0;
  const B = C.map(o => ({ b: [...o.b], cv: o.cv })); B.sort((p, q) => p.b[0] - q.b[0]); let ch = true, it = 0;
  while (ch && it++ < 30) { ch = false; for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i].b, c = B[j].b; if (c[0] > a[2] + .01) break; if (c[1] <= a[3] + .01 && a[1] <= c[3] + .01) { const nb = [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[2], c[2]), Math.max(a[3], c[3])]; if (Math.max(nb[2] - nb[0], nb[3] - nb[1]) > .7) continue; B[i].b = nb; B[i].cv += B[j].cv; B.splice(j, 1); ch = true; j--; } } }
  const K = B.filter(o => o.cv && Math.min(o.b[2] - o.b[0], o.b[3] - o.b[1]) >= .15 && Math.max(o.b[2] - o.b[0], o.b[3] - o.b[1]) <= .7); if (K.length < 2) return K.length;
  let G = [Infinity, Infinity, -Infinity, -Infinity]; g.forEach(o => { G = [Math.min(G[0], o.b[0]), Math.min(G[1], o.b[1]), Math.max(G[2], o.b[2]), Math.max(G[3], o.b[3])]; }); const mx = Math.max(...K.map(o => o.cv));
  return K.filter(o => o.cv >= mx * .25 || !(o.b[0] <= G[0] + .01 || o.b[1] <= G[1] + .01 || o.b[2] >= G[2] - .01 || o.b[3] >= G[3] - .01)).length; }
/* 四角い槽・ボウルの数（NEXT の KF_rshapes / KF_rbowls の写し） */
function KF_rshapes(g) { const S = g.filter(o => o.cl).map(o => ({ b: o.b })); const Ls = g.filter(o => o.k === 'line'), par = Ls.map((_, i) => i), f = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const near = (p, q) => Math.abs(p[0] - q[0]) < .01 && Math.abs(p[1] - q[1]) < .01;
  for (let i = 0; i < Ls.length; i++) for (let j = i + 1; j < Ls.length; j++) { const A = Ls[i].pts, B = Ls[j].pts; if (near(A[0], B[0]) || near(A[0], B[1]) || near(A[1], B[0]) || near(A[1], B[1])) par[f(i)] = f(j); }
  const C = {}; Ls.forEach((o, i) => { (C[f(i)] = C[f(i)] || []).push(o); });
  Object.values(C).forEach(c => { if (c.length < 4) return; let b = [Infinity, Infinity, -Infinity, -Infinity], t = 0; c.forEach(o => { b = [Math.min(b[0], o.b[0]), Math.min(b[1], o.b[1]), Math.max(b[2], o.b[2]), Math.max(b[3], o.b[3])]; t += Math.hypot(o.pts[1][0] - o.pts[0][0], o.pts[1][1] - o.pts[0][1]); });
    const per = 2 * ((b[2] - b[0]) + (b[3] - b[1])); if (Math.abs(t - per) > per * .1) return;
    if (!c.every(o => o.pts.every(p => Math.abs(p[0] - b[0]) < .01 || Math.abs(p[0] - b[2]) < .01 || Math.abs(p[1] - b[1]) < .01 || Math.abs(p[1] - b[3]) < .01))) return; S.push({ b }); });
  return S; }
function KF_rbowls(g) { let G = [Infinity, Infinity, -Infinity, -Infinity]; g.forEach(o => { G = [Math.min(G[0], o.b[0]), Math.min(G[1], o.b[1]), Math.max(G[2], o.b[2]), Math.max(G[3], o.b[3])]; });
  const ins = KF_rshapes(g).filter(o => o.b[0] > G[0] + .02 && o.b[1] > G[1] + .02 && o.b[2] < G[2] - .02 && o.b[3] < G[3] - .02 && Math.min(o.b[2] - o.b[0], o.b[3] - o.b[1]) >= .15 && Math.max(o.b[2] - o.b[0], o.b[3] - o.b[1]) <= 1.8);
  return ins.filter(o => !ins.some(q => q !== o && q.b[0] <= o.b[0] && q.b[1] <= o.b[1] && q.b[2] >= o.b[2] && q.b[3] >= o.b[3])).length; }
/* 形と大きさで見分ける（m）（NEXT の KF_guess の写し） */
function KF_guess(w, h, cv, circ, n, burn, bowl, tub) { const s = Math.min(w, h), l = Math.max(w, h); if (cv < 1) return null;
  if (s >= .33 && s <= .49 && l <= .9 && (l >= .6 || l >= .5 && l / s >= 1.35)) return circ <= 2 ? 'toilet' : 'sink';
  if (s >= .4 && s <= .6 && l >= .6 && l <= .9 && circ > 2) return 'sink';
  if (s >= .55 && s <= .8 && l >= 1.2 && l <= 3.6 && burn >= 2) return 'kitchen';
  if (s >= .4 && s <= .72 && l >= .7 && l <= 3.6) { if (l >= 1.2 && burn >= 2) return 'kitchen'; if (bowl >= 1 || s <= .66) return 'counter'; }
  if (s >= .65 && s <= .9 && l >= 1.1 && l <= 1.8) return 'bath';
  if (s >= .25 && s <= .55 && l >= .28 && l <= .6 && (n >= 2 || circ === 0)) return 'sink';
  if (s >= .15 && s < .25 && l >= .25 && l <= .45 && circ >= 1 && n >= 3) return 'sink';
  return null; }
/* 背面（壁に付いている側）を探す（NEXT の KF_orient 一式の写し） */
const KF_SIDES = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] };
function KF_backPos(x) { const b = x.b; return { N: b[3], S: b[1], E: b[2], W: b[0] }[x.back]; }
function KF_lines(P) { if (P._kfl) return P._kfl; const G = {}; P.segs.forEach(s => { const h = Math.abs(s[1] - s[3]) < .01, v = Math.abs(s[0] - s[2]) < .01; if (!h && !v) return; const at = h ? (s[1] + s[3]) / 2 : (s[0] + s[2]) / 2, a = Math.min(h ? s[0] : s[1], h ? s[2] : s[3]), z = Math.max(h ? s[0] : s[1], h ? s[2] : s[3]);
    const k = (h ? 'h' : 'v') + Math.round(at * 200); (G[k] = G[k] || { h, at, iv: [] }).iv.push([a, z]); });
  const out = []; Object.values(G).forEach(g => { g.iv.sort((p, q) => p[0] - q[0]); let cur = null; g.iv.forEach(iv => { if (cur && iv[0] <= cur[1] + .01) cur[1] = Math.max(cur[1], iv[1]); else { if (cur) out.push({ h: g.h, at: g.at, a: cur[0], z: cur[1] }); cur = [...iv]; } }); if (cur) out.push({ h: g.h, at: g.at, a: cur[0], z: cur[1] }); });
  return P._kfl = out; }
function KF_wallAt(b, side, P, maxd, x) { return KF_wallAt1(b, side, P, maxd, x && x.t === 'sink'); }
function KF_wallAt1(b, side, P, maxd, strict) { const [nx, ny] = KF_SIDES[side], hor = !!ny; const pos = hor ? (ny > 0 ? b[3] : b[1]) : (nx > 0 ? b[2] : b[0]); const lo = hor ? b[0] : b[1], hi = hor ? b[2] : b[3]; let best = null;
  const L = KF_lines(P); L.forEach(l => { if (l.h !== hor) return; const ov = Math.min(hi, l.z) - Math.max(lo, l.a); if (ov < (hi - lo) * .3) return; const d = (l.at - pos) * (hor ? ny : nx); if (d < -.03 || d > maxd) return;
    if (l.z - l.a < .6) return; if ((strict || l.z - l.a < hi - lo + .15) && !L.some(m => m !== l && m.h === hor && Math.abs(m.at - l.at) >= .04 && Math.abs(m.at - l.at) <= .32 && Math.min(l.z, m.z) - Math.max(l.a, m.a) >= (l.z - l.a) * .5)) return; if (!best || d < best.d - .02 || (Math.abs(d - best.d) <= .02 && l.z - l.a > best.len)) best = { d, at: l.at, len: l.z - l.a }; }); return best; }
function KF_cands(t, b) { const w = b[2] - b[0], h = b[3] - b[1], tall = h >= w; if (t === 'toilet') return tall ? ['N', 'S'] : ['E', 'W']; if (t === 'counter' || t === 'kitchen' || t === 'bath') return tall ? ['E', 'W'] : ['N', 'S']; return ['N', 'S', 'E', 'W']; }
function KF_orient(x, P) { if (x.L) return; let best = null; KF_cands(x.t, x.b).forEach(sd => { const w = KF_wallAt(x.b, sd, P, .35, x); if (w && (!best || w.d < best.w.d - .02 || (Math.abs(w.d - best.w.d) <= .02 && (w.len || 0) > (best.w.len || 0)))) best = { sd, w }; });
  x.back = best ? best.sd : null; x.bd = best ? Math.round(best.w.d * 1000) / 1000 : null; x.side = x.side || KF_freeSide(x, P); }
function KF_freeSide(x, P) { if (!x.back) return 1; const [nx, ny] = KF_SIDES[x.back], hor = !!ny, b = x.b, c = hor ? (b[0] + b[2]) / 2 : (b[1] + b[3]) / 2; let lo = -Infinity, hi = Infinity;
  P.segs.forEach(s => { const sh = Math.abs(s[1] - s[3]) < .01, sv = Math.abs(s[0] - s[2]) < .01; if (hor ? !sv : !sh) return; const at = hor ? s[0] : s[1], a = Math.min(hor ? s[1] : s[0], hor ? s[3] : s[2]), z = Math.max(hor ? s[1] : s[0], hor ? s[3] : s[2]); const mid = hor ? (b[1] + b[3]) / 2 : (b[0] + b[2]) / 2; if (mid < a || mid > z) return; if (at > c) hi = Math.min(hi, at); else lo = Math.max(lo, at); });
  return (hi - c) >= (c - lo) ? 1 : -1; }
function KF_outPt(x) { if (!x.back || !KF_OUT[x.t]) return null; const [nx, ny] = KF_SIDES[x.back], hor = !!ny, b = x.b; const w = curP ? KF_wallAt(b, x.back, KF_P(), .35, x) : null;
  const wallPos = w ? w.at : (hor ? (ny > 0 ? b[3] : b[1]) : (nx > 0 ? b[2] : b[0])); const off = .07, sd = x.side || 1;
  let t; if (x.t === 'toilet') { const c = hor ? (b[0] + b[2]) / 2 : (b[1] + b[3]) / 2; t = c + sd * .33; } else { const lo = hor ? b[0] : b[1], hi = hor ? b[2] : b[3]; t = sd > 0 ? hi - .2 : lo + .2; }
  return hor ? [t, wallPos - ny * off] : [wallPos - nx * off, t]; }

/* KE の ents（mm・エンジンと同じ回転補正済み）→ m の ents */
function toMeters(ents) {
  const m = 1 / 1000, M = p => [p[0] * m, p[1] * m];
  const out = [];
  (ents || []).forEach(e => {
    if (!e || e.k === 'text' || e.k === 'insert' || e.k === 'solid') return;
    if (e.k === 'line') out.push({ k: 'line', ly: e.ly || '', dash: !!e.dash, a: M(e.a), b: M(e.b) });
    else if (e.k === 'poly') out.push({ k: 'poly', ly: e.ly || '', dash: !!e.dash, pts: (e.pts || []).map(M), closed: !!e.closed, bul: !!e.bul });
    else if (e.k === 'arc') out.push({ k: 'arc', ly: e.ly || '', dash: !!e.dash, pts: (e.pts || []).map(M), c: e.c && M(e.c), r: (e.r || 0) * m, sweep: e.sweep });
    else if (e.k === 'circle') out.push({ k: 'circle', ly: e.ly || '', dash: !!e.dash, c: e.c && M(e.c), r: (e.r || 0) * m, ell: e.ell ? e.ell.map(M) : undefined });
  });
  return out;
}

/* 2つの四角の重なり具合 */
function overlap(a, b) {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const inter = ix * iy;
  const aa = Math.max(0, (a[2] - a[0]) * (a[3] - a[1])), ab = Math.max(0, (b[2] - b[0]) * (b[3] - b[1]));
  return { inter, min: Math.min(aa, ab), union: aa + ab - inter };
}

/* 救済の入口。
 * ents: KE の図形（mm、KF_fromFile と同じ回転補正をした物）
 * plan: 案件の図面 { segs, faces }（m、図面の向き）。rot: エンジン内部の向きへの回転（KAKU_fix.rot）
 * engineFixtures: エンジンが拾った器具（図面の向き）。重なる候補は出さない
 * roles: KE_classify のレイヤー役割（任意）
 * 戻り値: [{ t, b, back, out, src:'rescue', ly }]（図面の向き、m） */
export function rescueFixtures(ents, plan, rot = 0, engineFixtures = [], roles = {}) {
  if (!ents || !ents.length || !plan || !plan.segs || !plan.segs.length) return [];
  const em = toMeters(ents);
  const layers = rescueLayers(em);
  if (!layers.length) return [];
  const want = new Set(layers);
  const cand = em.filter(e => want.has(e.ly));
  if (!cand.length) return [];
  /* 図面をエンジン内部の向きに回してから探す（KF_P と同じ） */
  const P = {
    segs: plan.segs.map(s => [...rotL([s[0], s[1]], rot), ...rotL([s[2], s[3]], rot)]),
    faces: (plan.faces || []).map(f => ({ name: f.name || '', poly: (f.poly || []).map(p => rotL(p, rot)) })),
  };
  curP = P;
  let fx = [];
  try { fx = KF_build(cand, P, roles); } finally { curP = null; }
  const q3 = v => Math.round(v * 1000) / 1000;
  const out = [];
  for (const x of fx) {
    /* 種類まで決めきれた物だけを救う（判定保留の塊は壁の窪みなどと見分けが付かないので出さない） */
    if (!x.t || x.t === 'other' || x.t === 'unknown') continue;
    let o = null;
    try { curP = P; o = KF_OUT[x.t] ? KF_outPt(x) : null; } catch (e) { o = null; } finally { curP = null; }
    out.push({
      t: x.t,
      b: gbox(x.b, rot).map(q3),
      back: gback(x.back, rot),
      out: o ? rotG(o, rot).map(q3) : null,
      src: 'rescue', ly: x.ly || '',
    });
  }
  /* エンジンの器具と重なる物・救済同士で重なる物は出さない（エンジン優先） */
  const kept = [];
  for (const r of out) {
    const rc = [(r.b[0] + r.b[2]) / 2, (r.b[1] + r.b[3]) / 2];
    const dupIn = list => list.some(e => {
      if (!e || !e.b) return false;
      const ec = [(e.b[0] + e.b[2]) / 2, (e.b[1] + e.b[3]) / 2];
      if (rc[0] >= e.b[0] - .04 && rc[0] <= e.b[2] + .04 && rc[1] >= e.b[1] - .04 && rc[1] <= e.b[3] + .04) return true;
      if (ec[0] >= r.b[0] - .04 && ec[0] <= r.b[2] + .04 && ec[1] >= r.b[1] - .04 && ec[1] <= r.b[3] + .04) return true;
      const ov = overlap(r.b, e.b);
      return ov.min > 0 && (ov.inter / ov.min > .5 || ov.inter / ov.union > .3);
    });
    if (dupIn(engineFixtures || []) || dupIn(kept)) continue;
    kept.push(r);
  }
  return kept;
}

/* エンジンの器具（先）＋救済の器具（後）を1つの一覧にする */
export function mergeFixtures(engineFixtures, rescued) {
  return [...(engineFixtures || []), ...(rescued || [])];
}
