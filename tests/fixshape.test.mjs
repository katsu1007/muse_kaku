/* 器具の形の特徴取り出し（js/fixshape.js）と、形の表示判定（sw.49）のつながりを見る。
 * 実図面での検証は work/fixshape の測定（5図面・正解データ照合）で行い、
 * ここでは合成した線で「取り出しの約束」と「表示の切り替え条件」を固定する */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShapeIndex } from '../js/fixshape.js';
import { classifyBox, classifyFixtureDisplay, classifyFixtureShape } from '../js/symdict.js';

const rect = (x, y, w, h) => [
  [x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]
];
/* 楕円の輪（閉じた曲線を短い線の連なりで） */
const ellipse = (cx, cy, a, b, steps = 28) => {
  const s = [];
  let px = cx + a, py = cy;
  for (let k = 1; k <= steps; k++) {
    const t = 2 * Math.PI * k / steps, nx = cx + a * Math.cos(t), ny = cy + b * Math.sin(t);
    s.push([px, py, nx, ny]); px = nx; py = ny;
  }
  return s;
};
/* 開いた曲線（U字：両端が開いている） */
const openArc = (cx, cy, a, b, steps = 8) => {
  const s = [];
  let px = cx + a * Math.cos(0.35 * Math.PI), py = cy + b * Math.sin(0.35 * Math.PI);
  for (let k = 1; k <= steps; k++) {
    const t = 0.35 * Math.PI + (1.65 - 0.35) * Math.PI * k / steps, nx = cx + a * Math.cos(t), ny = cy + b * Math.sin(t);
    s.push([px, py, nx, ny]); px = nx; py = ny;
  }
  return s;
};

/* 机：外形の長方形＋開いた内側の線（引き出しの線など） */
const deskSegs = (x, y) => [
  ...rect(x, y, 1.6, 0.76),
  [x + 0.1, y + 0.62, x + 1.5, y + 0.62],
  [x + 0.1, y + 0.14, x + 0.8, y + 0.14],
];
const deskBox = [0, 0, 1.6, 0.76];

/* 便器：タンク＋ボウルの楕円（外・内とも閉じた輪）。
 * タンクの底辺はボウルの頂点で分割してある（実図面のシンボルは頂点を共有してつながっている） */
const toiletSegs = (x, y) => [
  [x, y + 0.61, x + 0.23, y + 0.61], [x + 0.23, y + 0.61, x + 0.46, y + 0.61],
  [x + 0.46, y + 0.61, x + 0.46, y + 0.79], [x + 0.46, y + 0.79, x, y + 0.79], [x, y + 0.79, x, y + 0.61],
  ...ellipse(x + 0.23, y + 0.31, 0.23, 0.30),
  ...ellipse(x + 0.23, y + 0.31, 0.16, 0.22),
];
const toiletBox = [0, 0, 0.46, 0.79];

/* 小便器：外形の楕円＋内側の開いた曲線 */
const urinalSegs = (x, y) => [
  ...ellipse(x + 0.185, y + 0.25, 0.185, 0.25),
  ...openArc(x + 0.185, y + 0.25, 0.12, 0.17),
];
const urinalBox = [0, 0, 0.37, 0.5];

test('机の輪郭から特徴が取れる（寸法・閉じ・内側の閉曲線なし）', () => {
  const f = createShapeIndex(deskSegs(0, 0)).featuresFor(deskBox);
  assert.ok(f, '特徴が取れること');
  assert.equal(f.short, 760);
  assert.equal(f.long, 1600);
  assert.equal(f.arcShare, 0);
  assert.equal(f.closed, true);
  assert.equal(f.innerClosed, false);
  assert.equal(f.tier, 1);
  /* タンク帯の欄があること（机では判定に使わないが、特徴の形として常に返す） */
  assert.ok('tankBand' in f && (f.tankBand === true || f.tankBand === false || f.tankBand === null));
});

