/* 図面の表示：線・区画を SVG で描く。指で動かす・2本指で拡大・ホイールで拡大。区画をタップすると onTap(区画番号) */
const COLORS = ['#ff8a3d', '#3ccf8e', '#5ab7ff', '#f3c04f', '#c084fc', '#ff6b9a', '#8bd450', '#9aa7b8'];
export const roomColor = n => COLORS[(n || 0) % COLORS.length];

/* 器具の絵：種類ごとの色と形。背面（壁側）の向き back：N・S・E・W */
const FIX_COLOR = { toilet: '#ff8a3d', urinal: '#5ab7ff', counter: '#3ccf8e', sink: '#3ccf8e', slop: '#c084fc', trough: '#3ccf8e', bath: '#5ab7ff', kitchen: '#f3c04f', unknown: '#f3c04f' };
const FIX_LABEL = { toilet: '便器', urinal: '小便器', counter: '洗面', sink: '手洗', slop: 'SK', trough: '流し', bath: '浴槽', kitchen: 'キッチン', unknown: '？' };
function fixSymbol(x, lw) {
  const [x0, y0, x1, y1] = x.b, c = FIX_COLOR[x.t] || '#9aa7b8';
  const X0 = x0, X1 = x1, Y0 = -y1, Y1 = -y0, W = X1 - X0, H = Y1 - Y0, cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
  const sw = lw * 1.6, back = x.back || '';
  let g = '';
  if (x.t === 'toilet') {
    /* タンク（背面側）と便座（だ円） */
    const vert = back === 'N' || back === 'S';
    const tk = vert ? H * 0.28 : W * 0.28;
    const tank = back === 'N' ? [X0, Y0, W, tk] : back === 'S' ? [X0, Y1 - tk, W, tk] : back === 'W' ? [X0, Y0, tk, H] : back === 'E' ? [X1 - tk, Y0, tk, H] : null;
    if (tank) g += `<rect x="${tank[0]}" y="${tank[1]}" width="${tank[2]}" height="${tank[3]}" rx="${sw}" fill="${c}" fill-opacity=".35" stroke="${c}" stroke-width="${sw}"/>`;
    const ex = back === 'W' ? cx + tk / 2 : back === 'E' ? cx - tk / 2 : cx, ey = back === 'N' ? cy + tk / 2 : back === 'S' ? cy - tk / 2 : cy;
    g += `<ellipse cx="${ex}" cy="${ey}" rx="${(vert ? W : W - tk) * 0.42}" ry="${(vert ? H - tk : H) * 0.42}" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="${sw}"/>`;
  } else if (x.t === 'counter' || x.t === 'sink' || x.t === 'slop' || x.t === 'trough' || x.t === 'kitchen') {
    g += `<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" rx="${sw * 2}" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="${sw}"/>`;
    const r = Math.min(W, H) * 0.3;
    if (x.t !== 'kitchen') g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
  } else {
    g += `<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" rx="${Math.min(W, H) * 0.35}" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="${sw}"/>`;
  }
  const fs = Math.max(0.12, Math.min(0.22, Math.min(W, H) * 0.45));
  g += `<text x="${cx}" y="${cy}" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="${c}" font-weight="700" stroke="var(--bg)" stroke-width="${fs * 0.18}" paint-order="stroke">${FIX_LABEL[x.t] || ''}</text>`;
  return `<g>${g}</g>`;
}

/* 見つけた器具の印：図面の器具の絵はそのまま見せて、その周りに種類の色の点線の枠だけを付ける（文字は出さない） */
function fixBox(x, lw, on) {
  const [x0, y0, x1, y1] = x.b, c = FIX_COLOR[x.t] || '#9aa7b8', pad = lw * 3;
  return `<rect x="${x0 - pad}" y="${-y1 - pad}" width="${x1 - x0 + pad * 2}" height="${y1 - y0 + pad * 2}" rx="${lw * 3}" fill="${c}" fill-opacity="${on ? '.35' : '.1'}" stroke="${on ? 'var(--accent)' : c}" stroke-width="${lw * (on ? 3.5 : 1.6)}" ${on ? '' : `stroke-dasharray="${lw * 4} ${lw * 2.5}"`}><title>${FIX_LABEL[x.t] || ''}</title></rect>`;
}

