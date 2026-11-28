/* 3Dで見る。
 * 前のKAKUの3D（壁の組み立て・ドアの切り抜き・質感・タップで寸法と数量の根拠）をそのまま使う。
 * 新しい画面の案件（図面・部屋・器具・照明・分電盤）を前のKAKUの形に直して渡し、全画面の層に出す。
 * 前のKAKUの保存（案件一覧）には何も足さない。閉じたら層ごと消す。 */
import { opts } from './app.js';
import { oldType } from './legacy.js';
import { planCH } from './drawing.js';
import { lightWires, typeFixMap } from './project.js';
import { pip } from './lighting.js';
import { detectFurniture } from './furndetect.js';

const clone = o => JSON.parse(JSON.stringify(o));
const DEMO = /解体|撤去|はがし|剥がし|斫り|はつり/;

/* 部屋ごとの仕上げ：その部屋に掛かっている明細の行（床・壁・天井の面積、巾木の長さ）から品目を拾う */
function finishes(p, r) {
  const o = {};
  (p.lines || []).forEach(l => {
    const b = l.basis; if (!b || !l.itemId || l.kind === 'labor') return;
    if (!(b.rooms === 'all' || (Array.isArray(b.rooms) && b.rooms.includes(r.id)))) return;
    const demo = DEMO.test(l.name || '');
    const k = { floor: demo ? 'dFloor' : 'floor', wall: demo ? 'dWall' : 'wallFin', ceil: demo ? 'dCeil' : 'ceilFin', base: 'haba' }[b.measure];
    if (k && !o[k]) o[k] = l.itemId;
  });
  return o;
}

/* 3Dの壁にしない線：旧3Dは渡された線を全部「壁」として天井高まで立てるので、
 * 家具クラスタ（drawing.furn）と器具の箱の中（ふちの上も含む）にすっぽり入る線は、
 * 渡す前に外す（江南では全線の約27%が家具の中の線で、ロッカーや植栽が天井までの
 * 壁になっていた）。家具の輪郭線は箱のふちの上に乗っているので、ふちも「中」に
 * 入れる（丸め誤差の 5mm だけ広げて判定）。ただし、区画のふち（面の辺）に重なる
 * 線は本物の壁なので必ず残す。
 * ここで変えるのは3Dへ渡す写しだけで、2Dの数字・保存には一切影響しない */
