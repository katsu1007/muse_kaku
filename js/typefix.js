/*
 * 器具のタイプ補正（表示だけの層）
 * --------------------------------------------------------------------
 * 旧エンジン（old/index.html の KF_build）は器具の種類を外形の箱の大きさだけで
 * 決めるので、机を浴槽と言ったり、小便器の列を便器と言ったりする。
 * ここでは保存してある器具データ（x.t）には一切触らず、辞書（symdict）の
 * 形判定と、寸法の参照基準（国交省標準図・メーカー実測。根拠は
 * ~/workspace/kaku/work/symbol-webref/REFERENCE.md と TOILET_JWW.md）と、
 * 図面の中の文脈（近くの文字・同じ大きさの繰り返し）を突き合わせて、
 * 「画面に出す種類」だけを直す。直す時は理由を必ず付ける。
 * 根拠が片方向にそろわない物は勝手に変えず、要確認の印だけを付ける。
 * 文脈（浴室が図面にあるか等）は「格下げ」にだけ使い、格上げには使わない。
 * 見積への入り方は今まで通り（明細ダイアログで人が決める）。ここが変えるのは
 * ダイアログと一覧に何と出るかだけ。
 *
 * correctFixtureTypes(fixtures, { verdicts, texts, zoneNames, scale })
 *   fixtures: [{ t, b:[x0,y0,x1,y1]（m）, edited? }]（edited は利用者が直した印。
 *             利用者の直しがある器具は補正しない）
 *   verdicts: fixtures と同じ並びの辞書判定（classifyBox の戻り。null 可）
 *   texts:    [{ t, c:[x,y] }] か [{ t, x, y }]（図面の文字。位置は m）
 *   zoneNames: ゾーン名の配列（浴室文脈の判定に使う）
 *   scale:    symscale の倍率（実寸 = 測った値 ÷ scale）
 * 戻り: fixtures と同じ並びで、補正なしは null、ありは
 *   { shown, rule, reason, confirm }
 *   shown: 表示する種類（'toilet' 等）。confirm のみの時は null（種類は元のまま）
 *   confirm: true の時は「要確認」の印だけ（種類は変えていない）
 */

/* 参照基準の寸法帯（mm、描画実測ベース。REFERENCE.md / TOILET_JWW.md） */
const TOILET_LONG = [690, 820];   /* 洋式大便器の描画長さ（実測 690〜785、余裕込み） */
const TOILET_SHORT_MAX = 510;     /* 幅はリモコン付きで 496 まで */
const URINAL_SHORT = [330, 460];  /* 小便器の幅（実測 335〜460） */
const BATH_SHORT = [640, 980];    /* 浴槽の幅（UB 800〜900・在来 700〜750、箱の被り分だけ下を広げた） */
const BATH_LONG = [830, 1800];    /* 浴槽の長さ（小型 850〜・UB 1600 級まで） */

const WET_TEXT = /トイレ|便所|洗面|浴室|脱衣/;
const BATH_TEXT = /浴|風呂|バス|シャワー/;

/* 図面に浴室・風呂の文脈があるか（文字とゾーン名だけを見る） */
export function hasBathContext(texts = [], zoneNames = []) {
  if ((texts || []).some(x => x && BATH_TEXT.test(String(x.t || '')))) return true;
  return (zoneNames || []).some(n => BATH_TEXT.test(String(n || '')));
}

