/* 区画の辺の補修（js/facerepair.js）：段差を追う時だけ直し、根拠が無ければ触らない。
 * 手動ボタン（applyEdgeFix）からの入口だけが drawing を変える。自動でかける経路は無い */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairFaceEdges, applyEdgeFix, revertEdgeFix, edgeFixOf } from '../js/facerepair.js';
import { computeZones } from '../js/zones.js';

const shoe = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
const distPtSeg = (x, y, s) => {
  const dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((x - s[0]) * dx + (y - s[1]) * dy) / L2)) : 0;
  return Math.hypot(x - (s[0] + dx * t), y - (s[1] + dy * t));
};
/* 段差のある部屋の内壁線（sample1 3Fと同じ配置：右側が上段、段差 step で下段に落ちる） */
const roomSegs = (step = 0.117) => [
  [3.0, 0, 2.6, 0],            /* 上段（トレッド） */
  [2.6, 0, 2.6, -step],        /* 段差 */
  [2.6, -step, 0.0, -step],    /* 下段 */
  [0.0, -step, 0.0, 2.0],      /* 左壁 */
  [0.0, 2.0, 3.0, 2.0],        /* 上辺 */
  [3.0, 2.0, 3.0, 0],          /* 右壁 */
];
/* エンジン風の区画：壁から10mm内側。段差の角（x=2.6）を通り過ぎた所から斜めに橋渡ししている */
const bridgedFace = (step = 0.117) => ({
  i: 0, area: 0,
  poly: [[0.01, -step + 0.01], [0.01, 1.99], [2.99, 1.99], [2.99, 0.01], [2.48, 0.01], [2.20, -step + 0.01]],
});

test('段差のある壁では、辺が段差を追うように直る', () => {
  const segs = roomSegs();
  const f = bridgedFace();
  f.area = shoe(f.poly) + 2.5; /* 面積フィールドはグリッド由来（輪と一致しない）のが実物 */
  const { faces, repairs } = repairFaceEdges({ segs, faces: [f] });
  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].span.edges, 2); /* 角を通り過ぎた頂点を含む2辺が対象 */
  const nf = faces[0];
  assert.notEqual(nf, f);
  /* 段差の角（x≈2.6）に、上段の高さと下段の高さの頂点ができている */
  const up = nf.poly.find(p => Math.abs(p[0] - 2.6) < 0.03 && p[1] > -0.02);
  const dn = nf.poly.find(p => Math.abs(p[0] - 2.6) < 0.03 && p[1] < -0.09);
  assert.ok(up, '上段の角がある');
  assert.ok(dn, '下段の角がある');
  /* 角を通り過ぎていた頂点（2.48, 0.01）は消えている */
  assert.ok(!nf.poly.some(p => Math.abs(p[0] - 2.48) < 0.005 && Math.abs(p[1] - 0.01) < 0.005));
  /* 直した輪の下辺まわりは実線から 20mm 以内 */
  for (const p of nf.poly) {
    if (p[1] > 0.5) continue;
    const d = Math.min(...segs.map(s => distPtSeg(p[0], p[1], s)));
    assert.ok(d <= 0.02, `下辺の頂点 ${p} の実線からの距離 ${d}`);
  }
  /* 面積フィールドは輪の増減分だけ動く（計算し直さない） */
  const delta = shoe(nf.poly) - shoe(f.poly);
  assert.ok(delta > 0.005, '段差ぶん輪が広がる');
  assert.ok(Math.abs(nf.area - (f.area + delta)) < 1e-6, '面積フィールドは増減分だけ');
});

test('段差の縦線が無ければ（線がつながっていなければ）直さない', () => {
  const segs = roomSegs().filter(s => !(s[0] === 2.6 && s[2] === 2.6 && s[1] === 0));
  const f = bridgedFace(); f.area = shoe(f.poly);
  const { faces, repairs } = repairFaceEdges({ segs, faces: [f] });
  assert.equal(repairs.length, 0);
  assert.equal(faces[0], f);
});

