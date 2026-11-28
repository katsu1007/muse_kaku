/* 垂れ壁（下がり壁）の読み取り — 図面の注記「上部：垂れ壁 H=600」「垂壁H300」などから
 * 下がり寸法を読み、扉の無い開口（js/legacy.js の openScan が見つけた物）のうち、
 * 注記が指している区間を探す。数量の決め方（2026-11-28 村中さんの決定）：
 * 垂れ壁の数量 ＝ 壁の長さ × 下がり寸法（H=600 なら 0.6m）。天井までの全面では数えない。
 * その区間は開口として全高を引かず、下がり寸法ぶんだけ壁として数える
 * （部屋の数量への反映は js/legacy.js の roomOpenRuns → js/calc.js の roomGeom）。
 *
 * 注記と線の対応は図面ごとに曖昧になりやすい（注記が開口から離れた所に書かれる、
 * 近くに開口が複数ある、家具の輪郭が開口に見える等）。決め打ちせず、
 * はっきり決まる物だけ linked にし、残りは理由付きで unresolved に返す
 * （呼び出し側＝project.js が要確認リストに出す）。
 *
 * 候補の絞り方（実測で決めた。江南・日本モウルドの注記6件で検証）：
 *  - 扉の無い開口ランを、端点が近く向きが近い物同士で「鎖」につなぐ（面ごとに分かれた
 *    同じ開口を1つに見るため）
 *  - 鎖の長さ 0.8m 以上
 *  - その鎖が「壁の線の上」にあること：面の輪郭のうち鎖と同じ直線にある部分が、
 *    鎖の外側にも 0.4m 以上続いている（家具の輪郭の欠けは続きが無いので外れる）。
 *    ただし鎖が 1.8m 以上の長い物は、壁が全面開口で輪郭の続きが無い場合もあるので通す
 *  - 注記から 2m 以内で一番近く、2番目との差が 0.5m 以上
 *  - 同じ面に、採用候補より長い候補が 3m 以内にある時は「範囲が決められない」として外す
 *    （L字に開いた開口の途中だけを拾わないため） */

