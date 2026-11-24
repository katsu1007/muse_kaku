/* 新しい読み取り・段階2：文字を整える・つなぐ・分ける（画面に触らない。tests/reader2.test.mjs でテスト）。
 *   ・1文字ずつ別々に描かれた文字（「事」「務」「室」が等間隔に並ぶ）を、1つの言葉に戻す。横書きも縦書きも
 *   ・「\U+XXXX」と書かれた文字を元の字に戻す、全角の英数字を半角にする
 *   ・文字を種類に分ける：部屋名／天井高／表題欄／品番／器具の名前／寸法の数字／その他
 *   ・表の中の「器具の名前」と、同じ行の「品番」を組にする（設備機器の表）
 * 元の文字は壊さない（つないだ結果は新しい文字として返し、いくつの文字からつないだかを残す）。
 * 寸法の数字どうしはつながない（寸法線の上の別々の数字なので、つなぐと意味のない数字になる）。
 * 入力の文字は {t, x, y}（m）。今の読み取りからは文字の大きさ・向きが来ないので、並びの間隔だけで判断する */
import { ROOMISH_RE } from './frame.js';
import { roomNameEn, itemLabelEn } from '../textdict.js';

const TITLE_RE = /工事名|図面名|図\s*番|縮\s*尺|SCALE|DATE|承\s*認|設\s*計|製\s*図|検\s*図|作\s*成|TITLE/i;
/* 「金型作成室」「設計室」のように、表題欄の役職の言葉（作成・設計・製図・検図）を含んでいても
 * 「〜室」で終わる部屋名は部屋名として扱う。役職以外の表題欄キーワード（工事名・縮尺・承認など）を
 * 含む物と、「作成者」「作成日」「作成図」のような室で終わらない物は、従来通り表題欄の言葉にする */
const TITLE_HARD_RE = /工事名|図面名|図\s*番|縮\s*尺|SCALE|DATE|承\s*認|TITLE/i;
const ROOM_END_RE = /室(?:[（(][^（）()]*[）)])?$/;
const CH_RE = /CH\s*[=＝:：]?\s*[≒≈]?\s*\d/i;
/* 品番らしい文字：英字と数字が続く（CS232B、UFH507CR、TCF6624 など）。メーカー名が括弧で付く物も */
export const MODEL_RE = /[A-Z]{1,}[0-9]{2,}|[0-9]{2,}[A-Z]{1,}|[（(](TOTO|LIXIL|INAX|パナソニック|Panasonic|三菱|コマニー|サンゲツ|東リ)[）)]/;
export const ITEM_RE = /大便器|小便器|紙巻器|洗面|手洗|化粧鏡|水栓|温水器|ウォシュレット|ｳｫｼｭﾚｯﾄ|便座|ディスペンサー|ﾃﾞｨｽﾍﾟﾝｻｰ|ハンドドライヤー|ﾊﾝﾄﾞ|ﾄﾞﾗｲﾔｰ|照明器具|換気扇|SK|ＳＫ|流し|浴槽|キッチン|手すり|手摺|小物入|ブース/;
const DIM_RE = /^[\d,]{2,7}(\.\d+)?$/;

export const normalizeText = s => String(s ?? '')
  .replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
  .replace(/[　\s]+/g, ' ').trim();

export function classify(t) {
  const n = String(t || '');
  if (CH_RE.test(n)) return 'ch';
  if (TITLE_RE.test(n)) {
    /* 「〜室」で終わる部屋名に役職の言葉が混ざる物（金型作成室など）は表題欄にしない。部屋名の判定に進む */
    if (!(n.length <= 16 && ROOMISH_RE.test(n) && ROOM_END_RE.test(n) && !TITLE_HARD_RE.test(n))) return 'title';
  }
  if (DIM_RE.test(n.replace(/\s/g, ''))) return 'dim';
  if (MODEL_RE.test(n)) return 'model';
  if (ITEM_RE.test(n)) return 'item';
  /* 文の辞書（js/textdict.js・英語の器具ラベル）：単語境界の全体一致でだけ拾う。
   * ただし「WC」は部屋名を優先する（単独の WC は従来どおり部屋名。item 側の WC は
   * 詳細図・機器表の文脈専用で、ここでは奪わない） */
  const ien = itemLabelEn(n);
  if (ien && ien.canonical !== '洋式大便器') return 'item';
  if (n.length <= 16 && ROOMISH_RE.test(n)) return 'room';
  /* 文の辞書（英語の部屋名）：全体一致（＋末尾の数字1つまで）でだけ拾う */
  if (roomNameEn(n)) return 'room';
  return 'other';
}

