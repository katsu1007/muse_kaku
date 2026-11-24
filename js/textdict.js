/* =====================================================================
 * 文の辞書（テキスト照合の辞書）ドラフト — 2026-11-24 むぎ
 *
 * 記号の辞書（js/symdict.js＝形の特徴で引く）とは対になる、もう1つの辞書。
 * 村中さんの方針（2026-11-24）：辞書は「文（文字）」と「記号（形）」に分け、
 * 読み取り処理が扱いやすい構成にする。ゆくゆくは全世界向け販売のため、
 * 英語の部屋名・ラベルも文の辞書の対象に入れる。
 *
 * 設計：
 *  - 全エントリに dict:'text' と kind を付け、機械的に判別できるようにする。
 *    kind: 'room'  部屋名（部屋判定・ゾーン名の根拠）
 *          'item'  器具・設備のラベル（平面の器具そばの文字、機器表の行名）
 *          'sheet' 図の種類（平面図／立面図／断面図…。図の分け・種別判定用）
 *          'note'  注記（仕上げ・天井高など。部屋名にしない物）
 *  - 照合は2方式：
 *    terms    単語リスト。英語は「単語境界」で照合する（部分文字列で拾わない）。
 *             部屋名は原則「文字全体がその単語（列）＋末尾の数字まで」で一致した時だけ
 *             （例：BEDROOM / BED ROOM / BEDROOM 1 / EXAM 2）。
 *             品番（MODEL_RE）や寸法と衝突させないため、classify の順序では
 *             title/dim/model の後、item/room の位置で引く想定。
 *    pattern  正規表現（日本語側の既存の言い回しはこちら。〜室で終わる等）
 *  - canonical は日本語の標準名。英語だけの図面でも見積の部屋名は日本語に寄せる。
 *  - 日本語の部屋名は現行 reader2/text.js の classify + frame.js の ROOMISH_RE が
 *    既に担っている。本ドラフトはそれを「辞書の形」に写し、英語を足したもの。
 *    実装時は classify の中からこの辞書を引く形に寄せる（順序と打ち消し規則は現行維持）。
 * ===================================================================== */

