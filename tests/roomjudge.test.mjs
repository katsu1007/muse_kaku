/* 部屋の見分け（現段階）：根拠の並べ方のテスト */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeRooms } from '../js/roomjudge.js';

const face = (i, x, y, w, h, extra = {}) => ({ i, area: w * h, poly: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], ...extra });

test('名前のある区画は部屋と認識できる', () => {
  const r = judgeRooms([face(1, 0, 0, 3, 3, { name: '事務室' }), face(2, 5, 0, 3, 3)], {});
  assert.equal(r.map[1], 'room');
  assert.deepEqual(r.why[1], ['名前']);
  assert.equal(r.map[2], 'unknown');
  assert.equal(r.counts.total, 2);
});

test('名前の提案でも部屋と認識できる', () => {
  const r = judgeRooms([face(1, 0, 0, 3, 3)], { names: { 1: '会議室' } });
  assert.equal(r.map[1], 'room');
});

test('器具・ドアの根拠は一番小さい区画に付く（大きい区画が横取りしない）', () => {
  const big = face(1, 0, 0, 10, 10);
  const small = face(2, 1, 1, 1.2, 1.5);
  const r = judgeRooms([big, small], { fixtures: [{ b: [1.3, 1.3, 1.9, 2.2] }], doors: [{ c: [8, 8], m: null }] });
  assert.equal(r.map[2], 'room');
  assert.deepEqual(r.why[2], ['器具']);
  /* ドアの点は大きい区画の中（小さい区画の外）なので、大きい区画の根拠になる */
  assert.equal(r.map[1], 'room');
  assert.deepEqual(r.why[1], ['ドア']);
});

test('除外・保留の印が優先する（名前があっても印が先）', () => {
  const r = judgeRooms(
    [face(1, 0, 0, 3, 3, { name: '表の中' }), face(2, 5, 0, 3, 3)],
    { marks: { 1: { s: 'out', type: 'table' }, 2: { s: 'hold', type: 'ring' } } });
  assert.equal(r.map[1], 'out');
  assert.equal(r.map[2], 'hold');
  assert.equal(r.counts.out, 1);
  assert.equal(r.counts.hold, 1);
});

test('根拠が無ければ「まだ分からない」', () => {
  const r = judgeRooms([face(1, 0, 0, 3, 3), face(2, 5, 0, 2, 2)], {});
  assert.equal(r.counts.unknown, 2);
  assert.equal(r.counts.room, 0);
});
