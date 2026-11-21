/* 器具とドア・開口の読み取り。
 * 前のKAKU（old/）の読み取りの部分を、画面に出さずに裏で動かして結果だけもらう。
 * 読み取りの精度を変えないため、前のKAKUのコードには手を入れない（テスト図面22枚と実図面で同じ結果になることを確かめてある）。
 * 前のKAKUの保存場所には、作業用の案件と図面を残さない（読み終わったら消す）。 */
import { stitchTexts } from './textstitch.js';

let readerPromise = null;
export function getReader() {
  if (readerPromise) return readerPromise;
  readerPromise = new Promise((resolve, reject) => {
    const f = document.createElement('iframe');
    f.title = '器具の読み取り'; f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:absolute;left:-9999px;top:0;width:1200px;height:800px;border:0;visibility:hidden';
    f.src = './old/index.html?reader=1';
    document.body.appendChild(f);
    let n = 0;
    const t = setInterval(() => {
      try {
        const W = f.contentWindow;
        const ef = W && W.document && W.document.getElementById('engineFrame');
        if (ef && ef.contentWindow && ef.contentWindow.KakuEngine && typeof W.runDrawingImport === 'function') { clearInterval(t); resolve(W); return; }
      } catch (e) { clearInterval(t); readerPromise = null; reject(new Error('器具の読み取りの部品を開けませんでした：' + e.message)); return; }
      if (++n > 300) { clearInterval(t); readerPromise = null; reject(new Error('器具の読み取りの部品が起動しませんでした')); }
    }, 100);
  });
  return readerPromise;
}

const wait = (fn, ms) => new Promise(res => { const t0 = Date.now(); const t = setInterval(() => { let v; try { v = fn(); } catch (e) { v = null; } if (v || Date.now() - t0 > ms) { clearInterval(t); res(v); } }, 100); });

/* JWW・DXF を読んで、図面（区画）・器具・ドア・開口を返す。
 * 前のKAKUの変数（KAKU_plan・current・data など）は let で宣言されていて window から見えないので、
 * 前のKAKUの中で式を評価して読み書きする（W.eval） */
