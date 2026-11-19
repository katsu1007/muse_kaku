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

test('器具の近く：区画の外にある水回り器具から0.5m以内の小さい区画は部屋と認識できる', () => {
  /* 便器はどの区画にも入っていない（区画が取れなかった場所に器具だけ残った状態） */
  const r = judgeRooms([face(1, 3, 0, 1.5, 1.5), face(2, 8, 0, 2, 2)], {
    fixtures: [{ t: 'toilet', b: [2.3, 0.4, 2.9, 1.4] }]   /* 区画1の縁から0.1m */
  });
  assert.equal(r.map[1], 'room');
  assert.deepEqual(r.why[1], ['器具']);
  assert.equal(r.map[2], 'unknown');
});

test('器具の近く：0.5mより遠い器具は根拠にならない', () => {
  const r = judgeRooms([face(1, 3, 0, 1.5, 1.5)], {
    fixtures: [{ t: 'urinal', b: [1.4, 0.4, 2.0, 1.4] }]   /* 縁から1.0m */
  });
  assert.equal(r.map[1], 'unknown');
});

test('器具の近く：大きい区画（6㎡超）は開けた床とみて対象にしない', () => {
  const r = judgeRooms([face(1, 3, 0, 3, 3)], {
    fixtures: [{ t: 'counter', b: [2.4, 1, 2.95, 2] }]   /* 縁から0.05mだが区画は9㎡ */
  });
  assert.equal(r.map[1], 'unknown');
});

test('器具の近く：水回りでない器具（浴槽・キッチン・種類なし）は根拠にならない', () => {
  const fx = t => (t ? [{ t, b: [2.3, 0.4, 2.9, 1.4] }] : [{ b: [2.3, 0.4, 2.9, 1.4] }]);
  for (const t of ['bath', 'kitchen', null]) {
    const r = judgeRooms([face(1, 3, 0, 1.5, 1.5)], { fixtures: fx(t) });
    assert.equal(r.map[1], 'unknown', `t=${t}`);
  }
  const r2 = judgeRooms([face(1, 3, 0, 1.5, 1.5)], { fixtures: [{ t: 'sink', b: [2.3, 0.4, 2.9, 1.4] }] });
  assert.equal(r2.map[1], 'room');   /* 手洗器は水回り */
});

test('器具の近く：会社名スタンプのゾーンの区画は対象にしない', () => {
  const r = judgeRooms([face(1, 3, 0, 1.5, 1.5)], {
    fixtures: [{ t: 'sink', b: [2.3, 0.4, 2.9, 1.4] }],
    zones: [{ name: '都市開発事業本部一級建築士事務所', faces: [1] }]
  });
  assert.equal(r.map[1], 'unknown');
});

test('器具の近く：表の中（除外の印の区画）にある器具は根拠にならない', () => {
  const table = face(1, 0, 0, 3, 3);
  const small = face(2, 3.3, 1, 1.2, 1.2);
  const r = judgeRooms([table, small], {
    marks: { 1: { s: 'out', type: 'table' } },
    fixtures: [{ t: 'toilet', b: [2.2, 1, 2.8, 2] }]   /* 表の区画の中。区画2の縁から0.5m */
  });
  assert.equal(r.map[1], 'out');
  assert.equal(r.map[2], 'unknown');
});

test('器具の近く：印のある区画（保留・除外）は上書きしない', () => {
  const r = judgeRooms([face(1, 3, 0, 1.5, 1.5), face(2, 6, 0, 1.5, 1.5)], {
    marks: { 1: { s: 'hold', type: 'ring' }, 2: { s: 'out', type: 'frame' } },
    fixtures: [{ t: 'toilet', b: [2.3, 0.4, 2.9, 1.4] }, { t: 'toilet', b: [5.3, 0.4, 5.9, 1.4] }]
  });
  assert.equal(r.map[1], 'hold');
  assert.equal(r.map[2], 'out');
});

test('ゾーンの保留より直接の根拠が強い：同居だけの保留は器具の近さで部屋になる', () => {
  /* 区画1はドアで部屋（直接の根拠）。区画2は名前の無いゾーンで同居 → いったん保留。
   * そこへ区画2の縁から0.1mに便器（どの区画にも入っていない）があれば、保留より
   * 直接の根拠（器具の近さ）が勝って部屋になる */
  const faces = [face(1, 0, 0, 2, 2), face(2, 3, 0, 1.5, 1.5)];
  const zones = [{ name: '', faces: [1, 2] }];
  const doors = [{ c: [1, 1], m: null }];
  const held = judgeRooms(faces, { zones, doors });
  assert.equal(held.map[2], 'hold');
  assert.deepEqual(held.why[2], ['ゾーン']);
  const r = judgeRooms(faces, { zones, doors, fixtures: [{ t: 'toilet', b: [2.3, 0.4, 2.9, 1.4] }] });
  assert.equal(r.map[2], 'room');
  assert.deepEqual(r.why[2], ['器具']);
  assert.equal(r.counts.room, 2);
  assert.equal(r.counts.hold, 0);
});

test('ゾーンの保留より直接の根拠が強い：同居だけの保留は名前の近さでも部屋になる', () => {
  const faces = [face(1, 0, 0, 2, 2), face(2, 3, 0, 1.5, 1.5)];
  const zones = [{ name: '', faces: [1, 2] }];
  const doors = [{ c: [1, 1], m: null }];
  const r = judgeRooms(faces, { zones, doors, texts: [{ t: '便所', x: 2.7, y: 0.75 }] });   /* 区画2の縁から0.3m */
  assert.equal(r.map[2], 'room');
  assert.deepEqual(r.why[2], ['名前']);
});

