'use strict';
/*
 * Персонажи по эскизам (Катя Титова, герой) и все боссы.
 * Люди — 16×32 по сетке-шаблону, каждая буква — цвет из палитры.
 */

/* ===================== ЛЮДИ 16×32 ===================== */
const TALL_GRID = {
  katya: {
    down: [
      '...khhhhhhk...', '..khhhhhhhhk..', '.khhHHhhhhhhk.', '.khHhhhhhhhhk.', 'khhhhhhhhhhhhk',
      'khhhhhhhhhhhhk', 'khhhhsssshhhhk', 'khhSkkSSkkShhk', 'khhseesseeshhk', 'khhseesseeshhk',
      'khhsSssssSshhk', 'khhsssmmssshhk', 'khhSssssssShhk', '.khhSssssShhk.', '.khhhSSSShhhk.',
      '..khkdssdkhk..', '...kdCccCdk...', '..kdcCccCcdk..', '.kdccCccCccdk.', 'kdccdCccCdccdk',
      'kdccdccccdccdk', 'kdccdcCCcdccdk', 'ksskdccccdkssk', '.kkkdccccdkkk.', '..kdccccccdk..',
      '..kdcCccCcdk..', '..kdccccccdk..', '...kdcccCdk...', '...kdccccdk...', '...kDdccdDk...',
      '...kDDDDDDk...', '...kbbkkbbk...',
    ],
    up: [
      '...khhhhhhk...', '..khhhhhhhhk..', '.khhhhhhhhhhk.', '.khhhHHhhhhhk.', 'khhhHhhhhhhhhk',
      'khhhhhhhhhhhhk', 'khhhhhhhhHhhhk', 'khhhhhhhhhhhhk', 'khhhhhhhhhhhhk', 'khhHhhhhhhhhhk',
      'khhhhhhhhhhhhk', 'khhhhhhhHhhhhk', 'khhhhhhhhhhhhk', '.khhhhhhhhhhk.', '.khhhhhhhhhhk.',
      '..khhhhhhhhk..', '...kdhhhhdk...', '..kdcCccCcdk..', '.kdccCccCccdk.', 'kdccdCccCdccdk',
      'kdccdccccdccdk', 'kdccdcCCcdccdk', 'ksskdccccdkssk', '.kkkdccccdkkk.', '..kdccccccdk..',
      '..kdcCccCcdk..', '..kdccccccdk..', '...kdcccCdk...', '...kdccccdk...', '...kDdccdDk...',
      '...kDDDDDDk...', '...kbbkkbbk...',
    ],
    side: [
      '....khhhhhk...', '...khhhhhhhk..', '..khhHHhhhhhk.', '.khhHhhhhhhhk.', '.khhhhhhhhhhhk',
      '.khhhhhhhhhhhk', '.khhhhhhhsssk.', '.khhhhhhhSkSsk', '.khhhhhhsseesk', '.khhhhhhsseesk',
      '.khhhhhhsSsssk', '.khhhhhhssmmk.', '.khhhhhhsssk..', '.khhhhhhSSk...', '..khhhhhkk....',
      '...khhhkdsk...', '....kdCccdk...', '...kdcCccCdk..', '...kdccCccdk..', '...kdcdcccdk..',
      '...kdcdcccdk..', '...kdcdcccdk..', '...kdcksscdk..', '...kdcckkcdk..', '...kdcccccdk..',
      '...kdcCcccdk..', '...kdcccccdk..', '...kdccccdk...', '...kdccccdk...', '...kDdccdDk...',
      '...kDDDDDDk...', '....kbbbbbk...',
    ],
    legs: 29,
  },
  hero: {
    down: [
      '....kkkkkk....', '...khhhhhhk...', '..khhHhhhhhk..', '.khhHhhhhhhhk.', '.khhhhhhhhhhk.',
      '.khRRlhhhhhhk.', '.khrrrRsShhhk.', '.khlrrRsssshk.', '.khrGGRseeShk.', '.khrGGRseeShk.',
      '.khrrrRsssshk.', '.khlrrRsmmshk.', '.khRrrRSssShk.', '..khRrRssshk..', '....kRrssk....',
      '..kkuUUUUukk..', '.kAavUUUUvuuk.', '.kAavUUUUvuuk.', '.kgRvuUUuvuuk.', '.kAavuUUuvuuk.',
      '.kAavuuuuvuuk.', '.kRgvvvvvvssk.', '..kkvvvvvvkk..', '...knnnkvvvk..', '...knlnkvuvk..',
      '...knlnkvuvk..', '...kRgRkvvvk..', '...knlnkvuvk..', '...knlnkvuvk..', '...knnnkvuvk..',
      '...knnnkvvvk..', '...kbbbkbbbk..',
    ],
    up: [
      '....kkkkkk....', '...khhhhhhk...', '..khhhhHhhhk..', '.khhhhhhHhhhk.', '.khhhhhhhhhhk.',
      '.khhhhhhhhhhk.', '.khhhhhhhhhhk.', '.khhHhhhhhhRk.', '.khhhhhhhhhrk.', '.khhhhhhhhhrk.',
      '.khhhhhhhhhRk.', '.khhhhhhhhhhk.', '.khhhhhhhhhhk.', '..khhhhhhhhk..', '....kssRRk....',
      '..kkuUUUUukk..', '.kuuvUUUUvaAk.', '.kuuvUUUUvaAk.', '.kuuvuUUuvRgk.', '.kuuvuUUuvaAk.',
      '.kuuvuuuuvaAk.', '.kssvvvvvvgRk.', '..kkvvvvvvkk..', '...kvvvknnnk..', '...kvuvknlnk..',
      '...kvuvknlnk..', '...kvvvkRgRk..', '...kvuvknlnk..', '...kvuvknlnk..', '...kvuvknnnk..',
      '...kvvvknnnk..', '...kbbbkbbbk..',
    ],
    side: [
      '.....kkkkk....', '....khhhhhk...', '...khhhHhhhk..', '..khhhhhhhhhk.', '..khhhhhhhRRk.',
      '..khhhhhhRrrlk', '..khhhhhhrrrrk', '..khhhhhhrrGGk', '..khhhhhhrrGGk', '..khhhhhhRrrrk',
      '..khhhhhhrrlrk', '..khhhhhhRrrk.', '...khhhhhRrk..', '....kkhhkRRk..', '.....kRrrk....',
      '....kvuUUvk...', '....kvuAAvk...', '....kvuAavk...', '....kvuRgvk...', '....kvuAavk...',
      '....kvuAavk...', '....kvvRgvk...', '....kvvvvvk...', '....knnkvvk...', '....knlkvuk...',
      '....knlkvuk...', '....kRgkvvk...', '....knlkvuk...', '....knlkvuk...', '....knnkvuk...',
      '....knnkvvk...', '....kbbbkbbbk.',
    ],
    legs: 23,
  },
};

