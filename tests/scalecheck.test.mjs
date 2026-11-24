/* 縮尺・換算係数の検証（js/symscale.js の scaleCheck など）のテスト。実行：node --test tests/
 * 係数は「実寸 = 図面で測った長さ × 係数」。状態は verified / mismatch / unverified / manual。
 * 手入力は drawing.scaleUser（出どころは手入力）。自動の値では部屋の数字は直さない。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleCheck, scaleTargetFor, scaleGeomBy, userCoef, symScaleFor } from '../js/symscale.js';

/* ===== 状態の判定 ===== */

test('検証：寸法の比率が 1 の図面は verified（係数 1・出どころは寸法）', () => {
  const d = { dims: [{}], dimCheck: { n: 25, median: 1, outliers: [] } };
  const sc = scaleCheck(d);
  assert.equal(sc.state, 'verified');
  assert.equal(sc.coef, 1);
  assert.equal(sc.source, 'dims');
  assert.equal(sc.autoCoef, 1);
});

test('検証：寸法の比率が 1% を超えてずれた図面は mismatch（係数は比率そのもの）', () => {
  const d = { dims: [{}], dimCheck: { n: 30, median: 50, outliers: [{}] } };
  const sc = scaleCheck(d);
  assert.equal(sc.state, 'mismatch');
  assert.equal(sc.coef, 50);
  assert.equal(sc.source, 'dims');
});

test('検証：寸法が無く証拠も無い図面は unverified（係数 1 は仮・理由つき）', () => {
  const d = { plan: { faces: [] }, dims: [], fixtures: [], furn: [] };
  const sc = scaleCheck(d);
  assert.equal(sc.state, 'unverified');
  assert.equal(sc.coef, 1);
  assert.equal(sc.autoCoef, null);
  assert.match(sc.why, /寸法が書かれていない/);
});

test('検証：寸法が無くても、便器の大きさが実在帯なら verified（出どころは便器）', () => {
  const toilet = { t: 'toilet', b: [0, 0, 0.4, 0.75] };   /* 長辺 750mm は実在帯 690〜800 の中 */
  const d = { plan: { faces: [] }, dims: [], fixtures: Array.from({ length: 6 }, () => ({ ...toilet })), furn: [] };
  const sc = scaleCheck(d);
  assert.equal(sc.state, 'verified');
  assert.equal(sc.source, 'symbols');
  assert.equal(sc.coef, 1);
});

test('検証：寸法はあるが定義点が無い保存は unverified（読み直しを案内する理由）', () => {
  const d = { plan: { faces: [] }, dims: [{ type: 'linear', value: 100, text: '100' }], fixtures: [], furn: [] };
  const sc = scaleCheck(d);
  assert.equal(sc.state, 'unverified');
  assert.match(sc.why, /定義点が残っていない/);
});

/* ===== 手入力（scaleUser） ===== */

test('手入力：scaleUser があれば manual になり、自動の値も併せて返す', () => {
  const d = { dims: [{}], dimCheck: { n: 25, median: 1, outliers: [] }, scaleUser: 50 };
  const sc = scaleCheck(d);
  assert.equal(sc.state, 'manual');
  assert.equal(sc.coef, 50);
  assert.equal(sc.source, 'user');
  assert.equal(sc.autoCoef, 1);
  assert.equal(sc.autoSource, 'dims');
});

test('手入力：証拠が無い図面で決めた時は autoCoef が null（戻す先は未検証）', () => {
  const d = { plan: { faces: [] }, dims: [], fixtures: [], furn: [], scaleUser: 10 };
  const sc = scaleCheck(d);
  assert.equal(sc.state, 'manual');
  assert.equal(sc.coef, 10);
  assert.equal(sc.autoCoef, null);
});

test('手入力：symScaleFor は自動の推定より手入力を優先し、同じ物を返し続ける', () => {
  const d = { dims: [], fixtures: [], furn: [], symScale: { factor: 2, source: 'dims', n: 5, spread: 0 }, scaleUser: 4 };
  const ss = symScaleFor(d);
  assert.equal(ss.source, 'user');
  assert.equal(ss.factor, 0.25);   /* 係数 4 → factor は逆数の 1/4 */
  assert.equal(symScaleFor(d), ss);
});

test('手入力：userCoef は正の有限数だけを通す', () => {
  assert.equal(userCoef({ scaleUser: 50 }), 50);
  assert.equal(userCoef({ scaleUser: 0 }), null);
  assert.equal(userCoef({ scaleUser: -2 }), null);
  assert.equal(userCoef({ scaleUser: NaN }), null);
  assert.equal(userCoef({ scaleUser: '50' }), null);
  assert.equal(userCoef({}), null);
  assert.equal(userCoef(null), null);
});

/* ===== 部屋の広さ・周りへの適用（scaleGeomBy） ===== */

test('適用：面積は係数の2乗、周りは係数、穴の面積も2乗。座標（runs）は変えない', () => {
  const runs = [[0, 1, 2]];
  const g = { area: 10, perim: 14, holes: { area: 2, cs: 0.15, runs } };
  const out = scaleGeomBy(g, 50);
  assert.equal(out.area, 25000);
  assert.equal(out.perim, 700);
  assert.equal(out.holes.area, 5000);
  assert.equal(out.holes.runs, runs);
  assert.equal(out.holes.cs, 0.15);
});

test('適用：係数 1・不正な係数・形が無い時は、渡された物をそのまま返す', () => {
  const g = { area: 10, perim: 14 };
  assert.equal(scaleGeomBy(g, 1), g);
  assert.equal(scaleGeomBy(g, null), g);
  assert.equal(scaleGeomBy(g, 0), g);
  assert.equal(scaleGeomBy(null, 50), null);
});

/* ===== プレビューの飛び先（scaleTargetFor） ===== */

const planOf = poly => ({ faces: [{ i: 0, area: 200, poly }] });

test('飛び先：寸法の定義点が図面の範囲内なら、その寸法の場所（mm→m・余白1m）', () => {
  const d = { plan: planOf([[0, 0], [20, 0], [20, 10], [0, 10]]), dims: [{ p1: { x: 2000, y: 2000 }, p2: { x: 5000, y: 2000 } }], fixtures: [] };
  assert.deepEqual(scaleTargetFor(d), [1, 1, 6, 3]);
});

test('飛び先：寸法の座標が図面と合わない時は、器具の場所にする', () => {
  const d = { plan: planOf([[0, 0], [20, 0], [20, 10], [0, 10]]), dims: [{ p1: { x: 999000, y: 999000 }, p2: { x: 1000000, y: 999000 } }], fixtures: [{ t: 'toilet', b: [1, 1, 1.4, 1.75] }] };
  assert.deepEqual(scaleTargetFor(d), [0.4, 0.4, 2, 2.35]);
});

test('飛び先：寸法も器具も無ければ一番大きい区画、区画も無ければ null', () => {
  const d = { plan: { faces: [{ i: 0, area: 5, poly: [[0, 0], [2, 0], [2, 2], [0, 2]] }, { i: 1, area: 30, poly: [[5, 5], [9, 5], [9, 9], [5, 9]] }] }, dims: [], fixtures: [] };
  assert.deepEqual(scaleTargetFor(d), [5, 5, 9, 9]);
  assert.equal(scaleTargetFor({ plan: { faces: [] }, dims: [], fixtures: [] }), null);
  assert.equal(scaleTargetFor(null), null);
});
