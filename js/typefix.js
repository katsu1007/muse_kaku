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
 * sw.46（証拠の格付けの徹底。FIVE_DRAWING_REREVIEW.md）：作る側の変換は、
 * 寸法・文字の近さ・文脈といった状況証拠だけでは行わず、線そのものの裏付け
 * （タンク帯・ボウル面・槽の内形）を必須にした。ルール3（浴槽への変換）は
 * 状況証拠だけが根拠だったため変換を停止し、要確認マークのみに落とした。
 * 見積への入り方は今まで通り（明細ダイアログで人が決める）。ここが変えるのは
 * ダイアログと一覧に何と出るかだけ。
 *
 * correctFixtureTypes(fixtures, { verdicts, texts, zoneNames, scale, faces, segs })
 *   fixtures: [{ t, b:[x0,y0,x1,y1]（m）, edited? }]（edited は利用者が直した印。
 *             利用者の直しがある器具は補正しない）
 *   verdicts: fixtures と同じ並びの辞書判定（classifyBox の戻り。null 可）
 *   texts:    [{ t, c:[x,y] }] か [{ t, x, y }]（図面の文字。位置は m）
 *   zoneNames: ゾーン名の配列（浴室文脈の判定に使う）
 *   scale:    symscale の倍率（実寸 = 測った値 ÷ scale）
 *   faces:    polygonizeFaces（js/polygonize.js）の面 [{ poly, area }]（任意。
 *             ルール6「ボウル数」の材料。無い時はルール6は発火しない）
 *   segs:     図面の線 [[x1,y1,x2,y2], ...]（m、任意。ルール7「タンク帯」の材料。
 *             線が足りない器具は「判定不能」としてルール7は発火しない）
 * 戻り: fixtures と同じ並びで、補正なしは null、ありは
 *   { shown, rule, reason, confirm }
 *   shown: 表示する種類（'toilet' 等）。confirm のみの時は null（種類は元のまま）
 *   confirm: true の時は「要確認」の印だけ（種類は変えていない）
 */

/* 参照基準の寸法帯（mm、描画実測ベース。REFERENCE.md / TOILET_JWW.md） */
const TOILET_LONG = [690, 820];   /* 洋式大便器の描画長さ（実測 690〜785、余裕込み） */
const TOILET_SHORT_MAX = 510;     /* 幅はリモコン付きで 496 まで */
const URINAL_SHORT = [330, 460];  /* 小便器の幅（実測 335〜460） */
/* 浴槽の帯（REFERENCE の公表寸法：UB 幅800〜900・在来 700〜750、長さは小型 850 級〜UB 1,750）。
 * sw.46 以降、この帯は浴槽への変換には使わず「要確認マーク」の範囲としてだけ使う
 * （ルール3 の停止。経緯は BATH_RULE_REVIEW.md） */
const BATH_SHORT = [640, 980];
const BATH_LONG = [830, 1800];

const WET_TEXT = /トイレ|便所|洗面|浴室|脱衣/;
const BATH_TEXT = /浴|風呂|バス|シャワー/;

/* 図面に浴室・風呂の文脈があるか（文字とゾーン名だけを見る） */
export function hasBathContext(texts = [], zoneNames = []) {
  if ((texts || []).some(x => x && BATH_TEXT.test(String(x.t || '')))) return true;
  return (zoneNames || []).some(n => BATH_TEXT.test(String(n || '')));
}

const ctr = b => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* ===== 幾何チェック（sw.45） =====
 * 寸法だけでは決着しない2件（三井屋 F3・F12）のために、線そのものを見る。
 * 実線での目視確認が前提（~/workspace/kaku/work/correctness/geomcheck/VERDICTS.md）：
 * 洗面カウンターは同寸法のボウル面が2枚並び、真の浴槽は槽の面が1枚だけ。
 * 洋式大便器は壁側にタンクの帯（幅いっぱいの直線）があり、小便器には無い。 */

