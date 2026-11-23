/* 自社の「標準の仕上げ」（js/finpreset.js）：保存・読み直し・初期値の重ね合わせを確かめる。
 * いちばん大事なのは「標準が無い時は今までと完全に同じ」と「今入っている仕上げを上書きしない」。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_KEY, SLOT_KEYS, cleanFin, isEmptyFin, loadPreset, savePreset, clearPreset, presetFinFor, mergeInitial, describePreset } from '../js/finpreset.js';
import fs from 'node:fs';

/* localStorage の代わり */
const fakeStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const ITEMS = [{ id: 'fl-a', name: '床A' }, { id: 'wl-a', name: '壁A', spec: 'クロス' }, { id: 'ce-a', name: '天井A' }];

test('枠の並びは roomfin の SLOTS と同じ（roomfin は画面込みなのでソースで照合）', () => {
  const src = fs.readFileSync(new URL('../js/roomfin.js', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('export const SLOTS'), src.indexOf('];', src.indexOf('export const SLOTS')));
  assert.deepEqual([...block.matchAll(/k: '([a-zA-Z0-9]+)'/g)].map(m => m[1]), SLOT_KEYS);
});

test('cleanFin：知らない枠・空・文字列でない値は捨てる', () => {
  assert.deepEqual(cleanFin({ fF: 'fl-a', zz: 'x', wF: '', cF: 3, bF: null }), { fF: 'fl-a' });
  assert.deepEqual(cleanFin(null), {});
  assert.deepEqual(cleanFin('x'), {});
  assert.equal(isEmptyFin({ fF: '' }), true);
  assert.equal(isEmptyFin({ fF: 'fl-a' }), false);
});

test('保存→読み直し：往復で同じ。壊れた中身・空の保存は null/false', () => {
  const st = fakeStore();
  assert.equal(loadPreset(st), null);                       // 何も無い時（＝今まで通り）
  assert.equal(savePreset({ fF: '' }, st), false);          // 空は覚えない
  assert.equal(loadPreset(st), null);
  assert.equal(savePreset({ fF: 'fl-a', wF: 'wl-a', bad: 'x' }, st), true);
  const p = loadPreset(st);
  assert.deepEqual(p.fin, { fF: 'fl-a', wF: 'wl-a' });
  assert.ok(p.savedAt > 0);
  st.setItem(PRESET_KEY, '{壊れた');
  assert.equal(loadPreset(st), null);
  st.setItem(PRESET_KEY, JSON.stringify({ fin: { zz: 'x' } }));
  assert.equal(loadPreset(st), null);                       // 有効な枠が1つも無い物は標準として扱わない
});

test('消す：消した後は null（＝今まで通り）', () => {
  const st = fakeStore();
  savePreset({ fF: 'fl-a' }, st);
  clearPreset(st);
  assert.equal(loadPreset(st), null);
});

test('presetFinFor：マスターに無い品目は入れない', () => {
  const preset = { fin: { fF: 'fl-a', wF: '消えた品目', cF: 'ce-a' }, savedAt: 1 };
  assert.deepEqual(presetFinFor(preset, ITEMS), { fF: 'fl-a', cF: 'ce-a' });
  assert.equal(presetFinFor(null, ITEMS), null);
  assert.equal(presetFinFor({ fin: { wF: '無い' } }, ITEMS), null);
});

test('mergeInitial：空の枠だけ埋める。今入っている物は絶対に上書きしない', () => {
  const cur = { fF: 'fl-a', wF: '', cF: 'ce-a' };
  assert.deepEqual(mergeInitial(cur, { fF: '別の床', wF: 'wl-a', bF: '巾木id' }), { fF: 'fl-a', wF: 'wl-a', cF: 'ce-a', bF: '巾木id' });
  assert.deepEqual(cur, { fF: 'fl-a', wF: '', cF: 'ce-a' });   // 元は変えない
  assert.deepEqual(mergeInitial(cur, null), cur);              // 標準が無い時はそのまま（今まで通り）
  assert.deepEqual(mergeInitial({}, null), {});
});

test('describePreset：枠の名前と品目名で見せる', () => {
  const rows = describePreset({ fin: { fF: 'fl-a', wF: 'wl-a' } }, ITEMS);
  assert.deepEqual(rows, [
    { slot: 'fF', label: '床・仕上げ', name: '床A' },
    { slot: 'wF', label: '壁・仕上げ', name: '壁A クロス' }
  ]);
  assert.deepEqual(describePreset(null, ITEMS), []);
});
