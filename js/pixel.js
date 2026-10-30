'use strict';
/*
 * Пиксельная графика. Вся графика рисуется кодом в маленькие холсты (без картинок),
 * затем обводится тёмным контуром — как в мобильных пиксельных RPG.
 */
const OUTLINE = '#1b1426';

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Детерминированный генератор случайных чисел (мир и спрайты одинаковые при каждом запуске)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

class Pix {
  constructor(w, h) {
    this.c = mkCanvas(w, h);
    this.x = this.c.getContext('2d');
    this.w = w; this.h = h;
  }
  r(x, y, w, h, col) {
    if (!col || w <= 0 || h <= 0) return this;
    this.x.fillStyle = col;
    this.x.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    return this;
  }
  p(x, y, col) { return this.r(x, y, 1, 1, col); }
  clear(x, y, w, h) { this.x.clearRect(x, y, w, h); return this; }
  ell(cx, cy, rx, ry, col) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx + 0.6) + (y * y) / (ry * ry + 0.6) <= 1) this.p(cx + x, cy + y, col);
      }
    }
    return this;
  }
  circ(cx, cy, r, col) { return this.ell(cx, cy, r, r, col); }
  ring(cx, cy, r, th, col, gapFn) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= r + 0.3 && d > r - th) {
          if (gapFn && gapFn(Math.atan2(y, x))) continue;
          this.p(cx + x, cy + y, col);
        }
      }
    }
    return this;
  }
  line(x0, y0, x1, y1, col, th = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.r(x0, y0, th, th, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  dith(x, y, w, h, col, prob, R) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (R() < prob) this.p(x + i, y + j, col);
    return this;
  }
  outline(col = OUTLINE) {
    const { w, h } = this;
    const id = this.x.getImageData(0, 0, w, h);
    const a = id.data;
    const src = new Uint8ClampedArray(a);
    const [r, g, b] = hexRgb(col);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] > 40) continue;
        if ((x > 0 && src[i - 1] > 40) || (x < w - 1 && src[i + 7] > 40) ||
            (y > 0 && src[i - w * 4 + 3] > 40) || (y < h - 1 && src[i + w * 4 + 3] > 40)) {
          a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = 255;
        }
      }
    }
    this.x.putImageData(id, 0, 0);
    return this;
  }
}

function sprite(w, h, fn, outline = true) {
  const s = new Pix(w, h);
  fn(s);
  if (outline) s.outline();
  return s.c;
}

// Белый силуэт спрайта — для вспышки при попадании
const _white = new WeakMap();
function whiteOf(c) {
  let w = _white.get(c);
  if (!w) {
    w = mkCanvas(c.width, c.height);
    const x = w.getContext('2d');
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, w.width, w.height);
    _white.set(c, w);
  }
  return w;
}

// Голубой «голографический» вариант спрайта
const _holo = new WeakMap();
function holoOf(c) {
  let w = _holo.get(c);
  if (!w) {
    w = mkCanvas(c.width, c.height);
    const x = w.getContext('2d');
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(80,220,255,0.65)';
    x.fillRect(0, 0, w.width, w.height);
    x.fillStyle = 'rgba(255,255,255,0.18)';
    for (let y = 0; y < w.height; y += 2) x.fillRect(0, y, w.width, 1);
    _holo.set(c, w);
  }
  return w;
}

/* ===================== ТАЙЛЫ 16×16 ===================== */
const TILE = {
  GRASS: 0, FGRASS: 1, DIRT: 2, ASPHALT: 3, WALK: 4, WATER: 5, RUST: 6,
  METAL: 7, TECH: 8, LAB: 9, WALL: 10, CWALL: 11, SAND: 12, LINE: 13,
};
const TILE_SOLID = { 5: 1, 10: 1, 11: 1 };

