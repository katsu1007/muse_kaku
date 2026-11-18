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

test('表のマス（四角が格子状に並んだ集まり）はゾーンに入らない', () => {
  const rm = room(0, 0, 5, 4);
  const segs = [...rm.segs], faces = [F(1, rm.face)];
  let i = 10;
  /* 部屋の横に 4列×3段の表（マス 1.2×0.8） */
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const cell = room(8 + c * 1.2, r * 0.8, 1.2, 0.8);
    segs.push(...cell.segs); faces.push(F(i++, cell.face));
  }
  const zones = computeZones({ segs, faces, texts: [{ t: '会議室', x: 2.5, y: 2 }], doors: [] });
  const used = new Set(); zones.forEach(z => z.faces.forEach(f => used.add(f)));
  assert.ok(used.has(1), '部屋はゾーンに入る');
  for (let k = 10; k < i; k++) assert.ok(!used.has(k), `表のマス ${k} がゾーンに入ってしまった`);
});

test('器具のある小部屋の並び（ブース）は表と見ない', () => {
  /* 大きな部屋の上壁に、端点がつながる形で 3列×2段のブース（1.5×2.4）を付ける。各ブースに器具とドアがある */
  const segs = [], faces = [], fixtures = [], doors = [];
  const W = 1.5, H = 2.4, xs = [0.6, 0.6 + W, 0.6 + 2 * W, 0.6 + 3 * W], top = 8, mid = top - H, bot = top - 2 * H;
  segs.push([0, 0, 10, 0], [10, 0, 10, top], [0, top, 0, 0], [0, top, xs[0], top], [xs[3], top, 10, top]);
  xs.slice(0, 3).forEach((x, k) => segs.push([x, top, xs[k + 1], top], [x, top, x, mid], [xs[k + 1], top, xs[k + 1], mid], [x, mid, xs[k + 1], mid]));
  xs.slice(0, 3).forEach((x, k) => segs.push([x, mid, xs[k + 1], mid], [x, mid, x, bot], [xs[k + 1], mid, xs[k + 1], bot], [x, bot, xs[k + 1], bot]));
  faces.push(F(1, { poly: [[0, 0], [10, 0], [10, top], [0, top]], cx: 5, cy: 1.5 }));
  let i = 10;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const x = xs[c], y = r === 0 ? mid : bot;
    faces.push(F(i, { poly: [[x, y], [x + W, y], [x + W, y + H], [x, y + H]], cx: x + W / 2, cy: y + H / 2 }));
    fixtures.push({ b: [x + 0.3, y + 0.7, x + 1.2, y + 1.8] });
    doors.push({ c: [x + W / 2, y + 0.1], m: [x + W - 0.2, y + 1.0] });
    i++;
  }
  const zones = computeZones({ segs, faces, texts: [{ t: 'トイレ', x: 2.85, y: 6.8 }], doors, fixtures });
  const used = new Set(); zones.forEach(z => z.faces.forEach(f => used.add(f)));
  let booths = 0; for (let k = 10; k < i; k++) if (used.has(k)) booths++;
  assert.ok(booths >= 4, `ブースがゾーンから外れてしまった（入ったのは ${booths} 件）`);
});
