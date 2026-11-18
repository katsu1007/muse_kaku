/* 照明の自動配置と配線（画面に触らない計算だけ。tests/lighting.test.mjs でテスト）
 * 決まり（かつが決めたこと・前のKAKUと同じ）：
 *   ・壁から600mm空けて、残りを均等に割る。位置は50mm単位
 *   ・細い通路（短い辺が1.5m未満）は真ん中に一列
 *   ・L字・欠き込みの部屋は四角に分けて並べる。部屋の外や壁ぎわ30cm未満には置かない
 *   ・間隔は2.0mから。天井が2.4mより高い時は0.3mごとに1割詰める（プランC）
 *   ・部屋の用途を選んだ時は光束法：必要台数 N = 照度 × 面積 ÷（1台の lm × 照明率 × 保守率0.8）。足りるまで間隔を詰める（0.9mまで） */

export const USES = [
  ['', 'なし（間隔だけで並べる）', 0, 0],
  ['office', '事務室', 750, 0.75], ['meeting', '会議室・応接室', 500, 0.75], ['drafting', '設計室・製図室', 1500, 0.75],
  ['shop', '店舗（売場）', 500, 0.85], ['restaurant', '飲食店（客席）', 300, 0.75], ['kitchen-biz', '厨房・調理室', 500, 0.85],
  ['living', '居間・リビング', 200, 0.75], ['dining', 'ダイニング・キッチン', 300, 0.75], ['bedroom', '寝室・和室', 150, 0.4],
  ['study', '書斎・子供部屋', 500, 0.75], ['bath', '浴室・洗面所・脱衣所', 300, 0.75],
  ['toilet', 'トイレ', 200, 0], ['corridor', '廊下・階段・玄関', 100, 0], ['storage', '倉庫・物置', 100, 0]
];
export const DEF_LM = { 'e-dl100': 800, 'e-dl100s': 650, 'e-dl125': 1200, 'e-dl150': 1600, 'e-clight': 4000, 'e-light': 800, 'e-bl': 2000, 'e-base': 5200 };
const UT = [[0.6, 0.40], [0.8, 0.48], [1, 0.54], [1.25, 0.60], [1.5, 0.64], [2, 0.70], [2.5, 0.74], [3, 0.77], [4, 0.80], [5, 0.82]];
export const MF = 0.8;
export const EDGE = 0.6, GRID = 0.05, WALL_MIN = 0.3, NARROW = 1.5;

export function util(K) {
  if (K <= UT[0][0]) return UT[0][1] * Math.max(0.5, K / UT[0][0]);
  for (let i = 1; i < UT.length; i++) if (K <= UT[i][0]) { const a = UT[i - 1], b = UT[i]; return a[1] + (b[1] - a[1]) * (K - a[0]) / (b[0] - a[0]); }
  return UT[UT.length - 1][1];
}
const perimOf = P => P.reduce((s, a, i) => { const b = P[(i + 1) % P.length]; return s + Math.hypot(b[0] - a[0], b[1] - a[1]); }, 0);
export const areaOf = P => Math.abs(P.reduce((s, a, i) => { const b = P[(i + 1) % P.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;

/* 光束法の必要台数（用途なしは 0） */
export function needCount(poly, ch, use, lm) {
  const u = USES.find(x => x[0] === use);
  if (!u || !u[2] || !(lm > 0)) return 0;
  const A = areaOf(poly), Hm = Math.max(0.5, ch - u[3]), K = 2 * A / (Hm * perimOf(poly));
  return Math.max(1, Math.ceil(u[2] * A / (lm * util(K) * MF) - 1e-9));
}

export function pip(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
export function edgeDist(x, y, P) { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy; const t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)) : 0; d = Math.min(d, Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y)); } return d; }

/* 前のKAKUと同じ：2.4mを超えたら0.3mごと（端数は切り上げ）に1割詰める。詰めるのは元の間隔の7割まで */
export const pitchFor = (ch, base = 2) => base * Math.max(0.7, Math.pow(0.9, ch > 2.4 + 1e-6 ? Math.ceil((ch - 2.4) / 0.3 - 1e-9) : 0));

/* 部屋1つの照明の点。use を選んだ時は光束法の台数に届くまで間隔を詰める */
/* 照度の目安（置いた台数から） */
export function luxOf(P, ch, use, lm, n, A0, L0) {   // A0・L0：区画いくつかの部屋の広さ・周り（無ければ P から）
  const u = USES.find(x => x[0] === use); if (!u || !u[2]) return 0;
  const A = A0 > 0 ? A0 : areaOf(P), Hm = Math.max(0.5, ch - u[3]), K = 2 * A / (Hm * (L0 > 0 ? L0 : perimOf(P)));
  return n * lm * util(K) * MF / A;
}

/* 配線：スイッチ→照明をつなぐ（近い順に一筆書き）。長さは図面の上の長さ×1.1（たるみ）＋天井までの立ち上がり（天井高−1.2m） */
/* ==== 配線（前のKAKUの KW_calc をそのまま移したもの） ====
 * 区画ごと：スイッチが無ければ入口のそば（ドアの取っ手側・壁の線が無い開口の横。部屋の外側＝広い方へ出る入口を優先）に置く。
 * スイッチ→照明：近い順に縦横でたどった長さ＋立ち下がり（天井高−1.2m）＋照明1台ごとに0.2m。
 * 分電盤→部屋：縦横の長さ＋（天井高−1.5m）。1枚の図面に階を横に並べてある時は、横に1m以上離れた所で分けて、同じまとまりの分電盤だけ使う。
 * ケーブルの数量は 余り（既定10%）を足して切り上げ */
const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0, q = [a[0] + dx * t, a[1] + dy * t]; return { d: Math.hypot(p[0] - q[0], p[1] - q[1]), q, t }; };
export const polyD = (p, poly) => { if (pip(p[0], p[1], poly)) return 0; let d = 1e9; for (let k = 0; k < poly.length; k++) d = Math.min(d, segD(p, poly[k], poly[(k + 1) % poly.length]).d); return d; };
export const man = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