const PAL_KATYA = {
  k: '#1a0c0c', h: '#3e1a16', H: '#6a2c22', s: '#f7dccb', S: '#d9a08c', e: '#2a1010', m: '#b85a5a',
  c: '#a0401a', C: '#c8682e', d: '#6e2410', D: '#4a1408', b: '#22120e', r: '#6a6e78', G: '#ff4a3a',
};
const PAL_HERO = {
  k: '#121014', h: '#26222a', H: '#40384a', r: '#5c5f68', R: '#3c3e46', l: '#8a8e98', G: '#ff4a3a', g: '#5af0ff',
  s: '#f0d6c6', S: '#cfa898', e: '#1e1a1c', m: '#a86a6a', u: '#8c8e96', U: '#a8aab2', v: '#64666e',
  a: '#4e525c', A: '#7c828e', n: '#4a4e58', b: '#1a1a1e',
};
// обычный человек по шаблону героя: металл превращаем в кожу и одежду
function humanPal(o) {
  const skin = o.skin || '#f0d6c6', shade = o.shade || '#cfa898';
  return {
    ...PAL_HERO, h: o.hair, H: o.hairHi || o.hair, r: skin, R: shade, l: skin, G: '#1e1a1c',
    u: o.top, U: o.topHi || o.top, v: o.dark, a: o.top, A: o.topHi || o.top, n: o.dark, g: o.dark,
    s: skin, S: shade, b: o.shoes || '#1a1a1e',
  };
}

function tallFrames(key, pal, patch) {
  const T = TALL_GRID[key];
  const out = { down: [], up: [], side: [] };
  for (const dir of ['down', 'up', 'side']) {
    let g = T[dir].map((r) => r.padEnd(14, '.'));
    if (patch) g = patch(g.slice(), dir);
    for (let f = 0; f < 3; f++) {
      const c = mkCanvas(16, 32), x = c.getContext('2d');
      const split = dir === 'side' ? 8 : 7;
      for (let y = 0; y < 32; y++) for (let i = 0; i < 14; i++) {
        let row = y;
        // шаг: одна нога приподнята
        if (f && y >= T.legs && ((f === 1) === (i < split))) row = y + 1;
        const ch = row < 32 ? g[row][i] : '.';
        const col = pal[ch];
        if (!col || ch === '.') continue;
        x.fillStyle = col; x.fillRect(i + 1, y, 1, 1);
      }
      out[dir].push(c);
    }
  }
  return out;
}
// точечные правки шаблона: [[строка, позиция, 'символы'], ...]
const gpatch = (list) => (g, dir) => {
  for (const [d, y, x, s] of list) if (d === dir || d === '*') g[y] = g[y].slice(0, x) + s + g[y].slice(x + s.length);
  return g;
};