test('開口（壁の無い所）を渡る辺は直さない', () => {
  /* 下辺の途中に開口がある部屋：区画の辺は開口をまっすぐ渡るのが正しい */
  const segs = [
    [1.2, -0.117, 0.0, -0.117], [0.0, -0.117, 0.0, 2.0], [0.0, 2.0, 3.0, 2.0],
    [3.0, 2.0, 3.0, -0.117], [3.0, -0.117, 2.2, -0.117],
  ];
  const f = { i: 0, area: 0, poly: [[0.01, -0.107], [2.99, -0.107], [2.99, 1.99], [0.01, 1.99]] };
  f.area = shoe(f.poly);
  const { faces, repairs } = repairFaceEdges({ segs, faces: [f] });
  assert.equal(repairs.length, 0);
  assert.equal(faces[0], f);
});

test('段差が偏差予算（200mm）を超える時は直さない', () => {
  const segs = roomSegs(0.5);
  const f = bridgedFace(0.5); f.area = shoe(f.poly);
  const { faces, repairs } = repairFaceEdges({ segs, faces: [f] });
  assert.equal(repairs.length, 0);
  assert.equal(faces[0], f);
});

test('実線に沿った区画は触らず、入力も壊さない', () => {
  const segs = roomSegs();
  const good = {
    i: 0, area: 0,
    poly: [[0.01, -0.107], [2.61, -0.107], [2.61, 0.01], [2.99, 0.01], [2.99, 1.99], [0.01, 1.99]],
  };
  good.area = shoe(good.poly) + 2.5;
  const before = JSON.stringify(good);
  const { faces, repairs } = repairFaceEdges({ segs, faces: [good] });
  assert.equal(repairs.length, 0);
  assert.equal(faces[0], good);
  assert.equal(JSON.stringify(good), before);
});

test('直しても元の区画オブジェクトは壊さない', () => {
  const segs = roomSegs();
  const f = bridgedFace(); f.area = shoe(f.poly) + 2.5;
  const before = JSON.stringify(f);
  const { faces } = repairFaceEdges({ segs, faces: [f] });
  assert.notEqual(faces[0], f);
  assert.equal(JSON.stringify(f), before);
});

/* ---------- 手動の適用（ボタン経路）の統合テスト ---------- */
/* drawing の形はアプリと同じ：{ plan: { segs, faces }, faceFix? }。
 * 区画は2つ：i=1 が段差を橋渡しした物、i=2 が実線に沿った四角（対象外の確認用） */
const drawingOf = () => {
  const bad = bridgedFace(); bad.i = 1; bad.area = shoe(bad.poly) + 2.5;
  const good = { i: 2, area: 0, poly: [[5.01, -0.107], [7.99, -0.107], [7.99, 1.99], [5.01, 1.99]] };
  good.area = shoe(good.poly);
  const segs = [...roomSegs(),
    [5.0, -0.117, 8.0, -0.117], [8.0, -0.117, 8.0, 2.0], [8.0, 2.0, 5.0, 2.0], [5.0, 2.0, 5.0, -0.117]];
  return { plan: { segs, faces: [bad, good] } };
};

test('ボタン：選んだ1区画だけが直り、他の区画は同じ物のまま', () => {
  const d = drawingOf();
  const other = d.plan.faces[1];
  const arrBefore = d.plan.faces;
  const r = applyEdgeFix(d, 1);
  assert.equal(r.ok, true);
  const fixed = d.plan.faces.find(f => f.i === 1);
  assert.equal(fixed, r.face);
  assert.ok(fixed.poly.some(p => Math.abs(p[0] - 2.6) < 0.03 && p[1] < -0.09), '段差の下段の角ができている');
  assert.equal(r.before, arrBefore[0].area);
  assert.equal(r.area, fixed.area);
  assert.ok(Math.abs((r.area - r.before) - r.dArea) < 0.0011, '面積の増え方が dArea と合う');
  /* 対象外の区画はオブジェクトごと不変、配列は新しい物（判定キャッシュの切り替え用） */
  assert.equal(d.plan.faces[1], other);
  assert.notEqual(d.plan.faces, arrBefore);
  /* 手直しの記録：直した後の輪と、戻すための元の輪・面積 */
  const rec = edgeFixOf(d, 1);
  assert.ok(rec);
  assert.deepEqual(rec.poly, fixed.poly);
  assert.deepEqual(rec.oPoly, arrBefore[0].poly);
  assert.equal(rec.oArea, arrBefore[0].area);
});

