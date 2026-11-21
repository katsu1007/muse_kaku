/* 区画の辺の補修（アプリ側・手動のみ）：壁の段差を読み取れなかった区画の辺を、実線の経路に直す。
 *
 * 背景（2026-11-21、~/workspace/kaku/work/facerepair/DIAGNOSIS.md）：
 * ジェイテクト高等学園 sample1 の 3F 区画28で実測。内壁線は「水平→垂直に117mm→水平」の
 * 段差なのに、エンジン区画の輪には段差の角が頂点として入っておらず、水平の延長＋斜め1本で
 * 橋渡しされていた（壁からのずれ最大約120mm。村中さんが目視で確認）。
 * エンジン（old/index.html）は触らず、アプリ側でだけ直す（fixrescue・polygonize と同じ型）。
 *
 * 自動では絶対にかけない（2026-11-21回帰の結論）：同じ補修を全区画に自動でかけると
 * 他の4図面でも128/758区画が発火し、判定変化6件・補足区画1件消滅が起きる。橋渡し自体は
 * 全図面にある現象で、直すべき物だけを分ける数値の線がデータ側に無い。
 * だから村中さんの決定（2026-11-22）で「手動ボタン」だけにした：ユーザーが選んだ
 * 1区画にだけ applyEdgeFix をかける。自動発火する経路はどこにも無い。
 *
 * 直し方の原則（分からない物は直さない）：
 * ・区画の辺の区間（span：連続する1〜3辺）のうち、実線に沿っていない物だけを候補にする。
 * ・置き換え先は、同じ両端点を結ぶ「実線だけからなる経路」が存在する時だけ。
 *   経路の全ての辺が実在の線分の上にあり、元の区間からの偏差が予算（200mm）以内で、
 *   長さが元の1.5倍＋50mm以内、輪の面積の増減が小さい時だけ置き換える。
 *   どれか1つでも満たさなければ、その区間は触らない。
 * ・さらに「橋渡しされた段差」の署名を必須にする（2026-11-21回帰で追加）：
 *   区間のずれ・置換経路の膨らみが共に40mm以上（エンジンの格子量子化〜35mmと分ける）、
 *   経路が元の区間より30mm以上長い（迂回している）、経路の途中に45°以上の角がある。
 *   直線への単なる吸着（投影）はこの署名を持たないので直らない。
 * ・面積フィールドはエンジンのグリッド由来（輪の靴紐公式とは一致しない）なので、
 *   計算し直さず、輪の靴紐面積の増減分だけを加減する。
 * 座標はメートル。入力（segs・faces）は壊さない（直した区画だけ新しいオブジェクトを返す）。
 *
 * 手直しの記録（drawing.faceFix）：{ 区画の i: { poly, area, oPoly, oArea } }。
 * poly/area は直した後の輪と面積、oPoly/oArea は直す前（「元に戻す」用）。
 * drawing.faceOff・faceJoin と同じ置き方で、案件の保存にそのまま入るので、
 * 開き直しても残り、分け直す（ゾーン）・解析の作り直しでも消えない。
 * 区画の輪そのものも drawing.plan.faces の中で直してあるので、保存・再表示は記録が無くても直ったまま。
 * 読み直す（図面の入れ替え）では drawing ごと替わるので、他の手直しと同じく外れる。 */

const ANCHOR_TOL = 0.035;  /* 端点が「線の上にある」と言える距離（エンジン頂点の丸めは実測13mmまで） */
const DEV_OK = 0.025;      /* 辺が「実線に沿っている」と言えるずれ（これ以下なら触らない） */
const DEV_MAX = 0.20;      /* 置き換え経路の偏差予算（段差117mm＋丸めを収める上限） */
const MIN_STEP_DEV = 0.04; /* 「橋渡し」と言える最小のずれ。エンジンの格子量子化（実測〜35mm）は対象外 */
const MIN_PATH_EXCESS = 0.03; /* 置換経路は元の区間よりこれだけ長い＝段差を迂回している証拠 */
const CORNER_MIN_LEG = 0.08;  /* 段差の角と認める前後の脚の最小長 */
const CORNER_MIN_ANG = Math.PI / 4; /* 段差の角と認める最小の方向転換（45°） */
const MAX_SPAN_EDGES = 3;  /* 候補にする区間の辺の数 */
const MAX_SPAN_LEN = 3.5;  /* 候補にする区間の長さ（m） */
const MIN_SPAN_LEN = 0.2;  /* これより短い区間は候補にしない */
const MAX_PATH_RATIO = 1.5;
const MAX_REPAIRS = 4;     /* 1区画あたりの補修回数の上限 */

