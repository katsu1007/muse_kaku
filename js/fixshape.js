/* 器具の形の特徴取り出し — 図面の線から、器具1個の輪郭の特徴を出す。
 * 器具の読み取り（旧エンジン）は器具の外形の箱しか渡さないので、辞書の判定は
 * 寸法だけが根拠だった（js/symdict.js の classifyBox）。ここでは箱の中の線を
 * 集めて、家具の検出（js/furndetect.js）と同じ物差しで形の特徴を出す：
 *   { short, long（mm）, arcShare, closed, innerClosed, dividers, tankBand, n, tier }
 * 判定（何であるか）は symdict 側の仕事で、ここは幾何の特徴だけを返す。
 *
 * 取り出し方（器具本体の輪郭だけを証拠にするための歯止め）：
 * 器具の箱（特に救済検出の箱）は、隣の物やドアの開閉弧まで飲み込んでいることが
 * ある（2026-11-21 の和式便器の件：合体した箱の寸法を器具の寸法と誤った）。
 * そこで「箱の中で一番大きい線の集まり＝本体」とは決め打ちせず、端点の近さで
 * つないだ集まりの外形が箱とどう重なるかで、2段の受け入れ条件を置く：
 *   tier1（ぴったり型）: 集まりの外形がボックスの幅・高さとも85%以上を覆い、
 *                        ボックスからのはみ出しが60mm以内。
 *   tier2（内包型）: 集まりの外形がボックスの中（はみ出し30mm以内）に収まり、
 *                        ボックス内の線の長さの60%以上をその集まりが占め、
 *                        2番目に大きい集まりがその40%以下（本体が支配的）。
 * どちらにも当たらなければ null を返す（形は取り出せない＝呼び出し側は
 * 従来の寸法だけの表示に落とす）。線は中点が箱の近辺にある物だけを集める
 * （furndetect と同じ）。集めた線の中で器具と端点がつながった集まりは、
 * 壁のように箱の外へ伸びていれば、はみ出しの条件で落ちる。
 *
 * 特徴の定義は furndetect と同じ（円弧はエンジンが短い線の連なりで渡してくるので、
 * 80mm未満の線の長さ割合を arcShare とする。closed は端点のつながり割合 0.75 以上）。
 * innerClosed（内側の閉曲線）は器具のために足した特徴：集まりの外形から45mm以上
 * 内側にある線だけで、端点がほぼ全部つながる閉じた輪（80mm以上）があるか。
 * 便器・洗面器のボウルは閉じた楕円で true、小便器の内側の線は開いた曲線で
 * false になる（辞書のパターンが切り分けに使う）。センサー等の小さい丸
 * （60mm級）は大きさの下限で除く。
 * tankBand（sw.50、タンク帯の有無 true/false、測れなければ null）も器具のために
 * 足した特徴：タイプ補正（js/typefix.js）の物差し hasTankBand を、受理した
 * 集まり＝器具本体の線だけに適用して測る。図面全体の線で測ると、シンボルの
 * 中心線や隣の線でも「帯あり」になってしまう（2026-11-22 の5図面実測：
 * 全線プールでは小便器19件中19件・洗面器11/12件まで帯ありになり分離しない。
 * 集まりに限っても小便器は中心線等で帯ありになるため、帯は「便器の必要条件」
 * としてだけ使う。詳しくは js/symdict.js の classifyFixtureShape の注記）。 */

import { hasTankBand } from './typefix.js';

const TOL = 0.045;       /* 端点同士を「つながっている」と見る距離（m、furndetect と同じ） */
const CELL = 0.05;       /* 端点グリッドの一辺（m、furndetect と同じ） */
const MCELL = 0.25;      /* 中点グリッドの一辺（m） */
const SHORT_SEG = 0.08;  /* これより短い線は「曲線の近似」と見る長さ（m、furndetect と同じ） */
const POOL_EXPAND = 0.16;/* 端点の相手を探す範囲（ボックス＋この余白、m） */
const CORE_EXPAND = 0.10;/* つながりを調べる線を集める範囲（ボックス＋この余白、m） */
const SPILL1 = 0.06;     /* tier1: 集まりの外形がボックスからはみ出してよい量（m） */
const SPILL2 = 0.03;     /* tier2: 同上 */
const COVER1 = 0.85;     /* tier1: 集まりの外形がボックスを覆う割合（幅・高さとも） */
const DOM_SHARE = 0.60;  /* tier2: 本体の集まりがボックス内の線に占める割合 */
const DOM_RATIO = 0.40;  /* tier2: 2番目の集まりが本体のこの割合以下 */
const MIN_SEGS = 3;      /* 集まりと見る最小の線数（furndetect と同じ） */
const MIN_LEN = 0.8;     /* 集まりの線の長さ合計の下限（m） */