function makeTallSprites() {
  const S = {};
  S.katya = tallFrames('katya', PAL_KATYA);
  S.hero = tallFrames('hero', PAL_HERO);
  // Яна — привратница Ржавого города, наполовину робот
  S.yana = tallFrames('katya', { ...PAL_KATYA, h: '#c9c2dc', H: '#ffffff', k: '#16141e', c: '#2f6470', C: '#4a8a96', d: '#1e3e48', D: '#142a30', b: '#141418' },
    gpatch([['down', 8, 4, 'GG'], ['down', 9, 4, 'GG'], ['down', 7, 3, 'rr'], ['down', 10, 3, 'rr'], ['side', 8, 10, 'GG'], ['side', 9, 10, 'GG']]));
  S.mityai = tallFrames('hero', humanPal({ hair: '#d8d8dc', hairHi: '#ffffff', top: '#7a6a3a', topHi: '#9a8a52', dark: '#4a5a3a', shoes: '#3a2a1a' }),
    gpatch([['down', 11, 4, 'hhhhhh'], ['down', 12, 4, 'hhhhhh'], ['down', 13, 4, 'hhhh'], ['side', 11, 8, 'hhhh'], ['side', 12, 8, 'hhh']]));
  S.lev = tallFrames('hero', humanPal({ hair: '#6a6a7a', hairHi: '#8a8a9a', top: '#eef1f5', topHi: '#ffffff', dark: '#3a3a4a', shoes: '#222222' }));
  const PEOPLE = [
    { hair: '#5a3a22', top: '#5a7a4a', topHi: '#7a9a6a', dark: '#3a3a44' },
    { hair: '#d8b060', top: '#8a3a4a', topHi: '#aa5a6a', dark: '#2e2e3a', skin: '#f6dcc2' },
    { hair: '#1e1a1e', top: '#3a5a8a', topHi: '#5a7aaa', dark: '#2a2a32', skin: '#d8a880', shade: '#b8865e' },
    { hair: '#8a4a2a', top: '#7a6a5a', topHi: '#9a8a7a', dark: '#44403a' },
  ];
  S.people = PEOPLE.map((p) => tallFrames('hero', humanPal(p)));
  // полуроботы: половина тела — ржавый металл
  const HALF = [
    { h: '#4a3a2a', u: '#7a5a3a', U: '#9a7a5a', v: '#4e3a2a', r: '#8a5a3a', R: '#5a3a22', l: '#b07a4a', a: '#7a4a2a', A: '#a8703e', n: '#6a4026', G: '#ffb43a', g: '#ffb43a' },
    { h: '#2a2a30', u: '#4a5a6a', U: '#6a7a8a', v: '#2e3a46', r: '#7a7e88', R: '#4a4e58', l: '#a0a4ae', a: '#5a5e68', A: '#8a8e98', n: '#4a4e58', G: '#5aff9a', g: '#5aff9a' },
    { h: '#7a2a2a', u: '#6a3a5a', U: '#8a5a7a', v: '#3a2234', r: '#9a6a4a', R: '#6a4024', l: '#c08a5a', a: '#8a5a3a', A: '#b07a4a', n: '#6a4026', G: '#ff4a3a', g: '#ffd93a' },
  ];
  S.half = HALF.map((p) => tallFrames('hero', { ...PAL_HERO, ...p }));
  return S;
}

/* ===================== ГЛАЗ ХРОНОСА (рисуется поверх мониторов) ===================== */
const EYES = {};
function eyeSet(w, h) {
  const k = w + 'x' + h;
  if (EYES[k]) return EYES[k];
  const ir = Math.max(2, Math.round(h * 0.42));
  const mk = (iris, ring) => sprite(ir * 2 + 1, ir * 2 + 1, (s) => {
    s.circ(ir, ir, ir, ring); s.circ(ir, ir, ir - 1, iris);
    s.circ(ir, ir, Math.max(1, Math.round(ir * 0.45)), '#050308');
    s.p(ir - Math.max(1, ir >> 1), ir - Math.max(1, ir >> 1), '#ffffff');
  }, false);
  EYES[k] = {
    white: sprite(w, h, (s) => { s.ell(w >> 1, h >> 1, (w >> 1) - 1, (h >> 1) - 1, '#d8f0e8'); s.ell(w >> 1, (h >> 1) + 1, (w >> 1) - 2, (h >> 1) - 2, '#f4fff8'); }, false),
    red: mk('#ff6a1a', '#a02a0a'), blue: mk('#5ac8ff', '#1a5a9a'), purple: mk('#c060ff', '#5a1a8a'),
    ir, w, h,
  };
  return EYES[k];
}
// глаз смотрит в сторону (tx, ty); open — 0..1 (моргание)
function drawEyeAt(c, x, y, w, h, tx, ty, col = 'red', open = 1) {
  const E = eyeSet(w, h);
  if (open <= 0.05) { c.fillStyle = '#d8f0e8'; c.fillRect(Math.round(x + 1), Math.round(y + h / 2), w - 2, 1); return; }
  const hh = Math.max(2, Math.round(h * open));
  const oy = Math.round((h - hh) / 2);
  c.drawImage(E.white, 0, 0, w, h, Math.round(x), Math.round(y + oy), w, hh);
  const a = Math.atan2(ty - (y + h / 2), tx - (x + w / 2));
  const mx = (w / 2 - E.ir - 1), my = Math.max(0, h / 2 - E.ir - 1);
  const ix = x + w / 2 + Math.cos(a) * mx - E.ir, iy = y + h / 2 + Math.sin(a) * my - E.ir;
  c.save(); c.beginPath(); c.rect(Math.round(x), Math.round(y + oy), w, hh); c.clip();
  c.drawImage(E[col], Math.round(ix), Math.round(iy));
  c.restore();
}

