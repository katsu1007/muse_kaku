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

test('ゾーンの根拠：部屋名のゾーンに入った区画は部屋と認識できる', () => {
  const r = judgeRooms([face(1, 0, 0, 3, 3), face(2, 5, 0, 3, 3)], { zones: [{ name: '事務室', faces: [2] }] });
  assert.equal(r.map[2], 'room');
  assert.deepEqual(r.why[2], ['ゾーン']);
  assert.equal(r.map[1], 'unknown');
  assert.equal(r.counts.room, 1);
  assert.equal(r.counts.unknown, 1);
});

test('ゾーンの根拠は印を上書きしない（除外・保留が先）', () => {
  const r = judgeRooms(
    [face(1, 0, 0, 3, 3), face(2, 5, 0, 3, 3)],
    { marks: { 1: { s: 'out', type: 'table' }, 2: { s: 'hold', type: 'ring' } }, zones: [{ name: '事務室', faces: [1, 2] }] });
  assert.equal(r.map[1], 'out');
  assert.equal(r.map[2], 'hold');
});

test('ゾーンの根拠：名前の無いゾーンで部屋と同居すると「決めきれない」まで', () => {
  const r = judgeRooms(
    [face(1, 0, 0, 3, 3), face(2, 5, 0, 3, 3)],
    { fixtures: [{ b: [1, 1, 1.5, 1.5] }], zones: [{ name: '', faces: [1, 2] }] });
  assert.equal(r.map[1], 'room');
  assert.equal(r.map[2], 'hold');
});

test('ゾーンの根拠：仕上げ・天井高の注記だけが名前のゾーンは「決めきれない」まで（同居があっても部屋にはしない）', () => {
  const r = judgeRooms(
    [face(1, 0, 0, 3, 3), face(2, 5, 0, 3, 3), face(3, 10, 0, 3, 3)],
    { fixtures: [{ b: [1, 1, 1.5, 1.5] }], zones: [{ name: 'CH=3000', faces: [1, 2] }, { name: '壁：クロス', faces: [3] }] });
  assert.equal(r.map[2], 'hold');
  assert.equal(r.map[3], 'hold');
});

test('ゾーンの根拠：名前のあるゾーンで部屋と同居すれば部屋と認識できる', () => {
  const r = judgeRooms(
    [face(1, 0, 0, 3, 3), face(2, 5, 0, 3, 3)],
    { fixtures: [{ b: [1, 1, 1.5, 1.5] }], zones: [{ name: 'エリア', faces: [1, 2] }] });
  assert.equal(r.map[2], 'room');
});

test('ゾーンの根拠：「事務所棟」は部屋名として扱わない', () => {
  const r = judgeRooms([face(1, 0, 0, 3, 3)], { zones: [{ name: '事務所棟', faces: [1] }] });
  assert.equal(r.map[1], 'unknown');
});

test('名前の文字：バラバラ文字をつないだ部屋名が区画の中にあれば部屋と認識できる', () => {
  const r = judgeRooms([face(1, 0, 0, 4, 4), face(2, 6, 0, 3, 3)], {
    texts: [{ t: '事', x: 1, y: 2 }, { t: '務', x: 1.3, y: 2 }, { t: '室', x: 1.6, y: 2 }]
  });
  assert.equal(r.map[1], 'room');
  assert.deepEqual(r.why[1], ['名前']);
  assert.equal(r.map[2], 'unknown');
});

test('名前の文字があっても印が優先する', () => {
  const r = judgeRooms([face(1, 0, 0, 4, 4)], {
    marks: { 1: { s: 'out', type: 'table' } },
    texts: [{ t: '事務室', x: 2, y: 2 }]
  });
  assert.equal(r.map[1], 'out');
});

test('名前の文字：中にある名前は一番小さい区画のもの（大きい区画は横取りしない）', () => {
  const big = face(1, 0, 0, 10, 10);
  const small = face(2, 1, 1, 1.5, 1.5);
  const r = judgeRooms([big, small], { texts: [{ t: '事務室', x: 1.5, y: 1.5 }] });
  assert.equal(r.map[2], 'room');
  assert.equal(r.map[1], 'unknown');
});

test('名前の近く：区画の外にある部屋名から0.5m以内の区画は部屋と認識できる', () => {
  const r = judgeRooms([face(1, 0, 0, 2, 2), face(2, 5, 0, 2, 2)], {
    texts: [{ t: '事務室', x: 2.3, y: 1 }]   /* 区画1の縁から0.3m、区画2からは2.7m */
  });
  assert.equal(r.map[1], 'room');
  assert.deepEqual(r.why[1], ['名前']);
  assert.equal(r.map[2], 'unknown');
});

test('会社名のスタンプは部屋名として扱わない（文字・ゾーン名とも）', () => {
  const stamp = '都市開発事業本部一級建築士事務所';
  const r1 = judgeRooms([face(1, 0, 0, 4, 4)], { texts: [{ t: stamp, x: 2, y: 2 }] });
  assert.equal(r1.map[1], 'unknown');
  const r2 = judgeRooms([face(1, 0, 0, 4, 4)], { zones: [{ name: stamp, faces: [1] }] });
  assert.equal(r2.map[1], 'unknown');
});

test('ゾーンを渡さなければ従来と完全に同じ', () => {
  const faces = [face(1, 0, 0, 3, 3, { name: '事務室' }), face(2, 5, 0, 3, 3), face(3, 10, 0, 3, 3)];
  const args = { marks: { 3: { s: 'out', type: 'frame' } }, fixtures: [{ b: [6, 1, 6.5, 1.5] }] };
  const a = judgeRooms(faces, args);
  const b = judgeRooms(faces, { ...args, zones: [] });
  assert.deepEqual(b.map, a.map);
  assert.deepEqual(b.counts, a.counts);
});

test('文字を渡さなければ従来と完全に同じ', () => {
  const faces = [face(1, 0, 0, 3, 3), face(2, 5, 0, 3, 3)];
  const args = { fixtures: [{ b: [6, 1, 6.5, 1.5] }] };
  const a = judgeRooms(faces, args);
  const b = judgeRooms(faces, { ...args, texts: [] });
  assert.deepEqual(b.map, a.map);
  assert.deepEqual(b.counts, a.counts);
});
