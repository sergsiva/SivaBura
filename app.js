/* ---------- рубашка: орнамент «плата + гейм-дизайн» ----------
   Крупный ход, мало линий, много воздуха: на 225px мелкие дорожки слиплись бы
   в шум. Обводка везде — градиент фольги, поэтому линии переливаются. */
const ORNAMENT = `
<svg class="dk-orn" viewBox="0 0 450 652" fill="none" aria-hidden="true"
     stroke="url(#dk-foil)" stroke-linecap="round" stroke-linejoin="round">
  <!-- поле в мелкую сетку -->
  <rect x="0" y="0" width="450" height="652" fill="url(#dk-grid)" stroke="none"/>

  <!-- рамка с вогнутыми углами -->
  <path stroke-width="1.9" d="M82 34H368A48 48 0 0 0 416 82V570A48 48 0 0 0 368 618H82A48 48 0 0 0 34 570V82A48 48 0 0 0 82 34Z"/>

  <!-- искры в углах -->
  <g stroke-width="1.5">
    <path d="M0-10Q1.4-1.4 10 0Q1.4 1.4 0 10Q-1.4 1.4-10 0Q-1.4-1.4 0-10Z" transform="translate(48 50)"/>
    <path d="M0-10Q1.4-1.4 10 0Q1.4 1.4 0 10Q-1.4 1.4-10 0Q-1.4-1.4 0-10Z" transform="translate(402 50)"/>
    <path d="M0-10Q1.4-1.4 10 0Q1.4 1.4 0 10Q-1.4 1.4-10 0Q-1.4-1.4 0-10Z" transform="translate(48 602)"/>
    <path d="M0-10Q1.4-1.4 10 0Q1.4 1.4 0 10Q-1.4 1.4-10 0Q-1.4-1.4 0-10Z" transform="translate(402 602)"/>
  </g>

  <!-- звезда с гранями -->
  <g stroke-width="1.7">
    <path d="M225 232 251 292 297 326 251 360 225 420 199 360 153 326 199 292Z"/>
    <path d="M225 232V420M153 326H297"/>
    <path d="M225 326 251 292M225 326 251 360M225 326 199 360M225 326 199 292"/>
  </g>
</svg>`;

/* ============================================================================
   КОНТЕНТ. Все тексты и ссылки лежат в content.csv.
   Колонки: key — ключ, ru — русский, en — английский.
   Пустой en → покажется русский. Пустой ru → покажется английский.

   Ключи:
     ui.*            подписи интерфейса
     site.name       имя в шапке
     site.tg         ссылка на телеграм
     site.back       общая рубашка колоды (ссылка на картинку или пусто)
     case.<id>.*     кейс: cover, back, studio, meta, title, lead, link,
                     stat<N>.value, stat<N>.label,
                     s<N>.h, s<N>.text, s<N>.shot, s<N>.side (1 — картинка сбоку)
     cv.*            резюме: studio, meta, title, lead, frame, link, stat<N>.*, s<N>.*
   Новый кейс — новые строки с case.<новый id>.*
   Порядок кейсов в колоде = порядок их первых строк в файле.
   ============================================================================ */