export async function readWithFixtures(file, opt = {}) {
  /* 進み具合を画面に出す（opt.step）。出した後、画面が描き直せるように少しだけ待つ */
  const step = async msg => { if (!opt.step) return; try { opt.step(msg); } catch (e) { /* 表示だけなので続ける */ }
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); };
  await step('読み取りの準備をしています');
  const W = await getReader();
  const G = code => W.eval(code);
  const before = G('data.map(p=>p.id)');
  G('newProject()');
  const tmpId = G('current&&current.id');
  try {
    const tab = W.document.querySelector('.tab[data-tab=drawing]'); if (tab) tab.click();
    const dt = new W.DataTransfer();
    dt.items.add(new W.File([await file.arrayBuffer()], file.name, { type: file.type || 'application/octet-stream' }));
    W.document.getElementById('file').files = dt.files;
    await step('線を読んで、部屋の区画を探しています');
    G('KAKU_plan=null;KAKU_fix=null;runDrawingImport()');
    const ok = await wait(() => G('KAKU_plan'), 90000);
    if (!ok) throw new Error('図面を読めませんでした（時間切れ）');
    await wait(() => G('KAKU_fix'), 8000);
    await step('器具・ドア・開口を調べています');
    const R = G(`(()=>{const P=KAKU_plan,F=KAKU_fix,q=v=>Math.round(v*1000)/1000;
      const plan={segs:P.segs.map(s=>s.map(q)),dsegs:(P.dsegs||[]).map(s=>s.map(q)),gsegs:(P.gsegs||[]).map(s=>s.map(q)),
        faces:P.faces.map(f=>({i:f.i,name:f.name||'',area:f.area,peri:f.peri,ch:f.ch||0,poly:f.poly.map(p=>[q(p[0]),q(p[1])])})),titles:(P.titles||[]).slice(0,40)};
      let fixtures=[],open={};
      if(F&&F.fx){fixtures=F.fx.map(x=>{let o=null;try{o=KF_OUT[x.t]?KF_outPt(x):null}catch(e){}return{t:x.t,b:KF_gbox(x.b).map(q),back:KF_gback(x.back)||'',out:o?o.map(q):null}});
        const O=(typeof KX_openScan==='function'&&KX_openScan())||{};
        Object.keys(O).forEach(k=>{open[k]=O[k].map(r=>({ty:r.ty,len:Math.round(r.len*100)/100,a:r.a.map(q),b:r.b.map(q),n:r.n.map(q)}))})}
      return JSON.stringify({plan,fixtures,open,doors:F&&F.doors?F.doors.length:0,doorList:(F&&F.doors||[]).filter(d=>d&&d.c).map(d=>({c:d.c.map(q),m:(d.m||d.c).map(q),r:+d.r||0.8})),fixG:F&&F.g||'',fixGd:F&&F.gd||''})})()`);
    const out = JSON.parse(R);
    /* 画面に出す線：読み取りの部品は線が9,000本を超えると「何本かおきに1本」に間引いて渡してくる（壁が途切れて見える・タップできない）。
     * 読み取りに使った線を全部もらって入れ替える。開口（扉の無い開口）の計算は前のKAKUの中で今まで通り間引いた線のまま行うので、数字は変わらない */
    try {
      const E = W.document.getElementById('engineFrame').contentWindow;
      const all = JSON.parse(E.eval(`(()=>{if(!RG||!RG.faces||!RG.faces.length)return'null';const M=rgM(),on=new Set(RG.groups.filter(g=>g.on).map(g=>g.key)),q=v=>Math.round(v*1000)/1000,o=[];
        RG.segs.forEach((s,i)=>{if(!on.has(gkey(s)))return;if(RG.autoHatch&&RG.hatch&&RG.hatch.has(i))return;const a=KAKU_rerot([s[1]*M,s[2]*M],M),b=KAKU_rerot([s[3]*M,s[4]*M],M);o.push([q(a[0]),q(a[1]),q(b[0]),q(b[1])])});
        return JSON.stringify(o)})()`));
      if (Array.isArray(all) && all.length > out.plan.segs.length) { out.plan.segsThin = out.plan.segs.length; out.plan.segs = all; }
    } catch (e) { console.warn('図面の線を全部もらえませんでした（間引いた線で続けます）', e); }
    /* 図面の文字（新しい読み取り js/reader2 が使う）。読み取りの部品の中身を「読むだけ」で、今の読み取りの結果は変えない。取れなくても読み込みは続ける */
    try {
      const E = W.document.getElementById('engineFrame').contentWindow;
      out.texts = JSON.parse(E.eval(`JSON.stringify((RG.texts||[]).map(t=>{const M=rgM(),p=KAKU_rerot([t.x*M,t.y*M],M);return{t:String(t.t||'').trim(),x:Math.round(p[0]*1000)/1000,y:Math.round(p[1]*1000)/1000}}).filter(t=>t.t).slice(0,4000))`));
    } catch (e) { out.texts = []; }
    /* 図面の長い縦・横の線（1m以上。図枠を探すのに使う）。画面に出す線（plan.segs）は数が多い図面では間引いてあるので、間引く前の線から取る */
    try {
      const E = W.document.getElementById('engineFrame').contentWindow;
      out.longSegs = JSON.parse(E.eval(`(()=>{const M=rgM(),o=[];RG.segs.forEach(s=>{const a=KAKU_rerot([s[1]*M,s[2]*M],M),b=KAKU_rerot([s[3]*M,s[4]*M],M),dx=Math.abs(b[0]-a[0]),dy=Math.abs(b[1]-a[1]);if(Math.max(dx,dy)<1||Math.min(dx,dy)>0.01)return;o.push([a[0],a[1],b[0],b[1]].map(v=>Math.round(v*1000)/1000))});return JSON.stringify(o.slice(0,60000))})()`));
    } catch (e) { out.longSegs = []; }
    /* 器具の救済の材料：壁のレイヤー（長い直線が長さの6割以上）なのに扉の円弧もあるレイヤーは、壁も器具も同じレイヤーに描く図面の物。
     * 読み取り（KF_build）は壁のレイヤーを丸ごと外すので、そのレイヤーの器具が消えてしまう。ここでは材料（そのレイヤーの図形と
     * レイヤーの役割）だけをもらって、器具の判定はアプリ側（js/fixrescue.js）に任せる。取れなくても読み込みは続ける */
    out.rescue = null;
    try {
      await step('器具の取りこぼしが無いか調べています');
      G(`window.__kxRescue='__pending';(async()=>{try{
        const inp=document.getElementById('file'),file=inp&&inp.files&&inp.files[0];
        if(!file){window.__kxRescue='null';return}
        const nm=(file.name||'').toLowerCase();let R=null;
        if(/\\.dxf$/.test(nm)){const buf=await file.arrayBuffer();let str;try{str=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(e){str=new TextDecoder('shift_jis').decode(buf)}R=KE_parseDXF(str)}
        else{const buf=await file.arrayBuffer();R=await KE_parseJWW(buf,{blocks:true})}
        if(!R||!R.ents||!R.ents.length){window.__kxRescue='null';return}
        KE_scaleUnits(R);const fac=1/1000;let rot=0;try{rot=(KAKU_fix&&KAKU_fix.rot)||0}catch(e){}
        if(!rot){try{rot=KF_angle(KAKU_plan)||0}catch(e){}}
        if(rot){const T=p=>{const q=KF_L([p[0]/1000,p[1]/1000],rot);return[q[0]*1000,q[1]*1000]};R.ents.forEach(e=>{['a','b','c','p'].forEach(k=>{if(e[k]&&e[k].length===2)e[k]=T(e[k])});if(e.pts)e.pts=e.pts.map(T);if(e.ell)e.ell=e.ell.map(T)})}
        let roles={};try{const c=KE_classify(R.ents,R.ltab||{});Object.keys(c).forEach(k=>roles[k]=c[k].role)}catch(e){}
        const P=KF_P();let X0=Infinity,Y0=Infinity,X1=-Infinity,Y1=-Infinity;
        P.segs.forEach(s=>{X0=Math.min(X0,s[0],s[2]);X1=Math.max(X1,s[0],s[2]);Y0=Math.min(Y0,s[1],s[3]);Y1=Math.max(Y1,s[1],s[3])});
        X0-=.3;Y0-=.3;X1+=.3;Y1+=.3;
        const L=[],st={},doorLy=new Set();
        R.ents.forEach(e=>{if(e.k==='text'||e.k==='insert'||e.k==='solid')return;let pts=null,cv=0;
          if(e.k==='line')pts=[e.a,e.b];
          else if(e.k==='poly')pts=e.closed&&e.pts.length>2?[...e.pts,e.pts[0]]:e.pts;
          else if(e.k==='arc'){pts=e.pts||[];if(e.r*fac>=.45&&e.r*fac<=1.25&&Math.abs(Math.abs(e.sweep||0)-90)<25&&!KF_SKIP.test(e.ly||''))doorLy.add(e.ly||'')}
          else if(e.k==='circle'&&e.ell)pts=e.ell;
          else if(e.k==='circle'){const cc=e.c,r=e.r*fac;if(!(r>0))return;const nn=r<.05?8:16;pts=Array.from({length:nn+1},(_,k)=>[cc[0]+e.r*Math.cos(k*2*Math.PI/nn),cc[1]+e.r*Math.sin(k*2*Math.PI/nn)])}
          if(!pts||pts.length<2)return;
          const m=pts.map(p=>[p[0]*fac,p[1]*fac]);
          if(e.k==='line'){if(KF_bent(m))cv=1}else if(e.k==='poly'){if(e.bul||KF_bent(m)>=4)cv=1}else cv=1;
          let b=[Infinity,Infinity,-Infinity,-Infinity];m.forEach(p=>{b=[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])]});
          if(b[0]<X0||b[2]>X1||b[1]<Y0||b[3]>Y1)return;
          const s=st[e.ly||'']||(st[e.ly||'']={t:0,l:0,n:0});
          for(let k=1;k<m.length;k++){const d=Math.hypot(m[k][0]-m[k-1][0],m[k][1]-m[k-1][1]);s.t+=d;if(d>=1.2&&!cv){s.l+=d;s.n++}}
          L.push(e)});
        const FURN=/家具|什器|備品|データ|デスク|FURN|DATA/i;
        const cand=new Set(Object.keys(st).filter(ly=>{const s=st[ly];return s.n>=6&&s.t>0&&s.l/s.t>=.6&&doorLy.has(ly)&&!KF_SKIP.test(ly)&&!FURN.test(ly)}));
        if(!cand.size){window.__kxRescue='null';return}
        const q=v=>v;
        const ents=L.filter(e=>cand.has(e.ly||'')).map(e=>{const o={k:e.k,ly:e.ly||''};
          if(e.k==='line'){o.a=e.a.map(q);o.b=e.b.map(q)}
          else if(e.k==='poly'){o.pts=e.pts.map(p=>p.map(q));o.closed=!!e.closed;if(e.bul)o.bul=true}
          else if(e.k==='arc'){o.pts=(e.pts||[]).map(p=>p.map(q));if(e.c)o.c=e.c.map(q);o.r=e.r;o.sweep=e.sweep}
          else if(e.k==='circle'){if(e.c)o.c=e.c.map(q);o.r=e.r;if(e.ell)o.ell=e.ell.map(p=>p.map(q))}
          return o});
        window.__kxRescue=JSON.stringify({ents,roles,rot});
      }catch(e){window.__kxRescue='null'}})()`);
      const rj = await wait(() => { const v = G('window.__kxRescue'); return (typeof v === 'string' && v !== '__pending') ? v : null; }, 90000);
      if (rj && rj !== 'null') { try { out.rescue = JSON.parse(rj); } catch (e) { out.rescue = null; } }
    } catch (e) { console.warn('器具の救済の材料を取れませんでした', e); out.rescue = null; }
    /* 新しい読み取り・段階3：線のまとまりの「使う・使わない」を選び直して、同じ区画探しをもう一度回す。
     * opt.regroup(out, raw) が「使わないにするまとまりの番号」を返した時だけ回す。回した後は元の選び方に戻して探し直すので、今の読み取りの結果は変わらない。
     * 開口（ドア・扉の無い開口）は、前のKAKUの調べ方に、探し直した区画を一時的に渡して出す */
    if (opt.regroup) {
      await step('新しい読み取り（試し）の区画を探しています');
      try {
        const E = W.document.getElementById('engineFrame').contentWindow;
        const raw = JSON.parse(E.eval(`(()=>{const M=rgM(),ix=new Map(RG.groups.map((g,i)=>[g.key,i])),q=v=>Math.round(v*1000)/1000;
          return JSON.stringify({groups:RG.groups.map(g=>({layer:g.layer,on:!!g.on})),segs:RG.segs.map(s=>{const a=KAKU_rerot([s[1]*M,s[2]*M],M),b=KAKU_rerot([s[3]*M,s[4]*M],M),i=ix.get(gkey(s));return [q(a[0]),q(a[1]),q(b[0]),q(b[1]),i==null?-1:i]})})})()`));
        const off = (opt.regroup(out, raw) || []).filter(i => raw.groups[i] && raw.groups[i].on);
        /* 壁らしくない1本線（机・椅子・テーブル・器具など）も外す（rgSingleLines。2本線の壁の図面だけ）。外した本数は out.single に */
        E.__kxOff = off;
        const n1 = E.eval(`(()=>{const keep=RG.groups.map(g=>g.on);let n=0;try{window.__kxOff.forEach(i=>{RG.groups[i].on=false});
          const so=(typeof rgSingleLines==='function')?rgSingleLines():new Set();n=so.size;
          if(!window.__kxOff.length&&!n){window.__kxP2=null;return 0}
          RG.segOff=so;rgCompute();window.__kxP2=KakuEngine.plan()}finally{delete RG.segOff;RG.groups.forEach((g,i)=>{g.on=keep[i]});if(n||window.__kxOff.length)rgCompute()}return n})()`);
        out.single = +n1 || 0;
        if (off.length || out.single) {
          const P2 = E.__kxP2; E.__kxP2 = null;
          if (P2 && P2.faces && P2.faces.length) {
            W.__kxP2 = P2;
            const R2 = JSON.parse(G(`(()=>{const keep=KAKU_plan,P=window.__kxP2,q=v=>Math.round(v*1000)/1000,open={};let O={};
              try{KAKU_plan=P;O=(typeof KX_openScan==='function'&&KX_openScan())||{}}finally{KAKU_plan=keep}
              Object.keys(O).forEach(k=>{open[k]=O[k].map(r=>({ty:r.ty,len:Math.round(r.len*100)/100,a:r.a.map(q),b:r.b.map(q),n:r.n.map(q)}))});
              return JSON.stringify({open,faces:P.faces.map(f=>({i:f.i,name:f.name||'',area:f.area,peri:f.peri,ch:f.ch||0,poly:f.poly.map(p=>[q(p[0]),q(p[1])])}))})})()`));
            W.__kxP2 = null;
            out.v2 = { faces: R2.faces, open: R2.open, off };
          }
        }
      } catch (e) { console.warn('区画の探し直しに失敗', e); }
    }
    /* DXF の文字つなぎ：言葉を1文字ずつ描く DXF では、読み取りの文字がバラバラのまま渡ってくる
     * （部屋名が判定の材料にならない）。ここでだけ単語に戻し、元の並びは rawTexts に残す。
     * JWW の文字は最初から言葉になっているので触らない。つなぎ方は js/textstitch.js（自前実装） */
    if (/\.dxf$/i.test(file.name || '') && out.texts && out.texts.length) {
      try {
        const st = stitchTexts(out.texts);
        if (st.parts) { out.rawTexts = out.texts; out.texts = st.texts; out.stitch = { joined: st.joined, parts: st.parts }; }
      } catch (e) { console.warn('文字のつなぎに失敗', e); }
    }
    return out;
  } finally {
    /* 作業用の案件と、その図面の保存を消す（前のKAKUの案件一覧に残さない） */
    try {
      if (tmpId != null && !before.includes(tmpId)) {
        W.__kxTmp = tmpId;
        G(`data=data.filter(p=>p.id!==window.__kxTmp);if(!data.length)data=[blank()];current=null;save();
          localStorage.removeItem('kaku-plan-'+window.__kxTmp);localStorage.removeItem('kaku-fix-'+window.__kxTmp)`);
      }
    } catch (e) { console.warn('作業用の案件を消せませんでした', e); }
  }
}