function makeTiles() {
  const T = {};
  const gen = (id, n, fn) => {
    T[id] = [];
    for (let v = 0; v < n; v++) {
      const R = rng(id * 977 + v * 131 + 7);
      T[id].push(sprite(16, 16, (s) => fn(s, R, v), false));
    }
  };
  const blades = (s, R, dark, light, n1, n2) => {
    for (let i = 0; i < n1; i++) { const x = (R() * 16) | 0, y = (R() * 15) | 0; s.r(x, y, 1, 2, dark); }
    for (let i = 0; i < n2; i++) { const x = (R() * 16) | 0, y = (R() * 16) | 0; s.p(x, y, light); }
  };
  gen(TILE.GRASS, 4, (s, R, v) => {
    s.r(0, 0, 16, 16, '#6cbf4a');
    blades(s, R, '#56a63d', '#8bd85e', 12, 7);
    if (v === 3) { s.p(4, 5, '#fff7d6'); s.p(3, 6, '#fff7d6'); s.p(5, 6, '#fff7d6'); s.p(4, 7, '#fff7d6'); s.p(4, 6, '#ffcf3a');
      s.p(11, 11, '#ff8fb1'); s.p(12, 12, '#ff8fb1'); s.p(10, 12, '#ff8fb1'); s.p(11, 12, '#ffe36b'); }
  });
  gen(TILE.FGRASS, 4, (s, R, v) => {
    s.r(0, 0, 16, 16, '#4a9a42');
    blades(s, R, '#3b8237', '#62b452', 14, 6);
    if (v === 2) { s.p(8, 8, '#d9e86a'); s.p(9, 9, '#d9e86a'); }
    if (v === 3) { s.r(3, 10, 3, 2, '#8a6a4a'); s.p(4, 9, '#c94a3a'); s.p(3, 9, '#c94a3a'); }
  });
  gen(TILE.DIRT, 4, (s, R) => {
    s.r(0, 0, 16, 16, '#d4ad72');
    s.dith(0, 0, 16, 16, '#c39a5f', 0.12, R);
    s.dith(0, 0, 16, 16, '#e3c590', 0.06, R);
    for (let i = 0; i < 2; i++) { const x = (R() * 14) | 0, y = (R() * 14) | 0; s.r(x, y, 2, 1, '#a9875a'); s.p(x, y - 1, '#ecd5a6'); }
  });
  gen(TILE.SAND, 4, (s, R, v) => {
    s.r(0, 0, 16, 16, '#dcc48e');
    s.dith(0, 0, 16, 16, '#cdb27a', 0.1, R);
    if (v >= 2) { let x = (R() * 10) | 0, y = (R() * 10) | 0; for (let i = 0; i < 6; i++) { s.p(x, y, '#b39661'); x += 1; y += R() < 0.5 ? 1 : 0; } }
  });
  gen(TILE.RUST, 4, (s, R, v) => {
    s.r(0, 0, 16, 16, '#b07650');
    s.dith(0, 0, 16, 16, '#95603f', 0.14, R);
    s.dith(0, 0, 16, 16, '#c98d63', 0.07, R);
    if (v === 1) { s.p(5, 6, '#8d97a3'); s.p(6, 6, '#6b7480'); }
    if (v === 2) { s.r(9, 10, 3, 1, '#7a808a'); s.p(9, 9, '#a7b0ba'); }
    if (v === 3) { s.circ(10, 5, 1, '#6f7884'); s.p(10, 5, '#3a3f4a'); }
  });
  gen(TILE.ASPHALT, 4, (s, R, v) => {
    s.r(0, 0, 16, 16, '#4c5262');
    s.dith(0, 0, 16, 16, '#434858', 0.18, R);
    s.dith(0, 0, 16, 16, '#5b6273', 0.08, R);
    if (v === 3) { let x = 3, y = 4; for (let i = 0; i < 8; i++) { s.p(x, y, '#353a47'); x += 1; y += R() < 0.5 ? 1 : 0; } }
  });
  gen(TILE.LINE, 1, (s, R) => {
    s.r(0, 0, 16, 16, '#4c5262');
    s.dith(0, 0, 16, 16, '#434858', 0.18, R);
    s.r(2, 7, 5, 2, '#e8e2c8'); s.r(10, 7, 5, 2, '#e8e2c8');
  });
  gen(TILE.WALK, 2, (s, R, v) => {
    s.r(0, 0, 16, 16, '#a3acb9');
    s.r(0, 0, 16, 1, '#b8c0cb'); s.r(0, 8, 16, 1, '#b8c0cb');
    s.r(0, 7, 16, 1, '#8c95a2'); s.r(0, 15, 16, 1, '#8c95a2');
    s.r(7, 0, 1, 8, '#8c95a2'); s.r(15, 8, 1, 8, '#8c95a2');
    s.dith(0, 0, 16, 16, '#98a1ae', 0.08, R);
    if (v === 1) s.r(3, 3, 2, 1, '#8c95a2');
  });
  gen(TILE.WATER, 2, (s, R, v) => {
    s.r(0, 0, 16, 16, '#3f86d6');
    s.dith(0, 0, 16, 16, '#3577c4', 0.12, R);
    const o = v * 4;
    s.r((2 + o) % 16, 3, 4, 1, '#79b4f0'); s.r((9 + o) % 16, 9, 5, 1, '#79b4f0'); s.r((5 + o) % 16, 13, 3, 1, '#62a2e6');
  });
  gen(TILE.METAL, 3, (s, R, v) => {
    s.r(0, 0, 16, 16, '#717b88');
    s.r(0, 0, 16, 1, '#8b95a2'); s.r(0, 0, 1, 16, '#8b95a2');
    s.r(0, 15, 16, 1, '#59626e'); s.r(15, 0, 1, 16, '#59626e');
    s.p(2, 2, '#a9b3bf'); s.p(13, 2, '#a9b3bf'); s.p(2, 13, '#a9b3bf'); s.p(13, 13, '#a9b3bf');
    if (v === 1) for (let i = 0; i < 16; i += 4) s.r(i, 6, 2, 4, i % 8 ? '#2b2b30' : '#e0b030');
    if (v === 2) s.dith(1, 1, 14, 14, '#677180', 0.15, R);
  });
  gen(TILE.TECH, 3, (s, R, v) => {
    s.r(0, 0, 16, 16, '#1e2034');
    s.r(0, 0, 16, 1, '#2b2e4a'); s.r(0, 0, 1, 16, '#2b2e4a');
    s.dith(1, 1, 15, 15, '#232640', 0.2, R);
    if (v === 1) { s.r(3, 8, 10, 1, '#7a4cff'); s.p(3, 7, '#b590ff'); s.p(12, 9, '#b590ff'); }
    if (v === 2) { s.r(8, 2, 1, 12, '#3a2f70'); s.p(8, 8, '#9b6bff'); }
  });
  gen(TILE.LAB, 2, (s, R, v) => {
    s.r(0, 0, 16, 16, '#d7dce3');
    s.r(0, 7, 16, 1, '#c1c8d1'); s.r(7, 0, 1, 16, '#c1c8d1');
    s.r(0, 15, 16, 1, '#c1c8d1'); s.r(15, 0, 1, 16, '#c1c8d1');
    if (v) s.dith(0, 0, 16, 16, '#cbd1d9', 0.1, R);
  });
  gen(TILE.WALL, 2, (s, R, v) => {
    s.r(0, 0, 16, 16, '#5e6878');
    s.r(0, 0, 16, 5, '#97a2b2'); s.r(0, 0, 16, 1, '#b4bfcd'); s.r(0, 5, 16, 1, '#454e5c');
    for (let y = 6; y < 16; y += 4) { s.r(0, y + 3, 16, 1, '#4f5867'); s.r(((y / 4) % 2) * 8 + 3, y, 1, 3, '#4f5867'); s.r(((y / 4) % 2) * 8 + 11, y, 1, 3, '#4f5867'); }
    if (v) { s.r(5, 9, 6, 2, '#ffcf3a'); s.r(6, 9, 1, 2, '#2b2b30'); s.r(9, 9, 1, 2, '#2b2b30'); }
  });
  gen(TILE.CWALL, 2, (s, R, v) => {
    s.r(0, 0, 16, 16, '#2a2342');
    s.r(0, 0, 16, 5, '#463a6e'); s.r(0, 0, 16, 1, '#5d4f8f'); s.r(0, 5, 16, 1, '#1a1530');
    s.r(0, 10, 16, 1, v ? '#b47bff' : '#6d4bc2');
    s.dith(0, 6, 16, 10, '#241e3a', 0.2, R);
  });
  return T;
}

// Кромки травы и берега, накладываются поверх соседних тайлов
function makeEdges() {
  const E = {};
  const R = rng(4242);
  const grass = (dir) => sprite(16, 16, (s) => {
    for (let i = 0; i < 16; i++) {
      const d = 1 + ((R() * 3) | 0);
      for (let k = 0; k < d; k++) {
        const col = k === d - 1 ? '#56a63d' : '#6cbf4a';
        if (dir === 'n') s.p(i, k, col);
        if (dir === 's') s.p(i, 15 - k, col);
        if (dir === 'w') s.p(k, i, col);
        if (dir === 'e') s.p(15 - k, i, col);
      }
    }
  }, false);
  E.gn = grass('n'); E.gs = grass('s'); E.gw = grass('w'); E.ge = grass('e');
  E.wn = sprite(16, 16, (s) => { s.r(0, 0, 16, 3, '#2c5f9e'); s.r(0, 3, 16, 1, '#3577c4'); }, false);
  E.ws = sprite(16, 16, (s) => { for (let i = 0; i < 16; i++) s.p(i, 15 - (i % 3 === 0 ? 1 : 0), '#b7dcff'); }, false);
  E.ww = sprite(16, 16, (s) => { s.r(0, 0, 2, 16, '#2c5f9e'); }, false);
  E.we = sprite(16, 16, (s) => { s.r(14, 0, 2, 16, '#2c5f9e'); }, false);
  return E;
}

