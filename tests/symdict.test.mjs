/* シンボル辞書のテスト。実行：node --test tests/
 * 期待値は実測した図形の特徴（CC0の小便器・実図面で同定したロッカー等）から決めた。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySymbol, SYM_THRESHOLD } from '../js/symdict.js';

test('しきい値は 0.90', () => { assert.equal(SYM_THRESHOLD, 0.90); });

test('CC0小便器の実測特徴（450×500・円弧0.67）は小便器', () => {
  const r = classifySymbol({ short: 450, long: 500, arcShare: 0.67, closed: true, innerClosed: false, dividers: null });
  assert.equal(r.result, '小便器');
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
