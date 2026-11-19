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
 * 印（out/hold）と直接の根拠は、ゾーンの根拠では絶対に上書きしない。
 * 名前の文字そのものも根拠にする（texts を渡した時）：バラバラ文字をつないだ部屋名が
 * 区画の中にあれば、その区画（を含む一番小さい区画）の「名前」の根拠になる。どの区画にも
 * 入らなかった部屋名は、0.5m 以内の縁にある区画の根拠にする（3段目。名前はその部屋の床に
 * 書かれるもので、0.5m を超えると隣の空間との境が曖昧になるため、そこで止める）。
 * 会社名のスタンプ（「一級建築士」「建築士事務所」を含む名前）は部屋名として扱わない。
 * 区画が取れず器具だけが面の外に残った図面（混在レイヤーなど）のため、最後に器具の近さも
 * 見る（4段目）：水回りの器具（便器・小便器・洗面・手洗）が縁から 0.5m 以内にある小さい
 * 区画（6㎡以下）は、その水回りの部屋の床の断片とみる。大きい区画は開けた床が器具に接して
 * いるだけのことが多いので対象にしない。表の中（除外の印の区画）にある器具と、会社名
 * スタンプのゾーンの区画は根拠にしない。
 * 3段目・4段目の直接の根拠は、2段目で「ゾーンの同居」だけを理由に保留になった区画にも
 * 効かせる（根拠の強さは ゾーンの同居 < 名前・器具の近さ、の順。ゾーンの保留は仮の
 * 判断なので、後から見つかった直接の根拠が優先する）。ただし解析の印で保留になった
 * 区画（輪・帯など）は、直接の根拠でも動かさない。
 * 最後に、仕上げ表のラベル列の細帯だけを格下げするガードを掛ける（5段目）：短辺0.40m
 * 以下で、その短辺寸法を同じ帯で共有する区画が4件以上あり、器具もドアも中に入って
 * いない区画は、部屋名の文字が中にあるだけで「名前」の根拠が付いても部屋と決めない
 * （実測：5図面の部屋判定382件で、この型に当てはまる本物の部屋はゼロ）。根拠が
 * 「名前」だけの room に限って unknown に戻し、理由は why に「ラベル帯」と残す。 */

import { classify, joinTexts } from './reader2/text.js';

/* ゾーン名の種別（zones.js の種の付け方と同じ）：room＝部屋名として分類できる名前、
 * note＝仕上げ・天井高の注記、named＝名前はあるがどちらとも言えないもの、none＝名前なし */
