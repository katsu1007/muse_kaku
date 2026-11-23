/* 部屋の仕上げを決める（②部屋で区画を選んで部屋にした直後や、部屋のカードから開く）。
 * 床・壁・天井・巾木ごとに 解体／下地／仕上げ を1つずつ選ぶと、③工事の行に入る。
 * 同じ品目の行が既にあればその行の部屋にこの部屋を足す（行を増やさない）。違う品目に変えた時は、前の行からこの部屋を外す。 */
import { masterItems } from './app.js';
import { uid } from './store.js';
import { modal, esc, yen, toast } from './ui.js';
import { loadPreset, savePreset, clearPreset, presetFinFor, mergeInitial, isEmptyFin } from './finpreset.js';

export const SLOTS = [
  { k: 'fD', part: '床', role: '解体', measure: 'floor', cats: ['demoF'] },
  { k: 'fB', part: '床', role: '下地', measure: 'floor', cats: ['fbase', 'insul'] },
  { k: 'fF', part: '床', role: '仕上げ', measure: 'floor', cats: ['floor'] },
  { k: 'wD', part: '壁', role: '解体', measure: 'wall', cats: ['demoW'] },
  { k: 'wD2', part: '壁', role: '下の層も解体', measure: 'wall', cats: ['demoW'], layer: 2 },
  { k: 'wB', part: '壁', role: '下地', measure: 'wall', cats: ['board'] },
  { k: 'wF', part: '壁', role: '仕上げ', measure: 'wall', cats: ['wall'] },
  { k: 'cD', part: '天井', role: '解体', measure: 'ceil', cats: ['demoC'] },
  { k: 'cF', part: '天井', role: '仕上げ', measure: 'ceil', cats: ['ceil'] },
  { k: 'bF', part: '巾木', role: '', measure: 'base', cats: ['trim'] }
];
const inSlot = (l, s) => l.basis && l.basis.measure === s.measure && s.cats.includes(l.cat) && (l.layer || 1) === (s.layer || 1);
const hasRoom = (l, id) => l.basis.rooms === 'all' || (Array.isArray(l.basis.rooms) && l.basis.rooms.includes(id));

/* 今その部屋に入っている品目（枠ごと） */
export function currentFin(p, roomId) {
  const o = {};
  SLOTS.forEach(s => { const l = p.lines.find(l => inSlot(l, s) && hasRoom(l, roomId)); o[s.k] = l ? l.itemId || '' : ''; });
  return o;
}

/* 選んだ品目を入れる（rooms：部屋idの配列。fin：枠ごとの品目id、空ならその枠は外す） */
export function applyFin(p, rooms, fin) {
  const all = p.rooms.map(r => r.id), M = masterItems();
  SLOTS.forEach(s => {
    const want = fin[s.k] || '';
    p.lines.filter(l => inSlot(l, s)).forEach(l => {
      if (l.itemId === want) return;
      if (l.basis.rooms === 'all') { if (rooms.some(id => all.includes(id))) l.basis.rooms = all.filter(id => !rooms.includes(id)); }
      else l.basis.rooms = l.basis.rooms.filter(id => !rooms.includes(id));
    });
    if (want) {
      let l = p.lines.find(l => inSlot(l, s) && l.itemId === want);
      if (l) { if (l.basis.rooms !== 'all') l.basis.rooms = [...new Set([...l.basis.rooms, ...rooms])]; }
      else {
        const it = M.find(i => i.id === want); if (!it) return;
        p.lines.push({ id: uid('l'), itemId: it.id, name: it.name, spec: [it.spec, s.layer > 1 ? '（下の層）' : ''].filter(Boolean).join(' '), unit: it.unit, kind: it.kind || 'mat', price: it.price || '', cost: '', loss: '', sheet: it.sheet || 0, cat: it.cat, qty: '', basis: { measure: s.measure, rooms: [...rooms] }, ...(s.layer > 1 ? { layer: s.layer } : {}) });
      }
    }
  });
  /* 部屋が1つも無くなった枠の行は消す（この画面で作った・部屋を外しただけの行） */
  p.lines = p.lines.filter(l => !(SLOTS.some(s => inSlot(l, s)) && Array.isArray(l.basis.rooms) && !l.basis.rooms.length));
}