const ctr = b => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function correctFixtureTypes(fixtures = [], { verdicts = [], texts = [], zoneNames = [], scale = 1 } = {}) {
  const f = Number(scale) > 0 ? Number(scale) : 1;
  const F = (fixtures || []).map((x, i) => {
    if (!x || !x.b) return null;
    const w = Math.abs(x.b[2] - x.b[0]) * 1000 / f, h = Math.abs(x.b[3] - x.b[1]) * 1000 / f;
    return { i, t: x.t, edited: !!x.edited, c: ctr(x.b), short: Math.min(w, h), long: Math.max(w, h), v: verdicts[i] || null };
  });
  const live = F.filter(Boolean);
  const bathCtx = hasBathContext(texts, zoneNames);
  const txt = (texts || []).filter(x => x && (x.c || (isFinite(x.x) && isFinite(x.y))))
    .map(x => ({ t: x.t, c: x.c || [x.x, x.y] }));
  /* 同じ大きさ（±30mm）の器具が図面にいくつあるか */
  const sameSize = a => live.filter(o => Math.abs(o.short - a.short) <= 30 && Math.abs(o.long - a.long) <= 30).length;
  /* 横か縦にそろって並ぶ同じ大きさの相方の数（中心の片軸が 0.15m 以内でそろい、2.5m 以内） */
  const rowMates = a => live.filter(o => o !== a && Math.abs(o.short - a.short) <= 30 && Math.abs(o.long - a.long) <= 30
    && (Math.abs(o.c[1] - a.c[1]) <= 0.15 || Math.abs(o.c[0] - a.c[0]) <= 0.15) && dist(o.c, a.c) <= 2.5).length;
  const nearText = (a, re, r) => { let best = null; for (const x of txt) { if (!re.test(String(x.t || ''))) continue; const d = dist(a.c, x.c); if (d <= r && (!best || d < best.d)) best = { t: String(x.t), d }; } return best; };

  return F.map(a => {
    if (!a || a.edited) return null;   /* 利用者が直した器具は、その判断を優先する */
    const v = a.v, vHit = v && v.verdict === 'hit', vCat = v && v.category;

    /* ルール1 小便器の列：便器と言われたが長さが便器の帯に無く、小便器の幅で
       同じ大きさが並んでいる。辞書が形を別の器具（便器・洗面器など）と読んで
       いる物は触らない（証拠が一方向にそろわないため。要確認の印に回る）。
       発火するのは、辞書が無言か、小便器と読んでいる時だけ */
    if (a.t === 'toilet' && a.long < TOILET_LONG[0] && a.short >= URINAL_SHORT[0] && a.short <= URINAL_SHORT[1]
      && rowMates(a) >= 1 && (!v || v.verdict === 'unknown' || vCat === '小便器')) {
      return { shown: 'urinal', rule: 'urinal-row', confirm: false,
        reason: `便器の長さの帯（${TOILET_LONG[0]}〜${TOILET_LONG[1]}mm）に無い ${Math.round(a.long)}mm で、幅は小便器の帯。同じ大きさが並んでいる列なので小便器と表示` };
    }

    /* ルール2 個室の便器：洗面台・キッチンと言われた箱が、トイレの文字の近くで
       同じ大きさを繰り返す個室の単位になっている（タンク＋手洗いが1つの箱に
       収まって辞書には台所や椅子に見える形）。辞書が洗面器・流しと言い切る物と、
       机と言い切る物は対象にしない */
    if ((a.t === 'counter' || a.t === 'kitchen') && vHit && (vCat === 'キッチン・洗濯設備' || vCat === '椅子')
      && a.long <= 850 && a.short <= 700 && sameSize(a) >= 2) {
      const wet = nearText(a, WET_TEXT, 2.5);
      if (wet) return { shown: 'toilet', rule: 'booth-toilet', confirm: false,
        reason: `「${wet.t}」の近くで同じ大きさ（${Math.round(a.short)}×${Math.round(a.long)}mm）が繰り返される個室の単位と見て便器と表示（辞書の形判定は${vCat}）` };
    }

    /* ルール3 浴槽：寸法が浴槽の帯に入り、排水口の文字がそばにある。
       辞書が洗面器・流しと言い切る物は触らない（洗面台の排水口も同じ文字のため） */
    if ((a.t === 'counter' || a.t === 'kitchen') && a.short >= BATH_SHORT[0] && a.short <= BATH_SHORT[1]
      && a.long >= BATH_LONG[0] && a.long <= BATH_LONG[1]
      && !(vHit && (vCat === '洗面器' || vCat === '流し・SK'))) {
      const drain = nearText(a, /排水口/, 1.5);
      if (drain) return { shown: 'bath', rule: 'bath-drain', confirm: false,
        reason: `寸法（${Math.round(a.short)}×${Math.round(a.long)}mm）が浴槽の帯に入り、近くに「排水口」の文字があるため浴槽と表示` };
    }

    /* ルール4 机は浴槽ではない：辞書が机と言い切り、図面に浴室の文脈が無い。
       浴室のある図面では自動で変えず、要確認だけ付ける */
    if (a.t === 'bath' && vHit && vCat === '机・デスク') {
      if (!bathCtx) return { shown: 'other', rule: 'desk-not-bath', confirm: false,
        reason: `辞書が机・デスクと判定し、この図面に浴室・風呂の文脈が無いため、器具ではない物として表示` };
      return { shown: null, rule: 'desk-not-bath', confirm: true,
        reason: `辞書は机・デスクと判定したが、図面に浴室の文脈があるため自動では変えず要確認` };
    }

    /* 印だけ：便器と言われたが寸法が便器の帯の外。列の条件がそろわない物は
       勝手に変えず、要確認として残す */
    if (a.t === 'toilet' && (a.long < TOILET_LONG[0] || a.long > TOILET_LONG[1] || a.short > TOILET_SHORT_MAX)) {
      return { shown: null, rule: 'toilet-size', confirm: true,
        reason: `便器の寸法帯（長さ${TOILET_LONG[0]}〜${TOILET_LONG[1]}mm・幅${TOILET_SHORT_MAX}mmまで）の外（${Math.round(a.short)}×${Math.round(a.long)}mm）なので要確認` };
    }

    return null;
  });
}
