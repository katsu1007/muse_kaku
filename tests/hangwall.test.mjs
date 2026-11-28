/* 垂れ壁のテスト。実行：node --test tests/
 * 期待値は手計算した数字。数量の決め方：垂れ壁＝長さ×下がり寸法（2026-11-28 村中さんの決定） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHangNote, hangChains, chainStretch, analyzeHangWalls } from '../js/hangwall.js';
import { roomOpenRuns } from '../js/legacy.js';
import { roomGeom } from '../js/calc.js';

test('注記の読み取り：H=・H・天井-・括弧の書き方', () => {
  assert.equal(parseHangNote('上部：垂れ壁 H=600').drop, 0.6);
  assert.equal(parseHangNote('垂壁H300').drop, 0.3);
  assert.equal(parseHangNote('下がり壁 天井-500').drop, 0.5);
  assert.equal(parseHangNote('防煙垂れ壁(-500)').drop, 0.5);
  assert.equal(parseHangNote('垂れ壁　Ｈ＝６００').drop, 0.6);   // 全角スペース・全角英数
  assert.equal(parseHangNote('垂れ壁').drop, 0);                 // 寸法なし＝要確認行き
  assert.equal(parseHangNote('壁：クロス'), null);               // キーワード無し
  assert.equal(parseHangNote('天井：岩綿吸音板'), null);
});

/* 大きな部屋（10×6）の南の壁に、扉の無い開口（4〜5.5m）が1つある場面 */
const face = { i: 0, poly: [[0, 0], [10, 0], [10, 6], [0, 6]] };
const gapRun = { ty: 'g', len: 1.5, a: [4, 0], b: [5.5, 0], n: [0, -1] };

test('開口の鎖：面ごとに分かれた同じ開口をつなぎ、ドアは含めない', () => {
  const open = { 0: [{ ty: 'g', len: 0.7, a: [4, 0], b: [4.7, 0], n: [0, -1] }, { ty: 'g', len: 0.8, a: [4.7, 0], b: [5.5, 0], n: [0, -1] }],
                 1: [{ ty: 'd', len: 0.9, a: [4, 0], b: [4.9, 0], n: [0, -1] }] };
  const chains = hangChains(open);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].runs.length, 2);
  assert.ok(Math.abs(chains[0].len - 1.5) < 1e-9);
});

test('壁の線の上の度合い：壁の開口は続きがあり、家具の輪郭の欠けは無い', () => {
  const wall = hangChains({ 0: [gapRun] })[0];
  assert.ok(chainStretch(wall, [face]) >= 0.4);
  /* 家具のような小さい閉じた輪郭（1.2×1.2）の上の欠け */
  const bench = { i: 7, poly: [[20, 20], [21.2, 20], [21.2, 21.2], [20, 21.2]] };
  const dent = hangChains({ 7: [{ ty: 'g', len: 1.0, a: [20.1, 21.2], b: [21.1, 21.2], n: [0, 1] }] })[0];
  assert.ok(chainStretch(dent, [bench]) < 0.4);
});

test('結び付け：近くの開口に決まる（面積＝長さ×下がり）', () => {
  const hz = analyzeHangWalls({ texts: [{ t: '上部：垂れ壁 H=600', x: 4.75, y: 0.8 }], open: { 0: [gapRun] }, faces: [face] });
  assert.equal(hz.unresolved.length, 0);
  assert.equal(hz.linked.length, 1);
  assert.equal(hz.linked[0].len, 1.5);
  assert.equal(hz.linked[0].area, 0.9);   // 1.5m × 0.6m
});

test('結び付け：候補が2つ並ぶ時は決め打ちしない', () => {
  const open = { 0: [gapRun, { ty: 'g', len: 1.5, a: [7, 0], b: [8.5, 0], n: [0, -1] }] };
  const hz = analyzeHangWalls({ texts: [{ t: '垂れ壁 H=600', x: 6.25, y: 0.8 }], open, faces: [face] });
  assert.equal(hz.linked.length, 0);
  assert.equal(hz.unresolved.length, 1);
});

test('結び付け：家具の輪郭の欠けには結び付けない', () => {
  const bench = { i: 7, poly: [[20, 20], [21.2, 20], [21.2, 21.2], [20, 21.2]] };
  const open = { 7: [{ ty: 'g', len: 1.0, a: [20.1, 21.2], b: [21.1, 21.2], n: [0, 1] }] };
  const hz = analyzeHangWalls({ texts: [{ t: '垂壁H300', x: 20.6, y: 21.9 }], open, faces: [bench] });
  assert.equal(hz.linked.length, 0);
  assert.equal(hz.unresolved.length, 1);
});

test('結び付け：寸法が読めない注記は要確認', () => {
  const hz = analyzeHangWalls({ texts: [{ t: '垂れ壁', x: 4.75, y: 0.8 }], open: { 0: [gapRun] }, faces: [face] });
  assert.equal(hz.linked.length, 0);
  assert.equal(hz.unresolved.length, 1);
});

test('部屋の開口：垂れ壁の区間に重なる開口へ hang が付く', () => {
  const plan = { faces: [face], hangWalls: [{ a: [4, 0], b: [5.5, 0], drop: 0.6 }] };
  const runs = roomOpenRuns([0], plan, { 0: [gapRun] });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].hang, 0.6);
  /* 区間から外れた開口には付かない */
  const runs2 = roomOpenRuns([0], plan, { 0: [{ ty: 'g', len: 1.0, a: [7, 0], b: [8, 0], n: [0, -1] }] });
  assert.equal(runs2[0].hang, undefined);
  /* ドアには付かない */
  const runs3 = roomOpenRuns([0], plan, { 0: [{ ty: 'd', len: 1.5, a: [4, 0], b: [5.5, 0], n: [0, -1] }] });
  assert.equal(runs3[0].hang, undefined);
});

test('数量：垂れ壁のある開口は「長さ×下がり」を壁として残す', () => {
  const base = { shape: 'free', area: 20, perim: 18, h: 2.6, qty: 1 };
  const withHang = roomGeom({ ...base, openRuns: [{ ty: 'g', len: 1.5, hang: 0.6 }] });
  assert.equal(withHang.wall, 43.8);   // 18×2.6 − 1.5×(2.6−0.6) = 46.8 − 3.0
  const noHang = roomGeom({ ...base, openRuns: [{ ty: 'g', len: 1.5 }] });
  assert.equal(noHang.wall, 42.9);     // 46.8 − 1.5×2.6 = 46.8 − 3.9
  /* ドアは今までどおり（hang が付いていても無視） */
  const door = roomGeom({ ...base, openRuns: [{ ty: 'd', len: 1.0, hang: 0.6 }] });
  assert.equal(door.wall, 44.8);       // 46.8 − 1.0×2.0
});
