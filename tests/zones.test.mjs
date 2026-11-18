/* ゾーン分け：囲まれた部屋／ドアで閉じる／開けた場所の陣取り／線で分ける */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeZones, splitFacesByLine } from '../js/zones.js';

/* 四角い部屋の壁（線）と区画を作る。x,y は左下、w,h は大きさ（m） */
const room = (x, y, w, h, gap = null) => {
  const segs = [];
  const edge = (x0, y0, x1, y1, g) => {
    if (!g) { segs.push([x0, y0, x1, y1]); return; }
    /* g=[t0,t1] の範囲（0..1）を抜く */
    const mx = t => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    const [ax, ay] = mx(g[0]), [bx, by] = mx(g[1]);
    if (g[0] > 0) segs.push([x0, y0, ax, ay]);
    if (g[1] < 1) segs.push([bx, by, x1, y1]);
  };
  edge(x, y, x + w, y, gap && gap.side === 'b' ? gap.r : null);
  edge(x + w, y, x + w, y + h, gap && gap.side === 'r' ? gap.r : null);
  edge(x + w, y + h, x, y + h, gap && gap.side === 't' ? gap.r : null);
  edge(x, y + h, x, y, gap && gap.side === 'l' ? gap.r : null);
  const poly = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  return { segs, face: { poly, cx: x + w / 2, cy: y + h / 2 } };
};
const F = (i, f) => ({ i, ...f });

test('壁で囲まれた2部屋は、それぞれの名前のゾーンになる', () => {
  const a = room(0, 0, 4, 3), b = room(6, 0, 4, 3);
  const zones = computeZones({
    segs: [...a.segs, ...b.segs],
    faces: [F(1, a.face), F(2, b.face)],
    texts: [{ t: '会議室', x: 2, y: 1.5 }, { t: '事務室', x: 8, y: 1.5 }],
    doors: []
  });
  assert.equal(zones.length, 2);
  const kaigi = zones.find(z => z.name === '会議室');
  const jimu = zones.find(z => z.name === '事務室');
  assert.deepEqual(kaigi.faces, [1]);
  assert.deepEqual(jimu.faces, [2]);
  assert.ok(kaigi.area > 9 && kaigi.area < 14, `会議室の面積 ${kaigi.area}`);
});

test('ドアのある開口はふさがれ、部屋が分かれたままになる', () => {
  /* 右の壁に開口（0.9m）。ドアの情報があると、開口をふさいで2部屋に分かれる */
  const a = room(0, 0, 4, 3, { side: 'r', r: [0.37, 0.67] });
  const b = room(4, 0, 4, 3);
  /* b の左壁は a と共有なので二重に引かない（同じ線でよい） */
  const zones = computeZones({
    segs: [...a.segs, ...b.segs],
    faces: [F(1, a.face), F(2, b.face)],
    texts: [{ t: '会議室', x: 2, y: 1.5 }, { t: '応接室', x: 6, y: 1.5 }],
    doors: [{ c: [4, 1.1], m: [4, 2.0], r: 0.9 }]
  });
  const kaigi = zones.find(z => z.name === '会議室');
  const ousetsu = zones.find(z => z.name === '応接室');
  assert.ok(kaigi && ousetsu);
  assert.deepEqual(kaigi.faces, [1]);
  assert.deepEqual(ousetsu.faces, [2]);
});

test('開けた場所は、名前の文字を種に陣取りで分かれる', () => {
  /* 壁は外周だけ。中に机の輪（家具）がある開けたフロア */
  const outer = room(0, 0, 12, 5);
  const desk = room(3, 2, 2, 1);   // 机の輪（家具サイズの集まり）
  const desk2 = room(8, 2, 2, 1);
  const zones = computeZones({
    segs: [...outer.segs, ...desk.segs, ...desk2.segs],
    faces: [F(1, outer.face), F(2, desk.face), F(3, desk2.face)],
    texts: [{ t: '事務室', x: 2, y: 2.5 }, { t: '会議室', x: 10, y: 2.5 }],
    doors: []
  });
  const names = zones.map(z => z.name).sort();
  assert.deepEqual(names, ['事務室', '会議室']);
  const jimu = zones.find(z => z.name === '事務室');
  const kaigi = zones.find(z => z.name === '会議室');
  /* 外周の区画は中心が左寄りなので事務室側、右の机は会議室側 */
  assert.ok(jimu.faces.includes(1) || kaigi.faces.includes(1));
  assert.ok(kaigi.faces.includes(3));
  assert.ok(jimu.area > 10 && jimu.area < 50, `事務室 ${jimu.area}`);
});

test('名前が無い領域は、仕上げの注記が名前の代わりになる', () => {
  const a = room(0, 0, 4, 3);
  const zones = computeZones({
    segs: a.segs,
    faces: [F(1, a.face)],
    texts: [{ t: '床：長尺シート', x: 2, y: 1.5 }],
    doors: []
  });
  assert.equal(zones.length, 1);
  assert.equal(zones[0].name, '床：長尺シート');
});

test('線で分ける：区画の中心の側で分かれる', () => {
  const faces = [
    { i: 1, cx: 1, cy: 1 }, { i: 2, cx: 3, cy: 1 }, { i: 3, cx: 1, cy: 3 }, { i: 4, cx: 3, cy: 3 }
  ];
  const [A, B] = splitFacesByLine(faces, [[2, -1], [2, 5]]);
  assert.deepEqual(A.sort(), [1, 3]);
  assert.deepEqual(B.sort(), [2, 4]);
  const [C] = splitFacesByLine(faces, [[2, 0]]);
  assert.deepEqual(C.sort(), [1, 2, 3, 4]);   // 線が短い時は全部片側
});

test('データが無ければ空', () => {
  assert.deepEqual(computeZones({}), []);
  assert.deepEqual(computeZones({ segs: [], faces: [] }), []);
});
