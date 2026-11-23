/* シンボル辞書のテスト。実行：node --test tests/
 * 期待値は実測した図形の特徴（CC0の小便器・実図面で同定したロッカー等）から決めた。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySymbol, SYM_THRESHOLD, SYM_DICT, scorePattern } from '../js/symdict.js';

test('しきい値は 0.90', () => { assert.equal(SYM_THRESHOLD, 0.90); });

test('CC0小便器の実測特徴（450×500・円弧0.67）は、寸法が国内の実在帯の外なので確定せず「要確認：小便器」', () => {
  // 形は小便器そのものだが、500の辺は小便器の寸法帯（幅330〜460・出寸法320〜420）を外れる。
  // 2026-11-21 の寸法特性（Web参照基準）で、形のスコアが十分でも確定しないようになった
  const r = classifySymbol({ short: 450, long: 500, arcShare: 0.67, closed: true, innerClosed: false, dividers: null });
  assert.equal(r.result, '要確認');
  assert.equal(r.category, '小便器');
  assert.equal(r.sizeVeto, 'urinal-size');
  assert.ok(r.score >= 0.9);
});

test('ロッカー2連（565×900・直線のみ・分割線あり）はロッカー', () => {
  const r = classifySymbol({ short: 565, long: 900, arcShare: 0.0, closed: true, innerClosed: false, dividers: 3 });
  assert.equal(r.result, 'ロッカー');
});

test('壁掛け大便器（398×497・円弧主体・内側の閉曲線あり）は形だけでは洗面器と分かれず「要確認」', () => {
  // 平面の形は洗面器とほぼ同じ。切り分けにはレイヤーや部屋などの文脈が要るので、確定しないのが正しい
  const r = classifySymbol({ short: 398, long: 497, arcShare: 0.8, closed: true, innerClosed: true, dividers: null });
  assert.equal(r.result, '要確認');
});

test('幅の広い洗面器（500×600）は便器の範囲を外れるので洗面器', () => {
  const r = classifySymbol({ short: 500, long: 600, arcShare: 0.5, closed: true, innerClosed: true, dividers: null });
  assert.equal(r.result, '洗面器');
});

test('椅子（545×571・円弧主体）は椅子', () => {
  const r = classifySymbol({ short: 545, long: 571, arcShare: 0.85, closed: true, innerClosed: false, dividers: null });
  assert.equal(r.result, '椅子');
});

test('便器と洗面器の両方に合う形は確定せず「要確認」', () => {
  const r = classifySymbol({ short: 440, long: 560, arcShare: 0.5, closed: true, innerClosed: true, dividers: null });
  assert.equal(r.result, '要確認');
});

test('どれにも合わない形は「不明」', () => {
  const r = classifySymbol({ short: 1200, long: 1250, arcShare: 0.5, closed: true, innerClosed: false, dividers: null });
  assert.equal(r.result, '不明');
});

import { classifyBox, SYM_VERDICTS } from '../js/symdict.js';

test('外形だけの判定：小便器 370×420mm は検出（小便器）', () => {
  const r = classifyBox([0, 0, 0.37, 0.42]);
  assert.equal(r.verdict, 'hit');
  assert.equal(r.category, '小便器');
});

test('外形だけの判定：ロッカー 900×565mm は検出（ロッカー）', () => {
  const r = classifyBox([0, 0, 0.9, 0.565]);
  assert.equal(r.verdict, 'hit');
  assert.equal(r.category, 'ロッカー');
});

test('外形だけの判定：大便器 398×497mm は洗面器などと分かれず類似（確定しない）', () => {
  const r = classifyBox([0, 0, 0.398, 0.497]);
  assert.equal(r.verdict, 'near');
});

test('外形だけの判定：辞書に無い大きさ（2000×900mm）は不明', () => {
  const r = classifyBox([0, 0, 2.0, 0.9]);
  assert.equal(r.verdict, 'unknown');
  assert.equal(r.category, null);
});

test('外形だけの判定：外形が無い・壊れている時は不明', () => {
  assert.equal(classifyBox(null).verdict, 'unknown');
  assert.equal(classifyBox([0, 0]).verdict, 'unknown');
});

test('3区分の色は互いに違う', () => {
  const cs = [SYM_VERDICTS.hit.color, SYM_VERDICTS.near.color, SYM_VERDICTS.unknown.color];
  assert.equal(new Set(cs).size, 3);
});

test('自分の辞書：登録した寸法と名前が最優先で検出になる（辞書に無い大きさでも）', () => {
  const mine = [{ id: 'u1', name: '作業台', short: 900, long: 2000 }];
  const r = classifyBox([0, 0, 2.0, 0.9], mine);
  assert.equal(r.verdict, 'hit');
  assert.equal(r.category, '作業台');
  assert.equal(r.mine, true);
});

test('自分の辞書：寸法が許容（±5%）の内なら少し違っても検出、外なら通常の判定に戻る', () => {
  const mine = [{ id: 'u1', name: '大便器', short: 398, long: 497 }];
  assert.equal(classifyBox([0, 0, 0.41, 0.51], mine).category, '大便器');
  const r = classifyBox([0, 0, 0.6, 0.9], mine);
  assert.notEqual(r.category, '大便器');
});

test('自分の辞書：壊れた登録は無視する', () => {
  const mine = [{ id: 'u2', name: '', short: 0, long: 0 }, null, { name: 'x' }];
  const r = classifyBox([0, 0, 0.37, 0.42], mine);
  assert.equal(r.category, '小便器');
  assert.equal(r.mine, undefined);
});

import { classifyFixtureDisplay } from '../js/symdict.js';

test('表示用判定（sw.46）：器具の寸法のみの確定は「類似」に落とし、生判定は rawVerdict に残す', () => {
  const r = classifyFixtureDisplay([0, 0, 0.37, 0.42]);
  assert.equal(r.verdict, 'near');
  assert.equal(r.rawVerdict, 'hit');
  assert.equal(r.capped, true);
  assert.equal(r.category, '小便器');
  /* 生の classifyBox は従来どおり hit（タイプ補正などが使う） */
  assert.equal(classifyBox([0, 0, 0.37, 0.42]).verdict, 'hit');
});

