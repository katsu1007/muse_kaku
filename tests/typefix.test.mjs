/* 器具のタイプ補正（js/typefix.js）のテスト。実行：node --test tests/
 * 各ルールに「発火する例」と「発火しない例」を置く。寸法は三井屋・大天・江南の
 * 実測（正しさの物差しの分析）から取った代表値。座標は m、箱は [x0,y0,x1,y1]。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { correctFixtureTypes, hasBathContext, countBowls, hasTankBand, hasBasinFace } from '../js/typefix.js';

const fx = (t, w, h, x = 0, y = 0, extra = {}) => ({ t, b: [x, y, x + w, y + h], ...extra });
const hit = category => ({ verdict: 'hit', category, score: 0.97 });
const near = category => ({ verdict: 'near', category, score: 0.96 });
const unk = { verdict: 'unknown', category: null, score: 0 };
const run = (fixtures, verdicts, opts = {}) => correctFixtureTypes(fixtures, { verdicts, texts: [], zoneNames: [], scale: 1, ...opts });

/* 卵形ボウルの線（タンク帯が無い形）を、箱 [x,y,w,h] に合わせて作る */
const eggFor = (x, y, w, h) => {
  const segs = [];
  const cx = x + w / 2, cy = y + h * 0.42, rx = w * 0.30, ry = h * 0.34;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI;
    segs.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a), cx + rx * Math.cos(a + 0.31), cy + ry * Math.sin(a + 0.31)]);
  }
  return segs;
};
/* タンク帯のある便器の線：卵形＋上辺から 200mm 内側に幅の9割の直線 */
const tankFor = (x, y, w, h) => [...eggFor(x, y, w, h), [x + w * 0.05, y + h - 0.20, x + w * 0.95, y + h - 0.20]];

/* ===== ルール1 小便器の列 ===== */

test('小便器の列：便器 349×620 が横に3つ並び、タンク帯も無い → 小便器に補正', () => {
  const F = [fx('toilet', 0.349, 0.620, 0, 0), fx('toilet', 0.349, 0.620, 0.851, 0), fx('toilet', 0.349, 0.620, 1.702, 0)];
  const segs = [...eggFor(0, 0, 0.349, 0.620), ...eggFor(0.851, 0, 0.349, 0.620), ...eggFor(1.702, 0, 0.349, 0.620)];
  const r = run(F, [unk, unk, unk], { segs });
  assert.ok(r.every(x => x && x.shown === 'urinal' && x.rule === 'urinal-row' && !x.confirm));
});

test('小便器の列：線が無い図面では、列でも変換せず要確認だけ（sw.46）', () => {
  const F = [fx('toilet', 0.349, 0.620, 0, 0), fx('toilet', 0.349, 0.620, 0.851, 0)];
  const r = run(F, [unk, unk]);
  assert.ok(r.every(x => x && x.shown === null && x.confirm && x.rule === 'toilet-size'));
});

test('小便器の列：タンク帯がある物は列でも変換しない（sw.46）', () => {
  const F = [fx('toilet', 0.349, 0.620, 0, 0), fx('toilet', 0.349, 0.620, 0.851, 0)];
  const segs = [...tankFor(0, 0, 0.349, 0.620), ...tankFor(0.851, 0, 0.349, 0.620)];
  const r = run(F, [unk, unk], { segs });
  assert.ok(r.every(x => !x || x.shown !== 'urinal'));
  assert.ok(r.every(x => x && x.confirm));
});

test('小便器の列：辞書が便器と言い切る物は触らない（椅子の背などの誤爆よけ）', () => {
  const F = [fx('toilet', 0.344, 0.569, 0, 0), fx('toilet', 0.344, 0.569, 0.9, 0)];
  const r = run(F, [hit('洋式大便器'), near('洋式大便器')]);
  assert.ok(r.every(x => !x || x.shown !== 'urinal'));
});

