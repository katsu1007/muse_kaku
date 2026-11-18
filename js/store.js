/* 保存（IndexedDB）。失敗は必ず呼び出し元に投げる（黙って捨てない）。
 * projects：案件 1件1レコード ／ kv：設定・会社情報・単価マスターの変更など */
const DB_NAME = 'muse_kaku';
const DB_VER = 1;
export const DATA_VERSION = 1;
const OLD_KEY = 'muse-kaku-v1';

/* iPhoneアプリ（KAKU.ipa）の中で動いている時：保存のたびに全部をアプリのファイルにも書く（kakuDB）。
 * 起動の時にアプリが前回の中身を window.__kakuDB に入れてくれる。
 * IndexedDB が開けない時は、その中身を使って端末のメモリで動かし、書いた物はアプリのファイルに残す */
const NATIVE = typeof window !== 'undefined' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.kakuDB;
let mem = null;
function memDB() {
  const src = (typeof window !== 'undefined' && window.__kakuDB) || {};
  mem = { projects: new Map((src.projects || []).map(p => [p.id, p])), kv: new Map(Object.entries(src.kv || {})) };
  return mem;
}
let mirrorT = null;
function mirror() {
  if (!NATIVE) return;
  clearTimeout(mirrorT);
  mirrorT = setTimeout(async () => { try { NATIVE.postMessage(JSON.stringify(await exportAll({ native: true }))); } catch (e) { console.warn('アプリへの控えに失敗', e); } }, 3000);
}
export const usingMemory = () => !!mem;

let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) { if (NATIVE) { resolve(null); memDB(); return; } reject(new Error('この端末では保存の機能（IndexedDB）が使えません。')); return; }
    let rq;
    try { rq = indexedDB.open(DB_NAME, DB_VER); } catch (e) { if (NATIVE) { memDB(); resolve(null); return; } reject(new Error('保存場所を開けませんでした：' + e.message)); return; }
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => { if (NATIVE) { memDB(); resolve(null); return; } reject(new Error('保存場所を開けませんでした：' + (rq.error && rq.error.message))); };
    rq.onblocked = () => reject(new Error('別のタブでKAKUが開いています。ほかのタブを閉じてください。'));
  }).then(db => {
    /* ほかのタブが新しい版の保存場所を開こうとした時・閉じられた時は、次の保存で開き直す */
    if (db) { db.onversionchange = () => { try { db.close(); } catch (e) {} dbp = null; }; db.onclose = () => { dbp = null; }; }
    return db;
  }, e => { dbp = null; throw e; });   // 失敗を覚えたままにしない（前は一度失敗すると、読み直すまで全部の保存が失敗し続けた）
  return dbp;
}

/* メモリで動いている時の入れ物（IndexedDB の objectStore と同じ呼び方だけ用意する） */
const done = v => { const r = { result: v }; setTimeout(() => r.onsuccess && r.onsuccess()); return r; };
function memStore(name) {
  const M = mem[name];
  return {
    getAll: () => done([...M.values()]), get: k => done(M.get(k)), put: (v, k) => { M.set(k === undefined ? v.id : k, v); return done(k); }, delete: k => { M.delete(k); return done(); }, clear: () => { M.clear(); return done(); },
    openCursor: () => { const it = [...M.entries()]; let i = 0; const c = { result: null }; const step = () => setTimeout(() => { c.result = i < it.length ? { key: it[i][0], value: it[i][1], continue: () => { i++; step(); } } : null; c.onsuccess && c.onsuccess(); }); step(); return c; }
  };
}
function tx(store, mode, fn) {
  return open().then(db => !db ? Promise.resolve(fn(memStore(store))).then(r => { if (mode === 'readwrite') mirror(); return r; }) : new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then(r => { result = r; }, reject);
    t.oncomplete = () => { if (mode === 'readwrite') mirror(); resolve(result); };
    t.onerror = () => reject(new Error(quotaMsg(t.error)));
    t.onabort = () => reject(new Error(quotaMsg(t.error)));
  }));
}
const quotaMsg = e => e && e.name === 'QuotaExceededError'
  ? '端末の保存容量がいっぱいです。バックアップを書き出してから、使わない案件や写真を消してください。'
  : '保存できませんでした：' + (e && e.message || '原因不明');
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

