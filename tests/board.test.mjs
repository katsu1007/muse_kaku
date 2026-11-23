/* 根拠ボード（js/board.js）：図面＋拾い結果＋部屋ごとの根拠を1枚にする書類。
 * 組み立ては純粋な関数だけを確かめる（案件データを変えないことも含む） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { boardPlanSvg, boardRoomRows, boardHtml } from '../js/board.js';

/* 四角い部屋1つ（4m×3m）の図面もどき */
const plan = {
  segs: [[0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 0, 3], [0, 3, 0, 0]],
  dsegs: [],
  faces: [{ i: 0, no: 1, area: 12, cx: 2, cy: 1.5, poly: [[0, 0], [4, 0], [4, 3], [0, 3]] }],
};
const proj = () => ({
  name: 'テスト工事', customer: 'テスト', overheadPct: 0, profitPct: 0, discount: 0, taxRate: 10,
  rooms: [{ id: 'r1', name: '便所', src: 'plan', faces: [0], color: 0, shape: 'free', area: 12, perim: 14, h: 2.5, qty: 1 }],
  lines: [{ id: 'l1', name: '床仕上げ', spec: '', unit: '㎡', kind: 'mat', price: 1000, qty: '', basis: { measure: 'floor', rooms: ['r1'] } },
          { id: 'l2', name: '手で入れた行', spec: '', unit: '式', kind: 'labor', price: 5000, qty: 2 }],
  drawing: { plan },
});
const finOf = () => ({ fF: 'フローリング', wF: '', cF: '天井クロス', bF: '' });

test('図面のSVG：実線・部屋の色と名前・ゾーン・辞書の印が入る', () => {
  const svg = boardPlanSvg(plan,
    [{ name: '便所', color: 0, faces: [0], floor: 12 }],
    [{ poly: [[0, 0], [4, 0], [4, 3], [0, 3]], color: '#f2789f', op: 0.15 }, { label: '候補A', lx: 2, ly: 1, color: '#f2789f' }],
    [{ b: [1, 1, 1.5, 1.6], color: '#3ccf8e', label: '大便器', sub: '便器', v: 'hit' }]);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('M0 0L4 0'));            // 実線（y反転：y=0 の辺）
  assert.ok(svg.includes('M4 -3L0 -3'));          // y=3 の辺は -3 になる
  assert.ok(svg.includes('便所') && svg.includes('12㎡'));
  assert.ok(svg.includes('候補A'));
  assert.ok(svg.includes('大便器') && svg.includes('便器'));
  assert.equal(boardPlanSvg(null), '');           // 図面が無ければ空
  assert.equal(boardPlanSvg({ segs: [], faces: [] }), '');
});

test('部屋の行：面積・仕上げ・数量の根拠（部屋から出す行だけ）', () => {
  const p = proj();
  const rows = boardRoomRows(p, {}, finOf);
  assert.equal(rows.length, 1);
  const r = rows[0];
  assert.equal(r.name, '便所');
  assert.equal(r.floor, 12);
  assert.equal(r.fin.floor, 'フローリング');
  assert.equal(r.fin.wall, '');
  assert.deepEqual(r.basis, ['床仕上げ：12㎡']);   // 手で入れた行は部屋に分けない
});

test('ボード全体：合計（税込）と部屋表が入り、案件データは変わらない', () => {
  const p = proj();
  const before = JSON.stringify(p);
  const html = boardHtml(p, {}, { finOf, syms: [{ b: [1, 1, 1.5, 1.6], color: '#3ccf8e', label: '大便器', sub: '便器', v: 'hit' }], zones: [], fixCounts: [{ name: '便器', n: 1 }] });
  assert.ok(html.includes('根拠ボード'));
  assert.ok(html.includes('¥25,520'));             // (12,000 + 10,000) × 1.1
  assert.ok(html.includes('便所'));
  assert.ok(html.includes('フローリング'));
  assert.ok(html.includes('床仕上げ：12㎡'));
  assert.ok(html.includes('検出 1'));
  assert.equal(JSON.stringify(p), before);        // 読むだけ（書類で案件は変わらない）
});

test('図面が無い案件：図面の節は省き、部屋と金額は出す', () => {
  const p = proj(); p.drawing = null;
  const html = boardHtml(p, {}, { finOf });
  assert.ok(html.includes('図面は読み込まれていません'));
  assert.ok(html.includes('¥25,520'));
  assert.ok(!html.includes('<svg'));
});

test('部屋が無い案件：表は空の知らせになる', () => {
  const html = boardHtml({ name: '空', rooms: [], lines: [] }, {}, {});
  assert.ok(html.includes('部屋がまだありません'));
});