function esc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseCSV(text){
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    if (quoted){
      if (ch === '"'){
        if (text[i + 1] === '"'){ field += '"'; i++; }
        else quoted = false;
      } else field += ch;
    } else if (ch === '"'){
      quoted = true;
    } else if (ch === ','){
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r'){
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row);
      row = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

async function loadContent(){
  const res = await fetch('content.csv', { cache: 'no-store' });
  if (!res.ok) throw new Error('content.csv: ' + res.status);
  const text = (await res.text()).replace(/^\uFEFF/, '');
  const rows = parseCSV(text).slice(1);          // первая строка — заголовок
  const map = {};
  rows.forEach(r => {
    const key = (r[0] || '').trim();
    if (!key || key.startsWith('#')) return;
    map[key] = { ru: r[1] || '', en: r[2] || '' };
  });

  const txt = k => (map[k] && (map[k].ru || map[k].en)) ? map[k] : '';
  const raw = k => (map[k] ? map[k].ru : '');

  const indexed = (prefix, letter) => {
    const re = new RegExp('^' + esc(prefix) + letter + '(\\d+)\\.');
    const set = new Set();
    Object.keys(map).forEach(k => { const m = k.match(re); if (m) set.add(+m[1]); });
    return [...set].sort((a, b) => a - b);
  };
  const sections = prefix => indexed(prefix, 's').map(n => {
    const p = prefix + 's' + n + '.';
    return { h: txt(p + 'h'), text: txt(p + 'text'), shot: raw(p + 'shot'), side: raw(p + 'side') === '1' };
  });
  const stats = prefix => indexed(prefix, 'stat').map(n => {
    const p = prefix + 'stat' + n + '.';
    return [txt(p + 'value'), txt(p + 'label')];
  });

  const ids = [];
  Object.keys(map).forEach(k => {
    const m = k.match(/^case\.([^.]+)\./);
    if (m && !ids.includes(m[1])) ids.push(m[1]);
  });

  const CASES = ids.map(id => {
    const p = 'case.' + id + '.';
    return {
      id,
      cover: raw(p + 'cover'),
      back:  raw(p + 'back'),
      studio: txt(p + 'studio'),
      date:   txt(p + 'date'),
      hero:   raw(p + 'hero'),
      meta:   txt(p + 'meta'),
      title:  txt(p + 'title'),
      stats:  stats(p),
      lead:   txt(p + 'lead'),
      sections: sections(p),
      link:   raw(p + 'link')
    };
  });

  const CV = {
    id: 'cv',
    studio: txt('cv.studio'),
    meta:   txt('cv.meta'),
    title:  txt('cv.title'),
    stats:  stats('cv.'),
    lead:   txt('cv.lead'),
    frame:  raw('cv.frame'),
    sections: sections('cv.'),
    link:   raw('cv.link')
  };

  const UI = {};
  ['role','shot','open','close','card','cv','prev','next','zoom'].forEach(k => { UI[k] = txt('ui.' + k); });

  const SITE = { name: txt('site.name'), tg: raw('site.tg'), back: raw('site.back') };

  return { UI, SITE, CASES, CV };
}

(async function main(){
  let C;
  try { C = await loadContent(); }
  catch (e){
    console.error(e);
    document.getElementById('dk-deck').textContent = 'Не загрузился content.csv. Откройте страницу с сервера или хостинга.';
    return;
  }
  const { UI, SITE, CASES, CV } = C;
  const TG   = SITE.tg;
  const BACK = SITE.back;

/* ============================================================================
   ЯЗЫКИ
   Любое текстовое поле можно написать как { ru:'…', en:'…' }. Нет перевода —
   покажется русский, так что переводить можно постепенно.
   ============================================================================ */
let LANG = 'ru';
try {
  const saved = localStorage.getItem('dk-lang');
  LANG = saved || ((navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en');
} catch (e) {}

const t = v => (v && typeof v === 'object' && !Array.isArray(v)) ? (v[LANG] || v.ru || v.en || '') : (v || '');

/* ============================================================================
   Дальше — механика. Менять не обязательно.
   ============================================================================ */
/* Раскладка веера. Правится руками или в режиме правки (шестерёнка в шапке):
   rot — поворот в плоскости экрана, roty — доворот по вертикальной оси,
   tx/ty — сдвиг, scale — масштаб карты. */
const LAYOUT = [
  { rot:-22,   roty:36,    tx:-17, ty:-10, scale:0.91 },
  { rot:-5,    roty:30.5,  tx:-29, ty:15,  scale:0.94 },
  { rot:5,     roty:-19,   tx:-34, ty:-56, scale:0.97 },
  { rot:16.5,  roty:-29.5, tx:-58, ty:46,  scale:0.98 },
  { rot:25,    roty:-40,   tx:-53, ty:-17, scale:1 }
];
const SIZE = { w:225, h:326, gap:-16 };

/* Параметры движения. Крутятся в панели правки, вкладка «Движение». */
const MOTION = {
  flight:300, showBack:1, flipMs:160, zoom:130, hold:40, modalAt:300, ease:1,
  lift:88, backz:-115, tilt:14, unwindY:78, unwindZ:55, hoverMs:400,
  dealMs:400, dealStep:50, flash:100, blink:20
};
const M = { ...MOTION };
const EASES = ['cubic-bezier(.62,.03,.2,1)','cubic-bezier(.3,0,.2,1)','cubic-bezier(.5,-.2,.2,1.3)'];
const DK = {};     // размер карты и нахлёст, px

const DUR  = [7.4, 6.2, 8.1, 6.8, 7.9];    // период парения
const DLY  = [0, .9, .4, 1.4, .6];         // сдвиг фазы

const MQ  = matchMedia('(max-width:820px)');
const mob = () => MQ.matches;                     // на узком экране веера нет
const L   = i => mob() ? { rot:0, roty:0, tx:0, ty:0, scale:1 }
                       : (LAYOUT[i] || { rot:0, roty:0, tx:0, ty:0, scale:1 });

let open$ = -1, busy = false;

const LIFT_Y = -6;

const deck     = document.getElementById('dk-deck');
const backdrop = document.getElementById('dk-backdrop');
const modal    = document.getElementById('dk-modal');
const inner    = document.getElementById('dk-in');
const scroller = document.getElementById('dk-scroll');
scroller.addEventListener('scroll', () => modal.classList.toggle('is-scrolled', scroller.scrollTop > 240), { passive: true });
document.getElementById('dk-close').addEventListener('click', () => closeAll());

CASES.forEach((c, i) => {
  const slot = document.createElement('div');
  slot.className = 'dk-slot';
  slot.dataset.i = i;
  slot.innerHTML = `
    <div class="dk-pose">
    <div class="dk-shift">
      <div class="dk-float" style="--dur:${DUR[i] ?? 7}s;--delay:${DLY[i] ?? 0}s">
        <div class="dk-tilt">
          <div class="dk-card">
            <div class="dk-face dk-front"${c.cover ? ` style="background-image:url('${c.cover}')"` : ''}>
              <div class="dk-fx">
                <div class="dk-glow"></div>
                <div class="dk-holo"></div>
                <div class="dk-sheen"></div>
              </div>
            </div>
            <div class="dk-face dk-back"${(c.back || BACK) ? ` style="background-image:url('${c.back || BACK}')"` : ''}>${(c.back || BACK) ? '' : ORNAMENT}</div>
          </div>
        </div>
      </div>
    </div>
    <button class="dk-hit" type="button" aria-label="Открыть кейс: ${t(c.studio)}"></button>
    </div>`;
  deck.appendChild(slot);
});

const slots = [...deck.querySelectorAll('.dk-slot')];

function applyLayout(){
  slots.forEach((s, i) => {
    const v = L(i);
    s.style.setProperty('--rot',   v.rot   + 'deg');
    s.style.setProperty('--roty',  v.roty  + 'deg');
    s.style.setProperty('--tx',    v.tx    + 'px');
    s.style.setProperty('--ty',    v.ty    + 'px');
    s.style.setProperty('--scale', v.scale);
  });
  camera();
}

/* Одна камера на всю колоду: точка схода каждого слота смещается в центр
   сцены, иначе каждая карта смотрелась бы строго в лоб. */
function camera(){
  const d = deck.getBoundingClientRect();
  const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
  slots.forEach(s => {
    const r = s.getBoundingClientRect();
    s.style.setProperty('--po', (cx - r.left).toFixed(1) + 'px ' + (cy - r.top).toFixed(1) + 'px');
  });
}
addEventListener('resize', () => { camera(); if (piled) applyPile(); });
function applyMotion(){
  const a = document.getElementById('dk-app');
  a.style.setProperty('--lift',    M.lift + 'px');
  a.style.setProperty('--backz',   M.backz + 'px');
  a.style.setProperty('--tiltd',   M.tilt + 'deg');
  a.style.setProperty('--uy',      M.unwindY / 100);
  a.style.setProperty('--uz',      M.unwindZ / 100);
  a.style.setProperty('--hoverMs', M.hoverMs + 'ms');
  a.style.setProperty('--dealMs',  M.dealMs + 'ms');
}

function applySize(){
  const app = document.getElementById('dk-app');
  app.style.setProperty('--card-w', SIZE.w + 'px');
  app.style.setProperty('--card-h', SIZE.h + 'px');
  app.style.setProperty('--gap',    SIZE.gap + 'px');
}
applySize();
const pose  = slots.map(() => ({ mx: .5, my: .5 }));

applyLayout();          // раскладка веера в переменные — от неё считается полёт
const deepId  = decodeURIComponent((location.hash || '').slice(1));
const deepIdx = CASES.findIndex(c => c.id && c.id === deepId);
requestAnimationFrame(() => {
  camera();
  if (deepIdx >= 0 || deepId === 'cv'){
    /* пришли по прямой ссылке — колода уже разложена */
    piled = false;
    deck.classList.remove('is-pile');
    slots.forEach(s => s.querySelector('.dk-card').classList.remove('is-back'));
    setTimeout(() => { deepIdx >= 0 ? openCase(deepIdx) : openCV(); }, 260);
  } else {
    applyPile();
  }
});

/* ---------- ховер ---------- */
slots.forEach((slot, i) => {
  const hit = slot.querySelector('.dk-hit');

  hit.addEventListener('pointermove', e => {
    const r = slot.getBoundingClientRect();
    const a = -L(i).rot * Math.PI / 180;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    const cl = v => Math.min(1, Math.max(0, v));
    pose[i].mx = cl(lx / slot.offsetWidth  + .5);
    pose[i].my = cl(ly / slot.offsetHeight + .5);
    slot.style.setProperty('--mx', pose[i].mx.toFixed(3));
    slot.style.setProperty('--my', pose[i].my.toFixed(3));
  });

  hit.addEventListener('pointerenter', e => {
    if (mob() || e.pointerType === 'touch') return;
    deck.classList.add('is-live');
    slot.classList.add('is-hot');
    slot.style.zIndex = 20;
    slots.forEach((s, j) => {
      s.classList.toggle('push-l', j < i);
      s.classList.toggle('push-r', j > i);
      s.style.setProperty('--magx', '0px');
      s.style.setProperty('--magy', '0px');
    });
  });

  hit.addEventListener('pointerleave', () => {
    deck.classList.remove('is-live');
    slot.classList.remove('is-hot');
    slot.style.zIndex = '';
    pose[i].mx = pose[i].my = .5;
    slot.style.setProperty('--mx', .5);
    slot.style.setProperty('--my', .5);
    slots.forEach(s => s.classList.remove('push-l', 'push-r'));
  });

  let downX = 0, downY = 0;
  hit.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
  hit.addEventListener('click', e => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 12) return;   // это был свайп
    if (piled) { deal(); return; }
    openCase(i);
  });
  hit.addEventListener('focus', () => { slot.classList.add('is-hot'); slot.style.zIndex = 20; });
  hit.addEventListener('blur',  () => { slot.classList.remove('is-hot'); slot.style.zIndex = ''; });
});

/* ---------- магнит: ближняя карта тянется к курсору, но не достаёт ---------- */
const NEAR = 120, FAR = 420, PULL = 20;

document.addEventListener('pointermove', e => {
  if (mob() || deck.classList.contains('is-live') || open$ >= 0) return;
  let best = -1, bestD = Infinity;
  const c = slots.map((s, i) => {
    const r = s.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (d < bestD){ bestD = d; best = i; }
    return { cx, cy, d };
  });
  slots.forEach((s, i) => {
    if (i !== best || c[i].d < NEAR || c[i].d > FAR){
      s.style.setProperty('--magx', '0px');
      s.style.setProperty('--magy', '0px');
      return;
    }
    const k = (FAR - c[i].d) / (FAR - NEAR);
    const f = PULL * k * k / c[i].d;
    s.style.setProperty('--magx', ((e.clientX - c[i].cx) * f).toFixed(2) + 'px');
    s.style.setProperty('--magy', ((e.clientY - c[i].cy) * f).toFixed(2) + 'px');
  });
});
document.addEventListener('pointerout', e => {
  if (e.relatedTarget) return;
  slots.forEach(s => { s.style.setProperty('--magx','0px'); s.style.setProperty('--magy','0px'); });
});

/* Переворот сжатием: карта схлопывается по горизонтали, в нулевой точке
   подменяется грань, потом раскрывается обратно. Никакого 3D — работает
   одинаково и в веере, и на летящем слое. */
function flipCard(card, toBack, ms){
  if (!card) return Promise.resolve();
  const half = Math.max(70, (ms || 340) / 2);
  const a1 = card.animate(
    [{ transform:'scaleX(1)',   filter:'brightness(1)' },
     { transform:'scaleX(.02)', filter:'brightness(1.45)' }],
    { duration:half, easing:'cubic-bezier(.55,0,.9,.35)', fill:'forwards' });
  return a1.finished.then(() => {
    card.classList.toggle('is-back', !!toBack);
    const a2 = card.animate(
      [{ transform:'scaleX(.02)', filter:'brightness(1.45)' },
       { transform:'scaleX(1)',   filter:'brightness(1)' }],
      { duration:half, easing:'cubic-bezier(.1,.65,.45,1)' });
    a1.cancel();
    return a2.finished;
  }).catch(() => {});
}

/* ---------- содержимое модалки ---------- */
const SHOT_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5">
  <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17 5-4.5 4 3.2 3-2.4 4 3.7"/></svg>`;

function shotHtml(src, ratio){
  return src
    ? `<div class="dk-shot is-zoom"><img src="${src}" alt="" loading="lazy"></div>`
    : `<div class="dk-shot is-empty">${SHOT_ICON}<span>${t(UI.shot)} · ${ratio || '16:9'}</span></div>`;
}

/* Блок кейса: заголовок, текст и картинка ПОД своим текстом — скрин всегда
   стоит рядом с тем, что объясняет. side:true ставит картинку сбоку. */
function sectionHtml(b, empties){
  const shot = b.shot || (empties ? '' : null);
  const pic  = (b.shot || empties) ? shotHtml(b.shot, b.side ? '4:3' : '16:9') : '';
  return `<div class="dk-sec${b.side ? ' is-side' : ''}">
    <div class="dk-sec-txt">
      ${b.h ? `<h3>${t(b.h)}</h3>` : ''}
      ${b.text ? `<p>${t(b.text)}</p>` : ''}
    </div>
    ${pic}
  </div>`;
}

/* ---------- шапка кейса: фрейм, навигация, липкая строка ---------- */
const VIDEO_RE = /\.(mp4|webm|ogg)(\?|#|$)/i;

function embedUrl(u){
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return 'https://www.youtube.com/embed/' + yt[1];
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return 'https://player.vimeo.com/video/' + vm[1];
  return null;
}

function mediaHtml(src){
  if (!src)
    return `<div class="dk-hero-media is-empty">${SHOT_ICON}<span>${t(UI.shot)} · 16:9</span></div>`;
  const emb = embedUrl(src);
  if (emb)
    return `<div class="dk-hero-media"><iframe src="${emb}" title="Видео" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
  if (VIDEO_RE.test(src))
    return `<div class="dk-hero-media"><video src="${src}" controls playsinline preload="metadata"></video></div>`;
  return `<div class="dk-hero-media"><img src="${src}" alt=""></div>`;
}

function navNeighbors(d){
  const i = CASES.indexOf(d), n = CASES.length;
  return { prev: CASES[(i - 1 + n) % n], next: CASES[(i + 1) % n] };
}

function navHtml(d){
  const { prev, next } = navNeighbors(d);
  return `<button class="dk-navb" type="button" data-go="-1">← ${t(prev.studio)}</button>`
       + `<button class="dk-navb" type="button" data-go="1">${t(next.studio)} →</button>`;
}

function heroHtml(d){
  const stats = (d.stats || []).map(x =>
    `<div class="dk-hstat"><b>${t(x[0])}</b><span>${t(x[1])}</span></div>`).join('');
  return `
    <div class="dk-hero">
      ${mediaHtml(d.hero)}
      <div class="dk-hero-shade" aria-hidden="true"></div>
      <div class="dk-hero-top"><div class="dk-hero-nav">${navHtml(d)}</div></div>
      <div class="dk-hero-head">
        <div class="dk-hero-co">${t(d.studio)}${d.date ? ` <span>· ${t(d.date)}</span>` : ''}</div>
        <h2 class="dk-hero-title" id="dk-title">${t(d.title)}</h2>
      </div>
      ${stats ? `<div class="dk-hero-stats">${stats}</div>` : ''}
    </div>`;
}

function barHtml(d){
  return `<div class="dk-bar-co">${t(d.studio)}${d.date ? ` <span>· ${t(d.date)}</span>` : ''}</div>`
       + `<div class="dk-bar-nav">${navHtml(d)}</div>`;
}

function render(d, empties){
  const bar = document.getElementById('dk-bar');
  const isCase = d.id !== 'cv';
  modal.classList.toggle('is-case', isCase);

  if (isCase){
    bar.innerHTML = barHtml(d);
    const secs = (d.sections || []).map(b => sectionHtml(b, empties)).join('');
    inner.innerHTML = `
      ${heroHtml(d)}
      ${d.meta ? `<div class="dk-meta">${t(d.meta)}</div>` : ''}
      ${d.lead ? `<p class="dk-lead">${t(d.lead)}</p>` : ''}
      ${secs}
      <div class="dk-foot">
        ${d.link ? `<a class="dk-link" href="${d.link}" target="_blank" rel="noopener">${t(UI.open)}</a>` : '<span></span>'}
      </div>`;
  } else {
    bar.innerHTML = '';
    const secs = (d.sections || []).map(b => sectionHtml(b, empties)).join('');
    inner.innerHTML = `
      ${d.studio ? `<div class="dk-studio">${t(d.studio)}</div>` : ''}
      ${d.meta   ? `<div class="dk-meta">${t(d.meta)}</div>` : ''}
      ${d.title  ? `<h2 class="dk-title" id="dk-title">${t(d.title)}</h2>` : ''}
      ${d.stats && d.stats.length ? `<div class="dk-stats">${
        d.stats.map(x => `<div class="dk-stat"><b>${t(x[0])}</b><span>${t(x[1])}</span></div>`).join('')}</div>` : ''}
      ${d.lead   ? `<p class="dk-lead">${t(d.lead)}</p>` : ''}
      ${d.frame  ? `<div class="dk-shots"><iframe class="dk-frame" src="${d.frame}" title="CV"></iframe></div>` : secs}
      <div class="dk-foot">
        ${d.link ? `<a class="dk-link" href="${d.link}" target="_blank" rel="noopener">${t(UI.open)}</a>` : '<span></span>'}
      </div>`;
  }
  modal.querySelectorAll('[data-go]').forEach(b =>
    b.addEventListener('click', () => goCase(+b.dataset.go)));
  inner.querySelectorAll('.dk-shot.is-zoom img').forEach(img =>
    img.addEventListener('click', () => zoomOpen(img.src)));
}

/* ---------- карта → оборот → модалка ---------- */
/* Положение слота без учёта его трансформаций — от него считается полёт.
   Летящая карта позиционируется fixed, поэтому координаты нужны экранные:
   вычитаем прокрутку страницы и всех контейнеров (на мобильном колода
   прокручивается по горизонтали). */
function layoutBox(el){
  let x = 0, y = 0, n = el;
  while (n){ x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  let p = el.parentElement;
  while (p && p !== document.body && p !== document.documentElement){
    x -= p.scrollLeft || 0;
    y -= p.scrollTop  || 0;
    p = p.parentElement;
  }
  return { x: x - scrollX, y: y - scrollY, w: el.offsetWidth, h: el.offsetHeight };
}

/* Текущий ракурс карты, разложенный на те же функции, что и цель полёта:
   списки функций совпадают — значит оборот интерполируется покомпонентно
   и действительно проигрывается, а не схлопывается в матрицу. */
function currentPose(i, hot){
  const drift = new DOMMatrix(getComputedStyle(slots[i].querySelector('.dk-float')).transform);
  const v = L(i);
  /* при ховере карта уже развёрнута на зрителя — полёт стартует из этой позы,
     иначе на первом кадре был бы скачок */
  const roty = hot ? v.roty * (1 - M.unwindY / 100) + (pose[i].mx - .5) * M.tilt : v.roty;
  const rot  = hot ? v.rot  * (1 - M.unwindZ / 100) : v.rot;
  return {
    x: v.tx + drift.e,
    y: v.ty + drift.f + (hot ? LIFT_Y : 0),
    z: hot ? M.lift : 0,
    rot, roty,
    rotx: hot ? (pose[i].my - .5) * -M.tilt : 0,
    s:    hot ? 1.04 : v.scale
  };
}
const T = p => `translate(${p.x}px, ${p.y}px) translateZ(${p.z}px) `
             + `rotate(${p.rot}deg) rotateY(${p.roty}deg) rotateX(${p.rotx}deg) scale(${p.s ?? 1})`;

function makeFlyer(i, box){
  const flyer = document.createElement('div');
  flyer.id = 'dk-flyer';
  flyer.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`;
  flyer.style.setProperty('--mx', pose[i].mx);
  flyer.style.setProperty('--my', pose[i].my);
  const clone = slots[i].querySelector('.dk-card').cloneNode(true);
  clone.classList.remove('is-hidden');
  flyer.appendChild(clone);
  document.body.appendChild(flyer);
  return flyer;
}

function lock(on){
  document.documentElement.classList.toggle('dk-lock', on);
  document.body.classList.toggle('dk-lock', on);
}

function openCase(i){
  if (busy || open$ >= 0) return;
  busy = true;
  open$ = i;

  render(CASES[i], true);
  lock(true);

  const slot = slots[i];
  const card = slot.querySelector('.dk-card');
  const box  = layoutBox(slot);
  const from = currentPose(i, true);

  const flyer = makeFlyer(i, box);
  card.classList.add('is-hidden');
  slot.classList.remove('is-hot');
  deck.classList.remove('is-live');
  slots.forEach(s => {
    s.classList.remove('push-l','push-r');
    s.style.setProperty('--magx','0px');
    s.style.setProperty('--magy','0px');
  });
  backdrop.classList.add('is-on');

  const to = {
    x: innerWidth  / 2 - (box.x + box.w / 2),
    y: innerHeight / 2 - (box.y + box.h / 2),
    z: 0, rot: 0, roty: 0, rotx: 0, s: M.zoom / 100
  };

  /* Карта показывает рубашку в полёте двумя переворотами: сжалась — спина —
     сжалась — лицо. Перелёт живёт на обёртке, перевороты на самой карте. */
  const clone = flyer.querySelector('.dk-card');
  const show  = M.showBack ? M.flipMs * 2 + M.hold : 0;
  const total = Math.max(M.flight, show + 260);

  const at = total * .1;
  let modalDelay = M.modalAt;
  if (M.showBack){
    setTimeout(() => flipCard(clone, true,  M.flipMs), at);
    setTimeout(() => flipCard(clone, false, M.flipMs), at + M.flipMs + M.hold);
    /* модалка не должна накрыть рубашку раньше, чем её успели разглядеть */
    modalDelay = Math.max(M.modalAt, at + M.flipMs * 2 + M.hold + 40);
  }

  flyer.animate([{ transform:T(from) }, { transform:T(to) }],
    { duration:total, easing:EASES[M.ease] || EASES[0], fill:'forwards' });
  flyer.animate([{ opacity:1, offset:0 }, { opacity:1, offset:.78 }, { opacity:0, offset:1 }],
    { duration:total, fill:'forwards' });

  setHash(CASES[i].id);
  setTimeout(() => { modal.classList.add('is-on'); scroller.scrollTop = 0; modal.focus(); }, modalDelay);
  setTimeout(() => { flyer.remove(); busy = false; }, Math.max(total, modalDelay) + 40);
}

function openCV(){
  if (busy || open$ >= 0) return;
  open$ = 99;
  render(CV, false);
  lock(true);
  backdrop.classList.add('is-on');
  modal.classList.add('is-on');
  scroller.scrollTop = 0;
  modal.focus();
}

function closeAll(){
  if (busy || open$ < 0) return;

  clearHash();
  if (open$ === 99){                     // CV — без полёта карты
    modal.classList.remove('is-on');
    backdrop.classList.remove('is-on');
    lock(false);
    open$ = -1;
    document.getElementById('dk-cv').focus();
    return;
  }

  busy = true;
  const i = open$;
  const slot = slots[i];
  const card = slot.querySelector('.dk-card');
  const box  = layoutBox(slot);
  const home = currentPose(i, false);

  modal.classList.remove('is-on');

  const flyer = makeFlyer(i, box);
  const from = {
    x: innerWidth  / 2 - (box.x + box.w / 2),
    y: innerHeight / 2 - (box.y + box.h / 2),
    z: 0, rot: 0, roty: 0, rotx: 0, s: M.zoom / 100
  };

  flyer.animate([{ transform:T(from) }, { transform:T(home) }],
    { duration:M.flight * .92, easing:EASES[M.ease] || EASES[0], fill:'forwards' });
  flyer.animate([{ opacity:0, offset:0 }, { opacity:1, offset:.26 }, { opacity:1, offset:1 }],
    { duration:M.flight * .92, fill:'forwards' });

  setTimeout(() => backdrop.classList.remove('is-on'), 190);
  setTimeout(() => {
    flyer.remove();
    card.classList.remove('is-hidden');
    lock(false);
    slot.querySelector('.dk-hit').focus({ preventScroll:true });
    open$ = -1;
    busy = false;
  }, M.flight * .92 + 10);
}

/* ---------- 7. листалка: точки и синхронизация ---------- */
(function(){
  const dots = document.getElementById('dk-dots');
  slots.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'dk-dot';
    d.type = 'button';
    d.setAttribute('aria-label', 'Карта ' + (i + 1));
    d.addEventListener('click', () => scrollTo(i));
    dots.appendChild(d);
  });
  const marks = [...dots.children];

  function scrollTo(i){
    const s = slots[i];
    deck.scrollTo({ left: s.offsetLeft - (deck.clientWidth - s.offsetWidth) / 2, behavior:'smooth' });
  }

  function sync(){
    if (!mob()) return;
    const mid = deck.scrollLeft + deck.clientWidth / 2;
    let best = 0, bd = Infinity;
    slots.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (d < bd){ bd = d; best = i; }
    });
    marks.forEach((m, i) => m.classList.toggle('is-on', i === best));
  }

  deck.addEventListener('scroll', () => {
    clearTimeout(deck._t);
    deck._t = setTimeout(sync, 60);
  }, { passive:true });
  addEventListener('resize', sync);
  MQ.addEventListener('change', () => { applyLayout(); sync(); });
  sync();
})();