test('小便器の列：辞書が洗面器と読む物も触らない（日本モウルドの椅子の実例）', () => {
  const F = [fx('toilet', 0.344, 0.569, 0, 0), fx('toilet', 0.344, 0.569, 0.9, 0), fx('toilet', 0.344, 0.569, 1.8, 0)];
  const r = run(F, [near('洗面器'), near('洗面器'), near('洗面器')]);
  assert.ok(r.every(x => !x || x.shown !== 'urinal'));
  assert.ok(r.every(x => x && x.confirm));   /* 補正ではなく要確認の印になる */
});

test('小便器の列：辞書が小便器と読む物は発火する（三井屋 F20/F21 の実例）', () => {
  const F = [fx('toilet', 0.349, 0.509, 0, 0), fx('toilet', 0.349, 0.509, 0.9, 0)];
  const segs = [...eggFor(0, 0, 0.349, 0.509), ...eggFor(0.9, 0, 0.349, 0.509)];
  const r = run(F, [near('小便器'), near('小便器')], { segs });
  assert.ok(r.every(x => x && x.shown === 'urinal'));
});

test('小便器の列：並んでいない単独の物は補正せず要確認だけ', () => {
  const r = run([fx('toilet', 0.390, 0.516)], [near('洋式大便器')]);
  assert.equal(r[0].shown, null);
  assert.equal(r[0].confirm, true);
  assert.equal(r[0].rule, 'toilet-size');
});

test('小便器の列：長さが便器の帯にある本物の便器は無印', () => {
  const r = run([fx('toilet', 0.459, 0.796, 0, 0), fx('toilet', 0.459, 0.796, 0.9, 0)], [unk, unk]);
  assert.deepEqual(r, [null, null]);
});

/* ===== ルール2 個室の便器 ===== */

test('個室の便器：洗面台 640×790 がトイレの近くに繰り返され、タンク帯もある → 便器に補正', () => {
  const F = [fx('counter', 0.640, 0.790, 0, 0), fx('counter', 0.640, 0.790, 1.6, 0)];
  const segs = [...tankFor(0, 0, 0.640, 0.790), ...tankFor(1.6, 0, 0.640, 0.790)];
  const r = run(F, [hit('キッチン・洗濯設備'), hit('キッチン・洗濯設備')], { texts: [{ t: '女子トイレ', c: [0.9, 1.8] }], segs });
  assert.ok(r.every(x => x && x.shown === 'toilet' && x.rule === 'booth-toilet' && !x.confirm));
});

test('個室の便器：線が無い図面では、繰り返しと文字だけでは変換せず要確認（sw.46）', () => {
  const F = [fx('counter', 0.640, 0.790, 0, 0), fx('counter', 0.640, 0.790, 1.6, 0)];
  const r = run(F, [hit('キッチン・洗濯設備'), hit('キッチン・洗濯設備')], { texts: [{ t: '女子トイレ', c: [0.9, 1.8] }] });
  assert.ok(r.every(x => x && x.shown === null && x.confirm && x.rule === 'booth-toilet'));
});

test('個室の便器：タンク帯が無い形では変換せず要確認（sw.46）', () => {
  const F = [fx('counter', 0.640, 0.790, 0, 0), fx('counter', 0.640, 0.790, 1.6, 0)];
  const segs = [...eggFor(0, 0, 0.640, 0.790), ...eggFor(1.6, 0, 0.640, 0.790)];
  const r = run(F, [hit('キッチン・洗濯設備'), hit('キッチン・洗濯設備')], { texts: [{ t: '女子トイレ', c: [0.9, 1.8] }], segs });
  assert.ok(r.every(x => x && x.shown === null && x.confirm && x.rule === 'booth-toilet'));
});

test('個室の便器：トイレの文字が近くに無ければ補正しない', () => {
  const F = [fx('counter', 0.520, 0.784, 0, 0), fx('counter', 0.520, 0.784, 2, 0)];
  const r = run(F, [hit('キッチン・洗濯設備'), hit('キッチン・洗濯設備')]);
  assert.deepEqual(r, [null, null]);
});

