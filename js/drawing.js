/* 図面の読み込み（JWW・DXF・PDF）。
 * 読み取りの中身は前のKAKUと同じ計算エンジン（js/kaku-engine.html、概算くん）をそのまま使う。
 * 読み取りの精度を変えないため、エンジンには手を入れない。ここでは読み取った区画を新しいKAKUの部屋にするだけ。 */

let enginePromise = null;
export function getEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = new Promise((resolve, reject) => {
    const f = document.createElement('iframe');
    f.title = '図面の読み取り'; f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(f);
    fetch('./js/kaku-engine.html').then(r => {
      if (!r.ok) throw new Error('図面の読み取りの部品を読み込めませんでした（' + r.status + '）');
      return r.text();
    }).then(html => {
      f.onload = () => {
        let n = 0;
        const t = setInterval(() => {
          const e = f.contentWindow && f.contentWindow.KakuEngine;
          if (e) { clearInterval(t); resolve(e); }
          else if (++n > 150) { clearInterval(t); reject(new Error('図面の読み取りの部品が起動しませんでした')); }
        }, 100);
      };
      f.srcdoc = html;
    }).catch(e => { enginePromise = null; reject(e); });
  });
  return enginePromise;
}

const q3 = v => Math.round(v * 1000) / 1000;

/* ファイルを読んで、保存できる形の図面（m単位）を返す */
export async function importDrawing(files) {
  const eng = await getEngine();
  const res = await eng.importFiles(files);
  const P = eng.plan();
  if (!P || !P.faces || !P.faces.length) {
    return { plan: null, message: (res && res.message) || '部屋の区画が見つかりませんでした' };
  }
  const plan = {
    segs: P.segs.map(s => s.map(q3)),
    dsegs: (P.dsegs || []).map(s => s.map(q3)),
    faces: P.faces.map(f => ({ i: f.i, name: f.name || '', area: f.area, peri: f.peri, ch: f.ch || 0, poly: f.poly.map(p => [q3(p[0]), q3(p[1])]) })),
    titles: (P.titles || []).slice(0, 40),
    unit: P.unit || '', scale: P.scale || ''
  };
  orderFaces(plan); plan.order = 2;
  return { plan, message: (res && res.message) || '読み込みました' };
}

/* 区画の番号（前のKAKUの KAKU_orderFaces と同じ）：横に離れた建物ごとにまとめ、その中で上の段から左→右の順 */
export function orderFaces(P) {
  const F = P.faces;
  F.forEach(f => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; f.poly.forEach(([x, y]) => { if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; }); f.bb = [a, b, c, d]; });
  const groups = []; let cur = null, end = -Infinity;
  [...F].sort((p, q) => p.bb[0] - q.bb[0]).forEach(f => { if (!cur || f.bb[0] > end + 0.05) { cur = []; groups.push(cur); end = f.bb[2]; } else end = Math.max(end, f.bb[2]); cur.push(f); });
  const order = [];
  groups.forEach(g => { g.sort((p, q) => q.bb[3] - p.bb[3]); const rows = []; g.forEach(f => { const r = rows.find(r => Math.abs(r.top - f.bb[3]) < 0.3); if (r) r.f.push(f); else rows.push({ top: f.bb[3], f: [f] }); }); rows.forEach(r => { r.f.sort((p, q) => p.bb[0] - q.bb[0]); order.push(...r.f); }); });
  order.forEach((f, k) => { f.no = k + 1; let x = 0, y = 0; f.poly.forEach(p => { x += p[0]; y += p[1]; }); f.cx = q3(x / f.poly.length); f.cy = q3(y / f.poly.length); delete f.bb; });
  P.faces = order;
}

/* 図面に書いてある天井高（面積の一番広い天井高） */
export function planCH(plan) {
  if (!plan || !plan.faces) return 0;
  const n = {};
  plan.faces.forEach(f => { const v = +f.ch || 0; if (v > 0) n[v] = (n[v] || 0) + Math.max(+f.area || 0, 0.01); });
  let best = 0, bn = 0;
  Object.keys(n).forEach(k => { const v = +k; if (n[k] > bn || (n[k] === bn && v > best)) { best = v; bn = n[k]; } });
  return best;
}