/* 1〜2文字の文字が、同じ高さ（または同じ横位置）で等間隔に並んでいれば、1つの言葉につなぐ。
 * 間隔は 5cm〜1.2m、並びの中で間隔のばらつきが 30% 以内。数字だけの並びはつながない。
 * 戻り：{ texts:[{t,x,y,from?}], joined:つないでできた言葉の数, parts:つながれた元の文字の数 } */
export function joinTexts(input = []) {
  const T = input.filter(t => t && String(t.t || '').trim()).map((t, k) => ({ t: normalizeText(t.t), x: +t.x, y: +t.y, k })).filter(t => t.t);
  const short = T.filter(t => t.t.length <= 2), used = new Set(), out = [];
  const chain = (axis, sign) => {                       // axis 0＝横書き（x が増える）、1＝縦書き（y が減る）
    const pos = t => axis ? t.y * sign : t.x, line = t => axis ? t.x : t.y;
    const S = short.filter(t => !used.has(t.k)).sort((a, b) => line(a) - line(b) || pos(a) - pos(b));
    const by = new Map();
    S.forEach(t => { const key = Math.round(line(t) / 0.08); for (const kk of [key, key - 1, key + 1]) { if (by.has(kk)) { by.get(kk).push(t); return; } } by.set(key, [t]); });
    by.forEach(row => {
      row.sort((a, b) => pos(a) - pos(b));
      let run = [];
      const flush = () => {
        if (run.length >= 2) {
          const s = run.map(t => t.t).join('');
          /* 数字だけの並び（寸法）と、同じ2文字のくり返し（「4L」「4L」…のような並んだ札）はつながない */
          if (!/^[\d,.\s]+$/.test(s) && !(run[0].t.length >= 2 && run.every(t => t.t === run[0].t))) { run.forEach(t => used.add(t.k)); out.push({ t: s, x: Math.round(run.reduce((a, t) => a + t.x, 0) / run.length * 1000) / 1000, y: Math.round(run.reduce((a, t) => a + t.y, 0) / run.length * 1000) / 1000, from: run.length }); }
        }
        run = [];
      };
      row.forEach(t => {
        if (!run.length) { run = [t]; return; }
        const gap = pos(t) - pos(run[run.length - 1]), p0 = run.length >= 2 ? pos(run[1]) - pos(run[0]) : gap;
        if (gap >= 0.05 && gap <= 1.2 && Math.abs(gap - p0) <= p0 * 0.3 && Math.abs(line(t) - line(run[0])) <= 0.1) run.push(t);
        else { flush(); run = [t]; }
      });
      flush();
    });
  };
  chain(0, 1); chain(1, -1);
  const rest = T.filter(t => !used.has(t.k)).map(t => ({ t: t.t, x: t.x, y: t.y }));
  return { texts: [...rest, ...out], joined: out.length, parts: used.size };
}

/* 表の中の、器具の名前と品番の組（同じ行で、名前の右にある一番近い品番）。boxes：表の場所 [[x0,y0,x1,y1]…] */
export function equipment(texts = [], boxes = []) {
  const inB = t => boxes.some(b => t.x >= b[0] && t.x <= b[2] && t.y >= b[1] && t.y <= b[3]);
  const T = texts.filter(inB), out = [];
  T.forEach(t => {
    if (classify(t.t) !== 'item') return;
    const m = T.filter(u => u !== t && MODEL_RE.test(u.t) && Math.abs(u.y - t.y) <= 0.3 && u.x > t.x && u.x - t.x <= 6).sort((a, b) => a.x - b.x)[0];
    if (m && !out.some(o => o.name === t.t && o.model === m.t)) out.push({ name: t.t, model: m.t });
  });
  return out;
}

/* 器具の種類ごとの品番（表の設備機器から）。水栓・便座などの付属品の行は、本体の品番にしない。見つからなければ '' */
const FIX_NAME = { toilet: /大便器/, urinal: /小便器/, counter: /洗面/, sink: /手洗/, slop: /^(SK|ＳＫ)|掃除/, bath: /浴槽|ユニットバス/, kitchen: /キッチン/ };
export function modelFor(type, equip = []) {
  const re = FIX_NAME[type]; if (!re) return '';
  const hit = equip.filter(e => e && re.test(e.name) && !/水栓|便座|ウォシュレット|ｳｫｼｭﾚｯﾄ|鏡/.test(e.name));
  /* 「洗面カウンター」のように長い名前の行を先に（「洗面」だけの行は見出しの一部のことがある） */
  hit.sort((a, b) => b.name.length - a.name.length);
  return hit.length ? String(hit[0].model || '').trim() : '';
}