test('個室の便器：辞書が洗面器と言い切る本物の洗面台は触らない', () => {
  const F = [fx('counter', 0.500, 0.753, 0, 0), fx('counter', 0.500, 0.753, 2, 0)];
  const r = run(F, [hit('洗面器'), hit('洗面器')], { texts: [{ t: '男子トイレ', c: [0.3, 1.5] }] });
  assert.deepEqual(r, [null, null]);
});

/* ===== ルール3 浴槽（sw.46 で変換停止・要確認のみ） ===== */

test('浴槽：洗面台 670×895 の近くに排水口 → 変換せず要確認だけ（三井屋 F1 の実例）', () => {
  const r = run([fx('counter', 0.670, 0.895)], [unk], { texts: [{ t: '排水口', c: [0.3, 1.0] }] });
  assert.equal(r[0].shown, null);
  assert.equal(r[0].confirm, true);
  assert.equal(r[0].rule, 'bath-drain');
});

test('浴槽：形で決まる小便器（ルール7）を、浴槽の疑いの印で邪魔しない', () => {
  /* 660×850 は浴槽の帯にも入るが、辞書は便器と読みタンク帯も無い → ルール7 が先に変換する */
  const F = [fx('counter', 0.660, 0.850)];
  const r = run(F, [near('洋式大便器')], { segs: eggFor(0, 0, 0.660, 0.850), texts: [{ t: '排水口', c: [0.3, 1.3] }, { t: '男子トイレ', c: [0.3, 2.3] }] });
  assert.equal(r[0].shown, 'urinal');
  assert.equal(r[0].rule, 'urinal-notank');
});

test('浴槽：排水口の文字が無ければ補正しない（机や台の誤爆よけ）', () => {
  const r = run([fx('counter', 0.668, 1.603)], [hit('机・デスク')]);
  assert.deepEqual(r, [null]);
});

test('浴槽：辞書が洗面器と言い切る物は、排水口が近くても触らない', () => {
  const r = run([fx('counter', 0.700, 0.900)], [hit('洗面器')], { texts: [{ t: '排水口', c: [0.3, 1.0] }] });
  assert.deepEqual(r, [null]);
});

/* ===== ルール4 机は浴槽ではない ===== */

test('机は浴槽ではない：浴槽 812×1600 に辞書は机、槽の内形も無く、浴室の文脈なし → 器具ではない', () => {
  /* 机の面は外形そのものだけ（槽らしい内形は無い） */
  const deskFaces = [{ poly: [[0, 0], [0.812, 0], [0.812, 1.6], [0, 1.6]], area: 1.299 }];
  const r = run([fx('bath', 0.812, 1.600)], [hit('机・デスク')], { faces: deskFaces });
  assert.equal(r[0].shown, 'other');
  assert.equal(r[0].rule, 'desk-not-bath');
});

test('机は浴槽ではない：槽らしい内形がある物は落とさず要確認（大天の流し台 F5/F6 の実例・sw.46）', () => {
  /* 流し台 795×1743：外形の面＋内側に 500×500 の槽の面 */
  const sinkFaces = [
    { poly: [[0, 0], [0.795, 0], [0.795, 1.743], [0, 1.743]], area: 1.386 },
    { poly: [[0.1475, 1.10], [0.6475, 1.10], [0.6475, 1.60], [0.1475, 1.60]], area: 0.25 },
  ];
  const r = run([fx('bath', 0.795, 1.743)], [hit('机・デスク')], { faces: sinkFaces });
  assert.equal(r[0].shown, null);
  assert.equal(r[0].confirm, true);
  assert.equal(r[0].rule, 'desk-not-bath');
});

test('机は浴槽ではない：面が無い図面では形を確認できないので落とさず要確認（sw.46）', () => {
  const r = run([fx('bath', 0.812, 1.600)], [hit('机・デスク')]);
  assert.equal(r[0].shown, null);
  assert.equal(r[0].confirm, true);
  assert.equal(r[0].rule, 'desk-not-bath');
});

