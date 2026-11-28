/*
 * 家具クラスタ→器具への昇格（js/fixpromote.js）
 * --------------------------------------------------------------------
 * 便所の器具が「家具」側の線クラスタに振り分けられ、器具として拾われない図面がある
 * （大天工業：便所・女子便所・男子便所・湯沸室の衛生器具が器具0件だった。形の読み
 * 自体は辞書が当てていた＝拾う層が違うだけ。FIVE_DRAWING_REREVIEW.md §2.2）。
 * ここでは、読み取り（エンジン）にも家具検出にも触らず、読み込みの最後に、
 * 次の全てを満たす家具クラスタだけを器具（src:'promote'）として足す。
 *
 *   1. 辞書の「素の」形判定（文脈なしの classifyCluster）が単独で確定している
 *      （verdict 'hit'＝スコア0.90以上・2位との差0.05以上・寸法の安全弁なし、
 *      かつ自分の辞書の判定ではない）。文脈（衛生アンカー等）で確定に上がった物は
 *      対象にしない＝形が独り立ちしていない物は上げない。
 *   2. カテゴリが 洋式大便器（→ toilet）か 小便器（→ urinal）。
 *   3. 輪郭が「円だけ」ではない（arcShare ≤ 0.9）。洗面台のボウルだけが切り出された
 *      クラスタは円弧の割合が 1.0 で、便器・小便器の輪郭（壁側の直線＋鉢の曲線）とは
 *      形が違う（実測：大天の実物 便器0.64・小便器0.32〜0.33、ボウルだけの抽出は1.0）。
 *   4. 部屋の裏付け：中心が、名前が「便所」「湯沸室」を含むゾーンの面から 0.5m 以内
 *      にあり、他の名前付きゾーンの面よりもその面に近い。壁掛け器具は壁際の帯に
 *      面が取れていないことがある（実測：大天の小便器は面から 0.16〜0.20m、
 *      他の名前付きゾーンまでは 1.5m 以上）ため、内包ではなく距離で見る。
 *   5. 既にある器具の箱の中心が入っていない（数え直しをしない）。
 *
 * 検証の要点（2026-11-28、5図面の全クラスタ実測。詳細は社内記録
 * correctness/DAITEN_PROMOTION_RESULTS.md）：
 *   - 大天で発火するのは実在の便器4・小便器3の7件だけ（全件 村中さんが確定済み）。
 *   - 三井屋の洗面器3件（小便器と誤読）は素の判定が「類似」止まり（2位との差0.003・
 *     寸法の安全弁あり）で条件1を満たさず、大天の洗面器（ボウルだけの抽出）も
 *     「類似」（差0.009）＋条件3で二重に外れる。
 *   - 形だけでは誤る例（日本モウルドの椅子が小便器に確定 0.975・江南の線の断片が
 *     小便器に確定 0.973）は、どちらの図面にも「便所・湯沸室」の名前のゾーンが
 *     無く、条件4で発火しない。形と部屋、両方の鍵が要る。
 *
 * promoteFixtures({ clusters, verdicts, zones, faces, fixtures })
 *   clusters: 家具クラスタ [{ b:[x0,y0,x1,y1]（m）, arcShare }]
 *   verdicts: clusters と同じ並びの素の辞書判定（classifyCluster の戻り）
 *   zones:    [{ name, faces:[区画の i] }]
 *   faces:    [{ i?, poly:[[x,y],...] }]
 *   fixtures: 既にある器具 [{ b }]
 * 戻り: [{ j（クラスタの番号）, b, t, category, score }]
 */

const PROMOTE_CATS = { '洋式大便器': 'toilet', '小便器': 'urinal' };
const WET_ZONE_RE = /便所|湯沸室/;
const WET_DIST_MAX = 0.5;
const ARC_MAX = 0.9;

const pip = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const dSeg = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const L = dx * dx + dy * dy; let t = L ? ((px - a[0]) * dx + (py - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy)); };
const dPoly = (px, py, P) => { if (pip(px, py, P)) return 0; let m = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) m = Math.min(m, dSeg(px, py, P[j], P[i])); return m; };

export function promoteFixtures({ clusters = [], verdicts = [], zones = [], faces = [], fixtures = [] } = {}) {
  const faceZone = new Map();
  for (const z of zones || []) for (const i of (z && z.faces) || []) if (!faceZone.has(i)) faceZone.set(i, z);
  const wetPolys = [], otherPolys = [];
  (faces || []).forEach((f, fi) => {
    if (!f || !f.poly || f.poly.length < 3) return;
    const z = faceZone.get(f.i != null ? f.i : fi);
    if (z && z.name && WET_ZONE_RE.test(z.name)) wetPolys.push(f.poly);
    else if (z && z.name) otherPolys.push(f.poly);
  });
  if (!wetPolys.length) return [];
  const out = [];
  (clusters || []).forEach((x, j) => {
    if (!x || !x.b) return;
    const v = verdicts && verdicts[j];
    if (!v || v.mine || v.verdict !== 'hit' || v.sizeVeto) return;
    const t = PROMOTE_CATS[v.category];
    if (!t) return;
    if (x.arcShare == null || x.arcShare > ARC_MAX) return;
    const cx = (x.b[0] + x.b[2]) / 2, cy = (x.b[1] + x.b[3]) / 2;
    if ((fixtures || []).some(f => f && f.b && cx >= f.b[0] && cx <= f.b[2] && cy >= f.b[1] && cy <= f.b[3])) return;
    let dWet = Infinity, dOther = Infinity;
    for (const P of wetPolys) dWet = Math.min(dWet, dPoly(cx, cy, P));
    if (dWet > WET_DIST_MAX) return;
    for (const P of otherPolys) dOther = Math.min(dOther, dPoly(cx, cy, P));
    if (!(dWet < dOther)) return;
    out.push({ j, b: x.b, t, category: v.category, score: v.score });
  });
  return out;
}
