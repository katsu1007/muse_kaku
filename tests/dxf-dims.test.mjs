/* DXF の寸法（DIMENSION）を別に拾う部品のテスト。エンジンは寸法を素通りするので、
 * 実測値（42）・定義点からの計算・表示文字・拾う範囲（ENTITIES だけ）を確かめる */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDxfDims, checkDimensions, dimCheckFor } from '../js/dxf-dims.js';

/* コードと値の組から DXF 文字列を作る */
const build = pairs => pairs.map(([c, v]) => `${c}\n${v}`).join('\n') + '\n';
const header = (units = 4) => [[0, 'SECTION'], [2, 'HEADER'], [9, '$INSUNITS'], [70, units], [0, 'ENDSEC']];
const section = (name, ents) => [[0, 'SECTION'], [2, name], ...ents.flat(), [0, 'ENDSEC']];
const dim = g => [[0, 'DIMENSION'], ...Object.entries(g).map(([c, v]) => [+c, v])];
const dxfOf = (ents, units) => build([...header(units), ...section('ENTITIES', ents), [0, 'EOF']]);

/* 線形寸法の基本形：定義点・原点2つ・文字位置 */
const LINEAR = { 2: '*D1', 10: 500, 20: 600, 11: 123.4, 21: 567.8, 70: 32, 1: '', 13: 0, 23: 0, 14: 3000, 24: 0, 50: 0 };

test('実測値（42）があればそれを使い、表示文字の上書きと文字位置を返す', () => {
  const dims = extractDxfDims(dxfOf([dim({ ...LINEAR, 42: 1500.5, 1: '1500' })]));
  assert.equal(dims.length, 1);
  assert.deepEqual(dims[0], { type: 'linear', value: 1500.5, text: '1500', x: 123.4, y: 567.8, p1: { x: 0, y: 0 }, p2: { x: 3000, y: 0 }, angle: 0 });
});

test('定義点（13/23・14/24）と角度（50）も返す。無い時は p1/p2 が null、angle が undefined', () => {
  const dims = extractDxfDims(dxfOf([dim({ 2: '*D1', 10: 0, 20: 0, 11: 0, 21: 0, 70: 32, 1: '', 42: 1000 })]));
  assert.equal(dims[0].p1, null);
  assert.equal(dims[0].p2, null);
  assert.equal(dims[0].angle, undefined);
});

test('42 が -1（未記録）なら定義点から求める：寸法線方向への射影', () => {
  const dims = extractDxfDims(dxfOf([dim({ ...LINEAR, 42: -1 })]));
  assert.equal(dims[0].value, 3000); /* 原点 (0,0)→(3000,0)、角度 0 */
  assert.equal(dims[0].text, '3000'); /* 上書きが無ければ実測値から作る */
});

test('42 が無くても定義点から求める：角度 90 の線形寸法', () => {
  const dims = extractDxfDims(dxfOf([dim({ ...LINEAR, 14: 0, 24: 2500, 50: 90 })]));
  assert.equal(dims[0].value, 2500);
});

test('平行寸法は2原点の距離', () => {
  const dims = extractDxfDims(dxfOf([dim({ ...LINEAR, 70: 33, 14: 3000, 24: 4000 })]));
  assert.equal(dims[0].type, 'aligned');
  assert.equal(dims[0].value, 5000);
});

test('半径は中心→定義点、直径はその2倍。表示文字に R / ⌀ が付く', () => {
  const base = { 10: 1000, 20: 1000, 11: 1300, 21: 1100, 1: '', 15: 1600, 25: 1000 };
  const r = extractDxfDims(dxfOf([dim({ ...base, 70: 36 })]));
  assert.equal(r[0].type, 'radius');
  assert.equal(r[0].value, 600);
  assert.equal(r[0].text, 'R600');
  const d = extractDxfDims(dxfOf([dim({ ...base, 70: 35 })]));
  assert.equal(d[0].type, 'diameter');
  assert.equal(d[0].value, 1200);
  assert.equal(d[0].text, '⌀1200');
});