/* 通り芯を出すか（端末に覚える。前のKAKUと同じ） */
const bgOn = () => { try { return localStorage.getItem('kaku-bg') !== '0'; } catch (e) { return true; } };
const gridOn = () => { try { return localStorage.getItem('kaku-grid') === '1'; } catch (e) { return false; } };
const txtOn = () => { try { return localStorage.getItem('kaku-dtext') !== '0'; } catch (e) { return true; } };   // 図面の文字（最初は出す）
export function planView(box, plan, opt = {}) {
  /* 全体の大きさ：図面のずっと遠くにぽつんとある線（三井屋の図面は 600m 下に1本）まで入れると、
     図面が点のように小さくなる。線の端の 1%〜99% の範囲を芯にして、芯の大きさの半分より外に出る線は入れない（区画は全部入れる） */
  const qs = (a) => { a.sort((p, q) => p - q); const k = Math.floor(a.length * 0.01); return [a[k], a[a.length - 1 - k]]; };
  const ax = [], ay = [];
  plan.segs.forEach(s => { ax.push(s[0], s[2]); ay.push(s[1], s[3]); });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const add = (x, y) => { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; };
  if (ax.length) {
    const [qx0, qx1] = qs(ax), [qy0, qy1] = qs(ay), mx = Math.max(1, qx1 - qx0) * 0.5, my = Math.max(1, qy1 - qy0) * 0.5;
    const inC = (x, y) => x >= qx0 - mx && x <= qx1 + mx && y >= qy0 - my && y <= qy1 + my;
    plan.segs.forEach(s => { if (inC(s[0], s[1]) && inC(s[2], s[3])) { add(s[0], s[1]); add(s[2], s[3]); } });
  }
  plan.faces.forEach(f => f.poly.forEach(p => add(p[0], p[1])));
  if (!isFinite(minX)) { minX = minY = 0; maxX = maxY = 1; }
  const W = Math.max(1, maxX - minX), H = Math.max(1, maxY - minY), pad = Math.max(W, H) * 0.04;
  const base = [minX - pad, -maxY - pad, W + pad * 2, H + pad * 2];   // y は上向きなので反転して描く
  /* 描き直しても、同じ図面なら前の拡大・位置のまま（opt.keep＝前の view.keep()） */
  let vb = opt.keep && opt.keep.base && opt.keep.base.every((v, k) => Math.abs(v - base[k]) < 1e-6) ? opt.keep.vb.slice() : base.slice();
  const lw = Math.max(W, H) / 900;
  const pathOf = S => S.map(s => `M${s[0]} ${-s[1]}L${s[2]} ${-s[3]}`).join('');
  const fs = Math.max(W, H) / 60;
  const gid = 'pvAll' + Math.random().toString(36).slice(2, 8);
  box.innerHTML = `<div class="pv-wrap"><svg class="pv" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><g id="${gid}">
      ${opt.bg ? `<image class="pv-bg" href="${opt.bg.src}" x="0" y="0" width="${opt.bg.w * opt.bg.s}" height="${opt.bg.h * opt.bg.s}" preserveAspectRatio="none" opacity=".35" pointer-events="none" ${bgOn() ? '' : 'display="none"'}/>` : ''}
      <g class="faces"></g>
      <path d="${pathOf(plan.dsegs || [])}" fill="none" stroke="var(--faint)" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"/>
      <path d="${pathOf(plan.segs)}" fill="none" stroke="var(--text)" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linecap="round" opacity=".85"/>
      ${(plan.gsegs || []).length ? `<path class="pv-grid" d="${pathOf(plan.gsegs)}" fill="none" stroke="#e5534b" stroke-width="${lw}" stroke-dasharray="${lw * 14} ${lw * 3} ${lw * 2} ${lw * 3}" opacity=".75" pointer-events="none" ${gridOn() ? '' : 'display="none"'}/>` : ''}
      ${opt.fixG ? `<path d="${opt.fixG}" transform="scale(0.001,0.001)" fill="none" stroke="var(--text)" stroke-width="1" vector-effect="non-scaling-stroke" opacity=".8" pointer-events="none"/>` : ''}
      ${opt.fixGd ? `<path d="${opt.fixGd}" transform="scale(0.001,0.001)" fill="none" stroke="var(--faint)" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 3" pointer-events="none"/>` : ''}
      <g class="fixes" pointer-events="none"></g>
      <g class="overlay" pointer-events="none"></g>
      <g class="dtexts" pointer-events="none" fill="var(--text)" opacity=".8" ${txtOn() ? '' : 'display="none"'}></g>
      <g class="labels" font-size="${fs}" text-anchor="middle"></g></g></svg>
    <div class="pv-note" hidden>拡大すると、区画の番号が出ます</div>
    <div class="pv-loupe" hidden><svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><use href="#${gid}"/><g class="lp-mark"></g></svg></div>
    <div class="pv-tools">${opt.extraTools || ''}${opt.bg ? `<button class="iconbtn pv-gridbtn ${bgOn() ? 'on' : ''}" data-z="bg" aria-pressed="${bgOn()}" title="下に敷いた図を出す・隠す">図</button>` : ''}${(plan.gsegs || []).length ? `<button class="iconbtn pv-gridbtn ${gridOn() ? 'on' : ''}" data-z="grid" aria-pressed="${gridOn()}" title="通り芯を出す・隠す">芯</button>` : ''}${opt.dtexts ? `<button class="iconbtn pv-gridbtn ${txtOn() ? 'on' : ''}" data-z="txt" aria-pressed="${txtOn()}" title="図面の文字を出す・隠す">字</button>` : ''}<button class="iconbtn" data-z="in" aria-label="拡大">＋</button><button class="iconbtn" data-z="out" aria-label="縮小">－</button><button class="iconbtn" data-z="fit" aria-label="全体を表示">⤢</button></div></div>`;
  const svg = box.querySelector('svg');
  /* 区画の番号の字：区画の大きさに合わせた大きさにして、画面で小さすぎて読めない字（7px 未満）は出さない。
   * 区画が何百もある図面で、字が重なって図が見えなくなるため。拡大すると、その大きさで読める区画から順に出る */
  const fzOf = new Map();
  plan.faces.forEach(f => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; f.poly.forEach(q => { if (q[0] < a) a = q[0]; if (q[0] > c) c = q[0]; if (q[1] < b) b = q[1]; if (q[1] > d) d = q[1]; });
    fzOf.set(f.i, Math.max(0.02, Math.min(fs, (c - a) / (2.4 + 0.62 * String(f.no ?? '').length), (d - b) / 2.6))); });
  let visT = 0;
  function vis() {
    cancelAnimationFrame(visT);
    visT = requestAnimationFrame(() => {
      const r = svg.getBoundingClientRect(); if (!r.width) return;
      const sc = Math.min(r.width / vb[2], r.height / vb[3]); let hid = 0;
      svg.querySelectorAll('.labels text').forEach(t => { const fz = +t.dataset.fz || fs, on = fz * sc >= 7; if (on) { t.removeAttribute('display'); t.setAttribute('font-size', Math.min(fz, (+t.dataset.cap || 17) / sc)); } else { t.setAttribute('display', 'none'); hid++; } });   // 大きく拡大した時は、字を画面で 17px までにする
      /* 上に重ねる印（測った長さなど）で、画面の大きさを決めた物：data-px＝字の大きさ（px）、data-r＝丸の半径（px）。拡大しても画面で同じ大きさ */
      svg.querySelectorAll('.overlay [data-px]').forEach(t => { const px = +t.dataset.px; t.setAttribute('font-size', px / sc); t.setAttribute('stroke-width', px * 0.25 / sc); });
      svg.querySelectorAll('.overlay [data-r]').forEach(c => c.setAttribute('r', +c.dataset.r / sc));
      const note = box.querySelector('.pv-note'); if (note) note.hidden = !hid;
    });
  }
  const set = () => { svg.setAttribute('viewBox', vb.join(' ')); vis(); };
  set();
  /* 図面の縦横の比に合わせて高さを決める（横長の図面で下が空かないように） */
  const fitH = () => { if (!box.isConnected) { window.removeEventListener('resize', fitH); return; }   // 描き直して外れた図面の分は外す（描き直すたびに溜まっていた）
    if (box.closest('.dwg-fs')) { svg.style.height = ''; return; } const w = box.clientWidth || 600; svg.style.height = Math.round(Math.max(240, Math.min(window.innerHeight * 0.62, 560, w * base[3] / base[2]))) + 'px'; };
  fitH();
  window.addEventListener('resize', fitH);

  function paint() {
    const fsel = opt.fixSel ? opt.fixSel() : -1;
    svg.querySelector('.fixes').innerHTML = (opt.fixtures ? opt.fixtures() : []).map((x, k) => x.t === 'other' && k !== fsel ? '' : fixBox(x, lw, k === fsel)).join('');
    const sel = opt.selected ? opt.selected() : new Set();
    const byI = new Map(plan.faces.map(f => [f.i, f]));
    const RL = opt.rooms ? opt.rooms() : [], roomOf = new Map(); RL.forEach((r, k) => r.faces.forEach(i => roomOf.set(i, k)));
    const owner = opt.owner ? opt.owner() : new Map();
    /* 新しい読み取りの印（図枠・表）：除外は灰色、保留は点線の枠。選んだ時・部屋にした時は、いつもの色が先 */
    const marks = (opt.marks && opt.marks()) || null, mk = f => (marks && (marks[f.i] || marks[String(f.i)])) || null;
    /* 大きい区画を先に描いて、小さい区画を上に重ねる（大きい区画の下に小さい区画が隠れて押せなくならないように） */
    svg.querySelector('.faces').innerHTML = [...plan.faces].sort((a, b) => b.area - a.area).map(f => {
      const o = owner.get(f.i), s = sel.has(f.i), m = !s && o == null ? mk(f) : null;
      const fill = s ? 'var(--accent)' : o != null ? roomColor(o) : m && m.s === 'out' && !m.hide ? '#8a93a0' : 'transparent';
      const op = s ? 0.45 : o != null ? 0.22 : m && m.s === 'out' && !m.hide ? 0.32 : 0;
      return `<polygon data-i="${f.i}" points="${f.poly.map(p => p[0] + ',' + -p[1]).join(' ')}" fill="${fill}" fill-opacity="${op}" stroke="${s ? 'var(--accent)' : m && m.s === 'hold' ? 'var(--warn)' : 'none'}" ${m && m.s === 'hold' ? `stroke-dasharray="${lw * 6} ${lw * 4}"` : ''} stroke-width="${lw * 2.5}" style="cursor:pointer"/>`;
    }).join('');
    svg.querySelector('.labels').innerHTML = plan.faces.map(f => {
      const o = owner.get(f.i), s = sel.has(f.i);
      if (o != null && !s && roomOf.has(f.i)) return '';   // 部屋にした区画は、部屋の名前を1つだけ出す（下の roomLabels）
      const m = !s && o == null ? mk(f) : null;
      /* 図面の文字を出している時は、まだ部屋にしていない区画の番号を小さく薄くする（図面の文字が先。選んだ・部屋にした区画はそのまま） */
      const dim = !!opt.dtexts && txtOn() && !s && o == null, fz = (fzOf.get(f.i) || fs) * (dim ? 0.6 : 1), dz = dim ? ' data-cap="11" opacity=".55"' : '';
      const kind = m ? (m.s === 'join' ? 'まとめ済' : m.s === 'out' ? (m.type === 'frame' ? '図枠' : m.type === 'title' ? '表題欄' : m.type === 'sheet' ? '使わない図' : m.type === 'off' ? '区画ではない' : '表') : '？') : '';
      if (m && m.hide) return '';   // 表・表題欄・区画ではない所は、区画の字を出さない（図面の文字を下の dtexts で出す）
      if (m) return `<text x="${f.cx}" y="${-f.cy}" font-size="${fz}" data-fz="${fz}"${dz} fill="${m.s === 'out' ? 'var(--faint)' : 'var(--warn)'}" font-weight="700" pointer-events="none">${kind}<tspan x="${f.cx}" dy="1.15em" font-weight="400" font-size="0.8em">区画${f.no}</tspan></text>`;
      return `<text x="${f.cx}" y="${-f.cy}" font-size="${fz}" data-fz="${fz}"${dz} fill="${s ? 'var(--accent)' : o != null ? roomColor(o) : 'var(--muted)'}" font-weight="700" pointer-events="none">区画${f.no}<tspan x="${f.cx}" dy="1.15em" font-weight="400" font-size="0.8em">${(Math.round(f.area * 100) / 100)}㎡</tspan></text>`;
    }).join('') + RL.map(r => {
      /* 部屋の名前の位置：いちばん広い区画の字の位置。字の大きさもその区画に合わせて少し大きく */
      const F = r.faces.map(i => byI.get(i)).filter(Boolean); if (!F.length || F.every(f => sel.has(f.i))) return '';
      const big = F.reduce((a, b) => (b.area > a.area ? b : a)), bx = big.poly ? big.poly.map(q => q[0]) : [0, 1], bw = Math.max(...bx) - Math.min(...bx), fz = Math.max(0.02, Math.min((fzOf.get(big.i) || fs) * 1.15, bw / (String(r.name).length + 1.5))), E2 = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
      return `<text x="${big.cx}" y="${-big.cy}" font-size="${fz}" data-fz="${fz}" fill="${roomColor(r.color)}" font-weight="700" pointer-events="none">${E2(r.name)}<tspan x="${big.cx}" dy="1.15em" font-weight="400" font-size="0.8em">${Math.round((r.area || F.reduce((a, f) => a + f.area, 0)) * 100) / 100}㎡${F.length > 1 ? `（${F.length}区画）` : ''}</tspan></text>`;
    }).join('');
    /* 区画ではない所（表・表題欄など）に書いてある図面の文字を、その場所にそのまま出す（左下が文字の位置） */
    const E = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    svg.querySelector('.dtexts').innerHTML = (opt.dtexts ? opt.dtexts() : []).map(q => `<text x="${q.x}" y="${-q.y}" font-size="${q.h}">${E(q.s)}</text>`).join('');
    vis();
  }
  paint();
  const overlay = html => { svg.querySelector('.overlay').innerHTML = html; vis(); };
  const scale = () => toUser(0, 0)[2];

  /* ---- 指・マウスの操作 ---- */
  const pts = new Map();
  let moved = false, startDist = 0, startVb = null, startMid = null;
  /* 画面の位置 → 図面の位置。ブラウザの変換（getScreenCTM）を使うので、拡大・移動・画面の大きさに関係なく正しい */
  const toUser = (cx, cy) => {
    const m = svg.getScreenCTM();
    if (!m) { const r = svg.getBoundingClientRect(); const s = Math.max(vb[2] / r.width, vb[3] / r.height); const ox = (r.width * s - vb[2]) / 2, oy = (r.height * s - vb[3]) / 2; return [vb[0] - ox + (cx - r.left) * s, vb[1] - oy + (cy - r.top) * s, s]; }
    const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    const q = pt.matrixTransform(m.inverse());
    return [q.x, q.y, 1 / m.a];
  };
  const zoomAt = (cx, cy, k) => {
    const [ux, uy] = toUser(cx, cy);
    const nw = Math.min(base[2] * 1.5, Math.max(base[2] / 60, vb[2] / k)), f = nw / vb[2];
    vb = [ux - (ux - vb[0]) * f, uy - (uy - vb[1]) * f, vb[2] * f, vb[3] * f]; set();
  };
  /* 物をつかんで動かす（opt.onDragStart が物を返した時だけ。図はずらさない）。0.45秒押したままなら long（1個だけ動かす合図） */
  let drag = null, dragStart = null, longT = null, loupe = false, lpStart = null, lpMovedFar = false, lpAt = null;
  const lpEl = box.querySelector('.pv-loupe'), lpSvg = lpEl.querySelector('svg'), wrap = box.querySelector('.pv-wrap');
  const LP = 150, ZOOM = 3.2;
  function showLoupe(cx, cy) {
    const [ux, uy, sc] = toUser(cx, cy);
    let x = ux, y = -uy, snapped = false;
    if (opt.snap) { const q = opt.snap(x, y, sc / ZOOM); if (q && (Math.abs(q[0] - x) > 1e-9 || Math.abs(q[1] - y) > 1e-9)) snapped = true; if (q) { x = q[0]; y = q[1]; } }
    lpAt = [x, y];
    const r = LP / 2 * sc / ZOOM;
    lpSvg.setAttribute('viewBox', `${ux - r} ${uy - r} ${2 * r} ${2 * r}`);
    const k = r / 12;
    lpSvg.querySelector('.lp-mark').innerHTML = `<line x1="${ux - r}" y1="${uy}" x2="${ux + r}" y2="${uy}" stroke="var(--accent)" stroke-width="${k * 0.15}" opacity=".5"/><line x1="${ux}" y1="${uy - r}" x2="${ux}" y2="${uy + r}" stroke="var(--accent)" stroke-width="${k * 0.15}" opacity=".5"/>
      <circle cx="${x}" cy="${-y}" r="${k * (snapped ? 0.9 : 0.5)}" fill="${snapped ? 'var(--ok)' : 'var(--accent)'}" stroke="#fff" stroke-width="${k * 0.15}"/>`;
    const b = wrap.getBoundingClientRect();
    let lx = cx - b.left - LP / 2, ly = cy - b.top - LP - 40;
    if (ly < 4) ly = cy - b.top + 40;
    lx = Math.max(4, Math.min(b.width - LP - 4, lx));
    lpEl.style.left = lx + 'px'; lpEl.style.top = ly + 'px'; lpEl.hidden = false;
  }
  const hideLoupe = () => { loupe = false; lpEl.hidden = true; };
  let downAt = null;
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = false; downAt = [e.clientX, e.clientY];
    drag = null; clearTimeout(longT);
    if (pts.size === 1 && opt.onDragStart) {
      const [ux, uy, sc] = toUser(e.clientX, e.clientY);
      drag = opt.onDragStart(ux, -uy, sc) || null;
      if (drag) { dragStart = [e.clientX, e.clientY]; longT = setTimeout(() => { if (drag && !moved) { drag.long = true; if (navigator.vibrate) navigator.vibrate(15); drag.onLong && drag.onLong(); } }, 450); }
    }
    /* 虫めがね：何もつかんでいない所を0.45秒押したままにすると、指の所を大きく見せる。線の端・線の上に吸い付き、離した所に決める */
    if (pts.size === 1 && !drag) { lpStart = [e.clientX, e.clientY]; longT = setTimeout(() => { if (pts.size === 1 && !lpMovedFar) { loupe = true; if (navigator.vibrate) navigator.vibrate(15); showLoupe(e.clientX, e.clientY); } }, 450); lpMovedFar = false; }
    if (pts.size === 2) { drag = null; clearTimeout(longT); hideLoupe(); const [a, b] = [...pts.values()]; startDist = Math.hypot(a[0] - b[0], a[1] - b[1]); startVb = vb.slice(); startMid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; } });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1 && loupe) { showLoupe(e.clientX, e.clientY); return; }
    if (pts.size === 1 && lpStart && Math.hypot(e.clientX - lpStart[0], e.clientY - lpStart[1]) > 8) { lpMovedFar = true; clearTimeout(longT); }
    if (pts.size === 1 && drag) {
      const tx = e.clientX - dragStart[0], ty = e.clientY - dragStart[1];
      if (!moved && Math.hypot(tx, ty) < 6) return;
      moved = true; clearTimeout(longT);
      const s = toUser(0, 0)[2]; drag.move(tx * s, -ty * s, tx, ty);
      return;
    }
    if (pts.size === 1) {
      const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
      if (Math.abs(dx) + Math.abs(dy) > 0) { if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 10) moved = true; const s = toUser(0, 0)[2]; vb[0] -= dx * s; vb[1] -= dy * s; set(); }
    } else if (pts.size === 2) {
      moved = true;
      const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      vb = startVb.slice(); set(); zoomAt(startMid[0], startMid[1], d / startDist);
      /* 2本指をそろって動かした分だけ、図もずらす（指について来る） */
      const mx = (a[0] + b[0]) / 2 - startMid[0], my = (a[1] + b[1]) / 2 - startMid[1], sc2 = toUser(0, 0)[2]; vb[0] -= mx * sc2; vb[1] -= my * sc2; set();
    }
  });
  /* その点を含む区画のうち一番小さい物（図枠の内側のような大きい区画が、上に重なっていても小さい方を選ぶ） */
  /* ほかの区画を2つ以上中に含む区画（図枠の内側・建物の外まわり）はタップで選ばない（区画の無い所を押すと図面全体が選ばれていた）。区画の一覧からは選べる */
  const pin = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > y) !== (P[j][1] > y)) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; } return c; };
  const wrapM = new Map(), wraps = (z) => { if (!wrapM.has(z.i)) { let k = 0; for (const o of plan.faces) { if (o !== z && o.area < z.area && pin(o.cx, o.cy, z.poly) && ++k >= 2) break; } wrapM.set(z.i, k >= 2); } return wrapM.get(z.i); };
  const faceAt0 = (x, y) => { let best = null; for (const z of plan.faces) { const P = z.poly; if (!P || P.length < 3 || (best && z.area >= best.area)) continue; if (!pin(x, y, P) || wraps(z)) continue; best = z; } return best; };
  /* どの区画にも入らない所（机・棚のかたまりの中など）を押した時：上下左右に見て、8m 以内で最初に当たる区画が3方向以上で同じなら、その区画（まわりを囲んでいる部屋）を選ぶ。4方向とも何かの区画に当たれば、いちばん近い区画。建物の外を押した時は選ばない */
  const faceAround = (x, y) => {
    const dist = [];
    const hit = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy], di) => {
      let best = null, bd = 8;
      for (const z of plan.faces) { const P = z.poly; if (!P || P.length < 3 || wraps(z)) continue;
        for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[j], b = P[i];
          let t;
          if (dx) { if ((a[1] > y) === (b[1] > y)) continue; const xx = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); t = (xx - x) * dx; }
          else { if ((a[0] > x) === (b[0] > x)) continue; const yy = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); t = (yy - y) * dy; }
          if (t > 0 && t < bd) { bd = t; best = z; } } }
      dist[di] = bd; return best; });
    const n = new Map(); hit.forEach(z => { if (z) n.set(z, (n.get(z) || 0) + 1); });
    let pick = null; n.forEach((k, z) => { if (k >= 3) pick = z; });
    /* 区画が机・椅子の線で細かく割れている所（自動車学校の事務所）は方向ごとに当たる区画が違う。4方向とも区画に当たる（建物の中）なら、いちばん近い区画 */
    if (!pick && hit.every(z => z)) { let k = 0; dist.forEach((d, i) => { if (d < dist[k]) k = i; }); pick = hit[k]; }
    return pick;
  };
  const faceAt = (x, y) => { const f = faceAt0(x, y); if (f) return f; const g = faceAround(x, y); if (g) g._around = true; return g; };
  const tapFace = f => { const ar = !!f._around; delete f._around; opt.onTap(f.i, { around: ar }); };
  const up = e => {
    const was = pts.size; pts.delete(e.pointerId); clearTimeout(longT);
    if (loupe) {
      const at = lpAt; hideLoupe(); if (e.type !== 'pointerup' || !at) return;
      const mode = opt.mode ? opt.mode() : 'room';
      if (mode === 'room' && opt.onTap) { const f = faceAt(at[0], at[1]); if (f) tapFace(f); }
      else if (opt.onPoint) opt.onPoint(at[0], at[1], toUser(0, 0)[2], true);
      return;
    }
    if (drag && moved) { const d = drag; drag = null; d.end(e.type !== 'pointerup'); return; }
    /* なぞる用に掴んだが動かさずに離した＝タップ：掴んだ時の準備（自動のスイッチを置いたスイッチに変える など）を取り消してから、タップとして扱う */
    if (drag && !moved) { const d = drag; drag = null; try { d.end(true); } catch (err) { console.error(err); } }
    drag = null;
    if (was === 1 && !moved && e.type === 'pointerup') {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const pg = t && t.closest && t.closest('polygon[data-i]');
      const [ux, uy, sc] = toUser(e.clientX, e.clientY);
      const mode = opt.mode ? opt.mode() : 'room';
      const fa = mode === 'room' && opt.onTap ? faceAt(ux, -uy) : null;
      if (mode === 'room' && opt.onTap) { if (fa) tapFace(fa); }
      else if (opt.onPoint) opt.onPoint(ux, -uy, sc);
    }
  };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2); }, { passive: false });
  box.querySelector('.pv-tools').addEventListener('click', e => {
    const z = e.target.closest('[data-z]'); if (!z) return;
    const r = svg.getBoundingClientRect();
    if (z.dataset.z === 'txt') { const on = !txtOn(); try { localStorage.setItem('kaku-dtext', on ? '1' : '0'); } catch (e2) { /* 覚えられなくても切り替える */ }
      const g = svg.querySelector('.dtexts'); if (g) { if (on) g.removeAttribute('display'); else g.setAttribute('display', 'none'); }
      z.classList.toggle('on', on); z.setAttribute('aria-pressed', on); paint(); return; }
    if (z.dataset.z === 'grid') { const on = !gridOn(); try { localStorage.setItem('kaku-grid', on ? '1' : '0'); } catch (e2) { /* 覚えられなくても表示は切り替える */ }
      const g = svg.querySelector('.pv-grid'); if (g) { if (on) g.removeAttribute('display'); else g.setAttribute('display', 'none'); }
      z.classList.toggle('on', on); z.setAttribute('aria-pressed', on); return; }
    if (z.dataset.z === 'bg') { const on = !bgOn(); try { localStorage.setItem('kaku-bg', on ? '1' : '0'); } catch (e2) { /* 表示だけ切り替える */ }
      const g = svg.querySelector('.pv-bg'); if (g) { if (on) g.removeAttribute('display'); else g.setAttribute('display', 'none'); }
      z.classList.toggle('on', on); z.setAttribute('aria-pressed', on); return; }
    if (z.dataset.z === 'fit') { vb = base.slice(); set(); } else zoomAt(r.left + r.width / 2, r.top + r.height / 2, z.dataset.z === 'in' ? 1.4 : 1 / 1.4);
  });
  /* 図面の中の1か所（図枠や段の範囲）を大きく出す。null で全体に戻す */
  const zoomTo = (b) => { if (!b) { vb = base.slice(); set(); return; } const w = b[2] - b[0], h = b[3] - b[1], pd = Math.max(w, h) * 0.03; vb = [b[0] - pd, -b[3] - pd, w + pd * 2, h + pd * 2]; set(); };
  const keep = () => ({ base: base.slice(), vb: vb.slice() });
  return { paint, overlay, scale, lw, zoomTo, keep };
}
