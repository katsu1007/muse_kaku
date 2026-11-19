/* ゾーン分け：開けたフロアを「部屋の候補の範囲」に分ける（表示と部屋作りの下書き。確定ではない）。
 * 実図面（日本モウルド）での測定で分かったことに基づく：
 *   ・壁で囲まれた部屋は今の区画で取れている。開けた場所は線で囲まれていないので、区画が割れる。
 *   ・線を全部壁にすると、ドアや開口から漏れて全体がつながる。家具の線を全部壁にすると割れすぎる。
 * やり方：線の集まりのうち家具サイズの物だけを壁から外す→ドアのある開口をふさぐ→狭い所（くびれ）を
 * 境にする→囲まれた領域を出し、部屋名の文字が複数ある領域は一番近い名前へ陣取りで分ける。
 * 部屋名が無い領域には、仕上げ・天井高の注記があればそれを名前の代わりに使う。
 * 戻り値：[{ name, faces:[区画の i], area（概算㎡）, x, y（名前を出す位置） }]。名前が無い領域は name:''。
 * 面積は格子からの概算で、区画の面積とは別物（見積には使わない）。 */

import { joinTexts, classify } from './reader2/text.js';

const NOTE_RE = /^(壁|床|天井|巾木)\s*[:：]|^CH\s*[=＝:：]/i;
const SKIP_NAMES = new Set(['事務所棟']);

/* 表・ラベル帯の検出（zones の候補から外すために作った物を、範囲としても返す）。
 * 区画の並び（格子状のマス・材料名だけの大きな四角・表の見出しのある四角）から表の範囲を見つけ、
 * 当てはまる区画の番号を excluded に足し、表の範囲（[x0,y0,x1,y1]）を boxes に集める。
 * boxes は、線から作る補足区画（js/polygonize.js）が表・ラベル帯の中の輪を拾わないために使う。
 * 引数：faces（poly を持つ区画）、texts、fixtures、doors、excluded（最初から外す区画。無ければ空）。
 * 戻り値：{ excluded, boxes }（excluded は渡した Set そのものに足して返す） */