export const TEXT_DICT = [
  /* ---------- 部屋名（日本語）: 現行 ROOMISH_RE / classify の写し ---------- */
  { dict: 'text', kind: 'room', lang: 'ja', canonical: '（日本語部屋名）',
    pattern: '室|便所|トイレ|WC|ＷＣ|廊下|ホール|ロビー|玄関|階段|倉庫|物入|厨房|食堂|事務|受付|更衣|ロッカー|浴|洗面|脱衣|機械|スペース|ブース|店舗|売場|居間|台所|和室|洋室|LDK|ＬＤＫ|キッチン|リビング',
    notes: '現行 frame.js ROOMISH_RE そのまま（長さ16文字以内・表題欄キーワードの打ち消しは classify 側の規則を維持）' },

  /* ---------- 部屋名（英語）: 2026-11-24 追加。実測の出どころ付き ---------- */
  { dict: 'text', kind: 'room', lang: 'en', canonical: '寝室', terms: ['BEDROOM', 'BED ROOM', 'MASTER BEDROOM'], notes: 'AIテスト図面 dxf_complex/01 の実測ラベル BEDROOM' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: 'リビング', terms: ['LIVING', 'LIVING ROOM'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: 'LDK', terms: ['LDK', 'LIVING DINING KITCHEN'], notes: 'AIテスト図面の実測ラベル LDK（日本式の略称なので英語図面でも出る）' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: 'ダイニング', terms: ['DINING', 'DINING ROOM', 'DK'], notes: 'DK は全体一致の時だけ（品番と衝突させない）' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: 'キッチン', terms: ['KITCHEN'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '浴室', terms: ['BATH', 'BATHROOM', 'BATH ROOM'], notes: 'AIテスト図面の実測ラベル BATH' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '洗面所', terms: ['WASHROOM', 'WASH ROOM', 'VANITY'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: 'トイレ', terms: ['WC', 'TOILET', 'RESTROOM', 'REST ROOM'], notes: 'AIテスト図面の実測ラベル WC。WC は日本語側 ROOMISH_RE にも既にある' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '手洗い', terms: ['POWDER ROOM'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: 'シャワー室', terms: ['SHOWER ROOM'], notes: 'SHOWER 単独は器具ラベル（item）側' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '診察室', terms: ['EXAM', 'EXAMINATION', 'CONSULTATION', 'CONSULTING'], notes: 'AIテスト図面 clinic の実測ラベル EXAM' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '待合室', terms: ['WAITING', 'WAITING ROOM'], notes: 'クリニック・医院の図面で頻出' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '受付', terms: ['RECEPTION'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '事務室', terms: ['OFFICE'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '会議室', terms: ['MEETING', 'MEETING ROOM', 'CONFERENCE', 'CONFERENCE ROOM'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '収納', terms: ['STORAGE', 'CLOSET', 'STORE ROOM', 'PANTRY'], notes: 'PANTRY は食品庫＝収納寄り' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '玄関', terms: ['ENTRANCE', 'ENTRY', 'FOYER'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '廊下', terms: ['CORRIDOR', 'HALLWAY', 'HALL'], notes: 'HALL は全体一致の時だけ（人名・社名と衝突させない）' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '階段', terms: ['STAIRS', 'STAIRCASE', 'STAIR'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: 'エレベーター', terms: ['ELEVATOR', 'LIFT'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '更衣室', terms: ['LOCKER ROOM', 'CHANGING ROOM', 'DRESSING ROOM'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '機械室', terms: ['MECHANICAL', 'MACHINE ROOM', 'MECHANICAL ROOM'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: 'ランドリー', terms: ['LAUNDRY', 'LAUNDRY ROOM', 'UTILITY', 'UTILITY ROOM'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '書斎', terms: ['STUDY', 'STUDY ROOM', 'DEN'], notes: '' },
  { dict: 'text', kind: 'room', lang: 'en', canonical: '子供室', terms: ['KIDS ROOM', 'CHILD ROOM', 'NURSERY'], notes: '' },

  /* ---------- 器具ラベル（英語）: 平面の器具そば・詳細図のラベル ---------- */
  { dict: 'text', kind: 'item', lang: 'en', canonical: '洋式大便器', terms: ['WC'], notes: 'AIテスト図面 dxf_complex/07 水回り詳細の実測ラベル。部屋名の WC と重なる。統合時の優先順位：単独の文字は部屋名（room）を優先し、item の WC は詳細図・機器表の文脈でのみ使う（現行 classify で WC は既に部屋名扱いのため、item 側で奪わない）' },
  { dict: 'text', kind: 'item', lang: 'en', canonical: '洗面器', terms: ['BASIN', 'WASHBASIN', 'WASH BASIN'], notes: '同上 BASIN' },
  { dict: 'text', kind: 'item', lang: 'en', canonical: '浴槽', terms: ['BATHTUB', 'BATH TUB', 'TUB'], notes: '同上 BATHTUB' },
  { dict: 'text', kind: 'item', lang: 'en', canonical: 'シャワー', terms: ['SHOWER'], notes: '同上 SHOWER' },
  { dict: 'text', kind: 'item', lang: 'en', canonical: '小便器', terms: ['URINAL'], notes: '' },
  { dict: 'text', kind: 'item', lang: 'en', canonical: '流し・SK', terms: ['SINK', 'SK'], notes: 'SK は日本語側 ITEM_RE にもある' },
  { dict: 'text', kind: 'item', lang: 'en', canonical: '床排水口', terms: ['FD', 'FLOOR DRAIN'], notes: '同上 FD。記号側の新カテゴリ「床排水口」と対' },

  /* ---------- 器具ラベル（日本語）: 記号側の新カテゴリと対になる追加分 ---------- */
  { dict: 'text', kind: 'item', lang: 'ja', canonical: '床排水口', terms: ['床排水口', '排水口'], notes: '現行 ITEM_RE に無い。記号側の新カテゴリ「床排水口」と対。ただし「排水口」は床排水とは限らない文脈もあるので item 止まり（器具の確定には使わない）' },
  { dict: 'text', kind: 'item', lang: 'ja', canonical: '点検口', terms: ['点検口', '改め口'], notes: '平面表示記号の「改め口」と対' },
  { dict: 'text', kind: 'item', lang: 'ja', canonical: '洗濯機', terms: ['洗濯機', '洗濯パン', '防水パン'], notes: '記号側の新カテゴリ「洗濯機」と対' },
  { dict: 'text', kind: 'item', lang: 'ja', canonical: '電気温水器', terms: ['電気温水器', '温水器'], notes: '温水器は現行 ITEM_RE にもある。記号側の新カテゴリ「電気温水器」と対' },
  { dict: 'text', kind: 'item', lang: 'ja', canonical: '自販機', terms: ['自販機', '自動販売機'], notes: '記号側の新カテゴリ「自販機」と対' },

  /* ---------- 図の種類（sheet）: 立面・断面の見分け用 ---------- */
  { dict: 'text', kind: 'sheet', lang: 'ja', canonical: '立面図', terms: ['立面図'], notes: '現行 SHEET_WORD（reader2/text.js）にもある' },
  { dict: 'text', kind: 'sheet', lang: 'ja', canonical: '断面図', terms: ['断面図'], notes: '同上' },
  { dict: 'text', kind: 'sheet', lang: 'en', canonical: '立面図', terms: ['ELEVATION'], notes: 'AIテスト図面の立面・断面が平面として読まれる問題への手がかり（Claude の aitests メモ §3c）' },
  { dict: 'text', kind: 'sheet', lang: 'en', canonical: '断面図', terms: ['SECTION'], notes: '同上' },
  { dict: 'text', kind: 'sheet', lang: 'en', canonical: '平面図', terms: ['PLAN', 'FLOOR PLAN'], notes: '' },
  { dict: 'text', kind: 'sheet', lang: 'en', canonical: '天井伏図', terms: ['RCP', 'REFLECTED CEILING PLAN'], notes: '' },
  { dict: 'text', kind: 'sheet', lang: 'en', canonical: '詳細図', terms: ['DETAIL'], notes: '' },
];

/* 英語の単語境界照合：正規化（全角→半角・大文字化）した文字を単語に割り、
 * terms の単語列と「全体一致（＋末尾の数字1つまで許容）」で比べる */
const normEn = s => String(s || '').replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).toUpperCase();
const tokensOf = s => normEn(s).split(/[^A-Z0-9]+/).filter(Boolean);
export function matchEnTerms(text, entries) {
  const tk = tokensOf(text);
  if (!tk.length || tk.length > 5) return null;
  for (const e of entries) {
    for (const term of e.terms || []) {
      const tt = tokensOf(term);
      if (tk.length < tt.length || tk.length > tt.length + 1) continue;
      if (!tt.every((w, i) => tk[i] === w)) continue;
      if (tk.length === tt.length + 1 && !/^\d+$/.test(tk[tk.length - 1])) continue;
      return e;
    }
  }
  return null;
}
export function roomNameEn(text) {
  return matchEnTerms(text, TEXT_DICT.filter(e => e.kind === 'room' && e.lang === 'en'));
}
export function itemLabelEn(text) {
  return matchEnTerms(text, TEXT_DICT.filter(e => e.kind === 'item' && e.lang === 'en'));
}
export function sheetKindEn(text) {
  return matchEnTerms(text, TEXT_DICT.filter(e => e.kind === 'sheet' && e.lang === 'en'));
}
