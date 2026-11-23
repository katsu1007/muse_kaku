/* 数量の出どころ（表示だけの判定。案件データは読むだけで、計算・保存には一切触らない）。
 * 見積の行ごとに「その数量がどこから来たか」を、保存してある材料だけで言い当てる。
 *   drawing: 図面から     — 図面の部屋・器具・壁から自動で数えた
 *   edited:  図面＋手直し — 図面が元だが、人が数を変えた・部屋を直した跡がある
 *   manual:  手入力       — 数量も、もとになる部屋の寸法も、人が入れた
 *   none:    元になる行なし — 廃材の行で、もとになる解体の行が無い（数量は0。
 *             出どころを言い当てられないので、無いとそのまま出す）
 * 判定は表示のたびに材料から導く（保存はしない）。古い保存の案件でもそのまま出せる。
 * 材料が無い・言い当てられない時は、決めつけずに理由へ書く。 */
import { isRoomBased, wasteRows, DEFAULTS } from './calc.js';

export const PROVENANCE = Object.freeze({
  drawing: { label: '図面から', cls: 'info' },
  edited: { label: '図面＋手直し', cls: 'warn' },
  manual: { label: '手入力', cls: '' },
  none: { label: '元になる行なし', cls: '' }
});

const num = v => { const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : Number(v); return Number.isFinite(n) ? n : 0; };
const planSrc = r => r.src === 'plan' || r.src === 'plan-old';

/* 図面の部屋を人が直した跡（作った直後の部屋には無い物だけを見る。
 * 天井高は図面の文字から自動で入ることもあるので見ない） */
function roomEdited(r, faceFix) {
  if (r.shape !== 'free') return '形を四角に変えてある';           // 区画から作った部屋は free のはず
  const q = r.qty === '' || r.qty == null ? 1 : num(r.qty);
  if (q !== 1) return '同じ部屋の数を変えてある';
  if (num(r.doors) > 0) return 'ドアの数を手で入れている';
  if (num(r.winCount) > 0) return '窓の数を手で入れている';
  if ((r.windows || []).length) return '窓を寸法で入れている';
  if (r.openOff) return '図面のドア・開口を引かない設定にしている';
  if (faceFix && (r.faces || []).some(i => faceFix[i])) return '区画の辺を実線に直してある';
  return '';
}

/* 行の出どころ。fixCounts は { 種類: 図面で数えた数 }（fixLinesDialog と同じ数え方）。
 * 器具の材料が無い案件では null を渡す（fromFix の行は「図面から」で出す）。
 * 戻り値 { key, label, reason } */
export function lineProvenance(line, project, fixCounts = null, depth = 0) {
  const p = project || {}, rooms = p.rooms || [], lines = p.lines || [];
  const done = (key, reason) => ({ key, label: PROVENANCE[key].label, reason });

  /* 図面の器具の数から入れた行：今の図面の数と比べる（数が違えば人が変えた） */
  if (line.fromFix) {
    if (fixCounts) {
      const c = fixCounts[line.fromFix] || 0;
      if (num(line.qty) === c) return done('drawing', '図面の器具の数から入れた行で、数も図面と一致しています');
      return done('edited', `図面の器具は今 ${c} 個ですが、この行は ${num(line.qty)} 個になっています`);
    }
    return done('drawing', '図面の器具の数から入れた行です');
  }
  /* 図面で入れた壁・解体から自動で作った行（図面を直すと数量も作り直される） */
  if (line.fromDemo) return done('drawing', '図面で入れた物から自動で作った行です');

  const b = line.basis || {};
  /* 配管の長さから数える行：元の行の出どころに付く */
  if (b.measure === 'link') {
    const par = lines.find(x => x.id === b.line);
    if (par && depth < 4) { const r = lineProvenance(par, p, fixCounts, depth + 1); return done(r.key, `元の配管の行が「${r.label}」なので、それに付きます`); }
    return done('manual', '元の配管の行がありません');
  }
  /* 廃材の行：もとになる解体の行の出どころを合わせる */
  if (b.measure === 'waste') {
    let src = [];
    try { src = wasteRows(line, rooms, DEFAULTS, lines).map(x => lines.find(l => l.id === x.id)).filter(Boolean); } catch (e) { src = []; }
    if (!src.length) return done('none', 'もとになる解体の行がありません');
    const keys = src.map(l => lineProvenance(l, p, fixCounts, depth + 1).key);
    if (keys.every(k => k === 'drawing')) return done('drawing', 'もとになる解体の行が、全部「図面から」です');
    if (keys.every(k => k === 'manual')) return done('manual', 'もとになる解体の行が、全部「手入力」です');
    return done('edited', 'もとになる解体の行に、図面以外の分が混ざっています');
  }
  /* 部屋から数える行：使う部屋の出どころで決める */
  if (isRoomBased(line)) {
    const ids = b.rooms === 'all' || !Array.isArray(b.rooms) ? null : new Set(b.rooms);
    const use = rooms.filter(r => !ids || ids.has(r.id));
    if (!use.length) return done('manual', '使う部屋が選ばれていません');
    const plan = use.filter(planSrc), hand = use.filter(r => !planSrc(r));
    if (!plan.length) return done('manual', '手で作った部屋の寸法から計算しています');
    if (hand.length) return done('edited', '図面の部屋と、手で作った部屋の両方から計算しています');
    const faceFix = (p.drawing && p.drawing.faceFix) || null;
    for (const r of plan) { const why = roomEdited(r, faceFix); if (why) return done('edited', `図面の部屋「${r.name || '名前なし'}」は、${why}ため`); }
    return done('drawing', '図面の区画から作った部屋の寸法から計算しています');
  }
  /* それ以外は、数量を手で入れた行 */
  return done('manual', line.pipe ? '長さを手で入れた行です' : '数量を手で入れた行です');
}