test('机の形は表示で「検出」になる（形で判定・sw.49）。寸法だけの生判定は box 系に残る', () => {
  const f = createShapeIndex(deskSegs(0, 0)).featuresFor(deskBox);
  const d = classifyFixtureDisplay(deskBox, [], 1, f);
  assert.equal(d.verdict, 'hit');
  assert.equal(d.category, '机・デスク');
  assert.equal(d.shapeBased, true);
  /* タイプ補正の材料（寸法だけの生判定）は従来と同一であること */
  const raw = classifyBox(deskBox, []);
  assert.equal(d.rawVerdict, raw.verdict);
  assert.equal(d.boxCat, raw.category);
  assert.equal(d.boxScore, raw.score);
  assert.equal(d.boxVeto, raw.sizeVeto || null);
});

test('便器の形：内側の閉曲線あり（ボウルの楕円）。タンク帯も取れる（sw.50）', () => {
  const segs = toiletSegs(5, 5);
  const box = [5, 5, 5.46, 5.79];
  const f = createShapeIndex(segs).featuresFor(box);
  assert.ok(f, '特徴が取れること');
  assert.equal(f.innerClosed, true);
  assert.equal(f.closed, true);
  /* タンクの帯（タンク底辺が幅いっぱいに引かれている）が本体の線から測れる */
  assert.equal(f.tankBand, true);
  /* 形＋タンク帯で便器と決着する（流し・SK を候補から外した順位で確定） */
  const s = classifyFixtureShape(f);
  assert.equal(s.verdict, 'hit');
  assert.equal(s.category, '洋式大便器');
  assert.equal(s.tankBand, true);
  const d = classifyFixtureDisplay(box, [], 1, f);
  assert.equal(d.verdict, 'hit');
  assert.equal(d.category, '洋式大便器');
  assert.equal(d.shapeBased, true);
  assert.equal(d.tankBand, true);
  /* タイプ補正の材料（寸法だけの生判定）は従来と同一であること */
  const raw = classifyBox(box, []);
  assert.equal(d.rawVerdict, raw.verdict);
  assert.equal(d.boxCat, raw.category);
  assert.equal(d.boxScore, raw.score);
  assert.equal(d.boxVeto, raw.sizeVeto || null);
});

test('タンク帯の証拠（実測値・高等学園の便器）：帯ありでだけ便器に決着する', () => {
  /* sample1-F24 の実測特徴：形だけでは 流し・SK 0.978 対 便器 0.931 の僅差 */
  const feat = { short: 459, long: 796, arcShare: 0.54, closed: true, innerClosed: true, dividers: 0 };
  const withBand = classifyFixtureShape({ ...feat, tankBand: true });
  assert.equal(withBand.verdict, 'hit');
  assert.equal(withBand.category, '洋式大便器');
  assert.equal(withBand.tankBand, true);
  const d = classifyFixtureDisplay([0, 0, 0.459, 0.796], [], 1, { ...feat, tankBand: true });
  assert.equal(d.verdict, 'hit');
  assert.equal(d.category, '洋式大便器');
  /* 帯が無い・測れない時は従来どおり（SK の類似のまま、表示も確定しない） */
  for (const tb of [false, null, undefined]) {
    const s = classifyFixtureShape({ ...feat, tankBand: tb });
    assert.equal(s.verdict, 'near');
    assert.equal(s.category, '流し・SK');
    assert.equal(s.tankBand, undefined);
    const dd = classifyFixtureDisplay([0, 0, 0.459, 0.796], [], 1, { ...feat, tankBand: tb });
    assert.notEqual(dd.verdict, 'hit');
  }
});