/* ===================== БОССЫ ===================== */
function makeBosses() {
  const B = {};
  const frames = (n, w, h, fn) => Array.from({ length: n }, (_, f) => sprite(w, h, (s) => fn(s, f)));

  // Свалка — робот-пылесос с бензопилами
  B.vacuum = frames(3, 64, 36, (s, f) => {
    for (const side of [0, 1]) {
      const X = side ? 44 : 0;
      s.r(X + (side ? 0 : 8), 13, 12, 6, '#e0702a'); s.r(X + (side ? 0 : 8), 13, 12, 1, '#ffa04a');
      s.r(X + (side ? 12 : 0), 10, 8, 12, '#c9ced8'); s.r(X + (side ? 12 : 0), 10, 8, 1, '#ffffff');
      for (let y = 10; y < 22; y += 2) s.p(X + (side ? 19 : 0), y + (f % 2), '#4a4e58');
      for (let x = 0; x < 8; x += 2) { s.p(X + (side ? 12 : 0) + x + ((f + 1) % 2), 9, '#4a4e58'); s.p(X + (side ? 12 : 0) + x + (f % 2), 22, '#4a4e58'); }
    }
    s.ell(32, 22, 18, 10, '#2a2c34');
    s.ell(32, 20, 17, 9, '#3a3d48'); s.ell(32, 17, 14, 6, '#555a68'); s.ell(30, 15, 8, 3, '#6e7484');
    s.r(16, 24, 32, 3, '#1a1b20');
    s.r(26, 22, 12, 2, '#ff3a3a'); s.r(28 + (f % 3) * 2, 22, 2, 1, '#ffd0d0');
    s.circ(32, 15, 2, f === 2 ? '#ff3a3a' : '#a02020');
    for (let k = 0; k < 4; k++) s.p(18 + k * 9 + f, 30, '#8a8e98');
    s.r(14, 29, 36, 1, '#1a1b20');
  });
  // Пустошь — Ходок (из старой версии)
  // Ржавый город — ржавый Франкенштейн
  B.frank = frames(2, 46, 54, (s, f) => {
    s.r(13, 40, 8, 13, '#7a4024'); s.r(26, 40, 8, 13, '#6a6e78'); s.r(12, 50, 10, 4, '#2a2420'); s.r(25, 50, 10, 4, '#2a2420');
    s.r(8, 17, 30, 24, '#9a5a34'); s.r(8, 17, 30, 2, '#c07a48');
    s.r(10, 20, 9, 8, '#6a7480'); s.r(25, 28, 11, 9, '#b0703a'); s.r(12, 31, 6, 7, '#5a6a52');
    for (let x = 10; x < 37; x += 3) { s.p(x, 29, '#2a1a12'); s.p(x + 1, 30, '#2a1a12'); }
    for (let y = 18; y < 40; y += 3) s.p(23, y, '#2a1a12');
    s.circ(29, 23, 2, '#ffd93a'); s.p(29, 23, '#ffffff');
    const ar = f ? 1 : 0;
    s.r(2, 18 + ar, 6, 20, '#6a6e78'); s.r(1, 37 + ar, 8, 5, '#4a4e58'); s.p(1, 42 + ar, '#4a4e58'); s.p(8, 42 + ar, '#4a4e58');
    s.r(38, 18 - ar, 6, 18, '#8a4a2a'); s.r(37, 35 - ar, 9, 7, '#a8603a'); s.r(37, 41 - ar, 3, 3, '#a8603a'); s.r(43, 41 - ar, 3, 3, '#a8603a');
    s.r(14, 2, 18, 15, '#7a8a6a'); s.r(14, 2, 18, 3, '#5a6a4a'); s.r(14, 2, 18, 1, '#9aaa8a');
    s.r(10, 11, 4, 3, '#c8ccd4'); s.r(32, 11, 4, 3, '#c8ccd4');
    s.r(17, 7, 4, 3, '#9aff5a'); s.r(25, 7, 4, 3, '#9aff5a'); s.p(18, 7, '#eaffd0'); s.p(26, 7, '#eaffd0');
    s.r(18, 13, 10, 2, '#2a2a22'); for (let x = 19; x < 28; x += 2) s.p(x, 13, '#c8ccd4');
    s.line(15, 5, 31, 5, '#2a1a12');
    if (f) { s.line(9, 10, 5, 5, '#ffe36a'); s.line(5, 5, 7, 2, '#ffe36a'); s.line(37, 10, 41, 4, '#ffe36a'); s.line(41, 4, 39, 1, '#ffe36a'); }
  });
  // Метро — поезд-призрак
  B.train = frames(2, 52, 46, (s, f) => {
    s.r(4, 6, 44, 36, '#2e3a58'); s.r(6, 3, 40, 4, '#3e4a6a'); s.r(4, 6, 44, 1, '#5a6a8a');
    s.r(9, 9, 34, 14, '#0e1420'); s.r(11, 10, 6, 12, '#1e2a3a');
    s.dith(10, 10, 32, 12, '#5aff9a', 0.08, rng(3 + f));
    s.r(4, 26, 44, 3, '#d83a3a');
    s.circ(13, 34, 4, f ? '#fff6c0' : '#d8cc80'); s.circ(39, 34, 4, f ? '#fff6c0' : '#d8cc80'); s.circ(13, 34, 1, '#ffffff'); s.circ(39, 34, 1, '#ffffff');
    s.r(22, 31, 8, 6, '#1a2030'); s.r(24, 32, 4, 4, '#ffd93a');
    s.r(2, 41, 48, 5, '#1a1b20'); for (let x = 6; x < 48; x += 8) s.r(x, 42, 4, 2, '#4a4e58');
  });
  // Стальной город — бешеная колонка Алиса (по эскизу)
  B.alisa = frames(8, 48, 62, (s, f) => {
    const angry = f >= 4, t = (f % 4) * Math.PI / 2;
    const ring = angry ? '#ff3a6a' : '#b04aff', core = angry ? '#ffb0c0' : '#e0a0ff';
    const legs = [[10, -1], [17, -0.4], [31, 0.4], [38, 1]];
    for (let li = 0; li < 4; li++) {
      const [x0, dir] = legs[li];
      let px = x0, py = 22;
      for (let y = 23; y <= 61; y += 2) {
        const k = (y - 22) / 39;
        const x = x0 + dir * k * 9 + Math.sin(t + li * 1.7 + y * 0.18) * 2.2 * k;
        s.line(px, py, x, y, li % 2 ? '#8a888e' : '#7a787e', 2);
        px = x; py = y;
      }
      s.p(Math.round(px), 61, '#5a585e');
    }
    s.r(6, 8, 36, 16, '#b8b5bc'); s.ell(24, 23, 18, 3, '#8a888e');
    s.r(6, 8, 36, 16, '#c6c3ca'); s.r(6, 8, 6, 16, '#d8d6dc'); s.r(36, 8, 6, 16, '#a6a3aa');
    s.dith(6, 9, 36, 14, '#b2afb6', 0.25, rng(9));
    s.ell(24, 7, 18, 5, '#dedce2'); s.ell(24, 7, 15, 3, '#cfccd4');
    s.ring(24, 7, 6, 1, ring); s.circ(24, 7, 2, core);
    s.r(23, 11, 2, 8, '#2a1a30'); s.r(23, 13 + (f % 3), 2, 3, angry ? '#ff3a6a' : '#c060ff');
    s.r(6, 21, 36, 2, '#999699');
    if (angry) { s.p(14, 12, '#ff3a6a'); s.p(33, 12, '#ff3a6a'); s.r(13, 11, 3, 1, '#2a1a30'); s.r(32, 11, 3, 1, '#2a1a30'); }
  });
  // Ядро Хроноса — большой монитор (глаз рисуется отдельно)
  B.core = frames(2, 64, 56, (s, f) => {
    for (let i = 0; i < 6; i++) s.line(10 + i * 9, 44, 4 + i * 11, 55, '#1e1a2a', 2);
    s.r(26, 42, 12, 8, '#2a2c38'); s.r(18, 48, 28, 5, '#22242e');
    s.r(2, 2, 60, 42, '#2a2c38'); s.r(2, 2, 60, 2, '#4a4e60'); s.r(4, 4, 56, 38, '#3a3e4e');
    s.r(7, 7, 50, 32, '#061018');
    for (let y = 8; y < 39; y += 2) s.r(7, y, 50, 1, f ? '#0a1a24' : '#081620');
    s.r(54, 40, 3, 2, f ? '#5aff9a' : '#2a7a4a'); s.r(8, 40, 10, 1, '#5a5e70');
  });
  B.mon = frames(2, 24, 22, (s, f) => {
    s.r(9, 16, 6, 4, '#2a2c38'); s.r(5, 19, 14, 3, '#22242e');
    s.r(1, 1, 22, 16, '#2a2c38'); s.r(1, 1, 22, 1, '#4a4e60'); s.r(3, 3, 18, 12, '#061018');
    for (let y = 3; y < 15; y += 2) s.r(3, y, 18, 1, f ? '#0a1a24' : '#081620');
    s.p(20, 15, f ? '#5aff9a' : '#2a7a4a');
  });
  B.socket = frames(2, 16, 14, (s, f) => {
    s.r(1, 3, 14, 10, '#3a3f4a'); s.r(1, 3, 14, 1, '#5a606c');
    for (let x = 1; x < 15; x += 4) s.r(x, 11, 2, 2, '#ffcf3a');
    s.r(5, 5, 6, 4, '#1a1b20'); s.r(6, 6, 4, 2, f ? '#c060ff' : '#7a3aaa');
    s.r(7, 0, 2, 4, '#2a2342');
  });
  B.eyebot = frames(2, 14, 13, (s, f) => {
    s.circ(7, 6, 6, '#3a3e4e'); s.ell(6, 4, 3, 2, '#5a5e70');
    s.r(1 - f, 6, 2, 1, '#8a8e98'); s.r(11 + f, 6, 2, 1, '#8a8e98');
  });

  // Остальные боссы — общий конструктор
  const bot = (w, h, sp) => frames(2, w, h, (s, f) => drawBot(s, f, w, h, sp));
  B.digger = bot(58, 46, { base: 'tracks', body: [14, 14, 30, 20], col: ['#e0a92a', '#f5c54a', '#a8741a'], eye: 'visor', eyeCol: '#ff3a3a', ext: ['bucket'] });
  B.pump = bot(52, 44, { base: 'legs4', body: [8, 8, 36, 26], round: 1, col: ['#4a7a4a', '#6aa06a', '#2e5a2e'], eye: 'mono', eyeCol: '#d8ff3a', ext: ['hoses', 'tank'] });
  B.combine = bot(60, 44, { base: 'wheels', body: [10, 10, 40, 24], col: ['#c83a2a', '#e85a4a', '#8a2418'], eye: 'twin', eyeCol: '#ffd93a', ext: ['reel'] });
  B.gardener = bot(44, 54, { base: 'legs2', body: [12, 14, 20, 24], col: ['#4a8a3a', '#6aaa5a', '#2e5a26'], eye: 'visor', eyeCol: '#ff8a3a', ext: ['shears', 'leaves'] });
  B.teacher = bot(40, 52, { base: 'legs2', body: [10, 16, 20, 22], col: ['#6a5a8a', '#8a7aaa', '#463a60'], eye: 'glasses', eyeCol: '#5af0ff', ext: ['pointer', 'bun'] });
  B.collector = bot(50, 48, { base: 'legs4', body: [9, 6, 32, 30], col: ['#5a6a5a', '#7a8a7a', '#3a463a'], eye: 'screen', eyeCol: '#5aff9a', ext: ['dial', 'arms'] });
  B.surgeon = bot(54, 52, { base: 'hover', body: [16, 10, 22, 26], round: 1, col: ['#dfe5ec', '#ffffff', '#a8b0bc'], eye: 'mono', eyeCol: '#ff3a3a', ext: ['scalpels', 'cross'] });
  B.crab = bot(60, 40, { base: 'legs6', body: [14, 10, 32, 18], round: 1, col: ['#e8e2d0', '#ffffff', '#b0a890'], eye: 'stalks', eyeCol: '#3a8aff', ext: ['pincers'] });
  B.drill = bot(46, 50, { base: 'tracks', body: [10, 18, 26, 22], col: ['#8a6a4a', '#aa8a6a', '#5a4430'], eye: 'twin', eyeCol: '#ffb43a', ext: ['drill'] });
  B.telescope = bot(50, 56, { base: 'tripod', body: [14, 20, 22, 18], round: 1, col: ['#c8ccd6', '#eef0f4', '#8a909c'], eye: 'lens', eyeCol: '#ff3a6a', ext: ['tube'] });
  B.keeper = bot(44, 50, { base: 'legs2', body: [10, 14, 24, 22], col: ['#2a8a3a', '#4aaa5a', '#1a5a26'], eye: 'visor', eyeCol: '#ffffff', ext: ['gloves', 'number'] });
  B.tvhead = bot(42, 54, { base: 'legs2', body: [11, 22, 20, 18], col: ['#3a3a4a', '#5a5a6a', '#22222e'], eye: 'tv', eyeCol: '#ff6a1a', ext: ['tie'] });
  B.assembler = bot(56, 52, { base: 'none', body: [16, 30, 24, 20], col: ['#e8b02a', '#ffd04a', '#a8781a'], eye: 'mono', eyeCol: '#5af0ff', ext: ['bigarm'] });
  B.transformer = bot(48, 50, { base: 'none', body: [10, 14, 28, 30], col: ['#5a6a7a', '#7a8a9a', '#3a4654'], eye: 'twin', eyeCol: '#9af0ff', ext: ['coils', 'zap'] });
  B.crane = bot(52, 60, { base: 'tracks', body: [12, 30, 28, 18], col: ['#e0a92a', '#f5c54a', '#a8741a'], eye: 'visor', eyeCol: '#ff3a3a', ext: ['boom'] });
  B.turbine = bot(52, 52, { base: 'none', body: [6, 6, 40, 40], round: 1, col: ['#4a6a8a', '#6a8aaa', '#2e4660'], eye: 'mono', eyeCol: '#5af0ff', ext: ['blades'] });
  B.mother = bot(64, 40, { base: 'hover', body: [8, 8, 48, 18], round: 1, col: ['#5a606c', '#8a929e', '#3a3f4a'], eye: 'twin', eyeCol: '#ff3a3a', ext: ['props', 'bay'] });
  B.fridge = bot(40, 56, { base: 'none', body: [6, 4, 28, 48], col: ['#dfe8f0', '#ffffff', '#a8b8c8'], eye: 'screen', eyeCol: '#5ac8ff', ext: ['handle', 'ice'] });
  return B;
}

