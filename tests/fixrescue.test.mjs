/* 器具の救済（js/fixrescue.js）：壁も器具も同じレイヤーに描く図面で、読み取りが壁のレイヤーごと
 * 外して消えた器具を、アプリ側で拾い直す。読み取り（エンジン）の器具が優先で、二重に数えない */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rescueFixtures, mergeFixtures, rescueLayers } from '../js/fixrescue.js';

/* 便器の形（タンク＋楕円の鉢）を KE の図形（mm）で作る。置き場所は原点、大きさ 390×700mm */
const toiletEnts = (ly, dx = 0, dy = 0) => {
  const out = [];
  /* タンク：390×150 の四角（短い線4本） */
  const T = [[dx, dy + 550], [dx + 390, dy + 550], [dx + 390, dy + 700], [dx, dy + 700]];
  for (let i = 0; i < 4; i++) out.push({ k: 'line', ly, a: T[i], b: T[(i + 1) % 4] });
  /* 鉢：楕円（小さな直線の連なり＝曲線として数えられる） */
  const pts = [];
  for (let k = 0; k < 16; k++) { const a = k * 2 * Math.PI / 16; pts.push([dx + 195 + 195 * Math.cos(a), dy + 275 + 275 * Math.sin(a)]); }
  out.push({ k: 'poly', ly, pts, closed: true });
  return out;
};
/* 壁の線（長い直線8本、合計28.4m）。便器には触らない場所に置く */
const wallEnts = ly => [
  [-2000, 2000, 3000, 2000], [-2000, 2150, 3000, 2150], [-2000, -1000, 3000, -1000], [-2000, -1150, 3000, -1150],
  [-2000, -1000, -2000, 2000], [3000, -1000, 3000, 2000], [-2000, 2000, -2000, 3200], [3000, 2000, 3000, 3200],
].map(([x1, y1, x2, y2]) => ({ k: 'line', ly, a: [x1, y1], b: [x2, y2] }));
/* 扉の円弧（半径900mm・90°） */
const doorArc = ly => ({ k: 'arc', ly, c: [2000, 300], r: 900, sweep: 90, pts: [[2900, 300], [2636, 936], [2000, 1200]] });

/* 混在レイヤー MIX：壁＋扉＋便器が全部同じレイヤー */
const mixedEnts = (ly = 'MIX') => [...wallEnts(ly), doorArc(ly), ...toiletEnts(ly)];
/* 図面（m）：壁の線と、便器の背の壁 */
const planOf = () => ({
  segs: [
    ...wallEnts('MIX').map(e => [...e.a.map(v => v / 1000), ...e.b.map(v => v / 1000)]),
    [-0.5, 0.72, 1.0, 0.72],
  ],
  faces: [],
});

test('壁も器具も同じレイヤーの器具が救済される', () => {
  const r = rescueFixtures(mixedEnts(), planOf(), 0, []);
  assert.equal(r.length, 1);
  assert.equal(r[0].t, 'toilet');
  assert.equal(r[0].src, 'rescue');
  assert.equal(r[0].ly, 'MIX');
  assert.deepEqual(r[0].b, [0, 0, 0.39, 0.7]);
});

test('救済の対象レイヤーの判定（壁レイヤー＋扉の円弧）', () => {
  const mm = mixedEnts().map(e => e.k === 'line'
    ? { ...e, a: e.a.map(v => v / 1000), b: e.b.map(v => v / 1000) }
    : e.k === 'arc' ? { ...e, c: e.c.map(v => v / 1000), r: e.r / 1000, pts: e.pts.map(p => p.map(v => v / 1000)) }
    : { ...e, pts: e.pts.map(p => p.map(v => v / 1000)) });
  assert.deepEqual(rescueLayers(mm), ['MIX']);
});

test('読み取りが拾った器具と重なる候補は出さない（エンジン優先）', () => {
  const engine = [{ t: 'toilet', b: [0, 0, 0.39, 0.7], back: 'N', out: null }];
  assert.deepEqual(rescueFixtures(mixedEnts(), planOf(), 0, engine), []);
});

test('扉の円弧が無い壁レイヤーは救済しない（ただの壁の層）', () => {
  const ents = [...wallEnts('WALL'), ...toiletEnts('WALL')];
  assert.deepEqual(rescueFixtures(ents, planOf(), 0, []), []);
});

test('壁でない普通のレイヤーには発火しない', () => {
  assert.deepEqual(rescueFixtures(toiletEnts('SAN'), planOf(), 0, []), []);
});

test('家具系の名前のレイヤーは救済しない', () => {
  assert.deepEqual(rescueFixtures(mixedEnts('家具'), planOf(), 0, []), []);
});

test('回転した図面でも、器具の位置と向きが図面の向きに戻る', () => {
  const rot = Math.PI / 2;
  const R = p => [-p[1], p[0]]; /* +90°（図面の向き） */
  const plan = { segs: planOf().segs.map(s => [...R([s[0], s[1]]), ...R([s[2], s[3]])]), faces: [] };
  const r = rescueFixtures(mixedEnts(), plan, rot, []);
  assert.equal(r.length, 1);
  assert.equal(r[0].t, 'toilet');
  assert.deepEqual(r[0].b, [-0.7, 0, 0, 0.39]);
  assert.equal(r[0].back, 'W');
});

test('mergeFixtures は読み取り分を先に、そのまま足す', () => {
  const a = { t: 'sink', b: [0, 0, 1, 1] }, b = { t: 'toilet', b: [2, 2, 3, 3], src: 'rescue' };
  assert.deepEqual(mergeFixtures([a], [b]), [a, b]);
  assert.deepEqual(mergeFixtures(null, null), []);
  assert.deepEqual(mergeFixtures([a], []), [a]);
});

test('材料が無い・図面が無い時は空（読み込みを止めない）', () => {
  assert.deepEqual(rescueFixtures(null, planOf(), 0, []), []);
  assert.deepEqual(rescueFixtures(mixedEnts(), null, 0, []), []);
  assert.deepEqual(rescueFixtures([], planOf(), 0, []), []);
});