/* 箱の中にある「ボウル面」の数を数える。同寸法（±15%）の面のグループの最大値。
 * ボウル面の条件：短辺 280〜680mm・長辺 300〜800mm・面積 0.10㎡ 以上。
 * 面が取れない図面（faces が無い）では 0 を返し、ルールは発火しない */
export function countBowls(b, faces) {
  if (!b || !faces || !faces.length) return 0;
  const x0 = Math.min(b[0], b[2]) + 0.01, x1 = Math.max(b[0], b[2]) - 0.01;
  const y0 = Math.min(b[1], b[3]) + 0.01, y1 = Math.max(b[1], b[3]) - 0.01;
  const cands = [];
  for (const f of faces) {
    if (!f || !f.poly || f.poly.length < 3 || !(f.area >= 0.10)) continue;
    let fx0 = Infinity, fy0 = Infinity, fx1 = -Infinity, fy1 = -Infinity, cx = 0, cy = 0;
    for (const p of f.poly) { fx0 = Math.min(fx0, p[0]); fx1 = Math.max(fx1, p[0]); fy0 = Math.min(fy0, p[1]); fy1 = Math.max(fy1, p[1]); cx += p[0]; cy += p[1]; }
    cx /= f.poly.length; cy /= f.poly.length;
    if (cx <= x0 || cx >= x1 || cy <= y0 || cy >= y1) continue;
    const w = (fx1 - fx0) * 1000, h = (fy1 - fy0) * 1000;
    const short = Math.min(w, h), long = Math.max(w, h);
    if (short < 280 || short > 680 || long < 300 || long > 800) continue;
    cands.push({ short, long });
  }
  let best = 0;
  for (const s of cands) {
    const asp = s.long / s.short;
    const n = cands.filter(o => Math.abs(o.short - s.short) <= s.short * 0.15 && Math.abs(o.long - s.long) <= s.long * 0.15
      && Math.abs(o.long / o.short - asp) <= asp * 0.15).length;
    if (n > best) best = n;
  }
  return best;
}

/* 箱の中に「槽（シンク）らしい内形」があるか（sw.46、ルール4 の歯止め）。
 * 条件：面の重心が箱の中にあり、四辺とも 30mm 以上内側に収まる閉じた面で、
 * 短辺 280〜700mm・長辺 300〜1,000mm・面積 0.08㎡ 以上。
 * 実測（大天工業）：流し台 F5/F6 には 500×500 の槽の面が内側にあり true、
 * 机10件は外形そのものの面か、辺に接する仕切り面しか無く false だった。
 * 輪郭に接する面（外形そのもの・パネル仕切り）は槽ではないので数えない。
 * 面が無い図面では false を返す（呼び出し側で「面が無い」こと自体は別に見る） */
export function hasBasinFace(b, faces) {
  if (!b || !faces || !faces.length) return false;
  const x0 = Math.min(b[0], b[2]), x1 = Math.max(b[0], b[2]);
  const y0 = Math.min(b[1], b[3]), y1 = Math.max(b[1], b[3]);
  for (const f of faces) {
    if (!f || !f.poly || f.poly.length < 3 || !(f.area >= 0.08)) continue;
    let fx0 = Infinity, fy0 = Infinity, fx1 = -Infinity, fy1 = -Infinity, cx = 0, cy = 0;
    for (const p of f.poly) { fx0 = Math.min(fx0, p[0]); fx1 = Math.max(fx1, p[0]); fy0 = Math.min(fy0, p[1]); fy1 = Math.max(fy1, p[1]); cx += p[0]; cy += p[1]; }
    cx /= f.poly.length; cy /= f.poly.length;
    if (cx <= x0 || cx >= x1 || cy <= y0 || cy >= y1) continue;
    const w = (fx1 - fx0) * 1000, h = (fy1 - fy0) * 1000;
    const short = Math.min(w, h), long = Math.max(w, h);
    if (short < 280 || short > 700 || long < 300 || long > 1000) continue;
    if (fx0 - x0 < 0.03 || x1 - fx1 < 0.03 || fy0 - y0 < 0.03 || y1 - fy1 < 0.03) continue;
    return true;
  }
  return false;
}