/* ===================== ПРЕДМЕТЫ МИРА ===================== */
function makeProps() {
  const P = {};
  const add = (name, n, w, h, fn) => {
    P[name] = [];
    for (let v = 0; v < n; v++) {
      const R = rng(name.length * 1000 + v * 77 + name.charCodeAt(0));
      P[name].push(sprite(w, h, (s) => fn(s, R, v)));
    }
  };

  add('tree', 4, 28, 36, (s, R, v) => {
    const pal = [['#3e8a3a', '#53a845', '#72c95a'], ['#357c3a', '#4a9a45', '#63b85a'], ['#4c9440', '#67b34d', '#8fd26a'], ['#2f7038', '#418a44', '#5aa652']][v];
    s.r(12, 22, 5, 12, '#7a4b2a'); s.r(12, 22, 1, 12, '#99623b'); s.r(10, 33, 9, 2, '#6a4024');
    s.ell(14, 15, 12, 11, pal[0]);
    s.ell(13, 13, 10, 9, pal[1]);
    s.ell(10, 9, 5, 4, pal[2]);
    s.ell(18, 12, 3, 3, pal[2]);
    s.dith(4, 18, 20, 7, pal[0], 0.35, R);
    for (let i = 0; i < 6; i++) s.p(6 + ((R() * 16) | 0), 8 + ((R() * 12) | 0), pal[2]);
    if (v === 2) { s.p(9, 16, '#ff6b6b'); s.p(17, 18, '#ff6b6b'); s.p(20, 10, '#ff6b6b'); }
  });
  add('pine', 2, 22, 38, (s, R, v) => {
    const c = v ? ['#2c6a40', '#3d8550', '#55a565'] : ['#2f6e3c', '#3f8a4c', '#5aa860'];
    s.r(9, 30, 4, 7, '#6a4024');
    for (let i = 0; i < 4; i++) {
      const y = 4 + i * 7, w = 4 + i * 3;
      for (let k = 0; k < 9; k++) s.r(11 - (w * k) / 9, y + k, (w * 2 * k) / 9 + 1, 1, c[0]);
      for (let k = 0; k < 7; k++) s.r(11 - (w * k) / 11, y + k, (w * k) / 11 + 1, 1, c[1]);
      s.p(9, y + 4, c[2]);
    }
  });
  add('deadtree', 2, 22, 30, (s, R, v) => {
    const c = '#7d6a58';
    s.r(10, 12, 3, 17, c); s.r(10, 12, 1, 17, '#9b8670');
    s.line(11, 16, 4, 8, c, 2); s.line(11, 14, 18, 5, c, 2); s.line(5, 9, 3, 4, c); s.line(17, 6, 20, 2, c);
    if (v) s.line(12, 20, 19, 15, c, 2);
  });
  add('bush', 3, 18, 12, (s, R, v) => {
    s.ell(9, 7, 8, 4, '#3f8a3a'); s.ell(8, 6, 6, 3, '#56a845'); s.ell(6, 5, 2, 1, '#7ccb5e');
    if (v === 1) { s.p(5, 7, '#e8475a'); s.p(11, 6, '#e8475a'); s.p(13, 8, '#e8475a'); }
    if (v === 2) { s.p(6, 7, '#f3f0ff'); s.p(12, 6, '#f3f0ff'); }
  });
  add('rock', 3, 16, 12, (s, R, v) => {
    const c = v === 2 ? ['#9a7a5e', '#b6977a', '#7c5f47'] : ['#8a929e', '#a9b1bc', '#6b7380'];
    s.ell(8, 7, 7, 4, c[2]); s.ell(7, 6, 6, 4, c[0]); s.ell(6, 4, 3, 2, c[1]);
    if (v === 1) { s.p(10, 7, '#5aa845'); s.p(11, 7, '#5aa845'); s.p(3, 8, '#5aa845'); }
  });
  add('ruin', 3, 54, 48, (s, R, v) => {
    const wall = ['#c9b79e', '#a9bccb', '#d8c2a8'][v], wd = ['#a8977f', '#8c9fae', '#b8a288'][v];
    const roof = ['#b0503e', '#4f6fa0', '#7a5a8a'][v];
    s.r(3, 18, 48, 28, wall); s.r(3, 40, 48, 6, wd);
    s.r(0, 8, 54, 12, roof); s.r(0, 18, 54, 2, '#3a2a2a');
    for (let x = 2; x < 52; x += 4) s.r(x, 9, 1, 9, 'rgba(0,0,0,0.18)');
    s.clear(30 + v * 4, 6, 14, 9); s.clear(34 + v * 4, 15, 8, 4);
    s.line(30 + v * 4, 14, 44 + v * 4, 10, '#5a3a2a');
    s.r(8, 25, 9, 9, '#2a2c3a'); s.r(8, 29, 9, 1, '#6a5a4a'); s.r(12, 25, 1, 9, '#6a5a4a'); s.p(9, 26, '#4a5068');
    s.r(36, 25, 9, 9, '#2a2c3a'); s.line(36, 25, 44, 33, '#6a7a8a');
    s.r(22, 31, 10, 15, '#5a3a24'); s.r(22, 31, 10, 1, '#3a2418'); s.p(30, 38, '#d8b04a');
    s.line(5, 20, 11, 30, wd); s.line(46, 20, 49, 36, wd);
    s.dith(3, 38, 48, 8, '#6b9a4a', 0.12, R);
    for (let i = 0; i < 4; i++) s.r(4 + ((R() * 44) | 0), 44, 3, 2, '#5aa845');
  });
  add('lab', 1, 70, 52, (s) => {
    s.r(2, 14, 66, 36, '#8f959d'); s.r(2, 42, 66, 8, '#767c85');
    s.r(0, 8, 70, 8, '#aab0b8'); s.r(0, 15, 70, 1, '#5d636b');
    for (let x = 4; x < 68; x += 8) s.r(x, 18, 1, 24, '#80868e');
    s.r(26, 24, 20, 26, '#4f5a66'); s.r(27, 25, 18, 25, '#5d6976');
    for (let x = 27; x < 45; x += 4) s.r(x, 46, 2, 3, '#e0b030');
    s.r(35, 25, 1, 21, '#3f4852');
    s.r(8, 22, 12, 7, '#26303c'); s.r(9, 23, 10, 5, '#3ac7d9'); s.r(10, 24, 4, 1, '#bff6ff');
    s.r(52, 22, 10, 8, '#26303c'); s.r(53, 23, 8, 6, '#2f3a48');
    s.r(60, 0, 1, 9, '#5d636b'); s.r(58, 0, 5, 1, '#5d636b'); s.p(60, 0, '#ff4a4a');
    s.r(8, 4, 10, 5, '#6d737b'); s.r(9, 5, 8, 3, '#8a9098');
  });
  add('building', 4, 50, 84, (s, R, v) => {
    const pal = [['#5b7fb0', '#3e5f8e', '#9fd7ff'], ['#e6e9ee', '#c3c9d2', '#7fd0ff'], ['#c9b48e', '#a8946f', '#ffe08a'], ['#3a3f52', '#2a2e3d', '#ff6fd8']][v];
    s.r(1, 6, 48, 76, pal[0]); s.r(1, 70, 48, 12, pal[1]);
    s.r(0, 2, 50, 6, pal[1]); s.r(0, 2, 50, 1, '#ffffff33');
    s.r(4, 0, 10, 3, pal[1]);
    for (let y = 12; y < 64; y += 9) {
      for (let x = 5; x < 45; x += 10) {
        const lit = R() < 0.45;
        s.r(x, y, 7, 6, lit ? pal[2] : '#1f2433');
        if (lit) s.r(x, y, 7, 1, '#ffffff88');
      }
    }
    s.r(19, 68, 12, 14, '#1f2433'); s.r(20, 69, 10, 13, '#3a5070'); s.r(25, 69, 1, 13, '#1f2433');
    s.r(17, 65, 16, 2, pal[2]);
  });
  add('archive', 1, 72, 80, (s) => {
    s.r(2, 16, 68, 62, '#e9e6dc'); s.r(2, 70, 68, 8, '#cfcabd');
    s.r(0, 8, 72, 10, '#f3f0e6'); s.r(0, 17, 72, 1, '#b8b3a6');
    for (let i = 0; i < 18; i++) s.r(36 - i * 2, 8 - i / 3, i * 4, 1, '#d8d3c5');
    for (let x = 8; x < 68; x += 12) { s.r(x, 22, 6, 48, '#f8f6ef'); s.r(x + 5, 22, 1, 48, '#c9c4b6'); }
    s.r(30, 52, 12, 26, '#3a4a5a'); s.r(31, 53, 10, 25, '#4a6078'); s.r(36, 53, 1, 25, '#3a4a5a');
    s.r(26, 44, 20, 5, '#2a3a4a'); s.r(28, 45, 16, 3, '#7fd0ff');
  });
  add('car', 4, 32, 20, (s, R, v) => {
    const c = [['#8a3a3a', '#a85050'], ['#3a5a8a', '#5a7aa8'], ['#7a7a6a', '#9a9a88'], ['#5a6a4a', '#7a8a62']][v];
    s.r(2, 8, 28, 8, c[0]); s.r(7, 3, 17, 6, c[1]); s.r(2, 8, 28, 1, c[1]);
    s.r(9, 4, 6, 4, '#2a3040'); s.r(17, 4, 6, 4, '#2a3040'); s.line(10, 4, 14, 7, '#8ab0d0');
    s.circ(8, 16, 3, '#222228'); s.circ(24, 16, 3, '#222228'); s.p(8, 16, '#555'); s.p(24, 16, '#555');
    s.dith(2, 8, 28, 8, '#8a5a3a', 0.15, R);
    if (v === 3) s.dith(2, 3, 28, 13, '#5aa845', 0.12, R);
  });
  add('scrap', 4, 32, 24, (s, R) => {
    const cols = ['#8a929e', '#a86b3c', '#6b7380', '#c98d63', '#5a606c', '#b0b8c4'];
    for (let i = 0; i < 14; i++) {
      const x = 4 + R() * 22, y = 8 + R() * 12, w = 3 + R() * 7, h = 2 + R() * 4;
      s.r(x, y, w, h, cols[(R() * cols.length) | 0]);
    }
    for (let i = 0; i < 3; i++) { const x = 6 + R() * 20, y = 8 + R() * 8; s.circ(x, y, 2, '#7a808a'); s.p(x, y, '#3a3f4a'); }
    s.line(6, 20, 14, 6, '#5a606c', 2);
    s.r(3, 21, 26, 3, '#7a5038');
  });
  add('lamp', 2, 10, 32, (s, R, v) => {
    s.r(4, 4, 2, 27, '#4a5060'); s.r(2, 30, 6, 2, '#3a3f4a');
    s.r(1, 1, 8, 3, '#5a606c');
    s.r(2, 4, 6, 1, v ? '#fff3a0' : '#3a3f4a');
  });
  add('crate', 2, 14, 14, (s, R, v) => {
    const c = v ? ['#7a8a9a', '#5a6a7a'] : ['#b9874e', '#8f6436'];
    s.r(1, 1, 12, 12, c[0]); s.r(1, 1, 12, 1, '#ffffff44');
    s.r(1, 6, 12, 1, c[1]); s.line(1, 1, 12, 12, c[1]);
  });
  add('barrel', 3, 12, 15, (s, R, v) => {
    const c = [['#3a6ab0', '#2a5090'], ['#c0453a', '#90302a'], ['#d0a020', '#a07a10']][v];
    s.r(1, 2, 10, 12, c[0]); s.ell(6, 2, 5, 1, c[1]); s.r(1, 5, 10, 1, c[1]); s.r(1, 10, 10, 1, c[1]); s.r(3, 3, 1, 10, '#ffffff44');
  });
  add('pipe', 1, 34, 16, (s) => {
    s.r(0, 4, 34, 9, '#8a929e'); s.r(0, 5, 34, 2, '#b0b8c4'); s.r(0, 11, 34, 2, '#6b7380');
    s.r(4, 2, 4, 13, '#5a606c'); s.r(24, 2, 4, 13, '#5a606c');
  });
  add('tank', 1, 30, 36, (s) => {
    s.r(2, 6, 26, 28, '#9aa3ae'); s.ell(15, 6, 13, 4, '#b7bfc9'); s.r(5, 8, 3, 24, '#c7ced7'); s.r(22, 8, 2, 24, '#7a838e');
    s.r(2, 18, 26, 2, '#e0b030'); s.r(10, 24, 10, 6, '#2b2f3a'); s.r(11, 25, 8, 2, '#7fd0ff');
  });
  add('pillar', 2, 16, 44, (s, R, v) => {
    s.r(3, 4, 10, 38, '#2c2546'); s.r(3, 4, 2, 38, '#3d3462'); s.r(1, 38, 14, 5, '#1f1a33'); s.r(2, 0, 12, 5, '#3d3462');
    s.r(7, 8, 2, 28, v ? '#c084ff' : '#7a4cff'); s.p(7, 8, '#ffffff');
  });
  add('shack', 1, 48, 38, (s, R) => {
    s.r(3, 12, 42, 24, '#9a6a44');
    for (let x = 3; x < 45; x += 3) s.r(x, 12, 1, 24, '#7d5234');
    s.r(0, 6, 48, 8, '#8a929e'); for (let x = 0; x < 48; x += 4) s.r(x, 6, 2, 8, '#a9b1bc');
    s.r(19, 20, 10, 16, '#4a3020'); s.p(27, 28, '#ffcf3a');
    s.r(6, 18, 8, 6, '#2a2c3a'); s.r(7, 19, 6, 4, '#ffcf6a');
    s.r(38, 0, 4, 7, '#5a606c'); s.dith(30, 30, 16, 6, '#a86b3c', 0.3, R);
  });
  add('bed', 2, 16, 12, (s, R, v) => {
    s.r(1, 3, 14, 8, '#6a4a2a'); s.r(1, 3, 14, 1, '#8a6a4a');
    for (let i = 0; i < 3; i++) { const x = 3 + i * 5; s.r(x, 4, 1, 3, '#5aa845'); s.p(x - 1, 4, '#7ccb5e'); s.p(x + 1, 5, '#7ccb5e'); if (v) s.p(x, 3, '#ff7a5a'); }
  }, false);
  // стенды-маяки (контрольные точки)
  P.beacon = [false, true].map((on) => sprite(12, 26, (s) => {
    s.r(5, 6, 2, 18, '#4a5060'); s.r(2, 23, 8, 3, '#3a3f4a');
    s.r(2, 0, 8, 7, '#5a606c'); s.r(3, 1, 6, 5, on ? '#5af0ff' : '#2a3040'); if (on) s.p(4, 2, '#ffffff');
  }));
  P.chest = [false, true].map((open) => sprite(16, 14, (s) => {
    if (!open) { s.r(1, 4, 14, 9, '#5a6a7a'); s.r(1, 2, 14, 4, '#7a8a9a'); s.r(1, 6, 14, 1, '#3a4450'); s.r(7, 5, 2, 3, '#ffcf3a'); s.r(1, 10, 14, 1, '#e0b030'); }
    else { s.r(1, 6, 14, 7, '#5a6a7a'); s.r(1, 0, 14, 5, '#7a8a9a'); s.r(2, 5, 12, 2, '#1f2433'); s.r(1, 10, 14, 1, '#e0b030'); }
  }));
  P.tower = [true, false].map((on) => sprite(18, 48, (s) => {
    s.r(3, 44, 12, 4, '#3a3f4a');
    s.line(4, 44, 8, 10, '#6b7380', 1); s.line(13, 44, 9, 10, '#6b7380', 1);
    for (let y = 16; y < 44; y += 7) s.line(5 + (y - 16) / 9, y, 12 - (y - 16) / 9, y + 5, '#5a606c');
    s.r(4, 2, 10, 9, '#3a3f4f'); s.r(5, 3, 8, 7, '#2b2f3c');
    s.circ(9, 6, 2, on ? '#ff3b3b' : '#4a4f5a'); if (on) s.p(8, 5, '#ffd0d0');
    s.r(8, 0, 2, 2, '#6b7380');
  }));
  P.terminal = [false, true].map((on) => sprite(14, 20, (s) => {
    s.r(2, 4, 10, 15, '#4a5462'); s.r(2, 4, 10, 1, '#6a7482');
    s.r(3, 6, 8, 6, '#1f2433'); s.r(4, 7, 6, 4, on ? '#5aff9a' : '#3ac7d9'); s.r(4, 7, 3, 1, '#ffffff99');
    s.r(4, 14, 6, 2, '#2b2f3a'); s.p(5, 14, '#ff4a4a'); s.p(8, 14, '#ffcf3a');
  }));
  P.reactor = [true, false].map((on) => sprite(46, 48, (s) => {
    s.r(4, 10, 38, 34, '#7a838e'); s.ell(23, 10, 19, 6, '#9aa3ae'); s.r(4, 40, 38, 6, '#5a636e');
    s.r(14, 14, 18, 24, '#2b2f3a'); s.r(16, 16, 14, 20, on ? '#ffb43a' : '#3a4050');
    if (on) { s.r(18, 18, 10, 16, '#ffe08a'); s.r(21, 20, 4, 12, '#ffffff'); }
    s.r(4, 24, 8, 3, '#e0b030'); s.r(34, 24, 8, 3, '#e0b030');
    s.r(0, 30, 5, 4, '#5a606c'); s.r(41, 30, 5, 4, '#5a606c');
  }));
  P.throne = [sprite(60, 30, (s) => {
    s.ell(30, 18, 28, 10, '#2a2342'); s.ell(30, 16, 24, 8, '#3d3462');
    s.ring(30, 16, 18, 1, '#9b5cff');
    for (let i = 0; i < 6; i++) s.line(30, 16, 30 + Math.cos(i) * 22, 16 + Math.sin(i) * 8, '#5a4a8a');
  })];
  P.gravel = [sprite(16, 8, (s) => { s.p(3, 4, '#8a929e'); s.p(9, 2, '#a9b1bc'); s.p(12, 5, '#8a929e'); s.p(6, 6, '#6b7380'); }, false)];
  P.flowers = [sprite(16, 10, (s) => {
    const c = ['#ff8fb1', '#fff7d6', '#ffcf3a', '#b48cff'];
    for (let i = 0; i < 5; i++) { const x = 2 + i * 3, y = 3 + (i % 2) * 3; s.r(x, y + 1, 1, 3, '#3b8237'); s.p(x, y, c[i % 4]); }
  }, false)];
  return P;
}