function segsFor3D(d, plan) {
  const segs = plan.segs || [];
  if (!segs.length) return segs;
  let furn = d.furn;
  if (!Array.isArray(furn)) { try { furn = detectFurniture(segs, d.fixtures || [], d.doors || []); } catch (e) { furn = []; } }
  const boxes = [];
  (furn || []).forEach(c => { if (c && c.b) boxes.push(c.b); });
  (d.fixtures || []).forEach(x => { if (x && x.b) boxes.push(x.b); });
  if (!boxes.length) return segs;
  /* 近い箱どうし（すき間 20cm まで）は1つの領域にまとめる。植栽のプランターの
   * ように1つずつでは小さい箱が並ぶ帯は、帯を貫く線がどの箱にも入りきらないため、
   * 帯全体を1つの領域として扱う（江南の植栽レールがこの形だった） */
  const norm = b => [Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])];
  const regions = [];
  {
    const NB = boxes.map(norm);
    const ex = NB.map(b => [b[0] - 0.10, b[1] - 0.10, b[2] + 0.10, b[3] + 0.10]);
    const used = new Array(NB.length).fill(false);
    for (let i = 0; i < NB.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      let r = NB[i].slice(), e = ex[i].slice(), grew = true;
      while (grew) { grew = false; for (let j = 0; j < NB.length; j++) { if (used[j]) continue; const o = ex[j];
        if (o[0] <= e[2] && o[2] >= e[0] && o[1] <= e[3] && o[3] >= e[1]) { used[j] = true; grew = true;
          r = [Math.min(r[0], NB[j][0]), Math.min(r[1], NB[j][1]), Math.max(r[2], NB[j][2]), Math.max(r[3], NB[j][3])];
          e = [Math.min(e[0], o[0]), Math.min(e[1], o[1]), Math.max(e[2], o[2]), Math.max(e[3], o[3])]; } } }
      regions.push(r);
    }
  }
  const EP = 0.005;
  const inner = regions.map(b => [b[0] - EP, b[1] - EP, b[2] + EP, b[3] + EP]);
  if (!inner.length) return segs;
  const inIdx = (x, y) => { for (let i = 0; i < inner.length; i++) { const b = inner[i]; if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return i; } return -1; };
  /* 区画のふち（面の辺）をマス目で引けるようにする */
  const edges = [];
  (plan.faces || []).forEach(f => { if (!f.poly || f.poly.length < 2) return; for (let i = 0; i < f.poly.length; i++) { const a = f.poly[i], b = f.poly[(i + 1) % f.poly.length]; if (a[0] !== b[0] || a[1] !== b[1]) edges.push([a[0], a[1], b[0], b[1]]); } });
  const CELL = 0.5, egrid = new Map();
  edges.forEach((e, k) => {
    const x0 = Math.floor(Math.min(e[0], e[2]) / CELL), x1 = Math.floor(Math.max(e[0], e[2]) / CELL);
    const y0 = Math.floor(Math.min(e[1], e[3]) / CELL), y1 = Math.floor(Math.max(e[1], e[3]) / CELL);
    for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) { const key = gx + ':' + gy; let a = egrid.get(key); if (!a) { a = []; egrid.set(key, a); } a.push(k); }
  });
  /* 線が区画のふちに重なるか（両端が辺の直線から 2cm 以内で、重なる部分がある）。
     辺の候補は線の上5点（両端・1/4・中点・3/4）の近くのマスから集める：
     長い線が短い辺と一部だけ重なる場合、中点だけでは辺にたどり着けないため */
  const onEdge = s => {
    const cand = new Set();
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const cx = Math.floor((s[0] + (s[2] - s[0]) * t) / CELL), cy = Math.floor((s[1] + (s[3] - s[1]) * t) / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const a = egrid.get(gx + ':' + gy); if (a) a.forEach(k => cand.add(k));
      }
    }
    for (const k of cand) {
      const e = edges[k], dx = e[2] - e[0], dy = e[3] - e[1], L = Math.hypot(dx, dy); if (L < 1e-9) continue;
      if (Math.abs((s[0] - e[0]) * dy - (s[1] - e[1]) * dx) / L > 0.02 || Math.abs((s[2] - e[0]) * dy - (s[3] - e[1]) * dx) / L > 0.02) continue;
      const t1 = ((s[0] - e[0]) * dx + (s[1] - e[1]) * dy) / L, t2 = ((s[2] - e[0]) * dx + (s[3] - e[1]) * dy) / L;
      if (Math.min(t1, t2) < L - 0.01 && Math.max(t1, t2) > 0.01) return true;
    }
    return false;
  };
  const out = segs.filter(s => { const i = inIdx(s[0], s[1]); return i < 0 || inIdx(s[2], s[3]) !== i || onEdge(s); });
  return out.length === segs.length ? segs : out;
}

