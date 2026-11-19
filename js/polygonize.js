/* 自前の輪郭化（クリーンルーム実装）と、エンジン区画への「補足区画」。
 *
 * 背景（2026-11-19、~/workspace/kaku/work/polygonize/SPEC.md の天井測定）：
 * 図面の線はファイルに揃っているのに床として拾えていない所がある。原因は輪郭化の
 * 弱さではなく、現行パイプラインがレイヤー判定で線を上流で捨てていること。
 * そこで、エンジン（old/index.html）は触らず、アプリ側で線を全部使って輪郭化し、
 * エンジン区画と重ならない物だけを「補足区画」として足す（fixrescue と同じ型）。
 *
 * 実装は SPEC と一般的な平面グラフの考え方から自前で書いた（GEOS/Shapely/JTS の
 * ソースは読んでいない・写していない。検証役の Shapely は工房内だけに残す）：
 *   1) 線を全部集める（レイヤーで事前に捨てない。器具の内側の線だけ除く）
 *   2) 全ての交点で線を割る（ノーディング）
 *   3) 近い端点を寄せる（主目的は円弧の細分で膨れた端点の統合。SPEC の測定では
 *      100mm は本物の接続も切る危険域だったので、寄せは 10mm に留める）
 *   4) 平面グラフを作り、辺の左側の面をたどって最小の輪を抜く
 *   5) 選別：細長すぎる物・表/ラベル帯の中の物・エンジン区画と重なる物を落とす
 *
 * 第1段階の位置づけ（重要）：補足区画は表示と部屋の見分け（roomjudge）だけに使う。
 * 部屋・ゾーン・見積の入力には入れない（plan.faces には混ぜず、別の置き場所に持つ）。
 * 座標はメートル、図面の向きのまま。
 *
 * 補足の作り方（実図面での測定を経て決めた形）：
 * ・輪郭化の入力には、エンジン区画のふちも「切り目」として足す。エンジン区画と
 *   またがる輪は切り目で割れるので、残るのはエンジンの外の部分だけになり、
 *   「大きな輪が既存区画を包むから丸ごと捨てる」無駄が無くなる（実測では、トイレの
 *   輪が小さいエンジン断片を包むせいで全部落ちていた）。
 * ・最後に「根拠のある輪」だけ残す：器具・部屋名の文字・ドアの点のどれかが中にある
 *   輪だけを補足にする（近さだけの輪は入れない。理由は supplementFaces の注記）。
 *   根拠の無い輪は、どう判定しても「まだ分からない」にしかならず、件数の水増しになる。 */

import { classify, joinTexts } from './reader2/text.js';

/* 2つの多角形の重なり面積（㎡）。境界の内側部分だけを拾って靴紐公式で足す方式。
 * 片方がもう片方にすっぽり入っている場合も、境界が交わらないので正しく出る。 */