test('表示用判定（sw.46）：自分の辞書の確定は落とさない／類似・不明はそのまま', () => {
  const mine = [{ id: 'u1', name: '作業台', short: 900, long: 2000 }];
  const m = classifyFixtureDisplay([0, 0, 2.0, 0.9], mine);
  assert.equal(m.verdict, 'hit');
  assert.equal(m.rawVerdict, 'hit');
  assert.equal(m.capped, undefined);
  const n = classifyFixtureDisplay([0, 0, 0.398, 0.497]);
  assert.equal(n.verdict, 'near');
  assert.equal(n.rawVerdict, 'near');
  assert.equal(n.capped, undefined);
  const u = classifyFixtureDisplay([0, 0, 2.0, 0.9]);
  assert.equal(u.verdict, 'unknown');
  assert.equal(u.rawVerdict, 'unknown');
});

test('CC0実測：浴槽（750×1700・円弧0.25・内側の閉曲線あり）は浴槽', () => {
  const r = classifySymbol({ short: 750, long: 1700, arcShare: 0.25, closed: true, innerClosed: true, dividers: null });
  assert.equal(r.result, '浴槽');
});

test('CC0実測：シャワートレー（900×900）は外形だけでも検出', () => {
  const r = classifyBox([0, 0, 0.9, 0.9]);
  assert.equal(r.verdict, 'hit');
  assert.equal(r.category, 'シャワー');
});

test('同寸法が複数カテゴリにある形（550×600）は確定せず類似', () => {
  const r = classifyBox([0, 0, 0.55, 0.6]);
  assert.equal(r.verdict, 'near');
});

/* 椅子の文脈判定：形が僅差（類似）の時だけ、周囲の根拠で確定に上げる。文脈が無ければ従来と同一 */
import { classifyCluster, buildChairContexts, promoteChair, CHAIR_CTX_FLOOR } from '../js/symdict.js';

/* 実図面の椅子候補と同じ特徴（545×571・円弧0.89）: 形だけでは洗面器と僅差で「類似：椅子」 */
const chairCand = (x, y) => ({ b: [x, y, x + 0.545, y + 0.571], short: 545, long: 571, arcShare: 0.89, closed: true, dividers: 0 });
const deskCand = (x, y) => ({ b: [x, y, x + 1.2, y + 0.7], short: 700, long: 1200, arcShare: 0, closed: true, dividers: 1 });
const ctxFor = (clusters, env = {}) => {
  const base = clusters.map(c => classifyCluster(c, []));
  const ctxs = buildChairContexts(clusters, base, env);
  return clusters.map((c, j) => (ctxs[j] ? classifyCluster(c, [], ctxs[j]) : base[j]));
};

test('文脈なし（ctx=null）は従来の判定と完全に同じ', () => {
  const f = chairCand(0, 0);
  const a = classifyCluster(f, []);
  assert.equal(a.verdict, 'near');
  assert.equal(a.category, '椅子');
  assert.deepEqual(classifyCluster(f, [], null), a);
  assert.equal(a.context, undefined);
});

