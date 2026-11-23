/* 根拠ボード：見積の根拠を1枚にまとめた書類（パナソニックの間配りボードに倣った物）。
 * 図面の実線に、部屋にした区画・ゾーン（部屋の候補）・辞書で拾った物の印を重ね、
 * 部屋ごとの仕上げと数量の根拠、合計（税込）を並べる。お客様や現場に
 * 「なぜこの金額・数量なのか」を1枚で説明するための紙。
 * 表示・印刷だけ：案件のデータは一切変えない（読むだけ）。
 * 中身の組み立ては純粋な関数に分けて tests/board.test.mjs で確かめる。
 * 画面側でしか取れない材料（辞書の判定 symList・ゾーンの色 zoneEntries・仕上げの名前）は
 * 呼び出し側（js/docs.js）が deps として渡す */
import { totals, roomGeom, lineBasis, MEASURES } from './calc.js';
import { esc, yen, fmt, today } from './ui.js';
import { roomColor } from './planview.js';

/* ---------- 図面（実線＋重ね） ----------
 * planview.js の全体表示と同じ物差し（線の端の 1%〜99% を芯にして枠を決める）で、
 * 印刷用に静かな色で描く。rooms：部屋にした区画（色塗り＋名前＋床面積）。
 * zones：zoneEntries の形（{poly,color,op} と {label,lx,ly,color}）。
 * syms：辞書の判定の印（{b,color,label,sub}。b は mm ではなく図面の単位＝m） */