export function overlapArea(A, B) {
  if (!A || !B || A.length < 3 || B.length < 3) return 0;
  const ccw = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s >= 0 ? P : [...P].reverse(); };
  const P = ccw(A), Q = ccw(B);
  const pip = (x, y, R) => { let c = false; for (let i = 0, j = R.length - 1; i < R.length; j = i++) { const a = R[i], b = R[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  let s = 0;
  /* 重なりの境界は「P の辺のうち Q の中にある部分」と「Q の辺のうち P の中にある部分」で
   * できている。ただし辺どうしが重なっている部分は両方に出てきて二重に数えてしまうので、
   * P 側は内側へ僅かにずらして（含める）、Q 側は「P の境界の真上にある部分は除く」厳密な
   * 内側判定にして、重なった辺は P 側からだけ数える */
  const distPtSeg = (x, y, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)) : 0;
    return Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t));
  };
  const strictIn = (x, y, S) => {
    for (let k = 0; k < S.length; k++) if (distPtSeg(x, y, S[k], S[(k + 1) % S.length]) < 1e-7) return false;
    return pip(x, y, S);
  };
  const addPortions = (R, S, side) => {
    for (let i = 0; i < R.length; i++) {
      const p = R[i], q = R[(i + 1) % R.length];
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const ts = [0, 1];
      for (let k = 0; k < S.length; k++) {
        const r = S[k], g = S[(k + 1) % S.length];
        const ex = g[0] - r[0], ey = g[1] - r[1];
        const den = dx * ey - dy * ex; if (Math.abs(den) < 1e-15) continue;
        const rx = r[0] - p[0], ry = r[1] - p[1];
        const t = (rx * ey - ry * ex) / den, u = (rx * dy - ry * dx) / den;
        if (t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) ts.push(t);
      }
      ts.sort((a, b) => a - b);
      const nl = Math.hypot(dx, dy) || 1, nx = -dy / nl * 1e-6, ny = dx / nl * 1e-6;
      for (let k = 0; k < ts.length - 1; k++) {
        const t0 = ts[k], t1 = ts[k + 1]; if (t1 - t0 < 1e-12) continue;
        const mx = p[0] + dx * (t0 + t1) / 2, my = p[1] + dy * (t0 + t1) / 2;
        if (side > 0 ? !pip(mx + nx, my + ny, S) : !strictIn(mx, my, S)) continue;
        const ax = p[0] + dx * t0, ay = p[1] + dy * t0, bx = p[0] + dx * t1, by = p[1] + dy * t1;
        s += ax * by - bx * ay;
      }
    }
  };
  addPortions(P, Q, 1); addPortions(Q, P, -1);
  return Math.abs(s) / 2;
}

const shoe = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const perim = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; };
const centroidOf = P => {
  let s = 0, cx = 0, cy = 0;
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const w = a[0] * b[1] - b[0] * a[1]; s += w; cx += (a[0] + b[0]) * w; cy += (a[1] + b[1]) * w; }
  if (Math.abs(s) < 1e-12) { let x = 0, y = 0; P.forEach(q => { x += q[0]; y += q[1]; }); return [x / P.length, y / P.length]; }
  return [cx / (3 * s), cy / (3 * s)];
};
const pipPt = (pt, P) => { let c = false; const x = pt[0], y = pt[1]; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

/* 輪の「内側の太さ」：格子で内側を塗り、壁から一番遠い内側のマスまでの距離（m）を返す。
 * 周長の比（2×面積÷周長）では、境界が細かく折れる実物の輪（本物の床）まで落ちてしまう
 * ため、太さは格子で直接測る。壁の帯（厚さ 0.35m 以下）は 0.2m 未満になる */
export function innerWidth(P, holes = []) {
  const rings = [P, ...(holes || [])].filter(r => r && r.length >= 3);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (const q of r) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const bw = x1 - x0, bh = y1 - y0;
  if (!(bw > 0) || !(bh > 0)) return 0;
  let step = 0.1;
  if (bw * bh > 120) step = 0.2; else if (bw * bh > 30) step = 0.15;
  const W = Math.max(1, Math.ceil(bw / step)), H = Math.max(1, Math.ceil(bh / step));
  if (W * H > 400000) return Infinity; /* 大きすぎる輪は格子で測らず、太さでは落とさない */
  const inside = new Uint8Array(W * H);
  for (let row = 0; row < H; row++) {
    const y = y0 + (row + 0.5) * step;
    const cross = [];
    for (const r of rings) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      if ((a[1] > y) !== (b[1] > y)) cross.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    cross.sort((p, q) => p - q);
    for (let k = 0; k + 1 < cross.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((cross[k] - x0) / step - 0.5)), c1 = Math.min(W - 1, Math.floor((cross[k + 1] - x0) / step - 0.5));
      for (let c = c0; c <= c1; c++) inside[row * W + c] = 1;
    }
  }
  const dist = new Int32Array(W * H).fill(-1);
  const queue = [];
  for (let i = 0; i < W * H; i++) {
    if (!inside[i]) continue;
    const x = i % W, y = (i / W) | 0;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || !inside[i - 1] || !inside[i + 1] || !inside[i - W] || !inside[i + W]) { dist[i] = 1; queue.push(i); }
  }
  let head = 0, max = 0;
  while (head < queue.length) {
    const c = queue[head++], d = dist[c]; if (d > max) max = d;
    const x = c % W, y = (c / W) | 0;
    if (x > 0 && inside[c - 1] && dist[c - 1] < 0) { dist[c - 1] = d + 1; queue.push(c - 1); }
    if (x < W - 1 && inside[c + 1] && dist[c + 1] < 0) { dist[c + 1] = d + 1; queue.push(c + 1); }
    if (y > 0 && inside[c - W] && dist[c - W] < 0) { dist[c - W] = d + 1; queue.push(c - W); }
    if (y < H - 1 && inside[c + W] && dist[c + W] < 0) { dist[c + W] = d + 1; queue.push(c + W); }
  }
  return Math.max(0, (max - 0.5) * step);
}