/* 壁側の「タンク帯」があるか：4辺それぞれについて、辺から 30〜380mm 内側にある
 * 「辺に平行な直線」の被覆率を見て、どこかの辺で 62% 以上なら帯ありとする。
 * 実測（geomcheck）：便器4件は 0.74 以上、小便器3件は 0.30 以下。
 * 箱の中の線が少なすぎる時は null（判定不能。ルールは発火させない）。
 * sw.46 の実測修正：帯の証拠は「この器具の線」だけに限る。箱の範囲から 250mm 超
 * はみ出す線（壁・通り芯など図面全体の線）は数えず、被覆は箱の範囲で切り取って測る。
 * 三井屋 F17（小便器）では 2,700mm の通り線が箱を横切り、未修正では被覆率が
 * 7.7 倍に膨らんで「帯あり」と誤った。実測では本物のタンク帯は、箱の中に収まる
 * 線だけで 0.74 以上の被覆が取れる（F6・F7・F9・F11 で確認） */
export function hasTankBand(b, segs) {
  if (!b || !segs || !segs.length) return null;
  const x0 = Math.min(b[0], b[2]), x1 = Math.max(b[0], b[2]);
  const y0 = Math.min(b[1], b[3]), y1 = Math.max(b[1], b[3]);
  const W = x1 - x0, H = y1 - y0;
  const inside = [];
  for (const s of segs) {
    if (!s || s.length < 4) continue;
    const mx = (s[0] + s[2]) / 2, my = (s[1] + s[3]) / 2;
    if (mx >= x0 - 0.01 && mx <= x1 + 0.01 && my >= y0 - 0.01 && my <= y1 + 0.01) inside.push(s);
  }
  if (inside.length < 6) return null;
  for (let side = 0; side < 4; side++) {
    const horiz = side < 2;
    const L = horiz ? W : H;
    if (!(L > 0)) continue;
    const lo = horiz ? x0 : y0, hi = horiz ? x1 : y1;
    const edge = side === 0 ? y0 : side === 1 ? y1 : side === 2 ? x0 : x1;
    const sgn = (side === 0 || side === 2) ? 1 : -1;
    const clusters = new Map();
    for (const s of inside) {
      const dx = s[2] - s[0], dy = s[3] - s[1];
      const len = Math.hypot(dx, dy);
      if (len < 0.05) continue;
      if (horiz ? Math.abs(dy) > len * 0.18 : Math.abs(dx) > len * 0.18) continue;
      const mid = horiz ? (s[1] + s[3]) / 2 : (s[0] + s[2]) / 2;
      const d = (mid - edge) * sgn;
      if (d < 0.03 || d > 0.38) continue;
      const a0 = horiz ? Math.min(s[0], s[2]) : Math.min(s[1], s[3]);
      const a1 = horiz ? Math.max(s[0], s[2]) : Math.max(s[1], s[3]);
      if (lo - a0 > 0.25 || a1 - hi > 0.25) continue;   /* 図面全体の線は帯の証拠にしない */
      const c0 = Math.max(a0, lo), c1 = Math.min(a1, hi);
      if (c1 <= c0) continue;
      const k = Math.round(d / 0.02);
      if (!clusters.has(k)) clusters.set(k, []);
      clusters.get(k).push([c0, c1]);
    }
    for (const ivs of clusters.values()) {
      ivs.sort((p, q) => p[0] - q[0]);
      let cov = 0, cs = null, ce = null;
      for (const [a0, a1] of ivs) {
        if (cs === null) { cs = a0; ce = a1; }
        else if (a0 <= ce + 0.02) { ce = Math.max(ce, a1); }
        else { cov += ce - cs; cs = a0; ce = a1; }
      }
      if (cs !== null) cov += ce - cs;
      if (cov / L >= 0.62) return true;
    }
  }
  return false;
}