/* ===================== ЛЮДИ И ЧЕЛОВЕКОПОДОБНЫЕ ===================== */
/*
 * Чиби-человечек 16×20: большая голова, короткое тело.
 * Кадры: [стоит, шаг 1, шаг 2] для направлений down / up / side (смотрит вправо).
 */
function drawHuman(spec) {
  const out = { down: [], up: [], side: [] };
  for (const dir of ['down', 'up', 'side']) {
    for (let f = 0; f < 3; f++) {
      out[dir].push(sprite(16, 21, (s) => humanFrame(s, spec, dir, f)));
    }
  }
  return out;
}

function humanFrame(s, o, dir, f) {
  const lA = f === 1 ? -1 : 0, lB = f === 2 ? -1 : 0;   // поднятие ноги при шаге
  const bob = f === 0 ? 0 : 1;                          // покачивание тела
  const Y = 1 - bob + 1;
  const sk = o.skin, hair = o.hair, top = o.top, bot = o.bottom, shoe = o.shoes;
  // ноги
  if (dir === 'side') {
    s.r(6 + (f === 1 ? -1 : f === 2 ? 1 : 0), 16, 2, 3, bot); s.r(6 + (f === 1 ? -1 : f === 2 ? 1 : 0), 19, 3, 1, shoe);
    s.r(8 + (f === 1 ? 1 : f === 2 ? -1 : 0), 16, 2, 3, bot); s.r(8 + (f === 1 ? 1 : f === 2 ? -1 : 0), 19, 3, 1, shoe);
  } else {
    s.r(5, 16 + lA, 2, 3, bot); s.r(5, 19 + lA, 2, 1, shoe);
    s.r(9, 16 + lB, 2, 3, bot); s.r(9, 19 + lB, 2, 1, shoe);
  }
  // тело
  const by = 11 + Y - 1;
  if (o.coat) {
    s.r(4, by, 8, 7, o.coat);
    if (dir !== 'up') s.r(7, by, 2, 4, o.top);
    s.r(4, by + 6, 1, 1, o.coatDark || '#c8ccd4'); s.r(11, by + 6, 1, 1, o.coatDark || '#c8ccd4');
  } else {
    s.r(4, by, 8, 5, top);
    s.r(4, by + 4, 8, 1, bot);
    if (o.lines) { s.r(7, by, 2, 4, o.lines); }
  }
  // руки
  const armC = o.coat || top;
  if (dir === 'side') {
    const sw = f === 1 ? -1 : f === 2 ? 1 : 0;
    s.r(7 + sw, by + 1, 2, 4, armC); s.r(7 + sw, by + 4, 2, 1, o.robot ? o.skin : sk);
  } else {
    const sa = f === 1 ? 1 : 0, sb = f === 2 ? 1 : 0;
    s.r(3, by + sa, 1, 4, armC); s.p(3, by + 4 + sa, sk);
    s.r(12, by + sb, 1, 4, armC); s.p(12, by + 4 + sb, sk);
  }
  if (o.scarf) {
    s.r(4, by - 1, 8, 2, o.scarf);
    if (dir === 'side') s.r(2, by, 3, 2, o.scarf);
    if (dir === 'up') s.r(9, by + 1, 2, 3, o.scarf);
  }
  // голова
  const hy = 1 + Y - 1;
  s.r(4, hy + 1, 8, 9, sk); s.r(3, hy + 2, 10, 7, sk);
  if (o.robot) {
    s.r(4, hy + 1, 8, 1, o.headTop || sk);
    if (dir === 'down') {
      if (o.oneEye) { s.r(8, hy + 5, 3, 2, o.visor); s.p(9, hy + 5, '#ffffff'); }
      else { s.r(4, hy + 5, 8, 2, o.visor); s.r(5, hy + 5, 2, 1, '#ffffffaa'); }
      s.r(6, hy + 8, 4, 1, o.mouth || '#00000033');
    } else if (dir === 'side') {
      s.r(8, hy + 5, 5, 2, o.visor); s.p(11, hy + 5, '#ffffff');
      s.r(3, hy + 4, 3, 3, o.ear || '#00000022');
    } else {
      s.r(5, hy + 4, 6, 4, o.back || '#00000022');
    }
    if (o.antenna) { s.r(7, hy - 2, 1, 3, '#6b7380'); s.p(7, hy - 3, o.visor); }
    if (o.rust) { s.p(5, hy + 2, o.rust); s.p(10, hy + 8, o.rust); s.p(4, hy + 7, o.rust); }
    return;
  }
  // волосы
  if (dir === 'down') {
    s.r(4, hy, 8, 1, hair); s.r(3, hy + 1, 10, 3, hair);
    s.r(3, hy + 4, 1, 3, hair); s.r(12, hy + 4, 1, 3, hair);
    if (o.style === 'spiky') { s.p(4, hy - 1, hair); s.p(7, hy - 1, hair); s.p(10, hy - 1, hair); s.r(5, hy + 4, 2, 1, hair); }
    if (o.style === 'bun') { s.r(6, hy - 2, 4, 2, hair); s.r(3, hy + 4, 1, 5, hair); s.r(12, hy + 4, 1, 5, hair); }
    if (o.style === 'old') { s.r(3, hy + 1, 10, 1, o.hat); s.r(2, hy + 2, 12, 2, o.hat); s.r(2, hy + 4, 2, 3, o.hat); s.r(12, hy + 4, 2, 3, o.hat); }
    // глаза
    s.r(5, hy + 5, 2, 2, '#2a1e2e'); s.p(5, hy + 5, '#ffffff');
    s.r(9, hy + 5, 2, 2, '#2a1e2e'); s.p(9, hy + 5, '#ffffff');
    if (o.glasses) { s.r(4, hy + 4, 4, 1, '#3a3a4a'); s.r(8, hy + 4, 4, 1, '#3a3a4a'); s.p(4, hy + 5, '#3a3a4a'); s.p(11, hy + 5, '#3a3a4a'); }
    s.p(4, hy + 7, '#f19a9a'); s.p(11, hy + 7, '#f19a9a');
    if (o.beard) { s.r(4, hy + 7, 8, 3, o.beard); s.r(6, hy + 10, 4, 1, o.beard); s.p(7, hy + 7, sk); s.p(8, hy + 7, sk); }
  } else if (dir === 'up') {
    s.r(4, hy, 8, 1, hair); s.r(3, hy + 1, 10, 8, hair);
    if (o.style === 'bun') s.r(6, hy - 2, 4, 3, hair);
    if (o.style === 'old') { s.r(2, hy + 1, 12, 5, o.hat); }
    if (o.style === 'spiky') { s.p(4, hy - 1, hair); s.p(8, hy - 1, hair); s.p(11, hy - 1, hair); }
  } else {
    s.r(4, hy, 8, 1, hair); s.r(3, hy + 1, 10, 3, hair); s.r(3, hy + 4, 4, 5, hair);
    if (o.style === 'spiky') { s.p(5, hy - 1, hair); s.p(9, hy - 1, hair); s.p(2, hy + 2, hair); }
    if (o.style === 'bun') s.r(2, hy - 1, 4, 3, hair);
    if (o.style === 'old') { s.r(2, hy + 1, 12, 3, o.hat); s.r(2, hy + 4, 4, 3, o.hat); }
    s.r(9, hy + 5, 2, 2, '#2a1e2e'); s.p(10, hy + 5, '#ffffff');
    if (o.glasses) { s.r(8, hy + 4, 5, 1, '#3a3a4a'); s.p(12, hy + 5, '#3a3a4a'); }
    s.p(12, hy + 7, '#f19a9a');
    if (o.beard) { s.r(7, hy + 7, 6, 3, o.beard); }
  }
}