export function detectTableAreas({ faces = [], texts = [], fixtures = [], doors = [], excluded = new Set() } = {}) {
  const F = (faces || []).filter(f => f && f.poly && f.poly.length >= 3);
const boxes = [];
/* 表のマス：小さな四角い区画が縦横そろって格子状に並んだ集まりは、表と見て候補に入れない。
 * 器具・ドアのある区画（トイレのブース等）はマスにしない。1段・1列だけの並びは
 * 部屋やロッカーの並びと区別できないので外さない。近くの集まり同士は1つの表としてまとめる */
{
  const shoeZ = P => Math.abs(P.reduce((s, q, k) => { const n = P[(k + 1) % P.length]; return s + q[0] * n[1] - n[0] * q[1]; }, 0)) / 2;
  const fxPts = (fixtures || []).filter(f => f && (f.b || f.cx != null)).map(f => f.b ? [(f.b[0] + f.b[2]) / 2, (f.b[1] + f.b[3]) / 2] : [f.cx, f.cy]);
  const drPts = (doors || []).filter(d => d && d.c).map(d => d.c);
  const infos = F.map(f => {
    const xs = f.poly.map(q => q[0]), ys = f.poly.map(q => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const w = x1 - x0, h = y1 - y0, pa = shoeZ(f.poly);
    return { f, x0, y0, x1, y1, w, h, pa, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, fill: w * h > 0 ? pa / (w * h) : 0 };
  });
  const isCell = c => c.f.poly.length >= 4 && c.f.poly.length <= 6 && c.fill >= 0.9 && c.w <= 6 && c.h <= 3 && c.pa <= 15
    && !fxPts.some(q => q[0] >= c.x0 && q[0] <= c.x1 && q[1] >= c.y0 && q[1] <= c.y1)
    && !drPts.some(q => q[0] >= c.x0 - 0.3 && q[0] <= c.x1 + 0.3 && q[1] >= c.y0 - 0.3 && q[1] <= c.y1 + 0.3);
  const cells = infos.filter(isCell);
  const uf = new Map(cells.map(c => [c.f.i, c.f.i]));
  const find = x => uf.get(x) === x ? x : (uf.set(x, find(uf.get(x))), uf.get(x));
  for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) {
    const A = cells[a], B = cells[b];
    const rowMate = Math.abs(A.cy - B.cy) <= 0.3 * Math.min(A.h, B.h) && Math.abs(A.cx - B.cx) <= (A.w + B.w) / 2 + 1.0;
    const colMate = Math.abs(A.cx - B.cx) <= 0.3 * Math.min(A.w, B.w) && Math.abs(A.cy - B.cy) <= (A.h + B.h) / 2 + 1.0;
    if (rowMate || colMate) { const ra = find(A.f.i), rb = find(B.f.i); if (ra !== rb) uf.set(rb, ra); }
  }
  const groups = new Map();
  cells.forEach(c => { const r = find(c.f.i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c); });
  const gl = [...groups.values()].filter(g => g.length >= 3).map(g => ({ g, box: [Math.min(...g.map(c => c.x0)), Math.min(...g.map(c => c.y0)), Math.max(...g.map(c => c.x1)), Math.max(...g.map(c => c.y1))] }));
  /* 近い集まり（1.5m以内）は1つの表としてまとめてから判定する */
  const merged = [];
  gl.forEach(o => {
    const hit = merged.find(m => o.box[0] <= m.box[2] + 1.5 && o.box[2] >= m.box[0] - 1.5 && o.box[1] <= m.box[3] + 1.5 && o.box[3] >= m.box[1] - 1.5);
    if (hit) { hit.g.push(...o.g); hit.box = [Math.min(hit.box[0], o.box[0]), Math.min(hit.box[1], o.box[1]), Math.max(hit.box[2], o.box[2]), Math.max(hit.box[3], o.box[3])]; }
    else merged.push({ g: [...o.g], box: [...o.box] });
  });
  for (const m of merged) {
    const rows = new Set(m.g.map(c => Math.round(c.cy * 2) / 2)).size, cols = new Set(m.g.map(c => Math.round(c.cx * 2) / 2)).size;
    if (!(m.g.length >= 8 || (m.g.length >= 5 && rows >= 2 && cols >= 2))) continue;
    m.g.forEach(c => excluded.add(c.f.i));
    /* 表の外枠らしい区画（マスを5個以上含む四角）も一緒に入れない。
     * 器具・ドア・部屋の名前がある区画は、表の枠ではなく部屋と見て残す */
    for (const c of infos) {
      if (excluded.has(c.f.i) || c.fill < 0.8 || c.pa > 400) continue;
      const inside = m.g.filter(q => q.cx >= c.x0 && q.cx <= c.x1 && q.cy >= c.y0 && q.cy <= c.y1).length;
      if (inside < 5) continue;
      if (fxPts.some(q => q[0] >= c.x0 && q[0] <= c.x1 && q[1] >= c.y0 && q[1] <= c.y1)) continue;
      if (drPts.some(q => q[0] >= c.x0 - 0.3 && q[0] <= c.x1 + 0.3 && q[1] >= c.y0 - 0.3 && q[1] <= c.y1 + 0.3)) continue;
      const hasRoomText = (texts || []).some(t => t && t.x >= c.x0 && t.x <= c.x1 && t.y >= c.y0 && t.y <= c.y1 && classify(String(t.t || t.s || '')) === 'room');
      if (!hasRoomText) excluded.add(c.f.i);
    }
  }
  /* 表が1つの大きな四角にまとまってしまった区画：中にある文字が全部「材料の名前」で、
   * 部屋の名前・仕上げ注記・器具・ドアが無い四角は、仕上げ表などのマスの塊と見る */
  const MAT_RE = /塗装|下地|クロス|タイル|シート|ボード|ケイカル|モルタル|仕上|カーペット|フロア/;
  const FILLER_RE = /^(無し|なし|同上|－|—|-)$/;
  for (const c of infos) {
    if (excluded.has(c.f.i) || c.fill < 0.95 || c.pa < 5 || c.pa > 200 || c.f.poly.length > 8) continue;
    if (fxPts.some(q => q[0] >= c.x0 && q[0] <= c.x1 && q[1] >= c.y0 && q[1] <= c.y1)) continue;
    if (drPts.some(q => q[0] >= c.x0 - 0.3 && q[0] <= c.x1 + 0.3 && q[1] >= c.y0 - 0.3 && q[1] <= c.y1 + 0.3)) continue;
    const ts = (texts || []).filter(t => t && t.x >= c.x0 && t.x <= c.x1 && t.y >= c.y0 && t.y <= c.y1).map(t => String(t.t || t.s || ''));
    if (ts.filter(s => MAT_RE.test(s)).length < 3) continue;
    if (ts.every(s => (MAT_RE.test(s) || FILLER_RE.test(s.trim())) && !NOTE_RE.test(s) && classify(s) !== 'room' && classify(s) !== 'ch')) excluded.add(c.f.i);
  }
  /* 表の見出し（設備機器・仕上げ表など）を含む大きな四角も、表の範囲と見る（器具表・仕上げ表の枠） */
  const HDR_RE = /設備機器|仕上げ表|仕様表|機器表|器具表/;
  for (const c of infos) {
    if (excluded.has(c.f.i) || c.fill < 0.8 || c.pa < 5 || c.pa > 200 || c.f.poly.length > 8) continue;
    if (fxPts.some(q => q[0] >= c.x0 && q[0] <= c.x1 && q[1] >= c.y0 && q[1] <= c.y1)) continue;
    if (drPts.some(q => q[0] >= c.x0 - 0.3 && q[0] <= c.x1 + 0.3 && q[1] >= c.y0 - 0.3 && q[1] <= c.y1 + 0.3)) continue;
    const ts = (texts || []).filter(t => t && t.x >= c.x0 && t.x <= c.x1 && t.y >= c.y0 && t.y <= c.y1).map(t => String(t.t || t.s || ''));
    if (!ts.some(s => HDR_RE.test(s))) continue;
    if (ts.some(s => classify(s) === 'room')) continue;
    excluded.add(c.f.i);
  }
}
  return { excluded, boxes };
}

