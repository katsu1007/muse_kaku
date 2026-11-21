/* DXF の文字つなぎ（js/textstitch.js）のテスト。実行：node --test tests/
 * 座標は m。実図面（日本モウルド）の実測：部屋名・表題欄は1文字ずつ、進み幅 0.35m で並ぶ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { stitchTexts, normalizeStitchText } from '../js/textstitch.js';

/* 1文字ずつ等間隔に並べる（実図面の描かれ方） */
const row = (s, x0 = 0, y = 0, pitch = 0.35) => [...s].map((c, i) => ({ t: c, x: x0 + i * pitch, y }));
const col = (s, x = 0, y0 = 10, pitch = 0.35) => [...s].map((c, i) => ({ t: c, x, y: y0 - i * pitch }));
const stitched = r => r.texts.filter(t => t.src === 'stitched');

test('横書き：1文字ずつの部屋名が1つの言葉になる', () => {
  const r = stitchTexts(row('会議室A', 4.8, 123.8));
  assert.equal(r.joined, 1); assert.equal(r.parts, 4);
  const w = stitched(r)[0];
  assert.equal(w.t, '会議室A'); assert.equal(w.from, 4);
  assert.equal(w.x, 4.8); assert.equal(w.y, 123.8);   // 置き場所は最初の文字の位置
});

test('横書き：空白で区切られた表題欄の名前も、空きマスを越えて1つになる', () => {
  /* 実図面の工事名称：株式会社と本社工場の間は空白のマス（アプリ経路では文字が落ちて2マス分の間隔） */
  const pieces = [...row('日本モウルド工業株式会社', 29.34, 107.84), ...row('本社工場', 33.89, 107.84), ...row('事務所棟', 35.64, 107.84)];
  const r = stitchTexts(pieces);
  assert.equal(stitched(r).length, 1);
  assert.equal(stitched(r)[0].t, '日本モウルド工業株式会社本社工場事務所棟');
  assert.equal(stitched(r)[0].from, 20);
});

test('縦書き：上から下へつながる', () => {
  const r = stitchTexts(col('階段室', 5, 10, 0.4));
  assert.equal(stitched(r).length, 1);
  assert.equal(stitched(r)[0].t, '階段室');
  assert.equal(stitched(r)[0].y, 10);
});

test('縦書き：進み幅が大きい字（0.65）もつながる', () => {
  const r = stitchTexts(col('水冷', 64.287, 93.015, 0.65));
  assert.equal(stitched(r).length, 1);
  assert.equal(stitched(r)[0].t, '水冷');
});

test('つながない：寸法の数字どうし（同じ行に別々の数字）', () => {
  const r = stitchTexts([{ t: '4', x: 0, y: 0 }, { t: '3', x: 0.35, y: 0 }, { t: '7', x: 0.7, y: 0 }, { t: '7', x: 1.05, y: 0 }]);
  assert.equal(r.joined, 0);
});

test('つながない：すでに言葉になっている文字には触らない（寸法・日付・CH）', () => {
  const whole = [{ t: '1/100', x: 0, y: 0 }, { t: '2026/09/16', x: 2, y: 0 }, { t: 'CH=2989', x: 5, y: 0 }, { t: '4,377', x: 8, y: 0 }];
  const r = stitchTexts(whole);
  assert.equal(r.joined, 0);
  assert.deepEqual(r.texts.map(t => t.t), ['1/100', '2026/09/16', 'CH=2989', '4,377']);
});

test('つながない：大きさ（進み幅の単位）が途中で変わる並び', () => {
  /* 0.35 の並びの後ろに 0.5 間隔の文字が来ても、同じ言葉にしない（空きマスとも読まない） */
  const pieces = [...row('会議室', 0, 0, 0.35), { t: 'B', x: 0.7 + 0.5, y: 0 }];
  const r = stitchTexts(pieces);
  assert.equal(stitched(r).length, 1);
  assert.equal(stitched(r)[0].t, '会議室');
  assert.ok(r.texts.some(t => t.t === 'B' && !t.src));
});

test('つながない：向き（行）が変わる所で切れる', () => {
  const pieces = [...row('会議', 0, 0), { t: '室', x: 0.7, y: 0.5 }];
  const r = stitchTexts(pieces);
  assert.deepEqual(stitched(r).map(t => t.t), ['会議']);
  assert.ok(r.texts.some(t => t.t === '室' && !t.src));
});

test('つながない：間隔が広すぎる並び（別の言葉どうし）', () => {
  const pieces = [...row('会議室', 0, 0), ...row('事務室', 3.5, 0)];
  const r = stitchTexts(pieces);
  assert.deepEqual(stitched(r).map(t => t.t).sort(), ['事務室', '会議室']);
});

test('つながない：2文字の独立した札（AC）と、言葉の頭が並んだだけの物', () => {
  /* 実図面の事故例：「AC」（エアコンの札）の隣に試作品室があり、「AC試」と「作品室」に化けた */
  const pieces = [{ t: 'AC', x: 10.496, y: 116.979 }, ...row('試作品室', 11.963, 116.935)];
  const r = stitchTexts(pieces);
  assert.deepEqual(stitched(r).map(t => t.t), ['試作品室']);
  assert.ok(r.texts.some(t => t.t === 'AC' && !t.src));
});

test('つながない：数字の断片と英字だけの断片（表の隣の欄どうし）', () => {
  const r = stitchTexts([{ t: '0', x: 0, y: 0 }, { t: 'fm', x: 0.22, y: 0 }]);
  assert.equal(r.joined, 0);
});

test('括弧の前後は進み幅が狭くてもつながる（実図面の図面名称）', () => {
  /* 実測の座標（括弧の次だけ間隔が 0.25、他は 0.40） */
  const xs = [29.208, 29.608, 30.008, 30.408, 30.808, 31.208, 31.458, 31.858, 32.258, 32.658, 33.058, 33.458];
  const pieces = [...'1階平面図(改修プラン)'].map((c, i) => ({ t: c, x: xs[i], y: 76.213 }));
  const r = stitchTexts(pieces);
  assert.equal(stitched(r).length, 1);
  assert.equal(stitched(r)[0].t, '1階平面図(改修プラン)');
});

test('元の並びは壊さない（入力の配列・オブジェクトを変更しない）', () => {
  const input = row('会議室A', 1, 2);
  const snapshot = JSON.stringify(input);
  const r = stitchTexts(input);
  assert.equal(JSON.stringify(input), snapshot);
  assert.notEqual(r.texts, input);
});

test('正規化：全角の英数字は半角に、\\U+XXXX は元の字に戻る', () => {
  assert.equal(normalizeStitchText('１２３Ａ'), '123A');
  assert.equal(normalizeStitchText('\\U+4F1A'), '会');
  const r = stitchTexts(row('会議室Ａ', 0, 0));
  assert.equal(stitched(r)[0].t, '会議室A');
});