const KW = /垂れ壁|垂壁|下がり壁|下り壁/;
const z2h = s => String(s || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

/* 注記の文字列から下がり寸法（m）を読む。キーワードが無ければ null。
 * キーワードはあるが寸法が読めない時は { drop: 0 }（要確認行き）。
 * 書き方の区別（調査メモ 2026-11-24）：「H=600」「垂壁H300」「天井-500」「(-500)」は
 * いずれも「天井からどれだけ下がっているか」の寸法として扱う */
export function parseHangNote(text) {
  const t = z2h(text);
  if (!KW.test(t)) return null;
  let m = null;
  if ((m = t.match(/天井\s*[-−ー－]\s*(\d{2,4})/))) return { drop: +m[1] / 1000, how: '天井-' };
  if ((m = t.match(/[HＨ]\s*[=＝]\s*(\d{2,4})/))) return { drop: +m[1] / 1000, how: 'H=' };
  if ((m = t.match(/[HＨ]\s*(\d{2,4})/))) return { drop: +m[1] / 1000, how: 'H' };
  if ((m = t.match(/[-−ー－(（]\s*(\d{2,4})/))) return { drop: +m[1] / 1000, how: '括弧' };
  return { drop: 0, how: '' };
}

const dPt = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const dSeg = (px, py, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  let t = L2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(a[0] + dx * t - px, a[1] + dy * t - py);
};

/* 扉の無い開口ラン（open[faceIdx] の ty!=='d'）を、つながった鎖に寄せる。
 * 寄せる条件：端点同士が 0.35m 以内 かつ 向きの差 12° 以内。
 * 戻り値：[{ a, b, len（区間の張り）, runs: [{fi, ri, a, b, len}] }] */
export function hangChains(open) {
  const runs = [];
  Object.entries(open || {}).forEach(([fi, rs]) => (rs || []).forEach((x, ri) => {
    if (x && x.ty !== 'd' && x.a && x.b) runs.push({ fi: +fi, ri, a: x.a, b: x.b, len: +x.len || dPt(x.a, x.b) });
  }));
  const dirv = r => { const dx = r.b[0] - r.a[0], dy = r.b[1] - r.a[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
  const par = runs.map(() => -1);
  const find = i => par[i] === -1 ? i : (par[i] = find(par[i]));
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    const A = runs[i], B = runs[j], ua = dirv(A), ub = dirv(B);
    if (Math.abs(ua[0] * ub[1] - ua[1] * ub[0]) > 0.21) continue;
    if (Math.min(dPt(A.a, B.a), dPt(A.a, B.b), dPt(A.b, B.a), dPt(A.b, B.b)) > 0.35) continue;
    const ri = find(i), rj = find(j); if (ri !== rj) par[ri] = rj;
  }
  const groups = new Map();
  runs.forEach((r, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
  return [...groups.values()].map(rs => {
    const u = dirv(rs[0]), p0 = rs[0].a;
    let lo = Infinity, hi = -Infinity;
    rs.forEach(r => [r.a, r.b].forEach(p => { const t = (p[0] - p0[0]) * u[0] + (p[1] - p0[1]) * u[1]; lo = Math.min(lo, t); hi = Math.max(hi, t); }));
    return { a: [p0[0] + u[0] * lo, p0[1] + u[1] * lo], b: [p0[0] + u[0] * hi, p0[1] + u[1] * hi], len: hi - lo, runs: rs };
  });
}

/* 鎖が壁の線の上にある度合い：鎖の各ランについて、そのランの面の輪郭のうち
 * ランと同じ直線（±0.05m・向き 3° 以内）にある辺を集め、ランの区間の外側
 * （前後 2.5m 以内）にどれだけ続いているか（m）。一番大きいランの値を返す。
 * 家具の輪郭の欠けは、輪郭がその直線からすぐ離れるので 0 になる */
export function chainStretch(chain, faces) {
  const byI = new Map((faces || []).map(f => [f.i, f]));
  let best = 0;
  for (const run of chain.runs) {
    const f = byI.get(run.fi);
    if (!f || !f.poly || f.poly.length < 3) continue;
    const dx = run.b[0] - run.a[0], dy = run.b[1] - run.a[1], L = Math.hypot(dx, dy);
    if (!(L > 0)) continue;
    const ux = dx / L, uy = dy / L;
    const tOf = p => (p[0] - run.a[0]) * ux + (p[1] - run.a[1]) * uy;
    const dOf = p => Math.abs((p[0] - run.a[0]) * -uy + (p[1] - run.a[1]) * ux);
    const ivs = [];
    for (let k = 0; k < f.poly.length; k++) {
      const A = f.poly[k], B = f.poly[(k + 1) % f.poly.length];
      if (Math.max(dOf(A), dOf(B)) > 0.05) continue;
      const el = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (el < 1e-6) continue;
      if (Math.abs((B[0] - A[0]) / el * uy - (B[1] - A[1]) / el * ux) > 0.05) continue;
      ivs.push([Math.min(tOf(A), tOf(B)), Math.max(tOf(A), tOf(B))]);
    }
    if (!ivs.length) continue;
    /* 区間 [-2.5, L+2.5] の被覆から、ラン自身 [0, L] の被覆を引く */
    const covered = (w0, w1) => {
      const cl = ivs.map(([a, b]) => [Math.max(a, w0), Math.min(b, w1)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
      let sum = 0, ce = null;
      for (const [a, b] of cl) { if (ce === null || a > ce) { sum += b - a; ce = b; } else if (b > ce) { sum += b - ce; ce = b; } }
      return sum;
    };
    best = Math.max(best, covered(-2.5, L + 2.5) - covered(0, L));
  }
  return best;
}

/* 注記と開口を結び付ける。texts: [{t, x, y}]、open: legacy の openScan の結果、
 * faces: plan.faces。戻り値 { linked, unresolved }：
 *  linked: [{ text, x, y, drop, len, area, a, b, runs: [{fi, ri, len}] }]
 *    （len はランの長さの合計＝数量に使う長さ、area = len × drop）
 *  unresolved: [{ text, x, y, drop, reason }]（要確認リスト用） */
export function analyzeHangWalls({ texts = [], open = {}, faces = [] } = {}) {
  const notes = [];
  (texts || []).forEach(t => {
    if (!t || typeof t.t !== 'string') return;
    const p = parseHangNote(t.t);
    if (p) notes.push({ text: t.t, x: +t.x || 0, y: +t.y || 0, drop: p.drop });
  });
  const linked = [], unresolved = [];
  if (!notes.length) return { linked, unresolved };
  const chains = hangChains(open).map(c => ({ ...c, stretch: chainStretch(c, faces) }));
  const isCand = c => c.len >= 0.8 && (c.stretch >= 0.4 || c.len >= 1.8);
  const dist = (n, c) => Math.min(...c.runs.map(r => dSeg(n.x, n.y, r.a, r.b)));
  const claimed = new Set();
  for (const n of notes) {
    if (!(n.drop > 0)) { unresolved.push({ ...n, reason: '下がり寸法（H=○○など）が読めませんでした' }); continue; }
    if (n.drop < 0.03 || n.drop > 3) { unresolved.push({ ...n, reason: '下がり寸法が想定の範囲（30〜3000mm）から外れています' }); continue; }
    const cs = chains.filter(isCand).map(c => ({ c, d: dist(n, c) })).filter(q => q.d <= 3).sort((p, q) => p.d - q.d);
    const near = cs.filter(q => q.d <= 2);
    if (!near.length) { unresolved.push({ ...n, reason: '近く（2m以内）に、壁の線の上にある扉の無い開口が見つかりませんでした' }); continue; }
    const [b1, b2] = near;
    if (b2 && b2.d - b1.d < 0.5) { unresolved.push({ ...n, reason: '候補の開口が2つあり、どちらか決められませんでした' }); continue; }
    const facesOf = new Set(b1.c.runs.map(r => r.fi));
    if (cs.some(q => q.c !== b1.c && q.c.len > b1.c.len && q.c.runs.some(r => facesOf.has(r.fi)))) {
      unresolved.push({ ...n, reason: '同じ壁に長い開口もあり、垂れ壁の範囲が決められませんでした' }); continue;
    }
    const keys = b1.c.runs.map(r => r.fi + ':' + r.ri);
    if (keys.some(k => claimed.has(k))) { unresolved.push({ ...n, reason: '同じ開口を指す注記が他にもあります' }); continue; }
    keys.forEach(k => claimed.add(k));
    const len = Math.round(b1.c.runs.reduce((s, r) => s + r.len, 0) * 100) / 100;
    linked.push({
      text: n.text, x: n.x, y: n.y, drop: n.drop, len,
      area: Math.round(len * n.drop * 100) / 100,
      a: b1.c.a, b: b1.c.b,
      runs: b1.c.runs.map(r => ({ fi: r.fi, ri: r.ri, len: r.len })),
    });
  }
  return { linked, unresolved };
}
