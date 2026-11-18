/* 家具（机・椅子）の検出：線の集まりの切り出しと、辞書判定のつながりを見る */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFurniture } from '../js/furndetect.js';
import { classifyCluster, classifySymbol } from '../js/symdict.js';

const rect = (x, y, w, h) => [
  [x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]
];
const line = (x1, y1, x2, y2) => [[x1, y1, x2, y2]];
/* 椅子：外形＋背もたれの線（直線で描かれた椅子） */
const chairLines = (x, y) => [
  ...rect(x, y, 0.48, 0.50),
  ...line(x, y + 0.40, x + 0.48, y + 0.40)
];
/* 椅子：背が円弧（短い線の連なり） */
const chairArc = (x, y) => {
  const s = [...line(x, y, x + 0.48, y), ...line(x, y, x, y + 0.35), ...line(x + 0.48, y, x + 0.48, y + 0.35)];
  const cx = x + 0.24, cy = y + 0.35, r = 0.24;
  let px = cx - r, py = cy;
  for (let k = 1; k <= 8; k++) {
    const a = Math.PI * k / 8, nx = cx - r * Math.cos(a), ny = cy + r * Math.sin(a) * 0.6;
    s.push([px, py, nx, ny]); px = nx; py = ny;
  }
  return s;
};
const verdicts = (segs, fixtures = [], doors = []) =>
  detectFurniture(segs, fixtures, doors).map(c => ({ c, r: classifyCluster(c, []) }));

test('直線の椅子が「椅子」と判定される', () => {
  const v = verdicts(chairLines(0, 0));
  assert.equal(v.length, 1);
  assert.equal(v[0].r.verdict, 'hit');
  assert.equal(v[0].r.category, '椅子');
});

test('円弧の背の椅子も「椅子」と判定される', () => {
  const v = verdicts(chairArc(0, 0));
  assert.equal(v.length, 1);
  assert.equal(v[0].r.category, '椅子');
});

test('机が「机・デスク」と判定される', () => {
  const segs = [...rect(0, 0, 1.2, 0.7), ...line(0.1, 0.35, 1.1, 0.35)];
  const v = verdicts(segs);
  assert.equal(v.length, 1);
  assert.equal(v[0].r.category, '机・デスク');
});

test('長いベンチデスクは分割線がある時だけ「机・デスク」になる', () => {
  const dashes = [];
  for (let i = 0; i < 6; i++) dashes.push(...line(0.3 + i * 0.85, 0.7, 0.75 + i * 0.85, 0.7));
  const v = verdicts([...rect(0, 0, 5.4, 1.4), ...dashes]);
  assert.equal(v.length, 1);
  assert.equal(v[0].r.category, '机・デスク');
  /* 分割線が無い長い矩形は机と決めない */
  const v2 = verdicts(rect(0, 0, 5.4, 1.4));
  assert.ok(!v2.some(x => x.r.category === '机・デスク' && x.r.verdict === 'hit'));
  /* 寸法だけの判定（器具）ではベンチデスクに当てない */
  const r = classifySymbol({ short: 1400, long: 5400, arcShare: null, closed: null, innerClosed: null, dividers: null });
  assert.notEqual(r.result, '机・デスク');
});

test('壁のような長い線の集まりは候補にならない', () => {
  const v = verdicts(rect(0, 0, 10, 0.2));
  assert.equal(v.length, 0);
});

test('ドアの近く（扉＋円弧）は候補にならない', () => {
  const s = [];
  const cx = 0, cy = 0, r = 0.85;
  let px = cx + r, py = cy;
  for (let k = 1; k <= 6; k++) {
    const a = Math.PI / 2 * k / 6, nx = cx + r * Math.cos(a), ny = cy + r * Math.sin(a);
    s.push([px, py, nx, ny]); px = nx; py = ny;
  }
  s.push(...line(cx, cy, cx + r, cy));
  const v = verdicts(s, [], [{ c: [0, 0], m: [0.6, 0.6], r: 0.85 }]);
  assert.equal(v.length, 0);
});

test('通り芯の丸印（円＋中心の十字）は候補にならない', () => {
  const s = [];
  const cx = 0, cy = 0, r = 0.25;
  let px = cx + r, py = cy;
  for (let k = 1; k <= 36; k++) { /* 円弧はエンジンが10°刻みの短い線で渡してくる */
    const a = Math.PI * 2 * k / 36, nx = cx + r * Math.cos(a), ny = cy + r * Math.sin(a);
    s.push([px, py, nx, ny]); px = nx; py = ny;
  }
  s.push(...line(cx - r * 0.9, cy, cx + r * 0.9, cy), ...line(cx, cy - r * 0.9, cx, cy + r * 0.9));
  const v = verdicts(s);
  assert.equal(v.length, 0);
});

test('器具と重なる形は候補にならない（二重に出さない）', () => {
  const v = verdicts(chairLines(0, 0), [{ b: [-0.05, -0.05, 0.55, 0.55] }]);
  assert.equal(v.length, 0);
});

test('机と椅子が並ぶ場面で、それぞれ別に拾える', () => {
  const segs = [
    ...rect(0, 0, 3.0, 1.4),
    ...line(0.2, 0.7, 2.8, 0.7),
    ...chairLines(0.3, 1.55), ...chairLines(1.2, 1.55), ...chairLines(2.1, 1.55),
    ...chairLines(0.3, -1.15), ...chairLines(1.2, -1.15)
  ];
  const v = verdicts(segs);
  const chairs = v.filter(x => x.r.category === '椅子');
  const desks = v.filter(x => x.r.category === '机・デスク');
  assert.equal(chairs.length, 5);
  assert.equal(desks.length, 1);
});
