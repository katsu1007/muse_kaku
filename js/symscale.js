/* シンボルの大きさの自動補正（縮尺の推定） — 図面の中の証拠だけから、辞書が見る
 * 寸法の倍率（symScale.factor）を推定する。factor は「図面の座標が実寸の何倍で
 * 描かれているか」で、辞書の寸法判定では実寸 = 測った寸法 ÷ factor として使う。
 * factor が 1 の時は補正なし（従来と完全に同じ）。
 *
 * 証拠は2つ。優先順位の高い順に：
 *   1. 寸法（DXF）: js/dxf-dims.js の答え合わせ（寸法の値 ÷ 定義点の距離）の中央値。
 *      書かれた寸法は実寸そのものなので、座標の倍率はその逆数になる。
 *      JWW は現在の読み取りでは寸法を別に抜いていない（寸法は線と文字で出る）ので、
 *      JWW ではこの証拠は無く、2 に落ちる。
 *   2. 便器の大きさ（JWW 含む）: 洋式大便器は描画の長さが 690〜800mm に収まる
 *      （実測：TOILET_JWW.md の平面 690/760/785、CES9415 の 713。基準の中央は 760）。
 *      標本は「読み取りが便器と拾った器具」と「辞書が便器で確定した線の候補」。
 *      長さの中央値が実在帯 [690, 800] の中なら縮尺は合っていると見て 1 のまま。
 *      帯の外なら、中央値 ÷ 760 を factor とする。
 *      小便器は器具の外形に仕切り板まで入る図面があり（実測 503×344）、外形の長さが
 *      一定しないので標本にしない。洗面器などは寸法帯が広く、証拠として弱いので使わない。
 *
 * 規律：強い証拠がある時だけ 1 以外にする。標本 5 件未満、または標本のばらつき
 * （中央絶対偏差 ÷ 中央値）が 5% を超える時は「決めきれない」として 1 のままにし、
 * 理由（why）を覚える。寸法は 3 件以上あり、中央値から 1% を超えて外れた物が
 * 2 割以下（＝8 割以上が一致）の時だけ使う。
 * この補正が効くのは辞書の寸法判定だけ。図面の線・区画・部屋・見積の数字は変えない。 */
import { classifyCluster } from './symdict.js';
import { dimCheckFor } from './dxf-dims.js';

/* 便器の描画の長さ：実在帯と、その中央（基準寸法） */
export const TOILET_LONG_BAND = [690, 800];
export const TOILET_LONG_REF = 760;
/* 標本の最低件数と、ばらつき（MAD ÷ 中央値）の上限 */
export const SYM_MIN_SAMPLES = 5;
export const SYM_SPREAD_MAX = 0.05;
/* 寸法の証拠として使う最低件数と、中央値への一致割合の下限 */
export const DIM_MIN_COUNT = 3;
export const DIM_AGREE_MIN = 0.8;

const medianOf = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const madOf = (xs, med) => medianOf(xs.map(x => Math.abs(x - med)));

/* 寸法の答え合わせ（dimCheck = { n, median, outliers }）から factor を出す。
 * dimCheck.median は「寸法の値（実寸）÷ 定義点の距離（座標の長さ）」なので、
 * 座標の倍率（描かれた大きさ ÷ 実寸）はその逆数。
 * 証拠が弱い時は null（呼び出し側で次の証拠に落ちる）。
 * 戻り値: { factor, source: 'dims', n, spread }（spread は中央値から外れた寸法の割合） */
export function factorFromDims(dimCheck) {
  if (!dimCheck || typeof dimCheck.median !== 'number' || !(dimCheck.median > 0)) return null;
  const n = dimCheck.n || 0;
  if (n < DIM_MIN_COUNT) return null;
  const out = (dimCheck.outliers || []).length;
  if ((n - out) / n < DIM_AGREE_MIN) return null;
  let factor = 1 / dimCheck.median;
  if (!Number.isFinite(factor) || factor <= 0) return null;
  if (Math.abs(factor - 1) <= 0.01) factor = 1;
  return { factor, source: 'dims', n, spread: out / n };
}