export function toOld(p) {
  const d = p.drawing, plan = d.plan, ch0 = planCH(plan) || opts().ceilH;
  const P = { segs: segsFor3D(d, plan), dsegs: plan.dsegs || [], titles: plan.titles || [],
    /* 垂れ壁の区間（注記から読み取り済み。plan の座標のまま渡し、旧ビルダーが天井から下がった壁として描く） */
    hang: (plan.hangWalls || []).filter(w => w && w.a && w.b && w.drop > 0),
    faces: plan.faces.map((f, k) => ({ i: f.i, no: k + 1, name: f.name || '', area: f.area, peri: f.peri, ch: f.ch || 0, poly: f.poly })) };
  const rooms = p.rooms.filter(r => r.src === 'plan').map((r, k) => ({
    id: r.id, name: r.name, plan: true, faces: r.faces || [], ch: Number(r.h) > 0 ? Number(r.h) : ch0,
    color: Number.isFinite(r.color) ? r.color : k, area: Number(r.area) || 0, openW: 0, ...finishes(p, r)
  }));
  const places = (d.lights || []).map(x => ({ id: x.id, item: x.item, where: 'pt', p: [x.x, x.y], count: 1 }));
  (d.panels || (d.panel ? [{ id: 'P1', x: d.panel[0], y: d.panel[1] }] : [])).forEach((q, k) => places.push({ id: 'panel' + k, item: 'e-panel', where: 'pt', p: [q.x, q.y], rot: q.rot || 0, count: 1 }));
  (d.outlets || []).forEach(x => places.push({ id: x.id, item: x.item || 'e-cone', where: 'pt', p: [x.x, x.y], count: 1 }));
  (d.places || []).forEach(x => (x.where === 'pt' ? [x.p] : (x.pts || [])).forEach((q, k) => q && places.push({ id: x.id + '_' + k, item: x.item, where: 'pt', p: q, rot: x.rot || 0, count: 1 })));
  /* スイッチ：新しい画面で決めた位置（自動の物も）を置いた物として渡し、照明をそのスイッチにつなぐ（ブースの照明も外の部屋のスイッチへ） */
  const W = lightWires(p), link = {};
  W.sws.forEach(s0 => places.push({ id: 'sw_' + s0.key, item: 'e-sw1', where: 'pt', p: s0.l, count: 1 }));
  Object.entries(W.assign || {}).forEach(([lk, sk]) => { link[lk + ':0'] = 'sw_' + sk + ':0'; });
  /* 器具の種類は、2Dの表示と同じタイプ補正（typefix）を通してから渡す。
   * 生の種類のままだと、机を浴槽と誤判定した物が3Dでだけ本物の浴槽になる
   * （江南の待合室の机＋椅子。2Dではルール4で「器具ではない物」に直っている） */
  let TF = [];
  try { TF = typeFixMap(d) || []; } catch (e) { TF = []; }
  const fix = { fx: (d.fixtures || []).map((x, k) => ({ id: 'f' + k, t: oldType((TF[k] && TF[k].shown) || x.t), b: x.b, back: x.back || '' })), doors: (d.doors || []).map(x => ({ c: x.c, m: x.m, r: x.r })) };
  const cur = { id: '__k3d', name: p.name || '', rooms, places, win: {}, win3d: clone(d.win3d || []), openAuto: true,
    wire: { on: (d.lights || []).length > 0 || (d.outlets || []).length > 0, sw: 'e-sw1', cL: 'e-v16-2', cO: 'e-v20-2', extra: d.wireExtra ?? 10, out: (d.outlets || []).length > 0, link } };
  /* 配線の線と長さは新しい画面の計算（ブースは外の部屋のスイッチ、置いたスイッチ・つなぎ替え込み）をそのまま見せる */
  const wire = { paths: W.paths, home: W.home, sws: [], lights: [], lenL: W.lenL, lenO: W.lenO, lenH: W.lenH, circ: W.circ, autoSw: 0, nL: W.nL, nO: W.nO, panel: (d.panels || (d.panel ? [{ id: 'P1', x: d.panel[0], y: d.panel[1] }] : [])).length > 0, far: W.far, noSw: 0 };
  return { plan: P, fix, cur, wire };
}

/* 図が2つ以上ある図面（1階・2階、現況・プラン など）で、1つの図だけを3Dにする：図の範囲（box＝[x0,y0,x1,y1]）の中の物だけにした案件の写しを作る。
 * 元の案件は変えない。配線の長さも、その図の中だけで数え直す */