const NOTE_RE = /^(壁|床|天井|巾木)\s*[:：]|^CH\s*[=＝:：]/i;
const SKIP_NAMES = new Set(['事務所棟']);
const STAMP_RE = /一級建築士|建築士事務所/;
export function zoneNameKind(name) {
  const n = String(name || '');
  if (!n) return 'none';
  if (NOTE_RE.test(n) || classify(n) === 'ch') return 'note';
  if (STAMP_RE.test(n)) return 'named';
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
 * fixtures: [{b}]、doors: [{c, m}]、zones: [{name, faces:[区画の i]}]（任意・2段目の根拠）、
 * texts: [{t|s, x, y}]（任意・名前の文字そのものの根拠。バラバラ文字は中でつなぐ）。
 * 戻り値 { map: {i: 'room'|'hold'|'out'|'unknown'}, counts, why: {i: ['名前','器具','ドア','ゾーン']} } */
export function judgeRooms(faces = [], { marks = {}, names = {}, fixtures = [], doors = [], zones = [], texts = [] } = {}) {
  const F = (faces || []).filter(f => f && f.poly && f.poly.length >= 3);
  const bbox = new Map();
  for (const f of F) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    f.poly.forEach(q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    bbox.set(f.i, [x0, y0, x1, y1]);
  }
  /* 点の根拠：その点を含む一番小さい区画へ */
  const owner = new Map(); /* face i -> Set('器具'|'ドア'|'名前') */
  const smallestAt = (x, y) => {
    let best = null;
    for (const f of F) {
      const b = bbox.get(f.i);
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (!pip(x, y, f.poly)) continue;
      if (!best || (f.area || Infinity) < (best.area || Infinity)) best = f;
    }
    return best;
  };
  const give = (x, y, kind) => {
    const best = smallestAt(x, y);
    if (!best) return;
    let s = owner.get(best.i); if (!s) { s = new Set(); owner.set(best.i, s); }
    s.add(kind);
  };
  (fixtures || []).forEach(x => { if (x && x.b) give((x.b[0] + x.b[2]) / 2, (x.b[1] + x.b[3]) / 2, '器具'); });
  (doors || []).forEach(dr => { if (!dr) return; if (dr.c) give(dr.c[0], dr.c[1], 'ドア'); if (dr.m) give(dr.m[0], dr.m[1], 'ドア'); });

  /* 部屋名の文字（バラバラ文字はつないでから、部屋名として分類できるものだけ）。
   * 中にある区画への根拠は器具・ドアと同じく一番小さい区画へ（owner の '名前'）。
   * どの区画にも入らなかった文字は、3段目（名前の近く）で使うために残す */
  const roomTexts = []; /* {t, x, y, owner: 区画の i | null} */
  if (texts && texts.length) {
    const joined = joinTexts(texts.map(t => t && { t: t.t != null ? t.t : t.s, x: +t.x, y: +t.y }).filter(Boolean)).texts;
    for (const t of joined) {
      if (classify(t.t) !== 'room' || SKIP_NAMES.has(t.t) || STAMP_RE.test(t.t)) continue;
      const best = smallestAt(t.x, t.y);
      roomTexts.push({ t: t.t, x: t.x, y: t.y, owner: best ? best.i : null });
      if (best) { let s = owner.get(best.i); if (!s) { s = new Set(); owner.set(best.i, s); } s.add('名前'); }
    }
  }

  const map = {}, why = {}, counts = { room: 0, hold: 0, out: 0, unknown: 0, total: F.length };
  for (const f of F) {
    const m = marks[f.i] || marks[String(f.i)];
    if (m && m.s === 'out') { map[f.i] = 'out'; counts.out++; continue; }
    if (m && m.s === 'hold') { map[f.i] = 'hold'; counts.hold++; continue; }
    const w = [];
    const s = owner.get(f.i);
    if (f.name || names[f.i] || names[String(f.i)] || (s && s.has('名前'))) w.push('名前');
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

  /* 「ゾーンの同居」だけを理由に保留になった区画（why が ゾーン だけの保留）。
   * 3段目・4段目の直接の根拠は、この保留より強いので対象に含める。
   * 印の保留（why が無い）や直接の根拠は、今まで通り対象にしない */
  const softHold = f => map[f.i] === 'hold' && Array.isArray(why[f.i]) && why[f.i].length === 1 && why[f.i][0] === 'ゾーン';
  const undecided = f => map[f.i] === 'unknown' || softHold(f);
  const decide = (f, kind) => { if (map[f.i] === 'hold') counts.hold--; else counts.unknown--; counts.room++; map[f.i] = 'room'; why[f.i] = [kind]; };

  /* 3段目：名前の近く。部屋名の文字が区画の外にあって、その縁から 0.5m 以内に
   * ある区画は、その名前の部屋の床の断片とみる（ゾーン分けで取り付けられなかった
   * 小さい断片や、名前の文字が隣の区画に入っている場合）。文字が区画の中にある
   * 場合は1段目（一番小さい区画への付与）の担当なので、ここでは見ない。
   * 印と直接の根拠は今まで通り上書きしない（ゾーンの保留だけは直接の根拠が勝つ） */
  if (roomTexts.length) {
    const segDist = (px, py, a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      let t = L2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
    };
    for (const f of F) {
      if (!undecided(f)) continue;
      const b = bbox.get(f.i);
      for (const t of roomTexts) {
        if (pip(t.x, t.y, f.poly)) continue;   /* 中にある名前は1段目（一番小さい区画）の担当 */
        if (t.x < b[0] - 0.5 || t.x > b[2] + 0.5 || t.y < b[1] - 0.5 || t.y > b[3] + 0.5) continue;
        let d = Infinity;
        for (let k = 0; k < f.poly.length; k++) d = Math.min(d, segDist(t.x, t.y, f.poly[k], f.poly[(k + 1) % f.poly.length]));
        if (d <= 0.5) { decide(f, '名前'); break; }
      }
    }
  }

  /* 4段目：器具の近く。区画が取れなかった場所に水回りの器具だけが残っている図面では、
   * 器具の入っている区画が無い（または巨大な区画に横取りされる）ため、1段目の根拠が
   * 付かない。その器具のすぐ周りの小さい区画は、その水回りの部屋の床の断片とみる。
   * 距離は器具の外形（bbox）と区画の縁の間。0.5m は名前の近さ（3段目）と同じ物差しで、
   * 実測でも 0.5m までに器具に張り付いた断片が集まり、それより先はまばらになる。
   * 条件：水回りの器具だけ（便器・小便器・洗面・手洗。浴槽・キッチンは水回りの部屋の
   * 決め手にならないので入れない）／区画は 6㎡以下（それより大きい物は開けた床が器具に
   * 接しているだけのことが多い）／会社名スタンプのゾーンの区画は除く（スタンプの周りの
   * 断片を部屋にしない）／器具の入っている一番小さい区画が「部屋ではない」（表の中など）
   * なら、その器具は根拠にしない。印と直接・ゾーン・名前の根拠は上書きしない */
  const WET = new Set(['toilet', 'urinal', 'counter', 'sink']);
  const wetFx = (fixtures || []).filter(x => x && x.b && WET.has(x.t));
  if (wetFx.length) {
    const segDist = (px, py, a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      let t = L2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
    };
    const segSeg = (a, b, c, d) => {
      const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
      const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
      return Math.min(segDist(a[0], a[1], c, d), segDist(b[0], b[1], c, d), segDist(c[0], c[1], a, b), segDist(d[0], d[1], a, b));
    };
    /* 区画（領域）と器具の外形（矩形）の距離。重なれば 0 */
    const faceFxDist = (f, b) => {
      const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      if (pip(cx, cy, f.poly)) return 0;
      const cn = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
      for (const c of cn) if (pip(c[0], c[1], f.poly)) return 0;
      for (const v of f.poly) if (v[0] >= b[0] && v[0] <= b[2] && v[1] >= b[1] && v[1] <= b[3]) return 0;
      let d = Infinity;
      for (let k = 0; k < f.poly.length; k++) {
        const a = f.poly[k], q = f.poly[(k + 1) % f.poly.length];
        for (let e = 0; e < 4; e++) d = Math.min(d, segSeg(a, q, cn[e], cn[(e + 1) % 4]));
      }
      return d;
    };
    /* 器具の持ち主（中心を含む一番小さい区画）が「部屋ではない」器具は表の中の物として除く */
    const usable = wetFx.filter(x => {
      const o = smallestAt((x.b[0] + x.b[2]) / 2, (x.b[1] + x.b[3]) / 2);
      return !o || map[o.i] !== 'out';
    });
    const faceZone = new Map();
    if (zones && zones.length) for (const z of zones) for (const i of (z && z.faces) || []) if (!faceZone.has(i)) faceZone.set(i, z);
    for (const f of F) {
      if (!undecided(f)) continue;
      if (!(f.area > 0) || f.area > 6) continue;
      const z = faceZone.get(f.i);
      if (z && STAMP_RE.test(String(z.name || ''))) continue;
      const b = bbox.get(f.i);
      for (const x of usable) {
        if (x.b[0] > b[2] + 0.5 || x.b[2] < b[0] - 0.5 || x.b[1] > b[3] + 0.5 || x.b[3] < b[1] - 0.5) continue;
        if (faceFxDist(f, x.b) <= 0.5) { decide(f, '器具'); break; }
      }
    }
  }

  /* 5段目：ラベル帯ガード（格下げのみ・最後に掛ける）。仕上げ表のラベル列のマスには
   * 部屋名の文字が並んでいるので、1段目の「名前」の根拠だけで部屋になってしまう。
   * 実測で、ラベル列の細帯には本物の部屋と重ならない型があった（5図面の部屋判定
   * 382件で誤爆ゼロ）：
   *   ・短辺が 0.40m 以下
   *   ・その短辺寸法を同じ帯で共有する区画が、自分を含めて4件以上。帯は、横長の
   *     区画なら行（y区間の重なりが小さい方の高さの50%超）で高さが、縦長なら列
   *     （x区間の重なり）で幅が、相対2%以内（下限5mm）で一致する区画の集まり
   *   ・器具が中に入っていない（中心で判定）／ドアが中に入っていない（中心点で判定）
   * 便器ブースは短辺0.84mで型の外、本物の床の細い断片は帯で繰り返さない（共有1件）
   * ので、どちらも当たらない。対象は根拠が「名前」だけの room に限り、unknown に
   * 戻して why に「ラベル帯」と残す。器具・ドア・ゾーンの根拠がある区画と、
   * hold・out の区画には触らない。帯の数え方は図面の全区画（補足区画も含む）が対象 */
  {
    const close = (a, b) => Math.abs(a - b) <= Math.max(0.02 * Math.max(a, b), 0.005);
    const ovR = (a0, a1, b0, b1) => { const ov = Math.min(a1, b1) - Math.max(a0, b0); const m = Math.min(a1 - a0, b1 - b0); return m > 0 ? ov / m : 0; };
    const fxPts = (fixtures || []).filter(x => x && x.b).map(x => [(x.b[0] + x.b[2]) / 2, (x.b[1] + x.b[3]) / 2]);
    const drPts = (doors || []).filter(d => d && d.c).map(d => d.c);
    for (const f of F) {
      if (map[f.i] !== 'room') continue;
      const w = why[f.i];
      if (!Array.isArray(w) || w.length !== 1 || w[0] !== '名前') continue;
      const b = bbox.get(f.i);
      const W = b[2] - b[0], H = b[3] - b[1];
      if (Math.min(W, H) > 0.40) continue;
      let band = 0;
      for (const g of F) {
        const gb = bbox.get(g.i);
        if (H <= W ? (ovR(b[1], b[3], gb[1], gb[3]) > 0.5 && close(H, gb[3] - gb[1]))
                   : (ovR(b[0], b[2], gb[0], gb[2]) > 0.5 && close(W, gb[2] - gb[0]))) band++;
      }
      if (band < 4) continue;
      if (fxPts.some(p => pip(p[0], p[1], f.poly))) continue;
      if (drPts.some(p => pip(p[0], p[1], f.poly))) continue;
      map[f.i] = 'unknown'; counts.room--; counts.unknown++; why[f.i] = ['ラベル帯'];
    }
  }
  return { map, counts, why };
}