/* ---------- 小物 ---------- */
const distPtSeg = (x, y, s) => {
  const dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((x - s[0]) * dx + (y - s[1]) * dy) / L2)) : 0;
  return { d: Math.hypot(x - (s[0] + dx * t), y - (s[1] + dy * t)), t, px: s[0] + dx * t, py: s[1] + dy * t };
};
const segLen = s => Math.hypot(s[2] - s[0], s[3] - s[1]);
const shoe = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const key2 = (x, y) => Math.round(x * 1000) + ',' + Math.round(y * 1000);

/* 線分の空間索引（セル0.5m、DEV_MAX＋余裕ぶん広げて登録し、点の近傍探しを1セルで済ませる） */
function buildIndex(segs) {
  const CELL = 0.5, PAD = DEV_MAX + 0.05;
  const map = new Map();
  segs.forEach((s, i) => {
    const x0 = Math.floor((Math.min(s[0], s[2]) - PAD) / CELL), x1 = Math.floor((Math.max(s[0], s[2]) + PAD) / CELL);
    const y0 = Math.floor((Math.min(s[1], s[3]) - PAD) / CELL), y1 = Math.floor((Math.max(s[1], s[3]) + PAD) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const k = cx + ',' + cy;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(i);
    }
  });
  return { segs, map, CELL };
}
function nearSegs(idx, x, y) {
  return idx.map.get(Math.floor(x / idx.CELL) + ',' + Math.floor(y / idx.CELL)) || [];
}
/* 点から一番近い線までの距離（候補が無い・遠い場合は大きな値） */
function distToLines(idx, x, y) {
  let best = Infinity;
  for (const i of nearSegs(idx, x, y)) { const r = distPtSeg(x, y, idx.segs[i]); if (r.d < best) best = r.d; }
  return best;
}
/* 輪の区間（頂点列）の実線からの最大ずれ。subdiv 刻みでサンプリングする */
function spanDeviation(idx, pts) {
  let max = 0;
  for (let e = 0; e + 1 < pts.length; e++) {
    const a = pts[e], b = pts[e + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / 0.05));
    for (let k = 0; k <= n; k++) {
      const d = distToLines(idx, a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n);
      if (d > max) max = d;
    }
  }
  return max;
}
/* 経路の途中に「段差の角」があるか：十分な長さの脚が45°以上向きを変える頂点 */
function hasStepCorner(P) {
  for (let j = 1; j < P.length - 1; j++) {
    const ax = P[j][0] - P[j - 1][0], ay = P[j][1] - P[j - 1][1];
    const bx = P[j + 1][0] - P[j][0], by = P[j + 1][1] - P[j][1];
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la < CORNER_MIN_LEG || lb < CORNER_MIN_LEG) continue;
    const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
    if (Math.acos(cos) >= CORNER_MIN_ANG) return true;
  }
  return false;
}

/* 2つの頂点列の間の最大偏差（両方向にサンプリング） */
function pathDeviation(A, B) {
  const dev = (P, Q) => {
    let max = 0;
    for (let e = 0; e + 1 < P.length; e++) {
      const a = P[e], b = P[e + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(L / 0.05));
      for (let k = 0; k <= n; k++) {
        const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n;
        let bd = Infinity;
        for (let j = 0; j + 1 < Q.length; j++) { const r = distPtSeg(x, y, [Q[j][0], Q[j][1], Q[j + 1][0], Q[j + 1][1]]); if (r.d < bd) bd = r.d; }
        if (bd > max) max = bd;
      }
    }
    return max;
  };
  return Math.max(dev(A, B), dev(B, A));
}

/* ---------- 線のグラフ（窓の中だけ） ---------- */
/* span の周りの線だけでグラフを作り、projP→projQ の最短経路を返す。無ければ null。
 * 経路の辺はすべて実在の線分（の部分）になる。T字の交点と端点の投影点で線を割る。 */