export function boardPlanSvg(plan, rooms = [], zones = [], syms = []) {
  if (!plan || !(plan.segs || []).length) return '';
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
  (plan.faces || []).forEach(f => (f.poly || []).forEach(p => add(p[0], p[1])));
  if (!isFinite(minX)) { minX = minY = 0; maxX = maxY = 1; }
  const W = Math.max(1, maxX - minX), H = Math.max(1, maxY - minY), pad = Math.max(W, H) * 0.04;
  const vb = [minX - pad, -maxY - pad, W + pad * 2, H + pad * 2];
  const lw = Math.max(W, H) / 900, fs = Math.max(W, H) / 60;
  const pathOf = S => S.map(s => `M${s[0]} ${-s[1]}L${s[2]} ${-s[3]}`).join('');
  const byI = new Map((plan.faces || []).map(f => [f.i, f]));
  const pts = P => P.map(p => p[0] + ',' + -p[1]).join(' ');
  /* 文字には白い縁取り（halo）を付けて、色塗りや印と重なっても読めるようにする。
   * 描く順番：ゾーンと部屋の色塗り→実線→器具の印→ゾーン名→部屋名（文字は最後） */
  const halo = fz => `paint-order:stroke;stroke:#fff;stroke-width:${fz * 0.24};stroke-linejoin:round`;
  const zoneFill = zones.filter(e => e.poly).map(e => `<polygon points="${pts(e.poly)}" fill="${e.color}" fill-opacity="${e.op != null ? e.op : 0.15}"/>`).join('');
  const zoneName = zones.filter(e => !e.poly && e.label).map(e => `<text x="${e.lx}" y="${-e.ly}" font-size="${lw * 13}" text-anchor="middle" dominant-baseline="central" fill="${e.color}" font-weight="700" style="${halo(lw * 13)}">${esc(e.label)}</text>`).join('');
  /* 部屋：区画を部屋の色で塗る。名前は一番広い区画の真ん中に、床面積と一緒に */
  const roomFill = [], roomName = [];
  rooms.forEach(r => {
    const F = (r.faces || []).map(i => byI.get(i)).filter(f => f && f.poly);
    if (!F.length) return;
    roomFill.push(F.map(f => `<polygon points="${pts(f.poly)}" fill="${roomColor(r.color)}" fill-opacity="0.30" stroke="${roomColor(r.color)}" stroke-opacity="0.65" stroke-width="${lw * 1.6}"/>`).join(''));
    const big = F.reduce((a, b) => (b.area > a.area ? b : a));
    const bx = big.poly.map(q => q[0]), bw = Math.max(...bx) - Math.min(...bx);
    const fz = Math.max(0.02, Math.min(fs, bw / (String(r.name || '').length + 1.5)));
    roomName.push(`<text x="${big.cx}" y="${-big.cy}" font-size="${fz}" text-anchor="middle" fill="#111" font-weight="700" style="${halo(fz)}">${esc(r.name || '')}<tspan x="${big.cx}" dy="1.15em" font-weight="400" font-size="0.8em">${fmt(r.floor)}㎡</tspan></text>`);
  });
  /* 辞書の印：判定の色の枠＋名前。器具は今の判定（表示タイプ）を下に小さく併記する */
  const symSvg = syms.filter(s => s && s.b).map(s => {
    const [x0, y0, x1, y1] = s.b, p = lw * 3, w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = -(y0 + y1) / 2;
    const fz = Math.max(0.09, Math.min(0.2, Math.min(w, h) * 0.42));
    return `<g><rect x="${x0 - p}" y="${-y1 - p}" width="${w + p * 2}" height="${h + p * 2}" rx="${lw * 3}" fill="${s.color}" fill-opacity=".20" stroke="${s.color}" stroke-width="${lw * 2}"/>
      <text x="${cx}" y="${cy}" font-size="${fz}" text-anchor="middle" dominant-baseline="central" fill="${s.color}" font-weight="700" style="${halo(fz)}">${esc(s.label || '')}${s.sub ? `<tspan x="${cx}" dy="1.25em" font-size="0.72em" font-weight="400">${esc(s.sub)}</tspan>` : ''}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" style="width:100%;height:auto;display:block;border:1px solid #888" font-family="sans-serif">
    <rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="#fff"/>
    ${zoneFill}${roomFill.join('')}
    <path d="${pathOf(plan.dsegs || [])}" fill="none" stroke="#bbb" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"/>
    <path d="${pathOf(plan.segs)}" fill="none" stroke="#222" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linecap="round" opacity=".85"/>
    ${symSvg}${zoneName}${roomName.join('')}</svg>`;
}

/* ---------- 部屋ごとの行 ----------
 * finOf(room) は呼び出し側が用意する：{ fF, wF, cF, bF } に仕上げの品目名（未設定は ''）。
 * 数量の根拠は roomGeom の内訳＋、この部屋を含む「部屋から出す行」（lineBasis）の寄与分。
 * 手で入れた行・配管の行などは部屋に分けられないので載せない（見積書・内訳書を見る） */
export function boardRoomRows(p, o, finOf) {
  const rooms = p.rooms || [], lines = p.lines || [];
  const perRoom = new Map(rooms.map(r => [r.id, []]));
  lines.forEach(l => {
    let b = null; try { b = lineBasis(l, rooms, o, lines); } catch (e) { b = null; }
    if (!b || b.type !== 'room') return;
    const unit = (MEASURES[b.measure] || {}).unit || '';
    b.rows.forEach(row => { if (row.v > 0 && perRoom.has(row.id)) perRoom.get(row.id).push(`${l.name || ''}：${fmt(row.v, 3)}${unit}`); });
  });
  return rooms.map(r => {
    const g = roomGeom(r, o), f = finOf ? finOf(r) || {} : {};
    return { name: r.name || '', qty: g.qty, floor: g.floor, wall: g.wall, ceil: g.ceil, base: g.base, h: g.h, openings: g.openings,
      fin: { floor: f.fF || '', wall: f.wF || '', ceil: f.cF || '', base: f.bF || '' }, basis: perRoom.get(r.id) || [] };
  });
}

/* ---------- ボード全体 ----------
 * deps：{ syms, zones, finOf, fixCounts }（画面側の材料。無い物はその節を省く） */
export function boardHtml(p, o, deps = {}) {
  const t = totals(p, o);
  const d = p.drawing || null, plan = d && d.plan ? d.plan : null;
  const rows = boardRoomRows(p, o, deps.finOf);
  const syms = deps.syms || [];
  const cnt = { hit: 0, near: 0, unknown: 0 }; syms.forEach(s => { if (cnt[s.v] != null) cnt[s.v]++; });
  const planRooms = (p.rooms || []).filter(r => r.src === 'plan' && (r.faces || []).length)
    .map(r => ({ name: r.name, color: r.color, faces: r.faces, floor: roomGeom(r, o).floor }));
  const svg = plan ? boardPlanSvg(plan, planRooms, deps.zones || [], syms) : '';
  const finCell = f => {
    const parts = [['床', f.floor], ['壁', f.wall], ['天井', f.ceil], ['巾木', f.base]].filter(([, v]) => v);
    return parts.length ? parts.map(([k, v]) => `${k}：${esc(v)}`).join('<br>') : '<span style="color:#a00">まだ決まっていません</span>';
  };
  const basisCell = r => {
    const head = `床 ${fmt(r.floor)}㎡・壁 ${fmt(r.wall)}㎡・天井 ${fmt(r.ceil)}㎡・巾木 ${fmt(r.base)}m${r.openings > 0 ? `（開口 −${fmt(r.openings)}㎡）` : ''}`;
    return head + (r.basis.length ? '<br>' + r.basis.map(esc).join('<br>') : '');
  };
  return `<div class="doc"><h1 style="letter-spacing:.3em">根拠ボード</h1>
    <table class="meta"><tr><td>件名</td><td>${esc(p.name || '')}</td></tr><tr><td>お客様</td><td>${esc(p.customer || '')}${p.customer ? ' 様' : ''}</td></tr><tr><td>作成日</td><td>${today()}</td></tr></table>
    <div class="amount"><span>御見積金額（税込）</span><b>${yen(t.grand)}</b></div>
    ${plan ? `<h2>図面と拾いの結果</h2>${svg}
      <p style="font-size:9pt;margin:6px 0 0">色の付いた区画が、部屋にした所です（名前と床面積）。薄く色の付いた範囲と名前は、ゾーン分け（部屋の候補）です。
      器具・家具の印は辞書の判定で、<span style="color:#3ccf8e"><b>■</b></span>検出 ${cnt.hit}・<span style="color:#ffb020"><b>■</b></span>類似 ${cnt.near}・<span style="color:#9aa7b8"><b>■</b></span>不明 ${cnt.unknown}。
      「類似」「不明」は確定ではないので、現場で確かめてください。器具の印の下の小さい字は、今の判定（明細に入れる時の種類）です。</p>`
    : '<h2>図面と拾いの結果</h2><p style="font-size:9.5pt">図面は読み込まれていません（部屋と金額の根拠だけを出しています）。</p>'}
    ${(deps.fixCounts || []).length ? `<h2>設備の器具（図面で数えた数）</h2>
    <table class="items"><thead><tr><th>器具</th><th style="width:20%">数</th></tr></thead><tbody>
      ${deps.fixCounts.map(x => `<tr><td>${esc(x.name)}</td><td class="r">${x.n}</td></tr>`).join('')}</tbody></table>` : ''}
    <h2>部屋ごとの仕上げと数量の根拠</h2>
    <table class="items"><thead><tr><th>部屋</th><th style="width:11%">床 ㎡</th><th style="width:11%">天井高 m</th><th style="width:30%">仕上げ（決めてある物）</th><th>数量の根拠</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.name)}${r.qty > 1 ? ` ×${r.qty}` : ''}</td><td class="r">${fmt(r.floor)}</td><td class="r">${fmt(r.h)}</td><td style="font-size:9pt">${finCell(r.fin)}</td><td style="font-size:9pt">${basisCell(r)}</td></tr>`).join('') || '<tr><td colspan="5">部屋がまだありません</td></tr>'}
    </tbody></table>
    <p style="font-size:9pt;margin-top:6px">数量の根拠は、部屋の面積・長さから出す行だけを部屋ごとに分けた物です。手で入れた行・配管の行などは分けられないので、見積書・内訳書を見てください。金額は見積書と同じ計算です（この紙で金額は変わりません）。</p>
    <p style="font-size:8.5pt;margin-top:8px">${esc(p.name || '')}　${today()} に KAKU で作成</p></div>`;
}
