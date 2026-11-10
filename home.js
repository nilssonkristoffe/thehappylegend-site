/* thehappylegend.com — home page motion (2026-11).
   No libraries, no tracking, no network calls. The page is complete without
   this file; it only runs when html has the class "fx" (set in the head when
   the visitor has not asked for reduced motion). */
(() => {
  'use strict';
  const root = document.documentElement;
  if (!root.classList.contains('fx')) return;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  let vw = window.innerWidth, vh = window.innerHeight;
  const t0 = performance.now();

  /* pointer: raw client position, plus a smoothed -1..1 value for parallax */
  const ptr = { cx: -9999, cy: -9999, x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer) {
    window.addEventListener('pointermove', e => {
      ptr.cx = e.clientX; ptr.cy = e.clientY;
      ptr.tx = (e.clientX / vw) * 2 - 1; ptr.ty = (e.clientY / vh) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- Perlin noise (3D) ---------- */
  const perm = new Uint8Array(512);
  (() => {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = 20261110;
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y, z) => {
    const g = h & 15, u = g < 8 ? x : y, v = g < 4 ? y : (g === 12 || g === 14 ? x : z);
    return ((g & 1) ? -u : u) + ((g & 2) ? -v : v);
  };
  function noise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
           lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
           lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }

  /* ---------- sea chart: slow depth contours, like a nautical chart ---------- */
  function makeChart(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const rgb = canvas.dataset.chart || '63,86,70';
    const alpha = parseFloat(canvas.dataset.alpha || '0.14');
    const LEVELS = 11;
    let w = 0, h = 0, cols = 0, rows = 0, cell = 22, f = null, seen = false, acc = 0;
    let t = 3.7;
    new IntersectionObserver(es => { seen = es[0].isIntersecting; }).observe(canvas);
    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = w < 700 ? 16 : 22;
      cols = Math.ceil(w / cell) + 1; rows = Math.ceil(h / cell) + 1;
      f = new Float32Array(cols * rows);
      acc = 99;
    }
    function draw(dt) {
      if (!seen || !f) return;
      acc += dt;
      if (acc < 32) return;
      t += Math.min(acc, 64) * 0.000055; acc = 0;
      const r = canvas.getBoundingClientRect();
      const mx = ptr.cx - r.left, my = ptr.cy - r.top;
      const sc = 0.0021;
      for (let j = 0; j < rows; j++) {
        const y = j * cell;
        for (let i = 0; i < cols; i++) {
          const x = i * cell;
          let v = noise(x * sc, y * sc, t) + .42 * noise(x * sc * 2.3 + 11, y * sc * 2.3 + 5, t * 1.4);
          const dx = x - mx, dy = y - my;
          v += .3 * Math.exp(-(dx * dx + dy * dy) / 60000);
          f[j * cols + i] = v;
        }
      }
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (let L = 0; L < LEVELS; L++) {
        const lv = -.66 + L * .132;
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++) {
          const y0 = j * cell, y1 = y0 + cell;
          for (let i = 0; i < cols - 1; i++) {
            const k = j * cols + i;
            const a = f[k] - lv, b = f[k + 1] - lv, c = f[k + cols + 1] - lv, d = f[k + cols] - lv;
            const sa = a > 0, sb = b > 0, sc2 = c > 0, sd = d > 0;
            if (sa === sb && sb === sc2 && sc2 === sd) continue;
            const x0 = i * cell, x1 = x0 + cell;
            let n = 0, p0x = 0, p0y = 0, p1x = 0, p1y = 0, p2x = 0, p2y = 0, p3x = 0, p3y = 0;
            if (sa !== sb) { p0x = x0 + cell * (a / (a - b)); p0y = y0; n = 1; }
            if (sb !== sc2) { const px = x1, py = y0 + cell * (b / (b - c)); if (n === 0) { p0x = px; p0y = py; } else { p1x = px; p1y = py; } n++; }
            if (sc2 !== sd) { const px = x0 + cell * (d / (d - c)), py = y1; if (n === 0) { p0x = px; p0y = py; } else if (n === 1) { p1x = px; p1y = py; } else { p2x = px; p2y = py; } n++; }
            if (sd !== sa) { const px = x0, py = y0 + cell * (a / (a - d)); if (n === 1) { p1x = px; p1y = py; } else if (n === 2) { p2x = px; p2y = py; } else { p3x = px; p3y = py; } n++; }
            if (n >= 2) { ctx.moveTo(p0x, p0y); ctx.lineTo(p1x, p1y); }
            if (n === 4) { ctx.moveTo(p2x, p2y); ctx.lineTo(p3x, p3y); }
          }
        }
        ctx.strokeStyle = 'rgba(' + rgb + ',' + (L % 3 === 1 ? alpha * 2.1 : alpha).toFixed(3) + ')';
        ctx.stroke();
      }
    }
    return { resize, draw };
  }
  const charts = $$('canvas[data-chart]').map(makeChart).filter(Boolean);

  /* ---------- hero: icons drift around the name, then dock on the shelf ---------- */
  const hero = (() => {
    const sec = $('[data-hero]');
    if (!sec) return null;
    const pin = $('.hero-pin', sec), copy = $('.hero-copy', sec), shelf = $('.shelf', sec), cue = $('.cue', sec);
    const chart = $('.chart', sec);
    const icons = $$('.icon', shelf);
    //            x      y     scale rot  depth blur
    const WIDE = [[-.33, -.27, 2.0, -8, 1.0, 0], [.31, -.30, 1.5, 7, .7, 0], [-.44, .23, 1.15, 5, .35, 1.6], [.41, .21, 2.1, -6, 1.0, 0],
                  [-.20, .33, 1.6, 9, .8, 0], [.17, .34, 1.75, -5, .9, 0], [-.08, -.37, 1.1, -4, .3, 1.6], [.11, -.33, 1.25, 6, .5, 0]];
    const TALL = [[-.27, -.27, 1.7, -8, 1.0, 0], [.28, -.31, 1.35, 7, .7, 0], [.02, -.37, .95, 5, .35, 1.2], [.30, .26, 1.7, -6, 1.0, 0],
                  [-.30, .24, 1.4, 9, .8, 0], [0, .33, 1.5, -5, .9, 0], [-.36, .40, .9, -4, .3, 1.2], [.36, .41, 1.0, 6, .5, 0]];
    let W = 0, H = 0, top = 0, len = 1, shift = 0, home = [], spots = WIDE, lastLab = -1;
    function measure() {
      const pr = pin.getBoundingClientRect();
      W = pr.width; H = pr.height;
      top = sec.getBoundingClientRect().top + window.scrollY;
      len = Math.max(1, sec.offsetHeight - H);
      shift = shelf.offsetHeight / 2;
      spots = W < 760 ? TALL : WIDE;
      home = icons.map(el => {
        const r = el.parentNode.getBoundingClientRect();
        return { x: r.left - pr.left + r.width / 2, y: r.top - pr.top + r.height / 2, size: r.width };
      });
    }
    function update(y, now) {
      if (y > top + len + vh) return;
      const p = clamp((y - top) / len), q = clamp(p / .8), qe = easeInOut(q);
      const time = now - t0;
      for (let i = 0; i < icons.length; i++) {
        const s = spots[i % spots.length], hm = home[i];
        if (!hm) continue;
        const e = easeInOut(clamp((q - i * .035) / (1 - 7 * .035)));
        const k = 1 - e;
        const intro = clamp((time - 450 - i * 75) / 950);
        const sc = 1 + (s[2] - 1) * k;
        const half = hm.size * s[2] / 2;
        const tx = clamp(W / 2 + s[0] * W, half + 10, W - half - 10);
        const ty = clamp(H / 2 + s[1] * H, half + 66, H - half - 14);
        const bob = time / 1000 + i * 1.7;
        const dx = (tx - hm.x) * k + (Math.sin(bob * .55) * 7 * s[4] - ptr.x * 26 * s[4]) * k;
        const dy = (ty - hm.y) * k + (Math.cos(bob * .7) * 9 * s[4] - ptr.y * 20 * s[4]) * k;
        const rot = (s[3] + Math.sin(bob * .4) * 2.5) * k;
        const el = icons[i];
        el.style.transform = 'translate(-50%,-50%) translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + (.5 * sc * (intro <= 0 ? .001 : easeOutBack(intro))).toFixed(4) + ')';
        el.style.opacity = clamp(intro * 3).toFixed(3);
        el.style.filter = s[5] * k > .05 ? 'blur(' + (s[5] * k).toFixed(2) + 'px)' : '';
      }
      copy.style.transform = 'translate3d(0,' + (shift * (1 - qe)).toFixed(1) + 'px,0) scale(' + (1 - .08 * qe).toFixed(4) + ')';
      const lab = +clamp((q - .72) / .28).toFixed(3);
      if (lab !== lastLab) { lastLab = lab; shelf.style.setProperty('--lab', lab); }
      if (cue) cue.style.opacity = (1 - clamp(p * 7)).toFixed(3);
      if (chart) chart.style.opacity = (1 - .55 * qe).toFixed(3);
    }
    return { measure, update };
  })();

  /* ---------- work: one pinned stage, scrubbed by scroll ---------- */
  const hex = v => { const m = /#([0-9a-f]{6})/i.exec(v || ''); const n = m ? parseInt(m[1], 16) : 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ' ' + Math.round(lerp(a[1], b[1], t)) + ' ' + Math.round(lerp(a[2], b[2], t)) + ')';

  const work = (() => {
    const sec = $('[data-work]');
    if (!sec) return null;
    const pin = $('.work-pin', sec), els = $$('.case', sec), N = els.length, counter = $('[data-cur]', sec);
    const cases = els.map(el => {
      const cs = getComputedStyle(el);
      return {
        el, on: null, live: null,
        bg: hex(cs.getPropertyValue('--bg')), fg: hex(cs.getPropertyValue('--fg')), accent: hex(cs.getPropertyValue('--accent')),
        kids: $$('.case-copy > *', el), front: $('.device.front', el), back: $('.device.back', el),
        name: ($('.case-name', el) || {}).textContent || '', icon: ($('.case-kicker img', el) || {}).src || ''
      };
    });
    let top = 0, len = 1, H = 0, cur = 0, idx = -1, lastBg = '', fgNow = 'rgb(20 32 22)', lastRad = -1, inited = false;

    const rail = document.createElement('div');
    rail.className = 'rail';
    const dots = cases.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show ' + c.name);
      const im = new Image(); im.src = c.icon; im.alt = ''; im.width = 30; im.height = 30;
      b.appendChild(im);
      b.addEventListener('click', () => go(i, true));
      rail.appendChild(b);
      return b;
    });
    pin.appendChild(rail);

    function go(i, smooth) {
      window.scrollTo({ top: top + (i / (N - 1)) * len, behavior: smooth ? 'smooth' : 'auto' });
    }
    /* keyboard: tabbing into a neighbouring case brings it on stage */
    cases.forEach((c, i) => c.el.addEventListener('focusin', () => { if (Math.abs(i - cur) > .4) go(i, false); }));

    function measure() {
      top = sec.getBoundingClientRect().top + window.scrollY;
      H = pin.offsetHeight;
      len = Math.max(1, sec.offsetHeight - H);
    }
    function target(y) {
      const raw = clamp((y - top) / len) * (N - 1);
      const i0 = Math.min(N - 2, Math.floor(raw));
      return i0 + easeInOut(clamp((raw - i0 - .18) / .64));
    }
    function update(y, now, dt) {
      const rectTop = top - y;
      const rad = Math.round(clamp(rectTop / (vh * .45)) * 40);
      if (rad !== lastRad) { lastRad = rad; pin.style.setProperty('--rad', rad + 'px'); }
      if (rectTop > vh * 1.2 || y > top + len + vh * 1.2) return;

      const tg = target(y);
      if (!inited) { cur = tg; inited = true; }
      cur += (tg - cur) * (1 - Math.exp(-dt / 105));
      if (Math.abs(tg - cur) < .0004) cur = tg;

      const a = Math.min(N - 1, Math.floor(cur)), b = Math.min(N - 1, a + 1), t = cur - a;
      const bg = mix(cases[a].bg, cases[b].bg, t);
      if (bg !== lastBg) {
        lastBg = bg;
        fgNow = mix(cases[a].fg, cases[b].fg, t);
        pin.style.setProperty('--bg', bg);
        pin.style.setProperty('--fg', fgNow);
        pin.style.setProperty('--accent', mix(cases[a].accent, cases[b].accent, t));
      }
      const ni = Math.round(cur);
      if (ni !== idx) {
        idx = ni;
        dots.forEach((d, i) => d.classList.toggle('is-on', i === ni));
        if (counter) { counter.textContent = String(ni + 1).padStart(2, '0'); counter.classList.remove('tick'); void counter.offsetWidth; counter.classList.add('tick'); }
      }

      const time = now / 1000;
      for (let i = 0; i < N; i++) {
        const c = cases[i], d = i - cur, ad = Math.abs(d), on = ad < 1.3;
        if (on !== c.on) { c.on = on; c.el.style.visibility = on ? 'visible' : 'hidden'; }
        if (!on) continue;
        const live = ad < .5;
        if (live !== c.live) { c.live = live; c.el.style.pointerEvents = live ? 'auto' : 'none'; c.el.style.zIndex = live ? 2 : 1; }
        const o = clamp(1 - ad * 2.35).toFixed(3);
        for (let j = 0; j < c.kids.length; j++) {
          const k = c.kids[j];
          k.style.transform = 'translate3d(0,' + (d * (44 + j * 26)).toFixed(1) + 'px,0)';
          k.style.opacity = o;
        }
        const near = 1 - clamp(ad * 2);
        if (c.front) {
          const fy = (d > 0 ? d * H * .98 : d * H * .8) + Math.sin(time * .9 + i) * 7 * near;
          c.front.style.transform = 'translate3d(0,' + fy.toFixed(1) + 'px,0) rotateX(' + (-ptr.y * 5 * near).toFixed(2) + 'deg) rotateY(' + (ptr.x * 7 * near).toFixed(2) + 'deg) rotate(' + (d * 7).toFixed(2) + 'deg) scale(' + (1 - Math.min(1, ad) * .1).toFixed(4) + ')';
          c.front.style.opacity = d < 0 ? clamp(1 + d * 1.5).toFixed(3) : '1';
        }
        if (c.back) {
          const by = d * H * 1.32 + Math.cos(time * .8 + i) * 9 * near;
          c.back.style.transform = 'translate3d(' + (-d * 36 + ptr.x * 14 * near).toFixed(1) + 'px,' + (by + ptr.y * 10 * near).toFixed(1) + 'px,0) rotate(' + (-d * 10).toFixed(2) + 'deg)';
          c.back.style.opacity = d < 0 ? clamp(1 + d * 1.8).toFixed(3) : '1';
        }
      }
    }
    return { measure, update, top: () => top, fg: () => fgNow };
  })();

  /* ---------- studio: the statement lights up word by word ---------- */
  const words = (() => {
    const el = $('[data-words]');
    if (!el) return null;
    const text = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const spans = text.map((w, i) => {
      const s = document.createElement('span');
      s.className = 'w'; s.textContent = w;
      el.appendChild(s);
      if (i < text.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    let last = -1;
    function update() {
      const r = el.getBoundingClientRect();
      if (r.top > vh * 1.2 || r.bottom < -vh * .2) return;
      const p = clamp((vh * .9 - r.top) / (vh * .62 + r.height * .5));
      const lit = Math.round(p * (spans.length + 2) * 20) / 20;
      if (lit === last) return;
      last = lit;
      for (let i = 0; i < spans.length; i++) spans[i].style.opacity = (.14 + .86 * clamp(lit - i)).toFixed(3);
    }
    return { update };
  })();

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .01 });
  $$('[data-reveal], .bigmark').forEach(el => io.observe(el));

  /* ---------- footer wordmark fills the width exactly ---------- */
  const fits = $$('[data-fit]');
  function fit() {
    fits.forEach(el => {
      el.style.fontSize = '';
      const cs = getComputedStyle(el);
      const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const range = document.createRange(); range.selectNodeContents(el);
      const wd = range.getBoundingClientRect().width;
      if (wd > 0 && avail > 0) el.style.fontSize = (parseFloat(cs.fontSize) * avail / wd * .985).toFixed(2) + 'px';
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- nav: colour follows what is behind it, hides on the way down ---------- */
  const nav = $('#nav'), studio = $('#studio');
  let lastY = window.scrollY, navFg = '', studioTop = Infinity;
  function updateNav(y) {
    let fg = '#141714';
    if (y + 28 >= studioTop) fg = '#ECEEE8';
    else if (work && y + 28 >= work.top()) fg = work.fg();
    if (fg !== navFg) { navFg = fg; root.style.setProperty('--nav-fg', fg); }
    nav.classList.toggle('at-top', y < 8);
    if (y > lastY + 6 && y > vh * .6) nav.classList.add('is-hidden');
    else if (y < lastY - 6 || y < vh * .6) nav.classList.remove('is-hidden');
    if (Math.abs(y - lastY) > 6) lastY = y;
  }
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  /* ---------- measure + loop ---------- */
  function measure() {
    vw = window.innerWidth; vh = window.innerHeight;
    if (hero) hero.measure();
    if (work) work.measure();
    if (studio) studioTop = studio.getBoundingClientRect().top + window.scrollY;
    charts.forEach(c => c.resize());
    fit();
  }
  let rz = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(measure); });
  window.addEventListener('load', () => {
    measure();
    /* every case comes on stage sooner or later: fetch their images once the page has settled */
    setTimeout(() => $$('.case img[loading="lazy"]').forEach(im => { im.loading = 'eager'; }), 1200);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    const y = window.scrollY;
    ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt / 180));
    ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt / 180));
    if (hero) hero.update(y, now);
    if (work) work.update(y, now, dt);
    if (words) words.update();
    updateNav(y);
    for (let i = 0; i < charts.length; i++) charts[i].draw(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
