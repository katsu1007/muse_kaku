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
 * この補正が効くのは辞書の寸法判定だけ。図面の線・区画・部屋・見積の数字は変えない。
 *
 * 手入力（d.scaleUser・村中さんの指示 2026-11-24）：検証で確定できない所は赤文字で出し、
 * 要確認リストから人が換算係数（実寸 = 図面で測った長さ × 係数）を決められる。
 * 手入力がある図面では、自動の推定より手入力を優先する（symScaleFor が先に見る）。
 * 効く範囲は、辞書の寸法判定（symScale.factor 経由）と、区画から作る部屋の広さ・周り
 * （project.js の geoOf が scaleGeomBy で直す）だけ。自動の値では部屋の数字は直さない
 * （「自動では直しません」の規律は従来どおり）。図面の線そのものは変えない。 */
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

/* 手入力の係数（d.scaleUser）から作る symScale。同じ図面・同じ値なら同じ物を返す
 * （呼び出し側のキャッシュが symScale の同一性で効くため）。保存データには混ぜない
 * ので、モジュール側の WeakMap に覚える */
const userScaleCache = new WeakMap();
function userScale(d) {
  const k = d && d.scaleUser;
  if (!(typeof k === 'number' && Number.isFinite(k) && k > 0)) return null;
  const c = userScaleCache.get(d);
  if (c && c.coef === k) return c.obj;
  const obj = { factor: 1 / k, source: 'user', n: 0, spread: null };
  userScaleCache.set(d, { coef: k, obj });
  return obj;
}

/* 人が決めた換算係数（実寸 = 図面で測った長さ × 係数）。決めていなければ null */
export function userCoef(d) {
  const k = d && d.scaleUser;
  return (typeof k === 'number' && Number.isFinite(k) && k > 0) ? k : null;
}

/* 図面の覚え書き（drawing レコード）から symScale を用意する。dimCheckFor と同じ作り：
 * 読み込み時に付いていればそれを返し、無ければ覚えている寸法・器具・家具の候補から
 * 作り直して d.symScale に覚える（古い保存も、開いた時にその場で補える）。
 * 手入力（scaleUser）がある時は、自動の推定より手入力を優先する。 */
export function symScaleFor(d) {
  if (!d) return { factor: 1, source: null, n: 0, spread: null, why: '図面が無い' };
  const us = userScale(d);
  if (us) return us;
  if (d.symScale) return d.symScale;
  let dimCheck = d.dimCheck || null;
  if (!dimCheck) { try { dimCheck = dimCheckFor(d); } catch (e) { dimCheck = null; } }
  const ss = estimateSymScale({ dimCheck, fixtures: d.fixtures || [], clusters: d.furn || [] });
  d.symScale = ss;
  return ss;
}

/* ===== 縮尺・換算係数の検証（表示と手入力の入口） =====
 * 係数は「実寸 = 図面で測った長さ × 係数」で統一する（寸法の答え合わせの比率と
 * 同じ向き。用紙mm 1/50 の図面なら約 50、実寸どおりなら 1）。
 * 状態は4つ：
 *   verified   寸法の答え合わせ（比率が 1% 以内）か、便器の大きさの証拠で確定
 *   mismatch   寸法の答え合わせで比率が 1% を超えてずれている（値は赤で出す）
 *   unverified 答え合わせできる材料が無く、係数 1 は仮の置き方（値は赤で出す）
 *   manual     人が要確認リストから係数を決めた（出どころは手入力）
 * 戻り値: { state, coef, autoCoef, source, n, why }
 *   coef     今効いている係数（manual なら手入力、それ以外は自動の値）
 *   autoCoef 自動だけならこの値（証拠が無ければ null）。編集画面の「自動に戻す」用
 * この関数は図面レコードを書き換えない（dimCheckFor / symScaleFor が従来どおり
 * 遅れて覚える分は除く）。 */
export function scaleCheck(d) {
  if (!d) return { state: 'unverified', coef: 1, autoCoef: null, autoSource: null, source: null, n: 0, why: '図面が無い' };
  const auto = autoScaleOf(d);
  const k = userCoef(d);
  if (k !== null) return { state: 'manual', coef: k, autoCoef: auto ? auto.coef : null, autoSource: auto ? auto.source : null, source: 'user', n: auto ? auto.n : 0, why: (auto && auto.why) || '' };
  if (auto) return { state: auto.state, coef: auto.coef, autoCoef: auto.coef, autoSource: auto.source, source: auto.source, n: auto.n, why: auto.why || '' };
  return { state: 'unverified', coef: 1, autoCoef: null, autoSource: null, source: null, n: 0, why: unverifiedWhy(d) };
}