/* 表題欄から、工事の名前・図面の名前・縮尺・日付を読む。boxes：表題欄の場所 [[x0,y0,x1,y1]…]（図面が何枚も並んでいれば何個も）。
 * 見出し（「工事名称」など）と同じ行で右にある一番近い文字、無ければすぐ下の文字を値にする。
 * 見出しの言葉が混ざった物・長すぎる物は、読み取りとして信用しない（間違った名前を出すより「読めなかった」にする）。
 * 戻り：{ project:[…], sheet:[…], scale:[…], date:[…] }（枠ごとに読めた値。同じ値は1つにまとめる） */
const TITLE_LABELS = { project: /^(工事名称|工事名|工事件名)$/, sheet: /^(図面名称|図面名)$/, scale: /^(SCALE|縮尺)$/i, date: /^(DATE|日付|作成日)$/i };
const STAMP = /PROTECTED|CONFIDENTIAL|関係者外秘|社外秘|部外秘|取扱注意/i;
const ANY_LABEL = /工事名|図面名|図面番号|SCALE|縮尺|DATE|日付|承認|審査|照査|検査|設計|製図|検図|作成|担当|No[.．]?$|^備考/i;
/* 図枠・表題欄の線が無い（または別の縮尺のグループにあって読んでいない）図面：表題欄の見出し（工事名称・図面名称・SCALE・DATE など）が
   2つ以上かたまっている所を表題欄とみる。見出しのかたまりの外の四角を、大きい方の辺の3割広げた範囲（現場トイレの JWW など） */
export function labelBoxes(texts = []) {
  const L = texts.filter(t => { const s = String(t.t).replace(/[\s\u3000]+/g, ''); return Object.values(TITLE_LABELS).some(re => re.test(s)); });
  if (L.length < 2) return [];
  const used = new Set(), out = [];
  L.forEach((a, i) => { if (used.has(i)) return; const G = [a]; used.add(i);
    for (let k = 0; k < G.length; k++) L.forEach((b, j) => { if (!used.has(j) && Math.hypot(b.x - G[k].x, b.y - G[k].y) < 6) { used.add(j); G.push(b); } });
    if (G.length < 2) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; G.forEach(t => { x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x); y1 = Math.max(y1, t.y); });
    const pd = Math.max(x1 - x0, y1 - y0, 1) * 0.3; out.push([x0 - pd, y0 - pd, x1 + pd * 2, y1 + pd]); });
  return out;
}
export function titleInfo(texts = [], boxes = []) {
  const out = { project: [], sheet: [], scale: [], date: [] };
  boxes.forEach(b => {
    const T = texts.filter(t => t.x >= b[0] && t.x <= b[2] && t.y >= b[1] && t.y <= b[3]).map(t => ({ ...t, s: String(t.t).replace(/\s+/g, '') }));
    const h = b[3] - b[1], w = b[2] - b[0];
    Object.entries(TITLE_LABELS).forEach(([k, re]) => {
      T.filter(t => re.test(t.s)).forEach(lab => {
        const ok = t => t !== lab && !ANY_LABEL.test(t.s) && t.s.length >= 2 && t.s.length <= 40;
        const right = T.filter(t => ok(t) && t.x > lab.x && t.x - lab.x <= w * 0.5 && Math.abs(t.y - lab.y) <= h * 0.12).sort((p, q) => p.x - q.x)[0];
        const below = right ? null : T.filter(t => ok(t) && lab.y - t.y > 0 && lab.y - t.y <= h * 0.35 && Math.abs(t.x - lab.x) <= w * 0.2).sort((p, q) => q.y - p.y)[0];
        const v = right || below; if (!v) return;
        let val = String(v.t).replace(/[\u3000\s]+/g, ' ').trim();
        /* 工事の名前は「日本モウルド工業株式会社」「本社工場」「事務所棟」のように切れて並ぶので、同じ行の続きをつなぐ
           （秘密の印・見出し・前の文字の終わりから 1.2m 以上のすき間で止める。字の幅は1字 0.3m とみる） */
        if (k === 'project') {
          const row = T.filter(t => t !== lab && Math.abs(t.y - v.y) <= 0.06 && t.x > v.x).sort((p, q) => p.x - q.x);
          let px = v.x, pl = v.s.length;
          for (const t of row) {
            if (ANY_LABEL.test(t.s) || STAMP.test(t.s) || t.x - (px + pl * 0.3) > 1.2) break;
            val += (/^(株式会社|有限会社|合同会社)$/.test(val) ? '' : ' ') + String(t.t).replace(/[\u3000\s]+/g, ' ').trim();
            px = t.x; pl = t.s.length;
          }
        }
        /* 値として形が合わない物は読まない：縮尺は「1/50」の形、日付は数字と区切り、名前は日本語の字を含む物 */
        const fit = k === 'scale' ? /\d\s*[\/:：]\s*\d|NON|ノンスケール/i.test(val) : k === 'date' ? /\d{2,4}\s*[.\/年-]\s*\d{1,2}/.test(val) : /[\u3040-\u30ff\u4e00-\u9fff]/.test(val);
        if (fit && !out[k].includes(val)) out[k].push(val);
      });
    });
  });
  return out;
}