/* ============================================================================
   СТОПКА И РАЗДАЧА
   Колода лежит рубашкой вверх в одной точке. Клик — блинк, вспышка, карты
   разъезжаются по своим местам в веере, по дороге переворачиваясь лицом.
   ============================================================================ */
let piled = true;

/* Стопка считается от места карты в потоке: каждая съезжает к общему центру
   плюс пара пикселей разброса, чтобы колода не выглядела одной картой. */
const JIT = [
  { r:-2.6, x:-4, y: 7 }, { r: 1.8, x: 3, y: 4 }, { r:-1.1, x:-1, y: 0 },
  { r: 2.4, x: 4, y:-4 }, { r:-1.9, x:-3, y:-7 }
];

function applyPile(){
  const anchor = slots[mob() ? 0 : Math.floor(slots.length / 2)];
  const a = anchor.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  slots.forEach((s, i) => {
    const r = s.getBoundingClientRect();
    const j = JIT[i] || { r:0, x:0, y:0 };
    s.style.setProperty('--tx',    (ax - (r.left + r.width  / 2) + j.x).toFixed(1) + 'px');
    s.style.setProperty('--ty',    (ay - (r.top  + r.height / 2) + j.y).toFixed(1) + 'px');
    s.style.setProperty('--rot',   j.r + 'deg');
    s.style.setProperty('--roty',  '0deg');
    s.style.setProperty('--scale', 1);
    s.style.zIndex = i;                            // верхняя карта — последняя
    const c = s.querySelector('.dk-card');
    c.classList.add('is-back');                    // колода лежит рубашкой вверх
    c.getAnimations().forEach(a => a.cancel());
    c.style.transform = '';
  });
  deck.classList.add('is-pile');
}

