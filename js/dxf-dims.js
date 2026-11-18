/* DXF の寸法（DIMENSION）を別に拾う — 読み取りエンジン（old/index.html）は DIMENSION を
 * 素通りして線にも文字にもしないので、図面に書かれた寸法の値がどこにも残らなかった。
 * ここはエンジンに手を入れず、同じファイルのバイト列から寸法だけを抜く独立した部品。
 * 返すのは表示専用の覚え書きで、区画・器具・部屋・見積の数字には一切使わない。
 *   戻り値: [{ type, value, text, x, y }]
 *     type  linear / aligned / angular / radius / diameter / ordinate（70 の下位3ビット）
 *     value 実測値。長さは mm（$INSUNITS を mm に換算）、角度は度
 *     text  表示文字（1 の上書きがあればそれ、無ければ実測値から作る。'<>' は実測値に置換）
 *     x, y  文字の位置（11/21、mm。無ければ定義点 10/20）
 * 実測値は 42 があればそれを使う（-1 は「未記録」の番兵なので使わない）。
 * 無ければ定義点（13/23・14/24・15/25・10/20 と角度 50）から DXF の意味どおりに求める。
 * 拾うのは ENTITIES セクションの寸法だけ（ブロック定義の中の寸法は図面の寸法ではない）。 */

/* $INSUNITS（単位コード）→ mm への換算 */
const UNIT_TO_MM = { 0: 1, 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000, 8: 0.0254, 10: 914.4 };

/* 70 の下位3ビット → 種別名（5 は3点角度で、表示上の種別は angular にまとめる） */
const DIM_TYPES = ['linear', 'aligned', 'angular', 'diameter', 'radius', 'angular', 'ordinate'];

/* \U+XXXX のエスケープを文字に戻す（エンジンの KE_U と同じ扱い） */
const dxfUnesc = s => String(s == null ? '' : s).replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

function toText(input) {
  if (typeof input === 'string') return input;
  let buf = null;
  if (input instanceof ArrayBuffer) buf = new Uint8Array(input);
  else if (ArrayBuffer.isView(input)) buf = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (!buf) return '';
  /* エンジンと同じ順番：UTF-8 で読めなければ Shift_JIS */
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { /* Shift_JIS で読み直す */ }
  try { return new TextDecoder('shift_jis').decode(buf); } catch (e) { return ''; }
}

/* コードと値の組に分ける（DXF は2行で1組） */
function pairsOf(text) {
  const ln = String(text).split(/\r?\n/);
  const out = [];
  for (let i = 0; i + 1 < ln.length; i += 2) {
    const code = parseInt(ln[i].trim(), 10);
    if (Number.isFinite(code)) out.push([code, ln[i + 1]]);
  }
  return out;
}

const angleBetweenDeg = (ax, ay, bx, by) => {
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (!la || !lb) return NaN;
  const c = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (la * lb)));
  return Math.acos(c) * 180 / Math.PI;
};

/* 定義点から実測値を求める。長さは mm（factor 換算済みの点を渡す）、角度は度。
 * 求められない時は NaN（呼び出し側で 0 として保持する） */
function measureFromPoints(code, flags, def, p1, p2, p3, angleDeg) {
  const dist = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : NaN);
  switch (code) {
    case 0: { /* linear：第1・第2原点を結ぶベクトルの、寸法線方向（50）への射影 */
      if (!p1 || !p2) return NaN;
      const t = angleDeg * Math.PI / 180;
      return Math.abs((p2[0] - p1[0]) * Math.cos(t) + (p2[1] - p1[1]) * Math.sin(t));
    }
    case 1: return dist(p1, p2); /* aligned：2原点の距離 */
    case 2: /* angular：直線1＝定義点1→2、直線2＝定義点3→定義点 のなす角 */
      if (!p1 || !p2 || !p3) return NaN;
      return angleBetweenDeg(p2[0] - p1[0], p2[1] - p1[1], def[0] - p3[0], def[1] - p3[1]);
    case 5: /* angular（3点）：定義点を頂点に、定義点1と定義点3のなす角 */
      if (!p1 || !p3) return NaN;
      return angleBetweenDeg(p1[0] - def[0], p1[1] - def[1], p3[0] - def[0], p3[1] - def[1]);
    case 3: return 2 * dist(def, p3); /* diameter */
    case 4: return dist(def, p3); /* radius */
    case 6: /* ordinate：70 のビット6が立つと X 座標寸法、なければ Y。計測点は定義点2（14/24） */
      if (!p2) return NaN;
      return (flags & 64) !== 0 ? Math.abs(p2[0] - def[0]) : Math.abs(p2[1] - def[1]);
    default: return NaN;
  }
}