test('確定した机のそばにある椅子候補は、文脈で確定になる', () => {
  const clusters = [chairCand(0, 0), deskCand(0, 0.62)]; /* 机の縁まで 0.05m */
  const r = ctxFor(clusters);
  assert.equal(r[0].verdict, 'hit');
  assert.equal(r[0].category, '椅子');
  assert.equal(r[0].context, 'chair');
  assert.equal(r[1].verdict, 'hit');
  assert.equal(r[1].category, '机・デスク');
  assert.equal(r[1].context, undefined); /* 机自身は文脈で変わらない */
});

test('同じ寸法の椅子候補が列をなしていれば、机が無くても確定になる', () => {
  const clusters = [chairCand(0, 0), chairCand(0.7, 0), chairCand(1.4, 0)];
  const r = ctxFor(clusters);
  assert.ok(r.every(x => x.verdict === 'hit' && x.category === '椅子' && x.context === 'chair'));
});

test('水回りの文字が近くにある椅子候補は、机がそばでも上げない', () => {
  const clusters = [chairCand(0, 0), deskCand(0, 0.62)];
  const r = ctxFor(clusters, { texts: [{ t: '便', x: 0.3, y: 1.6 }] }); /* 椅子の中心から約1.3m */
  assert.equal(r[0].verdict, 'near');
  assert.equal(r[0].context, undefined);
});

test('水回りの名前のゾーンに入っている椅子候補は上げない', () => {
  const clusters = [chairCand(0, 0), deskCand(0, 0.62)];
  const faces = [{ i: 0, poly: [[-1, -1], [3, -1], [3, 3], [-1, 3]] }];
  const zones = [{ name: '男子トイレ', faces: [0] }];
  const r = ctxFor(clusters, { faces, zones });
  assert.equal(r[0].verdict, 'near');
});

test('便器・小便器の器具に接している椅子候補は上げない', () => {
  const clusters = [chairCand(0, 0), deskCand(0, 0.62)];
  const fixtures = [{ b: [0.6, 0, 1.0, 0.45], t: 'urinal' }]; /* 椅子の縁まで 0.05m */
  const r = ctxFor(clusters, { fixtures });
  assert.equal(r[0].verdict, 'near');
});

test('事務室のゾーンに入っている椅子候補は、机も列も無くてよい', () => {
  const clusters = [chairCand(0, 0)];
  const faces = [{ i: 0, poly: [[-1, -1], [3, -1], [3, 3], [-1, 3]] }];
  const zones = [{ name: '事務室', faces: [0] }];
  const r = ctxFor(clusters, { faces, zones });
  assert.equal(r[0].verdict, 'hit');
  assert.equal(r[0].context, 'chair');
});

test('形のスコアが下限未満なら、文脈があっても上げない', () => {
  const ctx = { desk: true, rep: true, office: true, wet: false };
  const low = { verdict: 'near', category: '椅子', score: CHAIR_CTX_FLOOR - 0.01, short: 545, long: 571 };
  assert.equal(promoteChair(low, ctx).verdict, 'near');
  const ok = { verdict: 'near', category: '椅子', score: 0.99, short: 545, long: 571 };
  const up = promoteChair(ok, ctx);
  assert.equal(up.verdict, 'hit');
  assert.equal(up.context, 'chair');
});

test('文脈で変えるのは「類似：椅子」だけ（確定済み・他の類似はそのまま）', () => {
  const ctx = { desk: true, rep: true, office: true, wet: false };
  const hit = { verdict: 'hit', category: '椅子', score: 0.99, short: 545, long: 571 };
  assert.equal(promoteChair(hit, ctx), hit);
  const uri = { verdict: 'near', category: '小便器', score: 0.99, short: 450, long: 500 };
  assert.equal(promoteChair(uri, ctx), uri);
  const wetCtx = { desk: true, rep: true, office: true, wet: true };
  const chair = { verdict: 'near', category: '椅子', score: 0.99, short: 545, long: 571 };
  assert.equal(promoteChair(chair, wetCtx), chair);
});

/* ===== 文脈判定の一般化（sw.36）: 衛生トップの椅子と、トイレ内の衛生器具 =====
 * 実図面の食堂・待合の椅子と同じ特徴（453×519・円弧1）: 形では洗面器が1位、椅子が2位 */
const basinChairCand = (x, y) => ({ b: [x, y, x + 0.453, y + 0.519], short: 453, long: 519, arcShare: 1, closed: true, dividers: 0 });
/* 実図面の小便器の列と同じ特徴（400×460・円弧0.38）: 形では小便器と洋式大便器が僅差。
 * 寸法は小便器の実在帯（幅330〜460・出寸法320〜420）に収まる物を使う
 * （旧 407×500 は、寸法照合で洗面器と判明した三井屋の実例に合わせていたため差し替え） */