test('印の保留は、ゾーンの同居と器具の近さがあっても動かない', () => {
  const faces = [face(1, 0, 0, 2, 2), face(2, 3, 0, 1.5, 1.5)];
  const r = judgeRooms(faces, {
    marks: { 2: { s: 'hold', type: 'ring' } },
    zones: [{ name: '', faces: [1, 2] }],
    doors: [{ c: [1, 1], m: null }],
    fixtures: [{ t: 'toilet', b: [2.3, 0.4, 2.9, 1.4] }]
  });
  assert.equal(r.map[1], 'room');
  assert.equal(r.map[2], 'hold');
});

test('文字を渡さなければ従来と完全に同じ', () => {
  const faces = [face(1, 0, 0, 3, 3), face(2, 5, 0, 3, 3)];
  const args = { fixtures: [{ b: [6, 1, 6.5, 1.5] }] };
  const a = judgeRooms(faces, args);
  const b = judgeRooms(faces, { ...args, texts: [] });
  assert.deepEqual(b.map, a.map);
  assert.deepEqual(b.counts, a.counts);
});

/* ラベル帯ガード：仕上げ表のラベル列（高さ0.34mの細帯が同じ帯に並ぶ）を模した並び。
 * 実測（三井屋 i=23・25・26）は幅1.59〜2.04m・高さ0.34m・同高の区画が帯に6件 */
const labelRow = () => [
  face(1, 0, 0, 1.59, 0.34, { name: '女子トイレ' }),
  face(2, 2, 0, 2.04, 0.34, { name: '男子トイレ' }),
  face(3, 4.5, 0, 1.70, 0.34, { name: '洗面所' }),
  face(4, 6.6, 0, 1.80, 0.34, { name: '多目的' }),
];

test('ラベル帯ガード：細帯が帯で繰り返し、根拠が名前だけなら部屋と決めない', () => {
  const r = judgeRooms(labelRow(), {});
  for (const i of [1, 2, 3, 4]) {
    assert.equal(r.map[i], 'unknown');
    assert.deepEqual(r.why[i], ['ラベル帯']);
  }
  assert.equal(r.counts.room, 0);
  assert.equal(r.counts.unknown, 4);
});

test('ラベル帯ガード：帯の繰り返しが3件以下なら細帯でも部屋のまま', () => {
  const r = judgeRooms(labelRow().slice(0, 3), {});
  for (const i of [1, 2, 3]) assert.equal(r.map[i], 'room');
  assert.equal(r.counts.room, 3);
});

test('ラベル帯ガード：ブース寸法（短辺0.85m）は帯で繰り返しても当たらない', () => {
  const booths = [0, 1, 2, 3, 4].map(k => face(10 + k, k * 0.9, 5, 0.85, 1.35));
  const named = face(20, 6, 5, 0.85, 1.35, { name: 'トイレ' });
  const fixtures = booths.map(f => ({ t: 'toilet', b: [f.poly[0][0] + 0.2, 5.3, f.poly[0][0] + 0.65, 6.0] }));
  const r = judgeRooms([...booths, named], { fixtures });
  for (const f of booths) { assert.equal(r.map[f.i], 'room'); assert.deepEqual(r.why[f.i], ['器具']); }
  assert.equal(r.map[20], 'room');
  assert.deepEqual(r.why[20], ['名前']);
});

test('ラベル帯ガード：器具が中に入っている細帯は落とさない（根拠が小さい区画に付いても）', () => {
  const strip = face(1, 0, 0, 2.0, 0.34, { name: '洗面所' });
  const inner = face(2, 0.2, 0.02, 0.3, 0.3);
  const mates = [face(3, 2.5, 0, 1.7, 0.34), face(4, 4.6, 0, 1.8, 0.34), face(5, 6.8, 0, 1.6, 0.34)];
  const r = judgeRooms([strip, inner, ...mates], { fixtures: [{ t: 'counter', b: [0.25, 0.05, 0.45, 0.25] }] });
  assert.equal(r.map[2], 'room');
  assert.deepEqual(r.why[2], ['器具']);
  /* 器具の根拠は小さい区画に付くので細帯の根拠は名前だけだが、中に器具があるので落とさない */
  assert.equal(r.map[1], 'room');
  assert.deepEqual(r.why[1], ['名前']);
});

test('ラベル帯ガード：ドアの根拠がある細帯は落とさない', () => {
  const strip = face(1, 0, 0, 2.0, 0.34, { name: '洗面所' });
  const mates = [face(2, 2.5, 0, 1.7, 0.34), face(3, 4.6, 0, 1.8, 0.34), face(4, 6.8, 0, 1.6, 0.34)];
  const r = judgeRooms([strip, ...mates], { doors: [{ c: [1, 0.17], m: null }] });
  assert.equal(r.map[1], 'room');
  assert.deepEqual(r.why[1], ['名前', 'ドア']);
});

test('ラベル帯ガード：ゾーンの根拠で部屋になった細帯は落とさない', () => {
  const strip = face(1, 0, 0, 2.0, 0.34);
  const mates = [face(2, 2.5, 0, 1.7, 0.34), face(3, 4.6, 0, 1.8, 0.34), face(4, 6.8, 0, 1.6, 0.34)];
  const r = judgeRooms([strip, ...mates], { zones: [{ name: '事務室', faces: [1] }] });
  assert.equal(r.map[1], 'room');
  assert.deepEqual(r.why[1], ['ゾーン']);
});