test('タンク帯があっても、小便器形は便器に確定しない（実測値）', () => {
  /* sample1-F1（真値 小便器）の実測特徴：小便器のシンボルにも中心線などで帯が
   * 読めるため、帯は便器の決め手にならない。2026-11-23 の小便器署名（内側鉢
   * あり）で形の1位は小便器になったが、この測定値には内側閉形の詳細
   * （innerShapes）が無いので証拠分岐は発火せず、確定はしない */
  const feat = { short: 370, long: 503, arcShare: 0.63, closed: true, innerClosed: true, dividers: 0, tankBand: true };
  const s = classifyFixtureShape(feat);
  assert.equal(s.verdict, 'near');
  assert.equal(s.category, '小便器');
  const d = classifyFixtureDisplay([0, 0, 0.37, 0.503], [], 1, feat);
  assert.notEqual(d.verdict, 'hit');
});

test('小便器の証拠分岐：内側の鉢の閉形（弧率0.55以上）までそろえば小便器に決着する（実測値）', () => {
  /* sample1-F1 の実測（fixshape 本体基準）：鉢 269×292・弧率0.80。
   * 辞書の再順位付け（便器を除く）で小便器 0.979 対 洗面器 0.920、差 0.059 */
  const feat = { short: 370, long: 503, arcShare: 0.63, closed: true, innerClosed: true, dividers: 0, tankBand: true, innerShapes: [{ short: 269, long: 292, arcShare: 0.8, n: 40 }] };
  const s = classifyFixtureShape(feat);
  assert.equal(s.verdict, 'hit');
  assert.equal(s.category, '小便器');
  assert.equal(s.urinalShape, true);
  const d = classifyFixtureDisplay([0, 0, 0.37, 0.503], [], 1, feat);
  assert.equal(d.verdict, 'hit');
  assert.equal(d.category, '小便器');
  assert.equal(d.shapeBased, true);
});

test('小便器の証拠分岐：寸法の安全弁（長辺>460）だけが引っかかる形も、差0.05以上で決着する（実測値）', () => {
  /* sample5-F22 の実測：380×509・鉢 271×357（弧率1.0）。安全弁が無ければ
   * 小便器 0.986 対 洗面器 0.927 で確定できる形。証拠がそろう場合に限る */
  const feat = { short: 380, long: 509, arcShare: 0.88, closed: true, innerClosed: true, dividers: 0, innerShapes: [{ short: 271, long: 357, arcShare: 1, n: 40 }] };
  const s = classifyFixtureShape(feat);
  assert.equal(s.verdict, 'hit');
  assert.equal(s.category, '小便器');
  /* sample5-F19（380×410・弧率1.0・帯なし）も同じ分岐で決着する */
  const f19 = { short: 380, long: 410, arcShare: 1, closed: true, innerClosed: true, dividers: 0, tankBand: false, innerShapes: [{ short: 271, long: 312, arcShare: 1, n: 40 }] };
  const s19 = classifyFixtureShape(f19);
  assert.equal(s19.verdict, 'hit');
  assert.equal(s19.category, '小便器');
});

test('小便器の証拠分岐：内側閉形の弧率が低い物（コートハンガー）は決着しない（実測値）', () => {
  /* sample2-F14（真値 コートハンガー＝器具ではない）の実測：380×380・輪郭の
   * 弧率0.72 で寸法と弧率は小便器の帯に入るが、内側閉形の弧率は 0.37 しかない。
   * 証拠分岐は発火せず（urinalShape が付かない）、表示も確定にならない。
   * 形だけの素の順位が小便器に傾くこと自体は従来どおりで、表示の確定は
   * 証拠フラグのある物だけという sw.50 以来の約束で止める */
  const feat = { short: 380, long: 380, arcShare: 0.72, closed: true, innerClosed: true, dividers: 0, innerShapes: [{ short: 250, long: 270, arcShare: 0.37, n: 20 }] };
  const s = classifyFixtureShape(feat);
  assert.equal(s.urinalShape, undefined);
  const d = classifyFixtureDisplay([0, 0, 0.38, 0.38], [], 1, feat);
  assert.notEqual(d.verdict, 'hit');
  assert.equal(d.shapeBased, undefined);
});