/* 自動の値だけを見る（手入力は見ない）。確定できる時は { state, coef, source, n }、
 * 決めきれない時は null */
function autoScaleOf(d) {
  let chk = null;
  try { chk = dimCheckFor(d); } catch (e) { chk = null; }
  if (chk && chk.n >= 1 && typeof chk.median === 'number' && chk.median > 0) {
    return Math.abs(chk.median - 1) > 0.01
      ? { state: 'mismatch', coef: chk.median, source: 'dims', n: chk.n }
      : { state: 'verified', coef: chk.median, source: 'dims', n: chk.n };
  }
  let ss = null;
  try { ss = symScaleFor(d); } catch (e) { ss = null; }
  /* symScaleFor は手入力も返すので、source が 'user' の時は自動の証拠とは扱わない */
  if (ss && (ss.source === 'dims' || ss.source === 'symbols') && ss.factor > 0)
    return { state: 'verified', coef: 1 / ss.factor, source: ss.source, n: ss.n };
  return null;
}

/* 未検証の理由（人が要確認リストで見る文）。材料の有無で言い分ける */
function unverifiedWhy(d) {
  const dims = (d && d.dims) || [];
  if (!dims.length) return '図面に寸法が書かれていないため、答え合わせできていません';
  if (!dims.some(x => x && x.p1 && x.p2)) return '寸法に定義点が残っていないため答え合わせできません（図面を読み直すと出ます）';
  let ss = null;
  try { ss = symScaleFor(d); } catch (e) { ss = null; }
  if (ss && ss.source !== 'user' && ss.why) return `寸法の証拠が弱く、${ss.why}ため、決めきれていません`;
  return '答え合わせできる寸法が足りません';
}

/* 要確認リストをタップした時の、プレビューの飛び先（図面座標 m の [x1,y1,x2,y2]）。
 * 優先順位：寸法の定義点（座標が図面の範囲内にある時だけ）→ 便器の器具 → 一番大きい区画。
 * どれも無ければ null（全体表示のまま編集だけ開く） */
export function scaleTargetFor(d) {
  if (!d) return null;
  const faces = (d.plan && d.plan.faces) || [];
  let bb = null;
  faces.forEach(f => { if (!f || !f.poly) return; f.poly.forEach(q => { if (!bb) bb = [q[0], q[1], q[0], q[1]]; else { bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); } }); });
  const dims = (d.dims || []).filter(x => x && x.p1 && x.p2);
  if (dims.length && bb) {
    const x = dims[0];
    const box = [Math.min(x.p1.x, x.p2.x) / 1000, Math.min(x.p1.y, x.p2.y) / 1000, Math.max(x.p1.x, x.p2.x) / 1000, Math.max(x.p1.y, x.p2.y) / 1000];
    /* 寸法の座標（mm→m）が図面の範囲（少し広げた物）の中にある時だけ使う。
     * 読み取りで原点や向きが変わっている図面では、合わない所へ飛ばないようにする */
    const pad = Math.max(bb[2] - bb[0], bb[3] - bb[1]) * 0.1 + 1;
    if (box[0] >= bb[0] - pad && box[2] <= bb[2] + pad && box[1] >= bb[1] - pad && box[3] <= bb[3] + pad) {
      const p = 1;
      return [box[0] - p, box[1] - p, box[2] + p, box[3] + p];
    }
  }
  const fx = (d.fixtures || []).find(x => x && x.t === 'toilet' && x.b) || (d.fixtures || []).find(x => x && x.b);
  if (fx) { const p = 0.6; return [fx.b[0] - p, fx.b[1] - p, fx.b[2] + p, fx.b[3] + p]; }
  if (faces.length) {
    let big = null;
    faces.forEach(f => { if (f && f.poly && (!big || (f.area || 0) > (big.area || 0))) big = f; });
    if (big) { let b = null; big.poly.forEach(q => { if (!b) b = [q[0], q[1], q[0], q[1]]; else { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); } }); return b; }
  }
  return null;
}

/* 部屋の広さ・周りを、手入力の係数で実寸に直す（長さは ×k、面積は ×k²）。
 * 座標そのもの（holes.runs など、絵に出す位置）は変えない。k が 1 の時・
 * 形が無い時は、渡された物をそのまま返す */
export function scaleGeomBy(geom, k) {
  if (!geom || !(typeof k === 'number' && Number.isFinite(k) && k > 0) || k === 1) return geom;
  const r2 = v => Math.round(v * 100) / 100;
  const out = { ...geom, area: r2((geom.area || 0) * k * k), perim: r2((geom.perim || 0) * k) };
  if (geom.holes) out.holes = { ...geom.holes, area: r2((geom.holes.area || 0) * k * k) };
  return out;
}