/* ===================== ВРАГИ И БОССЫ (кадры, смотрят вправо) ===================== */
function makeMonsters() {
  const M = {};
  const two = (w, h, fn) => [0, 1].map((f) => sprite(w, h, (s) => fn(s, f)));
  M.drone = two(16, 14, (s, f) => {
    if (f) s.r(5, 1, 6, 1, '#c8ced8'); else s.r(1, 1, 14, 1, '#c8ced8');
    s.r(7, 2, 2, 2, '#5a606c');
    s.ell(8, 8, 6, 4, '#9aa4b2'); s.r(3, 10, 10, 2, '#6b7480'); s.r(4, 6, 6, 1, '#c3cbd6');
    s.circ(11, 8, 1, '#ff3b3b'); s.p(11, 7, '#ffd0d0');
    s.r(4, 12, 1, 2, '#5a606c'); s.r(11, 12, 1, 2, '#5a606c');
  });
  M.hornet = two(14, 12, (s, f) => {
    if (f) { s.ell(5, 3, 3, 2, '#d8f0ffcc'); s.ell(8, 2, 3, 2, '#d8f0ffcc'); }
    else { s.ell(5, 6, 3, 1, '#d8f0ffcc'); s.ell(8, 6, 3, 1, '#d8f0ffcc'); }
    s.ell(6, 8, 4, 3, '#f2c230'); s.r(4, 6, 1, 5, '#2b2b30'); s.r(7, 6, 1, 5, '#2b2b30');
    s.circ(11, 7, 2, '#3a3f4a'); s.p(12, 7, '#ff3b3b'); s.p(1, 9, '#2b2b30'); s.p(0, 10, '#2b2b30');
  });
  M.cleaner = two(18, 16, (s, f) => {
    s.r(3, 12, 4, 3, '#2b2b30'); s.r(11, 12, 4, 3, '#2b2b30'); s.p(4 + f, 13, '#6b7380'); s.p(12 + f, 13, '#6b7380');
    s.r(2, 6, 14, 7, '#e6e9ee'); s.r(2, 9, 14, 2, '#3aa0ff'); s.r(2, 12, 14, 1, '#b8bec8');
    s.ell(9, 5, 5, 3, '#7fd6ff'); s.r(7, 3, 2, 1, '#ffffff'); s.p(12, 5, '#ff3b3b');
    s.r(16, 10 + f, 2, 4, '#ffcf3a'); s.r(15, 11, 1, 1, '#8a929e');
  });
  M.dog = two(22, 15, (s, f) => {
    s.r(4, 4, 12, 5, '#8a929e'); s.r(4, 4, 12, 1, '#b0b8c4'); s.r(6, 6, 7, 1, '#ff3b3b');
    s.r(15, 1, 6, 5, '#9aa4b2'); s.p(19, 2, '#ff3b3b'); s.r(20, 4, 2, 1, '#5a606c'); s.r(15, 0, 2, 1, '#6b7380');
    s.line(4, 5, 1, 2, '#6b7380');
    const a = f ? 1 : -1;
    s.r(5 + a, 9, 2, 5, '#5a606c'); s.r(8 - a, 9, 2, 5, '#6b7380'); s.r(12 + a, 9, 2, 5, '#5a606c'); s.r(14 - a, 9, 2, 5, '#6b7380');
  });
  M.scrapbot = two(20, 19, (s, f) => {
    // гусеница: катки и бегущие траки
    s.r(1, 14, 15, 5, '#3a3a40'); s.r(1, 14, 15, 1, '#55555e');
    for (let x = 2 + f; x < 15; x += 2) s.p(x, 18, '#1e1e24');
    for (const x of [3, 8, 13]) { s.r(x - 1, 15, 3, 3, '#6b7380'); s.p(x, 16, '#2b2b30'); }
    // корпус из разных листов с заклёпками
    s.r(3, 7, 11, 7, '#a86b3c'); s.r(3, 7, 11, 1, '#c98d63'); s.dith(3, 8, 11, 6, '#8a5530', 0.18, rng(5));
    s.r(3, 10, 5, 4, '#7a8290'); s.r(3, 10, 5, 1, '#9aa4b2');
    for (const [x, y] of [[4, 11], [6, 13], [12, 8], [12, 12]]) s.p(x, y, '#e0c090');
    // голова-коробка с круглым глазом
    s.r(5, 2, 8, 5, '#8a929e'); s.r(5, 2, 8, 1, '#b0b8c4'); s.r(5, 6, 8, 1, '#5a606c');
    s.circ(10, 4, 1, '#2b2b30'); s.p(10, 4, f ? '#ffd040' : '#ffb000'); s.p(9, 3, '#3a3f4a');
    s.r(6, 4, 2, 1, '#5a606c');
    s.r(7, 0, 1, 2, '#6b7380'); s.p(7, 0, f ? '#ff3b3b' : '#ffb000');
    // рука-клешня
    s.r(14, 9, 2, 2, '#6b7380');
    if (f) { s.r(16, 6, 2, 3, '#9aa4b2'); s.r(16, 11, 2, 3, '#9aa4b2'); s.p(18, 6, '#9aa4b2'); s.p(18, 13, '#9aa4b2'); }
    else { s.r(16, 7, 3, 2, '#9aa4b2'); s.r(16, 11, 3, 2, '#9aa4b2'); }
  });
  M.turret = two(16, 16, (s, f) => {
    s.r(2, 10, 12, 6, '#5a606c'); s.r(2, 10, 12, 1, '#7a808a'); s.r(4, 14, 8, 2, '#3a3f4a');
    s.circ(8, 7, 4, '#8a929e'); s.r(4, 5, 4, 1, '#b0b8c4');
    s.r(11, 6, 5, 2, '#3a3f4a');
    s.p(8, 7, f ? '#ff3b3b' : '#a02020');
  });
  M.bomber = two(14, 16, (s, f) => {
    s.circ(7, 9, 5, '#d33a3a'); s.ell(5, 7, 2, 1, '#ff8a7a');
    s.r(4, 13, 2, 3, '#3a3f4a'); s.r(8, 13, 2, 3, '#3a3f4a');
    s.r(6, 1, 1, 3, '#5a606c'); s.circ(6, 1, 1, f ? '#ffe03a' : '#6b5a1a');
    s.r(8, 9, 3, 2, '#2b2b30'); s.p(9, 9, '#ffcf3a');
  });
  // Боссы
  M.press = two(52, 46, (s, f) => {
    s.r(2, 36, 48, 9, '#2c2c30'); for (let x = 6; x < 48; x += 8) s.circ(x, 40, 2, '#4a4a52');
    s.r(4, 12, 44, 25, '#e0a92a'); s.r(4, 12, 44, 2, '#f5c54a');
    for (let x = 4; x < 48; x += 6) s.r(x, 31, 3, 4, '#2b2b30');
    s.r(32, 16, 12, 9, '#2a3450'); s.r(39, 18, 3, 3, '#ff3b3b'); s.r(33, 17, 4, 1, '#7a90c0');
    const py = f ? 6 : 0;
    s.r(14, 0, 2, 12, '#5a606c'); s.r(24, 0, 2, 12, '#5a606c');
    s.r(8, 2 + py, 24, 8, '#6b7480'); s.r(8, 2 + py, 24, 1, '#9aa4b2'); s.r(8, 9 + py, 24, 1, '#3a3f4a');
    s.r(6, 20, 20, 3, '#c08a1a');
  });
  M.strider = two(58, 46, (s, f) => {
    const k = f ? 3 : -3;
    const legs = [[20, 14, 6, 26 + k, 2, 45], [24, 16, 14, 30 - k, 12, 45], [34, 16, 44, 30 + k, 46, 45], [38, 14, 52, 26 - k, 56, 45]];
    for (const [x0, y0, x1, y1, x2, y2] of legs) { s.line(x0, y0, x1, y1, '#4a5260', 2); s.line(x1, y1, x2, y2, '#5a6470', 2); }
    s.ell(29, 14, 14, 9, '#5a6470'); s.ell(27, 11, 10, 5, '#7a8494'); s.r(18, 18, 22, 2, '#3a404c');
    s.circ(35, 14, 3, '#ff3b3b'); s.p(34, 13, '#ffd0d0');
    s.r(41, 16, 6, 3, '#3a3f4a');
  });
  M.sentinel = two(42, 42, (s, f) => {
    s.ring(21, 21, 19, 3, '#c8ccd6', (a) => Math.sin(a * 3 + f * 0.6) > 0.75);
    s.ring(21, 21, 15, 1, '#ff3b3b88', (a) => Math.sin(a * 4 - f) > 0.3);
    s.circ(21, 21, 11, '#2b2f3c'); s.ell(19, 17, 6, 3, '#4a4f60');
    s.circ(21, 21, 6, f ? '#ff3b3b' : '#e02a2a'); s.circ(21, 21, 2, '#2a0000'); s.p(19, 19, '#ffffff');
  });
  M.archon = [0, 1, 2, 3].map((f) => sprite(76, 66, (s) => {
    const red = f >= 2;
    const c1 = red ? '#ff4a6a' : '#9b5cff', c2 = red ? '#ffb0c0' : '#d0b0ff';
    s.ring(38, 30, 30, 2, c1, (a) => Math.sin(a * 6 + (f % 2) * 0.5) > 0.6);
    s.ring(38, 30, 24, 1, c1 + '88', (a) => Math.sin(a * 5 - (f % 2)) > 0.2);
    for (let i = 0; i < 5; i++) s.line(38, 44, 14 + i * 12, 65, '#2a2342', 2);
    s.circ(38, 30, 17, '#1a1630'); s.ell(33, 22, 9, 5, '#2c2550');
    s.circ(38, 30, 10, red ? '#5a1030' : '#3a1f70');
    s.ell(38, 30, 8, 2 + (f % 2), c2); s.r(37, 28, 3, 5, '#ffffff');
  }));
  M.hand = two(22, 18, (s, f) => {
    s.r(2, 4, 12, 10, '#4a4568'); s.r(2, 4, 12, 2, '#6d6596');
    const o = f ? 2 : 0;
    s.r(14, 3 - o, 7, 3, '#6d6596'); s.r(14, 8, 8, 3, '#6d6596'); s.r(14, 13 + o, 7, 3, '#6d6596');
    s.p(8, 9, '#c084ff');
  });
  M.shopbot = [0, 1].map((f) => sprite(18, 22, (s) => {
    s.circ(9, 19, 2, '#2b2b30');
    s.r(3, 6, 12, 12, '#3aa0a0'); s.r(3, 6, 12, 1, '#5ad0d0'); s.r(3, 15, 12, 3, '#2a7a7a');
    s.r(5, 8, 8, 6, '#1f2433'); s.p(7, 10, '#5aff9a'); s.p(10, 10, '#5aff9a'); s.r(7, 12, 4, 1, '#5aff9a');
    s.r(1, 9 - f, 2, 5, '#5a606c'); s.r(15, 9 + f, 2, 5, '#5a606c');
    s.r(8, 2, 2, 4, '#6b7380'); s.circ(9, 2, 1, '#ffcf3a');
  }));
  return M;
}

