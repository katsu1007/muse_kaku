/* 数量の出どころ（js/provenance.js）：表示だけの判定を、保存してある材料だけで言い当てる。
 * 判定が案件データを変えないことも確かめる */
import test from 'node:test';
import assert from 'node:assert/strict';
import { lineProvenance, PROVENANCE } from '../js/provenance.js';

const planRoom = (over = {}) => ({ id: 'r1', name: '便所', src: 'plan', faces: [0], shape: 'free', area: 12, perim: 14, qty: 1, doors: 0, winCount: 0, windows: [], ...over });
const handRoom = (over = {}) => ({ id: 'r2', name: '手の部屋', shape: 'rect', w: 4, d: 3, qty: 1, doors: 0, winCount: 0, windows: [], ...over });
const proj = (rooms, lines, drawing = null) => ({ rooms, lines, drawing });
const key = (l, p, fc = null) => lineProvenance(l, p, fc).key;

test('手入力の行は manual', () => {
  const l = { id: 'l1', qty: 3, basis: null };
  assert.equal(key(l, proj([], [l])), 'manual');
  const l2 = { id: 'l2', qty: 3, basis: { measure: 'manual' } };
  assert.equal(key(l2, proj([], [l2])), 'manual');
});

test('図面の部屋から数える行は drawing', () => {
  const r = planRoom(), l = { id: 'l1', basis: { measure: 'floor', rooms: ['r1'] } };
  assert.equal(key(l, proj([r], [l])), 'drawing');
  const lAll = { id: 'l2', basis: { measure: 'wall', rooms: 'all' } };
  assert.equal(key(lAll, proj([r], [lAll])), 'drawing');
  const ro = planRoom({ src: 'plan-old' });
  assert.equal(key(l, proj([ro], [l])), 'drawing');
});

test('図面の部屋を直した跡があると edited', () => {
  const l = { id: 'l1', basis: { measure: 'floor', rooms: ['r1'] } };
  assert.equal(key(l, proj([planRoom({ doors: 1 })], [l])), 'edited');
  assert.equal(key(l, proj([planRoom({ winCount: 2 })], [l])), 'edited');
  assert.equal(key(l, proj([planRoom({ windows: [{ w: 900, h: 1200, n: 1 }] })], [l])), 'edited');
  assert.equal(key(l, proj([planRoom({ qty: 2 })], [l])), 'edited');
  assert.equal(key(l, proj([planRoom({ shape: 'rect', w: 4, d: 3 })], [l])), 'edited');
  assert.equal(key(l, proj([planRoom({ openOff: true })], [l])), 'edited');
  /* 辺の手直し（faceFix）が当たる区画を含む部屋 */
  const p = proj([planRoom()], [l], { faceFix: { 0: { poly: [] } } });
  assert.equal(key(l, p), 'edited');
  const p2 = proj([planRoom()], [l], { faceFix: { 9: { poly: [] } } });
  assert.equal(key(l, p2), 'drawing');
});

test('手で作った部屋だけなら manual、図面と混ざれば edited', () => {
  const l = { id: 'l1', basis: { measure: 'floor', rooms: 'all' } };
  assert.equal(key(l, proj([handRoom()], [l])), 'manual');
  assert.equal(key(l, proj([planRoom(), handRoom()], [l])), 'edited');
  const lSel = { id: 'l2', basis: { measure: 'floor', rooms: ['r2'] } };
  assert.equal(key(lSel, proj([planRoom(), handRoom()], [lSel])), 'manual');
});

test('器具の行：図面の数と一致すれば drawing、違えば edited', () => {
  const l = { id: 'l1', qty: 5, basis: null, fromFix: 'toilet' };
  assert.equal(key(l, proj([], [l]), { toilet: 5 }), 'drawing');
  assert.equal(key(l, proj([], [l]), { toilet: 4 }), 'edited');
  assert.equal(key(l, proj([], [l]), {}), 'edited');       // 今の図面にその種類が無い
  assert.equal(key(l, proj([], [l]), null), 'drawing');    // 材料が無い時は出どころ（図面）で出す
});

test('図面で入れた物からの行は drawing', () => {
  const l = { id: 'l1', qty: 10, basis: null, fromDemo: 'w|1' };
  assert.equal(key(l, proj([], [l])), 'drawing');
});

test('配管から数える行は、元の行の出どころに付く', () => {
  const par = { id: 'p1', qty: 10, basis: null };
  const l = { id: 'l1', basis: { measure: 'link', line: 'p1', rate: 2 } };
  assert.equal(key(l, proj([], [par, l])), 'manual');
  const parD = { id: 'p2', qty: 10, basis: null, fromDemo: 'w|2' };
  const l2 = { id: 'l2', basis: { measure: 'link', line: 'p2', rate: 2 } };
  assert.equal(key(l2, proj([], [parD, l2])), 'drawing');
  const l3 = { id: 'l3', basis: { measure: 'link', line: 'gone', rate: 2 } };
  assert.equal(key(l3, proj([], [l3])), 'manual');
});

test('廃材の行は、もとになる解体の行の出どころを合わせる', () => {
  const r = planRoom();
  const demo = { id: 'd1', cat: 'demoF', unit: '㎡', itemId: 'demo-x', name: '床の解体 厚12', basis: { measure: 'floor', rooms: ['r1'] } };
  const w = { id: 'w1', basis: { measure: 'waste', kind: 'w-waste' } };
  assert.equal(key(w, proj([r], [demo, w])), 'drawing');
  const demoM = { ...demo, id: 'd2', basis: null, qty: 12 };
  assert.equal(key(w, proj([r], [demoM, w])), 'manual');
  assert.equal(key(w, proj([r], [demo, demoM, w])), 'edited');
  assert.equal(key(w, proj([r], [w])), 'none');
});

test('ラベルが4種類そろっていて、判定は案件データを変えない', () => {
  assert.deepEqual(Object.keys(PROVENANCE).sort(), ['drawing', 'edited', 'manual', 'none']);
  const r = planRoom(), l = { id: 'l1', basis: { measure: 'floor', rooms: ['r1'] } };
  const p = proj([r], [l], { faceFix: {} });
  const before = JSON.stringify(p);
  lineProvenance(l, p, { toilet: 3 });
  assert.equal(JSON.stringify(p), before);
});