function linePath(idx, P, Q, win) {
  const cand = new Map(); /* seg番号 → seg */
  const x0 = Math.floor(win[0] / idx.CELL), x1 = Math.floor(win[2] / idx.CELL);
  const y0 = Math.floor(win[1] / idx.CELL), y1 = Math.floor(win[3] / idx.CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    for (const i of (idx.map.get(cx + ',' + cy) || [])) {
      const s = idx.segs[i];
      if (Math.max(s[0], s[2]) < win[0] || Math.min(s[0], s[2]) > win[2] || Math.max(s[1], s[3]) < win[1] || Math.min(s[1], s[3]) > win[3]) continue;
      cand.set(i, s);
    }
  }
  const segs = [...cand.values()];
  if (!segs.length) return null;
  /* 端点 P・Q の線への投影（一番近い点） */
  const proj = pt => {
    let best = null;
    for (const s of segs) { const r = distPtSeg(pt[0], pt[1], s); if (!best || r.d < best.d) best = { ...r, s }; }
    return best;
  };
  const pP = proj(P), pQ = proj(Q);
  if (!pP || !pQ || pP.d > ANCHOR_TOL || pQ.d > ANCHOR_TOL) return null;
  /* 各線分の分割点（端点・T字・投影点）を集める */
  const nodes = new Map(); /* key → [x,y] */
  const nodeOf = (x, y) => { const k = key2(x, y); if (!nodes.has(k)) nodes.set(k, [x, y]); return k; };
  const splits = segs.map(s => {
    const ts = new Map(); /* t → key */
    const put = (t, x, y) => { const k = nodeOf(x, y); ts.set(Math.round(t * 1e6) / 1e6, k); };
    put(0, s[0], s[1]); put(1, s[2], s[3]);
    for (const pr of [pP, pQ]) if (pr.s === s && pr.t > 0 && pr.t < 1) put(pr.t, pr.px, pr.py);
    return { s, ts };
  });
  /* T字：他の線の端点がこの線の上にあれば、そこで割る */
  const ends = [];
  segs.forEach(s => { ends.push([s[0], s[1]]); ends.push([s[2], s[3]]); });
  for (const sp of splits) {
    for (const e of ends) {
      const r = distPtSeg(e[0], e[1], sp.s);
      if (r.d <= 0.002 && r.t > 0 && r.t < 1) { const k = nodeOf(e[0], e[1]); sp.ts.set(Math.round(r.t * 1e6) / 1e6, k); }
    }
  }
  /* 隣接表 */
  const adj = new Map();
  const addEdge = (a, b) => {
    const A = nodes.get(a), B = nodes.get(b), L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (L < 1e-9) return;
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push({ to: b, len: L }); adj.get(b).push({ to: a, len: L });
  };
  for (const sp of splits) {
    const ts = [...sp.ts.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
    for (let k = 0; k + 1 < ts.length; k++) addEdge(ts[k], ts[k + 1]);
  }
  const startK = nodeOf(pP.px, pP.py), goalK = nodeOf(pQ.px, pQ.py);
  if (startK === goalK) return null;
  /* ダイクストラ */
  const dist = new Map([[startK, 0]]), prev = new Map(), done = new Set();
  for (;;) {
    let cur = null, cd = Infinity;
    for (const [k, d] of dist) if (!done.has(k) && d < cd) { cd = d; cur = k; }
    if (cur === null) break;
    if (cur === goalK) break;
    done.add(cur);
    for (const e of (adj.get(cur) || [])) {
      const nd = cd + e.len;
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, cur); }
    }
  }
  if (!dist.has(goalK)) return null;
  const keys = [goalK];
  while (keys[0] !== startK) keys.unshift(prev.get(keys[0]));
  return { pts: keys.map(k => nodes.get(k)), len: dist.get(goalK), projP: [pP.px, pP.py], projQ: [pQ.px, pQ.py] };
}

/* 新しい区間が輪の他の部分と交わらないか（端点の共有は除く） */
function crossesRing(ring, sIdx, eIdx, newPts) {
  const n = ring.length;
  const inSpan = i => { /* 辺 i（頂点 i→i+1）が span の内側か */
    let j = sIdx;
    while (j !== eIdx) { if (j === i) return true; j = (j + 1) % n; }
    return false;
  };
  const segInt = (a, b, c, d) => {
    const d1 = (d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0]);
    const d2 = (d[0] - c[0]) * (b[1] - c[1]) - (d[1] - c[1]) * (b[0] - c[0]);
    const d3 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const d4 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  for (let k = 0; k + 1 < newPts.length; k++) {
    for (let i = 0; i < n; i++) {
      if (inSpan(i)) continue;
      /* span の両端に接する辺は端点を共有するので除く */
      if (i === ((sIdx - 1) + n) % n || i === eIdx) continue;
      if (segInt(newPts[k], newPts[k + 1], ring[i], ring[(i + 1) % n])) return true;
    }
    for (let j = k + 2; j + 1 < newPts.length; j++) if (segInt(newPts[k], newPts[k + 1], newPts[j], newPts[j + 1])) return true;
  }
  return false;
}

