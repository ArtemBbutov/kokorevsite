const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Плавный скролл ----------
let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new Lenis({ duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target || !lenis) return;
    e.preventDefault();
    lenis.scrollTo(target);
  });
});

// ---------- Печати: надпись по кругу + гравировочные кольца ----------
// Текст растягивается ровно на длину окружности, поэтому кольцо замыкается без зазора
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const R = 80;
  document.querySelectorAll('[data-seal]').forEach((el, i) => {
    const id = `seal-path-${i}`;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('class', 'seal__ring');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs><path id="${id}" d="M100,100 m-${R},0 a${R},${R} 0 1,1 ${R * 2},0 a${R},${R} 0 1,1 -${R * 2},0"/></defs>
      <circle class="seal__line" cx="100" cy="100" r="${R + 15}"/>
      <circle class="seal__line seal__line--dash" cx="100" cy="100" r="${R - 7}"/>
      <text><textPath href="#${id}" textLength="${(2 * Math.PI * R - 6).toFixed(1)}" lengthAdjust="spacing"></textPath></text>`;
    svg.querySelector('textPath').textContent = el.dataset.seal;
    el.prepend(svg);
  });
})();

// ---------- Буквы обложки ----------
const letters = [];
document.querySelectorAll('[data-letters]').forEach((el) => {
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'ltr';
    span.textContent = ch;
    span.style.setProperty('--i', i);
    el.append(span);
    letters.push(span);
  });
});

// ---------- Заявление: слова по отдельности ----------
const words = [];
document.querySelectorAll('[data-words]').forEach((el) => {
  const text = el.textContent.trim();
  el.textContent = '';
  text.split(/\s+/).forEach((w, i, all) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = w;
    el.append(span);
    if (i < all.length - 1) el.append(' ');
    words.push(span);
  });
});

// ---------- Место под вытянутые заголовки ----------
// scaleY(1.32) растягивает текст вниз, но не сдвигает соседей — добавляем отступ по реальной высоте
const STRETCH = 1.32;
const fitStretch = () => {
  document.querySelectorAll('.stretch').forEach((el) => {
    el.style.setProperty("--stretch-comp", `${el.offsetHeight * (STRETCH - 1 + 0.08)}px`);  // +8% — запас на хвосты букв
  });
};
fitStretch();
document.fonts?.ready.then(fitStretch);
let lastWidth = innerWidth, resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    fitStretch();
  }, 150);
});

// ---------- Интро ----------
(() => {
  const intro = document.querySelector('.intro');
  const num = intro.querySelector('.intro__num');
  const duration = reduceMotion ? 100 : 1900;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    num.textContent = String(Math.round(p * 100)).padStart(3, '0');
    if (p < 1) return requestAnimationFrame(tick);
    intro.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    document.querySelectorAll('.cover .blur-in').forEach((el) => {
      el.style.setProperty('--delay', '.5s');
      el.classList.add('is-in');
    });
    // Буквы обложки доехали на место — перезамеряем их координаты
    setTimeout(() => measure(), 1700);
  };
  requestAnimationFrame(tick);
})();

// ---------- Появление при скролле ----------
document.querySelectorAll('.reveal').forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
  el.style.setProperty('--delay', `${Math.min(siblings.indexOf(el), 5) * 0.1}s`);
});
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-in');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.2 });
document.querySelectorAll('.reveal, main section:not(.cover) .blur-in').forEach((el) => observer.observe(el));

// ---------- Счётчики ----------
const formatNumber = (n) => n.toLocaleString('ru-RU').replace(/\s/g, '.');
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.count);
    countObserver.unobserve(el);
    if (reduceMotion) { el.textContent = formatNumber(target); return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 2600, 1);
      el.textContent = formatNumber(Math.round(target * (1 - Math.pow(1 - p, 5))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));

// ---------- Часы (Москва) ----------
(() => {
  const clock = document.querySelector('.frame__clock');
  const fmt = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tick = () => { clock.textContent = `MSK ${fmt.format(new Date())}`; };
  tick();
  setInterval(tick, 1000);
})();

// ---------- Мерцание отдельных букв ----------
if (!reduceMotion) {
  const flicker = () => {
    const l = letters[(Math.random() * letters.length) | 0];
    if (l && document.body.classList.contains('is-ready')) {
      l.classList.add('is-flicker');
      setTimeout(() => l.classList.remove('is-flicker'), 300 + Math.random() * 400);
    }
    setTimeout(flicker, 1500 + Math.random() * 2500);
  };
  flicker();
}

// ---------- Какие секции сейчас на экране ----------
// Тяжёлые анимации работают только пока их видно
const visible = new WeakMap();
const visObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => visible.set(e.target, e.isIntersecting));
}, { rootMargin: '120px 0px' });
const watch = (el) => { if (el) { visible.set(el, false); visObserver.observe(el); } return el; };

const cover = watch(document.querySelector('.cover'));
const coverTitle = document.querySelector('.cover__title');
const coverVideo = document.querySelector('.cover__video');
const tracklist = watch(document.querySelector('.tracklist'));
const disc = document.querySelector('.vinyl__disc');
const casesSection = watch(document.querySelector('.cases'));
const statement = document.querySelector('.statement');
const progress = document.querySelector('.frame__progress i');
const folders = [...document.querySelectorAll('.casefile:not(.casefile--next)')];
const nextFolder = document.querySelector('.casefile--next');
// Затемнение папок — отдельный слой с прозрачностью (дешевле фильтра яркости)
const shades = folders.map((f) => {
  const shade = document.createElement('i');
  shade.className = 'casefile__shade';
  f.querySelector('.casefile__body').append(shade);
  return shade;
});
const wide = () => innerWidth > 1000;

// ---------- Замеры: делаем редко, а не в каждом кадре ----------
const geo = { coverH: 1, statementTop: 0, statementRange: 1, maxScroll: 1, tracklistTop: 0 };
const letterBase = [];  // центры букв обложки без учёта отталкивания
const measure = () => {
  const y = scrollY;
  geo.coverH = cover.offsetHeight || 1;
  const sr = statement.getBoundingClientRect();
  geo.statementTop = sr.top + y;
  geo.statementRange = Math.max(statement.offsetHeight - innerHeight, 1);
  geo.maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
  geo.tracklistTop = tracklist.getBoundingClientRect().top + y;
  letters.forEach((l, i) => {
    const r = l.getBoundingClientRect();
    const t = letterOffsets[i] || { x: 0, y: 0 };
    letterBase[i] = { x: r.left + r.width / 2 - t.x, y: r.top + r.height / 2 - t.y + y };
  });
};
const letterOffsets = letters.map(() => ({ x: 0, y: 0 }));

// ---------- Всё, что зависит от прокрутки, — один обработчик ----------
let lastLit = -1, scrollQueued = false;
const onScroll = () => {
  scrollQueued = false;
  const y = scrollY;
  progress.style.transform = `scaleX(${Math.min(y / geo.maxScroll, 1)})`;

  // Обложка: при уходе заголовок гаснет и приподнимается (без размытия — оно тормозило)
  if (!reduceMotion && y < geo.coverH * 1.2) {
    const k = y / geo.coverH;
    coverTitle.style.opacity = String(Math.max(1 - k * 1.1, 0));
    coverTitle.style.transform = `translate3d(0, ${-k * 60}px, 0)`;
    coverVideo.style.transform = `scale(${1 + k * 0.15})`;
  }

  // Слова заявления загораются по мере прокрутки — трогаем только изменившиеся
  const sp = clamp01((y - geo.statementTop) / geo.statementRange);
  const lit = reduceMotion ? words.length : Math.round(sp * 1.15 * words.length);
  if (lit !== lastLit) {
    const from = Math.min(lit, Math.max(lastLit, 0)), to = Math.max(lit, lastLit);
    for (let i = from; i < Math.min(to, words.length); i++) words[i].classList.toggle('is-lit', i < lit);
    lastLit = lit;
  }

  // Пластинка выезжает из конверта
  if (visible.get(tracklist)) {
    const p = clamp01((y + innerHeight - geo.tracklistTop) / (innerHeight * 0.9));
    disc.style.setProperty('--slide', `${-30 + p * 62}%`);
  }

  // Папки кейсов: нижняя уходит вглубь стопки — сначала все замеры, потом все изменения
  if (wide() && !reduceMotion && visible.get(casesSection)) {
    const tops = [...folders, nextFolder].map((f) => f.getBoundingClientRect().top);
    folders.forEach((f, i) => {
      const p = 1 - clamp01((tops[i + 1] - tops[i]) / Math.max(f.offsetHeight, 1));
      f.style.transform = p > 0.001 ? `scale(${1 - p * 0.05})` : '';
      shades[i].style.opacity = String(p * 0.45);
    });
  }
};
const requestScroll = () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(onScroll);
};
addEventListener('scroll', requestScroll, { passive: true });
addEventListener('resize', () => { measure(); requestScroll(); });
addEventListener('load', () => { measure(); requestScroll(); });
document.fonts?.ready.then(() => { measure(); requestScroll(); });
measure();
requestScroll();

// ---------- Покадровые анимации: курсор, буквы, пластинка ----------
let mouseX = -9999, mouseY = -9999, mouseMoved = false;
const cursor = document.querySelector('.cursor');
let cx = innerWidth / 2, cy = innerHeight / 2;
let rot = 0, speed = 0.35, targetSpeed = 0.35;

if (finePointer && !reduceMotion) {
  addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; mouseMoved = true; cursor.classList.add('is-visible'); }, { passive: true });
  document.addEventListener('mouseleave', () => { cursor.classList.remove('is-visible'); mouseX = mouseY = -9999; });
  document.addEventListener('mouseover', (e) => {
    cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .track, .pin'));
  });
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.18}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}
document.querySelectorAll('.track').forEach((t) => {
  t.addEventListener('mouseenter', () => { targetSpeed = 1.6; });
  t.addEventListener('mouseleave', () => { targetSpeed = 0.35; });
});

const frame = () => {
  requestAnimationFrame(frame);
  if (reduceMotion) return;

  if (finePointer) {
    // Курсор догоняет мышь; когда догнал — ничего не пишем
    if (Math.abs(mouseX - cx) > 0.1 || Math.abs(mouseY - cy) > 0.1) {
      cx = lerp(cx, mouseX, 0.3); cy = lerp(cy, mouseY, 0.3);
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    }
    // Буквы обложки отталкиваются от курсора — только пока обложка на экране
    if (visible.get(cover) && (mouseMoved || letterOffsets.some((o) => Math.abs(o.x) + Math.abs(o.y) > 0.05))) {
      mouseMoved = false;
      const y = scrollY;
      letters.forEach((l, i) => {
        const base = letterBase[i];
        if (!base) return;
        const dx = base.x - mouseX, dy = base.y - y - mouseY;
        const dist = Math.hypot(dx, dy);
        const force = Math.max(0, 1 - dist / 220);
        const o = letterOffsets[i];
        o.x = lerp(o.x, dist ? (dx / dist) * force * 28 : 0, 0.08);
        o.y = lerp(o.y, dist ? (dy / dist) * force * 28 : 0, 0.08);
        l.style.translate = `${o.x.toFixed(2)}px ${o.y.toFixed(2)}px`;
      });
    }
  }

  // Пластинка крутится, только пока её видно
  if (visible.get(tracklist)) {
    speed = lerp(speed, targetSpeed, 0.03);
    rot = (rot + speed) % 360;
    disc.style.setProperty('--rot', `${rot.toFixed(2)}deg`);
  }
};
requestAnimationFrame(frame);

// ---------- Пыль и царапины старой плёнки ----------
(() => {
  const canvas = document.querySelector('.dust');
  // На телефонах пыль не рисуем — экономим батарею и кадры
  if (reduceMotion || !finePointer || innerWidth < 1000) { canvas.remove(); return; }
  const ctx = canvas.getContext('2d');
  let w, h, last = 0;
  const scratches = [];
  const resize = () => { w = canvas.width = innerWidth; h = canvas.height = innerHeight; };
  addEventListener('resize', resize);
  resize();
  const draw = (now) => {
    requestAnimationFrame(draw);
    if (now - last < 83) return;  // ~12 кадров/с, как у проектора
    last = now;
    ctx.clearRect(0, 0, w, h);
    // Пылинки: несколько точек и волосков в случайных местах
    const specks = Math.random() * 7 | 0;
    for (let i = 0; i < specks; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      ctx.fillStyle = `rgba(238, 232, 221, ${0.15 + Math.random() * 0.35})`;
      if (Math.random() < 0.25) {
        // волосок
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 1.6 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Вертикальные царапины живут несколько кадров и чуть дрожат
    if (Math.random() < 0.06) scratches.push({ x: Math.random() * w, life: 4 + Math.random() * 10 | 0, a: 0.05 + Math.random() * 0.08 });
    for (let i = scratches.length - 1; i >= 0; i--) {
      const sc = scratches[i];
      sc.x += (Math.random() - 0.5) * 3;
      ctx.fillStyle = `rgba(238, 232, 221, ${sc.a})`;
      ctx.fillRect(sc.x, 0, 1, h);
      if (--sc.life <= 0) scratches.splice(i, 1);
    }
  };
  requestAnimationFrame(draw);
})();

// ---------- Видео играют только на экране ----------
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting && !reduceMotion) target.play().catch(() => {});
    else target.pause();
  });
}, { threshold: 0.01, rootMargin: '200px 0px' });  // запускаем чуть заранее, чтобы видео успело начаться
document.querySelectorAll('video').forEach((v) => videoObserver.observe(v));