const urinalCand = (x, y) => ({ b: [x, y, x + 0.4, y + 0.46], short: 400, long: 460, arcShare: 0.38, closed: true, dividers: 52 });

test('classifySymbol は次点と椅子の形スコアも返す（判定そのものは不変）', () => {
  const r = classifySymbol({ short: 453, long: 519, arcShare: 1, closed: true, innerClosed: null, dividers: 0 });
  assert.equal(r.result, '要確認');
  assert.equal(r.category, '洗面器');
  assert.equal(r.second, '椅子');
  assert.ok(r.chairScore >= 0.95, `chairScore=${r.chairScore}`);
});

test('洗面器トップの候補も、文脈なしでは従来と同じ「類似：洗面器」', () => {
  const f = basinChairCand(0, 0);
  const a = classifyCluster(f, []);
  assert.equal(a.verdict, 'near');
  assert.equal(a.category, '洗面器');
  assert.deepEqual(classifyCluster(f, [], null), a);
});

test('洗面器トップでも、列をなしていれば椅子で確定になる（食堂・待合の椅子）', () => {
  const clusters = [basinChairCand(0, 0), basinChairCand(0.8, 0), basinChairCand(1.6, 0)];
  const r = ctxFor(clusters);
  assert.ok(r.every(x => x.verdict === 'hit' && x.category === '椅子' && x.context === 'chair'));
});

test('洗面器トップでも、確定した机のそばなら椅子で確定になる', () => {
  const clusters = [basinChairCand(0, 0), deskCand(0, 0.57)]; /* 机の縁まで 0.05m */
  const r = ctxFor(clusters);
  assert.equal(r[0].verdict, 'hit');
  assert.equal(r[0].category, '椅子');
  assert.equal(r[0].context, 'chair');
});

test('洗面器トップの候補も、水回りの文字が近ければ椅子に上げない', () => {
  const clusters = [basinChairCand(0, 0), basinChairCand(0.8, 0), basinChairCand(1.6, 0)];
  const r = ctxFor(clusters, { texts: [{ t: '便', x: 1.0, y: 1.6 }] }); /* 列の中心から約1.3m */
  assert.ok(r.every(x => x.verdict === 'near' && x.category === '洗面器'));
});

test('小便器の列は、便器の器具が端にあれば列全体が小便器で確定になる', () => {
  const clusters = [urinalCand(0, 0), urinalCand(1.01, 0), urinalCand(2.02, 0)];
  const fixtures = [{ b: [3.2, 0, 3.6, 0.45], t: 'toilet' }]; /* 3件目の縁まで約0.77m */
  const r = ctxFor(clusters, { fixtures });
  assert.ok(r.every(x => x.verdict === 'hit' && x.category === '小便器' && x.context === 'sanitary'));
});

test('小便器の列だけでは（アンカーが無ければ）確定しない', () => {
  const clusters = [urinalCand(0, 0), urinalCand(1.01, 0), urinalCand(2.02, 0)];
  const r = ctxFor(clusters);
  assert.ok(r.every(x => x.verdict === 'near' && x.category === '小便器'));
});

test('衛生ルートは文脈オブジェクトのアンカーでだけ効く', () => {
  const uri = { verdict: 'near', category: '小便器', score: 0.977, chairScore: 0.935, short: 400, long: 460 };
  assert.equal(promoteChair(uri, { desk: false, rep: true, office: false, wet: false }), uri);
  const up = promoteChair(uri, { desk: false, rep: false, office: false, wet: false, anchor: true });
  assert.equal(up.verdict, 'hit');
  assert.equal(up.category, '小便器');
  assert.equal(up.context, 'sanitary');
  const upG = promoteChair(uri, { desk: false, rep: false, office: false, wet: false, anchorGroup: true });
  assert.equal(upG.verdict, 'hit');
});

/* ===== 寸法特性による確定の制限（2026-11-21、Web参照基準の実測から） ===== */
import { sizeVetoReason } from '../js/symdict.js';

test('寸法特性：便器は長さ820超・幅510超では確定しない（描画実測の上限から）', () => {
  assert.equal(sizeVetoReason('洋式大便器', { short: 450, long: 830 }), 'toilet-size');
  assert.equal(sizeVetoReason('洋式大便器', { short: 520, long: 700 }), 'toilet-size');
  assert.equal(sizeVetoReason('洋式大便器', { short: 450, long: 800 }), null);
  assert.equal(sizeVetoReason('洋式大便器', { short: 496, long: 785 }), null); /* リモコン付き実測の最大級 */
});