const cellKey = (x, y, c) => Math.floor(x / c) + ':' + Math.floor(y / c);

/* segs: [[x1,y1,x2,y2], ...]（m）。器具の輪郭は、線のグループのON/OFFに関係なく
 * 図面の全線を渡すのが望ましい（器具レイヤーは区画探しのグループから外れて
 * いることがあり、plan.segs だけでは輪郭が無い図面がある。js/legacy.js の allSegs）。
 * 戻り値: { featuresFor(b) } — b は器具の外形 [x0,y0,x1,y1]（m） */
export function createShapeIndex(segs) {
  const S = (segs || []).filter(s => s && s.length >= 4 && (Math.abs(s[2] - s[0]) > 1e-9 || Math.abs(s[3] - s[1]) > 1e-9));
  const n = S.length;
  const segLen = S.map(s => Math.hypot(s[2] - s[0], s[3] - s[1]));

  /* 中点グリッド（範囲内の線を引くため） */
  const mgrid = new Map();
  S.forEach((s, i) => {
    const k = cellKey((s[0] + s[2]) / 2, (s[1] + s[3]) / 2, MCELL);
    let a = mgrid.get(k); if (!a) { a = []; mgrid.set(k, a); }
    a.push(i);
  });
  const inRange = (x0, y0, x1, y1) => {
    const out = [];
    const gx0 = Math.floor(x0 / MCELL), gx1 = Math.floor(x1 / MCELL), gy0 = Math.floor(y0 / MCELL), gy1 = Math.floor(y1 / MCELL);
    for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
      const a = mgrid.get(gx + ':' + gy); if (!a) continue;
      for (const i of a) {
        const s = S[i], mx = (s[0] + s[2]) / 2, my = (s[1] + s[3]) / 2;
        if (mx >= x0 && mx <= x1 && my >= y0 && my <= y1) out.push(i);
      }
    }
    return out;
  };

  function featuresFor(b) {
    if (!b || b.length < 4) return null;
    const bx0 = Math.min(b[0], b[2]), bx1 = Math.max(b[0], b[2]);
    const by0 = Math.min(b[1], b[3]), by1 = Math.max(b[1], b[3]);
    const bw = bx1 - bx0, bh = by1 - by0;
    if (!(bw > 0.05) || !(bh > 0.05)) return null;

    const core = inRange(bx0 - CORE_EXPAND, by0 - CORE_EXPAND, bx1 + CORE_EXPAND, by1 + CORE_EXPAND);
    if (core.length < MIN_SEGS) return null;
    const pool = inRange(bx0 - POOL_EXPAND, by0 - POOL_EXPAND, bx1 + POOL_EXPAND, by1 + POOL_EXPAND);

    /* 端点のつながり（プールの中で数える。furndetect は図面全体で数えるが、
     * 器具の輪郭の端点の相手は近くにしかいないので、結果はほぼ同じになる） */
    const paired = new Set(); /* "segIdx*2+e" */
    {
      const grid = new Map();
      for (const i of pool) {
        const s = S[i];
        [[s[0], s[1], 0], [s[2], s[3], 1]].forEach(([x, y, e]) => {
          const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
          for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const arr = grid.get(gx + ':' + gy); if (!arr) continue;
            for (const o of arr) {
              const dx = o.x - x, dy = o.y - y;
              if (dx * dx + dy * dy <= TOL * TOL) { paired.add(i * 2 + e); paired.add(o.seg * 2 + o.e); }
            }
          }
          const k = cellKey(x, y, CELL);
          let arr = grid.get(k); if (!arr) { arr = []; grid.set(k, arr); }
          arr.push({ x, y, seg: i, e });
        });
      }
    }

    /* コアの線を端点の近さでつなぐ（union-find） */
    const par = new Int32Array(core.length);
    for (let j = 0; j < core.length; j++) par[j] = j;
    const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const union = (a, b2) => { a = find(a); b2 = find(b2); if (a !== b2) par[a] = b2; };
    {
      const grid = new Map();
      core.forEach((segIdx, j) => {
        const s = S[segIdx];
        [[s[0], s[1]], [s[2], s[3]]].forEach(([x, y]) => {
          const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
          for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const arr = grid.get(gx + ':' + gy); if (!arr) continue;
            for (const o of arr) {
              const dx = o.x - x, dy = o.y - y;
              if (dx * dx + dy * dy <= TOL * TOL) union(j, o.j);
            }
          }
          const k = cellKey(x, y, CELL);
          let arr = grid.get(k); if (!arr) { arr = []; grid.set(k, arr); }
          arr.push({ x, y, j });
        });
      });
    }

    /* 集まりごとに外形と長さを出す。inLen は「中点がボックス＋20mm の中」の線だけの長さ */
    const ix0 = bx0 - 0.02, ix1 = bx1 + 0.02, iy0 = by0 - 0.02, iy1 = by1 + 0.02;
    const comps = new Map();
    let totalInLen = 0;
    core.forEach((segIdx, j) => {
      const s = S[segIdx], mx = (s[0] + s[2]) / 2, my = (s[1] + s[3]) / 2;
      const inside = mx >= ix0 && mx <= ix1 && my >= iy0 && my <= iy1;
      if (inside) totalInLen += segLen[segIdx];
      const r = find(j);
      let c = comps.get(r);
      if (!c) { c = { segs: [], x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, len: 0, inLen: 0 }; comps.set(r, c); }
      c.segs.push(segIdx);
      c.x0 = Math.min(c.x0, s[0], s[2]); c.x1 = Math.max(c.x1, s[0], s[2]);
      c.y0 = Math.min(c.y0, s[1], s[3]); c.y1 = Math.max(c.y1, s[1], s[3]);
      c.len += segLen[segIdx];
      if (inside) c.inLen += segLen[segIdx];
    });
    if (!(totalInLen > 0)) return null;

    /* 受け入れ判定（上のコメントの2段） */
    const spill = c => Math.max(bx0 - c.x0, c.x1 - bx1, by0 - c.y0, c.y1 - by1);
    let best = null;
    const sorted = [...comps.values()].filter(c => c.segs.length >= MIN_SEGS && c.len >= MIN_LEN).sort((a, b2) => b2.inLen - a.inLen);
    for (const c of sorted) {
      const cw = c.x1 - c.x0, ch = c.y1 - c.y0;
      if (spill(c) <= SPILL1 && cw >= bw * COVER1 && ch >= bh * COVER1) { best = { c, tier: 1 }; break; }
    }
    if (!best && sorted.length) {
      const c = sorted[0];
      const second = sorted.length > 1 ? sorted[1].inLen : 0;
      if (spill(c) <= SPILL2 && c.inLen >= totalInLen * DOM_SHARE && second <= c.inLen * DOM_RATIO) best = { c, tier: 2 };
    }
    if (!best) return null;

    /* 特徴を出す（furndetect と同じ定義） */
    const c = best.c, member = new Set(c.segs);
    let len = 0, shortLen = 0, pairedN = 0;
    for (const i of c.segs) {
      len += segLen[i];
      if (segLen[i] < SHORT_SEG) shortLen += segLen[i];
      if (paired.has(i * 2)) pairedN++;
      if (paired.has(i * 2 + 1)) pairedN++;
    }
    const pairRatio = c.segs.length ? pairedN / (c.segs.length * 2) : 0;
    /* 内側の線（分割線）：集まりの外形の中にすっぽり入る、集まり以外の線を数える */
    const inset = 0.02;
    let dividers = 0;
    for (const i of inRange(c.x0, c.y0, c.x1, c.y1)) {
      if (member.has(i)) continue;
      const s = S[i];
      if (s[0] > c.x0 + inset && s[0] < c.x1 - inset && s[2] > c.x0 + inset && s[2] < c.x1 - inset &&
          s[1] > c.y0 + inset && s[1] < c.y1 - inset && s[3] > c.y0 + inset && s[3] < c.y1 - inset) dividers++;
    }
    /* 内側の閉曲線（ボウルの楕円など）があるか。形ごとの詳細（大きさ・弧率）も集める：
     * 衛生器具の証拠分岐（symdict の sanitaryShapeEvidence）が最大の閉形の弧率を使う。
     * innerClosed の真偽の決め方は従来と同一（最初に条件を満たした塊で true）。 */
    const innerInfo = (() => {
      const M = 0.045;
      const inner = pool.filter(i => {
        const s = S[i];
        return s[0] >= c.x0 + M && s[0] <= c.x1 - M && s[2] >= c.x0 + M && s[2] <= c.x1 - M &&
               s[1] >= c.y0 + M && s[1] <= c.y1 - M && s[3] >= c.y0 + M && s[3] <= c.y1 - M;
      });
      if (inner.length < 6) return { closed: false, shapes: [] };
      const par2 = new Int32Array(inner.length);
      for (let j = 0; j < inner.length; j++) par2[j] = j;
      const find2 = a => { while (par2[a] !== a) { par2[a] = par2[par2[a]]; a = par2[a]; } return a; };
      const pairedIn = new Set();
      const grid = new Map();
      inner.forEach((segIdx, j) => {
        const s = S[segIdx];
        [[s[0], s[1], 0], [s[2], s[3], 1]].forEach(([x, y, e]) => {
          const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
          for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const arr = grid.get(gx + ':' + gy); if (!arr) continue;
            for (const o of arr) {
              const dx = o.x - x, dy = o.y - y;
              if (dx * dx + dy * dy <= TOL * TOL) {
                const ra = find2(j), rb = find2(o.j); if (ra !== rb) par2[ra] = rb;
                pairedIn.add(j * 2 + e); pairedIn.add(o.j * 2 + o.e);
              }
            }
          }
          const k = cellKey(x, y, CELL);
          let arr = grid.get(k); if (!arr) { arr = []; grid.set(k, arr); }
          arr.push({ x, y, j, e });
        });
      });
      const subs = new Map();
      inner.forEach((segIdx, j) => { const r = find2(j); if (!subs.has(r)) subs.set(r, []); subs.get(r).push(j); });
      const shapes = [];
      for (const js of subs.values()) {
        if (js.length < 6) continue;
        let pr = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, sl = 0, tl = 0;
        for (const j of js) {
          if (pairedIn.has(j * 2)) pr++;
          if (pairedIn.has(j * 2 + 1)) pr++;
          const s = S[inner[j]];
          x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]);
          y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]);
          const L = segLen[inner[j]]; tl += L; if (L < SHORT_SEG) sl += L;
        }
        if (pr / (js.length * 2) < 0.9) continue;
        const w2 = x1 - x0, h2 = y1 - y0;
        if (w2 >= 0.08 && h2 >= 0.08) shapes.push({
          short: Math.round(Math.min(w2, h2) * 1000), long: Math.round(Math.max(w2, h2) * 1000),
          arcShare: tl > 0 ? Math.round(sl / tl * 100) / 100 : 0, n: js.length,
        });
      }
      shapes.sort((a, b2) => (b2.short * b2.long) - (a.short * a.long));
      return { closed: shapes.length > 0, shapes };
    })();
    const innerClosed = innerInfo.closed;

    /* タンク帯：器具本体の線（受理した集まり）だけで測る。箱ではなく集まりの
     * 線を渡すのが肝心（hasTankBand 側で箱の中点フィルタもかかる）。
     * 線が足りない・例外の時は null（＝証拠なし。表示は従来どおりになる） */
    let tankBand = null;
    try { tankBand = hasTankBand(b, c.segs.map(i => S[i])); } catch (e) { tankBand = null; }

    const w = c.x1 - c.x0, h = c.y1 - c.y0;
    return {
      short: Math.round(Math.min(w, h) * 1000), long: Math.round(Math.max(w, h) * 1000),
      arcShare: len > 0 ? Math.round(Math.min(1, shortLen / len) * 100) / 100 : 0,
      closed: pairRatio >= 0.75,
      innerClosed,
      innerShapes: innerInfo.shapes,
      dividers: Math.min(99, dividers),
      tankBand,
      n: c.segs.length, tier: best.tier,
    };
  }

  return { featuresFor };
}