test('机は浴槽ではない：浴室の文脈がある図面では変えずに要確認', () => {
  const r = run([fx('bath', 0.812, 1.600)], [hit('机・デスク')], { texts: [{ t: '浴室', c: [5, 5] }] });
  assert.equal(r[0].shown, null);
  assert.equal(r[0].confirm, true);
});

test('机は浴槽ではない：辞書が「類似」止まりでは発火しない', () => {
  const r = run([fx('bath', 0.755, 1.655)], [near('机・デスク')]);
  assert.deepEqual(r, [null]);
});

/* ===== 共通の歯止め ===== */

test('利用者が直した器具（edited）は補正しない', () => {
  const F = [fx('toilet', 0.349, 0.620, 0, 0, { edited: true }), fx('toilet', 0.349, 0.620, 0.851, 0)];
  const segs = [...eggFor(0, 0, 0.349, 0.620), ...eggFor(0.851, 0, 0.349, 0.620)];
  const r = run(F, [unk, unk], { segs });
  assert.equal(r[0], null);
  assert.equal(r[1].shown, 'urinal');
});

test('倍率：座標が 0.75 倍の図面では、実寸に直してから帯を見る', () => {
  /* 測った値 262×465mm、倍率 0.75 → 実寸 349×620mm で小便器の列が発火する */
  const F = [fx('toilet', 0.262, 0.465, 0, 0), fx('toilet', 0.262, 0.465, 0.7, 0)];
  const segs = [...eggFor(0, 0, 0.262, 0.465), ...eggFor(0.7, 0, 0.262, 0.465)];
  const r = run(F, [unk, unk], { scale: 0.75, segs });
  assert.ok(r.every(x => x && x.shown === 'urinal'));
});

test('浴室文脈：文字とゾーン名の両方を見る', () => {
  assert.equal(hasBathContext([{ t: '脱衣室' }], []), false);
  assert.equal(hasBathContext([{ t: '浴室' }], []), true);
  assert.equal(hasBathContext([], ['ユニットバス']), true);
  assert.equal(hasBathContext([], ['洗面所']), false);
});

/* ===== ルール6 ボウルが2個ある洗面カウンター（sw.45・幾何） ===== */

const face = (cx, cy, w, h, area) => ({ poly: [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]], area });
/* 三井屋 F3 の実測：1655×755 の箱に 500×321mm・0.160㎡ のボウル面が2枚 */
const f3faces = [face(0.45, 0.38, 0.500, 0.321, 0.160), face(1.20, 0.38, 0.500, 0.321, 0.160)];

test('ボウル2個：浴槽と言われた箱に同寸法のボウルが2個 → 洗面台に補正（三井屋 F3）', () => {
  const r = run([fx('bath', 1.655, 0.755)], [near('浴槽')], { faces: f3faces });
  assert.equal(r[0].shown, 'counter');
  assert.equal(r[0].rule, 'bath-bowls');
  assert.equal(r[0].confirm, false);
});

test('ボウル2個：ボウルが1個だけの浴槽は触らない（真の浴槽）', () => {
  const r = run([fx('bath', 1.050, 0.843)], [unk], { faces: [face(0.52, 0.42, 0.500, 0.321, 0.160)] });
  assert.equal(r[0], null);
});

test('ボウル2個：辞書が浴槽と言い切る物は触らない', () => {
  const r = run([fx('bath', 1.655, 0.755)], [hit('浴槽')], { faces: f3faces });
  assert.equal(r[0], null);
});

test('ボウル2個：面が無い図面では発火しない', () => {
  const r = run([fx('bath', 1.655, 0.755)], [near('浴槽')]);
  assert.equal(r[0], null);
});

test('countBowls：大きさの違う面は別々に数える', () => {
  const b = [0, 0, 1.655, 0.755];
  assert.equal(countBowls(b, f3faces), 2);
  assert.equal(countBowls(b, [face(0.45, 0.38, 0.500, 0.321, 0.160), face(1.20, 0.38, 0.340, 0.430, 0.128)]), 1);
  assert.equal(countBowls(b, []), 0);
  assert.equal(countBowls(b, null), 0);
});

/* ===== ルール7 タンク帯の無い小便器（sw.45・幾何） ===== */