export function autoSwitch(f, faces, segs, doors) {
  const poly = f.poly, cs = [];
  const beyond = (pt, n) => { const q1 = [pt[0] + n[0] * .3, pt[1] + n[1] * .3], q2 = [pt[0] - n[0] * .3, pt[1] - n[1] * .3], q = pip(q1[0], q1[1], poly) ? q2 : q1; let A = Infinity;
    faces.forEach(g => { if (g.i === f.i || !g.poly) return; if (pip(q[0], q[1], g.poly) && g.area < A) A = g.area; }); return A; };
  const edge = k => { const a = poly[k], b = poly[(k + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { a, b, L, u: [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n: [-(b[1] - a[1]) / L, (b[0] - a[0]) / L] }; };
  const at = (e, t) => [e.a[0] + e.u[0] * t, e.a[1] + e.u[1] * t];
  (doors || []).forEach(d => { if (!d.c) return; let best = null;
    for (let k = 0; k < poly.length; k++) { const e = edge(k), sd = segD(d.c, e.a, e.b); if (sd.d < .3 && (!best || sd.d < best.sd.d)) best = { e, sd }; }
    if (!best) return; const e = best.e, L = e.L, m = d.m || d.c, sg = ((m[0] - d.c[0]) * e.u[0] + (m[1] - d.c[1]) * e.u[1]) >= 0 ? 1 : -1, r = +d.r || .8;
    let t = best.sd.t * L + sg * (r + .15); if (t < .1 || t > L - .1) t = best.sd.t * L - sg * .15; t = Math.max(.1, Math.min(L - .1, t));
    const mid = at(e, Math.max(0, Math.min(L, best.sd.t * L + sg * r / 2))); cs.push({ e, t, A: beyond(mid, e.n), door: 1 }); });
  for (let k = 0; k < poly.length; k++) { const e = edge(k); if (e.L < .6) continue; const iv = [];
    segs.forEach(q => { const p1 = [q[0], q[1]], p2 = [q[2], q[3]], d1 = (p1[0] - e.a[0]) * e.n[0] + (p1[1] - e.a[1]) * e.n[1], d2 = (p2[0] - e.a[0]) * e.n[0] + (p2[1] - e.a[1]) * e.n[1];
      if (Math.abs(d1) > .06 || Math.abs(d2) > .06) return; const t1 = (p1[0] - e.a[0]) * e.u[0] + (p1[1] - e.a[1]) * e.u[1], t2 = (p2[0] - e.a[0]) * e.u[0] + (p2[1] - e.a[1]) * e.u[1];
      const lo = Math.max(0, Math.min(t1, t2)), hi = Math.min(e.L, Math.max(t1, t2)); if (hi - lo > .01) iv.push([lo, hi]); });
    iv.sort((x, y) => x[0] - y[0]); let c = 0; const gaps = []; iv.forEach(v => { if (v[0] - c >= .6) gaps.push([c, v[0]]); c = Math.max(c, v[1]); }); if (e.L - c >= .6) gaps.push([c, e.L]);
    gaps.forEach(g => { const w = g[1] - g[0]; if (w > 3.6) return; if (g[0] < .05 && g[1] > e.L - .05) return;
      let t = g[0] >= .25 ? g[0] - .15 : g[1] + .15; if (t > e.L - .1) t = Math.max(.1, g[0] - .15); cs.push({ e, t, A: beyond(at(e, (g[0] + g[1]) / 2), e.n), door: 0 }); }); }
  let pt, e0;
  if (cs.length) { cs.sort((x, y) => (y.A - x.A) || (y.door - x.door)); e0 = cs[0].e; pt = at(e0, cs[0].t); }
  else { let bk = 0, bl = 0; for (let k = 0; k < poly.length; k++) { const l = edge(k).L; if (l > bl) { bl = l; bk = k; } } e0 = edge(bk); pt = at(e0, Math.min(.3, bl / 2)); }
  const p1 = [pt[0] + e0.n[0] * .07, pt[1] + e0.n[1] * .07], p2 = [pt[0] - e0.n[0] * .07, pt[1] - e0.n[1] * .07];
  return pip(p1[0], p1[1], poly) ? p1 : p2;
}
/* 2点を縦と横の線でつなぐ（曲がり角が部屋の中に入る方） */
export function leg(a, b, poly) { const dx = b[0] - a[0], dy = b[1] - a[1]; if (Math.abs(dx) < .03 || Math.abs(dy) < .03) return [b]; const e1 = [b[0], a[1]], e2 = [a[0], b[1]], i1 = pip(e1[0], e1[1], poly), i2 = pip(e2[0], e2[1], poly);
  return [i1 && !i2 ? e1 : i2 && !i1 ? e2 : (Math.abs(dx) >= Math.abs(dy) ? e1 : e2), b]; }
function chain(start, items) { const left = items.slice(), out = []; let cur = start; while (left.length) { let bi = 0, bd = 1e9; left.forEach((x, i) => { const d = man(cur, x.l); if (d < bd) { bd = d; bi = i; } }); const x = left.splice(bi, 1)[0]; out.push(x); cur = x.l; } return out; }

/* トイレのブース：便器が入っている2.5㎡以下の区画。照明とコンセントは、ドアの外の部屋（なければ接している一番大きい区画）の
 * スイッチ・回路に入れる（ブースごとにスイッチは付けない） */
export function boothHosts(faces, fixtures = [], doors = []) {
  const H = {};
  faces.forEach(f => {
    if (f.area > 2.5) return;
    if (!fixtures.some(x => x.t === 'toilet' && x.b && pip((x.b[0] + x.b[2]) / 2, (x.b[1] + x.b[3]) / 2, f.poly))) return;
    let cx = 0, cy = 0; f.poly.forEach(q => { cx += q[0] / f.poly.length; cy += q[1] / f.poly.length; });
    let host = null;
    const d = doors.filter(d => d.c && polyD(d.c, f.poly) < .3).sort((a, b) => polyD(a.c, f.poly) - polyD(b.c, f.poly))[0];
    if (d) { const L = Math.hypot(d.c[0] - cx, d.c[1] - cy) || 1, q = [d.c[0] + (d.c[0] - cx) / L * .35, d.c[1] + (d.c[1] - cy) / L * .35];
      faces.forEach(g => { if (g.i !== f.i && pip(q[0], q[1], g.poly) && (!host || g.area < host.area)) host = g; }); }
    if (!host) faces.forEach(g => { if (g.i === f.i || g.area <= 2.5) return; if (f.poly.some(q => polyD(q, g.poly) < .3) && (!host || g.area > host.area)) host = g; });
    if (host && host.area > f.area) H[f.i] = host;
  });
  return H;
}

/* plan: {faces, segs}, lights/outlets: [{key, l:[x,y]}], switches: [{key, l}] 置いたスイッチ, panels: [[x,y]], link: {照明key: スイッチkey}, chOf(faceI)
 * 前のKAKUの KW_calc と同じ計算。コンセント：入口のスイッチ（なければ1個目）から近い順に縦横の長さ＋1個ごとに（天井高−0.25m） */
export function wirePlan({ plan, doors = [], fixtures = [], lights = [], outlets = [], switches = [], panels = [], link = {}, via = {}, sheets = [], chOf = () => 2.4, booth = true }) {
  const res = { paths: [], home: [], sws: [], lenL: 0, lenO: 0, lenH: 0, circ: 0, autoSw: 0, far: 0, nL: lights.length, nO: 0, assign: {}, booths: 0, dropped: [] };
  const faces = (plan.faces || []).filter(f => f.poly && (f.area || areaOf(f.poly)) >= .6).map(f => ({ ...f, area: f.area || areaOf(f.poly) }));
  /* 分電盤から引くまとまり（階・図）：①図の範囲（sheets：[{box:[x0,y0,x1,y1]}]）に入る区画は同じ図 ②それ以外は、外の四角が縦・横とも1m以内に近づく区画どうしをつなぐ。
   * 前は x の範囲だけで分けていたので、上下に並べた階が同じまとまりになり、2階の分電盤から1階へ引いていた */
  const bb = f => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; f.poly.forEach(q => { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); }); return [a, b, c, d]; };
  const fgrp = {}, B = faces.map(bb), par = faces.map((_, k) => k), root = k => { while (par[k] !== k) k = par[k] = par[par[k]]; return k; };
  const shOf = k => { const b = B[k], cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2; return sheets.findIndex(x => x && x.box && cx >= x.box[0] && cx <= x.box[2] && cy >= x.box[1] && cy <= x.box[3]); };
  const SH = faces.map((_, k) => shOf(k));
  const ord0 = faces.map((_, k) => k).sort((a, b) => B[a][0] - B[b][0]);
  for (let x = 0; x < ord0.length; x++) { const a = ord0[x];
    for (let y = x + 1; y < ord0.length; y++) { const b = ord0[y]; if (B[b][0] - B[a][2] > 1) break;
      if (SH[a] >= 0 || SH[b] >= 0) { if (SH[a] === SH[b]) par[root(a)] = root(b); continue; }
      if (B[b][1] - B[a][3] <= 1 && B[a][1] - B[b][3] <= 1) par[root(a)] = root(b); } }
  faces.forEach((f, k) => { fgrp[f.i] = SH[k] >= 0 ? 's' + SH[k] : 'g' + root(k); });
  const pg = l => { let f = null, bd = 1e9; faces.forEach(x => { const dd = polyD(l, x.poly); if (dd < bd) { bd = dd; f = x; } }); return f ? fgrp[f.i] : -1; };
  const pns = panels.map(l => ({ l, grp: pg(l) }));
  const owner = (l, tol) => { let b = null; faces.forEach(f => { const dd = polyD(l, f.poly); if (dd <= tol && (!b || dd < b.dd - 1e-6 || (Math.abs(dd - b.dd) < 1e-6 && f.area < b.f.area))) b = { f, dd }; }); return b && b.f; };
  const host = booth ? boothHosts(faces, fixtures, doors) : {};
  res.booths = Object.keys(host).length;
  const byFace = {}, order = [];
  const put = (f, k, d) => { if (host[f.i]) f = host[f.i]; if (!byFace[f.i]) { byFace[f.i] = { f, L: [], O: [] }; order.push(f.i); } byFace[f.i][k].push(d); };
  /* 照明は区画の中（5cm）を先に、無ければ 35cm まで（コンセントと同じ）。どの区画にも入らない照明は dropped に返して画面で知らせる（黙って配線から落とさない） */
  lights.forEach(d => { const f = owner(d.l, .05) || owner(d.l, .35); if (f) put(f, 'L', d); else res.dropped.push(d.key); });
  outlets.forEach(d => { const f = owner(d.l, .35); if (f) put(f, 'O', d); });
  const allSw = {}; switches.forEach(s => { allSw[s.key] = s; });
  const used = {}, faceS = {};
  /* 先に全部の区画のスイッチを決める（つなぎ替えで、後の区画のスイッチにもつなげるように） */
  order.forEach(fi => { const { f, L } = byFace[fi]; if (!L.length) return;
    let S = switches.filter(s => polyD(s.l, f.poly) <= .35);
    /* 区画の外（廊下側の壁の外など）に置いたスイッチ：60cm 以内で、いちばん近い区画がこの区画なら、この区画のスイッチにする */
    if (!S.length) S = switches.filter(s => { const dd = polyD(s.l, f.poly); if (dd > .6) return false; return !faces.some(g => g !== f && polyD(s.l, g.poly) < dd - 1e-6); });
    if (!S.length) { const as = { key: 'a:' + f.i, l: autoSwitch(f, faces, plan.segs || [], doors), auto: true }; S = [as]; allSw[as.key] = as; }
    faceS[fi] = S; });
  /* 先に全部の照明のつなぐスイッチを決める（ほかの区画の照明から線を引くため） */
  /* link が 'none' の照明はスイッチ無し（人感センサー付きなど。スイッチを消した時。電源だけを、その区画の照明どうしでつなぐ） */
  const NONE = fi => ({ key: 'n:' + byFace[fi].f.i, l: null, none: true });
  const pickS = (d, S, fi) => { if (link[d.key] === 'none') return NONE(fi); let s = link[d.key] && allSw[link[d.key]] ? allSw[link[d.key]] : null;
    if (!s) { let bd = 1e9; S.forEach(x => { const dd = man(x.l, d.l); if (dd < bd) { bd = dd; s = x; } }); } return s; };
  const lightsOf = {}; order.forEach(fi => { const { L } = byFace[fi]; if (!L.length) return; L.forEach(d => { const s = pickS(d, faceS[fi], fi); (lightsOf[s.key] = lightsOf[s.key] || []).push({ d, fi }); }); });
  const fed = {};   // 分電盤から電気を送ったスイッチ（同じスイッチを2回数えない）
  order.forEach(fi => { const { f, L, O } = byFace[fi], ch = chOf(f.i); const heads = [];   // この区画で電気を送る所（スイッチ・スイッチ無しの1つ目の照明）
    let first = null;   // コンセントを続ける所
    if (L.length) {
      const S = faceS[fi];
      const grp = {}, gk = [];
      L.forEach(d => { const s = pickS(d, S, fi);
        res.assign[d.key] = s.key; if (!grp[s.key]) { grp[s.key] = { s, L: [] }; gk.push(s.key); } grp[s.key].L.push(d); });
      gk.forEach(k => { const g = grp[k], s = g.s;
        if (s.none) { const st = g.L[0].l, ord = chain(st, g.L), pts = [st]; let cur = st, len = 0;
          ord.forEach(d => { leg(cur, d.l, f.poly).forEach(q => pts.push(q)); len += man(cur, d.l); cur = d.l; });
          res.paths.push({ pts }); res.circ++; res.lenL += len + ord.length * .2; heads.push({ l: ord[0].l, drop: 0 }); if (!first) first = ord[0].l; return; }
        if (!used[s.key]) { used[s.key] = 1; res.sws.push(s); if (s.auto) res.autoSw++; }
        /* 渡り：照明どうしのつなぎ替えで選んだ時（via）だけ、ほかの区画の同じスイッチの照明から線を引く（スイッチの立ち下がりは無い）。
           それ以外は、スイッチが区画の外でもスイッチから引く */
        let st = s.l, fromL = false;
        if (polyD(s.l, f.poly) > .35 && g.L.some(d => via[d.key])) { let bd = 1e9; (lightsOf[s.key] || []).forEach(o => { if (o.fi === fi) return; g.L.forEach(d => { const dd = man(o.d.l, d.l); if (dd < bd) { bd = dd; st = o.d.l; fromL = true; } }); }); }
        const ord = chain(st, g.L), pts = [st]; let cur = st, len = 0;
        ord.forEach(d => { leg(cur, d.l, f.poly).forEach(q => pts.push(q)); len += man(cur, d.l); cur = d.l; });
        res.paths.push({ pts }); res.circ++; res.lenL += len + (fromL ? 0 : Math.max(0, ch - 1.2)) + ord.length * .2;
        if (!fromL && !fed[s.key]) { fed[s.key] = 1; heads.push({ l: s.l, drop: Math.max(0, ch - 1.2) }); }
        if (!first) first = fromL ? ord[0].l : s.l; });
    }
    if (O.length) { const st = first || O[0].l, ordO = chain(st, O); let c2 = st, l2 = 0;
      ordO.forEach((d, i) => { if (i || first) l2 += man(c2, d.l); c2 = d.l; });
      res.lenO += l2 + ordO.length * Math.max(0, ch - .25); res.nO += ordO.length; if (!heads.length && !first) heads.push({ l: O[0].l, drop: 0 }); }
    /* 分電盤から：この区画の送り先のうち分電盤にいちばん近い所へ1本、ほかの送り先（2つ目のスイッチ・スイッチ無しの照明）へはそこから天井を渡す */
    if (pns.length && heads.length) { let pn = null, pd = 1e9, hk = 0; pns.forEach(d => { if (d.grp !== fgrp[f.i]) return; heads.forEach((h, k) => { const dd = man(d.l, h.l); if (dd < pd) { pd = dd; pn = d; hk = k; } }); });
      if (pn) { const h0 = heads[hk]; res.lenH += pd + Math.max(0, ch - 1.5);   // 分電盤から天井へ上がる分（前のKAKUと同じ） res.home.push({ pts: [pn.l].concat(leg(pn.l, h0.l, f.poly)) });
        heads.forEach((h, k) => { if (k === hk) return; res.lenH += man(h0.l, h.l) + h.drop; res.home.push({ pts: [h0.l].concat(leg(h0.l, h.l, f.poly)) }); }); }
      else res.far++; }
  });
  return res;
}
export const cableQty = (m, extra = 10) => Math.ceil(m * (1 + (+extra || 0) / 100) - 1e-9);
