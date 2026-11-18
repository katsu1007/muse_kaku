/* 入口：画面を登録して起動する */
import { boot } from './app.js';
import './home.js';
import './project.js';
import './pages.js';

boot();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  /* 新しい版が届いた時：裏では入れ替わるが、今の画面は古い版のまま動くので、「更新する」を出す（押すと読み直す） */
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || document.getElementById('kUpd')) return;
    const b = document.createElement('div');
    b.id = 'kUpd';
    b.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;background:var(--accent,#e8833a);color:#fff;padding:10px 14px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.35);display:flex;gap:12px;align-items:center;font-size:14px';
    b.innerHTML = '<span>新しい版があります</span><button style="background:#fff;color:#222;border:0;border-radius:8px;padding:6px 12px;font-weight:600;font-size:14px">更新する</button>';
    b.querySelector('button').onclick = () => location.reload();
    document.body.appendChild(b);
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(r => { try { r.update(); } catch (e) { /* 確かめられなくても続ける */ } })
      .catch(e => console.warn('オフライン用の登録に失敗しました', e));
  });
  /* 今動いている版（オフライン用の保管の名前の後ろ）を左下と設定に出す */
  const showBuild = async () => {
    try {
      const k = (await caches.keys()).filter(x => x.startsWith('muse-kaku-')).sort((a, b) => a.localeCompare(b, 'ja', { numeric: true })).pop();
      if (!k) return;
      const v = k.replace('muse-kaku-', '');
      document.querySelectorAll('.foot, [data-build]').forEach(el => { if (!el.dataset.b) { el.dataset.b = 1; el.insertAdjacentHTML('beforeend', `<br><span class="muted" style="font-size:11px">版 ${v}</span>`); } });
    } catch (e) { /* 出せなくても続ける */ }
  };
  window.addEventListener('load', () => setTimeout(showBuild, 800));
  window.addEventListener('hashchange', () => setTimeout(showBuild, 300));
}