/* 実測値から表示文字を作る（上書きが無い時）。長さは小数2位まで、不要な 0 は落とす */
function formatValue(type, value) {
  const n = Math.round(value * 100) / 100;
  const s = Number.isInteger(n) ? String(n) : String(n);
  if (type === 'angular') return s + '°';
  if (type === 'radius') return 'R' + s;
  if (type === 'diameter') return '⌀' + s;
  return s;
}

const r2 = v => Math.round(v * 100) / 100;
const r3 = v => Math.round(v * 1000) / 1000;

/* DXF（文字列・ArrayBuffer・Uint8Array）から寸法を抜く。読めなければ [] */
export function extractDxfDims(input) {
  const text = toText(input);
  if (!text) return [];
  const pairs = pairsOf(text);
  /* $INSUNITS：HEADER にある単位コード（9 の次に来る 70） */
  let factor = 1;
  for (let i = 0; i + 1 < pairs.length; i++) {
    if (pairs[i][0] === 9 && pairs[i][1].trim() === '$INSUNITS') {
      for (let j = i + 1; j < Math.min(i + 6, pairs.length); j++) {
        if (pairs[j][0] === 70) { const u = parseInt(pairs[j][1], 10); if (UNIT_TO_MM[u] !== undefined) factor = UNIT_TO_MM[u]; break; }
      }
      break;
    }
  }
  const dims = [];
  let section = '', ent = null, wantSectionName = false;
  const flush = () => {
    if (!ent || ent.type !== 'DIMENSION' || !ent.inSec) { ent = null; return; }
    const g = ent.g;
    const num = (c, dflt) => { const v = g.get(c); const n = v === undefined ? NaN : parseFloat(v); return Number.isFinite(n) ? n : dflt; };
    const pt = (xc, yc, scale) => { const x = num(xc, NaN), y = num(yc, NaN); return Number.isFinite(x) && Number.isFinite(y) ? [x * scale, y * scale] : null; };
    const flags = Math.trunc(num(70, 0));
    const code = flags & 7;
    const type = DIM_TYPES[code] || 'linear';
    const angular = type === 'angular';
    const def = pt(10, 20, factor) || [0, 0];
    const p1 = pt(13, 23, factor), p2 = pt(14, 24, factor), p3 = pt(15, 25, factor);
    const angle = num(50, 0);
    const stored = num(42, NaN);
    let value;
    if (Number.isFinite(stored) && stored !== -1) value = angular ? stored : stored * factor;
    else value = measureFromPoints(code, flags, def, p1, p2, p3, angle);
    if (!Number.isFinite(value)) value = 0;
    value = r2(value);
    const mid = pt(11, 21, 1);
    const xy = mid || pt(10, 20, 1) || [0, 0];
    let label = dxfUnesc(g.get(1) || '').trim();
    if (label.includes('<>')) label = label.replace(/<>/g, formatValue(type, value));
    if (!label) label = formatValue(type, value);
    dims.push({ type, value, text: label, x: r3(xy[0] * factor), y: r3(xy[1] * factor) });
    ent = null;
  };
  for (let i = 0; i < pairs.length; i++) {
    const [c, v] = pairs[i];
    if (c === 0) {
      const name = v.trim();
      if (name === 'SECTION') { flush(); wantSectionName = true; continue; }
      if (name === 'ENDSEC') { flush(); section = ''; continue; }
      flush();
      ent = { type: name, inSec: section === 'ENTITIES', g: new Map() };
      continue;
    }
    if (c === 2 && wantSectionName) { section = v.trim(); wantSectionName = false; continue; }
    if (ent && ent.inSec && !ent.g.has(c)) ent.g.set(c, v);
  }
  flush();
  return dims;
}