function drawBot(s, f, w, h, sp) {
  const [bx, by, bw, bh] = sp.body;
  const [c, hi, dk] = sp.col;
  const cx = bx + (bw >> 1), mid = by + (bh >> 1);
  const metal = '#5a606c', metal2 = '#8a929e', dark = '#2b2b30';
  const st = f ? 1 : -1;
  // опора
  switch (sp.base) {
    case 'tracks':
      s.r(bx - 4, by + bh - 2, bw + 8, h - (by + bh) + 1, dark);
      for (let x = bx - 2; x < bx + bw + 4; x += 6) s.circ(x + (f ? 2 : 0), h - 5, 2, '#4a4a52');
      break;
    case 'wheels':
      for (const x of [bx + 6, bx + bw - 6]) { s.circ(x, h - 7, 6, dark); s.circ(x, h - 7, 3, metal); s.p(x + st * 2, h - 7, metal2); }
      break;
    case 'legs2':
      s.r(cx - 7, by + bh, 4, h - by - bh - 2 + (f ? -1 : 0), metal); s.r(cx + 3, by + bh, 4, h - by - bh - 2 + (f ? 0 : -1), metal);
      s.r(cx - 9, h - 3 + (f ? -1 : 0), 7, 3, dark); s.r(cx + 2, h - 3 + (f ? 0 : -1), 7, 3, dark);
      break;
    case 'legs4':
      for (let i = 0; i < 4; i++) { const x0 = bx + 4 + i * ((bw - 8) / 3), x1 = x0 + (i < 2 ? -6 : 6) + (i % 2 ? st : -st) * 2; s.line(x0, by + bh - 2, x1, h - 2, metal, 2); }
      break;
    case 'legs6':
      for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
        const x0 = cx + sd * (6 + i * 5), x1 = cx + sd * (14 + i * 7), y1 = mid + 4 + i * 3 + ((i + (sd > 0 ? 1 : 0) + f) % 2) * 2;
        s.line(x0, mid + 2, x1, y1, dk, 2); s.line(x1, y1, x1 + sd * 3, h - 2, dk, 2);
      }
      break;
    case 'tripod':
      s.line(cx, by + bh, cx - 14, h - 1, metal, 2); s.line(cx, by + bh, cx + 14, h - 1, metal, 2); s.line(cx, by + bh, cx, h - 1, metal2, 2);
      break;
    case 'hover':
      s.ell(cx, h - 4, (bw >> 1) - 2, 2, f ? '#5af0ff' : '#3ab0d0'); s.r(cx - 4, by + bh, 8, h - by - bh - 5, metal);
      break;
    default: break;
  }
  // задние детали
  const ext = sp.ext || [];
  if (ext.includes('boom')) { s.line(cx, by + 4, w - 4, 4, '#c08a1a', 3); s.line(w - 4, 4, w - 4, 22 + f * 3, '#2b2b30', 1); s.r(w - 8, 22 + f * 3, 8, 6, '#a8741a'); s.line(cx, by + 4, 6, 10, '#c08a1a', 2); s.r(2, 10, 8, 8, '#4a4e58'); }
  if (ext.includes('blades')) for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + f * 0.5; s.line(cx, mid, cx + Math.cos(a) * 24, mid + Math.sin(a) * 24, '#9ab8d0', 3); }
  if (ext.includes('props')) for (const x of [6, w - 6]) { s.r(x - 5, 2, 10, 1, f ? '#c8ced8' : '#8a929e'); s.r(x - 1, 3, 2, 6, metal); }
  if (ext.includes('coils')) for (const x of [bx + 4, bx + bw - 6]) { for (let y = 2; y < by; y += 3) s.r(x - 2, y, 6, 2, '#c87a3a'); s.r(x, 0, 2, by, metal); }
  if (ext.includes('tube')) { s.line(cx - 2, mid, w - 3, 4, '#8a909c', 7); s.line(cx - 2, mid - 1, w - 4, 3, '#eef0f4', 2); s.circ(w - 4, 4, 3, sp.eyeCol); }
  // тело
  if (sp.round) { s.ell(cx, mid, bw >> 1, bh >> 1, c); s.ell(cx - 2, mid - (bh >> 2), (bw >> 2), (bh >> 3) + 1, hi); s.ell(cx, mid + (bh >> 2) + 1, (bw >> 1) - 2, 2, dk); }
  else { s.r(bx, by, bw, bh, c); s.r(bx, by, bw, 2, hi); s.r(bx, by + bh - 3, bw, 3, dk); s.r(bx, by, 2, bh, hi); }
  // глаза
  const E = sp.eyeCol;
  switch (sp.eye) {
    case 'visor': s.r(bx + 3, by + 4, bw - 6, 4, '#1a1b20'); s.r(bx + 5 + ((f * 3) % Math.max(1, bw - 12)), by + 5, 4, 2, E); break;
    case 'mono': s.circ(cx, mid - 2, 4, '#1a1b20'); s.circ(cx, mid - 2, 2, E); s.p(cx - 1, mid - 3, '#ffffff'); break;
    case 'twin': s.r(cx - 7, by + 4, 5, 4, '#1a1b20'); s.r(cx + 2, by + 4, 5, 4, '#1a1b20'); s.r(cx - 6, by + 5, 3, 2, E); s.r(cx + 3, by + 5, 3, 2, E); break;
    case 'glasses': s.r(cx - 8, by + 5, 7, 5, '#1a1b20'); s.r(cx + 1, by + 5, 7, 5, '#1a1b20'); s.r(cx - 1, by + 6, 2, 1, '#1a1b20'); s.r(cx - 7, by + 6, 5, 3, E); s.r(cx + 2, by + 6, 5, 3, E); break;
    case 'screen': s.r(bx + 4, by + 4, bw - 8, 10, '#061018'); s.r(bx + 6, by + 6, bw - 12, 1, E); s.r(bx + 6, by + 9, (bw - 12) >> 1, 1, E); s.p(bx + 6 + (f * 4), by + 11, E); break;
    case 'stalks': s.line(cx - 4, by + 2, cx - 6, by - 6, dk, 1); s.line(cx + 4, by + 2, cx + 6, by - 6, dk, 1); s.circ(cx - 6, by - 7, 2, E); s.circ(cx + 6, by - 7, 2, E); break;
    case 'lens': s.circ(cx, mid, 6, '#1a1b20'); s.circ(cx, mid, 4, E); s.circ(cx, mid, 1, '#ffffff'); break;
    case 'tv': s.r(bx - 4, by - 16, bw + 8, 16, '#2a2c38'); s.r(bx - 2, by - 14, bw + 4, 12, '#061018'); s.r(cx - 1, by - 20, 1, 4, metal); s.r(cx + 3, by - 22, 1, 6, metal); break;
    default: break;
  }
  // передние детали
  if (ext.includes('bucket')) { s.line(bx + bw, mid, w - 6, by - 6 + f * 3, '#a8741a', 3); s.r(w - 12, by - 6 + f * 3, 11, 9, '#6a6e78'); for (let x = w - 12; x < w - 1; x += 3) s.p(x, by + 3 + f * 3, '#c8ccd4'); }
  if (ext.includes('hoses')) { s.line(bx, mid, 2, by + 2 + f * 2, '#2e5a2e', 3); s.line(bx + bw, mid, w - 2, by + 2 - f * 2, '#2e5a2e', 3); s.circ(2, by + 2 + f * 2, 2, '#d8ff3a'); s.circ(w - 3, by + 2 - f * 2, 2, '#d8ff3a'); }
  if (ext.includes('tank')) { s.r(cx - 5, by - 6, 10, 7, '#3a6aa0'); s.r(cx - 4, by - 4 + f, 8, 4, '#d8ff3a'); }
  if (ext.includes('reel')) { s.r(0, by + bh - 8, bx + 2, 8, '#8a2418'); for (let x = 1; x < bx; x += 3) s.r(x, by + bh - 9 - ((x + f) % 2) * 2, 1, 10, '#ffd93a'); }
  if (ext.includes('shears')) { const o = f ? 4 : 0; s.line(bx + bw, mid, w - 2, by - 2 + o, '#c8ccd4', 2); s.line(bx + bw, mid + 2, w - 2, by + 10 - o, '#c8ccd4', 2); s.r(bx + bw - 2, mid - 1, 4, 4, '#ff3a3a'); }
  if (ext.includes('leaves')) { s.circ(bx + 2, by, 3, '#5aa845'); s.circ(bx + bw - 3, by - 1, 3, '#4a9a3a'); }
  if (ext.includes('pointer')) { s.line(bx + bw, mid, w - 2, by - 8 + f * 6, '#c08a5a', 2); s.p(w - 2, by - 8 + f * 6, '#ff3a3a'); }
  if (ext.includes('bun')) { s.r(cx - 4, by - 4, 8, 4, '#463a60'); }
  if (ext.includes('dial')) { s.circ(cx, mid + 6, 5, '#c8ccd4'); s.circ(cx, mid + 6, 3, '#8a929e'); s.line(cx, mid + 6, cx + (f ? 3 : -3), mid + 3, '#1a1b20'); }
  if (ext.includes('arms')) { s.line(bx, mid, 2, mid + 8 + f * 2, metal, 3); s.line(bx + bw, mid, w - 2, mid + 8 - f * 2, metal, 3); }
  if (ext.includes('scalpels')) for (let k = 0; k < 4; k++) { const a = -0.6 + k * 0.4 + (f ? 0.15 : 0); const sd = k < 2 ? -1 : 1; s.line(cx + sd * 8, mid, cx + sd * (20 + k % 2 * 4), mid - 10 + k * 5, metal2, 1); s.p(cx + sd * (21 + k % 2 * 4), mid - 10 + k * 5 + Math.round(a), '#ffffff'); }
  if (ext.includes('cross')) { s.r(cx - 1, mid + 4, 3, 7, '#ff3a3a'); s.r(cx - 3, mid + 6, 7, 3, '#ff3a3a'); }
  if (ext.includes('pincers')) for (const sd of [-1, 1]) { const x = sd < 0 ? 1 : w - 12; s.r(x, by - 4 + f * 2, 11, 8, c); s.r(x + (sd < 0 ? 0 : 6), by - 6 + f * 2, 5, 3, dk); s.line(sd < 0 ? x + 10 : x, by, sd < 0 ? bx : bx + bw, mid, c, 3); }
  if (ext.includes('drill')) { for (let k = 0; k < 6; k++) s.r(bx + bw + k * 2, mid - 6 + k, 2, 12 - k * 2, k % 2 === f ? '#c8ccd4' : '#8a929e'); s.r(w - 3, mid - 1, 3, 2, '#c8ccd4'); }
  if (ext.includes('gloves')) for (const x of [bx - 6, bx + bw]) { s.r(x, mid - 2 + (f ? -2 : 0), 6, 8, '#f5f5f5'); s.r(x, mid - 2 + (f ? -2 : 0), 6, 2, '#ff8a3a'); }
  if (ext.includes('number')) { s.r(cx - 3, mid, 2, 6, '#ffffff'); s.r(cx + 1, mid, 2, 6, '#ffffff'); }
  if (ext.includes('tie')) { s.r(cx - 1, by + 2, 3, 10, '#c83a3a'); }
  if (ext.includes('bigarm')) { s.line(cx, by + 4, cx - 10, 14, '#c08a1a', 5); s.line(cx - 10, 14, cx + 14, 6 + f * 4, '#e8b02a', 4); s.r(cx + 12, 2 + f * 4, 10, 10, '#5a606c'); s.r(cx + 20, 2 + f * 4, 6, 3, '#8a929e'); s.r(cx + 20, 9 + f * 4, 6, 3, '#8a929e'); s.circ(cx - 10, 14, 3, '#3a3f4a'); }
  if (ext.includes('zap') && f) { s.line(bx + 4, 0, cx, by - 2, '#bff6ff'); s.line(bx + bw - 6, 0, cx, by - 2, '#bff6ff'); }
  if (ext.includes('bay')) { s.r(cx - 8, by + bh - 4, 16, 4, '#1a1b20'); s.r(cx - 6 + f * 4, by + bh - 3, 4, 2, '#ff3a3a'); }
  if (ext.includes('handle')) { s.r(bx + bw - 6, by + 18, 3, 14, '#a8b8c8'); s.r(bx + 2, by + 16, bw - 4, 1, '#a8b8c8'); }
  if (ext.includes('ice')) for (let k = 0; k < 5; k++) s.p(bx + 4 + k * 5, by + bh - 4 - ((k + f) % 3), '#bff6ff');
}