/* 線の集まりから閉じた輪（面）を抜く。戻り値：[{ poly（外側の輪・反時計回り）, area（穴を引いた㎡）, peri, holes }]
 * snap：端点を寄せる距離（m）。細分の統合が主目的で、隙間を埋める用途には使わない。 */
export function polygonizeFaces(segs, { snap = 0.01 } = {}) {
  /* 1) 端点を寄せて頂点表を作る（格子のキーは数値にして速くする） */
  const nodes = [];
  const ngrid = new Map();
  const nodeFor = (x, y) => {
    const cx = Math.floor(x / snap), cy = Math.floor(y / snap);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const lst = ngrid.get((cx + a + 32768) * 65536 + (cy + b + 32768)); if (!lst) continue;
      for (const id of lst) { const dx = nodes[id][0] - x, dy = nodes[id][1] - y; if (dx * dx + dy * dy <= snap * snap) return id; }
    }
    const id = nodes.length; nodes.push([x, y]);
    const k = (cx + 32768) * 65536 + (cy + 32768); if (!ngrid.has(k)) ngrid.set(k, []); ngrid.get(k).push(id);
    return id;
  };
  const raw = [];
  for (const s of segs || []) {
    if (!s) continue;
    const a = nodeFor(s[0], s[1]), b = nodeFor(s[2], s[3]);
    if (a !== b) raw.push([a, b]);
  }
  if (!raw.length) return [];

  /* 2) 交点で線を割る。交点（既存の頂点でない物）は座標で一意に登録する */
  const cross = new Map();
  const crossNode = (x, y) => {
    const k = `${Math.round(x * 1e5)},${Math.round(y * 1e5)}`;
    if (cross.has(k)) return cross.get(k);
    const id = nodes.length; nodes.push([x, y]); cross.set(k, id);
    return id;
  };
  const splits = raw.map(() => new Map());
  const addSplit = (i, t, node) => { const k = Math.round(t * 1e7); const m = splits[i]; if (!m.has(k)) m.set(k, { t, node }); };
  /* 交わり得る相手は格子（1m）で絞る。同じ相手を二度調べないための印（stamp）と、
   * 外枠が重ならない相手を最初に落とすことで、密な図面でも現実的な速さにする */
  const CS = 1;
  const cells = new Map();
  const sb = raw.map(([a, b]) => {
    const A = nodes[a], B = nodes[b];
    return [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[0], B[0]), Math.max(A[1], B[1])];
  });
  raw.forEach((_, i) => {
    const [x0r, y0r, x1r, y1r] = sb[i];
    const x0 = Math.floor(x0r / CS), x1 = Math.floor(x1r / CS), y0 = Math.floor(y0r / CS), y1 = Math.floor(y1r / CS);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const k = (cx + 2048) * 4096 + (cy + 2048); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(i); }
  });
  const stamp = new Int32Array(raw.length);
  raw.forEach(([a1, b1], i) => {
    const [x0r, y0r, x1r, y1r] = sb[i];
    const x0 = Math.floor(x0r / CS), x1 = Math.floor(x1r / CS), y0 = Math.floor(y0r / CS), y1 = Math.floor(y1r / CS);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) for (const j of cells.get((cx + 2048) * 4096 + (cy + 2048)) || []) {
      if (j <= i || stamp[j] === i + 1) continue;
      stamp[j] = i + 1;
      const bj = sb[j];
      if (bj[0] > x1r || bj[2] < x0r || bj[1] > y1r || bj[3] < y0r) continue;
      const [a2, b2] = raw[j];
      const p = nodes[a1], q = nodes[b1], r = nodes[a2], s2 = nodes[b2];
      const d1x = q[0] - p[0], d1y = q[1] - p[1], d2x = s2[0] - r[0], d2y = s2[1] - r[1];
      const L1 = Math.hypot(d1x, d1y), L2 = Math.hypot(d2x, d2y);
      const rx = r[0] - p[0], ry = r[1] - p[1];
      const den = d1x * d2y - d1y * d2x;
      if (Math.abs(den) > 1e-12 * L1 * L2) {
        const t = (rx * d2y - ry * d2x) / den, u = (rx * d1y - ry * d1x) / den;
        if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) continue;
        const tc = Math.max(0, Math.min(1, t)), uc = Math.max(0, Math.min(1, u));
        const tIn = tc > 1e-9 && tc < 1 - 1e-9, uIn = uc > 1e-9 && uc < 1 - 1e-9;
        if (tIn && uIn) { const id = crossNode(p[0] + d1x * tc, p[1] + d1y * tc); addSplit(i, tc, id); addSplit(j, uc, id); }
        else if (tIn) addSplit(i, tc, uc <= 0 ? a2 : b2);
        else if (uIn) addSplit(j, uc, tc <= 0 ? a1 : b1);
      } else if (Math.abs(rx * d1y - ry * d1x) / (L1 || 1) < 1e-7) {
        /* 平行で同じ直線の上に乗っている：相手の端点が自分の内側にあれば、そこで割る */
        const pr1 = pt => ((pt[0] - p[0]) * d1x + (pt[1] - p[1]) * d1y) / (L1 * L1);
        const pr2 = pt => ((pt[0] - r[0]) * d2x + (pt[1] - r[1]) * d2y) / (L2 * L2);
        [[r, a2], [s2, b2]].forEach(([pt, nd]) => { const t = pr1(pt); if (t > 1e-9 && t < 1 - 1e-9) addSplit(i, t, nd); });
        [[p, a1], [q, b1]].forEach(([pt, nd]) => { const u = pr2(pt); if (u > 1e-9 && u < 1 - 1e-9) addSplit(j, u, nd); });
      }
    }
  });

  /* 3) 原子の辺（頂点→頂点）に分けて重複を除く */
  const edgeSet = new Set(), edges = [];
  raw.forEach(([a, b], i) => {
    const pts = [{ t: 0, node: a }, ...splits[i].values(), { t: 1, node: b }].sort((x, y) => x.t - y.t);
    for (let k = 0; k < pts.length - 1; k++) {
      const u = pts[k].node, v = pts[k + 1].node; if (u === v) continue;
      const key = u < v ? u + '_' + v : v + '_' + u;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key); edges.push([u, v]);
    }
  });
  if (!edges.length) return [];

  /* 4) 平面グラフ：各頂点で出る辺を角度順に並べ、有向辺の左側の面をたどる。
   * 左側の面をたどる規則：着いた頂点で、戻る辺の「反時計回りで1つ前」の辺へ進む */
  const adj = new Map();
  const push = (u, v) => { if (!adj.has(u)) adj.set(u, []); adj.get(u).push({ to: v, ang: Math.atan2(nodes[v][1] - nodes[u][1], nodes[v][0] - nodes[u][0]) }); };
  edges.forEach(([u, v]) => { push(u, v); push(v, u); });
  adj.forEach(lst => lst.sort((a, b) => a.ang - b.ang));
  const visited = new Set();
  const rings = [];
  for (const [u0, v0] of edges) for (const [su, sv] of [[u0, v0], [v0, u0]]) {
    if (visited.has(su + '>' + sv)) continue;
    const cyc = [su];
    let cu = su, cv = sv, guard = 0, ok = true;
    while (true) {
      visited.add(cu + '>' + cv);
      cyc.push(cv);
      const lst = adj.get(cv);
      const idx = lst.findIndex(e => e.to === cu);
      if (idx < 0) { ok = false; break; }
      const nxt = lst[(idx - 1 + lst.length) % lst.length].to;
      cu = cv; cv = nxt;
      if (cu === su && cv === sv) break;
      if (++guard > edges.length * 2 + 10) { ok = false; break; }
    }
    if (!ok || cyc.length < 4) continue;
    if (cyc[cyc.length - 1] === cyc[0]) cyc.pop();
    if (cyc.length < 3) continue;
    const poly = cyc.map(id => nodes[id]);
    const area = shoe(poly);
    if (Math.abs(area) < 1e-7) continue;
    rings.push({ poly, area });
  }

  /* 5) 時計回りの輪は「穴」か外側。反時計回りの輪の内側にある物だけ穴として付け、
   * 面積から引く。どこにも付かない時計回りの輪は外側の境界なので捨てる */
  const outers = rings.filter(r => r.area > 0);
  for (const h of rings.filter(r => r.area < 0)) {
    let best = null;
    for (const o of outers) {
      if (o.area <= -h.area * 1.01) continue;
      if (!pipPt(h.poly[0], o.poly)) continue;
      if (!best || o.area < best.area) best = o;
    }
    if (best) { (best.holes || (best.holes = [])).push(h.poly); best.area += h.area; }
  }
  return outers.filter(o => o.area > 1e-7).map(o => ({ poly: o.poly, area: o.area, peri: perim(o.poly), holes: o.holes || [] }));
}