export function computeZones({ segs = [], faces = [], texts = [], doors = [], marks = null, fixtures = [] } = {}) {
  const F = (faces || []).filter(f => f && f.poly && f.poly.length >= 3);
  if (!F.length || !segs.length) return [];
  /* 表・表題欄・図枠と確定した区画（reader2 の印で s:'out'）は、部屋の候補に入れない。
   * 印が無い・保留（hold）の区画は今まで通り（分からない物を勝手に外さない） */
  const excluded = new Set();
  if (marks) for (const f of F) { const m = marks[f.i] || marks[String(f.i)]; if (m && m.s === 'out' && (m.type === 'table' || m.type === 'title' || m.type === 'frame')) excluded.add(f.i); }
  detectTableAreas({ faces: F, texts, fixtures, doors, excluded });

  /* 1) 線を端点の近さで集まりに分け、家具サイズの集まりを壁から外す */
  const uf = new Int32Array(segs.length).map((_, i) => i);
  const find = x => uf[x] === x ? x : (uf[x] = find(uf[x]));
  const grid = new Map();
  const gk = (x, y) => `${Math.round(x / 0.045)},${Math.round(y / 0.045)}`;
  segs.forEach((s, i) => { for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]]) { const k = gk(x, y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); } });
  segs.forEach((s, i) => {
    for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]]) {
      const ax = Math.round(x / 0.045), ay = Math.round(y / 0.045);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of grid.get(`${ax + a},${ay + b}`) || []) {
        if (j <= i) continue; const t = segs[j];
        const d = Math.min(Math.hypot(s[0] - t[0], s[1] - t[1]), Math.hypot(s[0] - t[2], s[1] - t[3]), Math.hypot(s[2] - t[0], s[3] - t[1]), Math.hypot(s[2] - t[2], s[3] - t[3]));
        if (d <= 0.045) { const ri = find(i), rj = find(j); if (ri !== rj) uf[rj] = ri; }
      }
    }
  });
  const cstat = new Map();
  segs.forEach((s, i) => { const r = find(i); if (!cstat.has(r)) cstat.set(r, { n: 0, b: [1e9, 1e9, -1e9, -1e9] }); const c = cstat.get(r); c.n++; c.b[0] = Math.min(c.b[0], s[0], s[2]); c.b[1] = Math.min(c.b[1], s[1], s[3]); c.b[2] = Math.max(c.b[2], s[0], s[2]); c.b[3] = Math.max(c.b[3], s[1], s[3]); });
  const isFurn = r => { const c = cstat.get(r); const w = c.b[2] - c.b[0], h = c.b[3] - c.b[1]; return c.n <= 400 && Math.min(w, h) <= 2.0 && Math.max(w, h) <= 7.2; };
  const wallSegs = segs.filter((s, i) => !isFurn(find(i)));

  /* 2) 格子に壁を描く（ドアのある開口はふさぐ）。大きすぎる図面は格子を粗くする */
  let gx = 1e9, gy = 1e9, gx2 = -1e9, gy2 = -1e9;
  for (const f of F) for (const q of f.poly) { gx = Math.min(gx, q[0]); gy = Math.min(gy, q[1]); gx2 = Math.max(gx2, q[0]); gy2 = Math.max(gy2, q[1]); }
  gx -= 0.5; gy -= 0.5; gx2 += 0.5; gy2 += 0.5;
  let CS = 0.05;
  let W = Math.ceil((gx2 - gx) / CS), H = Math.ceil((gy2 - gy) / CS);
  if (W * H > 6000000) { CS = 0.1; W = Math.ceil((gx2 - gx) / CS); H = Math.ceil((gy2 - gy) / CS); }
  const wall = new Uint8Array(W * H);
  const drawSeg = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len / (CS * 0.5)));
    for (let k = 0; k <= n; k++) { const cx = Math.floor((x0 + (x1 - x0) * k / n - gx) / CS), cy = Math.floor((y0 + (y1 - y0) * k / n - gy) / CS); if (cx >= 0 && cx < W && cy >= 0 && cy < H) wall[cy * W + cx] = 1; }
  };
  wallSegs.forEach(s => drawSeg(s[0], s[1], s[2], s[3]));
  (doors || []).forEach(d => { if (d && d.c && d.m) drawSeg(d.c[0], d.c[1], d.m[0], d.m[1]); });
  const dilate = (src, rounds) => {
    let cur = src;
    for (let r = 0; r < rounds; r++) {
      const nx = new Uint8Array(cur);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cur[y * W + x]) {
        if (x > 0) nx[y * W + x - 1] = 1; if (x < W - 1) nx[y * W + x + 1] = 1;
        if (y > 0) nx[(y - 1) * W + x] = 1; if (y < H - 1) nx[(y + 1) * W + x] = 1;
      }
      cur = nx;
    }
    return cur;
  };
  const wall2 = dilate(wall, 1);
  const labelOpen = walls => {
    const label = new Int32Array(W * H).fill(-1), areas = [];
    const stack = [];
    for (let s = 0; s < W * H; s++) {
      if (walls[s] || label[s] >= 0) continue;
      const id = areas.length; let area = 0; stack.push(s); label[s] = id;
      while (stack.length) { const c = stack.pop(); area++; const x = c % W, y = (c / W) | 0;
        if (x > 0 && !walls[c - 1] && label[c - 1] < 0) { label[c - 1] = id; stack.push(c - 1); }
        if (x < W - 1 && !walls[c + 1] && label[c + 1] < 0) { label[c + 1] = id; stack.push(c + 1); }
        if (y > 0 && !walls[c - W] && label[c - W] < 0) { label[c - W] = id; stack.push(c - W); }
        if (y < H - 1 && !walls[c + W] && label[c + W] < 0) { label[c + W] = id; stack.push(c + W); } }
      areas.push(area * CS * CS);
    }
    return { label, areas };
  };
  let { label, areas } = labelOpen(wall2);

  /* 3) くびれ：壁から2セル以上離れた所（部屋の内側）が2つ以上に分かれる領域は、その間を境にする */
  {
    const ero = labelOpen(dilate(wall, 2));
    const groups = new Map();   // 本来の領域 → 内側のまとまりの数（0.5㎡以上）
    for (let c = 0; c < W * H; c++) {
      const a = label[c], b = ero.label[c];
      if (a < 0 || b < 0 || ero.areas[b] < 0.5) continue;
      if (!groups.has(a)) groups.set(a, new Set());
      groups.get(a).add(b);
    }
    const split = new Set([...groups.entries()].filter(([, s]) => s.size >= 2).map(([a]) => a));
    if (split.size) {
      const wall3 = new Uint8Array(wall2);
      const bigEro = new Set();
      ero.areas.forEach((a, i) => { if (a >= 0.5) bigEro.add(i); });
      for (let c = 0; c < W * H; c++) if (label[c] >= 0 && split.has(label[c]) && !bigEro.has(ero.label[c])) wall3[c] = 1;
      ({ label, areas } = labelOpen(wall3));
    }
  }

  /* 4) 種：部屋名の文字。無い領域は仕上げ・天井高の注記を使う。
   * 部屋名は小さな囲みの中に書かれている事が多いので、その場合は近く（1.5m以内）の
   * 一番大きい領域の種にする（名前の囲みと、名前が指す床は別物） */
  const J = joinTexts(texts || []);
  const cellOf = (x, y) => { const cx = Math.floor((x - gx) / CS), cy = Math.floor((y - gy) / CS); return (cx < 0 || cx >= W || cy < 0 || cy >= H) ? -1 : label[cy * W + cx]; };
  const compFaces = new Map();
  for (const f of F) { if (excluded.has(f.i)) continue; const c = cellOf(f.cx, f.cy); if (c >= 0) compFaces.set(c, (compFaces.get(c) || 0) + 1); }
  const roomSeeds = new Map(), noteSeeds = new Map();
  for (const t of J.texts) {
    const c = cellOf(t.x, t.y); if (c < 0) continue;
    if (classify(t.t) === 'room' && !SKIP_NAMES.has(t.t)) {
      let comp = c, cell = Math.floor((t.y - gy) / CS) * W + Math.floor((t.x - gx) / CS);
      /* 小さい囲みの中の名前は、その名前が指す大きな床の種にする。
       * 条件：自分の領域が10㎡未満／移す先が3倍以上大きい／移す先が0.8m以内に接している */
      if (!(areas[c] >= 3 && compFaces.get(c)) || areas[c] < 10) {
        const R = Math.ceil(1.5 / CS), ccx = Math.floor((t.x - gx) / CS), ccy = Math.floor((t.y - gy) / CS);
        let bestComp = -1, bestArea = 0, bestCell = -1, bestD = Infinity;
        for (let yy = ccy - R; yy <= ccy + R; yy++) for (let xx = ccx - R; xx <= ccx + R; xx++) {
          if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
          const dd = Math.hypot(xx - ccx, yy - ccy); if (dd > R) continue;
          const c2 = label[yy * W + xx];
          if (c2 < 0 || !compFaces.get(c2)) continue;
          if (areas[c2] > bestArea || (areas[c2] === bestArea && dd < bestD)) { bestArea = areas[c2]; bestComp = c2; bestCell = yy * W + xx; bestD = dd; }
        }
        const ownOk = areas[c] >= 3 && compFaces.get(c);
        if (bestComp >= 0 && bestComp !== c && (!ownOk || (bestArea >= areas[c] * 3 && bestD * CS <= 0.8))) { comp = bestComp; cell = bestCell; }
      }
      if (!roomSeeds.has(comp)) roomSeeds.set(comp, []);
      roomSeeds.get(comp).push({ t: t.t, x: t.x, y: t.y, cell });
    }
    else if (NOTE_RE.test(t.t) || classify(t.t) === 'ch') { if (!noteSeeds.has(c)) noteSeeds.set(c, []); noteSeeds.get(c).push(t); }
  }

  /* 5) 領域ごとにゾーンを作る（名前が複数なら陣取り） */
  const zoneCell = new Int32Array(W * H).fill(-1);
  const zones = [];
  const comps = new Map();
  for (let c = 0; c < W * H; c++) if (label[c] >= 0) { if (!comps.has(label[c])) comps.set(label[c], []); comps.get(label[c]).push(c); }
  for (const [comp, cells] of comps) {
    if (areas[comp] < 2 || !compFaces.get(comp)) continue;
    const rs = roomSeeds.get(comp) || [];
    const names = [...new Set(rs.map(t => t.t))];
    let made = [];
    if (names.length === 1) {
      /* 種が1つだけの領域：種から 15m 以内だけをその名前のゾーンにし、残りは名前なしにする
       * （種が1つしか無い広い領域を、更衣室のような小さい部屋の名前で全部塗らないため） */
      const lim = Math.round(15 / CS);
      const dist = new Int32Array(W * H).fill(-1);
      const queue = [];
      rs.forEach(t => { if (label[t.cell] === comp && dist[t.cell] < 0) { dist[t.cell] = 0; queue.push(t.cell); } });
      let head = 0;
      while (head < queue.length) {
        const cc = queue[head++], x = cc % W, y = (cc / W) | 0, d = dist[cc];
        if (d >= lim) continue;
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const nc = ny * W + nx;
          if (label[nc] === comp && dist[nc] < 0) { dist[nc] = d + 1; queue.push(nc); }
        }
      }
      const mine = cells.filter(c => dist[c] >= 0), rest = cells.filter(c => dist[c] < 0);
      made = [{ name: names[0], cells: mine, sx: rs[0].x, sy: rs[0].y }];
      if (rest.length * CS * CS >= 5) made.push({ name: '', cells: rest, sx: null, sy: null });
    } else if (names.length >= 2) {
      const byName = new Map();   // 名前 → {name, cells, sx, sy, id}（この領域内だけの仮番号で陣取り）
      const queue = [];
      rs.forEach(t => {
        if (!byName.has(t.t)) byName.set(t.t, { name: t.t, cells: [], sx: t.x, sy: t.y, id: byName.size });
        const e = byName.get(t.t);
        if (label[t.cell] === comp && zoneCell[t.cell] < 0) { zoneCell[t.cell] = e.id; e.cells.push(t.cell); queue.push(t.cell); }
      });
      let head = 0;
      while (head < queue.length) {
        const cc = queue[head++], x = cc % W, y = (cc / W) | 0, z = zoneCell[cc];
        const e = [...byName.values()].find(v => v.id === z); if (!e) continue;
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const nc = ny * W + nx;
          if (label[nc] === comp && zoneCell[nc] < 0) { zoneCell[nc] = z; e.cells.push(nc); queue.push(nc); }
        }
      }
      made = [...byName.values()].filter(z => z.cells.length * CS * CS >= 1);
    } else {
      const ns = noteSeeds.get(comp) || [];
      let nm = '';
      if (ns.length) { const cnt = {}; ns.forEach(t => { cnt[t.t] = (cnt[t.t] || 0) + 1; }); nm = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]; }
      made = [{ name: nm, cells, sx: null, sy: null }];
    }
    for (const z of made) {
      const idx = zones.length;
      z.cells.forEach(c => { zoneCell[c] = idx; });
      let sx = z.sx, sy = z.sy;
      if (sx == null) { let ax = 0, ay = 0; const step = Math.max(1, Math.floor(z.cells.length / 400)); let n = 0; for (let k = 0; k < z.cells.length; k += step) { ax += (z.cells[k] % W); ay += ((z.cells[k] / W) | 0); n++; } sx = gx + (ax / n + 0.5) * CS; sy = gy + (ay / n + 0.5) * CS; }
      zones.push({ name: z.name, faces: [], area: Math.round(z.cells.length * CS * CS * 10) / 10, x: Math.round(sx * 100) / 100, y: Math.round(sy * 100) / 100 });
    }
  }

  /* 6) 区画をゾーンへ：区画の中を格子で数え、一番多く入ったゾーンに決める
   * （中心だけだと、入れ子の大きい区画や家具の輪の区画を取りこぼすため）。
   * 200㎡を超える大枠の区画（図全体の輪など）は、どのゾーンにも入れない */
  const pip = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const faceZone = new Map();
  for (const f of F) {
    if (excluded.has(f.i)) continue;
    if (f.area != null && f.area > 200) continue;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    f.poly.forEach(q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    const cnt = new Map();
    const step = Math.max(1, Math.floor(Math.max(x1 - x0, y1 - y0) / CS / 60));
    for (let cy = Math.max(0, Math.floor((y0 - gy) / CS)); cy <= Math.min(H - 1, Math.floor((y1 - gy) / CS)); cy += step)
      for (let cx = Math.max(0, Math.floor((x0 - gx) / CS)); cx <= Math.min(W - 1, Math.floor((x1 - gx) / CS)); cx += step) {
        const z = zoneCell[cy * W + cx];
        if (z < 0) continue;
        if (pip(gx + (cx + 0.5) * CS, gy + (cy + 0.5) * CS, f.poly)) cnt.set(z, (cnt.get(z) || 0) + 1);
      }
    if (!cnt.size) continue;
    const best = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (zones[best]) { zones[best].faces.push(f.i); faceZone.set(f.i, best); }
  }
  /* 6.5) 残った小区画の吸収：小さい成分（2㎡未満）に落ちてゾーンに入れなかった
   * 小区画は、近く（2.5m以内）の割当済み区画のゾーンへ寄せる。机まわりの
   * ポケットやブースの断片が、周りの部屋の候補から漏れないようにするため。
   * 吸収の起点は元の割当だけ（吸収した区画からは連鎖させない） */
  const byI = new Map(F.map(f => [f.i, f]));
  const anchors = [...faceZone.entries()];
  for (const f of F) {
    if (faceZone.has(f.i) || excluded.has(f.i)) continue;
    if (f.area != null && f.area > 10) continue;
    let bz = -1, bd = 2.5;
    for (const [ai, az] of anchors) {
      const a = byI.get(ai); if (!a || a.cx == null) continue;
      const d = Math.hypot(a.cx - f.cx, a.cy - f.cy);
      if (d < bd) { bd = d; bz = az; }
    }
    if (bz >= 0 && zones[bz]) { zones[bz].faces.push(f.i); faceZone.set(f.i, bz); }
  }
  /* 区画が入らないゾーンは、広い開けた場所の目印としてだけ残す（20㎡以上）。
   * 件数の上限（60）は区画なしゾーンにだけ効かせ、区画が入ったゾーンは
   * 上限で切り捨てない（実図面では区画ありゾーンだけで60を超えるため） */
  const withFaces = zones.filter(z => z.faces.length);
  const noFaces = zones.filter(z => !z.faces.length && z.area >= 20)
    .sort((a, b) => b.area - a.area).slice(0, Math.max(0, 60 - withFaces.length));
  return [...withFaces, ...noFaces]
    .sort((a, b) => ((b.faces.length > 0) - (a.faces.length > 0)) || ((b.name !== '') - (a.name !== '')) || (b.area - a.area));
}

/* 線でゾーンを分ける：区画の中心が線のどちら側にあるかで分ける。
 * faces: [{i, cx, cy}]、pts: [[x,y],...]（2点以上）。戻り値 [Aの i一覧, Bの i一覧] */
export function splitFacesByLine(faces = [], pts = []) {
  if (!pts || pts.length < 2) return [(faces || []).map(f => f.i), []];
  const side = (x, y) => {
    let best = null, bd = Infinity;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py);
      if (d < bd) { bd = d; best = dx * (y - ay) - dy * (x - ax); }
    }
    return (best || 0) >= 0 ? 0 : 1;
  };
  const A = [], B = [];
  (faces || []).forEach(f => { (side(f.cx, f.cy) === 0 ? A : B).push(f.i); });
  return [A, B];
}