test('ボタン：直せる所が無い区画では何も変わらない', () => {
  const d = drawingOf();
  const before = JSON.stringify(d);
  const r = applyEdgeFix(d, 2);
  assert.equal(r.ok, false);
  assert.equal(JSON.stringify(d), before);
  assert.equal(d.faceFix, undefined);
  /* 無い区画・手で作った区画も同じ */
  assert.equal(applyEdgeFix(d, 999).ok, false);
  const d2 = drawingOf(); d2.plan.faces[0].hand = true;
  assert.equal(applyEdgeFix(d2, 1).ok, false);
  assert.equal(d2.faceFix, undefined);
});

test('手直しは保存→開き直しでも残り、元に戻すと元の輪・面積に完全に戻る', () => {
  const d = drawingOf();
  const orig = JSON.parse(JSON.stringify(d.plan.faces[0]));
  assert.equal(applyEdgeFix(d, 1).ok, true);
  /* 保存して開き直す＝JSON の往復。その後も直ったまま */
  const re = JSON.parse(JSON.stringify(d));
  const fixed = re.plan.faces.find(f => f.i === 1);
  assert.deepEqual(fixed.poly, edgeFixOf(re, 1).poly);
  assert.notDeepEqual(fixed.poly, orig.poly);
  /* 分け直す（ゾーンの作り直し）でも消えない：ゾーンは drawing.zones の入れ替えだけで、区画と記録には触らない */
  re.zones = computeZones({ segs: re.plan.segs, faces: re.plan.faces, texts: [], doors: [] });
  assert.ok(edgeFixOf(re, 1));
  assert.deepEqual(re.plan.faces.find(f => f.i === 1).poly, fixed.poly);
  /* 元に戻す：元の輪・面積に完全一致し、記録も消える */
  const rv = revertEdgeFix(re, 1);
  assert.equal(rv.ok, true);
  assert.equal(rv.restored, true);
  const back = re.plan.faces.find(f => f.i === 1);
  assert.deepEqual(back.poly, orig.poly);
  assert.equal(back.area, orig.area);
  assert.equal(back.edgeFix, undefined);
  assert.equal(edgeFixOf(re, 1), null);
  assert.equal(re.faceFix, undefined);
  /* 記録が無いのに戻そうとしても何もしない */
  assert.equal(revertEdgeFix(re, 1).ok, false);
});

test('ボタンを2回押しても、元に戻す先は最初の元の輪のまま', () => {
  const d = drawingOf();
  const orig = JSON.parse(JSON.stringify(d.plan.faces[0]));
  assert.equal(applyEdgeFix(d, 1).ok, true);
  applyEdgeFix(d, 1); /* 2回目：直る所が残っていなくても、記録の元は書き換えない */
  const rec = edgeFixOf(d, 1);
  assert.deepEqual(rec.oPoly, orig.poly);
  assert.equal(rec.oArea, orig.area);
  assert.equal(revertEdgeFix(d, 1).restored, true);
  assert.deepEqual(d.plan.faces.find(f => f.i === 1).poly, orig.poly);
});

test('読み取りを切り替えた等で輪が記録と違う時は、形に触らず記録だけ消す', () => {
  const d = drawingOf();
  assert.equal(applyEdgeFix(d, 1).ok, true);
  /* 別の区画に入れ替わった事にする（輪が記録の物と違う） */
  const other = { i: 1, area: 3.21, poly: [[0, 0], [1, 0], [1, 1], [0, 1]] };
  d.plan.faces = d.plan.faces.map(f => (f.i === 1 ? other : f));
  const rv = revertEdgeFix(d, 1);
  assert.equal(rv.ok, true);
  assert.equal(rv.restored, false);
  assert.equal(d.plan.faces.find(f => f.i === 1), other);
  assert.equal(edgeFixOf(d, 1), null);
});