/* 補足区画を作る：線を輪郭化し、エンジン区画の補いになる物だけを残す。
 * 引数：segs（図面の線・全部）、faces（エンジン区画。切り目と重なりの判定に使う）、
 *       fixtures（器具。内側の線を除くため）、texts・doors（根拠の届く範囲の判定）、
 *       tableBoxes（表・ラベル帯の範囲 [x0,y0,x1,y1]。中にある輪は判定に回さない）
 * 戻り値：[{ i:'p1'…, name:'', area, peri, cx, cy, poly, src:'poly' }]
 * 選別の規則（数字の根拠は SPEC.md の測定と実図面での切り分け）：
 *   ・面積 0.25㎡未満は微小な輪として捨てる（生の輪郭化は微小リングが桁違いに多い）
 *   ・内側の太さ（格子で測った、壁から一番遠い内側までの距離）が 0.20m 未満の輪は、
 *     壁の帯・細長い切れ端として捨てる
 *   ・重心が表の範囲の中、または表の範囲と面積の半分以上が重なる輪は捨てる
 *     （表・ラベル帯の輪を部屋の見分けに回すと、仕上げ表の部屋名で「部屋」と誤る）
 *   ・エンジン区画との重なりが自面積の 10% を超える輪は捨てる（エンジン優先・補足のみ）。
 *     輪郭化にはエンジン区画のふちを切り目として足してあるので、またがる輪は
 *     ここに来る前に割れている（残るのはエンジンの外の部分だけ）。例外：どの区画にも
 *     入っていない器具を含む輪は、境界のずれの分として 25% まで許す
 *   ・根拠（器具・部屋名の文字・ドアの点）が中に無い輪は捨てる（近さだけは根拠にしない）
 *   ・補足どうしで半分以上重なる輪は小さい方を残す */
