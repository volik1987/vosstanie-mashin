'use strict';
/*
 * Мир игры: 200×150 тайлов. Генерируется детерминированно (одинаково при каждом запуске),
 * поэтому сохранение хранит только флаги прохождения и позицию игрока.
 */
const TS = 16, MW = 200, MH = 150;
const REG = { SUB: 0, FOR: 1, WAS: 2, JNK: 3, CITY: 4, STA: 5, CIT: 6 };
const REGION_INFO = [
  { name: 'Руины Пригорода', enemies: ['drone', 'cleaner'], lvl: [1, 2], n: 26, tint: null },
  { name: 'Заросший парк', enemies: ['hornet', 'dog', 'drone'], lvl: [3, 5], n: 46, tint: 'rgba(20,60,30,0.10)' },
  { name: 'Пустошь', enemies: ['dog', 'bomber', 'drone'], lvl: [3, 4], n: 30, tint: 'rgba(120,80,20,0.06)' },
  { name: 'Свалка', enemies: ['scrap', 'cleaner', 'turret', 'scrap'], lvl: [2, 4], n: 42, tint: 'rgba(110,50,20,0.08)' },
  { name: 'Новоград', enemies: ['guard', 'drone', 'guard', 'turret'], lvl: [5, 7], n: 44, tint: 'rgba(30,60,120,0.08)' },
  { name: 'Энергостанция «Заря»', enemies: ['guard', 'bomber', 'turret', 'drone'], lvl: [7, 8], n: 34, tint: 'rgba(120,90,20,0.08)' },
  { name: 'Цитадель АРХОНТа', enemies: ['guard', 'bomber', 'hornet'], lvl: [9, 10], n: 22, tint: 'rgba(60,20,110,0.22)' },
];

// Ключевые места (в тайлах)
const LOC = {
  start: [29, 72.2],
  vera: [30.6, 71.6],
  lab: [27, 68],
  labTerminal: [32, 70],
  batChest: [24, 71],
  mityai: [17, 66.5],
  rusty: [91.5, 76.5],
  shop: [95.5, 76.2],
  shack: [88, 72],
  pressArena: [60, 130],
  junkChest1: [32, 118],
  junkChest2: [97, 127],
  striderArena: [66, 15],
  pond: [50, 27],
  towers: [[126, 57], [164, 95], [138, 106]],
  archive: [148, 69],
  archiveDoor: [150, 72.6],
  sentinelArena: [162, 19],
  reactor: [161, 7],
  reactorPanel: [162.5, 10],
  throne: [192, 75],
  bossTrigger: 184,
  seeds: [[20, 30], [40, 14], [80, 30], [97, 12], [12, 44]],
  loot: [[8, 90, 'med'], [70, 96, 'scrap'], [104, 56, 'med'], [128, 106, 'scrap'], [196, 6, 'med'], [150, 140, 'scrap'], [4, 6, 'scrap']],
  beacons: [[24, 75], [86, 77], [108, 79], [140, 36], [172, 80]],
};
const GATES = [
  { id: 'west', x0: 112, y0: 74, x1: 112, y1: 77 },
  { id: 'north', x0: 142, y0: 40, x1: 145, y1: 40 },
  { id: 'east', x0: 176, y0: 74, x1: 176, y1: 77 },
];