/* いくつかの区画を1部屋にまとめた時の面積と周長（前のKAKUの KAKU_groupGeom と同じ計算：
 * 面積は合計、周長は外まわり＝各区画の周長の合計 − 向かい合って接している辺の長さ×2） */
export function groupGeom(faces) {
  const r2 = v => Math.round((+v || 0) * 100) / 100;
  let area = 0, peri = 0;
  faces.forEach(f => { area += f.area; peri += f.peri; });
  const ccw = P => { let a = 0; for (let k = 0; k < P.length; k++) { const p = P[k], q = P[(k + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a < 0 ? P.slice().reverse() : P; };
  const E = faces.map(f => { const P = ccw(f.poly); return P.map((p, k) => [p, P[(k + 1) % P.length]]); });
  let shared = 0;
  for (let a = 0; a < E.length; a++) for (let b = a + 1; b < E.length; b++) E[a].forEach(([p, q]) => E[b].forEach(([u, v]) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 1e-6) return;
    const ex = dx / L, ey = dy / L; const ux = v[0] - u[0], uy = v[1] - u[1], L2 = Math.hypot(ux, uy); if (L2 < 1e-6) return;
    if (Math.abs(ex * uy / L2 - ey * ux / L2) > 0.02) return; if (ex * ux + ey * uy >= 0) return;
    if (ex * (u[1] - p[1]) - ey * (u[0] - p[0]) > 0.005) return; const dist = Math.abs((u[0] - p[0]) * ey - (u[1] - p[1]) * ex); if (dist > 0.04) return;
    const t1 = (u[0] - p[0]) * ex + (u[1] - p[1]) * ey, t2 = (v[0] - p[0]) * ex + (v[1] - p[1]) * ey;
    const ov = Math.min(L, Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2)); if (ov > 0) shared += ov;
  }));
  return { area: r2(area), perim: r2(Math.max(0, peri - 2 * shared)) };
}

/* 部屋にした区画のまとまりの中の「穴」（机・椅子・棚などで切れて、どの区画にも入らなかった所）を、床として数える（かつ「黒いところも床判定にしたい」）。
 * まとめた区画の形を細かいマスに塗り、図面の線を壁としてマスに描き、外（まわりのふち・ほかの区画）から線を越えずにたどれないマスを穴とする。
 * 机の線で囲まれた所（机の下）も穴になる。器具（便器・洗面台など）が入っている所と、床に面していない所（壁で囲まれた別の小部屋）は穴にしない。壁の2本線の間（壁の厚み）は細いので穴にしない（30cm 幅が取れない所は捨てる）。0.3㎡ 未満の穴も捨てる。
 * 戻り：{ area（穴の広さ ㎡）, cs（マスの大きさ m）, runs: [[x0, x1, y], …]（穴を横に並んだマスの帯で。絵に出す用） } */
