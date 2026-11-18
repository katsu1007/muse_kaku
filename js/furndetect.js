/* 家具（机・椅子など）の検出 — 図面の線から「形の集まり」を切り出して特徴を出す。
 * 器具の読み取り（js/legacy.js、衛生器具が対象）とは別に、線の集まりを端点の近さでつなぎ、
 * 外形・曲線の割合・閉じ具合・内側の線の本数を数える。判定（何であるか）は js/symdict.js が行い、
 * ここでは幾何の特徴だけを返す。壁のように図面全体につながる線は巨大な集まりになるので、
 * 大きさで候補から外れる。交点で交わるだけの線（机の上に乗る椅子など）はつながったと見ない
 * （端点同士の近さだけでつなぐ）ので、重なっていても別々の形として残る。 */

const TOL = 0.045;   /* 端点同士を「つながっている」と見る距離（m） */
const CELL = 0.05;   /* 空間グリッドの一辺（m） */
const SHORT_SEG = 0.08; /* これより短い線は「曲線の近似」と見る長さ（m）。円弧はエンジンが短い線の連なりで渡してくる */

const q3 = v => Math.round(v * 1000) / 1000;

/* segs: [[x1,y1,x2,y2], ...]（m）。fixtures: [{ b:[x0,y0,x1,y1] }]、doors: [{ c:[x,y], r }]。
 * 戻り値: [{ b, short, long, arcShare, closed, dividers, n }]（short/long は mm、b は m） */
