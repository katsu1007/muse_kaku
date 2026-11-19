/* 部屋の見分け（現段階）— 区画ごとに「部屋と認識できる根拠」があるかを数える。表示専用の集計で、
 * 部屋・見積・区画の判定そのものは変えない。今の読み取りと解析（js/reader2）が既に持っている根拠
 * （区画の名前・名前の提案・中にある器具やドア・図枠や表の印）を並べるだけ。
 *   room    部屋と認識できる：名前がある／器具やドアが中にある
 *   hold    決めきれない：解析の「保留」の印（輪・帯など）
 *   out     部屋ではない：解析の「除外」の印（図枠・表・表題欄の中）
 *   unknown まだ分からない：根拠が何も無い
 * 器具・ドアの根拠は、その点を含む一番小さい区画にだけ付ける（大きい区画が内側の部屋の根拠を
 * 横取りしないように）。
 * 直接の根拠で決まらなかった区画（unknown）だけは、属するゾーンの根拠で補う（2段目）：
 * 部屋名のゾーンに入っていれば room、仕上げ・天井高の注記だけが名前のゾーンは hold まで、
 * 名前の無いゾーンでも直接 room と判定された区画と同居していれば hold。
 * 印（out/hold）と直接の根拠は、ゾーンの根拠では絶対に上書きしない。 */

import { classify } from './reader2/text.js';

/* ゾーン名の種別（zones.js の種の付け方と同じ）：room＝部屋名として分類できる名前、
 * note＝仕上げ・天井高の注記、named＝名前はあるがどちらとも言えないもの、none＝名前なし */
const NOTE_RE = /^(壁|床|天井|巾木)\s*[:：]|^CH\s*[=＝:：]/i;
const SKIP_NAMES = new Set(['事務所棟']);
export function zoneNameKind(name) {
  const n = String(name || '');
  if (!n) return 'none';
  if (NOTE_RE.test(n) || classify(n) === 'ch') return 'note';
  if (classify(n) === 'room' && !SKIP_NAMES.has(n)) return 'room';
  return 'named';
}

export const ROOM_JUDGE = {
  room: { key: 'room', name: '部屋と認識できる', color: '#3ccf8e' },
  hold: { key: 'hold', name: '決めきれない', color: '#ffb020' },
  out: { key: 'out', name: '部屋ではない', color: '#9aa7b8' },
  unknown: { key: 'unknown', name: 'まだ分からない', color: '#6ea8ff' }
};

const pip = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

/* faces: [{i, name, area, poly}]、marks/names は解析の印と名前の提案（区画の i がキー）、
 * fixtures: [{b}]、doors: [{c, m}]、zones: [{name, faces:[区画の i]}]（任意・2段目の根拠）。
 * 戻り値 { map: {i: 'room'|'hold'|'out'|'unknown'}, counts, why: {i: ['名前','器具','ドア','ゾーン']} } */
export function judgeRooms(faces = [], { marks = {}, names = {}, fixtures = [], doors = [], zones = [] } = {}) {
  const F = (faces || []).filter(f => f && f.poly && f.poly.length >= 3);
  const bbox = new Map();
  for (const f of F) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    f.poly.forEach(q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    bbox.set(f.i, [x0, y0, x1, y1]);
  }
  /* 点の根拠：その点を含む一番小さい区画へ */
  const owner = new Map(); /* face i -> Set('器具'|'ドア') */
  const give = (x, y, kind) => {
    let best = null;
    for (const f of F) {
      const b = bbox.get(f.i);
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (!pip(x, y, f.poly)) continue;
      if (!best || (f.area || Infinity) < (best.area || Infinity)) best = f;
    }
    if (!best) return;
    let s = owner.get(best.i); if (!s) { s = new Set(); owner.set(best.i, s); }
    s.add(kind);
  };
  (fixtures || []).forEach(x => { if (x && x.b) give((x.b[0] + x.b[2]) / 2, (x.b[1] + x.b[3]) / 2, '器具'); });
  (doors || []).forEach(dr => { if (!dr) return; if (dr.c) give(dr.c[0], dr.c[1], 'ドア'); if (dr.m) give(dr.m[0], dr.m[1], 'ドア'); });

  const map = {}, why = {}, counts = { room: 0, hold: 0, out: 0, unknown: 0, total: F.length };
  for (const f of F) {
    const m = marks[f.i] || marks[String(f.i)];
    if (m && m.s === 'out') { map[f.i] = 'out'; counts.out++; continue; }
    if (m && m.s === 'hold') { map[f.i] = 'hold'; counts.hold++; continue; }
    const w = [];
    if (f.name || names[f.i] || names[String(f.i)]) w.push('名前');
    const s = owner.get(f.i);
    if (s) { if (s.has('器具')) w.push('器具'); if (s.has('ドア')) w.push('ドア'); }
    if (w.length) { map[f.i] = 'room'; counts.room++; why[f.i] = w; }
    else { map[f.i] = 'unknown'; counts.unknown++; }
  }

  /* 2段目：ゾーンの根拠。直接の根拠で決まらなかった区画（unknown）だけを補う。
   * ゾーンへの所属は zones が持つ区画の一覧をそのまま使う（格子の概算は zones 側の仕事）。
   *   部屋名のゾーン → room／名前のあるゾーンで直接 room の区画と同居 → room
   *   （ただし注記だけが名前のゾーンは hold まで）／名前の無いゾーンで同居 → hold
   *   注記だけが名前のゾーン（同居なし）→ hold */
  if (zones && zones.length) {
    const faceZone = new Map();
    for (const z of zones) for (const i of (z && z.faces) || []) if (!faceZone.has(i)) faceZone.set(i, z);
    const zinfo = new Map();
    for (const z of zones) {
      if (!z) continue;
      zinfo.set(z, { kind: zoneNameKind(z.name), hasRoom: (z.faces || []).some(i => map[i] === 'room') });
    }
    for (const f of F) {
      if (map[f.i] !== 'unknown') continue;
      const z = faceZone.get(f.i); if (!z) continue;
      const zi = zinfo.get(z); if (!zi) continue;
      let next = null;
      if (zi.kind === 'room') next = 'room';
      else if (zi.hasRoom) next = zi.kind === 'named' ? 'room' : 'hold';
      else if (zi.kind === 'note') next = 'hold';
      if (next) { counts.unknown--; counts[next]++; map[f.i] = next; why[f.i] = ['ゾーン']; }
    }
  }
  return { map, counts, why };
}