test('角度寸法の 42 は度そのまま（単位換算しない）', () => {
  const dims = extractDxfDims(dxfOf([dim({ ...LINEAR, 70: 34, 42: 45.25 })]));
  assert.equal(dims[0].type, 'angular');
  assert.equal(dims[0].value, 45.25);
  assert.equal(dims[0].text, '45.25°');
});

test('単位が cm（$INSUNITS=5）なら mm に換算する', () => {
  const dims = extractDxfDims(dxfOf([dim({ ...LINEAR, 42: 150.05, 1: '' })], 5));
  assert.equal(dims[0].value, 1500.5);
});

test('ブロック定義の中の寸法は拾わない（ENTITIES の寸法だけ）', () => {
  const text = build([
    ...header(),
    ...section('BLOCKS', [[[0, 'BLOCK'], [2, '*D9']], dim({ ...LINEAR, 42: 999 }), [[0, 'ENDBLK']]]),
    ...section('ENTITIES', [dim({ ...LINEAR, 42: 100 })]),
    [0, 'EOF'],
  ]);
  const dims = extractDxfDims(text);
  assert.equal(dims.length, 1);
  assert.equal(dims[0].value, 100);
});

test('表示文字の <> は実測値に置き換わる', () => {
  const dims = extractDxfDims(dxfOf([dim({ ...LINEAR, 42: 800, 1: '約<>mm' })]));
  assert.equal(dims[0].text, '約800mm');
});

test('ArrayBuffer でも文字列でも同じ結果（バイト列は UTF-8→Shift_JIS の順で読む）', () => {
  const s = dxfOf([dim({ ...LINEAR, 42: 1500.5, 1: '1500' })]);
  const buf = new TextEncoder().encode(s);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  assert.deepEqual(extractDxfDims(ab), extractDxfDims(s));
});

test('寸法が無い・読めない入力は []', () => {
  assert.deepEqual(extractDxfDims(''), []);
  assert.deepEqual(extractDxfDims(dxfOf([[[0, 'LINE'], [10, 0], [20, 0], [11, 100], [21, 100]]])), []);
});

/* ---- 寸法の答え合わせ（checkDimensions） ---- */

/* 原点 (0,0) から (x2,y2) への線形寸法。角度は寸法線の向きに合わせる */
const linDim = (x2, y2, g = {}) => dim({ 2: '*D1', 10: 0, 20: 0, 11: 0, 21: 0, 70: 32, 1: '', 13: 0, 23: 0, 14: x2, 24: y2, 50: 0, ...g });
/* 揃った3件：横1000（角度0）・縦2000（角度90）・斜め5000（平行寸法、角度なし） */
const consistentDxf = () => dxfOf([
  linDim(1000, 0, { 42: 1000 }),
  linDim(0, 2000, { 42: 2000, 50: 90 }),
  dim({ 2: '*D1', 10: 0, 20: 0, 11: 0, 21: 0, 70: 33, 1: '', 13: 0, 23: 0, 14: 3000, 24: 4000, 42: 5000 }),
]);

test('答え合わせ：揃った寸法は中央値が約1で、外れ値なし', () => {
  const chk = checkDimensions(extractDxfDims(consistentDxf()));
  assert.equal(chk.n, 3);
  assert.ok(Math.abs(chk.median - 1) < 1e-9);
  assert.deepEqual(chk.outliers, []);
  assert.deepEqual(chk.edited, []);
});

test('答え合わせ：一様に50倍の寸法は中央値が約50（用紙mmの疑い）', () => {
  const dims = extractDxfDims(dxfOf([
    linDim(1000, 0, { 42: 50000 }),
    linDim(0, 2000, { 42: 100000, 50: 90 }),
    linDim(500, 0, { 42: 25000 }),
  ]));
  const chk = checkDimensions(dims);
  assert.equal(chk.n, 3);
  assert.ok(Math.abs(chk.median - 50) < 1e-9);
  assert.deepEqual(chk.outliers, []); /* 全部が同じ倍率なら、外れ値ではなく全体の係数 */
});