export function sheetProject(p, sh) {
  if (!sh || !sh.box) return p;
  const [x0, y0, x1, y1] = sh.box, inB = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const d = p.drawing, plan = d.plan;
  const cOf = f => { if (Number.isFinite(f.cx) && Number.isFinite(f.cy)) return [f.cx, f.cy]; let x = 0, y = 0; f.poly.forEach(q => { x += q[0] / f.poly.length; y += q[1] / f.poly.length; }); return [x, y]; };
  const faces = (plan.faces || []).filter(f => f.poly && f.poly.length > 2 && inB(...cOf(f)));
  const ids = new Set(faces.map(f => f.i));
  const segIn = q => Array.isArray(q) && inB((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
  const ptIn = o => o && (Number.isFinite(o.x) ? inB(o.x, o.y) : true);
  const plan2 = { ...plan, faces, segs: (plan.segs || []).filter(segIn), dsegs: (plan.dsegs || []).filter(segIn), titles: (plan.titles || []).filter(ptIn),
    hangWalls: (plan.hangWalls || []).filter(w => w && w.a && w.b && inB((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2)) };
  const d2 = { ...d, plan: plan2,
    fixtures: (d.fixtures || []).filter(x => x.b && inB((x.b[0] + x.b[2]) / 2, (x.b[1] + x.b[3]) / 2)),
    doors: (d.doors || []).filter(x => !x.c || inB(x.c[0], x.c[1])),
    lights: (d.lights || []).filter(ptIn), outlets: (d.outlets || []).filter(ptIn), switches: (d.switches || []).filter(ptIn),
    panels: (d.panels || (d.panel ? [{ id: 'P1', x: d.panel[0], y: d.panel[1] }] : [])).filter(ptIn), panel: undefined,
    places: (d.places || []).map(x => x.where === 'pt' ? (x.p && inB(x.p[0], x.p[1]) ? x : null) : { ...x, pts: (x.pts || []).filter(q => q && inB(q[0], q[1])) }).filter(x => x && (x.where === 'pt' || x.pts.length)) };
  const rooms = p.rooms.map(r => r.src === 'plan' ? { ...r, faces: (r.faces || []).filter(i => ids.has(i)) } : r).filter(r => r.src !== 'plan' || r.faces.length);
  return { ...p, name: [p.name, sh.title].filter(Boolean).join(' '), drawing: d2, rooms };
}

let layer = null;
/* 3Dで足した窓：面している部屋（窓の真ん中から30cm以内に辺がある区画）の「窓を寸法で入れる」に入れる。
 * 3Dから入れた窓は from3d が付いていて、3Dを閉じるたびに入れ直す（手で入れた窓はそのまま） */
export function applyWin3d(p, list) {
  const d = p.drawing; d.win3d = list;
  const plan = d.plan, near = (q, P) => P.some((a, i) => { const b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)) : 0; return Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]) < 0.3; });
  p.rooms.forEach(r => { if (Array.isArray(r.windows)) r.windows = r.windows.filter(w => !w.from3d); });
  let n = 0;
  list.forEach((w, wi) => {
    p.rooms.filter(r => r.src === 'plan').forEach(r => {
      const F = (r.faces || []).map(i => plan.faces.find(f => f.i === i)).filter(Boolean);
      if (!F.some(f => near(w.p, f.poly) || pip(w.p[0], w.p[1], f.poly))) return;
      r.windows = r.windows || []; r.windows.push({ w: Math.round(w.w * 1000), h: Math.round(w.h * 1000), n: 1, from3d: wi + 1 }); n++;
    });
  });
  return n;
}

