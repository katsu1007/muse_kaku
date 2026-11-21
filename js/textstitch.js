/* DXF の文字つなぎ（自前実装。外部の部品は使わない）。
 * 一部の DXF は、言葉を1文字ずつの TEXT で描く（日本モウルド工業（株）本社工場事務所棟の図面では
 * 部屋名も表題欄も1文字ずつで、文字の41%が1文字だけの文字だった）。読み取り（RG.texts）は
 * そのまま渡してくるので、アプリ側では単語に戻らないと部屋名が判定の材料にならない。
 * ここでは「並びの幾何」だけでつなぐ：同じ行（または同じ列）に、文字の進み幅に合う等間隔で
 * 並んだ1〜2文字の断片を、読み順に1つの言葉に戻す。文字の高さ・回転は読み取りから来ないので使わない。
 *
 * 守ること（誤ってつないで意味を変えない）：
 *   ・数字と区切りだけの並びはつながない（寸法の数字どうしは別の数字。日付も同じ）
 *   ・すでに言葉になっている文字（3文字以上）には触らない。寸法・日付・CH=… などはそのまま
 *   ・間隔がそろわない所、行・列がずれる所では必ず切る
 *   ・空白で空いた1マス分だけは、並びが3文字以上続いている時だけ越える（表題欄の名前が
 *     「株式会社　本社工場」のように空白で区切られて1文字ずつ描かれるため。2回まで）
 *   ・元の文字は壊さない。呼び出し側が元の並びを rawTexts として残し、ここは新しい並びを返す。
 *     つないだ文字には src:'stitched' と from（何個の文字からできたか）を付ける。
 * 入力・出力とも {t, x, y}（m）。座標は最初の文字の位置をそのまま使う（言葉の置き場所）。 */
const cpLen = s => [...s].length;

export const normalizeStitchText = s => String(s ?? '')
  .replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
  .replace(/[　\s]+/g, ' ').trim();

const DIGITS_ONLY = /^[\d,./:+-]+$/;   // 寸法・日付・時刻の形（これだけの並びはつながない）
const ASCII_ONLY = /^[A-Za-z]+$/;      // 英字だけの断片（AC・fm のような独立した札）
const BRACKET = /^[（(）)]$/;          // 括弧は進み幅が狭い（実測で通常の6割ほど）
const MAX_JOIN = 40;                   // これより長くなる並びは言葉ではないと見る
const LINE_TOL = 0.08;                 // 同じ行・列とみなすずれ（m）
const GAP_MIN = 0.08;                  // 1文字の進み幅の下限（m。実測は 0.30〜0.40、縦書きは 0.65）
const UNIT_MAX = 0.8;                  // 進み幅の上限（1文字の断片から始まる並び）
const UNIT_MAX_MULTI = 0.6;            // 2文字の断片から始まる並びの上限（「AC」のような独立した札と
                                       // 言葉の頭が並んだだけの並びを、進み幅の単位と誤らないため）
const PITCH_TOL = 0.35;                // 間隔のばらつきの許容（進み幅の割合）
const SKIP_TOL = 0.2;                  // 空きマスを越える時の許容（通常より厳しく。2マス分に近い時だけ）
const MAX_SKIPS = 2;                   // 空白の空きマスを越える回数の上限

/* 1方向のつなぎ。items: [{t,x,y,k,len}]（候補だけ）、axis: 'x'（横書き）|'y'（縦書き）。
 * 戻り：[{pieces:[item…], t}]（pieces は読み順）。使った item の k は used に入れる */