function deal(){
  if (!piled) return;
  piled = false;

  const blink = document.getElementById('dk-blink');
  const flash = document.getElementById('dk-flash');
  const a = slots[Math.floor(slots.length / 2)].getBoundingClientRect();
  const app = document.getElementById('dk-app').getBoundingClientRect();
  flash.style.left = (a.left + a.width / 2 - app.left - 300) + 'px';
  flash.style.top  = (a.top  + a.height / 2 - app.top  - 300) + 'px';
  flash.style.right = 'auto'; flash.style.bottom = 'auto';
  flash.style.width = '600px'; flash.style.height = '600px';

  blink.animate([{opacity:0},{opacity:.9,offset:.45},{opacity:0}],
    { duration: M.blink, easing:'ease-out' });
  setTimeout(() => {
    flash.animate(
      [{opacity:0, transform:'scale(.35)'},
       {opacity: M.flash / 100, transform:'scale(1.15)', offset:.28},
       {opacity:0, transform:'scale(2.3)'}],
      { duration: 460, easing:'cubic-bezier(.2,.7,.3,1)' });
    if (DK.burst) DK.burst(a.left + a.width / 2, a.top + a.height / 2);

    deck.classList.add('is-dealing');
    deck.classList.remove('is-pile');
    slots.forEach((s, i) => {
      s.style.setProperty('--delay', (i * M.dealStep) + 'ms');
      s.style.zIndex = '';
      setTimeout(() => flipCard(s.querySelector('.dk-card'), false, M.flipMs),
                 i * M.dealStep + M.dealMs * .3);
    });
    applyLayout();
    setTimeout(() => {
      deck.classList.remove('is-dealing');
      slots.forEach(s => s.style.removeProperty('--delay'));
    }, M.dealMs + M.dealStep * slots.length + 60);
  }, M.blink * 0.42);
}