export function supplementFaces({ segs = [], faces = [], fixtures = [], texts = [], doors = [], tableBoxes = [], snap = 0.01, minArea = 0.25, maxArea = 500, minWidth = 0.2, maxFaces = 600 } = {}) {
  /* 1) 器具の内側の線（両端とも器具の箱の中）は輪郭化から除く（SPEC の手順1） */
  const fboxes = (fixtures || []).filter(f => f && f.b).map(f => [f.b[0] - 0.02, f.b[1] - 0.02, f.b[2] + 0.02, f.b[3] + 0.02]);
  const inBox = (x, y) => fboxes.some(b => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]);
  const use = (segs || []).filter(s => s && !(inBox(s[0], s[1]) && inBox(s[2], s[3])));
  /* エンジン区画のふちを切り目として足す（またがる輪を割って、エンジンの外だけ残す） */
  const cuts = [];
  for (const f of faces || []) {
    if (!f || !f.poly || f.poly.length < 3) continue;
    for (let k = 0; k < f.poly.length; k++) { const a = f.poly[k], b = f.poly[(k + 1) % f.poly.length]; cuts.push([a[0], a[1], b[0], b[1]]); }
  }

  let rings = polygonizeFaces([...use, ...cuts], { snap })
    .filter(r => r.area >= minArea && r.area <= maxArea && innerWidth(r.poly, r.holes) >= minWidth)
    .map(r => ({ ...r, c: centroidOf(r.poly), box: (() => { const xs = r.poly.map(q => q[0]), ys = r.poly.map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; })() }));
  if (!rings.length) return [];

  /* 重なりは「穴を引いた実形」で測る。エンジン区画が輪の穴になっている場合
   * （部屋の輪の中にエンジンの断片がある場合）、外形だけで測ると包んでいる分まで
   * 重なりに数えてしまい、本命の輪が落ちる */
  const netOverlap = (r, P) => {
    let ov = overlapArea(r.poly, P);
    for (const h of r.holes || []) ov -= overlapArea(h, P);
    return Math.max(0, ov);
  };

  /* 2) 表・ラベル帯の中の輪は、見分けの対象にしない（除外して残す） */
  const rectPoly = b => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
  rings = rings.filter(r => {
    for (const b of tableBoxes || []) {
      if (r.c[0] >= b[0] && r.c[0] <= b[2] && r.c[1] >= b[1] && r.c[1] <= b[3]) return false;
      if (r.box[0] <= b[2] && r.box[2] >= b[0] && r.box[1] <= b[3] && r.box[3] >= b[1]
        && netOverlap(r, rectPoly(b)) >= 0.5 * r.area) return false;
    }
    return true;
  });
  if (!rings.length) return [];

  /* 3) エンジン区画との重なり（空間索引で近くの区画だけ比べる） */
  const F = (faces || []).filter(f => f && f.poly && f.poly.length >= 3)
    .map(f => { const xs = f.poly.map(q => q[0]), ys = f.poly.map(q => q[1]); return { poly: f.poly, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }; });
  const grid = new Map(), GC = 2;
  F.forEach((f, fi) => {
    const x0 = Math.floor(f.box[0] / GC), x1 = Math.floor(f.box[2] / GC), y0 = Math.floor(f.box[1] / GC), y1 = Math.floor(f.box[3] / GC);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const k = `${cx},${cy}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(fi); }
  });
  const nearFaces = r => {
    const set = new Set();
    const x0 = Math.floor(r.box[0] / GC), x1 = Math.floor(r.box[2] / GC), y0 = Math.floor(r.box[1] / GC), y1 = Math.floor(r.box[3] / GC);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) for (const fi of grid.get(`${cx},${cy}`) || []) set.add(fi);
    return [...set].map(fi => F[fi]).filter(f => !(f.box[0] > r.box[2] || f.box[2] < r.box[0] || f.box[1] > r.box[3] || f.box[3] < r.box[1]));
  };
  /* どのエンジン区画にも入っていない器具（行き場の無い器具）。その器具を含む輪は、
   * エンジン区画との重なりが 25% までなら残す。エンジン区画は格子から作る近似で、
   * 実線の輪とは境界で 1㎡ 前後ずれることがある（実測：三井屋の洗面所）。
   * 行き場の無い器具が無い輪は、今まで通り 10% で落とす */
  const homeless = (fixtures || []).filter(f => f && f.b)
    .map(f => [(f.b[0] + f.b[2]) / 2, (f.b[1] + f.b[3]) / 2])
    .filter(([x, y]) => !F.some(f => { const b = f.box; return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && pipPt([x, y], f.poly); }));
  rings = rings.filter(r => {
    let ov = 0;
    for (const f of nearFaces(r)) { ov += netOverlap(r, f.poly); if (ov > 0.25 * r.area) return false; }
    if (ov <= 0.10 * r.area) return true;
    return homeless.some(([x, y]) => x >= r.box[0] && x <= r.box[2] && y >= r.box[1] && y <= r.box[3] && pipPt([x, y], r.poly));
  });
  if (!rings.length) return [];

  /* 3.5) 根拠のある輪だけ残す。根拠の点は roomjudge と同じ定義：
   * 器具の中心、部屋名として分類できる文字（会社名スタンプは除く）、ドアの中心と先端。
   * 「中にある」場合だけを根拠にする（縁から 0.5m 以内の近さは入れない）。
   * 近さまで入れると、既に取れている図面で、洗面台の近くの階段・シャフトのような
   * 付属の囲みまで補足に上がってしまう（実測：ジェイテクトで 3 件）。近さの根拠は、
   * 残った輪を見分ける時（roomjudge の 3・4 段目）に今まで通り効く */
  {
    const pts = [];
    (fixtures || []).forEach(f => { if (f && f.b) pts.push([(f.b[0] + f.b[2]) / 2, (f.b[1] + f.b[3]) / 2]); });
    (doors || []).forEach(d => { if (!d) return; if (d.c) pts.push(d.c); if (d.m) pts.push(d.m); });
    if (texts && texts.length) {
      const joined = joinTexts(texts.map(t => t && { t: t.t != null ? t.t : t.s, x: +t.x, y: +t.y }).filter(Boolean)).texts;
      for (const t of joined) {
        if (classify(t.t) !== 'room' || t.t === '事務所棟' || /一級建築士|建築士事務所/.test(t.t)) continue;
        pts.push([t.x, t.y]);
      }
    }
    rings = rings.filter(r => pts.some(([px, py]) =>
      px >= r.box[0] && px <= r.box[2] && py >= r.box[1] && py <= r.box[3] && pipPt([px, py], r.poly)));
    if (!rings.length) return [];
  }

  /* 4) 補足どうしの重なりは小さい方を残す（内側の輪が本命） */
  /* 輪どうしの重なりも実形（穴引き）で測る */
  const ringOverlap = (r, k) => Math.max(0,
    overlapArea(r.poly, k.poly)
    - (k.holes || []).reduce((s, h) => s + overlapArea(r.poly, h), 0)
    - (r.holes || []).reduce((s, h) => s + overlapArea(h, k.poly), 0));
  rings.sort((a, b) => a.area - b.area);
  const kept = [];
  for (const r of rings) {
    let ov = 0, bad = false;
    for (const k of kept) {
      if (k.box[0] > r.box[2] || k.box[2] < r.box[0] || k.box[1] > r.box[3] || k.box[3] < r.box[1]) continue;
      ov += ringOverlap(r, k);
      if (ov > 0.5 * r.area) { bad = true; break; }
    }
    if (!bad) kept.push(r);
  }

  /* 5) 上限を超える場合は、器具を含む物を先に残す */
  let final = kept;
  if (kept.length > maxFaces) {
    const has = r => (fixtures || []).some(f => f && f.b && pipPt([(f.b[0] + f.b[2]) / 2, (f.b[1] + f.b[3]) / 2], r.poly));
    final = [...kept].sort((a, b) => (has(b) - has(a)) || (b.area - a.area)).slice(0, maxFaces);
  }
  final.sort((a, b) => b.area - a.area);
  return final.map((r, k) => ({
    i: 'p' + (k + 1), name: '', area: Math.round(r.area * 100) / 100, peri: Math.round(r.peri * 100) / 100,
    cx: Math.round(r.c[0] * 1000) / 1000, cy: Math.round(r.c[1] * 1000) / 1000,
    poly: r.poly.map(q => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000]), src: 'poly',
  }));
}
