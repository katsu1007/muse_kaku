/* 家具クラスタ→器具への昇格（js/fixpromote.js）：便所・湯沸室の中で、辞書の形判定が
 * 単独で確定した便器・小便器だけを器具に上げる。洗面器の誤読（三井屋・大天の実測例）
 * を上げないことが要点 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promoteFixtures } from '../js/fixpromote.js';

/* 便所（0〜3m の正方形の面）と事務室（6〜9m）の2面だけの図面 */
const faces = [
  { i: 0, poly: [[0, 0], [3, 0], [3, 3], [0, 3]] },
  { i: 1, poly: [[6, 0], [9, 0], [9, 3], [6, 3]] },
];
const zones = [
  { name: '便所', faces: [0] },
  { name: '事務室', faces: [1] },
];
/* 小便器のクラスタ（420×460mm、中心は便所の中） */
const urinal = (cx = 1.5, cy = 1.5, extra = {}) => ({ b: [cx - 0.21, cy - 0.23, cx + 0.21, cy + 0.23], arcShare: 0.33, ...extra });
const hit = (category = '小便器', extra = {}) => ({ verdict: 'hit', category, score: 0.985, secondScore: 0.932, ...extra });
const run = (clusters, verdicts, over = {}) => promoteFixtures({ clusters, verdicts, zones, faces, fixtures: [], ...over });

test('便所の中の小便器（形が単独で確定）は器具に上がる', () => {
  const out = run([urinal()], [hit()]);
  assert.equal(out.length, 1);
  assert.equal(out[0].t, 'urinal');
  assert.equal(out[0].j, 0);
});

test('女子便所の中の洋式大便器は toilet に上がる', () => {
  const toilet = { b: [1.32, 1.17, 1.68, 1.83], arcShare: 0.64 };
  const out = run([toilet], [hit('洋式大便器', { score: 0.919 })], { zones: [{ name: '女子便所', faces: [0] }, { name: '事務室', faces: [1] }] });
  assert.equal(out.length, 1);
  assert.equal(out[0].t, 'toilet');
});

test('湯沸室も対象（名前の一致）', () => {
  const out = run([urinal()], [hit()], { zones: [{ name: '湯沸室', faces: [0] }, { name: '事務室', faces: [1] }] });
  assert.equal(out.length, 1);
});

test('素の判定が「類似」止まり（三井屋の洗面器の実測形：差0.003＋寸法の安全弁）は上げない', () => {
  const basin = { b: [1.3, 1.25, 1.7, 1.75], arcShare: 0.38 };
  const v = { verdict: 'near', category: '小便器', score: 0.977, secondScore: 0.974, sizeVeto: 'urinal-size' };
  assert.equal(run([basin], [v]).length, 0);
});

test('寸法の安全弁が付いた確定は上げない', () => {
  assert.equal(run([urinal()], [hit('小便器', { sizeVeto: 'urinal-size' })]).length, 0);
});

test('自分の辞書の判定は上げない', () => {
  assert.equal(run([urinal()], [hit('小便器', { mine: true, score: 1 })]).length, 0);
});

test('洗面器など対象外のカテゴリは上げない', () => {
  assert.equal(run([urinal()], [hit('洗面器')]).length, 0);
  assert.equal(run([urinal()], [hit('机・デスク')]).length, 0);
});

test('円だけの輪郭（ボウルだけの抽出、arcShare=1）は上げない', () => {
  assert.equal(run([urinal(1.5, 1.5, { arcShare: 1 })], [hit()]).length, 0);
  assert.equal(run([urinal(1.5, 1.5, { arcShare: null })], [hit()]).length, 0);
});

test('事務室の中の小便器型は上げない（部屋の裏付けが無い）', () => {
  assert.equal(run([urinal(7.5, 1.5)], [hit()]).length, 0);
});

test('壁掛けで面の外（0.2m）でも、便所の面が一番近ければ上がる', () => {
  const out = run([urinal(-0.2, 1.5)], [hit()]);
  assert.equal(out.length, 1);
});

test('他の名前付きゾーンの方が近い時は上げない', () => {
  /* 便所の面まで0.2m、事務室の面まで0.1mの位置（2面の間の帯） */
  const near = [
    { i: 0, poly: [[0, 0], [3, 0], [3, 3], [0, 3]] },
    { i: 1, poly: [[3.3, 0], [6.3, 0], [6.3, 3], [3.3, 3]] },
  ];
  const out = promoteFixtures({ clusters: [urinal(3.2, 1.5)], verdicts: [hit()], zones, faces: near, fixtures: [] });
  assert.equal(out.length, 0);
});

test('便所・湯沸室の名前のゾーンが無い図面では何も上がらない', () => {
  const out = run([urinal()], [hit()], { zones: [{ name: '女子トイレ', faces: [0] }, { name: '事務室', faces: [1] }] });
  assert.equal(out.length, 0);
});

test('既にある器具の箱の中のクラスタは上げない（二重に数えない）', () => {
  const out = run([urinal()], [hit()], { fixtures: [{ b: [1, 1, 2, 2], t: 'counter' }] });
  assert.equal(out.length, 0);
});

test('複数の候補がそれぞれ上がり、番号（j）が保たれる', () => {
  const desk = { b: [6.8, 1.2, 7.6, 1.8], arcShare: 0.05 };
  const out = run([desk, urinal(), urinal(2.2, 1.5)], [hit('机・デスク'), hit(), hit()]);
  assert.deepEqual(out.map(o => o.j), [1, 2]);
});