document.getElementById('dk-cv').addEventListener('click', openCV);

/* ---------- 5. пылинки: canvas, а не сотня узлов ---------- */
(function(){
  const cv  = document.getElementById('dk-dust');
  const ctx = cv.getContext('2d');
  const app = document.getElementById('dk-app');
  let W = 0, H = 0, dots = [], dpr = 1;

  function build(){
    dpr = Math.min(2, devicePixelRatio || 1);
    W = app.clientWidth; H = app.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(150, W * H / 12000));
    dots = Array.from({ length:n }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: .4 + Math.random() * 1.5,
      v: .07 + Math.random() * .34,          // скорость всплытия
      sway: .25 + Math.random() * .7,        // амплитуда качания
      ph: Math.random() * Math.PI * 2,
      tw: .5 + Math.random() * 1.6,          // частота мерцания
      a: .12 + Math.random() * .5
    }));
  }

  let t = 0;
  function frame(){
    t += .016;
    ctx.clearRect(0, 0, W, H);
    for (const d of dots){
      d.y -= d.v;
      if (d.y < -6){ d.y = H + 6; d.x = Math.random() * W; }
      const x = d.x + Math.sin(t * .5 + d.ph) * d.sway * 6;
      const a = d.a * (.55 + .45 * Math.sin(t * d.tw + d.ph));
      const grow = 1 - d.y / H;              // ближе к свету снизу — ярче
      ctx.beginPath();
      ctx.arc(x, d.y, d.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,238,214,' + (a * (.45 + grow * .75)).toFixed(3) + ')';
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  /* толчок частицам от вспышки */
  DK.burst = (cx, cy) => {
    const r = cv.getBoundingClientRect();
    const x0 = cx - r.left, y0 = cy - r.top;
    for (const d of dots){
      const dx = d.x - x0, dy = d.y - y0;
      const dist = Math.max(40, Math.hypot(dx, dy));
      const k = 220 / dist;
      d.x += dx / dist * k * 6;
      d.y += dy / dist * k * 6;
      d.v += k * .12;
      d.a = Math.min(.9, d.a + k * .08);
    }
  };

  build();
  frame();
  addEventListener('resize', build);
})();