function chainAxis(items, axis, used) {
  const along = axis === 'x' ? t => t.x : t => -t.y;      // 読み進む向きの座標（縦書きは上→下）
  const line = axis === 'x' ? t => t.y : t => t.x;        // 行・列を決める座標
  const sorted = items.filter(t => !used.has(t.k)).sort((a, b) => line(a) - line(b) || along(a) - along(b));
  /* 行（列）ごとに分ける：line の差が LINE_TOL 以内なら同じ行 */
  const rows = [];
  for (const t of sorted) {
    const r = rows[rows.length - 1];
    if (r && Math.abs(line(t) - r.line0) <= LINE_TOL) r.mem.push(t);
    else rows.push({ line0: line(t), mem: [t] });
  }
  const runs = [];
  for (const r of rows) {
    const mem = r.mem.sort((a, b) => along(a) - along(b));
    let run = [], unit = 0, skips = 0;
    const flush = () => {
      if (run.length >= 2) {
        const s = run.map(t => t.t).join('');
        /* 数字だけの並びと、同じ2文字の繰り返し（並んだ札）は言葉にしない。
           数字の断片と英字だけの断片の混ざり（「0」と「fm」のような、表の隣の欄どうし）もつながない */
        const mixed = run.some(t => /\d/.test(t.t) && DIGITS_ONLY.test(t.t)) && run.some(t => ASCII_ONLY.test(t.t));
        if (!DIGITS_ONLY.test(s) && !mixed && !(run[0].len >= 2 && run.every(t => t.t === run[0].t))) {
          run.forEach(t => used.add(t.k));
          runs.push({ pieces: run, t: s });
        }
      }
      run = []; unit = 0; skips = 0;
    };
    for (const t of mem) {
      if (used.has(t.k)) { flush(); continue; }
      if (!run.length) { run = [t]; continue; }
      const prev = run[run.length - 1], gap = along(t) - along(prev);
      if (!unit) {   // 2つ目：この間隔が進み幅の単位になる
        const u = gap / prev.len, cap = prev.len >= 2 ? UNIT_MAX_MULTI : UNIT_MAX;
        if (u >= GAP_MIN && u <= cap && Math.abs(line(t) - line(run[0])) <= LINE_TOL * 1.25) { run.push(t); unit = u; }
        else { flush(); run = [t]; }
        continue;
      }
      const want = prev.len * unit;
      if (Math.abs(gap - want) <= want * PITCH_TOL) { run.push(t); continue; }
      /* 括弧の前後は進み幅が狭い（実測 0.25 対 0.40）ので、括弧が絡む間隔は狭い方でも受ける */
      if ((BRACKET.test(prev.t) || BRACKET.test(t.t)) && Math.abs(gap - want * 0.625) <= want * 0.25) { run.push(t); continue; }
      /* 空白で1マス空いた所：並びが育っている時だけ、単位が合えば越える */
      const wantSkip = (prev.len + 1) * unit;
      if (skips < MAX_SKIPS && run.length >= 3 && Math.abs(gap - wantSkip) <= wantSkip * SKIP_TOL) { run.push(t); skips++; continue; }
      flush(); run = [t];
    }
    flush();
  }
  return runs;
}

/* 文字の並びを、つないだ言葉入りの新しい並びに変える。
 * 戻り：{ texts:[…], joined:つないでできた言葉の数, parts:つながれた元の文字の数 } */
export function stitchTexts(input = []) {
  const T = [];
  (input || []).forEach((t, k) => {
    if (!t) return;
    const s = normalizeStitchText(t.t != null ? t.t : t.s);
    if (!s) return;
    T.push({ raw: t, t: s, x: +t.x, y: +t.y, k, len: cpLen(s) });
  });
  const cand = T.filter(t => t.len <= 2);
  const used = new Set();
  const runs = [...chainAxis(cand, 'x', used), ...chainAxis(cand, 'y', used)];
  const byFirst = new Map(), member = new Set();
  let parts = 0;
  for (const r of runs) {
    if (cpLen(r.t) > MAX_JOIN) continue;
    r.pieces.forEach(t => member.add(t.k));
    byFirst.set(r.pieces[0].k, r);
    parts += r.pieces.length;
  }
  const out = [];
  for (const t of T) {
    if (byFirst.has(t.k)) {
      const r = byFirst.get(t.k), f = r.pieces[0];
      out.push({ ...f.raw, t: r.t, x: f.x, y: f.y, src: 'stitched', from: r.pieces.length });
    } else if (!member.has(t.k)) out.push({ ...t.raw, t: t.t, x: t.x, y: t.y });
  }
  return { texts: out, joined: byFirst.size, parts };
}
