'use strict';
/*
 * Мир: 25 отдельных локаций на сетке, связанных переходами по краям карты.
 * Каждая карта генерируется детерминированно из своего описания (сид = номер локации),
 * поэтому в сохранении хранятся только флаги и позиция игрока.
 */
const TS = 16;
let MW = 80, MH = 60;   // размер текущей карты (в тайлах)

const BIOMES = {
  junk: { tiles: [TILE.RUST, TILE.DIRT, 0.7], props: [['scrap', 0.05], ['car', 0.014], ['barrel', 0.01], ['crate', 0.008], ['rock', 0.006], ['gravel', 0.03]], border: 'scrap', tint: 'rgba(110,50,20,0.08)', music: 'calm' },
  grave: { tiles: [TILE.RUST, TILE.METAL, 0.6], props: [['scrap', 0.07], ['car', 0.03], ['barrel', 0.012], ['deadtree', 0.01], ['gravel', 0.03]], border: 'scrap', tint: 'rgba(40,30,60,0.22)', music: 'boss2' },
  waste: { tiles: [TILE.SAND, TILE.DIRT, 0.66], props: [['deadtree', 0.016], ['rock', 0.02], ['car', 0.008], ['scrap', 0.006], ['gravel', 0.03]], border: 'rock', tint: 'rgba(120,80,20,0.06)', music: 'calm' },
  canyon: { tiles: [TILE.DIRT, TILE.SAND, 0.6], props: [['rock', 0.07], ['deadtree', 0.01], ['gravel', 0.04]], border: 'rock', tint: 'rgba(140,60,20,0.1)', music: 'calm' },
  salt: { tiles: [TILE.SAND, TILE.LAB, 0.6], props: [['rock', 0.012], ['deadtree', 0.006], ['scrap', 0.004]], border: 'rock', tint: 'rgba(220,230,255,0.06)', music: 'calm', lakes: 9 },
  forest: { tiles: [TILE.FGRASS, TILE.GRASS, 0.68], props: [['tree', 0.12], ['pine', 0.06], ['bush', 0.04], ['rock', 0.01], ['flowers', 0.03]], border: 'tree', tint: 'rgba(20,60,30,0.1)', music: 'calm', lakes: 2 },
  village: { tiles: [TILE.GRASS, TILE.DIRT, 0.72], props: [['tree', 0.03], ['bush', 0.02], ['flowers', 0.03], ['ruin', 0.006], ['car', 0.004]], border: 'tree', tint: null, music: 'calm', houses: 9 },
  swamp: { tiles: [TILE.FGRASS, TILE.DIRT, 0.62], props: [['deadtree', 0.04], ['bush', 0.03], ['pine', 0.01], ['scrap', 0.006]], border: 'pine', tint: 'rgba(40,70,30,0.18)', music: 'calm', lakes: 16 },
  ruins: { tiles: [TILE.WALK, TILE.DIRT, 0.6], props: [['ruin', 0.02], ['building', 0.012], ['car', 0.012], ['tree', 0.02], ['bush', 0.015], ['scrap', 0.008]], border: 'ruin', tint: 'rgba(110,60,30,0.1)', music: 'city' },
  city: { tiles: [TILE.WALK, TILE.WALK, 1], props: [['lamp', 0.004], ['crate', 0.002]], border: 'wall', tint: 'rgba(30,60,120,0.08)', music: 'city', grid: 1 },
  port: { tiles: [TILE.ASPHALT, TILE.WALK, 0.6], props: [['crate', 0.02], ['tank', 0.006], ['barrel', 0.01], ['lamp', 0.004]], border: 'wall', tint: 'rgba(20,50,90,0.1)', music: 'city', river: 1 },
  field: { tiles: [TILE.GRASS, TILE.FGRASS, 0.7], props: [['lamp', 0.004], ['bush', 0.006]], border: 'wall', tint: null, music: 'city', stadium: 1 },
  air: { tiles: [TILE.ASPHALT, TILE.ASPHALT, 1], props: [['crate', 0.004], ['tank', 0.003], ['lamp', 0.003], ['car', 0.004]], border: 'wall', tint: 'rgba(40,40,70,0.08)', music: 'city', runway: 1 },
  tech: { tiles: [TILE.METAL, TILE.TECH, 0.7], props: [['pipe', 0.02], ['tank', 0.01], ['crate', 0.012], ['barrel', 0.008], ['pillar', 0.004]], border: 'wall', tint: 'rgba(120,90,20,0.06)', music: 'city' },
  metro: { tiles: [TILE.TECH, TILE.ASPHALT, 0.6], props: [['pillar', 0.02], ['crate', 0.006], ['scrap', 0.006], ['lamp', 0.004]], border: 'wall', tint: 'rgba(0,10,30,0.32)', music: 'boss2', rails: 1 },
  dam: { tiles: [TILE.METAL, TILE.TECH, 0.7], props: [['pipe', 0.02], ['tank', 0.008], ['lamp', 0.004]], border: 'wall', tint: 'rgba(20,60,110,0.1)', music: 'city', river: 1 },
  ice: { tiles: [TILE.LAB, TILE.METAL, 0.7], props: [['crate', 0.02], ['tank', 0.012], ['pillar', 0.008]], border: 'wall', tint: 'rgba(120,190,255,0.16)', music: 'boss2' },
  hill: { tiles: [TILE.DIRT, TILE.GRASS, 0.6], props: [['rock', 0.04], ['deadtree', 0.01], ['pine', 0.02], ['gravel', 0.02]], border: 'rock', tint: 'rgba(30,20,70,0.2)', music: 'calm' },
  lab: { tiles: [TILE.LAB, TILE.WALK, 0.7], props: [['bed', 0.012], ['crate', 0.008], ['terminal0', 0.004], ['pillar', 0.004]], border: 'wall', tint: 'rgba(200,255,220,0.06)', music: 'boss2' },
  lair: { tiles: [TILE.TECH, TILE.TECH, 1], props: [['pillar', 0.012]], border: 'cwall', tint: 'rgba(60,20,110,0.22)', music: 'final' },
};

