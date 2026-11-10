# thehappylegend.com

The Happy Legend AB — company site. Static, no build step.
Deployed with GitHub Pages from `main`.

- `index.html`, `home.css`, `home.js`: the home page (redesigned 2026-11).
  `home.js` is the motion layer only, with no libraries, no tracking and no
  network calls. The page is complete without it, and it is switched off
  for visitors who ask for reduced motion (or with `?motion=off`).
- `style.css`: shared by the product, privacy and support pages.