test('寸法特性：小便器は幅330〜460・出寸法320〜420の枠の外では確定しない', () => {
  assert.equal(sizeVetoReason('小便器', { short: 316, long: 324 }), 'urinal-size'); /* コーナー手洗器の実例 */
  assert.equal(sizeVetoReason('小便器', { short: 407, long: 500 }), 'urinal-size'); /* 洗面器と判明した三井屋の実例 */
  assert.equal(sizeVetoReason('小便器', { short: 370, long: 420 }), null);
  assert.equal(sizeVetoReason('小便器', { short: 420, long: 460 }), null);
  const r = classifyBox([0, 0, 0.316, 0.324]);
  assert.equal(r.verdict, 'near');
  assert.equal(r.category, '小便器');
  assert.equal(r.sizeVeto, 'urinal-size');
});

test('寸法特性：浴槽は幅680〜950・長さ850〜1750の外では確定しない', () => {
  assert.equal(sizeVetoReason('浴槽', { short: 750, long: 1780 }), 'bath-size');
  assert.equal(sizeVetoReason('浴槽', { short: 600, long: 1200 }), 'bath-size');
  assert.equal(sizeVetoReason('浴槽', { short: 750, long: 1700 }), null);
  assert.equal(sizeVetoReason('浴槽', { short: 720, long: 1050 }), null); /* 在来の小型浴槽帯 */
  const r = classifySymbol({ short: 740, long: 1770, arcShare: 0.25, closed: true, innerClosed: true, dividers: null });
  assert.equal(r.result, '要確認');
  assert.equal(r.category, '浴槽');
  assert.equal(r.sizeVeto, 'bath-size');
});

test('寸法特性：手洗器より広く洗面ボウルより浅い単体（344×569）は洗面器で確定しない', () => {
  // 実図面で椅子の背もたれが器具として拾われた実例の寸法。奥行344は手洗器の帯、
  // 幅569は手洗器の上限（500）超えで、カウンター幅（600）にも届かない
  const r = classifyBox([0, 0, 0.344, 0.569]);
  assert.equal(r.verdict, 'near');
  assert.equal(r.category, '洗面器');
  assert.equal(r.sizeVeto, 'basin-depth');
});

test('寸法特性：SKと洗面器が重なる帯（456×560）は寸法で確定しない', () => {
  const r = classifySymbol({ short: 456, long: 560, arcShare: 0.6, closed: true, innerClosed: true, dividers: null });
  assert.equal(r.result, '要確認');
  assert.equal(r.category, '洗面器');
  assert.equal(r.sizeVeto, 'sk-overlap');
});

test('寸法特性：sizeVeto の付いた類似は文脈（アンカー）でも確定に上げない', () => {
  const clusters = [urinalCand(0, 0), urinalCand(1.01, 0), urinalCand(2.02, 0)];
  const fixtures = [{ b: [3.2, 0, 3.6, 0.45], t: 'toilet' }];
  const ok = ctxFor(clusters, { fixtures });
  assert.ok(ok.every(x => x.verdict === 'hit')); /* 帯の中の列は従来どおり上がる */
  const vetoed = { verdict: 'near', category: '小便器', score: 0.977, chairScore: 0.9, short: 407, long: 500, sizeVeto: 'urinal-size' };
  assert.equal(promoteChair(vetoed, { desk: false, rep: false, office: false, wet: false, anchor: true }), vetoed);
});

test('消火栓：廊下壁際の浅い箱（250×800・直線のみ）はクラスタなら消火栓、寸法だけでは当てない', () => {
  const r = classifyCluster({ short: 250, long: 800, arcShare: 0, closed: true, dividers: 0 }, []);
  assert.equal(r.verdict, 'hit');
  assert.equal(r.category, '消火栓');
  /* 浅型カウンター洗面（600×250）と寸法が重なるため、外形だけの判定には使わない */
  assert.equal(classifyBox([0, 0, 0.6, 0.25]).verdict, 'unknown');
});