/* この画面が最後に読んだ・書いた時の updatedAt（案件 id ごと）。ほかのタブが書いた後かどうかを見分ける */
export const known = new Map();
const note = p => { if (p && p.id) known.set(p.id, p.updatedAt || 0); return p; };
export const listProjects = () => tx('projects', 'readonly', s => req(s.getAll())).then(L => { (L || []).forEach(note); return L; });
export const getProject = id => tx('projects', 'readonly', s => req(s.get(id))).then(note);
export const putProject = p => tx('projects', 'readwrite', s => req(s.put({ ...p, dataVersion: DATA_VERSION }))).then(r => { note(p); return r; });
/* 保存の前に、入っている物がほかのタブ（画面）で新しくなっていないか確かめてから書く（1つの書き込みの中で）。
 * expect＝この画面が最後に読んだ・書いた時の updatedAt。入っている方が新しければ書かずに 'conflict' を返す */
export const putProjectIf = (p, expect = known.get(p.id)) => tx('projects', 'readwrite', s => new Promise((res, rej) => {
  /* 読んだ結果のすぐ後（同じ書き込みの中）で書く。Promise をはさむと書き込みが閉じる端末があるので、呼び返しの中で直に書く */
  const g = s.get(p.id);
  g.onsuccess = () => { const cur = g.result; if (cur && expect != null && (cur.updatedAt || 0) > expect) { res('conflict'); return; }
    const w = s.put({ ...p, dataVersion: DATA_VERSION }); w.onsuccess = () => { note(p); res('ok'); }; w.onerror = () => rej(w.error); };
  g.onerror = () => rej(g.error);
}));
export const deleteProject = id => tx('projects', 'readwrite', s => req(s.delete(id)));
export const getKV = (k, d) => tx('kv', 'readonly', s => req(s.get(k))).then(v => v === undefined ? d : v);
export const setKV = (k, v) => tx('kv', 'readwrite', s => req(s.put(v, k)));

/* ブラウザに勝手に消されないように申請する（結果は設定画面に出す） */
export async function persist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      return already || await navigator.storage.persist();
    }
  } catch (e) { /* 申請できない端末：設定画面に「申請できない」と出すため false を返す */ }
  return false;
}