/* 途中で失敗した時は「3Dを用意しています…」の幕を残さず、理由を出す（かつ「パソコンでこれでずっと止まってる」） */
export async function open3D(p, opt = {}) {
  try { return await open3D0(p, opt); }
  catch (e) { close3D(); throw new Error('3Dを開けませんでした：' + (e && e.message ? e.message : String(e))); }
}
async function open3D0(p0, { onClose, sheet = null, sheets = [] } = {}) {
  if (!p0.drawing || !p0.drawing.plan) throw new Error('先に図面を読み込んでください');
  const p = sheet ? sheetProject(p0, sheet) : p0;
  close3D();
  const f = document.createElement('iframe');
  f.title = '3Dで見る';
  /* 用意ができるまでは隠して、幕（3Dを用意しています）を出す。前の画面が一瞬見えないように */
  f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:10000;background:#1c1f1a;visibility:hidden';
  const cover = document.createElement('div');
  cover.style.cssText = 'position:fixed;inset:0;z-index:10001;background:#1c1f1a;color:#e8e6df;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px';
  cover.textContent = '3Dを用意しています…';
  document.body.appendChild(cover); cover3 = cover;
  f.src = './old/index.html?view3d=1';
  document.body.appendChild(f); layer = f;
  const W = await new Promise((res, rej) => {
    let n = 0;
    const t = setInterval(() => {
      try {
        const w = f.contentWindow;
        if (w && typeof w.KAKU_open3D === 'function' && w.eval('typeof KAKU_cat!=="undefined"&&!!KAKU_cat')) { clearInterval(t); res(w); return; }
      } catch (e) { /* 読み込み中 */ }
      if (++n > 300 || layer !== f) { clearInterval(t); rej(new Error('3Dの部品が起動しませんでした')); }
    }, 100);
  });
  const st = W.document.createElement('style');
  st.textContent = 'body>*:not(#k3d):not(script):not(style){visibility:hidden!important}';
  W.document.head.appendChild(st);
  try { W.document.documentElement.dataset.theme = document.documentElement.dataset.theme || 'dark'; } catch (e) { /* なくてよい */ }
  W.__k3 = toOld(p);
  { let gl = false; try { const c = W.document.createElement('canvas'); gl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { /* 判定できない */ }
    if (!gl) throw new Error('このブラウザでは 3D の描画（WebGL）が使えません。ブラウザの設定でハードウェア アクセラレーションをオンにして、ブラウザを再起動してください'); }
  /* 3Dの部品の中で起きたエラーも拾う（パソコンで WebGL が使えない時など） */
  let inner = null; try { W.addEventListener('error', ev => { inner = inner || (ev.error && ev.error.message) || ev.message; }); } catch (e) { /* なくてよい */ }
  W.eval('KAKU_plan=window.__k3.plan;KAKU_fix=window.__k3.fix;current=window.__k3.cur;window.KW_calc=function(){return window.__k3.wire};KAKU_open3D()');
  await new Promise(r => setTimeout(r, 300));
  if (inner) throw new Error(inner);

  f.style.visibility = 'visible'; cover.remove();
  const btn = W.document.querySelector('#k3d .k3close');
  /* 図を1つだけ出している時は、3Dで足した窓を元の案件に戻さない（ほかの図の窓が消えるため） */
  if (btn) { btn.textContent = '閉じる'; btn.onclick = e => { e.preventDefault(); let wins = null; if (!sheet) { try { wins = JSON.parse(W.eval('JSON.stringify(current.win3d||[])')); } catch (er) { /* 読めなければそのまま */ } } close3D(); onClose && onClose(wins); }; }
  /* 図が2つ以上ある時：上の帯に図の切り替え（押すとその図の3Dを開き直す）。印刷・PDF は、出している図だけになる */
  if (sheets.length > 1) { try {
    const top = W.document.querySelector('#k3d .k3top'), bar = W.document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;overflow-x:auto;max-width:100%;padding:18px 0 2px;flex-basis:100%;order:9';   // 上に「高画質にしています」の字が出るので少し下げる
    const b = (label, sh) => { const x = W.document.createElement('button'); x.type = 'button'; x.textContent = label; x.className = 'k3print';
      const on = sh ? sheet && sheet.key === sh.key : !sheet; x.style.cssText = 'white-space:nowrap;' + (on ? 'outline:2px solid #e65c32' : 'opacity:.8');
      x.onclick = ev => { ev.preventDefault(); if (on) return; open3D(p0, { onClose, sheet: sh, sheets }).catch(er => { try { window.alert(er.message); } catch (e2) {} }); }; bar.appendChild(x); };
    sheets.forEach(sh => b(sh.title || '図', sh)); b('全部', null);
    if (top) { top.style.flexWrap = 'wrap'; top.appendChild(bar); }
  } catch (e) { /* 出せなくても3Dは使える */ } }
  return W;
}
let cover3 = null;
export function close3D() { if (layer) { layer.remove(); layer = null; } if (cover3) { cover3.remove(); cover3 = null; } }