/* ---------- 9. магнит и аберрация у кнопки CV ---------- */
(function(){
  const btn = document.getElementById('dk-cv');
  const R = 130, PULL = 14;

  document.addEventListener('pointermove', e => {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R){
      btn.style.setProperty('--cvx',  '0px');
      btn.style.setProperty('--cvy',  '0px');
      btn.style.setProperty('--cvrx', '0deg');
      btn.style.setProperty('--cvry', '0deg');
      btn.style.setProperty('--ab',   '0px');
      return;
    }
    const k = 1 - d / R;
    btn.style.setProperty('--cvx',  (dx * k * PULL / R * 2).toFixed(2) + 'px');
    btn.style.setProperty('--cvy',  (dy * k * PULL / R * 2).toFixed(2) + 'px');
    btn.style.setProperty('--cvry', (dx / R * 16 * k).toFixed(2) + 'deg');
    btn.style.setProperty('--cvrx', (-dy / R * 16 * k).toFixed(2) + 'deg');
    btn.style.setProperty('--ab',   (k * 1.05).toFixed(2) + 'px');
  });
})();

/* ---------- лупа ---------- */
const zoom    = document.getElementById('dk-zoom');
const zoomImg = document.getElementById('dk-zoom-img');
function zoomOpen(src){ zoomImg.src = src; zoom.classList.add('is-on'); zoom.setAttribute('aria-label', t(UI.zoom)); }
function zoomClose(){ zoom.classList.remove('is-on'); }
zoom.addEventListener('click', zoomClose);

