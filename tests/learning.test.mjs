/* 辞書の学習（自分の辞書の形の署名）のテスト。実行：node --test tests/
 * 期待値は実図面の実測（~/workspace/kaku/work/learning/ のシミュレーション）から決めた：
 * 三井屋の洗面器クラスタ（407×500・弧0.38・仕切り52本）・日本モウルドの椅子
 * （416×417・弧0.82・仕切り0本）は、同じ型の繰り返しで特徴が完全一致した。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBox, classifyCluster, classifyFixtureDisplay, matchUserSym, slimSymFeat } from '../js/symdict.js';

test('slimSymFeat：測れた特徴だけを取り出し、弧は3桁に丸める', () => {
  assert.deepEqual(
    slimSymFeat({ short: 407, long: 500, arcShare: 0.3804, closed: true, innerClosed: null, dividers: 52, tankBand: false, n: 350 }),
    { arcShare: 0.38, closed: true, dividers: 52, n: 350 });
  assert.deepEqual(slimSymFeat({ arcShare: null, closed: null, dividers: null }), null);
  assert.deepEqual(slimSymFeat(null), null);
  assert.deepEqual(slimSymFeat({}), null);
});

test('署名の無い従来の登録は、特徴が無くても寸法だけで当たる（互換性）', () => {
  const legacy = { id: 'u1', name: '作業台', short: 900, long: 2000 };
  assert.equal(matchUserSym(legacy, 900, 2000, null), true);
  assert.equal(matchUserSym(legacy, 900, 2000, { arcShare: 0.9, closed: false }), true);
  const r = classifyBox([0, 0, 2.0, 0.9], [legacy]);
  assert.equal(r.mine, true); assert.equal(r.category, '作業台');
});

const basinEntry = { id: 'u2', name: '洗面器', short: 407, long: 500, feat: { arcShare: 0.38, closed: true, dividers: 52, n: 350 } };

test('署名付きの登録は、寸法＋形がほぼ同じ物に当たる', () => {
  const f = { short: 407, long: 500, arcShare: 0.38, closed: true, dividers: 52, n: 350 };
  const r = classifyCluster(f, [basinEntry]);
  assert.equal(r.verdict, 'hit'); assert.equal(r.category, '洗面器'); assert.equal(r.mine, true);
  /* 抽出のばらつき（弧±0.15・仕切り±2・線の本数2倍まで）までは許す */
  const r2 = classifyCluster({ short: 410, long: 498, arcShare: 0.45, closed: true, dividers: 50, n: 300 }, [basinEntry]);
  assert.equal(r2.mine, true);
});

test('線の本数が桁で違う物には当たらない（素の輪郭の収納カウンター対策）', () => {
  /* 実測の裏返り：洗面カウンター（600×2393・線67本）を教えると、寸法・弧・仕切りが
   * ほぼ同じ収納カウンター（600×2399・線8本）にも当たった。本数で分ける */
  const counterEntry = { id: 'u4', name: '洗面器', short: 600, long: 2393, feat: { arcShare: 0.02, closed: true, dividers: 0, n: 67 } };
  const bare = classifyCluster({ short: 600, long: 2399, arcShare: 0, closed: true, dividers: 0, n: 8 }, [counterEntry]);
  assert.equal(bare.mine, undefined);
  const same = classifyCluster({ short: 600, long: 2393, arcShare: 0.02, closed: true, dividers: 0, n: 67 }, [counterEntry]);
  assert.equal(same.mine, true);
});

test('署名付きの登録は、寸法が同じでも形の違う物には当たらない', () => {
  /* 同じ 407×500 でも弧の割合が違えば別の物（三井屋の小便器寄りの形） */
  const r = classifyCluster({ short: 407, long: 500, arcShare: 0.9, closed: true, dividers: 52, n: 350 }, [basinEntry]);
  assert.equal(r.mine, undefined);
  /* 仕切り線の数が大きく違っても当たらない */
  const r2 = classifyCluster({ short: 407, long: 500, arcShare: 0.38, closed: true, dividers: 0, n: 350 }, [basinEntry]);
  assert.equal(r2.mine, undefined);
  /* 輪郭の閉じが違っても当たらない */
  const r3 = classifyCluster({ short: 407, long: 500, arcShare: 0.38, closed: false, dividers: 52, n: 350 }, [basinEntry]);
  assert.equal(r3.mine, undefined);
});

test('署名付きの登録は、判定側で形が測れていない時には当たらない', () => {
  /* classifyBox に特徴を渡さない経路（寸法だけの判定）では発火しない */
  const r = classifyBox([0, 0, 0.5, 0.407], [basinEntry]);
  assert.equal(r.mine, undefined);
});

const urinalEntry = { id: 'u3', name: '小便器', short: 380, long: 620, feat: { arcShare: 0.24, closed: true, innerClosed: true, dividers: 0 } };
const urinalFeat = { short: 380, long: 620, arcShare: 0.24, closed: true, innerClosed: true, dividers: 0 };

test('器具：署名付きの登録は形が合えば検出になり、表示でも落とさない（mine）', () => {
  const r = classifyFixtureDisplay([0, 0, 0.62, 0.38], [urinalEntry], 1, urinalFeat);
  assert.equal(r.verdict, 'hit'); assert.equal(r.category, '小便器'); assert.equal(r.mine, true);
});

test('器具：内側の閉曲線の有無が違えば、寸法が同じでも当たらない', () => {
  const r = classifyFixtureDisplay([0, 0, 0.62, 0.38], [urinalEntry], 1, { ...urinalFeat, innerClosed: false });
  assert.equal(r.mine, undefined);
});

test('器具：署名に内側の閉曲線を含む登録は、クラスタ（測れない側）には当たらない', () => {
  const r = classifyCluster({ short: 380, long: 620, arcShare: 0.24, closed: true, dividers: 0 }, [urinalEntry]);
  assert.equal(r.mine, undefined);
});

test('登録が無ければ従来と完全に同じ（署名の仕組みは素通り）', () => {
  const f = { short: 407, long: 500, arcShare: 0.38, closed: true, dividers: 52 };
  assert.deepEqual(classifyCluster(f, []), classifyCluster(f, []));
  assert.equal(classifyCluster(f, [{ id: 'x', name: '', short: 0, long: 0 }]).mine, undefined);
});