/* 前のKAKUに渡す時の種類：前のKAKUに無い種類（ステンレス流し）は、形が同じ洗面カウンターとして渡す */
export const oldType = t => t === 'trough' ? 'counter' : t;
export const FIX_NAMES = { toilet: '便器', urinal: '小便器', counter: '洗面台', sink: '手洗器・流し', slop: 'SK（掃除流し）', trough: 'ステンレス流し（長い手洗い）', bath: '浴槽', kitchen: 'キッチン', unknown: '判定保留', other: '器具ではない' };
/* 器具の種類ごとの、明細に入れる品目の初め（本体・取付手間）。画面で変えられる */
export const FIX_ITEMS = {
  toilet: ['s-b-wc1', 's-l-wc-on'], urinal: ['s-b-ur', 's-l-ur-on'], counter: ['s-b-wb600', 's-l-wb-on'], sink: ['s-b-hw', 's-l-hw-on'],
  slop: ['s-b-sk', 's-l-sk-on'], trough: ['s-b-sst', 's-l-sst-on'], bath: ['fx-ub', 's-l-ub-on'], kitchen: ['fx-kitchen', 's-l-ki-on']
};
export const FIX_WORDS = { toilet: ['便器', 'トイレ'], urinal: ['小便器'], counter: ['洗面'], sink: ['手洗', '流し'], slop: ['SK', '掃除流し'], trough: ['ステンレス流し'], bath: ['ユニットバス', '浴'], kitchen: ['キッチン'] };