test('答え合わせ：1件だけ比率が違う寸法は外れ値として挙がる', () => {
  const dims = extractDxfDims(dxfOf([
    linDim(1000, 0, { 42: 1000 }),
    linDim(0, 2000, { 42: 2000, 50: 90 }),
    linDim(500, 0, { 42: 500 }),
    linDim(1000, 0, { 42: 2000 }), /* これだけ2倍 */
  ]));
  const chk = checkDimensions(dims);
  assert.equal(chk.n, 4);
  assert.ok(Math.abs(chk.median - 1) < 1e-9);
  assert.equal(chk.outliers.length, 1);
  assert.equal(chk.outliers[0].value, 2000);
});

test('答え合わせ：表示文字が実測値と大きく違う寸法は「書き換え疑い」として挙がる', () => {
  const dims = extractDxfDims(dxfOf([
    linDim(1500, 0, { 42: 1500, 1: '2000' }), /* 文字だけ 2000 に書き換えられた */
    linDim(1500, 0, { 42: 1500.4, 1: '1500' }), /* 整数への丸め（差0.4）は正常 */
    linDim(800, 0, { 42: 800 }), /* 文字は実測値から自動生成 */
  ]));
  const chk = checkDimensions(dims);
  assert.equal(chk.edited.length, 1);
  assert.equal(chk.edited[0].text, '2000');
  assert.deepEqual(chk.outliers, []); /* 比率はどれも1 */
});

test('答え合わせ：定義点の無い寸法は件数に入らない', () => {
  const noPt = dim({ 2: '*D1', 10: 0, 20: 0, 11: 0, 21: 0, 70: 32, 1: '1000', 42: 1000 });
  const only = checkDimensions(extractDxfDims(dxfOf([noPt])));
  assert.equal(only.n, 0);
  assert.equal(only.median, null);
  const mixed = checkDimensions(extractDxfDims(dxfOf([noPt, linDim(1000, 0, { 42: 1000 })])));
  assert.equal(mixed.n, 1);
  assert.ok(Math.abs(mixed.median - 1) < 1e-9);
});

test('答え合わせ：寸法が無ければ n=0・median=null', () => {
  assert.deepEqual(checkDimensions([]), { n: 0, median: null, outliers: [], edited: [] });
});

/* アプリの流れの回帰：読み込みは ArrayBuffer を渡し、図面の覚え書きは { dims, dimCheck } で持つ。
 * 更新直後の画面など読み込み側の版が古いままだと、寸法は新しい形で残っても dimCheck だけ
 * 付かないことがあった（実機で確認行が出なかった不具合）。表示の時に作り直せることを確かめる */
const toArrayBuffer = s => { const u = new TextEncoder().encode(s); return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); };

test('流れ：dimCheck の無い図面でも、ArrayBuffer から拾った寸法で答え合わせを作り直せる', () => {
  const dims = extractDxfDims(toArrayBuffer(consistentDxf())); /* アプリと同じ ArrayBuffer 入力 */
  const drawing = { dims }; /* 読み込みで dimCheck を付け損ねた図面の形 */
  const chk = dimCheckFor(drawing);
  assert.ok(chk);
  assert.equal(chk.n, 3);
  assert.ok(Math.abs(chk.median - 1) < 1e-9);
  assert.equal(drawing.dimCheck, chk); /* 作り直したら覚える */
  assert.equal(dimCheckFor(drawing), chk); /* 2回目は覚えた物をそのまま返す */
});

test('流れ：dimCheck が既にある図面は、そのまま返す（作り直さない）', () => {
  const preset = { n: 9, median: 50, outliers: [], edited: [] };
  const drawing = { dims: extractDxfDims(consistentDxf()), dimCheck: preset };
  assert.equal(dimCheckFor(drawing), preset);
});

test('流れ：定義点の無い寸法（.28 以前の形）からは作り直さない（読み直しが必要）', () => {
  const drawing = { dims: [{ type: 'linear', value: 1000, text: '1000', x: 0, y: 0 }] };
  assert.equal(dimCheckFor(drawing), null);
  assert.equal(drawing.dimCheck, undefined);
  assert.equal(dimCheckFor(null), null);
  assert.equal(dimCheckFor({ dims: [] }), null);
});
