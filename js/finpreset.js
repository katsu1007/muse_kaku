/* 自社の「標準の仕上げ」（プリセット）：部屋の仕上げの枠ごとの品目idの組を端末内に1つだけ覚える。
 * 部屋を作った直後の仕上げ画面で「最初から入っている値」としてだけ使い、案件のデータには触らない。
 * 保存は localStorage（自分の辞書 muse-symdict-user と同じ流儀）。案件・バックアップには入れない。
 * ここは画面に触らない純粋な部品（tests/finpreset.test.mjs でテスト）。枠の並びは roomfin.js の SLOTS と同じ。 */
export const PRESET_KEY = 'muse-finpreset';
export const SLOT_KEYS = ['fD', 'fB', 'fF', 'wD', 'wD2', 'wB', 'wF', 'cD', 'cF', 'bF'];
export const SLOT_LABELS = { fD: '床・解体', fB: '床・下地', fF: '床・仕上げ', wD: '壁・解体', wD2: '壁・下の層も解体', wB: '壁・下地', wF: '壁・仕上げ', cD: '天井・解体', cF: '天井・仕上げ', bF: '巾木' };

/* 枠ごとの品目idだけを残す（知らない枠・空は捨てる）。fin は { 枠: 品目id } */
export function cleanFin(fin, slotKeys = SLOT_KEYS) {
  const o = {};
  if (!fin || typeof fin !== 'object') return o;
  slotKeys.forEach(k => { const v = fin[k]; if (typeof v === 'string' && v) o[k] = v; });
  return o;
}
export const isEmptyFin = fin => !Object.keys(cleanFin(fin)).length;

/* 保存の入れ物（テストでは差し替えられる）。localStorage が無い・使えない時は null */
function defStore() {
  try { return (typeof localStorage !== 'undefined' && localStorage) || null; } catch (e) { return null; }
}

/* 覚えている標準 { fin, savedAt } 。無い・壊れている時は null */
export function loadPreset(store = defStore()) {
  if (!store) return null;
  try {
    const raw = store.getItem(PRESET_KEY); if (!raw) return null;
    const o = JSON.parse(raw); if (!o || typeof o !== 'object') return null;
    const fin = cleanFin(o.fin); if (!Object.keys(fin).length) return null;
    return { fin, savedAt: o.savedAt || 0 };
  } catch (e) { return null; }
}
/* 標準として覚える。何も選ばれていない時は覚えず false */
export function savePreset(fin, store = defStore()) {
  const c = cleanFin(fin); if (!Object.keys(c).length || !store) return false;
  try { store.setItem(PRESET_KEY, JSON.stringify({ fin: c, savedAt: Date.now() })); return true; } catch (e) { return false; }
}
export function clearPreset(store = defStore()) {
  if (!store) return;
  try { store.removeItem(PRESET_KEY); } catch (e) { /* 消せなくても続ける */ }
}

/* 標準のうち、今の単価マスターにある品目だけを残す（自分で足した品目を消した後などに、無い品目を入れない）。
 * 標準が無い・残らない時は null */
export function presetFinFor(preset, items) {
  if (!preset) return null;
  const ids = new Set((items || []).map(i => i.id));
  const o = {};
  Object.entries(preset.fin || {}).forEach(([k, v]) => { if (ids.has(v)) o[k] = v; });
  return Object.keys(o).length ? o : null;
}

/* 初期値の重ね合わせ：今入っている枠は絶対に上書きせず、空の枠だけ標準で埋める */
export function mergeInitial(current, presetFin) {
  const o = { ...(current || {}) };
  if (!presetFin) return o;
  Object.entries(presetFin).forEach(([k, v]) => { if (!o[k]) o[k] = v; });
  return o;
}

/* 設定画面などで見せる用：[{ slot, label, name }]（品目名は items から引く。引けない時は品目id） */
export function describePreset(preset, items) {
  if (!preset) return [];
  const M = items || [];
  return SLOT_KEYS.filter(k => preset.fin[k]).map(k => {
    const it = M.find(i => i.id === preset.fin[k]);
    return { slot: k, label: SLOT_LABELS[k], name: it ? (it.spec ? `${it.name} ${it.spec}` : it.name) : preset.fin[k] };
  });
}