/* 1つの区画について、直せる区間を1つ探して置き換えた輪を返す。無ければ null */
function repairOneFace(idx, face) {
  const ring = face.poly;
  const n = ring.length;
  if (!ring || n < 3 || !Number.isFinite(face.area)) return null;
  const oldShoe = Math.abs(shoe(ring));
  for (let len = 1; len <= MAX_SPAN_EDGES; len++) {
    for (let s = 0; s < n; s++) {
      const idxs = []; for (let k = 0; k <= len; k++) idxs.push((s + k) % n);
      const pts = idxs.map(i => ring[i]);
      const P = pts[0], Q = pts[pts.length - 1];
      if (Math.hypot(Q[0] - P[0], Q[1] - P[1]) < 0.05) continue;
      let spanLen = 0; for (let k = 0; k + 1 < pts.length; k++) spanLen += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
      if (spanLen < MIN_SPAN_LEN || spanLen > MAX_SPAN_LEN) continue;
      /* 両端が線の上にあり、区間自体は線に沿っていない時だけ候補 */
      if (distToLines(idx, P[0], P[1]) > ANCHOR_TOL || distToLines(idx, Q[0], Q[1]) > ANCHOR_TOL) continue;
      const spanDev = spanDeviation(idx, pts);
      if (spanDev <= DEV_OK) continue;
      /* 橋渡しの署名その1：ずれが格子量子化ノイズより大きいこと */
      if (spanDev < MIN_STEP_DEV) continue;
      /* 実線だけの経路を探す（窓は span の周り＋予算ぶん） */
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const m = DEV_MAX + 0.05;
      const path = linePath(idx, P, Q, [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m]);
      if (!path) continue;
      if (path.len > spanLen * MAX_PATH_RATIO + 0.05) continue;
      /* 橋渡しの署名その2・3：経路が元より長い（迂回している）ことと、途中に段差の角があること。
       * 直線への単なる吸着（投影）は長くならず角も無いので、ここで落ちる */
      if (path.len < spanLen + MIN_PATH_EXCESS) continue;
      if (!hasStepCorner(path.pts)) continue;
      /* 経路の頂点を区画座標へ写す：両端からのホップ数が近い方の端点のずれを使う
       * （トレッド側の頂点はトレッドの面の高さに、下段側は下段の高さに揃う） */
      const offP = [P[0] - path.projP[0], P[1] - path.projP[1]];
      const offQ = [Q[0] - path.projQ[0], Q[1] - path.projQ[1]];
      const mPts = path.pts.map((p, k) => {
        if (k === 0) return [P[0], P[1]];
        if (k === path.pts.length - 1) return [Q[0], Q[1]];
        const off = k <= (path.pts.length - 1) / 2 ? offP : offQ;
        return [p[0] + off[0], p[1] + off[1]];
      });
      /* 偏差は両方向で予算以内、かつ署名その4：段差ぶん元の辺から離れていること */
      const devPM = pathDeviation(pts, mPts);
      if (devPM > DEV_MAX || devPM < MIN_STEP_DEV) continue;
      /* 新しい輪を作る（span の始点から始め、置き換えた区間の後を元の輪で一周する） */
      const newRing = [];
      mPts.forEach(p => { const last = newRing[newRing.length - 1]; if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.0005) newRing.push([p[0], p[1]]); });
      for (let i = (s + len + 1) % n; i !== s; i = (i + 1) % n) newRing.push(ring[i]);
      if (newRing.length < 3) continue;
      if (crossesRing(ring, s, (s + len) % n, mPts)) continue;
      const dArea = Math.abs(shoe(newRing)) - oldShoe;
      if (Math.abs(dArea) > 0.30 || Math.abs(dArea) > Math.max(0.05, 0.06 * oldShoe)) continue;
      return { poly: newRing, dArea, span: { from: s, edges: len } };
    }
  }
  return null;
}

/* 区画の辺の補修：{ segs, faces } → { faces, repairs }
 * 直らなかった区画は元のオブジェクトのまま、直した区画だけ新しいオブジェクトで返す。
 * 注意：これは「材料」であって、アプリの中で自動で呼ぶ所は無い。手動の applyEdgeFix からだけ使う。 */