export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* 今までのKAKU（localStorage）の案件を読み替える。元のデータは消さない（前の画面でも使えるように） */
export function convertOld(list) {
  if (!Array.isArray(list)) return [];
  const n = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
  return list.map(p => {
    const rooms = (p.rooms || []).map(r => {
      const free = !!(r.plan || n(r.area) > 0);
      /* 前のKAKUと同じ数え方になるように移す（落とすと壁・床の㎡が変わる）：
       *  ・ドア・窓を入れていない部屋：手で作った部屋は 1か所ずつ、図面の部屋は 0（前のKAKUの決まり）
       *  ・寸法を入れた窓（幅mm×高さmm×枚数）と、3Dで足した窓の面積
       *  ・図面から見つけて引いていたドア・開口（openL：[種類, 幅m, 面積㎡]）。案件で「引かない」にしていたら引かない
       *  ・寸法を足す・引く（L字・柱） */
      const unset = v => v === undefined || v === null || v === '';
      const def = r.plan ? 0 : 1;
      const windows = (Array.isArray(r.wins) ? r.wins : []).filter(w => n(w.w) > 0 && n(w.h) > 0 && n(w.n) > 0).map(w => ({ w: n(w.w), h: n(w.h), n: Math.max(1, Math.round(n(w.n))) }));
      if (n(r.win3A) > 0) windows.push({ w: 1000, h: Math.round(n(r.win3A) * 1000), n: 1 });
      const runs = (Array.isArray(r.openL) ? r.openL : []).filter(x => Array.isArray(x) && n(x[1]) > 0).map(x => ({ ty: x[0] === 'd' ? 'd' : 'g', len: n(x[1]) }));
      const parts = !free && Array.isArray(r.parts) ? r.parts.filter(x => x && n(x.w) > 0 && n(x.h) > 0).map(x => ({ s: n(x.s) < 0 ? -1 : 1, w: n(x.w), h: n(x.h), ...(x.k ? { k: x.k } : {}) })) : [];
      return {
        id: uid('r'), name: r.name || '部屋',
        shape: free ? 'free' : 'rect',
        w: free ? '' : n(r.w), d: free ? '' : n(r.h),
        area: free ? n(r.area) : '', perim: free ? n(r.peri) : '',
        h: n(r.ch) > 0 ? n(r.ch) : '', qty: Math.max(1, Math.round(n(r.qty) || 1)),
        doors: unset(r.door) ? def : Math.max(0, Math.round(n(r.door))), winCount: unset(r.win) ? def : Math.max(0, Math.round(n(r.win))), windows,
        ...(runs.length ? { openRuns: runs, ...(p.openAuto === false ? { openOff: true } : {}) } : {}),
        ...(parts.length ? { parts } : {})
      };
    });
    const lines = (p.items || []).map(it => ({
      id: uid('l'), name: it.desc || '', spec: '', unit: it.unit || '式', kind: 'other',
      qty: n(it.qty), price: n(it.price), cost: '', loss: '', sheet: 0, basis: null, cat: ''
    }));
    const now = Date.now();
    return {
      id: 'old-' + p.id, name: p.name || '名称未設定',
      customer: p.customer || '', address: p.address || '', person: p.person || '',
      number: p.number || '', expiry: p.expiry || '発行日より30日',
      overheadPct: n(p.overhead), profitPct: n(p.profit), discount: 0, taxRate: '',
      status: 'draft', rooms, lines, history: [], memo: '前のKAKUから引き継いだ案件です。図面から選んだ工事は前の画面で確かめてください。',
      createdAt: typeof p.id === 'number' ? p.id : now, updatedAt: now, migrated: true
    };
  });
}

/* 前のKAKU（localStorage）の案件をもう一度取り込む。同じ案件は上書き（id が old-○○ で同じになる） */
export async function reimportOld() {
  let raw = null;
  try { raw = localStorage.getItem(OLD_KEY); } catch (e) { throw new Error('前のKAKUのデータを読めませんでした：' + e.message); }
  if (!raw) return 0;
  const list = convertOld(JSON.parse(raw));
  for (const p of list) await putProject(p);
  return list.length;
}

export async function migrateOnce() {
  if (await getKV('migratedOld', false)) return 0;
  let raw = null;
  try { raw = localStorage.getItem(OLD_KEY); } catch (e) { raw = null; }
  let list = [];
  if (raw) {
    /* 読めない時は止めずに飛ばす（前は起動ごと止まり、今の案件も出なくなっていた）。1件ずつ移し、読めない案件だけ飛ばす */
    let arr = []; try { arr = JSON.parse(raw); } catch (e) { console.warn('前のKAKUのデータを読めませんでした', e); arr = []; }
    (Array.isArray(arr) ? arr : []).forEach(x => { try { list.push(...convertOld([x])); } catch (e) { console.warn('前のKAKUの案件を1件読めませんでした', e); } });
  }
  /* 前のKAKUの見本（新規案件・養生清掃・既存仕上げ撤去の初期値のまま）は引き継がない */
  list = list.filter(p => !(p.name === '新規案件' && !p.customer && p.lines.length === 2 && p.lines[0].name === '養生・清掃' && p.lines[0].price === 12000));
  for (const p of list) await putProject(p);
  await setKV('migratedOld', true);
  return list.length;
}

