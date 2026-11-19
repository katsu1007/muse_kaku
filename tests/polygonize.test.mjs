/* 自前輪郭化（polygonize）と補足区画（supplementFaces）：幾何の基本と補足の規則 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { polygonizeFaces, supplementFaces, overlapArea } from '../js/polygonize.js';

/* 四角の輪郭線（x,y 左下・w,h 大きさ） */
const sq = (x, y, w, h) => [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]];
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

test('閉じた四角は1つの面になる', () => {
  const r = polygonizeFaces(sq(0, 0, 3, 2));
  assert.equal(r.length, 1);
  assert.ok(Math.abs(r[0].area - 6) < 1e-9);
});

test('隙間のある四角は面にならない（隙間は勝手に埋めない）', () => {
  const g = [[0, 0, 1.2, 0], [1.5, 0, 3, 0], [3, 0, 3, 2], [3, 2, 0, 2], [0, 2, 0, 0]];
  assert.equal(polygonizeFaces(g).length, 0);
});

test('T字の交点で線が割れる（仕切りで2つの面）', () => {
  const r = polygonizeFaces([...sq(0, 0, 4, 2), [2, 0, 2, 2]]);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map(f => Math.round(f.area)).sort(), [4, 4]);
});

test('途中で止まる線（ぶら下がり）は面を割らない', () => {
  const r = polygonizeFaces([...sq(0, 0, 4, 2), [2, 0, 2, 1]]);
  assert.equal(r.length, 1);
  assert.ok(Math.abs(r[0].area - 8) < 1e-9);
});

test('円弧を細かく割った円は1つの面になり、面積が円に近い', () => {
  const cs = [];
  for (let k = 0; k < 32; k++) {
    const a1 = k / 32 * 2 * Math.PI, a2 = (k + 1) / 32 * 2 * Math.PI;
    cs.push([Math.cos(a1), Math.sin(a1), Math.cos(a2), Math.sin(a2)]);
  }
  const r = polygonizeFaces(cs);
  assert.equal(r.length, 1);
  assert.ok(Math.abs(r[0].area - Math.PI) < 0.03, `面積 ${r[0].area}`);
});

test('入れ子の輪は、内側の面と穴を引いた外側の面になる', () => {
  const r = polygonizeFaces([...sq(0, 0, 6, 6), ...sq(2, 2, 2, 2)]);
  assert.equal(r.length, 2);
  const areas = r.map(f => Math.round(f.area)).sort((a, b) => a - b);
  assert.deepEqual(areas, [4, 32]); /* 内側 4、外側は 36−4 */
  const outer = r.find(f => f.area > 30);
  assert.equal(outer.holes.length, 1);
});

test('重なり面積：一致・半分・内包・接触（面積0）・離れ', () => {
  assert.ok(Math.abs(overlapArea(rect(0, 0, 3, 2), rect(0, 0, 3, 2)) - 6) < 1e-9);
  assert.ok(Math.abs(overlapArea(rect(0, 0, 2, 2), rect(1, 0, 3, 2)) - 2) < 1e-9);
  assert.ok(Math.abs(overlapArea(rect(0, 0, 4, 4), rect(1, 1, 2, 2)) - 1) < 1e-9);
  assert.ok(Math.abs(overlapArea(rect(1, 1, 2, 2), rect(0, 0, 4, 4)) - 1) < 1e-9);
  assert.ok(Math.abs(overlapArea(rect(0, 0, 2, 2), rect(2, 0, 4, 2))) < 1e-9); /* 辺で接するだけ */
  assert.ok(Math.abs(overlapArea(rect(0, 0, 1, 1), rect(3, 3, 4, 4))) < 1e-9);
});

test('補足区画：エンジン区画と同じ輪は落とし、重ならない輪だけ残す', () => {
  const eng = [{ i: 0, area: 6, poly: rect(0, 0, 3, 2) }];
  const sup = supplementFaces({ segs: [...sq(0, 0, 3, 2), ...sq(5, 0, 3, 2)], faces: eng, fixtures: [{ t: 'x', b: [6, 0.5, 7, 1.5] }] });
  assert.equal(sup.length, 1);
  assert.equal(sup[0].src, 'poly');
  assert.equal(sup[0].cx, 6.5);
  assert.equal(typeof sup[0].i, 'string'); /* エンジンの番号と衝突しない */
  assert.equal(eng[0].poly.length, 4); /* エンジン区画は触らない */
});