/* 図枠ごとの図の名前（「1階平面図（現況）」「2階平面図（改修プラン）」など）と、今の図か改修の図か。
   図枠の表題欄の中の、図の名前らしい文字（〜図・プラン・現況・改修）を拾う。同じ行で続いている切れ端（「1階平面図(」「改修プラン)」）はつなぐ。
   入力：texts（つないだ後の文字）、frames（図枠の box の並び）、titles（表題欄の box の並び）
   出力：[{ box, title, kind: 'now'（今の図）| 'plan'（改修・計画の図）| '' }] */
const SHEET_WORD = /(平面|立面|断面|天井|展開|配置|詳細|伏|姿)図|プラン|現況|改修|計画/;
export function sheetTitles(texts = [], frames = [], titles = []) {
  return frames.map(fb => {
    const tb = titles.find(b => b[0] >= fb[0] - 0.01 && b[2] <= fb[2] + 0.01 && b[1] >= fb[1] - 0.01 && b[3] <= fb[3] + 0.01) || fb;
    const T = texts.filter(t => t.x >= tb[0] && t.x <= tb[2] && t.y >= tb[1] && t.y <= tb[3]).map(t => ({ ...t, s: String(t.t).replace(/[\s\u3000]+/g, '') }))
      .filter(t => t.s.length <= 30 && !/^※/.test(t.s) && !ANY_LABEL.test(t.s));
    const kindOf = (title) => /仕上表|仕上げ表|凡例|一覧表|求積表|特記/.test(title) ? 'table' : /改修|プラン|計画|提案|変更後/.test(title) ? 'plan' : /現況|既存|改修前/.test(title) ? 'now' : '';
    /* まず「図面名称」の欄の値：見出しの右・同じ高さか少し下に並ぶ文字を左からつなぐ */
    const lab = T.length ? texts.filter(t => t.x >= tb[0] && t.x <= tb[2] && t.y >= tb[1] && t.y <= tb[3] && TITLE_LABELS.sheet.test(String(t.t).replace(/[\s\u3000]+/g, '')))[0] : null;
    if (lab) {
      const W = (tb[2] - tb[0]) * 0.25;
      const V = T.filter(t => t.x > lab.x + 0.2 && t.x <= lab.x + W && t.y <= lab.y + 0.1 && t.y >= lab.y - 0.6 && t.s.length <= 20 && !/\d\s*[\/:：]\s*\d|\d{4}\s*[.\/年-]\s*\d/.test(t.s));
      if (V.length) {
        const y0 = V.sort((p, q) => q.s.length - p.s.length)[0].y;
        const title = V.filter(t => Math.abs(t.y - y0) <= 0.08).sort((p, q) => p.x - q.x).map(t => t.s).join('').replace(/([\u30a1-\u30f6])[-ｰ]/g, '$1ー');
        if (title) return { box: fb, title, kind: kindOf(title) };
      }
    }
    const hits = T.filter(t => SHEET_WORD.test(t.s));
    if (!hits.length) return { box: fb, title: '', kind: '' };
    /* いちばん長い物の行で、近くに続く切れ端をつなぐ */
    /* 工事の名前（「〜様 〜改修工事」）は図の名前ではない。「〜図」「〜プラン」を先に、同じなら長い方（0530 は工事名に「改修」が入っていて、図の名前に工事名を拾っていた） */
    const rank = t => (/工事|株式会社|様|御中/.test(t.s) ? 0 : 2) + (/図|プラン/.test(t.s) ? 1 : 0);
    const best = hits.sort((p, q) => rank(q) - rank(p) || q.s.length - p.s.length)[0];
    const row = T.filter(t => Math.abs(t.y - best.y) <= 0.08).sort((p, q) => p.x - q.x);
    let k = row.indexOf(best), a = k, b = k;
    const near = (p, q) => q.x - p.x > 0 && q.x - p.x <= p.s.length * 0.6 + 0.8;
    while (a > 0 && row[a - 1].s.length <= 8 && near(row[a - 1], row[a]) && SHEET_WORD.test(row[a - 1].s)) a--;
    while (b < row.length - 1 && row[b + 1].s.length <= 12 && near(row[b], row[b + 1]) && (/[(（]$/.test(row[b].s) || /^[（(]/.test(row[b + 1].s))) b++;
    const title = row.slice(a, b + 1).map(t => t.s).join('');
    return { box: fb, title, kind: kindOf(title) };
  });
}