/*
 * Локации. gx/gy — место на карте мира, направление перехода считается по сетке.
 * enemies — кто водится, lvl — уровни врагов, boss — тип босса в арене.
 */
const LOCS = [
  { id: 'svalka', name: 'Свалка', gx: 1, gy: 3, biome: 'junk', w: 92, h: 68, lvl: [1, 2], n: 20, enemies: ['drone', 'cleaner', 'scrap'], boss: 'vacuum', house: 1 },
  { id: 'pustosh', name: 'Пустошь', gx: 2, gy: 3, biome: 'waste', w: 96, h: 70, lvl: [2, 4], n: 26, enemies: ['dog', 'drone', 'bomber'], boss: 'strider', shop: 1 },
  { id: 'rzhavy', name: 'Ржавый город', gx: 2, gy: 2, biome: 'ruins', w: 96, h: 76, lvl: [4, 6], n: 28, enemies: ['half', 'scrap', 'dog', 'half'], boss: 'frank', wall: 's' },
  { id: 'metro', name: 'Метро «Окраина»', gx: 2, gy: 1, biome: 'metro', w: 84, h: 56, lvl: [6, 7], n: 24, enemies: ['dog', 'half', 'drone', 'bomber'], boss: 'train' },
  { id: 'stalnoy', name: 'Стальной город', gx: 3, gy: 1, biome: 'city', w: 100, h: 76, lvl: [8, 10], n: 30, enemies: ['guard', 'eyebot', 'guard', 'turret'], boss: 'alisa', archive: 1 },
  { id: 'logovo', name: 'Логово Хроноса', gx: 7, gy: 1, biome: 'lair', w: 64, h: 56, lvl: [17, 18], n: 10, enemies: ['guard', 'eyebot', 'bomber'], boss: 'chronos' },

  { id: 'kladb', name: 'Кладбище машин', gx: 1, gy: 4, biome: 'grave', w: 74, h: 56, lvl: [3, 4], n: 22, enemies: ['scrap', 'cleaner', 'turret'], boss: 'digger' },
  { id: 'boloto', name: 'Ржавое болото', gx: 0, gy: 3, biome: 'swamp', w: 74, h: 58, lvl: [3, 4], n: 22, enemies: ['hornet', 'dog', 'bomber'], boss: 'pump' },
  { id: 'poselok', name: 'Посёлок «Рассвет»', gx: 0, gy: 2, biome: 'village', w: 74, h: 58, lvl: [4, 5], n: 18, enemies: ['half', 'drone', 'dog'], boss: 'combine' },
  { id: 'les', name: 'Заросший лес', gx: 0, gy: 1, biome: 'forest', w: 76, h: 60, lvl: [5, 6], n: 24, enemies: ['hornet', 'dog', 'drone'], boss: 'gardener' },
  { id: 'shkola', name: 'Школа №7', gx: 1, gy: 1, biome: 'ruins', w: 70, h: 54, lvl: [6, 7], n: 20, enemies: ['drone', 'half', 'eyebot'], boss: 'teacher' },
  { id: 'rynok', name: 'Чёрный рынок', gx: 1, gy: 2, biome: 'ruins', w: 70, h: 54, lvl: [5, 6], n: 18, enemies: ['half', 'guard', 'scrap'], boss: 'collector', shop: 1 },
  { id: 'bolnica', name: 'Больница №1', gx: 3, gy: 2, biome: 'lab', w: 72, h: 56, lvl: [7, 8], n: 22, enemies: ['half', 'cleaner', 'eyebot'], boss: 'surgeon' },
  { id: 'ozera', name: 'Солёные озёра', gx: 3, gy: 3, biome: 'salt', w: 76, h: 58, lvl: [4, 5], n: 20, enemies: ['dog', 'hornet', 'bomber'], boss: 'crab' },
  { id: 'kanyon', name: 'Каньон Ветров', gx: 2, gy: 4, biome: 'canyon', w: 74, h: 58, lvl: [4, 5], n: 22, enemies: ['dog', 'scrap', 'bomber'], boss: 'drill' },
  { id: 'observ', name: 'Обсерватория', gx: 3, gy: 4, biome: 'hill', w: 72, h: 56, lvl: [7, 8], n: 20, enemies: ['eyebot', 'turret', 'hornet'], boss: 'telescope' },
  { id: 'stadion', name: 'Стадион «Металлург»', gx: 2, gy: 0, biome: 'field', w: 76, h: 58, lvl: [8, 9], n: 22, enemies: ['guard', 'dog', 'drone'], boss: 'keeper' },
  { id: 'tele', name: 'Телецентр', gx: 3, gy: 0, biome: 'tech', w: 72, h: 56, lvl: [9, 10], n: 24, enemies: ['eyebot', 'guard', 'turret'], boss: 'tvhead' },
  { id: 'zavod', name: 'Завод «Прогресс»', gx: 4, gy: 1, biome: 'tech', w: 80, h: 60, lvl: [9, 11], n: 26, enemies: ['scrap', 'guard', 'turret', 'bomber'], boss: 'assembler' },
  { id: 'podst', name: 'Подстанция «Искра»', gx: 4, gy: 0, biome: 'tech', w: 72, h: 56, lvl: [11, 12], n: 24, enemies: ['guard', 'turret', 'eyebot'], boss: 'transformer', node: 1 },
  { id: 'port', name: 'Речной порт', gx: 4, gy: 2, biome: 'port', w: 80, h: 60, lvl: [10, 11], n: 24, enemies: ['guard', 'dog', 'bomber'], boss: 'crane' },
  { id: 'ges', name: 'ГЭС «Плотина»', gx: 5, gy: 2, biome: 'dam', w: 76, h: 60, lvl: [12, 13], n: 24, enemies: ['guard', 'turret', 'eyebot', 'bomber'], boss: 'turbine', node: 1 },
  { id: 'aero', name: 'Аэропорт', gx: 5, gy: 1, biome: 'air', w: 84, h: 60, lvl: [12, 13], n: 26, enemies: ['drone', 'guard', 'eyebot', 'hornet'], boss: 'mother' },
  { id: 'krio', name: 'Криохранилище', gx: 5, gy: 0, biome: 'ice', w: 72, h: 56, lvl: [13, 14], n: 24, enemies: ['guard', 'eyebot', 'turret'], boss: 'fridge', node: 1 },
  { id: 'data', name: 'Дата-центр', gx: 6, gy: 1, biome: 'tech', w: 76, h: 56, lvl: [15, 16], n: 26, enemies: ['guard', 'eyebot', 'turret', 'bomber'], boss: 'sentinel' },
];
const LOC_BY = {};
LOCS.forEach((l, i) => { l.idx = i; LOC_BY[l.id] = l; });
const LINKS = [
  ['les', 'poselok'], ['les', 'shkola'], ['poselok', 'boloto'], ['poselok', 'rynok'], ['boloto', 'svalka'],
  ['shkola', 'rynok'], ['shkola', 'metro'], ['rynok', 'rzhavy'], ['svalka', 'pustosh'], ['svalka', 'kladb'],
  ['pustosh', 'rzhavy'], ['pustosh', 'ozera'], ['pustosh', 'kanyon'], ['kanyon', 'observ'], ['ozera', 'observ'],
  ['rzhavy', 'metro'], ['rzhavy', 'bolnica'], ['metro', 'stadion'], ['metro', 'stalnoy'], ['stalnoy', 'tele'],
  ['stalnoy', 'zavod'], ['stadion', 'tele'], ['tele', 'podst'], ['zavod', 'podst'], ['zavod', 'port'],
  ['zavod', 'aero'], ['port', 'ges'], ['aero', 'krio'], ['aero', 'data'], ['aero', 'ges'], ['data', 'logovo'],
];
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
for (const l of LOCS) l.exits = {};
for (const [a, b] of LINKS) {
  const A = LOC_BY[a], B = LOC_BY[b];
  const d = B.gx > A.gx ? 'e' : B.gx < A.gx ? 'w' : B.gy > A.gy ? 's' : 'n';
  A.exits[d] = b; B.exits[OPP[d]] = a;
}
// следующий шаг маршрута из локации from в to (поиск в ширину по переходам)
function routeStep(from, to) {
  if (from === to) return null;
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const c = q.shift();
    if (c === to) break;
    for (const [d, n] of Object.entries(LOC_BY[c].exits)) if (!(n in prev)) { prev[n] = [c, d]; q.push(n); }
  }
  if (!(to in prev)) return null;
  let cur = to;
  while (prev[cur] && prev[cur][0] !== from) cur = prev[cur][0];
  return prev[cur] ? prev[cur][1] : null;
}