export function repairFaceEdges({ segs, faces }) {
  const idx = buildIndex(segs || []);
  const repairs = [];
  const out = (faces || []).map(f => {
    if (!f || !f.poly || f.poly.length < 3) return f;
    let cur = f, count = 0;
    for (let r = 0; r < MAX_REPAIRS; r++) {
      const rep = repairOneFace(idx, cur);
      if (!rep) break;
      cur = { ...cur, poly: rep.poly, area: Math.round((cur.area + rep.dArea) * 1e6) / 1e6, edgeFix: (cur.edgeFix || 0) + 1 };
      repairs.push({ i: f.i, dArea: Math.round(rep.dArea * 1000) / 1000, span: rep.span });
      count++;
    }
    return count ? cur : f;
  });
  return { faces: out, repairs };
}

/* ---------- 手動の適用・復元（ボタンからの入口） ---------- */
const q3 = v => Math.round(v * 1000) / 1000;
/* 区画の真ん中（drawing.js の orderFaces と同じ：頂点の平均、mm単位に丸める） */
const centerOf = poly => { let x = 0, y = 0; poly.forEach(p => { x += p[0]; y += p[1]; }); return [q3(x / poly.length), q3(y / poly.length)]; };
/* 輪の座標はアプリの他の区画と同じく mm 単位（小数3桁）にそろえる */
const roundPoly = poly => poly.map(p => [q3(p[0]), q3(p[1])]);

/* その区画の手直し記録（無ければ null） */
export function edgeFixOf(drawing, faceI) {
  const rec = drawing && drawing.faceFix && drawing.faceFix[faceI];
  return rec || null;
}

/* 選んだ1区画だけに補修をかける（「辺を実線に直す」ボタン）。
 * 直せれば drawing.plan.faces のその区画を差し替え（配列は新しい物にする：判定などの
 * キャッシュが区画の配列そのものを見ているため）、drawing.faceFix に記録する。
 * 直せなければ drawing は一切変えず { ok:false } を返す。
 * 戻り値：{ ok:true, face, before, area, dArea } ／ { ok:false } */
export function applyEdgeFix(drawing, faceI) {
  if (!drawing || !drawing.plan || !Array.isArray(drawing.plan.faces)) return { ok: false };
  const face = drawing.plan.faces.find(f => f && f.i === faceI);
  if (!face || face.hand || !face.poly || face.poly.length < 3) return { ok: false };
  const { faces: out, repairs } = repairFaceEdges({ segs: drawing.plan.segs || [], faces: [face] });
  if (!repairs.length || out[0] === face) return { ok: false };
  const fixed = { ...out[0], poly: roundPoly(out[0].poly) };
  const [cx, cy] = centerOf(fixed.poly);
  fixed.cx = cx; fixed.cy = cy;
  const prev = edgeFixOf(drawing, faceI);
  drawing.faceFix = { ...(drawing.faceFix || {}), [faceI]: {
    poly: fixed.poly, area: fixed.area,
    oPoly: prev ? prev.oPoly : face.poly, oArea: prev ? prev.oArea : face.area,
  } };
  drawing.plan.faces = drawing.plan.faces.map(f => (f === face ? fixed : f));
  const dArea = Math.round(repairs.reduce((s, r) => s + r.dArea, 0) * 1000) / 1000;
  return { ok: true, face: fixed, before: face.area, area: fixed.area, dArea };
}

/* 手直しを元に戻す（「元に戻す」ボタン）。記録が無ければ { ok:false }。
 * 今の輪が記録の「直した後の輪」と一致する時だけ、元の輪・面積に戻す。
 * 一致しない時（読み取りの切り替えで別の区画になっている等）は、形には触らず記録だけ消す。
 * 戻り値：{ ok:true, restored } ／ { ok:false } */
export function revertEdgeFix(drawing, faceI) {
  const rec = edgeFixOf(drawing, faceI);
  if (!rec) return { ok: false };
  let restored = false;
  const face = drawing.plan && Array.isArray(drawing.plan.faces)
    ? drawing.plan.faces.find(f => f && f.i === faceI) : null;
  if (face && JSON.stringify(face.poly) === JSON.stringify(rec.poly)) {
    const back = { ...face, poly: rec.oPoly, area: rec.oArea };
    delete back.edgeFix;
    const [cx, cy] = centerOf(back.poly);
    back.cx = cx; back.cy = cy;
    drawing.plan.faces = drawing.plan.faces.map(f => (f === face ? back : f));
    restored = true;
  }
  const next = { ...(drawing.faceFix || {}) };
  delete next[faceI];
  if (Object.keys(next).length) drawing.faceFix = next; else delete drawing.faceFix;
  return { ok: true, restored };
}
