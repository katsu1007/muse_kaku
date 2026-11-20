/* 器具のタイプ補正（js/typefix.js）のテスト。実行：node --test tests/
 * 各ルールに「発火する例」と「発火しない例」を置く。寸法は三井屋・大天・江南の
 * 実測（正しさの物差しの分析）から取った代表値。座標は m、箱は [x0,y0,x1,y1]。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { correctFixtureTypes, hasBathContext } from '../js/typefix.js';

const fx = (t, w, h, x = 0, y = 0, extra = {}) => ({ t, b: [x, y, x + w, y + h], ...extra });
const hit = category => ({ verdict: 'hit', category, score: 0.97 });
const near = category => ({ verdict: 'near', category, score: 0.96 });
const unk = { verdict: 'unknown', category: null, score: 0 };
const run = (fixtures, verdicts, opts = {}) => correctFixtureTypes(fixtures, { verdicts, texts: [], zoneNames: [], scale: 1, ...opts });

/* ===== ルール1 小便器の列 ===== */

test('小便器の列：便器 349×620 が横に3つ並ぶ → 小便器に補正', () => {
  const F = [fx('toilet', 0.349, 0.620, 0, 0), fx('toilet', 0.349, 0.620, 0.851, 0), fx('toilet', 0.349, 0.620, 1.702, 0)];
  const r = run(F, [unk, unk, unk]);
  assert.ok(r.every(x => x && x.shown === 'urinal' && x.rule === 'urinal-row' && !x.confirm));
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
  const r = run(F, [near('小便器'), near('小便器')]);
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

test('個室の便器：洗面台 640×790 がトイレの近くに繰り返される → 便器に補正', () => {
  const F = [fx('counter', 0.640, 0.790, 0, 0), fx('counter', 0.640, 0.790, 1.6, 0)];
  const r = run(F, [hit('キッチン・洗濯設備'), hit('キッチン・洗濯設備')], { texts: [{ t: '女子トイレ', c: [0.9, 1.8] }] });
  assert.ok(r.every(x => x && x.shown === 'toilet' && x.rule === 'booth-toilet'));
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

/* ===== ルール3 浴槽 ===== */

test('浴槽：洗面台 670×895 の近くに排水口 → 浴槽に補正', () => {
  const r = run([fx('counter', 0.670, 0.895)], [unk], { texts: [{ t: '排水口', c: [0.3, 1.0] }] });
  assert.equal(r[0].shown, 'bath');
  assert.equal(r[0].rule, 'bath-drain');
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

test('机は浴槽ではない：浴槽 812×1600 に辞書は机、浴室の文脈なし → 器具ではない', () => {
  const r = run([fx('bath', 0.812, 1.600)], [hit('机・デスク')]);
  assert.equal(r[0].shown, 'other');
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
  const r = run(F, [unk, unk]);
  assert.equal(r[0], null);
  assert.equal(r[1].shown, 'urinal');
});

test('倍率：座標が 0.75 倍の図面では、実寸に直してから帯を見る', () => {
  /* 測った値 262×465mm、倍率 0.75 → 実寸 349×620mm で小便器の列が発火する */
  const F = [fx('toilet', 0.262, 0.465, 0, 0), fx('toilet', 0.262, 0.465, 0.7, 0)];
  const r = run(F, [unk, unk], { scale: 0.75 });
  assert.ok(r.every(x => x && x.shown === 'urinal'));
});

test('浴室文脈：文字とゾーン名の両方を見る', () => {
  assert.equal(hasBathContext([{ t: '脱衣室' }], []), false);
  assert.equal(hasBathContext([{ t: '浴室' }], []), true);
  assert.equal(hasBathContext([], ['ユニットバス']), true);
  assert.equal(hasBathContext([], ['洗面所']), false);
});