test('ゾーン名の水回り降格は、大きな区画（複数室の混ざり）では効かない', () => {
  const clusters = [chairCand(0, 0), deskCand(0, 0.62)];
  const bigFaces = [{ i: 0, poly: [[-5, -5], [5, -5], [5, 5], [-5, 5]] }]; /* 100㎡ */
  const zones = [{ name: '男子トイレ', faces: [0] }];
  const rBig = ctxFor(clusters, { faces: bigFaces, zones });
  assert.equal(rBig[0].verdict, 'hit');
  assert.equal(rBig[0].category, '椅子');
  const smallFaces = [{ i: 0, poly: [[-0.5, -0.5], [1.5, -0.5], [1.5, 1.5], [-0.5, 1.5]] }]; /* 4㎡ */
  const rSmall = ctxFor(clusters, { faces: smallFaces, zones });
  assert.equal(rSmall[0].verdict, 'near');
});

test('和式便器：細長い楕円（275×655・曲線が多い）は線のかたまりなら和式便器、寸法だけでは当てない（2026-11-22）', () => {
  const r = classifyCluster({ short: 275, long: 655, arcShare: 0.7, closed: true, dividers: null });
  assert.strictEqual(r.category, '和式便器');
  const b = classifyBox([0, 0, 0.655, 0.275]);
  assert.notStrictEqual(b.category, '和式便器');
});

/* 素の四角ガード（試行・2026-11-22 tagtrial）：物ではない物（仕上表のセル等）が
 * 素の四角形だけで家具として検出になるのを、表示だけ類似に落とす。
 * 期待値は正しさの物差し（sw.51 時点）の実測：対象 39 件中 30 件を覆い、正解の家具には当たらない署名 */
import { bareClusterFlags, BARE_MAX_SEGS, BARE_MAX_ARC } from '../js/symdict.js';

/* 仕上表のセルと同型（450×900・直線のみ・線4本・単独・文字なし） */
const cellCand = (x, y) => ({ b: [x, y, x + 0.45, y + 0.9], short: 450, long: 900, arcShare: 0, closed: true, dividers: 0, n: 4 });

test('素の四角ガード：単独の素の四角（仕上表セル型）は該当になる', () => {
  assert.deepEqual(bareClusterFlags([cellCand(0, 0)], []), [true]);
});

test('素の四角ガード：辺を接して並ぶ四角（机の列・島）は該当にならない', () => {
  const pair = [cellCand(0, 0), cellCand(0.45, 0)];
  assert.deepEqual(bareClusterFlags(pair, []), [false, false]);
});

test('素の四角ガード：円弧のある形・線の多い形は該当にならない', () => {
  assert.deepEqual(bareClusterFlags([{ ...cellCand(0, 0), arcShare: 0.5 }], []), [false]);
  assert.deepEqual(bareClusterFlags([{ ...cellCand(0, 0), n: BARE_MAX_SEGS + 6 }], []), [false]);
  assert.ok(BARE_MAX_ARC < 0.1);
});

test('素の四角ガード：外形の中に文字がある実在の什器は該当にならない', () => {
  const f = cellCand(0, 0);
  assert.deepEqual(bareClusterFlags([f], [{ t: '収納', x: 0.2, y: 0.4 }]), [false]);
  assert.deepEqual(bareClusterFlags([f], [{ t: '室名', x: 3, y: 3 }]), [true]);
});

test('素の四角ガード：検出は類似に落ち、生の判定は rawVerdict に残る', () => {
  const f = cellCand(0, 0);
  const plain = classifyCluster(f, []);
  assert.equal(plain.verdict, 'hit');
  assert.equal(plain.category, '収納（棚・キャビネット）');
  const g = classifyCluster(f, [], null, 1, true);
  assert.equal(g.verdict, 'near');
  assert.equal(g.capped, true);
  assert.equal(g.rawVerdict, 'hit');
  assert.equal(g.category, plain.category);
  assert.equal(g.score, plain.score);
});

test('素の四角ガード：自分の辞書の検出は落とさない／ガードなしは従来と同一', () => {
  const f = cellCand(0, 0);
  const mine = classifyCluster(f, [{ name: 'マイ収納', short: 450, long: 900 }], null, 1, true);
  assert.equal(mine.verdict, 'hit');
  assert.equal(mine.mine, true);
  assert.deepEqual(classifyCluster(f, [], null, 1, false), classifyCluster(f, []));
});

/* 抽出強化ステップ1（2026-11-22、~/workspace/kaku/work/extstep1/）：物ではない物の除外。
 * 期待値は EXTRACTION_STEP1_TRIAL.md の実測そのもの：解消した非対象の代表例では該当になり、
 * 緩い素の四角が誤射した実物7件＋過大取り込みの洗面台1件では該当にならないこと。
 * 特徴量は trial の data.json の実測値（寸法mm・線数・円弧率・仕切り線・箱内の文字） */
import { nonObjectFlags, nonObjectSignature, titleRegionFlags } from '../js/symdict.js';

