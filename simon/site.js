/* Simon Sköld – mockup (utkast). Rörelselagret.
   Inga bibliotek, ingen spårning, inga nätverksanrop. Sidan är komplett utan
   den här filen; den körs bara när <html> har klassen "fx". */
(() => {
  'use strict';
  const root = document.documentElement;
  if (!root.classList.contains('fx')) return;
  root.classList.add('js');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';

  let vw = window.innerWidth, vh = window.innerHeight;
  let sy = window.scrollY, vel = 0, dirty = true;

  /* ---------- inträden ---------- */
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* ---------- remsan: dubbla raden så att slingan blir sömlös ---------- */
  const row = $('.ticker__row');
  if (row) {
    $$('li', row).forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); row.appendChild(c); });
  }

  /* ---------- start: ljusstreck på canvas ---------- */
  const hero = $('.hero'), cv = $('#streaks');
  const heroPhoto = $('.hero__photo'), heroTitle = $('.hero__title');
  const top = $('.top'), bar = $('.progress i');
  let ctx = null, cw = 0, ch = 0, streaks = [], heroVisible = true, lastT = performance.now();

  const mkStreak = (anywhere) => {
    const d = Math.pow(Math.random(), 1.6);           // 0 = långt bort, 1 = nära
    const len = 50 + d * 420;
    return {
      x: anywhere ? Math.random() * (cw + len) : -Math.random() * cw * 0.4,
      y: ch * (0.14 + 0.84 * Math.random()),
      len, d, spd: 120 + d * 1050, w: 0.6 + d * 1.7,
      red: Math.random() < 0.34, a: 0.07 + d * 0.3
    };
  };
  const sizeCanvas = () => {
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = hero.clientWidth; ch = hero.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = cw < 700 ? 20 : 44;
    streaks = Array.from({ length: n }, () => mkStreak(true));
  };
  const drawStreaks = (dt) => {
    if (!ctx) return;
    const boost = 1 + Math.min(7, Math.abs(vel) * 0.09);
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < streaks.length; i++) {
      const s = streaks[i];
      s.x += s.spd * boost * dt;
      if (s.x - s.len > cw) { streaks[i] = mkStreak(false); continue; }
      const len = s.len * (0.8 + boost * 0.2);
      const g = ctx.createLinearGradient(s.x - len, 0, s.x, 0);
      const c = s.red ? '255,59,31' : '236,230,218';
      g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(1, `rgba(${c},${s.a})`);
      ctx.strokeStyle = g; ctx.lineWidth = s.w;
      ctx.beginPath(); ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
  };
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; }).observe(hero);
  }

  /* ---------- varvet: fäst scen ---------- */
  const lap = $('.lap');
  const trk = $('#trk'), glow = $('.trk--glow'), car = $('.trk__car'), halo = $('.trk__car-halo');
  const marksG = $('.trk__marks'), sectors = $$('.sector'), lapNum = $('.lap__num'), lapPct = $('.lap__pct');
  let L = 0, lapTop = 0, lapLen = 1, lapIdx = -1, marks = [];
  if (lap && trk) {
    lap.classList.add('lap--pin');
    L = trk.getTotalLength();
    for (const p of [trk, glow]) { p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; }
    sectors.forEach((_, i) => {
      const at = (i / sectors.length) * L;
      const a = trk.getPointAtLength(at), b = trk.getPointAtLength((at + 2) % L);
      let nx = -(b.y - a.y), ny = b.x - a.x; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      if ((a.x - 300) * nx + (a.y - 210) * ny < 0) { nx = -nx; ny = -ny; }   // peka utåt
      const g = document.createElementNS(SVGNS, 'g');
      const ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', a.x - nx * 13); ln.setAttribute('y1', a.y - ny * 13);
      ln.setAttribute('x2', a.x + nx * 13); ln.setAttribute('y2', a.y + ny * 13);
      const tx = document.createElementNS(SVGNS, 'text');
      tx.setAttribute('x', a.x + nx * 30); tx.setAttribute('y', a.y + ny * 30 + 4);
      tx.setAttribute('text-anchor', 'middle'); tx.textContent = 'S' + (i + 1);
      g.appendChild(ln); g.appendChild(tx); marksG.appendChild(g); marks.push(g);
    });
  }
  const updateLap = () => {
    if (!L) return;
    const p = clamp((sy - lapTop) / lapLen);
    const off = L * (1 - p);
    trk.style.strokeDashoffset = off; glow.style.strokeDashoffset = off;
    const pt = trk.getPointAtLength(Math.min(L - 0.01, p * L));
    car.setAttribute('cx', pt.x); car.setAttribute('cy', pt.y);
    halo.setAttribute('cx', pt.x); halo.setAttribute('cy', pt.y);
    halo.setAttribute('r', 11 + Math.min(10, Math.abs(vel) * 0.25));
    lapPct.textContent = Math.round(p * 100);
    const idx = Math.min(sectors.length - 1, Math.floor(p * sectors.length));
    if (idx !== lapIdx) {
      lapIdx = idx;
      sectors.forEach((s, i) => { s.classList.toggle('on', i === idx); s.classList.toggle('was', i < idx); });
      marks.forEach((m, i) => m.classList.toggle('on', i <= idx));
      lapNum.textContent = '0' + (idx + 1);
    }
  };

  /* ---------- kanalen: fäst sidledsscroll på bred skärm ---------- */
  const strip = $('.strip'), track = $('.strip__track');
  let stripPinned = false, stripTop = 0, stripDist = 0;
  const setupStrip = () => {
    if (!strip) return;
    const want = vw >= 900 && vh >= 560;
    strip.classList.toggle('strip--pin', want);
    stripPinned = want;
    if (want) {
      stripDist = Math.max(0, track.offsetWidth - vw);
      strip.style.height = (vh + stripDist) + 'px';
    } else {
      strip.style.height = ''; track.style.transform = '';
    }
  };
  const updateStrip = () => {
    if (!stripPinned) return;
    const p = clamp((sy - stripTop) / (stripDist || 1));
    const skew = clamp(vel * -0.035, -3.5, 3.5);
    track.style.transform = `translate3d(${-p * stripDist}px,0,0) skewX(${skew.toFixed(2)}deg)`;
  };
  if (strip) {
    // tangentbord: när ett kort får fokus i fäst läge, scrolla dit i stället för att låta ramen hoppa
    strip.addEventListener('focusin', e => {
      if (!stripPinned) return;
      const stage = $('.strip__stage'); stage.scrollLeft = 0;
      const li = e.target.closest('.vid'); if (!li) return;
      const want = clamp((li.offsetLeft - vw * 0.2) / (stripDist || 1));
      window.scrollTo({ top: stripTop + want * stripDist, behavior: 'auto' });
    });
  }

  /* ---------- garaget: bild som följer pekaren ---------- */
  const peek = $('.peek'), cars = $('.cars');
  const pk = { x: 0, y: 0, tx: 0, ty: 0, on: false };
  if (peek && cars && finePointer) {
    const img = $('img', peek);
    $$('.car').forEach(li => {
      li.addEventListener('pointerenter', () => {
        const src = li.getAttribute('data-img');
        if (src) { if (img.getAttribute('src') !== src) img.setAttribute('src', src); peek.classList.add('on'); pk.on = true; }
        else { peek.classList.remove('on'); pk.on = false; }
      });
    });
    cars.addEventListener('pointermove', e => { pk.tx = e.clientX; pk.ty = e.clientY; }, { passive: true });
    cars.addEventListener('pointerleave', () => { peek.classList.remove('on'); pk.on = false; });
  }

  /* ---------- magnetiska knappar ---------- */
  if (finePointer) {
    $$('[data-magnet]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.28).toFixed(1) + 'px');
        el.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.4).toFixed(1) + 'px');
      }, { passive: true });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
    });
  }

  /* ---------- mått ---------- */
  const absTop = el => el.getBoundingClientRect().top + window.scrollY;
  const measure = () => {
    vw = window.innerWidth; vh = window.innerHeight;
    setupStrip();
    if (lap) { lapTop = absTop(lap); lapLen = Math.max(1, lap.offsetHeight - vh); }
    if (strip) stripTop = absTop(strip);
    sizeCanvas();
    dirty = true;
  };
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(measure, 120); });
  window.addEventListener('load', measure);
  measure();

  /* ---------- bildslingan ---------- */
  const frame = (now) => {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    const ty = window.scrollY, prev = sy;
    sy += (ty - sy) * 0.16;
    if (Math.abs(ty - sy) < 0.1) sy = ty;
    vel = sy - prev;

    if (dirty || vel !== 0) {
      dirty = false;
      const docH = document.documentElement.scrollHeight - vh;
      if (bar) bar.style.transform = `scaleX(${clamp(sy / (docH || 1)).toFixed(4)})`;
      if (top) top.classList.toggle('is-solid', sy > 40);
      const hp = clamp(sy / vh);
      if (hp < 1 || vel < 0) {
        if (heroPhoto) heroPhoto.style.transform = `translate3d(0,${(hp * 70).toFixed(1)}px,0)`;
        if (heroTitle) heroTitle.style.transform = `translate3d(0,${(hp * -90).toFixed(1)}px,0)`;
        if (cv) cv.style.opacity = (1 - hp).toFixed(3);
      }
      updateLap();
      updateStrip();
    }
    if (heroVisible && !document.hidden) drawStreaks(dt);
    if (pk.on || Math.abs(pk.tx - pk.x) > 0.5) {
      pk.x += (pk.tx - pk.x) * 0.14; pk.y += (pk.ty - pk.y) * 0.14;
      peek.style.transform = `translate3d(${(pk.x + 28).toFixed(1)}px,${(pk.y - peek.offsetHeight / 2).toFixed(1)}px,0) rotate(${clamp((pk.tx - pk.x) * 0.04, -6, 6).toFixed(2)}deg)`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