/* ===================== ИКОНКИ ПРЕДМЕТОВ 10×10 ===================== */
function makeIcons() {
  const I = {};
  I.scrap = sprite(10, 10, (s) => { s.circ(5, 5, 4, '#b0b8c4'); s.p(5, 0, '#b0b8c4'); s.p(5, 10, '#b0b8c4'); s.p(0, 5, '#b0b8c4'); s.p(10, 5, '#b0b8c4'); s.circ(5, 5, 1, '#5a606c'); s.p(3, 3, '#ffffff'); });
  I.med = sprite(10, 10, (s) => { s.r(1, 2, 8, 7, '#f3f3f3'); s.r(4, 3, 2, 5, '#e03a3a'); s.r(2, 5, 6, 1, '#e03a3a'); s.r(3, 1, 4, 1, '#c8c8c8'); });
  I.cell = sprite(10, 12, (s) => { s.r(2, 2, 6, 9, '#3a3f4a'); s.r(3, 3, 4, 7, '#5aff9a'); s.r(4, 0, 2, 2, '#8a929e'); s.r(3, 3, 1, 7, '#c8ffe0'); });
  I.module = sprite(12, 10, (s) => { s.r(1, 2, 10, 6, '#2a5a3a'); s.r(3, 3, 6, 4, '#1f2433'); s.p(4, 4, '#5af0ff'); for (let x = 2; x < 11; x += 2) { s.p(x, 1, '#d0b040'); s.p(x, 8, '#d0b040'); } });
  I.seed = sprite(10, 12, (s) => { s.r(1, 1, 8, 10, '#e8d6a8'); s.r(1, 1, 8, 2, '#b08850'); s.circ(5, 7, 2, '#5aa845'); s.p(5, 5, '#7ccb5e'); });
  I.heart = sprite(9, 8, (s) => { s.r(1, 1, 3, 3, '#ff4a5a'); s.r(5, 1, 3, 3, '#ff4a5a'); s.r(1, 3, 7, 2, '#ff4a5a'); s.r(2, 5, 5, 1, '#ff4a5a'); s.r(3, 6, 3, 1, '#ff4a5a'); s.p(2, 2, '#ffd0d0'); });
  return I;
}

/* ===================== БИТМАП-ШРИФТ 3×5 (цифры над головами) ===================== */
const GLYPH = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '-': '000000111000000',
  '!': '010010010000010', '?': '111001010000010', '.': '000000000000010', 'У': '101101111001110',
  'р': '000111101111100', ' ': '000000000000000', 'x': '000101010101000',
};
const _glyphCache = {};
function glyphImg(text, col) {
  const key = text + col;
  if (_glyphCache[key]) return _glyphCache[key];
  const w = text.length * 4 + 1;
  const s = new Pix(w, 7);
  for (let i = 0; i < text.length; i++) {
    const g = GLYPH[text[i]] || GLYPH[' '];
    for (let k = 0; k < 15; k++) if (g[k] === '1') s.p(1 + i * 4 + (k % 3), 1 + ((k / 3) | 0), col);
  }
  s.outline('#120a18');
  _glyphCache[key] = s.c;
  return s.c;
}