const exCand = (w, h, feats = {}) => ({ b: [0, 0, w / 1000, h / 1000], short: Math.min(w, h), long: Math.max(w, h), arcShare: 0, closed: true, dividers: 0, n: 4, ...feats });

test('除外B1″：仕上表セル型の素の四角（450×900・線6本）は該当になる', () => {
  assert.deepEqual(nonObjectFlags([exCand(450, 900, { n: 6 })], []), [true]);
  assert.deepEqual(nonObjectFlags([exCand(450, 900, { n: 4 })], []), [true]);
  assert.equal(nonObjectSignature({ n: 6, arcShare: 0, dividers: 0 },
    { short: 450, long: 900, aspect: 2, textsIn: 0, numTextIn: 0, numTextNear: 0, matIn: 0, edgeNeighbours: 0 }), 'bare2');
});

test('除外B3″：柱状の単独四角（347×385・円弧0.07）は bare2 でなく column で該当になる', () => {
  const f = exCand(347, 385, { n: 6, arcShare: 0.07 });
  assert.deepEqual(nonObjectFlags([f], []), [true]);
  assert.equal(nonObjectSignature(f,
    { short: 347, long: 385, aspect: 385 / 347, textsIn: 0, numTextIn: 0, numTextNear: 0, matIn: 0, edgeNeighbours: 0 }), 'column');
});

test('除外B2″：寸法線（986×6490・数字文字を内包／300×5171・数字文字が近傍）は該当になる', () => {
  const f1 = exCand(986, 6490, { n: 9, dividers: 14 });
  assert.deepEqual(nonObjectFlags([f1], [{ t: '6,350', x: 0.5, y: 3 }]), [true]);
  const f2 = exCand(300, 5171, { n: 5 });
  assert.deepEqual(nonObjectFlags([f2], [{ t: '1,200', x: 0.15, y: 5.35 }]), [true]);
  /* 数字文字が無ければ寸法線とはしない */
  assert.deepEqual(nonObjectFlags([exCand(300, 5171, { n: 5 })], []), [false]);
});

test('除外B8：仕上げ文字を2件以上含む表セル（955×2382）は該当になる', () => {
  const f = exCand(955, 2382, { n: 4 });
  const texts = [{ t: '壁：ｸﾛｽ', x: 0.4, y: 0.6 }, { t: '床：長尺', x: 0.4, y: 1.2 }, { t: '天井：ｸﾛｽ', x: 0.4, y: 1.8 }];
  assert.deepEqual(nonObjectFlags([f], texts), [true]);
  assert.equal(nonObjectSignature(f,
    { short: 955, long: 2382, aspect: 2382 / 955, textsIn: 3, numTextIn: 0, numTextNear: 0, matIn: 3, edgeNeighbours: 0 }), 'finish');
});

test('除外B11：文字の多い細長い柱（1200×6965・箱内文字5件）は該当になる', () => {
  const f = exCand(1200, 6965, { n: 6 });
  const texts = ['（W1600）', '2', '席', '役職席', '16'].map((t, i) => ({ t, x: 0.6, y: 0.8 + i * 1.2 }));
  assert.deepEqual(nonObjectFlags([f], texts), [true]);
});

test('除外の誤射防止：受付カウンター（1200×2567・線5本）は緩い素の四角には当たるが除外には当たらない', () => {
  const f = exCand(1200, 2567, { n: 5 });
  assert.deepEqual(bareClusterFlags([f], []), [true]); /* 弱体化（類似に落とす）では当たる */
  assert.deepEqual(nonObjectFlags([f], []), [false]); /* 除外では長辺≤2000mm が守る */
});

test('除外の誤射防止：人物ピクト付き机（695×784・仕切り線99／671×737・仕切り線78）は当たらない', () => {
  assert.deepEqual(nonObjectFlags([exCand(695, 784, { n: 4, dividers: 99 })], []), [false]);
  assert.deepEqual(nonObjectFlags([exCand(671, 737, { n: 4, dividers: 78 })], []), [false]);
});

test('除外の誤射防止：303mm角の金物（303×303・仕切り線2）は当たらない', () => {
  const f = exCand(303, 303, { n: 6, dividers: 2 });
  assert.deepEqual(nonObjectFlags([f], []), [false]); /* B1″は仕切り線=0、B3″は短辺≥320mm が守る */
});

test('除外の誤射防止：過大取り込みの洗面台（1180×2982・円弧0.01）は当たらない', () => {
  assert.deepEqual(nonObjectFlags([exCand(1180, 2982, { n: 5, arcShare: 0.01 })], []), [false]);
});