test('補足区画：エンジン区画と少しだけ重なる輪（1割以下）は残る', () => {
  const eng = [{ i: 0, area: 6, poly: rect(0, 0, 3, 2) }];
  /* もう1つの四角（x=2.85〜5.85）は交点で割れて、エンジン区画の外の部分
   * （x=3〜5.85、重なり0）が補足として残る。重なった細い部分は細長さで落ちる */
  const sup = supplementFaces({ segs: [...sq(0, 0, 3, 2), ...sq(2.85, 0, 3, 2)], faces: eng, fixtures: [{ t: 'x', b: [4.1, 0.7, 4.7, 1.3] }] });
  assert.equal(sup.length, 1);
  assert.equal(sup[0].cx, 4.425);
  assert.ok(Math.abs(sup[0].area - 5.7) < 0.01);
});

test('補足区画：エンジン区画を穴に持つ輪（額縁型）は、穴の分を重なりに数えない', () => {
  /* 大きな輪の中にエンジン区画がすっぽり入っている場合、外形だけで重なりを測ると
   * 区画の面積分が重なりになって輪が落ちてしまう。実形（穴引き）で測ること */
  const eng = [{ i: 0, area: 16, poly: rect(0, 0, 4, 4) }];
  const sup = supplementFaces({
    segs: [...sq(-1, -1, 6, 6), ...sq(0, 0, 4, 4)], faces: eng,
    fixtures: [{ t: 'toilet', b: [-0.8, 1.7, -0.2, 2.3] }], /* 額縁の部分にある器具 */
  });
  assert.equal(sup.length, 1);
  assert.ok(Math.abs(sup[0].area - 20) < 0.5, `額縁の面積 ${sup[0].area}`); /* 36−16 */
});

test('補足区画：壁の帯のような細長い輪は捨てる', () => {
  const band = [[0, 3, 4, 3], [4, 3, 4, 3.15], [4, 3.15, 0, 3.15], [0, 3.15, 0, 3]];
  const sup = supplementFaces({ segs: [...sq(0, 0, 4, 2), ...band], faces: [], fixtures: [{ t: 'x', b: [1, 0.5, 2, 1.5] }] });
  assert.equal(sup.length, 1);
  assert.ok(Math.abs(sup[0].area - 8) < 0.01);
});

test('補足区画：小さすぎる輪（0.25㎡未満）は捨てる', () => {
  const sup = supplementFaces({ segs: [...sq(0, 0, 4, 3), ...sq(1, 1, 0.4, 0.4)], faces: [], fixtures: [{ t: 'x', b: [2.5, 2, 3.5, 2.8] }] });
  assert.equal(sup.length, 1);
});

test('補足区画：表・ラベル帯の範囲の中の輪は出さない', () => {
  const sup = supplementFaces({
    segs: [...sq(0, 0, 3, 2), ...sq(5, 0, 3, 2)], faces: [], fixtures: [{ t: 'x', b: [1, 0.5, 2, 1.5] }, { t: 'y', b: [6, 0.5, 7, 1.5] }],
    tableBoxes: [[4.5, -0.5, 8.5, 2.5]],
  });
  assert.equal(sup.length, 1);
  assert.equal(sup[0].cx, 1.5);
});

test('補足区画：器具の内側の線は輪にしない（器具の形を部屋と誤らない）', () => {
  const sup = supplementFaces({
    segs: [...sq(0, 0, 4, 3), ...sq(1, 1, 0.6, 0.8)], faces: [],
    fixtures: [{ t: 'toilet', b: [0.9, 0.9, 1.7, 1.9] }],
  });
  assert.equal(sup.length, 1);
  assert.ok(Math.abs(sup[0].area - 12) < 0.01);
});

test('補足区画：根拠が中になく「近いだけ」の輪は出さない（階段・シャフトの囲み対策）', () => {
  /* 四角の外、縁から 0.3m の所に器具があるだけでは補足にしない */
  const sup = supplementFaces({ segs: sq(0, 0, 1.1, 2.3), faces: [], fixtures: [{ t: 'counter', b: [0.2, 2.6, 0.9, 3.1] }] });
  assert.equal(sup.length, 0);
  /* 同じ四角でも、中に器具があれば補足になる */
  const sup2 = supplementFaces({ segs: sq(0, 0, 1.1, 2.3), faces: [], fixtures: [{ t: 'counter', b: [0.2, 0.8, 0.9, 1.3] }] });
  assert.equal(sup2.length, 1);
});

test('補足区画：入力（線・区画・器具）を書き換えない', () => {
  const segs = sq(0, 0, 3, 2), faces = [{ i: 0, area: 6, poly: rect(0, 0, 3, 2) }], fixtures = [{ t: 'x', b: [0, 0, 1, 1] }];
  const before = JSON.stringify([segs, faces, fixtures]);
  supplementFaces({ segs, faces, fixtures });
  assert.equal(JSON.stringify([segs, faces, fixtures]), before);
});