/* 卵形ボウルの近似：短い線が下半分に集まり、帯になる直線は無い（三井屋 F12 の形） */
const eggSegs = [];
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI, cx = 0.291, cy = 0.30, rx = 0.17, ry = 0.24;
  eggSegs.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a), cx + rx * Math.cos(a + 0.31), cy + ry * Math.sin(a + 0.31)]);
}
const tankSegs = [...eggSegs, [0.03, 0.50, 0.55, 0.50]];   /* 壁側 200mm 内側に幅の9割の直線＝タンク帯 */

test('タンク帯なし：洗面台と言われた卵形ボウル → 小便器に補正（三井屋 F12）', () => {
  const F = [fx('counter', 0.582, 0.703)];
  const r = run(F, [near('洋式大便器')], { segs: eggSegs, texts: [{ t: '男子トイレ', c: [0.3, 3.28] }] });
  assert.equal(r[0].shown, 'urinal');
  assert.equal(r[0].rule, 'urinal-notank');
});

test('タンク帯なし：タンク帯がある本物の便器は触らない', () => {
  const F = [fx('counter', 0.582, 0.703)];
  const r = run(F, [near('洋式大便器')], { segs: tankSegs, texts: [{ t: '男子トイレ', c: [0.3, 3.28] }] });
  assert.equal(r[0], null);
});

test('タンク帯なし：線が無い図面では判定不能として発火しない', () => {
  const F = [fx('counter', 0.582, 0.703)];
  const r = run(F, [near('洋式大便器')], { texts: [{ t: '男子トイレ', c: [0.3, 3.28] }] });
  assert.equal(r[0], null);
});

test('タンク帯なし：水回りの文字が近くに無い物は触らない', () => {
  const F = [fx('counter', 0.582, 0.703)];
  const r = run(F, [near('洋式大便器')], { segs: eggSegs });
  assert.equal(r[0], null);
});

test('hasTankBand：帯あり／なし／判定不能', () => {
  const b = [0, 0, 0.582, 0.703];
  assert.equal(hasTankBand(b, tankSegs), true);
  assert.equal(hasTankBand(b, eggSegs), false);
  assert.equal(hasTankBand(b, [[0.1, 0.1, 0.2, 0.1]]), null);
  assert.equal(hasTankBand(b, []), null);
  assert.equal(hasTankBand(b, null), null);
});

test('hasTankBand：箱を大きく横切る通り線は帯と数えない（三井屋 F17 の実例・sw.46）', () => {
  const b = [0, 0, 0.349, 0.620];
  /* 卵形の線＋下辺から 100mm 内側を横切る 2,700mm の通り線（はみ出し 1,177mm） */
  const thru = [...eggFor(0, 0, 0.349, 0.620), [-1.177, 0.10, 1.523, 0.10]];
  assert.equal(hasTankBand(b, thru), false);
  /* 箱に収まる帯の線は従来どおり数える */
  assert.equal(hasTankBand(b, tankFor(0, 0, 0.349, 0.620)), true);
});

/* ===== 槽の内形（sw.46・ルール4 の歯止め） ===== */

test('hasBasinFace：内側の槽の面だけを数える', () => {
  const b = [0, 0, 0.795, 1.743];
  const basin = { poly: [[0.1475, 1.10], [0.6475, 1.10], [0.6475, 1.60], [0.1475, 1.60]], area: 0.25 };
  const outline = { poly: [[0, 0], [0.795, 0], [0.795, 1.743], [0, 1.743]], area: 1.386 };
  const divider = { poly: [[0, 0.1], [0.4, 0.1], [0.4, 1.7], [0, 1.7]], area: 0.64 };   /* 辺に接する仕切り面 */
  assert.equal(hasBasinFace(b, [outline, basin]), true);
  assert.equal(hasBasinFace(b, [outline]), false);
  assert.equal(hasBasinFace(b, [divider]), false);
  assert.equal(hasBasinFace(b, []), false);
  assert.equal(hasBasinFace(b, null), false);
});
