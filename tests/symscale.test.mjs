/* シンボルの大きさの自動補正（js/symscale.js）のテスト。実行：node --test tests/
 * factor は「図面の座標が実寸の何倍か」。辞書の寸法判定では 実寸 = 測った寸法 ÷ factor。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { factorFromDims, factorFromSymbols, estimateSymScale, symScaleFor, TOILET_LONG_REF } from '../js/symscale.js';
import { classifySymbol, classifyBox, classifyCluster } from '../js/symdict.js';

/* ===== (a) 寸法からの導出 =====
 * dimCheck.median は「寸法の値（実寸）÷ 定義点の距離（座標）」。
 * 座標の倍率（factor）はその逆数になる。 */

test('寸法：座標が実寸の半分で描かれた図面（中央値2）→ factor 0.5', () => {
  const r = factorFromDims({ n: 12, median: 2, outliers: [] });
  assert.equal(r.source, 'dims');
  assert.equal(r.factor, 0.5);
  assert.equal(r.n, 12);
});

test('寸法：座標が実寸の2倍で描かれた図面（中央値0.5）→ factor 2', () => {
  const r = factorFromDims({ n: 8, median: 0.5, outliers: [] });
  assert.equal(r.factor, 2);
});

test('寸法：用紙mmの図面（中央値50）→ factor 0.02', () => {
  const r = factorFromDims({ n: 30, median: 50, outliers: [{}] });
  assert.equal(r.factor, 0.02);
});

test('寸法：比率が 1 の図面は factor 1（補正なし、ただし寸法で確認済み）', () => {
  const r = factorFromDims({ n: 25, median: 1, outliers: [] });
  assert.equal(r.factor, 1);
  assert.equal(r.source, 'dims');
});

test('寸法：件数が少ない（2件）・外れが多い時は弱い証拠として null', () => {
  assert.equal(factorFromDims({ n: 2, median: 2, outliers: [] }), null);
  assert.equal(factorFromDims({ n: 10, median: 2, outliers: [{}, {}, {}, {}] }), null); /* 一致6割 < 8割 */
  assert.equal(factorFromDims(null), null);
  assert.equal(factorFromDims({ n: 0, median: null, outliers: [] }), null);
});

/* ===== (b) 便器の大きさからの導出 =====
 * 標本は便器の描画の長さ（mm）。基準寸法 760、実在帯は 690〜800。 */

const toiletLongsAt = (factor, count = 8) => {
  /* 実在帯の中のばらつき（690〜800 を等間隔に）を持った標本を factor 倍した列 */
  const base = [695, 715, 735, 750, 765, 780, 792, 800, 705, 745];
  return base.slice(0, count).map(v => v * factor);
};

test('便器：×0.6 で描かれた図面 → factor はほぼ 0.6', () => {
  const r = factorFromSymbols(toiletLongsAt(0.6));
  assert.equal(r.source, 'symbols');
  assert.ok(Math.abs(r.factor - 0.6) <= 0.03, `factor=${r.factor}`);
});

test('便器：×1.4 で描かれた図面 → factor はほぼ 1.4', () => {
  const r = factorFromSymbols(toiletLongsAt(1.4));
  assert.equal(r.source, 'symbols');
  assert.ok(Math.abs(r.factor - 1.4) <= 0.04, `factor=${r.factor}`);
});

test('便器：実在帯の中に収まる図面は factor 1（標本が証拠になる）', () => {
  const r = factorFromSymbols(toiletLongsAt(1));
  assert.equal(r.factor, 1);
  assert.equal(r.source, 'symbols');
  assert.equal(r.n, 8);
});

test('便器：基準寸法ちょうどの標本は factor 1', () => {
  const r = factorFromSymbols([TOILET_LONG_REF, TOILET_LONG_REF, TOILET_LONG_REF, TOILET_LONG_REF, TOILET_LONG_REF]);
  assert.equal(r.factor, 1);
});

/* ===== (c) 弱い証拠では 1 のまま ===== */

test('便器：標本が 5 件未満なら null（弱い証拠）', () => {
  assert.equal(factorFromSymbols(toiletLongsAt(0.6, 4)), null);
  assert.equal(factorFromSymbols([]), null);
});

test('便器：大きさがばらつく標本は null（混ざった拾い方を疑う）', () => {
  /* 中央値は帯の外でも、ばらつき（MAD÷中央値）が 5% を超える列は使わない */
  assert.equal(factorFromSymbols([400, 500, 700, 900, 1100, 650, 480, 1020]), null);
});