const PDEF = {
  tree: [1, 1], pine: [1, 1], deadtree: [1, 1], bush: [1, 1], rock: [1, 1], ruin: [3, 2], lab: [4, 2],
  building: [3, 3], archive: [4, 3], car: [2, 1], scrap: [2, 1], lamp: [1, 1], crate: [1, 1], barrel: [1, 1],
  pipe: [2, 1], tank: [2, 2], pillar: [1, 1], shack: [3, 2], reactor: [3, 2],
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

function buildWorld() {
  const N = MW * MH;
  const tiles = new Uint8Array(N), solid = new Uint8Array(N), reg = new Uint8Array(N);
  const reserved = new Uint8Array(N), occ = new Uint8Array(N), variant = new Uint8Array(N);
  const props = [];
  const R = rng(1987);
  const nz = vnoise(11), nz2 = vnoise(29);
  const I = (x, y) => y * MW + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;

  // --- регионы ---
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      let r;
      if (x >= 112 && y >= 40 && y <= 110) r = x >= 177 ? REG.CIT : REG.CITY;
      else if (x >= 119 && y < 40) r = REG.STA;
      else {
        const n = nz(x * 0.07, y * 0.07) * 10 - 5;
        if (y + n < 48) r = REG.FOR;
        else if (y + n > 106) r = REG.JNK;
        else if (x + n > 77) r = REG.WAS;
        else r = REG.SUB;
      }
      reg[I(x, y)] = r;
      const n2 = nz2(x * 0.12, y * 0.12);
      let t;
      switch (r) {
        case REG.SUB: t = n2 > 0.72 ? TILE.DIRT : n2 < 0.22 ? TILE.FGRASS : TILE.GRASS; break;
        case REG.FOR: t = n2 > 0.68 ? TILE.GRASS : TILE.FGRASS; break;
        case REG.WAS: t = n2 > 0.66 ? TILE.DIRT : TILE.SAND; break;
        case REG.JNK: t = n2 > 0.7 ? TILE.DIRT : TILE.RUST; break;
        case REG.CITY: t = TILE.WALK; break;
        case REG.STA: t = n2 > 0.7 ? TILE.TECH : TILE.METAL; break;
        default: t = TILE.TECH;
      }
      tiles[I(x, y)] = t;
      variant[I(x, y)] = (R() * 4) | 0;
    }
  }
  const setT = (x, y, t) => { if (inb(x, y)) tiles[I(x, y)] = t; };
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t); };
  const reserve = (cx, cy, rad) => {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      if (inb(x, y) && (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad + 0.5) reserved[I(x, y)] = 1;
    }
  };

  // --- стены города, станции, цитадели ---
  for (let x = 112; x < MW; x++) { setT(x, 40, TILE.WALL); setT(x, 110, TILE.WALL); }
  for (let y = 40; y <= 110; y++) { setT(112, y, TILE.WALL); setT(176, y, TILE.CWALL); }
  for (let x = 177; x < MW; x++) { setT(x, 40, TILE.CWALL); setT(x, 110, TILE.CWALL); }
  for (let y = 0; y <= 40; y++) setT(118, y, TILE.WALL);
  for (let y = 0; y < 40; y++) { setT(MW - 1, y, TILE.WALL); }
  for (let x = 119; x < MW; x++) setT(x, 0, TILE.WALL);
  for (let y = 41; y < 110; y++) setT(MW - 1, y, TILE.CWALL);
  // декоративные плиты на стенах
  for (let y = 44; y < 110; y += 9) variant[I(112, y)] = 9;
  // проёмы ворот (проходимость задаёт игра)
  for (const g of GATES) for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) tiles[I(x, y)] = g.id === 'east' ? TILE.TECH : TILE.ASPHALT;

  // --- дороги, тропы ---
  const carve = (pts, w, t, wob = 1.2) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const len = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      for (let k = 0; k <= len; k++) {
        const f = k / len;
        let x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
        const o = (nz(x * 0.15, y * 0.15) - 0.5) * wob * 2;
        x += (Math.abs(y1 - y0) > Math.abs(x1 - x0)) ? o : 0;
        y += (Math.abs(y1 - y0) > Math.abs(x1 - x0)) ? 0 : o;
        for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) {
          const tx = Math.round(x + dx), ty = Math.round(y + dy);
          if (!inb(tx, ty) || TILE_SOLID[tiles[I(tx, ty)]]) continue;
          if (dx * dx + dy * dy <= w * w + 0.5) { if (t !== null) tiles[I(tx, ty)] = t; reserved[I(tx, ty)] = 1; }
        }
      }
    }
  };
  // дороги от лаборатории
  carve([[29, 72], [40, 76], [62, 77], [88, 77], [111, 76]], 1, TILE.DIRT);
  carve([[29, 74], [30, 92], [38, 107], [52, 121], [60, 129]], 1, TILE.DIRT);
  carve([[60, 129], [78, 126], [97, 128]], 1, TILE.DIRT);
  carve([[38, 107], [32, 118]], 1, TILE.DIRT);
  carve([[92, 78], [94, 104], [97, 127]], 1, TILE.DIRT);
  carve([[29, 68], [30, 52], [38, 37], [46, 29], [56, 22], [66, 16]], 1, TILE.DIRT);
  carve([[24, 72], [17, 67]], 1, TILE.DIRT, 0.4);
  // дорожки к семенам, тайникам
  const hubs = [[30, 52], [38, 37], [46, 29], [56, 22], [66, 16], [62, 77], [88, 77], [30, 92], [52, 121], [78, 126], [94, 104], [111, 76]];
  const nearestHub = (x, y) => hubs.reduce((b, h) => (Math.hypot(h[0] - x, h[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? h : b));
  for (const [sx, sy] of LOC.seeds) carve([[sx, sy], nearestHub(sx, sy)], 0, null, 2);
  for (const [lx, ly] of LOC.loot) if (lx < 112 || ly > 110) carve([[lx, ly], nearestHub(lx, ly)], 0, null, 2);
  carve([[4, 6], [20, 30]], 0, null, 2);
  carve([[150, 140], [97, 127]], 1, null, 2);
  carve([[70, 96], [62, 77]], 0, null, 2);

  // озеро в парке и пруд у деда
  for (let y = 10; y < 45; y++) for (let x = 35; x < 70; x++) {
    const d = Math.hypot((x - LOC.pond[0]) / 1.4, y - LOC.pond[1]) + (nz(x * 0.3, y * 0.3) - 0.5) * 3;
    if (d < 5 && !reserved[I(x, y)]) tiles[I(x, y)] = TILE.WATER;
  }
  for (let y = 56; y < 64; y++) for (let x = 6; x < 14; x++) {
    if (Math.hypot(x - 9.5, (y - 59.5) * 1.3) + (nz(x * 0.4, y * 0.4) - 0.5) * 2 < 3.2) tiles[I(x, y)] = TILE.WATER;
  }

  // --- город: дороги-сетка ---
  const H_ROADS = [[50, 52], [62, 64], [74, 77], [88, 90], [100, 102]];
  const V_ROADS = [[120, 122], [132, 134], [142, 145], [158, 160], [168, 170]];
  for (const [a, b] of H_ROADS) fill(113, a, 175, b, TILE.ASPHALT);
  for (const [a, b] of V_ROADS) fill(a, 41, b, 109, TILE.ASPHALT);
  for (let x = 113; x <= 175; x += 2) setT(x, 76, TILE.LINE);
  fill(113, 74, 119, 77, TILE.ASPHALT);
  for (let x = 113; x <= 175; x += 2) setT(x, 76, TILE.LINE);
  // въезды
  fill(100, 74, 111, 77, TILE.ASPHALT);
  for (const [a, b] of H_ROADS) for (let x = 113; x <= 175; x++) for (let y = a; y <= b; y++) reserved[I(x, y)] = 1;
  for (const [a, b] of V_ROADS) for (let y = 41; y <= 109; y++) for (let x = a; x <= b; x++) reserved[I(x, y)] = 1;
  for (let x = 100; x <= 111; x++) for (let y = 74; y <= 77; y++) reserved[I(x, y)] = 1;

  // --- станция ---
  carve([[143.5, 39], [143.5, 26], [155, 20], [162, 19]], 1, TILE.TECH, 0.3);
  carve([[162, 19], [162, 10]], 1, TILE.TECH, 0);
  for (let y = 9; y < 30; y++) for (let x = 150; x < 175; x++) if (Math.hypot(x - 162, y - 19) < 9) { tiles[I(x, y)] = (x + y) % 5 ? TILE.METAL : TILE.TECH; reserved[I(x, y)] = 1; }
  // --- цитадель ---
  fill(177, 74, 198, 77, TILE.TECH);
  for (let y = 41; y < 110; y++) for (let x = 177; x < 199; x++) variant[I(x, y)] = ((x * 7 + y * 3) % 9 === 0) ? 1 : ((x + y) % 11 === 0 ? 2 : 0);
  for (let y = 64; y <= 87; y++) for (let x = 184; x <= 198; x++) reserved[I(x, y)] = 1;
  for (let x = 177; x <= 198; x++) for (let y = 72; y <= 79; y++) reserved[I(x, y)] = 1;

  // --- резерв: важные точки ---
  reserve(29, 72, 5); reserve(LOC.pressArena[0], LOC.pressArena[1], 8); reserve(LOC.striderArena[0], LOC.striderArena[1], 8);
  reserve(LOC.rusty[0] - 1, LOC.rusty[1], 6); reserve(16, 65, 4); reserve(LOC.sentinelArena[0], LOC.sentinelArena[1], 9);
  for (const t of LOC.towers) reserve(t[0], t[1], 3.5);
  for (const s of LOC.seeds) reserve(s[0], s[1], 1.5);
  for (const l of LOC.loot) reserve(l[0], l[1], 1.5);
  for (const b of LOC.beacons) reserve(b[0], b[1], 1.5);
  reserve(LOC.junkChest1[0], LOC.junkChest1[1], 2); reserve(LOC.junkChest2[0], LOC.junkChest2[1], 2);
  reserve(LOC.archiveDoor[0], LOC.archiveDoor[1], 1.5);
  reserve(162, 9, 3);

  // --- предметы ---
  const canPlace = (tx, ty, fw, fh, ignoreRes) => {
    for (let y = ty; y < ty + fh; y++) for (let x = tx; x < tx + fw; x++) {
      if (!inb(x, y) || x === 0 || y === 0 || x === MW - 1 || y === MH - 1) return false;
      const i = I(x, y);
      if (occ[i] || TILE_SOLID[tiles[i]] || (!ignoreRes && reserved[i])) return false;
    }
    return true;
  };
  const place = (type, v, tx, ty, force) => {
    const [fw, fh, flat] = PDEF[type];
    if (!canPlace(tx, ty, fw, fh, force)) return false;
    for (let y = ty; y < ty + fh; y++) for (let x = tx; x < tx + fw; x++) {
      if (!flat) { occ[I(x, y)] = 1; solid[I(x, y)] = 1; }
      else occ[I(x, y)] = 2;
    }
    props.push({ type, v, tx, ty, fw, fh, flat: !!flat });
    return true;
  };

  // особые постройки
  place('lab', 0, LOC.lab[0], LOC.lab[1], true);
  place('shack', 0, LOC.shack[0], LOC.shack[1], true);
  place('archive', 0, LOC.archive[0], LOC.archive[1], true);
  place('reactor', 0, LOC.reactor[0], LOC.reactor[1], true);
  place('throne', 0, 190, 73, true);
  for (let i = 0; i < 6; i++) place('bed', i % 2, 13 + (i % 3) * 2, 63 + Math.floor(i / 3) * 2, true);

  // город: здания по кварталам
  const XB = [[113, 119], [123, 131], [135, 141], [146, 157], [161, 167], [171, 175]];
  const YB = [[41, 49], [53, 61], [65, 73], [78, 87], [91, 99], [103, 109]];
  for (const [x0, x1] of XB) for (const [y0, y1] of YB) {
    for (let ty = y0 + 1; ty + 3 <= y1; ty += 4) for (let tx = x0 + 1; tx + 3 <= x1 + 1; tx += 4) {
      if (R() < 0.85) place('building', (R() * 4) | 0, tx, ty);
    }
  }
  // липы вдоль проспекта (их сажал Ржавый)
  for (let x = 114; x < 176; x += 3) { place('tree', 2, x, 73); place('tree', 2, x, 78); }
  for (const [a, b] of H_ROADS) for (let x = 115; x < 176; x += 7) { place('lamp', 1, x, a - 1); place('lamp', 1, x + 3, b + 1); }
  // станция
  for (let y = 3; y < 39; y += 5) for (let x = 121; x < 198; x += 6) {
    const r = R();
    if (r < 0.35) place('pipe', 0, x, y); else if (r < 0.55) place('tank', 0, x + 1, y); else if (r < 0.7) place('crate', 1, x, y + 1); else if (r < 0.8) place('barrel', (R() * 3) | 0, x + 2, y + 2);
  }
  // цитадель: колоннады
  for (let x = 179; x < 197; x += 3) { place('pillar', x % 2, x, 70); place('pillar', (x + 1) % 2, x, 82); }
  for (let y = 44; y < 108; y += 4) for (let x = 179; x < 197; x += 4) if (R() < 0.5) place('pillar', 0, x, y);

  // природа
  const order = [];
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) order.push(I(x, y));
  for (let i = order.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
  for (const i of order) {
    const x = i % MW, y = (i / MW) | 0, r = R();
    switch (reg[i]) {
      case REG.SUB:
        if (r < 0.010) place('ruin', (R() * 3) | 0, x, y);
        else if (r < 0.05) place('tree', (R() * 3) | 0, x, y);
        else if (r < 0.065) place('bush', (R() * 3) | 0, x, y);
        else if (r < 0.073) place('rock', (R() * 2) | 0, x, y);
        else if (r < 0.078) place('car', (R() * 4) | 0, x, y);
        else if (r < 0.1) place('flowers', 0, x, y);
        break;
      case REG.FOR:
        if (r < 0.2) place(R() < 0.3 ? 'pine' : 'tree', (R() * 4) | 0, x, y);
        else if (r < 0.24) place('bush', (R() * 3) | 0, x, y);
        else if (r < 0.255) place('rock', 1, x, y);
        else if (r < 0.258) place('car', 3, x, y);
        else if (r < 0.29) place('flowers', 0, x, y);
        break;
      case REG.WAS:
        if (r < 0.018) place('deadtree', (R() * 2) | 0, x, y);
        else if (r < 0.04) place('rock', (R() * 3) | 0, x, y);
        else if (r < 0.05) place('car', (R() * 3) | 0, x, y);
        else if (r < 0.056) place('scrap', (R() * 4) | 0, x, y);
        else if (r < 0.08) place('gravel', 0, x, y);
        break;
      case REG.JNK:
        if (r < 0.055) place('scrap', (R() * 4) | 0, x, y);
        else if (r < 0.07) place('car', (R() * 3) | 0, x, y);
        else if (r < 0.08) place('barrel', (R() * 3) | 0, x, y);
        else if (r < 0.088) place('crate', 0, x, y);
        else if (r < 0.095) place('rock', 2, x, y);
        else if (r < 0.12) place('gravel', 0, x, y);
        break;
      default: break;
    }
  }
  // кромка мира — непроходимая
  for (let x = 0; x < MW; x++) { solid[I(x, 0)] = 1; solid[I(x, MH - 1)] = 1; }
  for (let y = 0; y < MH; y++) { solid[I(0, y)] = 1; solid[I(MW - 1, y)] = 1; }
  for (let x = 0; x < 118; x += 1) { if (R() < 0.7) props.push({ type: x % 3 ? 'tree' : 'pine', v: 3 % (x % 2 + 1), tx: x, ty: 0, fw: 1, fh: 1 }); }
  for (let y = 1; y < 112; y += 1) { if (R() < 0.7) props.push({ type: y % 3 ? 'tree' : 'pine', v: (y % 4), tx: 0, ty: y, fw: 1, fh: 1 }); }
  for (let y = 112; y < MH; y += 1) props.push({ type: 'scrap', v: y % 4, tx: 0, ty: y, fw: 2, fh: 1 });
  for (let x = 0; x < MW; x += 2) props.push({ type: x % 6 ? 'scrap' : 'car', v: x % 3, tx: x, ty: MH - 1, fw: 2, fh: 1 });
  for (let y = 111; y < MH; y += 2) props.push({ type: 'scrap', v: (y + 1) % 4, tx: MW - 2, ty: y, fw: 2, fh: 1 });

  // твёрдые тайлы
  for (let i = 0; i < N; i++) if (TILE_SOLID[tiles[i]]) solid[i] = 1;

  // --- точки появления врагов ---
  const spawns = [];
  const safe = [[29, 72, 13], [91, 76, 9], [16, 65, 6], [108, 78, 4], [140, 36, 4], [172, 80, 4]];
  for (let ri = 0; ri < REGION_INFO.length; ri++) {
    const info = REGION_INFO[ri];
    let made = 0, tries = 0;
    while (made < info.n && tries < 6000) {
      tries++;
      const x = 2 + ((R() * (MW - 4)) | 0), y = 2 + ((R() * (MH - 4)) | 0), i = I(x, y);
      if (reg[i] !== ri || solid[i]) continue;
      if (safe.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r)) continue;
      if (ri === REG.CIT && x > 183) continue;
      if (Math.hypot(x - LOC.pressArena[0], y - LOC.pressArena[1]) < 9 || Math.hypot(x - LOC.striderArena[0], y - LOC.striderArena[1]) < 9 || Math.hypot(x - LOC.sentinelArena[0], y - LOC.sentinelArena[1]) < 10) continue;
      if (spawns.some((s) => Math.hypot(s.tx - x, s.ty - y) < 5)) continue;
      let type = info.enemies[(R() * info.enemies.length) | 0];
      if (type === 'turret' && reserved[i] && ri !== REG.CITY) type = info.enemies[0];
      const lvl = info.lvl[0] + ((R() * (info.lvl[1] - info.lvl[0] + 1)) | 0);
      spawns.push({ tx: x, ty: y, type, lvl, reg: ri });
      made++;
    }
  }
  // охрана вышек и тайников со ячейками
  for (const [tx, ty] of LOC.towers) {
    spawns.push({ tx: tx - 3, ty: ty + 2, type: 'guard', lvl: 6, reg: REG.CITY });
    spawns.push({ tx: tx + 3, ty: ty + 2, type: 'guard', lvl: 6, reg: REG.CITY });
    spawns.push({ tx: tx, ty: ty - 3, type: 'turret', lvl: 6, reg: REG.CITY });
  }
  for (const [tx, ty] of [LOC.junkChest1, LOC.junkChest2]) {
    spawns.push({ tx: tx + 2, ty: ty + 1, type: 'scrap', lvl: 3, reg: REG.JNK });
    spawns.push({ tx: tx - 2, ty: ty + 2, type: 'cleaner', lvl: 3, reg: REG.JNK });
  }

  // --- мини-карта ---
  const COLORS = {
    [TILE.GRASS]: '#5fae44', [TILE.FGRASS]: '#46923f', [TILE.DIRT]: '#c9a46a', [TILE.ASPHALT]: '#4c5262', [TILE.LINE]: '#4c5262',
    [TILE.WALK]: '#9aa3b0', [TILE.WATER]: '#3f86d6', [TILE.RUST]: '#a8704a', [TILE.METAL]: '#6b7480', [TILE.TECH]: '#2a2c48',
    [TILE.LAB]: '#d7dce3', [TILE.WALL]: '#303642', [TILE.CWALL]: '#4a3a7a', [TILE.SAND]: '#d4bc86',
  };
  const PCOL = { tree: '#2e6a30', pine: '#2a5e34', building: '#3a4050', archive: '#f0ede0', lab: '#7f868f', ruin: '#8a6a5a', scrap: '#7a604a', car: '#6a5a5a', shack: '#9a6a44', tank: '#9aa3ae', pipe: '#8a929e', pillar: '#6d4bc2', reactor: '#ffb43a' };
  const mm = mkCanvas(MW, MH), mx = mm.getContext('2d');
  const img = mx.createImageData(MW, MH);
  for (let i = 0; i < N; i++) {
    const [r, g, b] = hexRgb(COLORS[tiles[i]] || '#000000');
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  mx.putImageData(img, 0, 0);
  for (const p of props) { if (PCOL[p.type]) { mx.fillStyle = PCOL[p.type]; mx.fillRect(p.tx, p.ty, p.fw, p.fh); } }

  return { tiles, solid, reg, variant, props, spawns, minimap: mm };
}