test('洗面器の証拠分岐：角ばった輪郭＋鉢の閉形で洗面器に決着する（実測値）', () => {
  /* sample5-F14 の実測：407×500・輪郭の弧率0.45・鉢 184×409（弧率0.86）。
   * 箱だけでは便器 0.974 と接戦になる形。便器を除いた再順位付けで洗面器が立つ */
  const feat = { short: 407, long: 500, arcShare: 0.45, closed: true, innerClosed: true, dividers: 0, innerShapes: [{ short: 184, long: 409, arcShare: 0.86, n: 40 }] };
  const s = classifyFixtureShape(feat);
  assert.equal(s.verdict, 'hit');
  assert.equal(s.category, '洗面器');
  assert.equal(s.basinShape, true);
  const d = classifyFixtureDisplay([0, 0, 0.407, 0.5], [], 1, feat);
  assert.equal(d.verdict, 'hit');
  assert.equal(d.category, '洗面器');
});

test('衛生器具の証拠分岐：和式の鉢（幅275）には発火しない', () => {
  /* jbowl 器具の保護：和式の鉢の輪郭（655×275・鉢 460×215）は両分岐の
   * 寸法帯の外。分岐が便器・小便器・洗面器のどれにも決着させないこと */
  const feat = { short: 275, long: 655, arcShare: 0.6, closed: true, innerClosed: true, dividers: 0, innerShapes: [{ short: 215, long: 460, arcShare: 0.9, n: 30 }] };
  const s = classifyFixtureShape(feat);
  assert.ok(!(s.verdict === 'hit' && (s.category === '小便器' || s.category === '洗面器' || s.category === '洋式大便器')), '衛生分岐で決着しないこと');
  assert.equal(s.urinalShape, undefined);
  assert.equal(s.basinShape, undefined);
});

test('SK形はタンク帯があっても便器にならない（実測値）', () => {
  /* sample1-F21（真値 手洗い・SK）の実測特徴：形の1位は洗面器で、便器は候補に無い */
  const feat = { short: 465, long: 560, arcShare: 0.24, closed: true, innerClosed: true, dividers: 99, tankBand: true };
  const s = classifyFixtureShape(feat);
  assert.notEqual(s.category, '洋式大便器');
  const d = classifyFixtureDisplay([0, 0, 0.465, 0.56], [], 1, feat);
  assert.notEqual(d.verdict, 'hit');
  assert.notEqual(d.category, '洋式大便器');
});

test('タンク帯があっても、洗面器との差が 0.05 未満なら便器に確定しない（実測値）', () => {
  /* sample5-F19（真値 手洗い）の実測特徴：便器 0.983 対 洗面器 0.934、差 0.049 */
  const feat = { short: 390, long: 516, arcShare: 0.35, closed: true, innerClosed: true, dividers: 36, tankBand: true };
  const s = classifyFixtureShape(feat);
  assert.equal(s.verdict, 'near');
  assert.equal(s.category, '洋式大便器');
});

test('和式便器らしい形（幅275・タンクなし）は、便器として確定しない', () => {
  /* 和式は便器パターンの寸法帯（幅350以上）の外。帯の真偽によらず確定しない */
  const feat = { short: 275, long: 650, arcShare: 0.5, closed: true, innerClosed: true, dividers: 0 };
  for (const tb of [true, false, null]) {
    const s = classifyFixtureShape({ ...feat, tankBand: tb });
    assert.ok(!(s.verdict === 'hit' && s.category === '洋式大便器'), `tankBand=${tb} で便器に確定しないこと`);
    const d = classifyFixtureDisplay([0, 0, 0.275, 0.65], [], 1, { ...feat, tankBand: tb });
    assert.notEqual(d.category, '洋式大便器');
  }
});