test('推定：証拠が無ければ factor 1・source null・理由つき', () => {
  const r = estimateSymScale({});
  assert.equal(r.factor, 1);
  assert.equal(r.source, null);
  assert.ok(r.why);
});

test('推定：寸法が使える時は寸法が優先（便器の標本がずれていても）', () => {
  const fixtures = Array.from({ length: 8 }, () => ({ t: 'toilet', b: [0, 0, 0.45, 0.456] })); /* 長さ456＝×0.6級 */
  const r = estimateSymScale({ dimCheck: { n: 12, median: 1, outliers: [] }, fixtures, clusters: [] });
  assert.equal(r.source, 'dims');
  assert.equal(r.factor, 1);
});

test('推定：器具の便器から標本を集める（JWW 経路）', () => {
  const fixtures = Array.from({ length: 8 }, () => ({ t: 'toilet', b: [0, 0, 0.45, 0.456] }));
  const r = estimateSymScale({ dimCheck: null, fixtures, clusters: [] });
  assert.equal(r.source, 'symbols');
  assert.ok(Math.abs(r.factor - 0.6) <= 0.01, `factor=${r.factor}`);
});

test('symScaleFor：覚え書きが無ければ作り直して図面に覚える', () => {
  const d = { dims: [], fixtures: [], furn: [] };
  const ss = symScaleFor(d);
  assert.equal(ss.factor, 1);
  assert.equal(d.symScale, ss);
  assert.equal(symScaleFor(d), ss); /* 2回目は同じ物を返す */
});

/* ===== (d) 辞書の寸法判定が factor の向きに応える ===== */

test('補正の向き：classifySymbol(f, s) は寸法を s で割った判定と一致する', () => {
  const feats = [
    { short: 450, long: 830, arcShare: 0.7, closed: true, innerClosed: true, dividers: null },
    { short: 450, long: 500, arcShare: 0.67, closed: true, innerClosed: false, dividers: null },
    { short: 565, long: 900, arcShare: 0.0, closed: true, innerClosed: false, dividers: 3 },
  ];
  for (const f of feats) for (const s of [0.6, 0.83, 1.4]) {
    const a = classifySymbol(f, s);
    const b = classifySymbol({ ...f, short: f.short / s, long: f.long / s }, 1);
    assert.equal(a.result, b.result);
    assert.equal(a.category, b.category);
    assert.equal(a.sizeVeto, b.sizeVeto);
    assert.ok(Math.abs(a.score - b.score) < 1e-9);
  }
});

test('補正の向き：寸法帯の外で要確認だった小便器が、補正で確定する', () => {
  /* CC0小便器の実測特徴（450×500）は寸法帯の外で「要確認＋urinal-size」。
   * 図面が ×(500/460) で描かれていたと分かれば、実寸 414×460 として帯の中に入り確定する */
  const f = { short: 450, long: 500, arcShare: 0.67, closed: true, innerClosed: false, dividers: null };
  const r1 = classifySymbol(f, 1);
  assert.equal(r1.result, '要確認');
  assert.equal(r1.sizeVeto, 'urinal-size');
  const r2 = classifySymbol(f, 500 / 460);
  assert.equal(r2.result, '小便器');
  assert.equal(r2.sizeVeto, undefined);
});

test('補正の向き：×0.6 で描かれた便器クラスタが、補正で元の判定に戻る', () => {
  const orig = { short: 356, long: 654, arcShare: 0.64, closed: true, dividers: 0 };
  const scaled = { ...orig, short: orig.short * 0.6, long: orig.long * 0.6 };
  const base = classifyCluster(orig, []);
  assert.equal(base.verdict, 'hit');
  assert.equal(classifyCluster(scaled, []).verdict, 'unknown'); /* 補正なしでは拾えない */
  const fixed = classifyCluster(scaled, [], null, 0.6);
  assert.equal(fixed.verdict, base.verdict);
  assert.equal(fixed.category, base.category);
  assert.equal(fixed.score, base.score);
  /* 戻り値の寸法は測ったまま（表示用） */
  assert.equal(fixed.short, scaled.short);
  assert.equal(fixed.long, scaled.long);
});

test('補正なし（scale 1・省略・不正な値）は従来と完全に同じ', () => {
  const b = [0, 0, 0.471, 0.27];
  assert.deepEqual(classifyBox(b, []), classifyBox(b, [], 1));
  assert.deepEqual(classifyBox(b, []), classifyBox(b, [], 0));
  assert.deepEqual(classifyBox(b, []), classifyBox(b, [], NaN));
});