const PDEF = {
  tree: [1, 1], pine: [1, 1], deadtree: [1, 1], bush: [1, 1], rock: [1, 1], ruin: [3, 2], lab: [4, 2],
  building: [3, 3], archive: [4, 3], car: [2, 1], scrap: [2, 1], lamp: [1, 1], crate: [1, 1], barrel: [1, 1],
  pipe: [2, 1], tank: [2, 2], pillar: [1, 1], shack: [3, 2], reactor: [3, 2], terminal0: [1, 1],
  bed: [1, 1, 'flat'], flowers: [1, 1, 'flat'], gravel: [1, 1, 'flat'], throne: [4, 2, 'flat'],
};

function vnoise(seed) {
  const h = (x, y) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const s = (t) => t * t * (3 - 2 * t);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    const u = s(xf), v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

const MM_COLORS = {
  [TILE.GRASS]: '#5fae44', [TILE.FGRASS]: '#46923f', [TILE.DIRT]: '#c9a46a', [TILE.ASPHALT]: '#4c5262', [TILE.LINE]: '#4c5262',
  [TILE.WALK]: '#9aa3b0', [TILE.WATER]: '#3f86d6', [TILE.RUST]: '#a8704a', [TILE.METAL]: '#6b7480', [TILE.TECH]: '#2a2c48',
  [TILE.LAB]: '#d7dce3', [TILE.WALL]: '#303642', [TILE.CWALL]: '#4a3a7a', [TILE.SAND]: '#d4bc86',
};
const MM_PROPS = { tree: '#2e6a30', pine: '#2a5e34', building: '#3a4050', archive: '#f0ede0', lab: '#7f868f', ruin: '#8a6a5a', scrap: '#7a604a', car: '#6a5a5a', shack: '#9a6a44', tank: '#9aa3ae', pipe: '#8a929e', pillar: '#6d4bc2', reactor: '#ffb43a', rock: '#8a7a6a' };

/* ---------- Генерация одной карты ---------- */
function buildMap(def) {
  const W = def.w, H = def.h, N = W * H;
  const B = BIOMES[def.biome];
  const tiles = new Uint8Array(N), solid = new Uint8Array(N), reserved = new Uint8Array(N), occ = new Uint8Array(N), variant = new Uint8Array(N);
  const props = [];
  const R = rng(1987 + def.idx * 101);
  const nz = vnoise(11 + def.idx), nz2 = vnoise(29 + def.idx * 3);
  const I = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const setT = (x, y, t) => { if (inb(x, y)) tiles[I(x, y)] = t; };
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t); };
  const reserve = (cx, cy, rad) => {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      if (inb(x, y) && (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad + 0.5) reserved[I(x, y)] = 1;
    }
  };
  const [tA, tB, th] = B.tiles;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    tiles[I(x, y)] = nz2(x * 0.12, y * 0.12) > th ? tB : tA;
    variant[I(x, y)] = (R() * 4) | 0;
  }
  const wallT = B.border === 'cwall' ? TILE.CWALL : TILE.WALL;
  const hardBorder = B.border === 'wall' || B.border === 'cwall';

  // --- ключевые точки ---
  const cx = (W / 2) | 0, cy = (H / 2) | 0;
  const exits = def.exits;
  const entry = {}, zones = [];
  for (const [d, to] of Object.entries(exits)) {
    const ex = d === 'e' ? W - 1 : d === 'w' ? 0 : cx, ey = d === 's' ? H - 1 : d === 'n' ? 0 : cy;
    const vert = d === 'e' || d === 'w';
    zones.push({ dir: d, to, x0: vert ? ex : ex - 2, y0: vert ? ey - 2 : ey, x1: vert ? ex : ex + 1, y1: vert ? ey + 1 : ey });
    entry[d] = [d === 'e' ? W - 4 : d === 'w' ? 3 : cx, d === 's' ? H - 4 : d === 'n' ? 3 : cy];
  }
  // центр — маяк и жители, арена босса — в дальнем от входов углу
  const hub = [cx + ((R() * 8) | 0) - 4, cy + ((R() * 6) | 0) - 3];
  const corners = [[W * 0.22, H * 0.24], [W * 0.78, H * 0.24], [W * 0.22, H * 0.76], [W * 0.78, H * 0.76]];
  const ent = Object.values(entry);
  let arena = corners[0], best = -1;
  for (const c of corners) {
    const dmin = Math.min(...(ent.length ? ent.map((e) => Math.hypot(e[0] - c[0], e[1] - c[1])) : [99])) + R() * 6;
    if (dmin > best) { best = dmin; arena = c; }
  }
  arena = [Math.round(arena[0]), Math.round(arena[1])];
  const far = (n, minD, avoid) => {
    const out = [];
    for (let k = 0; k < 4000 && out.length < n; k++) {
      const x = 5 + ((R() * (W - 10)) | 0), y = 5 + ((R() * (H - 10)) | 0);
      if (Math.hypot(x - arena[0], y - arena[1]) < 12 || Math.hypot(x - hub[0], y - hub[1]) < 7) continue;
      if (ent.some((e) => Math.hypot(e[0] - x, e[1] - y) < 6)) continue;
      if ([...out, ...(avoid || [])].some((p) => Math.hypot(p[0] - x, p[1] - y) < minD)) continue;
      out.push([x, y]);
    }
    return out;
  };
  const chests = far(4, 12);
  const items = far(6, 9, chests);
  const terms = far(3, 14, [...chests, ...items]);
  const hide = far(4, 10, [...chests, ...items, ...terms]);
  const mons = far(3, 18, [...chests, ...items, ...terms, ...hide]);
  const npcs = [[hub[0] + 3, hub[1] + 1], [hub[0] - 4, hub[1] + 2], [hub[0] + 1, hub[1] + 4], [hub[0] - 2, hub[1] - 3]];
  const house = def.house ? [hub[0] - 10, hub[1] - 6] : null;

  // --- особенности биома ---
  if (B.lakes) {
    for (let k = 0; k < B.lakes; k++) {
      const lx = 6 + R() * (W - 12), ly = 6 + R() * (H - 12), rr = 2.5 + R() * (B.lakes > 8 ? 3 : 5);
      for (let y = Math.floor(ly - rr - 2); y <= ly + rr + 2; y++) for (let x = Math.floor(lx - rr * 1.4 - 2); x <= lx + rr * 1.4 + 2; x++) {
        if (!inb(x, y)) continue;
        if (Math.hypot((x - lx) / 1.4, y - ly) + (nz(x * 0.3, y * 0.3) - 0.5) * 3 < rr) tiles[I(x, y)] = TILE.WATER;
      }
    }
  }
  if (B.river) {
    const ry = Math.round(H * 0.62);
    for (let x = 0; x < W; x++) { const o = Math.round((nz(x * 0.08, 3) - 0.5) * 4); fill(x, ry + o, x, ry + o + 4, TILE.WATER); }
  }
  if (B.rails) for (const ry of [Math.round(H * 0.35), Math.round(H * 0.68)]) { fill(1, ry, W - 2, ry + 2, TILE.ASPHALT); for (let x = 1; x < W - 1; x += 2) { setT(x, ry, TILE.LINE); setT(x, ry + 2, TILE.LINE); } }
  if (B.runway) { const ry = Math.round(H * 0.3); fill(1, ry, W - 2, ry + 5, TILE.ASPHALT); for (let x = 3; x < W - 3; x += 4) { setT(x, ry + 2, TILE.LINE); setT(x + 1, ry + 2, TILE.LINE); } }
  if (B.stadium) {
    fill(cx - 22, cy - 13, cx + 22, cy + 13, TILE.WALK); fill(cx - 19, cy - 10, cx + 19, cy + 10, TILE.GRASS);
    for (let y = cy - 10; y <= cy + 10; y++) setT(cx, y, TILE.LAB);
    for (let x = cx - 19; x <= cx + 19; x++) { setT(x, cy - 10, TILE.LAB); setT(x, cy + 10, TILE.LAB); }
  }
  if (def.biome === 'lair') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) variant[I(x, y)] = ((x * 7 + y * 3) % 9 === 0) ? 1 : ((x + y) % 11 === 0 ? 2 : 0);
  }

  // --- дороги ---
  const roadT = { city: TILE.ASPHALT, port: TILE.ASPHALT, air: TILE.ASPHALT, tech: TILE.TECH, metro: TILE.TECH, dam: TILE.TECH, ice: TILE.METAL, lab: TILE.WALK, lair: TILE.METAL, field: TILE.WALK, ruins: TILE.ASPHALT }[def.biome] || TILE.DIRT;
  const carve = (pts, w, t, wob = 1.2) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const len = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      for (let k = 0; k <= len; k++) {
        const f = k / len;
        let x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
        const o = (nz(x * 0.15, y * 0.15) - 0.5) * wob * 2;
        if (Math.abs(y1 - y0) > Math.abs(x1 - x0)) x += o; else y += o;
        for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) {
          const tx = Math.round(x + dx), ty = Math.round(y + dy);
          if (!inb(tx, ty)) continue;
          if (dx * dx + dy * dy <= w * w + 0.5) { if (t !== null && tiles[I(tx, ty)] !== TILE.WATER) tiles[I(tx, ty)] = t; if (tiles[I(tx, ty)] === TILE.WATER) tiles[I(tx, ty)] = TILE.METAL; reserved[I(tx, ty)] = 1; }
        }
      }
    }
  };
  for (const [d, e] of Object.entries(entry)) {
    const edge = d === 'e' ? [W - 1, e[1]] : d === 'w' ? [0, e[1]] : d === 'n' ? [e[0], 0] : [e[0], H - 1];
    carve([edge, e, [(e[0] + hub[0]) / 2, (e[1] + hub[1]) / 2], hub], 1, roadT);
  }
  carve([hub, [(hub[0] + arena[0]) / 2, hub[1]], arena], 1, roadT);
  for (const p of [...chests, ...items, ...terms, ...hide, ...mons]) carve([p, [(p[0] + hub[0]) / 2, (p[1] + hub[1]) / 2], hub], 0, null, 2);

  // город: сетка кварталов
  const blocks = [];
  if (B.grid) {
    for (let x = 6; x < W - 6; x += 13) fill(x, 1, x + 2, H - 2, TILE.ASPHALT);
    for (let y = 6; y < H - 6; y += 12) fill(1, y, W - 2, y + 2, TILE.ASPHALT);
    for (let x = 6; x < W - 6; x += 13) for (let y = 1; y < H - 1; y++) for (let k = 0; k < 3; k++) reserved[I(x + k, y)] = 1;
    for (let y = 6; y < H - 6; y += 12) for (let x = 1; x < W - 1; x++) for (let k = 0; k < 3; k++) reserved[I(x, y + k)] = 1;
  }

  // --- резервы ---
  reserve(hub[0], hub[1], 5); reserve(arena[0], arena[1], 10);
  for (const p of [...chests, ...items, ...terms, ...hide, ...mons]) reserve(p[0], p[1], 1.6);
  for (const e of ent) reserve(e[0], e[1], 3);
  if (house) reserve(house[0] + 2, house[1] + 1, 5);

  // внутренняя стена Ржавого города (проход охраняет Яна)
  let wallGate = null;
  if (def.wall === 's') {
    const wy = H - 12, gx = entry.s ? entry.s[0] : cx;
    for (let x = 1; x < W - 1; x++) if (Math.abs(x - gx) > 1) { setT(x, wy, TILE.WALL); variant[I(x, wy)] = x % 7 ? 0 : 9; }
    wallGate = { id: 'yana', x0: gx - 1, y0: wy, x1: gx + 1, y1: wy };
    for (let x = gx - 1; x <= gx + 1; x++) setT(x, wy, roadT);
    npcs.unshift([gx + 3, wy + 2]);
  }

  // --- предметы ---
  const canPlace = (tx, ty, fw, fh, ignoreRes) => {
    for (let y = ty; y < ty + fh; y++) for (let x = tx; x < tx + fw; x++) {
      if (!inb(x, y) || x === 0 || y === 0 || x === W - 1 || y === H - 1) return false;
      const i = I(x, y);
      if (occ[i] || TILE_SOLID[tiles[i]] || (!ignoreRes && reserved[i])) return false;
    }
    return true;
  };
  const place = (type, v, tx, ty, force) => {
    const [fw, fh, flat] = PDEF[type];
    if (!canPlace(tx, ty, fw, fh, force)) return false;
    for (let y = ty; y < ty + fh; y++) for (let x = tx; x < tx + fw; x++) {
      if (!flat) { occ[I(x, y)] = 1; solid[I(x, y)] = 1; } else occ[I(x, y)] = 2;
    }
    props.push({ type: type === 'terminal0' ? 'terminal' : type, v, tx, ty, fw, fh, flat: !!flat });
    return true;
  };
  if (house) { place('lab', 0, house[0], house[1], true); for (let i = 0; i < 3; i++) place('crate', i % 2, house[0] + 5, house[1] + i, true); }
  if (def.archive) place('archive', 0, hub[0] - 2, hub[1] - 7, true);
  if (def.shop) place('shack', 0, hub[0] + 5, hub[1] - 4, true);
  if (def.biome === 'lair') { for (let y = 4; y < H - 4; y += 6) for (const x of [6, W - 7]) place('pillar', 1, x, y, true); }
  if (B.houses) for (let k = 0; k < B.houses; k++) { const x = 4 + ((R() * (W - 10)) | 0), y = 4 + ((R() * (H - 8)) | 0); place(R() < 0.6 ? 'shack' : 'ruin', (R() * 3) | 0, x, y); }
  if (B.grid) {
    for (let bx = 9; bx < W - 6; bx += 13) for (let by = 9; by < H - 4; by += 12) {
      for (let ty = by; ty + 3 <= by + 9; ty += 4) for (let tx = bx; tx + 3 <= bx + 10; tx += 4) if (R() < 0.8) place('building', (R() * 4) | 0, tx, ty);
    }
    for (let x = 8; x < W - 4; x += 13) for (let y = 4; y < H - 3; y += 6) { place('lamp', 1, x - 1, y); place('tree', 2, x + 3, y + 1); }
  }
  if (B.stadium) for (let x = cx - 22; x <= cx + 22; x += 4) { place('lamp', 1, x, cy - 15, true); place('lamp', 1, x, cy + 15, true); }
  // природа и мусор
  const order = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) order.push(I(x, y));
  for (let i = order.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
  for (const i of order) {
    const x = i % W, y = (i / W) | 0;
    let r = R();
    for (const [type, p] of B.props) {
      if (r < p) { place(type, (R() * 4) | 0, x, y); break; }
      r -= p;
    }
  }
  // кромка карты (проёмы оставляем под переходы)
  const isOpening = (x, y) => zones.some((z) => x >= z.x0 - (z.x0 === z.x1 ? 0 : 0) && x <= z.x1 && y >= z.y0 && y <= z.y1);
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (!isOpening(x, y)) { solid[I(x, y)] = 1; if (hardBorder) setT(x, y, wallT); }
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (!isOpening(x, y)) { solid[I(x, y)] = 1; if (hardBorder) setT(x, y, wallT); }
  if (!hardBorder) {
    const bp = { scrap: ['scrap', 2], rock: ['rock', 1], tree: ['tree', 1], pine: ['pine', 1], ruin: ['scrap', 2] }[B.border] || ['rock', 1];
    for (let x = 0; x < W; x += bp[1]) for (const y of [0, H - 1]) if (!isOpening(x, y) && !isOpening(x + 1, y)) props.push({ type: bp[0], v: x % 4, tx: x, ty: y, fw: bp[1], fh: 1 });
    for (let y = 1; y < H - 1; y++) for (const x of [0, W - 1]) if (!isOpening(x, y)) props.push({ type: bp[0] === 'scrap' ? 'rock' : bp[0], v: y % 4, tx: x, ty: y, fw: 1, fh: 1 });
  }
  for (let i = 0; i < N; i++) if (TILE_SOLID[tiles[i]]) solid[i] = 1;
  for (const z of zones) for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) { solid[I(x, y)] = 0; tiles[I(x, y)] = roadT; }

  // --- точки врагов ---
  const spawns = [];
  let made = 0;
  for (let tries = 0; made < def.n && tries < 8000; tries++) {
    const x = 2 + ((R() * (W - 4)) | 0), y = 2 + ((R() * (H - 4)) | 0), i = I(x, y);
    if (solid[i] || tiles[i] === TILE.WATER) continue;
    if (Math.hypot(x - hub[0], y - hub[1]) < 11 || Math.hypot(x - arena[0], y - arena[1]) < 12) continue;
    if (ent.some((e) => Math.hypot(e[0] - x, e[1] - y) < 9)) continue;
    if (house && Math.hypot(x - house[0], y - house[1]) < 14) continue;
    if (wallGate && y > wallGate.y0) continue;
    if (spawns.some((s) => Math.hypot(s.tx - x, s.ty - y) < 4)) continue;
    let type = def.enemies[(R() * def.enemies.length) | 0];
    if (type === 'turret' && reserved[i]) type = def.enemies[0];
    const lvl = def.lvl[0] + ((R() * (def.lvl[1] - def.lvl[0] + 1)) | 0);
    spawns.push({ tx: x, ty: y, type, lvl });
    made++;
  }

  // --- мини-карта ---
  const mm = mkCanvas(W, H), mx = mm.getContext('2d');
  const img = mx.createImageData(W, H);
  for (let i = 0; i < N; i++) {
    const [r, g, b] = hexRgb(MM_COLORS[tiles[i]] || '#000000');
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  mx.putImageData(img, 0, 0);
  for (const p of props) if (MM_PROPS[p.type]) { mx.fillStyle = MM_PROPS[p.type]; mx.fillRect(p.tx, p.ty, p.fw, p.fh); }

  return {
    def, W, H, tiles, solid, variant, props, spawns, minimap: mm, zones, wallGate,
    spots: { hub, arena, chests, items, terms, hide, mons, npcs, house, entry, beacon: [hub[0] - 1, hub[1] + 3] },
  };
}