test('除外B1″：辺を接する隣（家具同士・器具の箱）は隣接として数え、該当にならない', () => {
  const a = exCand(450, 900, { n: 6 });
  const b = { ...exCand(450, 900, { n: 6 }), b: [0.45, 0, 0.9, 0.9] };
  assert.deepEqual(nonObjectFlags([a, b], [], [a.b, b.b]), [false, false]);
  const fxBox = [0.45, 0, 1.0, 0.9]; /* 器具の箱が横に接している場合も隣として数える */
  assert.deepEqual(nonObjectFlags([a], [], [a.b, fxBox]), [false]);
  assert.deepEqual(nonObjectFlags([a], [], [a.b]), [true]);
});

test('層A：表題欄の領域内にある器具（ロゴ型）は該当になる', () => {
  const regions = [{ type: 'title', box: [-1, -1, 3, 3] }, { type: 'frame', box: [-2, -2, 9, 9] }];
  assert.deepEqual(titleRegionFlags([[0, 0, 0.678, 1.377]], regions, [], {}), [true]);
  assert.deepEqual(titleRegionFlags([[5, 5, 5.5, 6]], regions, [], {}), [false]);
});

test('層A：中心を含む区画のマークが out（title）の器具は該当、hold では該当にならない', () => {
  const faces = [{ i: 7, poly: [[-1, -1], [3, -1], [3, 3], [-1, 3]] }];
  assert.deepEqual(titleRegionFlags([[0, 0, 0.5, 0.5]], [], faces, { 7: { s: 'out', type: 'title' } }), [true]);
  assert.deepEqual(titleRegionFlags([[0, 0, 0.5, 0.5]], [], faces, { 7: { s: 'hold', type: 'title' } }), [false]);
  assert.deepEqual(titleRegionFlags([[0, 0, 0.5, 0.5]], [], [], {}), [false]);
});

test('流し台（長大・奥行600級）の署名：600×3600 の箱はキッチン・洗濯設備に当たる（実測値）', () => {
  /* sample1-F0（真値 ステンレス流し台・利用者確認済み）。ボウルが描かれない
   * 略図なので、寸法だけの署名で拾う。器具表示では上限ルールで類似どまり */
  const r = classifyBox([0, 0, 0.6, 3.6], []);
  assert.equal(r.verdict, 'hit');
  assert.equal(r.category, 'キッチン・洗濯設備');
  const d = classifyFixtureDisplay([0, 0, 0.6, 3.6], [], 1, null);
  assert.equal(d.verdict, 'near');
  assert.equal(d.category, 'キッチン・洗濯設備');
  assert.equal(d.capped, true);
});

test('流し台の署名は scope=dims：線の特徴が分かる候補（クラスタ）には当てない', () => {
  /* sample3 の長大な帯状クラスタ（660×3385・弧率0.01）が机から流し台に
   * 化けないための限定。scorePattern が arcShare のある入力では null を返す */
  const p = SYM_DICT.find(e => e.category === 'キッチン・洗濯設備').patterns.find(x => x.scope === 'dims');
  assert.ok(p, 'scope=dims のパターンがあること');
  assert.equal(scorePattern(p, { short: 660, long: 3385, arcShare: 0.01, closed: true, innerClosed: null, dividers: 99 }), null);
  assert.ok(scorePattern(p, { short: 600, long: 3600, arcShare: null, closed: null, innerClosed: null, dividers: null }) >= 0.9);
  const c = classifyCluster({ short: 660, long: 3385, arcShare: 0.01, closed: true, dividers: 99, n: 10 }, []);
  assert.notEqual(c.category, 'キッチン・洗濯設備');
});

test('小便器（内側鉢あり）の署名は innerClosed が無い・false の入力では発火しない', () => {
  /* needs_features と inner_closed の約束：器具の箱（寸法だけ）では当てず、
   * 内側の鉢が閉じている形（classifyFixtureShape の証拠分岐）でのみ効く */
  const p = SYM_DICT.find(e => e.category === '小便器').patterns.find(x => (x.needs_features || []).includes('innerClosed') && x.primitives && x.primitives.inner_closed === true);
  assert.ok(p, '内側閉形を必須とする小便器パターンがあること');
  assert.equal(scorePattern(p, { short: 370, long: 503, arcShare: 0.63, closed: true, innerClosed: null, dividers: 0 }), null);
  assert.equal(scorePattern(p, { short: 370, long: 503, arcShare: 0.63, closed: true, innerClosed: false, dividers: 0 }), null);
  assert.ok(scorePattern(p, { short: 370, long: 503, arcShare: 0.63, closed: true, innerClosed: true, dividers: 0 }) >= 0.9);
});