export function correctFixtureTypes(fixtures = [], { verdicts = [], texts = [], zoneNames = [], scale = 1, faces = null, segs = null } = {}) {
  const f = Number(scale) > 0 ? Number(scale) : 1;
  const F = (fixtures || []).map((x, i) => {
    if (!x || !x.b) return null;
    const w = Math.abs(x.b[2] - x.b[0]) * 1000 / f, h = Math.abs(x.b[3] - x.b[1]) * 1000 / f;
    return { i, t: x.t, b: x.b, edited: !!x.edited, c: ctr(x.b), short: Math.min(w, h), long: Math.max(w, h), v: verdicts[i] || null };
  });
  /* 幾何（ボウル数・タンク帯・槽の内形）は要る器具だけ遅延計算する。
   * hasFaces は「面が取れている図面か」の印（ルール4 が、面が無い時に
   * 形を確認できない物として扱い分けるために使う） */
  const geomCache = new Map();
  const geomOf = a => {
    if (!geomCache.has(a.i)) {
      let g = null;
      try { g = { bowls: countBowls(a.b, faces), tank: hasTankBand(a.b, segs), basin: hasBasinFace(a.b, faces), hasFaces: !!(faces && faces.length) }; } catch (e) { g = null; }
      geomCache.set(a.i, g);
    }
    return geomCache.get(a.i);
  };
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
       発火するのは、辞書が無言か、小便器と読んでいる時だけ。
       sw.46 の格上げ：寸法と列だけでは変換せず、線を見て「タンク帯が無い」こと
       （卵形ボウルの器具にはタンクの帯が無い）までそろった時だけ変換する。
       線が無い・判定できない図面では変換せず、末尾の要確認マークに回る */
    if (a.t === 'toilet' && a.long < TOILET_LONG[0] && a.short >= URINAL_SHORT[0] && a.short <= URINAL_SHORT[1]
      && rowMates(a) >= 1 && (!v || v.verdict === 'unknown' || vCat === '小便器')) {
      const g = geomOf(a);
      if (g && g.tank === false) {
        return { shown: 'urinal', rule: 'urinal-row', confirm: false,
          reason: `便器の長さの帯（${TOILET_LONG[0]}〜${TOILET_LONG[1]}mm）に無い ${Math.round(a.long)}mm で、幅は小便器の帯。同じ大きさが並んでいる列で、線を見てもタンクの帯が無いので小便器と表示` };
      }
    }

    /* ルール2 個室の便器：洗面台・キッチンと言われた箱が、トイレの文字の近くで
       同じ大きさを繰り返す個室の単位になっている（タンク＋手洗いが1つの箱に
       収まって辞書には台所や椅子に見える形）。辞書が洗面器・流しと言い切る物と、
       机と言い切る物は対象にしない。
       sw.46 の格上げ：材料が寸法＋文字の近さだけ（ルール3 と同種の構造）だったため、
       変換には線の裏付けを必須にした。壁側にタンクの帯がある時だけ便器に変換し、
       帯が確認できない・線が無い図面では、個室の単位らしいことだけを理由に
       要確認マークを付ける。実測では三井屋の対象6件（F6〜F11）すべてに
       タンクの帯があった（FIVE_DRAWING_REREVIEW §4、実線測定） */
    if ((a.t === 'counter' || a.t === 'kitchen') && vHit && (vCat === 'キッチン・洗濯設備' || vCat === '椅子')
      && a.long <= 850 && a.short <= 700 && sameSize(a) >= 2) {
      const wet = nearText(a, WET_TEXT, 2.5);
      if (wet) {
        const g = geomOf(a);
        if (g && g.tank === true) return { shown: 'toilet', rule: 'booth-toilet', confirm: false,
          reason: `「${wet.t}」の近くで同じ大きさ（${Math.round(a.short)}×${Math.round(a.long)}mm）が繰り返される個室の単位で、線を見ても壁側にタンクの帯があるため便器と表示（辞書の形判定は${vCat}）` };
        return { shown: null, rule: 'booth-toilet', confirm: true,
          reason: `「${wet.t}」の近くで同じ大きさ（${Math.round(a.short)}×${Math.round(a.long)}mm）が繰り返される個室の単位らしいが、線からタンクの帯の裏付けが取れないため、便器とは決めず要確認` };
      }
    }

    /* ルール7 タンク帯の無い小便器：洗面台・キッチンと言われた箱を辞書が便器・
       小便器と読み、線を見ても壁側にタンクの帯が無い（洋式大便器なら必ずある）。
       帯の有無が判定できない図面・器具では発火しない。個室の便器（ルール2）が
       先に決める物はそちらが優先 */
    if ((a.t === 'counter' || a.t === 'kitchen') && v && (vCat === '洋式大便器' || vCat === '小便器')
      && a.short <= 700 && a.long <= 880) {
      const g = geomOf(a);
      if (g && g.tank === false) {
        /* 部屋名の文字は部屋の中央に置かれるため、列の端の器具では 2.5m を
           わずかに超える（三井屋 F12 は「男子トイレ」まで 2.58m）。このルールは
           形と帯の証拠がそろった物だけが対象なので、半径は 3.0m に取る */
        const wet = nearText(a, WET_TEXT, 3.0);
        if (wet) return { shown: 'urinal', rule: 'urinal-notank', confirm: false,
          reason: `辞書は${vCat}と読み、線を見ても壁側にタンクの帯が無いため小便器と表示（「${wet.t}」の近く）` };
      }
    }

    /* ルール8 植栽のプランターは小便器ではない：エンジンが小便器と言った箱が、
       ほぼ正方形（長辺が短辺の 1.15 倍まで）で、同じ大きさの小便器が中心間隔
       0.6m 以内の連なりで4個以上の帯になっている物。本物の小便器は奥行きが
       幅よりはっきり長く（実測 344×503・380×620 など）、並ぶ時も中心間隔は
       0.75m 以上ある。プランターは幅と奥行きがほぼ同じで、帯として接して並ぶ
       （江南 F21〜F28：335×353 が8個、中心間隔 0.41〜0.49m・すき間 0.07〜0.16m。
       村中さんが植栽と目視確定済み）。
       辞書の寸法判定はこの形を小便器と読む（生判定は hit 0.93、表示では僅差で
       類似に落ちる）が、寸法だけでは植栽と分かれないので、帯の構造を根拠にする。
       水まわりの文字が近くにある物は触らない（本物の小便器の列を落とさない）。
       近くに「植栽」の文字がある時も同じ扱いにする（図面が自分で名付けている。
       こちらは並びの条件なしで落とす） */
    if (a.t === 'urinal') {
      const pl = nearText(a, /植栽/, 1.5);
      if (pl && !(vHit && vCat !== '小便器')) return { shown: 'other', rule: 'planter-not-urinal', confirm: false,
        reason: `近くに「${pl.t}」の文字があるため、小便器ではなく、器具ではない物として表示` };
      if (a.long <= a.short * 1.15 && !nearText(a, WET_TEXT, 2.5)) {
        /* 同じ大きさの小便器どうしを、そろった並び＋中心間隔 0.6m 以内でつないだ帯 */
        const kin = live.filter(o => o.t === 'urinal'
          && Math.abs(o.short - a.short) <= 30 && Math.abs(o.long - a.long) <= 30
          && (Math.abs(o.c[1] - a.c[1]) <= 0.15 || Math.abs(o.c[0] - a.c[0]) <= 0.15));
        const band = new Set([a]); let grew = true;
        while (grew) { grew = false; for (const o of kin) { if (band.has(o)) continue; for (const m of band) { if (dist(o.c, m.c) <= 0.6) { band.add(o); grew = true; break; } } } }
        if (band.size >= 4) return { shown: 'other', rule: 'planter-not-urinal', confirm: false,
          reason: `ほぼ正方形（${Math.round(a.short)}×${Math.round(a.long)}mm）の同じ大きさが、接して${band.size}個並ぶ帯で、水まわりの文字も近くに無いため、小便器ではなく植栽のプランターなど器具ではない物として表示` };
      }
    }

    /* ルール3 浴槽（sw.46 で変換を停止し、要確認マークのみ）：寸法が浴槽の帯に
       入り、排水口の文字がそばにある物。かつては浴槽に変換していたが、その根拠は
       「合体した箱の寸法」と「近くの文字」だけで、どちらも器具そのものを指して
       いなかった。実際に発火した2件（三井屋 F1・F5）は和式便器で、近くの
       「排水口」は部屋の床排水だった（村中さんの確認。BATH_RULE_REVIEW.md）。
       書き換え仕様（輪郭実測ベースの bath-outline）は、本物の浴槽のある図面が
       来て正例で検証できるまで凍結する。ここでは疑いがあることだけを示す。
       ルール7（形の裏付けのある変換）より後に置き、形で決まる物を邪魔しない */
    if ((a.t === 'counter' || a.t === 'kitchen') && a.short >= BATH_SHORT[0] && a.short <= BATH_SHORT[1]
      && a.long >= BATH_LONG[0] && a.long <= BATH_LONG[1]
      && !(vHit && (vCat === '洗面器' || vCat === '流し・SK'))) {
      const drain = nearText(a, /排水口/, 1.5);
      if (drain) return { shown: null, rule: 'bath-drain', confirm: true,
        reason: `寸法（${Math.round(a.short)}×${Math.round(a.long)}mm）が浴槽の帯に入り、近くに「排水口」の文字があるが、寸法と文字の近さだけでは浴槽とは決めない（近くの排水口は床排水のことがある）ため要確認` };
    }

    /* ルール4 机は浴槽ではない：辞書が机と言い切り、図面に浴室の文脈が無い。
       浴室のある図面では自動で変えず、要確認だけ付ける */
    if (a.t === 'bath' && vHit && vCat === '机・デスク') {
      if (bathCtx) return { shown: null, rule: 'desk-not-bath', confirm: true,
        reason: `辞書は机・デスクと判定したが、図面に浴室の文脈があるため自動では変えず要確認` };
      /* sw.46 の歯止め：辞書の「机」は寸法だけの判定で、実在の流し台も机と
         読むことがある（大天工業 F5/F6 を「器具ではない物」に落とした実例。
         FIVE_DRAWING_REREVIEW §2.2）。箱の中に槽らしい内形（閉じた面）が
         あれば器具ではないとは決めず、面が取れない図面でも形を確認できない
         物は落とさない。どちらも要確認止まりにする */
      const g = geomOf(a);
      if (!g || !g.hasFaces) return { shown: null, rule: 'desk-not-bath', confirm: true,
        reason: `辞書は机・デスクと判定したが、形（槽の有無）を確認する材料が無いため自動では変えず要確認` };
      if (g.basin) return { shown: null, rule: 'desk-not-bath', confirm: true,
        reason: `辞書は机・デスクと判定したが、箱の中に槽らしい内形があるため、器具ではないとは決めず要確認` };
      return { shown: 'other', rule: 'desk-not-bath', confirm: false,
        reason: `辞書が机・デスクと判定し、箱の中に槽らしい内形も無く、この図面に浴室・風呂の文脈が無いため、器具ではない物として表示` };
    }

    /* ルール6 ボウルが2個ある洗面カウンター：浴槽と言われた箱の中に、同寸法の
       ボウル面が2枚以上並んでいる（真の浴槽は槽の面が1枚だけ。実線で確認済み）。
       辞書が浴槽と言い切る物は触らない */
    if (a.t === 'bath' && !(vHit && vCat === '浴槽')) {
      const g = geomOf(a);
      if (g && g.bowls >= 2) return { shown: 'counter', rule: 'bath-bowls', confirm: false,
        reason: `箱の中に同じ大きさのボウル（洗面器）が${g.bowls}個並んでいるため洗面台と表示（浴槽は槽が1つだけ）` };
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