/* ---------- переход между кейсами без перелёта ---------- */
function goCase(dir){
  if (busy || open$ < 0 || open$ === 99) return;
  const prev = open$;
  const next = (prev + dir + CASES.length) % CASES.length;
  slots[prev].querySelector('.dk-card').classList.remove('is-hidden');
  slots[next].querySelector('.dk-card').classList.add('is-hidden');
  open$ = next;
  inner.style.opacity = '0';
  setTimeout(() => {
    render(CASES[next], true);
    scroller.scrollTop = 0;
    inner.style.opacity = '';
    setHash(CASES[next].id);
  }, 180);
}

/* ---------- адрес страницы указывает на открытый кейс ---------- */
function setHash(id){
  if (!id) return;
  try { history.replaceState(null, '', '#' + id); } catch (e) {}
}
function clearHash(){
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
}

/* ---------- клавиатура и фокус ---------- */
addEventListener('keydown', e => {
  if (zoom.classList.contains('is-on')){
    if (e.key === 'Escape') { zoomClose(); e.preventDefault(); }
    return;
  }
  if (e.key === 'Escape') { closeAll(); return; }
  if (open$ < 0 || open$ === 99) return;
  if (e.key === 'ArrowRight') goCase(1);
  if (e.key === 'ArrowLeft')  goCase(-1);
  /* фокус не должен уходить на карты за окном */
  if (e.key === 'Tab'){
    const f = [...modal.querySelectorAll('button, a[href], iframe, [tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first){ last.focus();  e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
  }
});

/* ---------- свайп вниз закрывает кейс на телефоне ---------- */
(function(){
  let y0 = null;
  modal.addEventListener('touchstart', e => {
    y0 = scroller.scrollTop <= 0 ? e.touches[0].clientY : null;
  }, { passive:true });
  modal.addEventListener('touchmove', e => {
    if (y0 === null) return;
    if (e.touches[0].clientY - y0 > 110){ y0 = null; closeAll(); }
  }, { passive:true });
  modal.addEventListener('touchend', () => { y0 = null; });
})();

/* ---------- переключатель языка ---------- */
(function(){
  const btn  = document.getElementById('dk-lang');
  const nameEl = document.getElementById('dk-name');
  function apply(){
    /* на кнопке — язык, на который переключит */
    btn.textContent = LANG === 'ru' ? 'EN' : 'RU';
    btn.setAttribute('aria-label', LANG === 'ru' ? 'Switch to English' : 'Переключить на русский');
    nameEl.textContent = t(SITE.name) + ' ';
    const roleEl = document.createElement('span');
    roleEl.textContent = t(UI.role);
    nameEl.appendChild(roleEl);
    document.getElementById('dk-cv').setAttribute('aria-label', t(UI.cv));
    document.getElementById('dk-close').setAttribute('aria-label', t(UI.close));
    slots.forEach((s, i) => s.querySelector('.dk-hit')
      .setAttribute('aria-label', t(UI.card) + ': ' + t(CASES[i].studio)));
    if (open$ >= 0) render(open$ === 99 ? CV : CASES[open$], open$ !== 99);
  }
  function set(l){
    LANG = l;
    try { localStorage.setItem('dk-lang', l); } catch (e) {}
    apply();
  }
  btn.addEventListener('click', () => set(LANG === 'ru' ? 'en' : 'ru'));
  document.getElementById('dk-tg').href = TG;
  apply();
})();

/* ---------- обложки грузятся, пока человек смотрит на стопку ---------- */
CASES.forEach(c => {
  [c.cover, c.back].forEach(u => { if (u){ const i = new Image(); i.src = u; } });
});

backdrop.addEventListener('click', closeAll);
})();