export function roomHoles(faces, others = [], segs = [], fixtures = []) {
  const F = faces.filter(f => f && f.poly && f.poly.length >= 3);
  if (!F.length) return { area: 0, cs: 0, runs: [] };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  F.forEach(f => f.poly.forEach(q => { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }));
  const cs = Math.max(0.04, Math.max(x1 - x0, y1 - y0) / 600);
  x0 -= cs * 4; y0 -= cs * 4; x1 += cs * 4; y1 += cs * 4;
  const W = Math.ceil((x1 - x0) / cs), H = Math.ceil((y1 - y0) / cs);
  if (W * H > 4e6) return { area: 0, cs: 0, runs: [] };
  const g = new Uint8Array(W * H);   // 1＝まとめた区画、2＝ほかの区画、4＝線（壁・机の縁）
  const fill = (P, v, only) => {
    let py0 = Infinity, py1 = -Infinity; P.forEach(q => { if (q[1] < py0) py0 = q[1]; if (q[1] > py1) py1 = q[1]; });
    const r0 = Math.max(0, Math.floor((py0 - y0) / cs)), r1 = Math.min(H - 1, Math.ceil((py1 - y0) / cs));
    for (let r = r0; r <= r1; r++) {
      const y = y0 + (r + 0.5) * cs, xs = [];
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) { const c0 = Math.max(0, Math.ceil((xs[k] - x0) / cs - 0.5)), c1 = Math.min(W - 1, Math.floor((xs[k + 1] - x0) / cs - 0.5)); for (let c = c0; c <= c1; c++) { const id = r * W + c; if (!only || g[id] === 0) g[id] = v; } }
    }
  };
  F.forEach(f => fill(f.poly, 1));
  others.forEach(o => { if (!o || !o.poly || o.poly.length < 3) return; let ox0 = Infinity, ox1 = -Infinity, oy0 = Infinity, oy1 = -Infinity; o.poly.forEach(q => { ox0 = Math.min(ox0, q[0]); ox1 = Math.max(ox1, q[0]); oy0 = Math.min(oy0, q[1]); oy1 = Math.max(oy1, q[1]); });
    if (ox1 < x0 || ox0 > x1 || oy1 < y0 || oy0 > y1) return; if (ox0 <= x0 + cs * 5 && ox1 >= x1 - cs * 5 && oy0 <= y0 + cs * 5 && oy1 >= y1 - cs * 5) return; fill(o.poly, 2, true); });
  /* 線をマスに描く（まとめた区画・ほかの区画の上には描かない） */
  segs.forEach(sg => { const ax = sg[0], ay = sg[1], bx = sg[2], by = sg[3]; if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 || Math.min(ay, by) > y1) return;
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (cs * 0.5)));
    for (let t = 0; t <= n; t++) { const x = ax + (bx - ax) * t / n, y = ay + (by - ay) * t / n, c = Math.floor((x - x0) / cs), r = Math.floor((y - y0) / cs); if (c < 0 || r < 0 || c >= W || r >= H) continue; const id = r * W + c; if (g[id] === 0) g[id] = 4; } });
  /* 細いすき間（40cm 未満）でつながっている所もふさぐ：まとめた区画を 40cm 広げてから縮める */
  const k = Math.max(1, Math.round(0.4 / cs));
  const pass = (src, horiz, grow, kk) => { const out = new Uint8Array(W * H), n = horiz ? W : H, m = horiz ? H : W;
    for (let a = 0; a < m; a++) { const pre = new Int32Array(n + 1);
      for (let b = 0; b < n; b++) pre[b + 1] = pre[b] + (src[horiz ? a * W + b : b * W + a] === 1 ? 1 : 0);
      for (let b = 0; b < n; b++) { const lo = Math.max(0, b - kk), hi = Math.min(n - 1, b + kk), cnt = pre[hi + 1] - pre[lo];
        out[horiz ? a * W + b : b * W + a] = grow ? (cnt > 0 ? 1 : 0) : (cnt === 2 * kk + 1 ? 1 : 0); } }
    return out; };
  const m1 = new Uint8Array(W * H); for (let id = 0; id < W * H; id++) m1[id] = g[id] === 1 ? 1 : 0;
  const closed = pass(pass(pass(pass(m1, true, true, k), false, true, k), true, false, k), false, false, k);
  for (let id = 0; id < W * H; id++) if (closed[id] === 1 && g[id] === 0) g[id] = 3;
  /* まわりのふちと「ほかの区画」から、線を越えずにたどる */
  const st = [];
  for (let c = 0; c < W; c++) st.push(c, (H - 1) * W + c);
  for (let r = 0; r < H; r++) st.push(r * W, r * W + W - 1);
  for (let id = 0; id < W * H; id++) if (g[id] === 2) st.push(id);
  const seen = new Uint8Array(W * H);
  while (st.length) { const id = st.pop(); if (seen[id] || g[id] === 1 || g[id] === 3 || g[id] === 4) continue; seen[id] = 1; const r = (id / W) | 0, c = id - r * W;
    if (c > 0) st.push(id - 1); if (c < W - 1) st.push(id + 1); if (r > 0) st.push(id - W); if (r < H - 1) st.push(id + W); }
  /* 穴の候補（たどれなかった空きのマス）。つながりごとに、30cm 幅が取れて 0.3㎡ 以上の物だけ穴にする */
  const cand = new Uint8Array(W * H); for (let id = 0; id < W * H; id++) cand[id] = (g[id] === 0 || g[id] === 3) && !seen[id] ? 1 : 0;
  const k2 = Math.max(1, Math.round(0.15 / cs)), core = pass(pass(cand, true, false, k2), false, false, k2);
  const lab = new Int32Array(W * H), ok = [false], sizes = [0];
  for (let id = 0; id < W * H; id++) { if (!cand[id] || lab[id]) continue; const L = sizes.length; let cnt = 0, fat = false; const q = [id]; lab[id] = L;
    while (q.length) { const c0 = q.pop(); cnt++; if (core[c0]) fat = true; const r = (c0 / W) | 0, c = c0 - r * W;
      for (const nb of [c > 0 ? c0 - 1 : -1, c < W - 1 ? c0 + 1 : -1, r > 0 ? c0 - W : -1, r < H - 1 ? c0 + W : -1]) if (nb >= 0 && !lab[nb] && cand[nb]) { lab[nb] = L; q.push(nb); } }
    sizes.push(cnt); ok.push(fat && cnt * cs * cs >= 0.3); }
  /* 部屋の床に面していない穴（壁で囲まれた別の小部屋・パイプスペースなど）は数えない。
     穴のまわり 5マスのうち、線と細い所（壁の厚み）以外のマスの 3割以上がまとめた区画（床）である物だけ。机は机の縁の線の向こうがすぐ床 */
  { /* 線1本をはさんで隣り合う穴（机の中の仕切りで分かれた所）は1つのかたまりとして見る */
    const par = sizes.map((_, i) => i), fd = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (let id = 0; id < W * H; id++) { if (g[id] !== 4) continue; const r = (id / W) | 0, c = id - r * W; let a = 0;
      for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= H || cc >= W) continue; const L = lab[rr * W + cc]; if (!L || !ok[L]) continue; if (!a) a = L; else { const x = fd(a), y = fd(L); if (x !== y) par[x] = y; } } }
    const tot = new Float64Array(sizes.length), flo = new Float64Array(sizes.length), R = 5;
    for (let id = 0; id < W * H; id++) { const L = lab[id]; if (!L) continue; const P = fd(L), r = (id / W) | 0, c = id - r * W;
      if (c > 0 && c < W - 1 && r > 0 && r < H - 1 && lab[id - 1] === L && lab[id + 1] === L && lab[id - W] === L && lab[id + W] === L) continue;   // ふちのマスだけ見る
      for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= H || cc >= W) continue; const j = rr * W + cc; if (g[j] === 4 || (lab[j] && (!ok[lab[j]] || fd(lab[j]) === P))) continue; tot[P]++; if (g[j] === 1 || g[j] === 3) flo[P]++; } }
    for (let L = 1; L < sizes.length; L++) { const P = fd(L); if (ok[L] && !(tot[P] > 0 && flo[P] / tot[P] >= 0.3)) ok[L] = false; } }
  /* 器具（便器・洗面台など）の中心が入る穴は数えない（器具の下は今まで通り床にしない。現場トイレの数字を変えないため） */
  fixtures.forEach(x => { if (!x || !x.b || x.t === 'other') return; const c = Math.floor(((x.b[0] + x.b[2]) / 2 - x0) / cs), r = Math.floor(((x.b[1] + x.b[3]) / 2 - y0) / cs); if (c < 0 || r < 0 || c >= W || r >= H) return; const L = lab[r * W + c]; if (L > 0) ok[L] = false; });
  const runs = []; let n = 0;
  for (let r = 0; r < H; r++) { let s0 = -1; for (let c = 0; c <= W; c++) { const hole = c < W && lab[r * W + c] > 0 && ok[lab[r * W + c]]; if (hole) { n++; if (s0 < 0) s0 = c; } else if (s0 >= 0) { runs.push([+(x0 + s0 * cs).toFixed(3), +(x0 + c * cs).toFixed(3), +(y0 + r * cs).toFixed(3)]); s0 = -1; } } }
  return { area: Math.round(n * cs * cs * 100) / 100, cs: +cs.toFixed(4), runs };
}