test('小便器の形：内側の線は開いた曲線なので innerClosed=false。タンク帯なし。表示は従来どおり', () => {
  const segs = urinalSegs(9, 9);
  const box = [9, 9, 9.37, 9.5];
  const f = createShapeIndex(segs).featuresFor(box);
  assert.ok(f, '特徴が取れること');
  assert.equal(f.innerClosed, false);
  assert.equal(f.closed, true);
  /* 小便器の輪郭だけではタンク帯は測れない（帯の証拠は付かない） */
  assert.equal(f.tankBand, false);
  const withF = classifyFixtureDisplay(box, [], 1, f);
  const noF = classifyFixtureDisplay(box, [], 1, null);
  assert.equal(withF.verdict, noF.verdict);
  assert.equal(withF.category, noF.category);
  assert.equal(withF.shapeBased, undefined);
});

test('壁の線が器具の角につながっていると、集まりがはみ出すので特徴なし（和式便器の件の型）', () => {
  const segs = [
    ...rect(20, 0, 0.5, 0.4),
    [20.5, 0.4, 20.68, 0.4], /* 角から伸びる壁の線：端点が角と一致して集まりにくっつく */
  ];
  const f = createShapeIndex(segs).featuresFor([20, 0, 20.5, 0.4]);
  assert.equal(f, null);
});

test('箱を横切るだけの線（端点が器具に触れていない）は輪郭を壊さない', () => {
  const segs = [
    ...rect(24, 0, 0.5, 0.4),
    [23.8, 0.2, 25.2, 0.2], /* 横切る線：交点は端点ではないので集まりには入らない */
  ];
  const f = createShapeIndex(segs).featuresFor([24, 0, 24.5, 0.4]);
  assert.ok(f, '輪郭の特徴は取れること');
  assert.equal(f.short, 400);
  assert.equal(f.long, 500);
});

test('同じ大きさの物が2つ1つの箱に入っていると、どちらも本体と言えないので特徴なし', () => {
  const segs = [...rect(30.02, 0.05, 0.42, 0.35), ...rect(30.55, 0.05, 0.42, 0.35)];
  const f = createShapeIndex(segs).featuresFor([30, 0, 31.0, 0.45]);
  assert.equal(f, null);
});

test('箱の中に線が無い・線が空なら特徴なし（例外を投げない）', () => {
  assert.equal(createShapeIndex(deskSegs(0, 0)).featuresFor([50, 50, 51, 51]), null);
  assert.equal(createShapeIndex([]).featuresFor(deskBox), null);
  assert.equal(createShapeIndex(null).featuresFor(deskBox), null);
});

test('feat が無ければ表示は従来どおり（寸法のみの確定は類似に落ちる）', () => {
  const d = classifyFixtureDisplay([0, 0, 0.37, 0.42], [], 1, null);
  assert.equal(d.verdict, 'near');
  assert.equal(d.rawVerdict, 'hit');
  assert.equal(d.capped, true);
  assert.equal(d.shapeBased, undefined);
});

test('自分の辞書の確定は形より優先（feat があっても mine はそのまま）', () => {
  const mine = [{ id: 'u1', name: '作業台', short: 900, long: 2000 }];
  const f = createShapeIndex(deskSegs(0, 0)).featuresFor(deskBox);
  const d = classifyFixtureDisplay([40, 0, 42.0, 0.9], mine, 1, f);
  assert.equal(d.verdict, 'hit');
  assert.equal(d.category, '作業台');
  assert.equal(d.mine, true);
  assert.equal(d.shapeBased, undefined);
});

test('classifyFixtureShape：特徴が無い・壊れていれば null', () => {
  assert.equal(classifyFixtureShape(null), null);
  assert.equal(classifyFixtureShape({ short: 0, long: 0 }), null);
  const s = classifyFixtureShape({ short: 760, long: 1600, arcShare: 0, closed: true, innerClosed: false, dividers: 4 });
  assert.equal(s.verdict, 'hit');
  assert.equal(s.category, '机・デスク');
});