export function detectFurniture(segs, fixtures = [], doors = []) {
  const S = (segs || []).filter(s => s && s.length >= 4 && (Math.abs(s[2] - s[0]) > 1e-9 || Math.abs(s[3] - s[1]) > 1e-9));
  const n = S.length;
  if (!n) return [];

  /* 端点の近さで線をつなぐ（union-find） */
  const par = new Int32Array(n);
  for (let i = 0; i < n; i++) par[i] = i;
  const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
  const ends = []; /* {x, y, seg, pair} pair=別の線の端点と近かった印 */
  const grid = new Map();
  const cellOf = (x, y) => Math.floor(x / CELL) + ':' + Math.floor(y / CELL);
  S.forEach((s, i) => {
    [[s[0], s[1]], [s[2], s[3]]].forEach(([x, y]) => {
      const e = { x, y, seg: i, pair: false };
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const arr = grid.get(gx + ':' + gy); if (!arr) continue;
        for (const o of arr) {
          const dx = o.x - x, dy = o.y - y;
          if (dx * dx + dy * dy <= TOL * TOL) { union(i, o.seg); e.pair = true; o.pair = true; }
        }
      }
      const k = cellOf(x, y);
      let arr = grid.get(k); if (!arr) { arr = []; grid.set(k, arr); }
      arr.push(e); ends.push(e);
    });
  });

  /* つながった集まりごとに特徴を出す */
  const comp = new Map();
  for (let i = 0; i < n; i++) { const r = find(i); let a = comp.get(r); if (!a) { a = []; comp.set(r, a); } a.push(i); }
  const pairOf = new Map(); /* seg -> [つながった端点数, 端点総数] */
  ends.forEach(e => { const a = pairOf.get(e.seg) || [0, 0]; a[1]++; if (e.pair) a[0]++; pairOf.set(e.seg, a); });

  const cands = [];
  for (const idxs of comp.values()) {
    if (idxs.length < 3 || idxs.length > 400) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, len = 0, shortLen = 0, paired = 0, endTotal = 0;
    for (const i of idxs) {
      const s = S[i];
      x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]);
      y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]);
      const L = Math.hypot(s[2] - s[0], s[3] - s[1]);
      len += L; if (L < SHORT_SEG) shortLen += L;
      const pr = pairOf.get(i); paired += pr[0]; endTotal += pr[1];
    }
    const w = x1 - x0, h = y1 - y0, short = Math.min(w, h), long = Math.max(w, h);
    if (short < 0.28 || short > 2.0 || long < 0.28 || long > 7.2) continue;
    const pairRatio = endTotal ? paired / endTotal : 0;
    if (pairRatio < 0.5) continue; /* 端点が半分もつながっていない形は、ばらけた線の集まりと見る */
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    /* 器具として拾われている物はそちらに任せる（二重に出さない） */
    let dup = false;
    for (const f of fixtures || []) {
      if (!f || !f.b) continue;
      const fx0 = Math.min(f.b[0], f.b[2]) - 0.06, fx1 = Math.max(f.b[0], f.b[2]) + 0.06;
      const fy0 = Math.min(f.b[1], f.b[3]) - 0.06, fy1 = Math.max(f.b[1], f.b[3]) + 0.06;
      if (cx >= fx0 && cx <= fx1 && cy >= fy0 && cy <= fy1) { dup = true; break; }
      const ix = Math.max(0, Math.min(x1, fx1 - 0.06) - Math.max(x0, fx0 + 0.06)), iy = Math.max(0, Math.min(y1, fy1 - 0.06) - Math.max(y0, fy0 + 0.06));
      const area = w * h, iou = (ix * iy) / (area + (fx1 - fx0) * (fy1 - fy0) - ix * iy || 1);
      if (iou > 0.35) { dup = true; break; }
    }
    if (dup) continue;
    /* ドア（扉の線＋開く円弧）の近くは椅子などと間違えやすいので出さない */
    let doorNear = false;
    for (const dr of doors || []) {
      if (!dr || !dr.c) continue;
      const r = (+dr.r || 0.8) + 0.2;
      if (Math.hypot(cx - dr.c[0], cy - dr.c[1]) < r) { doorNear = true; break; }
      if (dr.m && Math.hypot(cx - dr.m[0], cy - dr.m[1]) < r * 0.7) { doorNear = true; break; }
    }
    if (doorNear) continue;
    cands.push({
      b: [q3(x0), q3(y0), q3(x1), q3(y1)],
      short: Math.round(short * 1000), long: Math.round(long * 1000),
      arcShare: len > 0 ? Math.round(Math.min(1, shortLen / len) * 100) / 100 : 0,
      closed: pairRatio >= 0.75,
      pairRatio: Math.round(pairRatio * 100) / 100,
      dividers: 0, inner: 0, cross: false, n: idxs.length, members: new Set(idxs)
    });
    if (cands.length >= 800) break;
  }

  /* 内側の線（分割線・中心の十字など）を数える。候補の外形の中にすっぽり入る線だけを見る */
  if (cands.length) {
    const inset = 0.02;
    for (let i = 0; i < n; i++) {
      const s = S[i];
      const mx = (s[0] + s[2]) / 2, my = (s[1] + s[3]) / 2;
      for (const c of cands) {
        if (mx < c.b[0] || mx > c.b[2] || my < c.b[1] || my > c.b[3]) continue;
        const inside = s[0] > c.b[0] + inset && s[0] < c.b[2] - inset && s[2] > c.b[0] + inset && s[2] < c.b[2] - inset &&
                       s[1] > c.b[1] + inset && s[1] < c.b[3] - inset && s[3] > c.b[1] + inset && s[3] < c.b[3] - inset;
        if (!inside) continue;
        /* 中心を通る十字（通り芯の丸印など）は家具ではない印。輪郭につながっている場合もあるので、集まりの中の線も見る */
        const ccx = (c.b[0] + c.b[2]) / 2, ccy = (c.b[1] + c.b[3]) / 2;
        const horiz = Math.abs(s[3] - s[1]) < 0.02 && Math.abs(my - ccy) < 0.05 && Math.abs(s[2] - s[0]) > (c.b[2] - c.b[0]) * 0.7;
        const vert = Math.abs(s[2] - s[0]) < 0.02 && Math.abs(mx - ccx) < 0.05 && Math.abs(s[3] - s[1]) > (c.b[3] - c.b[1]) * 0.7;
        if (horiz) c.crossH = true;
        if (vert) c.crossV = true;
        if (c.members.has(i)) { c.inner++; continue; }
        c.dividers++;
      }
    }
    for (const c of cands) {
      c.cross = !!(c.crossH && c.crossV);
      delete c.crossH; delete c.crossV; delete c.members;
      c.dividers = Math.min(99, c.dividers);
    }
  }

  /* 円だけの形（通り芯の丸印・丸い記号）は、内側に自分の線が無い・中心に十字がある場合は家具と見ない */
  return cands.filter(c => !(c.arcShare >= 0.85 && c.inner === 0) && !(c.cross && c.arcShare >= 0.6)).slice(0, 500)
    .map(c => ({ b: c.b, short: c.short, long: c.long, arcShare: c.arcShare, closed: c.closed, dividers: c.dividers, n: c.n }));
}