/* まるごとバックアップ */
/* 端末だけの物（保存先フォルダのつながり syncDir・同期の記録 syncState）は、バックアップに入れない。
 * フォルダのつながりは文字にすると {} に化け、戻すとフォルダの同期が選び直すまで使えなくなっていた。アプリの控え（native）は同じ端末なので syncState は残す */
const DEVICE_ONLY = ['syncDir', 'syncState'];
export async function exportAll(opt = {}) {
  const projects = await listProjects();
  const kv = {}, skip = opt.native ? ['syncDir'] : DEVICE_ONLY;
  await tx('kv', 'readonly', s => new Promise((res, rej) => {
    const c = s.openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { if (!skip.includes(cur.key)) kv[cur.key] = cur.value; cur.continue(); } else res(); };
    c.onerror = () => rej(c.error);
  }));
  return { app: 'KAKU', dataVersion: DATA_VERSION, exportedAt: new Date().toISOString(), projects, kv };
}

export async function importAll(obj, mode = 'merge') {
  /* 前のKAKUの「まるごとバックアップ」（kind:'backup'、data に localStorage の中身） */
  if (obj && obj.app === 'KAKU' && obj.kind === 'backup' && obj.data) {
    let arr;
    try { arr = JSON.parse(obj.data[OLD_KEY] || obj.data['kaku-estimate-v1'] || '[]'); }   // この試し場の前のKAKU（kaku-generation-v1）と、KAKU 本体（kaku-estimate-v1）のどちらも
    catch (e) { throw new Error('前のKAKUのバックアップの中身を読めませんでした。'); }
    return importOldArray(arr);
  }
  if (!obj || obj.app !== 'KAKU' || !Array.isArray(obj.projects)) {
    if (Array.isArray(obj)) return importOldArray(obj);
    throw new Error('KAKUのバックアップファイルではありません。');
  }
  /* 先に全部の案件の形を確かめる。おかしい物があれば、何も書かずに止める */
  const bad = obj.projects.findIndex(p => !p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || (p.rooms != null && !Array.isArray(p.rooms)) || (p.lines != null && !Array.isArray(p.lines)));
  if (bad >= 0) throw new Error(`バックアップの ${bad + 1} 件目の案件が壊れているので、読み込みをやめました（今の案件はそのままです）。`);
  /* 入れ替える・足すは、1つの書き込みでまとめて行う。途中で失敗したら全部取り消され、今の案件はそのまま残る（前は先に全部消してから1件ずつ書いていた） */
  const n = await tx('projects', 'readwrite', s => { const R = []; if (mode === 'replace') R.push(req(s.clear()));   // 頼みはすぐに全部出す（順番に実行される）
    obj.projects.forEach(p => { note(p); R.push(req(s.put({ ...p, dataVersion: DATA_VERSION }))); }); return Promise.all(R).then(() => obj.projects.length); });
  for (const [k, v] of Object.entries(obj.kv || {})) if (k !== 'migratedOld' && !DEVICE_ONLY.includes(k)) await setKV(k, v);
  return n;
}
async function importOldArray(arr) {
  const list = convertOld(arr);
  for (const p of list) await putProject(p);
  return list.length;
}

/* iPhoneアプリ：IndexedDB が空なのにアプリのファイルに前回の中身がある時（アプリの更新でブラウザ側の保存が消えた時など）は戻す */
export async function restoreFromApp() {
  if (!NATIVE || mem) return 0;
  const src = window.__kakuDB;
  if (!src || !Array.isArray(src.projects) || !src.projects.length) return 0;
  if ((await listProjects()).length) return 0;
  for (const p of src.projects) await putProject(p);
  for (const [k, v] of Object.entries(src.kv || {})) await setKV(k, v);
  return src.projects.length;
}