/* 便器の描画の長さ（mm）の列から factor を出す。
 * 中央値が実在帯 [690, 800] の中なら、縮尺が合っている証拠として factor 1 を返す
 * （証拠なしの null とは区別する）。帯の外で、標本が 5 件以上・ばらつき 5% 以下
 * の時だけ、中央値 ÷ 基準寸法を factor とする。それ以外は null（弱い証拠）。 */
export function factorFromSymbols(longs) {
  const xs = (longs || []).filter(x => Number.isFinite(x) && x > 0);
  if (xs.length < SYM_MIN_SAMPLES) return null;
  const med = medianOf(xs);
  const spread = madOf(xs, med) / med;
  if (!(spread <= SYM_SPREAD_MAX)) return null;
  if (med >= TOILET_LONG_BAND[0] && med <= TOILET_LONG_BAND[1])
    return { factor: 1, source: 'symbols', n: xs.length, spread };
  const factor = med / TOILET_LONG_REF;
  if (!(factor >= 0.3 && factor <= 3)) return null;
  if (Math.abs(factor - 1) <= 0.01) return { factor: 1, source: 'symbols', n: xs.length, spread };
  return { factor, source: 'symbols', n: xs.length, spread };
}

/* 便器の標本の長さを集める。
 * - 器具（fixtures）: 読み取りが便器（t === 'toilet'）と拾った物の外形の長辺。
 * - 線の候補（clusters）: 辞書が補正なしで「洋式大便器」と確定した物の長辺。
 *   （自分の辞書は使わない＝初期状態の辞書で数える） */
export function toiletLongs(fixtures, clusters) {
  const out = [];
  for (const x of fixtures || []) {
    if (!x || x.t !== 'toilet' || !x.b || x.b.length < 4) continue;
    const long = Math.max(Math.abs(x.b[2] - x.b[0]), Math.abs(x.b[3] - x.b[1])) * 1000;
    if (long > 0) out.push(long);
  }
  for (const x of clusters || []) {
    if (!x || !(x.long > 0)) continue;
    let r = null;
    try { r = classifyCluster(x, [], null, 1); } catch (e) { r = null; }
    if (r && r.verdict === 'hit' && r.category === '洋式大便器') out.push(x.long);
  }
  return out;
}

/* 図面1枚分の symScale を推定する。
 * 入力: { dimCheck, fixtures, clusters }（どれも無くてよい）
 * 戻り値: { factor, source: 'dims' | 'symbols' | null, n, spread, why? }
 *   source が null の時は factor は 1 で、why に「決めきれなかった理由」を入れる */
export function estimateSymScale(input = {}) {
  const { dimCheck = null, fixtures = [], clusters = [] } = input || {};
  const fromDims = factorFromDims(dimCheck);
  if (fromDims) return fromDims;
  const longs = toiletLongs(fixtures, clusters);
  const fromSyms = factorFromSymbols(longs);
  if (fromSyms) return fromSyms;
  let why;
  if (!longs.length) why = '便器の標本が無い';
  else if (longs.length < SYM_MIN_SAMPLES) why = `便器の標本が${SYM_MIN_SAMPLES}件未満（${longs.length}件）`;
  else {
    const med = medianOf(longs);
    why = (madOf(longs, med) / med > SYM_SPREAD_MAX) ? '便器の大きさがばらついている' : '便器の大きさが実在帯から大きく外れている';
  }
  return { factor: 1, source: null, n: longs.length, spread: null, why };
}

/* 図面の覚え書き（drawing レコード）から symScale を用意する。dimCheckFor と同じ作り：
 * 読み込み時に付いていればそれを返し、無ければ覚えている寸法・器具・家具の候補から
 * 作り直して d.symScale に覚える（古い保存も、開いた時にその場で補える）。 */
export function symScaleFor(d) {
  if (!d) return { factor: 1, source: null, n: 0, spread: null, why: '図面が無い' };
  if (d.symScale) return d.symScale;
  let dimCheck = d.dimCheck || null;
  if (!dimCheck) { try { dimCheck = dimCheckFor(d); } catch (e) { dimCheck = null; } }
  const ss = estimateSymScale({ dimCheck, fixtures: d.fixtures || [], clusters: d.furn || [] });
  d.symScale = ss;
  return ss;
}