let lastFin = null;
export function openRoomFin(p, rooms, { title, onDone, usePreset } = {}) {
  const M = masterItems();
  /* 自社の標準の仕上げ（プリセット）：新しい部屋の時だけ、空の枠の初期値として入れる。今入っている物は上書きしない */
  const preset = loadPreset(), pFin = presetFinFor(preset, M);
  let first = currentFin(p, rooms[0]);
  let fromPreset = false;
  if (usePreset && pFin) { const before = first; first = mergeInitial(first, pFin); fromPreset = SLOTS.some(s => first[s.k] && !before[s.k]); }
  const opts = s => M.filter(i => s.cats.includes(i.cat) && i.measure === s.measure);
  const row = s => `<label class="f">${s.role || '品目'}<select class="in" data-slot="${s.k}"><option value="">${/解体/.test(s.role) ? '解体しない' : 'なし'}</option>${opts(s).map(i => `<option value="${esc(i.id)}" ${first[s.k] === i.id ? 'selected' : ''}>${esc(i.name)}${i.spec ? ' ' + esc(i.spec) : ''}（${yen(i.price)}/${esc(i.unit)}）</option>`).join('')}</select></label>`;
  const parts = ['床', '壁', '天井', '巾木'];
  const names = rooms.map(id => (p.rooms.find(r => r.id === id) || {}).name).filter(Boolean);
  const m = modal({
    title: title || '部屋の仕上げを決める', wide: true,
    body: `<p class="small muted" style="margin-top:0">${esc(names.slice(0, 4).join('・'))}${names.length > 4 ? ` ほか${names.length - 4}部屋` : ''}。選んだ物は③工事に入り、数量は部屋の面積・長さから自動で出ます。</p>
      ${lastFin ? `<button class="btn sm" data-same style="margin-bottom:8px">前の部屋と同じにする</button>` : ''}
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">${pFin ? `<button class="btn sm" data-preset-use>標準の仕上げを入れる</button>` : ''}<button class="btn sm" data-preset-save>${preset ? 'この仕上げで標準を上書き' : 'この仕上げを標準にする'}</button>${preset ? `<button class="btn sm ghost danger" data-preset-clear>標準を消す</button>` : ''}</div>
      ${fromPreset ? `<p class="small muted" style="margin-top:0">自社の「標準の仕上げ」を入れてあります。そのまま変えられます。</p>` : ''}
      ${parts.map(pt => `<div style="margin-bottom:10px"><b>${pt}</b><div class="grid g3" style="margin-top:4px">${SLOTS.filter(s => s.part === pt).map(row).join('')}</div></div>`).join('')}`,
    foot: `<button class="btn" data-later>あとで決める</button><button class="btn primary" data-ok>決定</button>`
  });
  const get = () => { const o = {}; m.el.querySelectorAll('[data-slot]').forEach(e => { o[e.dataset.slot] = e.value; }); return o; };
  const same = m.el.querySelector('[data-same]');
  if (same) same.onclick = () => { m.el.querySelectorAll('[data-slot]').forEach(e => { e.value = lastFin[e.dataset.slot] || ''; }); toast('前の部屋と同じにしました。決定で入ります'); };
  const pUse = m.el.querySelector('[data-preset-use]');
  if (pUse) pUse.onclick = () => { const f = presetFinFor(loadPreset(), M); if (!f) { toast('標準の仕上げがありません', { bad: true }); return; } m.el.querySelectorAll('[data-slot]').forEach(e => { e.value = f[e.dataset.slot] || ''; }); toast('標準の仕上げを入れました。決定で入ります'); };
  const pSave = m.el.querySelector('[data-preset-save]');
  if (pSave) pSave.onclick = () => {
    const fin = get();
    if (isEmptyFin(fin)) { toast('何も選ばれていないので、標準にはできません', { bad: true }); return; }
    if (savePreset(fin)) { toast('標準の仕上げにしました。次に部屋を作る時から、最初から入ります'); pSave.textContent = 'この仕上げで標準を上書き'; }
    else toast('標準を保存できませんでした', { bad: true });
  };
  const pClear = m.el.querySelector('[data-preset-clear]');
  if (pClear) pClear.onclick = () => { clearPreset(); toast('標準の仕上げを消しました'); pClear.remove(); if (pUse) pUse.remove(); pSave.textContent = 'この仕上げを標準にする'; };
  m.el.querySelector('[data-later]').onclick = () => m.close();
  m.el.querySelector('[data-ok]').onclick = () => {
    const fin = get(); lastFin = fin; applyFin(p, rooms, fin); m.el.remove();
    const n = Object.values(fin).filter(Boolean).length;
    toast(n ? `仕上げを ${n} つ決めました（③工事に入りました）` : '仕上げを外しました');
    onDone && onDone();
  };
}
