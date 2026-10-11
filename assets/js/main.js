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
addEventListener('resize', fitStretch);
document.fonts?.ready.then(fitStretch);

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

// ---------- Курсор, отталкивание букв, магнитная кнопка ----------
let mouseX = -9999, mouseY = -9999;
if (finePointer && !reduceMotion) {
  const cursor = document.querySelector('.cursor');
  let cx = innerWidth / 2, cy = innerHeight / 2;
  addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; cursor.classList.add('is-visible'); });
  document.addEventListener('mouseleave', () => { cursor.classList.remove('is-visible'); mouseX = mouseY = -9999; });
  document.addEventListener('mouseover', (e) => {
    cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .track, .pin'));
  });

  const offsets = letters.map(() => ({ x: 0, y: 0 }));
  const loop = () => {
    cx = lerp(cx, mouseX, 0.3); cy = lerp(cy, mouseY, 0.3);
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    // Буквы разлетаются от курсора и плавно возвращаются
    letters.forEach((l, i) => {
      const r = l.getBoundingClientRect();
      const dx = r.left + r.width / 2 - mouseX;
      const dy = r.top + r.height / 2 - mouseY;
      const dist = Math.hypot(dx, dy);
      const force = Math.max(0, 1 - dist / 220);
      const tx = dist ? (dx / dist) * force * 28 : 0;
      const ty = dist ? (dy / dist) * force * 28 : 0;
      offsets[i].x = lerp(offsets[i].x, tx, 0.06);
      offsets[i].y = lerp(offsets[i].y, ty, 0.06);
      l.style.translate = `${offsets[i].x}px ${offsets[i].y}px`;
      l.style.rotate = `${offsets[i].x * 0.08}deg`;
    });
    requestAnimationFrame(loop);
  };
  loop();

  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.18}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

// ---------- Пластинка: крутится, быстрее при наведении на трек ----------
(() => {
  const disc = document.querySelector('.vinyl__disc');
  const section = document.querySelector('.tracklist');
  let rot = 0, speed = 0.35, target = 0.35;
  document.querySelectorAll('.track').forEach((t) => {
    t.addEventListener('mouseenter', () => { target = 1.6; });
    t.addEventListener('mouseleave', () => { target = 0.35; });
  });
  const loop = () => {
    speed = lerp(speed, target, 0.03);
    if (!reduceMotion) rot = (rot + speed) % 360;
    // Пластинка выезжает из конверта, пока секция проходит экран
    const r = section.getBoundingClientRect();
    const p = clamp01((innerHeight - r.top) / (innerHeight * 0.9));
    disc.style.setProperty('--rot', `${rot}deg`);
    disc.style.setProperty('--slide', `${-30 + p * 62}%`);
    requestAnimationFrame(loop);
  };
  loop();
})();

// ---------- Скролл: заявление, папки кейсов, прогресс, обложка ----------
(() => {
  const statement = document.querySelector('.statement');
  const folders = [...document.querySelectorAll('.casefile')];
  const progress = document.querySelector('.frame__progress i');
  const cover = document.querySelector('.cover');
  const coverTitle = document.querySelector('.cover__title');
  const coverVideo = document.querySelector('.cover__video');
  const wide = () => innerWidth > 1000;

  const tick = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${y / Math.max(max, 1)})`;

    // Слова заявления загораются по мере прокрутки
    const sr = statement.getBoundingClientRect();
    const sp = clamp01(-sr.top / Math.max(statement.offsetHeight - innerHeight, 1));
    const lit = Math.round(sp * 1.15 * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', reduceMotion || i < lit));

    // Папки кейсов: нижняя уходит вглубь стопки, когда на неё ложится следующая
    if (wide() && !reduceMotion) {
      folders.forEach((f, i) => {
        const next = folders[i + 1];
        if (!next) return;
        const gap = next.getBoundingClientRect().top - f.getBoundingClientRect().top;
        const p = 1 - clamp01(gap / Math.max(f.offsetHeight, 1));
        f.style.transform = `scale(${1 - p * 0.05})`;
        f.style.filter = `brightness(${1 - p * 0.45})`;
      });
    }

    // Обложка уходит в размытие
    if (!reduceMotion && y < cover.offsetHeight * 1.2) {
      const k = y / cover.offsetHeight;
      coverTitle.style.filter = `blur(${k * 16}px)`;
      coverTitle.style.opacity = String(1 - k * 0.8);
      coverVideo.style.transform = `scale(${1 + k * 0.2})`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

// ---------- Корешок дела: номер листа по текущей секции ----------
(() => {
  const b = document.querySelector('.spine__sheet b');
  let current = '01';
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting || e.target.dataset.sheet === current) return;
      current = e.target.dataset.sheet;
      b.classList.add('is-changing');
      setTimeout(() => { b.textContent = current; b.classList.remove('is-changing'); }, 300);
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  document.querySelectorAll('[data-sheet]').forEach((sec) => obs.observe(sec));
})();

// ---------- Сияния чуть смещаются при прокрутке ----------
(() => {
  if (reduceMotion) return;
  const glows = [...document.querySelectorAll('.glow')];
  const speeds = [-0.08, 0.05, -0.04];
  const tick = () => {
    glows.forEach((g, i) => { g.style.translate = `0 ${scrollY * speeds[i]}px`; });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

// ---------- Пыль и царапины старой плёнки ----------
(() => {
  if (reduceMotion) return;
  const canvas = document.querySelector('.dust');
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
}, { threshold: 0.1 });
document.querySelectorAll('video').forEach((v) => videoObserver.observe(v));