/* 部屋（区画の組み合わせ）の、壁から引く開口。前のKAKUと同じ決め方：
 * 部屋の中の境目（となりの区画も同じ部屋）は数えない。ドアは幅×高さ（2.0m、天井が低い時は天井高−5cm）、扉の無い開口は幅×天井高 */
export function roomOpenRuns(faceIds, plan, open) {
  const pip = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const out = [];
  faceIds.forEach(i => (open[i] || []).forEach(run => {
    const mx = (run.a[0] + run.b[0]) / 2, my = (run.a[1] + run.b[1]) / 2;
    const inner = [0.1, 0.2, 0.35].some(o => { const x = mx + run.n[0] * o, y = my + run.n[1] * o; return faceIds.some(j => { if (j === i) return false; const f = plan.faces.find(z => z.i === j); return f && pip(x, y, f.poly); }); });
    if (!inner) out.push({ ty: run.ty, len: run.len });
  }));
  return out;
}

/* 照明の自動配置：前のKAKUの並べ方（壁から60cm＋均等割り、細い所は器具の先との真ん中に一列、列そろえ、欠き込み・斜めの壁の手直し）を
 * そのまま使う。前のKAKUで何度も確かめてきた並び方を、作り直してずらさないため。
 * faces: [{i, poly}]、fixtures: 図面の器具（細い通路の真ん中を決めるのに使う）
 * pitchOf(face, pitch): 照度が足りない時に間隔を詰めるかどうかを決める（need を返す）。戻り値は面ごとの点 */
export async function oldFaceLights(faces, fixtures, { base = 2, need = () => 0 } = {}) {
  const W = await getReader();
  W.__kxFx = (fixtures || []).filter(x => x && x.b).map(x => ({ t: oldType(x.t), b: x.b.slice() }));
  const keep = W.eval('KAKU_fix');
  W.eval('KAKU_fix={fx:window.__kxFx}');
  try {
    return faces.map(f => {
      const area = Math.abs(f.poly.reduce((s, a, k) => { const b = f.poly[(k + 1) % f.poly.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;
      const F = { i: f.i, poly: f.poly, area };
      const n0 = need(f);
      let pp = base, pts = W.KF_faceLights(F, pp) || [];
      while (pts.length < n0 && pp > 0.9 + 1e-6) { pp = Math.max(0.9, pp * 0.92); pts = W.KF_faceLights(F, pp) || []; }
      return { i: f.i, pitch: pp, need: n0, pts: pts.map(q => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000]) };
    });
  } finally { W.__kxTmpFix = keep; W.eval('KAKU_fix=window.__kxTmpFix'); }
}
