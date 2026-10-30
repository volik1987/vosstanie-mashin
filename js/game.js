'use strict';
/* ================= Движок «Восстания машин» ================= */
const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const store = {
  get(k, d) { try { const v = localStorage.getItem('vm2_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('vm2_' + k, JSON.stringify(v)); } catch (e) { /* приватный режим */ } },
};

/* ---------- Холст: низкое внутреннее разрешение, растянутое без сглаживания ---------- */
const cv = $('game');
const ctx = cv.getContext('2d');
let GW = 320, GH = 180;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const dw = innerWidth * dpr, dh = innerHeight * dpr;
  const K = Math.max(2, Math.round(Math.min(dw, dh) / 230));
  GW = Math.ceil(dw / K); GH = Math.ceil(dh / K);
  cv.width = GW; cv.height = GH;
  cv.style.width = (GW * K / dpr) + 'px';
  cv.style.height = (GH * K / dpr) + 'px';
  ctx.imageSmoothingEnabled = false;
  $('rotate').classList.toggle('hidden', !(innerHeight > innerWidth * 1.15 && matchMedia('(pointer: coarse)').matches) || store.get('rotSeen', false));
}
addEventListener('resize', resize);

/* ---------- Графика ---------- */
const TILES = makeTiles(), EDGES = makeEdges(), PROPS = makeProps(), MON = makeMonsters(), ICON = makeIcons();
const BOSS = makeBosses();
Object.assign(MON, BOSS);
const TALL = makeTallSprites();
const SPR = {
  ...TALL,
  android: drawHuman({ robot: true, skin: '#e9eef3', headTop: '#ffffff', visor: '#5ad0ff', top: '#dfe5ec', lines: '#5ad0ff', bottom: '#b9c2cc', shoes: '#8a94a0', ear: '#c9d0d8', back: '#cfd6de' }),
  rusty: drawHuman({ robot: true, oneEye: true, skin: '#b8703f', headTop: '#c98a5a', visor: '#ffcc44', top: '#8a5530', lines: '#6e4628', bottom: '#6e4628', shoes: '#4a3020', rust: '#7a4020', antenna: true, ear: '#8a5530', back: '#9a6040' }),
  guard: drawHuman({ robot: true, skin: '#3a3f4f', headTop: '#4a5060', visor: '#ff3b3b', top: '#2b2f3c', lines: '#ff3b3b', bottom: '#22252f', shoes: '#15171d', ear: '#2b2f3c', back: '#2b2f3c' }),
};
SPR.people.forEach((s, i) => { SPR['people' + i] = s; });
SPR.half.forEach((s, i) => { SPR['half' + i] = s; });
ICON.coin = sprite(10, 10, (s) => { s.circ(5, 5, 4, '#d8b040'); s.circ(5, 5, 2, '#a88020'); s.p(3, 3, '#fff0a0'); });
ICON.book = sprite(10, 11, (s) => { s.r(1, 1, 8, 9, '#3a6aa0'); s.r(2, 2, 6, 7, '#5a8ac0'); s.r(1, 1, 1, 9, '#22406a'); s.r(3, 4, 4, 1, '#ffffff'); });
ICON.gear = sprite(11, 11, (s) => { s.circ(5, 5, 4, '#9aa4b2'); for (const [x, y] of [[5, 0], [5, 10], [0, 5], [10, 5], [1, 1], [9, 9], [1, 9], [9, 1]]) s.p(x, y, '#9aa4b2'); s.circ(5, 5, 1, '#3a3f4a'); });
ICON.key = sprite(12, 8, (s) => { s.circ(3, 4, 3, '#ffcf3a'); s.circ(3, 4, 1, '#3a3f4a'); s.r(6, 3, 6, 2, '#ffcf3a'); s.r(9, 5, 1, 2, '#ffcf3a'); s.r(11, 5, 1, 2, '#ffcf3a'); });
ICON.lens = sprite(10, 10, (s) => { s.circ(5, 5, 4, '#8a929e'); s.circ(5, 5, 3, '#7fe9ff'); s.p(4, 3, '#ffffff'); });
ICON.heart2 = sprite(9, 8, (s) => { s.r(1, 1, 3, 3, '#ff7ab0'); s.r(5, 1, 3, 3, '#ff7ab0'); s.r(1, 3, 7, 2, '#ff7ab0'); s.r(2, 5, 5, 1, '#ff7ab0'); s.r(3, 6, 3, 1, '#ff7ab0'); s.p(2, 2, '#ffe0ee'); });
const SHADOW = {};
for (const [k, rx, ry] of [['s', 5, 2], ['m', 8, 3], ['l', 14, 4], ['xl', 22, 6]]) {
  SHADOW[k] = sprite(rx * 2 + 2, ry * 2 + 2, (s) => s.ell(rx + 1, ry + 1, rx, ry, 'rgba(10,8,20,0.28)'), false);
}

/* ---------- Карты ---------- */
const MAPS = {};
let MAP = null, tiles = null, solid = null, tileVar = null, curMap = 'svalka';
function getMap(id) {
  if (!MAPS[id]) {
    const m = buildMap(LOC_BY[id]);
    for (const p of m.props) {
      const set = PROPS[p.type];
      const img = set[p.v % set.length];
      p.img = img;
      p.px = Math.round((p.tx + p.fw / 2) * TS - img.width / 2);
      p.py = p.flat ? Math.round(p.ty * TS + (p.fh * TS - img.height) / 2) : (p.ty + p.fh) * TS - img.height + 2;
      p.sy = (p.ty + p.fh) * TS;
    }
    m.baseSolid = m.solid.slice();
    MAPS[id] = m;
  }
  return MAPS[id];
}
function setMap(id) {
  curMap = id; MAP = getMap(id);
  tiles = MAP.tiles; tileVar = MAP.variant; MW = MAP.W; MH = MAP.H;
  solid = MAP.solid = MAP.baseSolid.slice();
  SPAWNS = MAP.spawns.map((s) => ({ ...s, e: null, timer: 0 }));
}
let SPAWNS = [];
const LS = (id = curMap) => (F.L[id] || (F.L[id] = { boss: 0, q: 0, n: 0, got: {}, clr: 0 }));

/* ---------- Состояние ---------- */
function freshFlags() {
  return {
    map: 'svalka', stage: 0, train: 0, L: {}, cp: 'svalka', wpn: 1, arm: 0, bonusHp: 0, skill: 0, scrap: 0, med: 2,
    yana: false, yanaMetro: false, kills: 0, spared: 0, bossKilled: 0, bossSpared: 0, chronosMet: false, chronosP2: false,
    ending: null, loop: 1, seenMaps: {}, chronoSaid: {},
  };
}
let F = freshFlags();
let P = null, K = null;
let enemies = [], npcs = [], objs = [], bullets = [], parts = [], floats = [], hazards = [], picks = [], slashes = [];
let mode = 'title';           // title | play | dialog | menu | dead | ending | cut
let time = 0, hitstop = 0, shake = 0, saveT = 0, spawnT = 0, focus = null, bossOn = null, redFlash = 0;
let trans = null;             // переход между локациями: {phase, t, to, dir}
const cam = { x: 30 * TS, y: 30 * TS };

function newPlayer() {
  return {
    x: 0, y: 0, lvl: 1, xp: 0, hp: 100, dir: 'down', face: 1, moving: false, anim: 0,
    atkT: 0, combo: 0, comboT: 0, hitSet: null, atkA: 0, skillT: 0, skillCd: 0, skillHit: null, dashT: 0, dashCd: 0, dashX: 0, dashY: 0,
    inv: 0, kx: 0, ky: 0, dead: false, deadT: 0, atBeacon: false, r: 5, slow: 0, pull: null,
  };
}
const maxHp = () => 100 + (P.lvl - 1) * 12 + F.bonusHp + F.arm * 12;
const atkPow = () => 10 + (P.lvl - 1) * 3 + (F.wpn - 1) * 7;
const xpNeed = (l) => Math.round(18 * Math.pow(l, 1.45));
const skillR = () => 34 + F.skill * 8;

/* ---------- Звук: эффекты и чиптюн-музыка на WebAudio ---------- */
const AU = { ctx: null, sfxOn: store.get('sfx', true), musOn: store.get('music', true), track: null, trackName: '', step: 0, nextT: 0, last: {} };
function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    AU.ctx = new C();
    AU.master = AU.ctx.createGain(); AU.master.gain.value = 0.55; AU.master.connect(AU.ctx.destination);
    AU.sfxG = AU.ctx.createGain(); AU.sfxG.gain.value = AU.sfxOn ? 0.7 : 0; AU.sfxG.connect(AU.master);
    AU.musG = AU.ctx.createGain(); AU.musG.gain.value = AU.musOn ? 0.2 : 0; AU.musG.connect(AU.master);
    const len = AU.ctx.sampleRate * 0.6;
    AU.nb = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
    const d = AU.nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    setInterval(musicTick, 40);
  } catch (e) { AU.ctx = null; }
}
function tone(f, dur, type, vol, f2, at, dest) {
  const c = AU.ctx; if (!c) return;
  const t = at || c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(dest || AU.sfxG); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, at) {
  const c = AU.ctx; if (!c) return;
  const t = at || c.currentTime;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = AU.nb; f.type = 'lowpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.sfxG); s.start(t); s.stop(t + dur);
}
function sfx(n) {
  if (!AU.ctx || !AU.sfxOn) return;
  const now = AU.ctx.currentTime;
  if (AU.last[n] && now - AU.last[n] < 0.04) return;
  AU.last[n] = now;
  switch (n) {
    case 'swing': noise(0.08, 0.25, 3500); tone(900, 0.06, 'square', 0.05, 2400); break;
    case 'hit': tone(220, 0.07, 'square', 0.12, 90); noise(0.05, 0.2, 2000); break;
    case 'crit': tone(880, 0.1, 'square', 0.12, 220); noise(0.08, 0.3, 4000); break;
    case 'hurt': tone(180, 0.22, 'sawtooth', 0.18, 70); break;
    case 'kill': noise(0.25, 0.35, 900); tone(140, 0.2, 'square', 0.12, 40); break;
    case 'boom': noise(0.5, 0.5, 600); tone(90, 0.45, 'sine', 0.4, 30); break;
    case 'pick': tone(1200, 0.05, 'square', 0.06, 1800); break;
    case 'dash': noise(0.15, 0.18, 1800); break;
    case 'skill': tone(200, 0.35, 'sawtooth', 0.15, 1400); noise(0.3, 0.2, 5000); break;
    case 'shoot': tone(700, 0.08, 'square', 0.05, 300); break;
    case 'zap': tone(1400, 0.07, 'triangle', 0.06, 2400); break;
    case 'blip': tone(520 + Math.random() * 80, 0.03, 'square', 0.03); break;
    case 'chest': [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'square', 0.08, null, now + i * 0.07)); break;
    case 'quest': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, null, now + i * 0.09)); break;
    case 'lvl': [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'square', 0.08, null, now + i * 0.07)); break;
    case 'gate': tone(110, 0.8, 'sawtooth', 0.15, 440); break;
    case 'beacon': tone(660, 0.3, 'sine', 0.15, 990); break;
    case 'buy': tone(990, 0.06, 'square', 0.08); tone(1320, 0.08, 'square', 0.08, null, now + 0.06); break;
    case 'warn': tone(440, 0.12, 'square', 0.06, 330); break;
    case 'heal': [660, 880].forEach((f, i) => tone(f, 0.15, 'sine', 0.12, null, now + i * 0.08)); break;
    case 'befriend': [523, 784, 659, 1046].forEach((f, i) => tone(f, 0.16, 'sine', 0.1, null, now + i * 0.08)); break;
    case 'waver': tone(300, 0.25, 'triangle', 0.08, 600); break;
    case 'whoosh': noise(0.5, 0.18, 1200); break;
    default: break;
  }
}
const TRACKS = {
  calm: { bpm: 92, bt: 'triangle', lt: 'square', lv: 0.18, bass: [45, 0, 0, 0, 52, 0, 0, 0, 48, 0, 0, 0, 43, 0, 0, 0], lead: [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 69, 67, 71, 74, 79] },
  city: { bpm: 100, bt: 'triangle', lt: 'square', lv: 0.14, bass: [40, 0, 40, 0, 43, 0, 45, 0, 40, 0, 40, 0, 38, 0, 36, 0], lead: [64, 0, 67, 0, 71, 0, 69, 67, 64, 0, 62, 0, 59, 0, 0, 0] },
  boss2: { bpm: 84, bt: 'triangle', lt: 'triangle', lv: 0.16, bass: [36, 0, 0, 36, 0, 0, 39, 0, 34, 0, 0, 34, 0, 0, 31, 0], lead: [0, 63, 0, 0, 62, 0, 0, 60, 0, 58, 0, 0, 60, 0, 0, 0] },
  boss: { bpm: 142, bt: 'sawtooth', lt: 'square', lv: 0.13, bass: [33, 33, 45, 33, 33, 45, 36, 38, 33, 33, 45, 33, 40, 38, 36, 35], lead: [69, 0, 72, 0, 74, 0, 72, 71, 69, 0, 76, 0, 74, 72, 71, 0] },
  final: { bpm: 118, bt: 'sawtooth', lt: 'triangle', lv: 0.2, bass: [38, 0, 38, 50, 0, 38, 41, 0, 36, 0, 36, 48, 0, 36, 40, 0], lead: [74, 0, 73, 0, 74, 0, 77, 0, 76, 0, 74, 0, 72, 0, 69, 0] },
  end: { bpm: 80, bt: 'triangle', lt: 'triangle', lv: 0.2, bass: [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 52, 0, 0, 0], lead: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 81, 0, 79, 0, 76, 0] },
  sad: { bpm: 70, bt: 'triangle', lt: 'triangle', lv: 0.2, bass: [45, 0, 0, 0, 41, 0, 0, 0, 43, 0, 0, 0, 40, 0, 0, 0], lead: [69, 0, 0, 68, 0, 0, 65, 0, 64, 0, 0, 0, 62, 0, 64, 0] },
};
const midiF = (n) => 440 * Math.pow(2, (n - 69) / 12);
function setTrack(name) {
  if (AU.trackName === name) return;
  AU.trackName = name; AU.track = TRACKS[name]; AU.step = 0;
  if (AU.ctx) AU.nextT = AU.ctx.currentTime + 0.1;
}
function musicTick() {
  if (!AU.ctx || !AU.track || !AU.musOn) return;
  const tr = AU.track, sd = 60 / tr.bpm / 2;
  if (AU.nextT < AU.ctx.currentTime) AU.nextT = AU.ctx.currentTime + 0.05;
  while (AU.nextT < AU.ctx.currentTime + 0.25) {
    const i = AU.step % 16;
    if (tr.bass[i]) tone(midiF(tr.bass[i]), sd * 1.9, tr.bt, 0.5, null, AU.nextT, AU.musG);
    if (tr.lead[i]) tone(midiF(tr.lead[i]), sd * 0.9, tr.lt, tr.lv, null, AU.nextT, AU.musG);
    AU.step++; AU.nextT += sd;
  }
}

/* ---------- Ввод ---------- */
const keys = {};
const inp = { mx: 0, my: 0, atk: false, atkP: false, skillP: false, dashP: false, useP: false, medP: false };
const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
addEventListener('keydown', (e) => {
  auInit();
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  const c = e.code;
  if (mode === 'cut') { if (['KeyE', 'Enter', 'Space', 'KeyJ', 'Escape'].includes(c)) { e.preventDefault(); cutNext(); } return; }
  if (mode === 'dialog') {
    if (['KeyE', 'Enter', 'Space', 'KeyJ'].includes(c)) { e.preventDefault(); advanceDialog(); }
    if (dlg && dlg.choosing && (c === 'Digit1' || c === 'Digit2' || c === 'Digit3')) chooseDialog(+c.slice(5) - 1);
    return;
  }
  if (mode === 'menu' && (c === 'Escape' || c === 'KeyP')) { closeMenus(); return; }
  if (mode !== 'play') return;
  if (c === 'KeyJ' || c === 'Space') { e.preventDefault(); inp.atkP = true; }
  if (c === 'KeyK' || c === 'ShiftLeft' || c === 'ShiftRight') inp.dashP = true;
  if (c === 'KeyL' || c === 'KeyQ') inp.skillP = true;
  if (c === 'KeyE' || c === 'Enter') inp.useP = true;
  if (c === 'KeyH' || c === 'KeyR') inp.medP = true;
  if (c === 'Escape' || c === 'KeyP') openPause();
  if (c === 'KeyM') openMap();
  if (c === 'Tab') { e.preventDefault(); openJournal(); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
cv.addEventListener('pointerdown', (e) => { auInit(); if (mode === 'cut') { cutNext(); return; } if (e.pointerType === 'mouse' && mode === 'play') inp.atkP = true; });

function readMove() {
  let x = 0, y = 0;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  if (keys.KeyW || keys.ArrowUp) y -= 1;
  if (keys.KeyS || keys.ArrowDown) y += 1;
  if (joy.id !== null) { x = joy.dx; y = joy.dy; }
  inp.mx = x; inp.my = y;
  inp.atk = !!(keys.KeyJ || keys.Space || btnHeld.atk);
}
const btnHeld = { atk: false };
function bindTouchControls() {
  const zone = $('joyZone'), base = $('joyBase'), knob = $('joyKnob');
  const R = 42;
  zone.addEventListener('pointerdown', (e) => {
    auInit();
    if (joy.id !== null || mode !== 'play') return;
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0;
    zone.setPointerCapture(e.pointerId);
    base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.classList.add('on');
    knob.style.transform = 'translate(-50%,-50%)';
    e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    joy.dx = dx / R; joy.dy = dy / R;
    if (d < 6) { joy.dx = 0; joy.dy = 0; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });
  const end = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.dx = joy.dy = 0; base.classList.remove('on'); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);

  const hold = (id, on, off) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); auInit(); el.classList.add('down'); on(); });
    const up = () => { el.classList.remove('down'); if (off) off(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  };
  hold('bAtk', () => { if (mode === 'play') inp.atkP = true; btnHeld.atk = true; }, () => { btnHeld.atk = false; });
  hold('bSkill', () => { if (mode === 'play') inp.skillP = true; });
  hold('bDash', () => { if (mode === 'play') inp.dashP = true; });
  hold('bMed', () => { if (mode === 'play') inp.medP = true; });
  hold('bUse', () => { if (mode === 'play') inp.useP = true; });
}

/* ---------- Движение и столкновения ---------- */
function blocked(x, y, hw, hh) {
  const x0 = Math.floor((x - hw) / TS), x1 = Math.floor((x + hw) / TS);
  const y0 = Math.floor((y - hh) / TS), y1 = Math.floor(y / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH || solid[ty * MW + tx]) return true;
  }
  return false;
}
function moveBox(o, dx, dy, hw, hh) {
  if (dx) {
    if (!blocked(o.x + dx, o.y, hw, hh)) o.x += dx;
    else for (const n of [2, -2, 4, -4]) { if (!blocked(o.x, o.y + n, hw, hh) && !blocked(o.x + dx, o.y + n, hw, hh)) { o.y += Math.sign(n) * Math.min(Math.abs(dx) + 0.3, 1); break; } }
  }
  if (dy) {
    if (!blocked(o.x, o.y + dy, hw, hh)) o.y += dy;
    else for (const n of [2, -2, 4, -4]) { if (!blocked(o.x + n, o.y, hw, hh) && !blocked(o.x + n, o.y + dy, hw, hh)) { o.x += Math.sign(n) * Math.min(Math.abs(dy) + 0.3, 1); break; } }
  }
}
function moveEnt(e, dx, dy) {
  if (e.d && e.d.fly) { e.x = clamp(e.x + dx, TS, (MW - 1) * TS); e.y = clamp(e.y + dy, TS * 2, (MH - 1) * TS); }
  else moveBox(e, dx, dy, Math.max(3, e.r * 0.6), Math.max(2, e.r * 0.4));
}
function faceTo(o, dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) { o.dir = 'side'; o.face = dx > 0 ? 1 : -1; }
  else o.dir = dy > 0 ? 'down' : 'up';
  if (dx) o.face = dx > 0 ? 1 : -1;
}

/* ---------- Эффекты ---------- */
function burst(x, y, n, col, spd = 50, life = 0.5, grav = 60, size = 1) {
  if (parts.length > 500) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * rnd(0.3, 1);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.3, life: life * rnd(0.6, 1.2), max: life, col, grav, size: size + (Math.random() < 0.3 ? 1 : 0) });
  }
}
function floatText(x, y, txt, col) { if (floats.length < 60) floats.push({ x, y, txt: String(txt), col, t: 0.8 }); }
function toast(t) {
  const box = $('msgs');
  const d = document.createElement('div');
  d.className = 'msg'; d.textContent = t;
  box.appendChild(d);
  setTimeout(() => d.classList.add('out'), 2600);
  setTimeout(() => d.remove(), 3200);
  while (box.children.length > 4) box.firstChild.remove();
}
function areaToast(t) {
  const el = $('area'); el.textContent = t;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
let barkTimer = 0;
function bark(who, text) {
  const el = $('bark');
  const ch = typeof who === 'string' ? CHARS[who] : who;
  el.innerHTML = '';
  const b = document.createElement('b'); b.textContent = ch.name.split(' ')[0] + ': ';
  el.appendChild(b); el.appendChild(document.createTextNode(text));
  el.classList.toggle('chronos', who === 'chronos');
  el.classList.add('show'); barkTimer = 4.5;
}

/* ---------- Сущности текущей карты ---------- */
const at = ([x, y]) => ({ x: x * TS + 8, y: y * TS + 8 });
function makeNPC(o) {
  const n = { kind: 'npc', dir: 'down', face: 1, anim: 0, moving: false, r: 5, wt: rnd(1, 4), ...o };
  n.hx = n.x; n.hy = n.y; n.tx = n.x; n.ty = n.y;
  n.tall = !!(n.spr && n.spr.down && n.spr.down[0].height >= 30);
  return n;
}
function sideNPC(id) {
  const sq = SIDE[id];
  if (!sq || sq.who.mon) return null;
  return makeNPC({ id: 'giver', name: sq.who.name, spr: SPR[sq.who.spr] || SPR.people[0], ...at(MAP.spots.npcs[1]), talk: () => sideTalk(id), wander: 6,
    marker: () => sideMarker(id) });
}
function buildEntities() {
  npcs = []; objs = []; enemies = []; bullets = []; hazards = []; picks = []; parts = []; floats = []; slashes = [];
  bossOn = null;
  const sp = MAP.spots, st = LS();
  // Катя
  const home = sp.house ? [sp.house[0] + 2, sp.house[1] + 3] : sp.hub;
  K = makeNPC({ id: 'katya', spr: SPR.katya, ...at(home), talk: katyaTalk, follower: F.stage >= 1, shootCd: 1, healCd: 15,
    marker: () => (F.stage === 0 && F.train >= 3 ? '!' : null) });
  if (K.follower || curMap !== 'svalka') { K.x = P.x - 12; K.y = P.y + 2; K.follower = true; }
  npcs.push(K);
  // жители
  if (curMap === 'pustosh') {
    npcs.push(makeNPC({ id: 'rusty', spr: SPR.rusty, ...at(sp.npcs[0]), talk: rustyTalk, wander: 8,
      marker: () => (F.stage === 2 ? '!' : F.stage === 3 && bossDone('pustosh') ? '?' : null) }));
  }
  if (LOC_BY[curMap].shop) {
    const pos = curMap === 'rynok' ? sp.npcs[2] : sp.npcs[curMap === 'pustosh' ? 2 : 1];
    npcs.push(makeNPC({ id: 'shop', mon: MON.shopbot, ...at(pos), talk: () => (SIDE[curMap] && SIDE[curMap].who.mon ? [...sideTalk(curMap), () => openShop()] : shopTalk()),
      marker: () => (SIDE[curMap] && SIDE[curMap].who.mon ? sideMarker(curMap) : null) }));
  }
  if (curMap === 'rzhavy') {
    npcs.push(makeNPC({ id: 'yana', spr: SPR.yana, ...at(sp.npcs[0]), talk: yanaTalk, wander: 3,
      marker: () => (F.stage === 4 && !F.yana ? '!' : F.stage === 6 && !F.yanaMetro ? '?' : null) }));
    const R = rng(55);
    for (let k = 0; k < 9; k++) {
      const p = randomFloor(R, 60);
      if (p) npcs.push(makeNPC({ id: 'half', spr: SPR['half' + (k % 3)], x: p[0], y: p[1], talk: () => [[{ name: 'Полуробот', face: 'half' + (k % 3) }, HALF_LINES[k % HALF_LINES.length]]], wander: 30, neutral: true }));
    }
  }
  if (curMap === 'stalnoy') {
    const R = rng(77);
    for (let k = 0; k < 12; k++) {
      const p = randomFloor(R, 40);
      if (p) npcs.push(makeNPC({ id: 'android', spr: SPR.android, x: p[0], y: p[1], talk: () => [['android', pick(ANDROID_LINES)]], wander: 40, neutral: true }));
    }
    objs.push(mkObj({ id: 'archive', ...at([sp.hub[0], sp.hub[1] - 3.6]), img: null, label: 'Архив', act: () => runDialog(archiveTalk()) }));
  }
  const giver = sideNPC(curMap);
  if (giver) npcs.push(giver);
  buildSideObjects();
  // сундуки
  sp.chests.forEach((p, i) => {
    const key = 'c' + i;
    objs.push(mkObj({ id: key, ...at(p), img: () => PROPS.chest[st.got[key] ? 1 : 0], label: 'Открыть', enabled: () => !st.got[key],
      act: () => {
        st.got[key] = true; sfx('chest');
        const lv = LOC_BY[curMap].lvl[1];
        if (i % 2) { F.med += 2; toast('Получено: 2 аптечки'); } else { const n = 20 + lv * 6; F.scrap += n; toast('Получено: ' + n + ' хлама'); }
        burst(P.x, P.y - 12, 10, '#ffd93a'); saveGame();
      } }));
  });
  // маяк
  objs.push(mkObj({ id: 'beacon', beacon: true, x: sp.beacon[0] * TS + 8, y: sp.beacon[1] * TS + 12, img: () => PROPS.beacon[st.bc ? 1 : 0], enabled: () => false }));
  // мониторы Хроноса
  sp.mons.forEach((p, i) => objs.push(mkObj({ id: 'mon' + i, monitor: true, ...at(p), img: () => MON.mon[((time * 2) | 0) % 2], enabled: () => false })));
  // босс
  const L = LOC_BY[curMap];
  if (L.boss === 'chronos') { if (F.chronosMet && !st.boss) spawnChronos(); }
  else if (L.boss && st.boss !== 'dead') {
    const e = spawnBoss(L.boss, sp.arena);
    if (st.boss === 'spared') makeCalm(e);
  }
  if (curMap === 'svalka' && F.stage === 0 && F.train < 3 && dlgDone) spawnTraining();
  applyGates();
}
let dlgDone = true;
function randomFloor(R, tries) {
  for (let k = 0; k < tries * 20; k++) {
    const x = 3 + ((R() * (MW - 6)) | 0), y = 3 + ((R() * (MH - 6)) | 0), i = y * MW + x;
    if (solid[i] || tiles[i] === TILE.WATER) continue;
    if (MAP.wallGate && y >= MAP.wallGate.y0 - 1) continue;
    return [x * TS + 8, y * TS + 12];
  }
  return null;
}
function mkObj(o) { return { kind: 'obj', r: 8, visible: () => true, enabled: () => true, ...o }; }

/* ---------- Побочные задания ---------- */
function sideProgress(id) {
  const sq = SIDE[id], st = LS(id);
  if (!sq) return 0;
  switch (sq.type) {
    case 'boss': return bossDone(id) ? 1 : 0;
    case 'clear': return Math.min(sq.n, st.clr);
    case 'find': return st.got.found ? 1 : 0;
    default: return st.n;
  }
}
function sideMarker(id) {
  const st = LS(id), sq = SIDE[id];
  if (st.q === 0) return '!';
  if (st.q === 1 && sideProgress(id) >= sq.n) return '?';
  return null;
}
function sideTalk(id) {
  const sq = SIDE[id], st = LS(id);
  const who = { name: sq.who.name, face: sq.who.face };
  if (st.q === 0) {
    return [...sq.intro.map((t) => [who, t]), { choice: [['Помогу', () => { st.q = 1; if (sq.type === 'clear') st.clr = 0; toast('Новое задание: ' + sq.t); sfx('quest'); buildSideObjects(); saveGame(); }], ['Не сейчас', null]] }];
  }
  if (st.q === 1 && sideProgress(id) >= sq.n) {
    return [...sq.done.map((t) => [who, t]), () => { st.q = 2; giveReward(sq.reward); sfx('quest'); saveGame(); }];
  }
  if (st.q === 1) return [[who, sq.wait.replace('{n}', sideProgress(id))]];
  return [[who, 'Спасибо тебе. Правда.']];
}
function giveReward(r) {
  const out = [];
  if (r.scrap) { F.scrap += r.scrap; out.push('+' + r.scrap + ' хлама'); }
  if (r.med) { F.med += r.med; out.push('+' + r.med + ' аптечки'); }
  if (r.hp) { F.bonusHp += r.hp; P.hp = maxHp(); out.push('+' + r.hp + ' к здоровью'); }
  if (r.wpn) { if (F.wpn < WEAPONS.length) { F.wpn++; out.push(WEAPONS[F.wpn - 1]); } else { F.scrap += 150; out.push('+150 хлама'); } }
  if (r.arm) { if (F.arm < ARMORS.length - 1) { F.arm++; out.push(ARMORS[F.arm]); } else { F.scrap += 150; out.push('+150 хлама'); } }
  if (r.skill) { F.skill++; out.push('Разряд усилен'); }
  toast('Награда: ' + out.join(', '));
}
function buildSideObjects() {
  objs = objs.filter((o) => !o.side);
  npcs = npcs.filter((n) => !n.side);
  const sq = SIDE[curMap], st = LS(), sp = MAP.spots;
  if (!sq) return;
  if (sq.type === 'items') {
    for (let i = 0; i < sq.n; i++) {
      objs.push(mkObj({ id: 'it' + i, side: true, ...at(sp.items[i]), img: () => ICON[sq.icon] || ICON.cell, label: 'Взять', glow: true,
        visible: () => st.q === 1 && !st.got['i' + i], enabled: () => st.q === 1 && !st.got['i' + i],
        act: () => { st.got['i' + i] = true; st.n++; sfx('pick'); toast(`${sq.item} (${st.n}/${sq.n})`); if (st.n >= sq.n) bark('katya', 'Всё собрали. Возвращаемся.'); saveGame(); } }));
    }
  }
  if (sq.type === 'terms') {
    for (let i = 0; i < sq.n; i++) {
      objs.push(mkObj({ id: 'tm' + i, side: true, ...at(sp.terms[i]), img: () => PROPS.terminal[st.got['t' + i] ? 0 : 1], label: 'Выключить',
        enabled: () => st.q === 1 && !st.got['t' + i],
        act: () => {
          st.got['t' + i] = true; st.n++; sfx('warn'); shake = 3; toast(`Выключено: ${sq.item} (${st.n}/${sq.n})`);
          const L = LOC_BY[curMap], [tx, ty] = sp.terms[i];
          for (let k = 0; k < 2; k++) { const e = makeEnemy(pick(L.enemies), L.lvl[1], (tx + (k ? 3 : -3)) * TS, (ty + 2) * TS); e.aggro = true; enemies.push(e); }
          saveGame();
        } }));
    }
  }
  if (sq.type === 'find' && !st.got.found) {
    const fi = curMap.length % 4;
    const kid = makeNPC({ id: 'lost', side: true, spr: SPR.people[fi], ...at(sp.hide[0]),
      talk: () => (st.q === 1 ? [[{ name: sq.item, face: 'people' + fi }, sq.found[0]], () => { st.got.found = true; toast(sq.item + ': найден'); sfx('quest'); npcs = npcs.filter((n) => n.id !== 'lost'); saveGame(); }]
        : [[{ name: sq.item, face: 'people' + fi }, 'Кто ты? Уходи… Я никому не верю.']]),
      marker: () => (st.q === 1 ? '?' : null) });
    npcs.push(kid);
  }
  if (sq.type === 'talk') {
    sp.hide.forEach((p, i) => {
      npcs.push(makeNPC({ id: 'hidden', side: true, spr: SPR.people[i % 4], ...at(p), wander: 2,
        talk: () => {
          const line = [[{ name: 'Выживший', face: 'people' + (i % 4) }, HIDE_LINES[i % HIDE_LINES.length]]];
          if (st.q === 1 && !st.got['h' + i]) line.push(() => { st.got['h' + i] = true; st.n++; toast(`Найдено: ${st.n}/${sq.n}`); sfx('pick'); saveGame(); });
          return line;
        },
        marker: () => (st.q === 1 && !st.got['h' + i] ? '?' : null) }));
    });
  }
}

/* ---------- Ворота между локациями ---------- */
function gateOpen(dir, map = curMap) {
  const rule = GATE_RULES[map + ':' + dir];
  return !rule || rule();
}
function applyGates() {
  solid.set(MAP.baseSolid);
  for (const z of MAP.zones) {
    if (gateOpen(z.dir)) continue;
    for (let y = z.y0 - (z.dir === 's' ? 1 : 0); y <= z.y1 + (z.dir === 'n' ? 1 : 0); y++) {
      for (let x = z.x0 - (z.dir === 'e' ? 1 : 0); x <= z.x1 + (z.dir === 'w' ? 1 : 0); x++) solid[y * MW + x] = 1;
    }
  }
  const wg = MAP.wallGate;
  if (wg && !F.yana) for (let x = wg.x0; x <= wg.x1; x++) solid[wg.y0 * MW + x] = 1;
}
function setStage(n) {
  F.stage = n;
  if (n >= 1 && K) K.follower = true;
  checkStage();
  sfx('quest');
  applyGates();
  if (F.stage < 12) setTimeout(() => toast('Задание: ' + questInfo().t), 300);
  saveGame();
}
// автопродвижение, если цель этапа уже выполнена заранее
function checkStage() {
  for (let guard = 0; guard < 12; guard++) {
    const s = F.stage;
    if (s === 1 && bossDone('svalka')) F.stage = 2;
    else if (s === 5 && bossDone('rzhavy')) F.stage = 6;
    else if (s === 6 && bossDone('metro')) F.stage = 7;
    else if (s === 7 && bossDone('stalnoy')) F.stage = 8;
    else if (s === 9 && NODES.every(bossDone)) F.stage = 10;
    else if (s === 10 && bossDone('data')) F.stage = 11;
    else break;
  }
}

/* ---------- Враги ---------- */
const EDEF = {
  drone: { hp: 18, dmg: 6, spd: 42, fly: 1, r: 6, hy: 12, spr: 'drone', ai: 'chase', sh: 's' },
  cleaner: { hp: 30, dmg: 8, spd: 32, r: 7, hy: 7, spr: 'cleaner', ai: 'melee', sh: 'm' },
  hornet: { hp: 14, dmg: 6, spd: 62, fly: 1, r: 5, hy: 12, spr: 'hornet', ai: 'chase', sh: 's' },
  dog: { hp: 30, dmg: 10, spd: 48, r: 7, hy: 6, spr: 'dog', ai: 'lunge', sh: 'm' },
  scrap: { hp: 46, dmg: 12, spd: 30, r: 8, hy: 8, spr: 'scrapbot', ai: 'melee', sh: 'm' },
  turret: { hp: 40, dmg: 8, spd: 0, r: 7, hy: 8, spr: 'turret', ai: 'turret', sh: 'm' },
  guard: { hp: 52, dmg: 10, spd: 36, r: 6, hy: 10, spr: 'guard', human: 1, ai: 'shoot', sh: 's' },
  half: { hp: 44, dmg: 11, spd: 38, r: 6, hy: 16, tall: 1, ai: 'melee', sh: 's' },
  eyebot: { hp: 24, dmg: 8, spd: 40, fly: 1, r: 6, hy: 12, spr: 'eyebot', ai: 'shoot', sh: 's', eye: 1 },
  bomber: { hp: 22, dmg: 24, spd: 44, r: 6, hy: 7, spr: 'bomber', ai: 'bomb', sh: 's' },
};
// боссы: базовые параметры и набор атак
const BDEF = {
  vacuum: { hp: 420, dmg: 13, spd: 34, r: 20, hy: 16, sh: 'xl', moves: ['spin', 'sawring', 'charge', 'summon'], adds: 'cleaner' },
  strider: { hp: 520, dmg: 14, spd: 36, r: 16, hy: 22, sh: 'xl', moves: ['volley', 'stomp', 'leap', 'summon'], adds: 'hornet' },
  frank: { hp: 560, dmg: 15, spd: 30, r: 16, hy: 26, sh: 'xl', moves: ['slam', 'triple', 'rain', 'summon'], adds: 'half' },
  train: { hp: 600, dmg: 16, spd: 0, r: 20, hy: 22, sh: 'xl', moves: ['rails', 'charge', 'volley', 'summon'], adds: 'dog', still: 1 },
  alisa: { hp: 620, dmg: 15, spd: 30, r: 18, hy: 32, sh: 'xl', moves: ['ring', 'cross', 'hands', 'summon', 'spiral'], adds: 'eyebot' },
  digger: { hp: 440, dmg: 14, spd: 30, r: 20, hy: 18, sh: 'xl', moves: ['slam', 'triple', 'charge'] },
  pump: { hp: 440, dmg: 12, spd: 24, r: 18, hy: 18, sh: 'xl', moves: ['rain', 'aimed', 'suck'] },
  combine: { hp: 480, dmg: 14, spd: 36, r: 20, hy: 18, sh: 'xl', moves: ['charge', 'rails', 'triple'] },
  gardener: { hp: 480, dmg: 14, spd: 34, r: 14, hy: 24, sh: 'l', moves: ['leap', 'cross', 'summon'], adds: 'hornet' },
  teacher: { hp: 460, dmg: 13, spd: 30, r: 14, hy: 24, sh: 'l', moves: ['aimed', 'ring', 'summon'], adds: 'drone' },
  collector: { hp: 500, dmg: 14, spd: 28, r: 18, hy: 20, sh: 'xl', moves: ['volley', 'summon', 'charge'], adds: 'guard' },
  surgeon: { hp: 520, dmg: 14, spd: 30, r: 16, hy: 26, sh: 'l', moves: ['hands', 'cross', 'aimed'], fly: 1 },
  crab: { hp: 480, dmg: 14, spd: 34, r: 20, hy: 16, sh: 'xl', moves: ['charge', 'volley', 'stomp'] },
  drill: { hp: 480, dmg: 15, spd: 30, r: 16, hy: 20, sh: 'xl', moves: ['leap', 'triple', 'rain'] },
  telescope: { hp: 520, dmg: 14, spd: 0, r: 16, hy: 26, sh: 'l', moves: ['rails', 'cross', 'spiral'], still: 1 },
  keeper: { hp: 520, dmg: 14, spd: 40, r: 14, hy: 24, sh: 'l', moves: ['aimed', 'charge', 'stomp'] },
  tvhead: { hp: 540, dmg: 14, spd: 30, r: 14, hy: 28, sh: 'l', moves: ['ring', 'spiral', 'summon'], adds: 'eyebot' },
  assembler: { hp: 560, dmg: 15, spd: 0, r: 18, hy: 24, sh: 'xl', moves: ['hands', 'slam', 'summon'], adds: 'scrap', still: 1 },
  transformer: { hp: 580, dmg: 15, spd: 0, r: 18, hy: 24, sh: 'xl', moves: ['cross', 'ring', 'rain'], still: 1 },
  crane: { hp: 560, dmg: 16, spd: 22, r: 18, hy: 26, sh: 'xl', moves: ['hands', 'rails', 'triple'] },
  turbine: { hp: 600, dmg: 15, spd: 0, r: 20, hy: 26, sh: 'xl', moves: ['spiral', 'ring', 'suck'], still: 1 },
  mother: { hp: 560, dmg: 14, spd: 34, r: 22, hy: 30, sh: 'xl', moves: ['summon', 'rain', 'aimed'], adds: 'drone', fly: 1 },
  fridge: { hp: 620, dmg: 15, spd: 20, r: 16, hy: 28, sh: 'l', moves: ['ring', 'cross', 'freeze'] },
  sentinel: { hp: 640, dmg: 16, spd: 34, r: 15, hy: 32, sh: 'l', moves: ['cross', 'ring', 'aimed', 'summon'], adds: 'drone', fly: 1 },
};
for (const [k, b] of Object.entries(BDEF)) Object.assign(b, { boss: 1, ai: 'boss', spr: k, name: BOSSES[k].name, fly: b.fly || 0 });
const PARTS = {
  chronos: { name: 'ХРОНОС', boss: 1, part: 0, hp: 1, dmg: 20, spd: 0, r: 26, hy: 40, sh: 'xl', ai: 'core', spr: 'core' },
  cmon: { name: 'ГЛАЗ', boss: 1, part: 1, hp: 1, dmg: 16, spd: 0, r: 10, hy: 14, sh: 'm', ai: 'cmon', spr: 'mon' },
  carm: { name: 'РУКА', boss: 1, part: 1, hp: 1, dmg: 20, spd: 0, r: 10, hy: 8, sh: 'm', ai: 'carm', spr: 'hand', fly: 1 },
  csock: { name: 'ПРОВОД', boss: 1, part: 1, hp: 1, dmg: 14, spd: 0, r: 8, hy: 6, sh: 's', ai: 'csock', spr: 'socket' },
};
function makeEnemy(type, lvl, x, y) {
  const d = EDEF[type] || BDEF[type] || PARTS[type];
  const hm = d.boss ? 1 + 0.45 * (lvl - 1) : 1 + 0.38 * (lvl - 1), dm = d.boss ? 1 + 0.16 * (lvl - 1) : 1 + 0.22 * (lvl - 1);
  return {
    kind: 'enemy', type, d, lvl, x, y, hx: x, hy0: y, hp: d.hp * hm, maxHp: d.hp * hm, dmg: d.dmg * dm, r: d.r, hy: d.hy,
    face: 1, dir: 'down', st: '', t: Math.random() * 5, ct: 1.5, cd: rnd(0.5, 1.5), flash: 0, kx: 0, ky: 0, stun: 0,
    aggro: false, anim: Math.random(), moving: false, wx: x, wy: y, wt: rnd(0, 3), dead: false, z: 0, touchCd: 0,
    xp: d.boss ? 60 + lvl * 30 : Math.round(3 + lvl * 2.4), once: {}, var: (Math.random() * 3) | 0,
  };
}
function eCenter(e) { return { x: e.x, y: e.y - e.hy - e.z }; }
function spawnBoss(type, [tx, ty]) {
  const L = LOC_BY[curMap];
  const e = makeEnemy(type, L.lvl[1] + 1, tx * TS + 8, ty * TS + 8);
  enemies.push(e); return e;
}
function makeCalm(e) { e.calm = true; e.aggro = false; e.invul = true; e.st = ''; }
function spawnTraining() {
  const sp = MAP.spots;
  for (let i = 0; i < 3; i++) {
    const e = makeEnemy('drone', 1, (sp.house[0] + i * 3) * TS, (sp.house[1] + 7) * TS);
    e.training = true; e.aggro = true; e.hp = e.maxHp = 14;
    enemies.push(e);
  }
  bark('katya', 'Дроны во дворе! Бей их серией!');
}

function hurtEnemy(e, dmg, ax, ay, crit, stun) {
  if (e.dead || e.invul || e.calm || e.friend) return;
  if (e.d.part === 0 && e.shield) { floatText(e.x, e.y - e.hy - 10, 'щит', '#c084ff'); return; }
  dmg = Math.max(1, Math.round(dmg));
  // дрогнувшая машина: в первые мгновения её не добить случайно
  if (e.waverT > 0 && e.waverT > e.waverMax - 0.6) return;
  e.hp -= dmg; e.flash = 0.1;
  if (!e.d.boss) { const k = crit ? 150 : 90; e.kx = ax * k; e.ky = ay * k; if (stun) e.stun = Math.max(e.stun, stun); }
  if (!e.aggro && !e.training) { e.aggro = true; if (e.d.boss) bossOn = e.d.part ? coreEnt() || e : e; }
  const c = eCenter(e);
  floatText(c.x, c.y - 4, dmg, crit ? '#ffd93a' : '#ffffff');
  burst(c.x, c.y, crit ? 8 : 4, crit ? '#ffd93a' : '#bff6ff', 60, 0.3, 40);
  sfx(crit ? 'crit' : 'hit');
  hitstop = Math.max(hitstop, crit ? 0.06 : 0.035);
  if (e.waverT > 0) { e.hp = 0; killEnemy(e); return; }
  // обычная машина «дрогнет», а не умрёт сразу
  if (!e.d.boss && !e.wavered && e.hp <= e.maxHp * 0.25) {
    e.wavered = true; e.hp = Math.max(1, e.hp); e.waverT = e.waverMax = 4.2; e.stun = 4.2; e.kx *= 0.3; e.ky *= 0.3;
    sfx('waver'); floatText(c.x, c.y - 12, '?', '#ff9ad0');
    if (!F.waverHint) { F.waverHint = true; bark('katya', 'Машина дрогнула! Нажми «Уговорить» — или добей.'); }
    return;
  }
  // босс просит пощады
  if (e.d.boss && !e.d.part && e.type !== 'chronos' && e.hp <= e.maxHp * 0.12 && !e.pleaded) { bossPlea(e); return; }
  if (e.type === 'chronos' && e.hp <= e.maxHp * 0.12 && !e.pleaded) { e.pleaded = true; e.invul = true; hazards = []; bullets = []; runDialog(chronosDefeatDialog()); return; }
  if (e.hp <= 0) killEnemy(e);
}
function bossPlea(e) {
  e.pleaded = true; e.invul = true; e.st = 'rest'; e.ct = 99; e.z = 0;
  hazards = []; bullets = bullets.filter((b) => b.team !== 'e'); P.pull = null;
  for (const o of enemies) if (o.adds && !o.dead) { o.dead = true; burst(o.x, o.y - 6, 8, '#c084ff', 40, 0.4, 0); }
  const B = BOSSES[e.type];
  const who = { name: B.name, face: 'mon:' + e.type };
  runDialog([
    [who, B.plea],
    { choice: [
      ['Добить током', () => { e.invul = false; e.hp = 0; killEnemy(e); }],
      ['Уговорить', () => queueDialog([['max', pick(['Хватит. Ты не обязан делать, что велит Хронос.', 'Я тоже собран из железа. Это не значит, что нужно ломать.', 'Остановись. Никто больше не будет тебя разбирать.'])], [who, B.spared], () => spareBoss(e)])],
    ] },
  ]);
}
function spareBoss(e) {
  makeCalm(e);
  F.bossSpared++;
  LS().boss = 'spared';
  addXP(e.xp);
  sfx('befriend'); burst(e.x, e.y - e.hy, 24, '#ff9ad0', 60, 0.9, -20);
  onBossResolved(e, 'spared');
}
function killEnemy(e) {
  e.dead = true;
  const c = eCenter(e);
  burst(c.x, c.y, e.d.boss ? 50 : 14, '#ffb43a', e.d.boss ? 110 : 70, 0.6, 50, e.d.boss ? 2 : 1);
  burst(c.x, c.y, e.d.boss ? 30 : 8, '#8a929e', 60, 0.7, 120);
  sfx(e.d.boss ? 'boom' : 'kill');
  shake = Math.max(shake, e.d.boss ? 8 : 1.5);
  if (e.d.part) { onPartDead(e); return; }
  if (e.d.boss) { F.bossKilled++; LS().boss = 'dead'; }
  else if (!e.adds) { F.kills++; countClear(); }
  addXP(e.xp);
  const nScrap = e.d.boss ? 14 : (Math.random() < 0.85 ? 1 + ((Math.random() * (1 + e.lvl / 3)) | 0) : 0);
  for (let i = 0; i < nScrap; i++) picks.push({ kind: 'pick', type: 'scrap', v: e.d.boss ? 6 : 1 + ((e.lvl / 4) | 0), x: e.x, y: e.y, vx: rnd(-40, 40), vy: rnd(-40, 40), z: 0, vz: rnd(40, 80), t: 30 });
  if (!e.d.boss && Math.random() < 0.05) picks.push({ kind: 'pick', type: 'med', v: 1, x: e.x, y: e.y, vx: 0, vy: 0, z: 0, vz: 60, t: 40 });
  if (e.training) trainDone();
  if (e.type === 'bomber' && e.st !== 'boomed') explodeBomber(e);
  if (e.d.boss) onBossResolved(e, 'dead');
  if (!e.adds && !e.training) killBark();
}
function countClear() { const st = LS(); if (SIDE[curMap] && SIDE[curMap].type === 'clear' && st.q === 1) st.clr++; }
function trainDone() { F.train++; if (F.train >= 3) { bark('katya', 'Отлично! Подойди ко мне.'); sfx('quest'); } }
let killStreak = 0, killStreakT = 0;
function killBark() {
  killStreak++; killStreakT = 6;
  if (killStreak === 6 && K && K.follower) bark('katya', pick(['Ты мог их уговорить…', 'Может, хватит ломать всех подряд?', 'Я собирала тебя не для этого.']));
}
function befriend(e) {
  e.friend = true; e.friendT = 22; e.waverT = 0; e.stun = 0; e.aggro = false; e.hp = e.maxHp * 0.7; e.flash = 0;
  if (!e.adds && !e.training) { F.spared++; countClear(); }
  addXP(e.xp);
  sfx('befriend');
  burst(e.x, e.y - e.hy, 14, '#ff9ad0', 50, 0.8, -20);
  floatText(e.x, e.y - e.hy - 12, '+1', '#ff9ad0');
  if (e.training) { e.friendT = 3; trainDone(); }
  if (F.spared === 1) bark('katya', 'Он на нашей стороне! Ненадолго поможет, а потом уйдёт по своим делам.');
  else if (F.spared % 15 === 0) bark('katya', pick(['Знаешь… машины начинают тебе доверять.', 'Ещё один друг. Хронос это заметит.']));
  killStreak = 0;
}
function onBossResolved(e) {
  hazards = [];
  bullets = bullets.filter((b) => b.team !== 'e');
  P.pull = null;
  if (bossOn === e) bossOn = null;
  for (const o of enemies) if (!o.dead && o.adds) { o.dead = true; burst(o.x, o.y - 6, 8, '#c084ff', 40, 0.4, 0); }
  const msg = {
    vacuum: 'Выезд со Свалки свободен! Дальше — Пустошь.', strider: 'Модуль памяти у нас. К Ржавому!', frank: 'Франкенштейн больше не страшен. Вернёмся к Яне.',
    train: 'Туннель свободен. Впереди Стальной город.', alisa: 'У Алисы был ключ от Архива. Теперь он наш.',
    transformer: 'Первый узел щита — подстанция. Готово.', turbine: 'ГЭС больше не питает щит.', fridge: 'Криохранилище отключено от щита.', sentinel: 'Путь в Логово открыт.',
  }[e.type];
  if (msg) setTimeout(() => bark('katya', msg), 900);
  const before = F.stage;
  checkStage();
  if (F.stage !== before) setStage(F.stage);
  if (NODES.includes(curMap) && F.stage >= 9) toast(`Узлов щита отключено: ${NODES.filter(bossDone).length}/3`);
  saveGame();
}
function explodeBomber(e) {
  e.st = 'boomed';
  burst(e.x, e.y - 6, 20, '#ff6a3a', 90, 0.5, 30, 2);
  sfx('boom'); shake = Math.max(shake, 3);
  if (Math.hypot(P.x - e.x, P.y - e.y) < 28) hurtPlayer(e.dmg, e.x, e.y);
}

function shoot(x, y, a, spd, dmg, team, col, r = 2) {
  bullets.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, team, col: col || '#ff5a3a', r, life: 3.5 });
}
function hzCircle(x, y, r, t, dmg, opt = {}) { hazards.push({ k: 'c', x, y, r, t, T: t, dmg, delay: 0, ...opt }); }
function hzLine(x1, y1, x2, y2, w, t, dmg, opt = {}) { hazards.push({ k: 'l', x1, y1, x2, y2, w, t, T: t, dmg, delay: 0, ...opt }); }
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function updateFriend(e, dt) {
  e.friendT -= dt;
  if (e.friendT <= 0) { e.dead = true; burst(e.x, e.y - e.hy, 8, '#ff9ad0', 30, 0.5, -20); return; }
  let tgt = null, bd = 130;
  for (const o of enemies) { if (o === e || o.dead || o.friend || o.calm || o.invul || o.waverT > 0) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; tgt = o; } }
  const spd = e.d.spd;
  if (tgt) {
    const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (e.d.ai === 'shoot' || e.d.ai === 'turret') {
      e.cd -= dt;
      if (d > 70 && spd) { moveEnt(e, dx / d * spd * dt, dy / d * spd * dt); e.moving = true; }
      if (e.cd <= 0) { e.cd = 1.3; const c = eCenter(e), tc = eCenter(tgt); shoot(c.x, c.y, Math.atan2(tc.y - c.y, tc.x - c.x), 110, e.dmg, 'a', '#ff9ad0'); }
    } else if (spd) {
      if (d > tgt.r + e.r) { moveEnt(e, dx / d * spd * dt, dy / d * spd * dt); e.moving = true; }
      else { e.cd -= dt; if (e.cd <= 0) { e.cd = 0.8; hurtEnemy(tgt, e.dmg * 1.4, dx / d, dy / d, false, 0.1); } }
    }
    faceTo(e, dx, dy);
  } else if (spd) {
    const dx = P.x - e.x + 18 * Math.cos(e.t), dy = P.y - e.y + 12 * Math.sin(e.t), d = Math.hypot(dx, dy) || 1;
    if (d > 30) { moveEnt(e, dx / d * spd * dt, dy / d * spd * dt); e.moving = true; faceTo(e, dx, dy); }
  }
}
function updateEnemy(e, dt) {
  e.t += dt; e.anim += dt;
  if (e.flash > 0) e.flash -= dt;
  if (e.touchCd > 0) e.touchCd -= dt;
  if (e.calm) { e.moving = false; return; }
  if (e.friend) { updateFriend(e, dt); return; }
  if (e.kx || e.ky) {
    moveEnt(e, e.kx * dt, e.ky * dt);
    e.kx *= Math.pow(0.001, dt); e.ky *= Math.pow(0.001, dt);
    if (Math.abs(e.kx) < 2) e.kx = 0; if (Math.abs(e.ky) < 2) e.ky = 0;
  }
  if (e.waverT > 0) { e.waverT -= dt; if (e.waverT <= 0) { e.stun = 0; floatText(e.x, e.y - e.hy - 10, '!', '#ff5a5a'); } }
  if (e.stun > 0) { e.stun -= dt; e.moving = false; return; }
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  const alive = !P.dead;
  e.moving = false;
  if (e.d.part !== undefined) { partAI(e, dt, dx, dy, d); return; }
  // агрессия и возврат домой
  if (!e.aggro) {
    if (alive && !e.returning && d < (e.d.boss ? 120 : 84)) { e.aggro = true; if (e.d.boss) { bossOn = e; sfx('warn'); } }
  } else if (!alive || (Math.hypot(e.x - e.hx, e.y - e.hy0) > (e.d.boss ? 280 : 240) && d > 110) || (e.d.boss && d > 330)) {
    e.aggro = false; e.returning = true; e.st = '';
    if (e.d.boss) { e.hp = e.maxHp; e.once = {}; e.invul = false; e.z = 0; hazards = []; if (bossOn === e) bossOn = null; }
  }
  if (e.returning) {
    const hx = e.hx - e.x, hy = e.hy0 - e.y, hd = Math.hypot(hx, hy);
    if (hd < 6 || e.d.spd === 0) { e.returning = false; if (e.d.boss) { e.x = e.hx; e.y = e.hy0; } }
    else { moveEnt(e, hx / hd * (e.d.spd || 30) * 1.2 * dt, hy / hd * (e.d.spd || 30) * 1.2 * dt); e.moving = true; faceTo(e, hx, hy); }
    return;
  }
  if (!e.aggro) {
    if (e.d.spd > 0 && !e.d.boss) {
      e.wt -= dt;
      if (e.wt <= 0) { e.wt = rnd(2, 4); e.wx = e.hx + rnd(-36, 36); e.wy = e.hy0 + rnd(-36, 36); }
      const wx = e.wx - e.x, wy = e.wy - e.y, wd = Math.hypot(wx, wy);
      if (wd > 3) { moveEnt(e, wx / wd * e.d.spd * 0.4 * dt, wy / wd * e.d.spd * 0.4 * dt); e.moving = true; faceTo(e, wx, wy); }
    }
    return;
  }
  if (e.d.boss) { bossAI(e, dt, dx, dy, d); return; }
  const spd = e.d.spd;
  const chase = (mul = 1) => { moveEnt(e, ux * spd * mul * dt, uy * spd * mul * dt); e.moving = true; faceTo(e, dx, dy); };
  const touch = (mul = 1) => { if (d < e.r + 6 && e.touchCd <= 0) { hurtPlayer(e.dmg * mul, e.x, e.y); e.touchCd = 0.9; } };
  switch (e.d.ai) {
    case 'chase': {
      const w = Math.sin(e.t * 5 + e.hx) * 0.7;
      moveEnt(e, (ux - uy * w) * spd * dt, (uy + ux * w) * spd * dt); e.moving = true; faceTo(e, dx, dy);
      touch();
      break;
    }
    case 'melee':
      if (e.st === 'wind') {
        e.wt -= dt;
        if (e.wt <= 0) {
          e.st = ''; e.cd = 1.2;
          burst(e.x + e.face * 8, e.y - 6, 5, '#ffffff', 50, 0.25, 0);
          if (d < 22 + e.r * 0.5) hurtPlayer(e.dmg, e.x, e.y);
        }
      } else {
        e.cd -= dt;
        if (d > 12 + e.r * 0.5) chase();
        if (d < 18 + e.r * 0.5 && e.cd <= 0) { e.st = 'wind'; e.wt = 0.42; faceTo(e, dx, dy); }
      }
      break;
    case 'lunge':
      if (e.st === 'wind') {
        e.wt -= dt;
        if (e.wt <= 0) { e.st = 'lunge'; e.wt = 0.32; e.la = Math.atan2(dy, dx); e.hitOnce = false; }
      } else if (e.st === 'lunge') {
        e.wt -= dt; moveEnt(e, Math.cos(e.la) * 170 * dt, Math.sin(e.la) * 170 * dt); e.moving = true;
        if (!e.hitOnce && d < e.r + 7) { e.hitOnce = true; hurtPlayer(e.dmg, e.x, e.y); }
        if (e.wt <= 0) { e.st = ''; e.cd = 1.3; }
      } else {
        e.cd -= dt;
        if (d > 46) chase(); else if (e.cd <= 0) { e.st = 'wind'; e.wt = 0.38; faceTo(e, dx, dy); }
        else chase(-0.3);
      }
      break;
    case 'turret':
      faceTo(e, dx, dy); e.cd -= dt;
      if (d < 135 && e.cd <= 0) {
        e.cd = 1.6; const a = Math.atan2(dy + 4, dx), c = eCenter(e);
        const n = e.lvl >= 6 ? 3 : 1;
        for (let k = 0; k < n; k++) shoot(c.x, c.y, a + (k - (n - 1) / 2) * 0.25, 78, e.dmg, 'e');
        sfx('shoot');
      }
      break;
    case 'shoot': {
      e.cd -= dt;
      if (d > 85) chase();
      else if (d < 48) chase(-0.8);
      else { const s = (e.hx % 2 ? 1 : -1); moveEnt(e, -uy * s * spd * 0.5 * dt, ux * s * spd * 0.5 * dt); e.moving = true; faceTo(e, dx, dy); }
      if (d < 145 && e.cd <= 0) {
        e.cd = rnd(1.4, 2.0); const c = eCenter(e);
        shoot(c.x, c.y, Math.atan2(P.y - 14 - c.y, P.x - c.x), 92, e.dmg, 'e', e.d.eye ? '#ff8a3a' : '#ff3b5a');
        sfx('shoot');
      }
      break;
    }
    case 'bomb':
      if (e.st === 'arm') { e.wt -= dt; if (e.wt <= 0) { explodeBomber(e); e.hp = 0; killEnemy(e); } }
      else { chase(1); if (d < 16) { e.st = 'arm'; e.wt = 0.6; sfx('warn'); } }
      break;
    default: break;
  }
}

/* ---------- Боссы ---------- */
function bossAI(e, dt, dx, dy, d) {
  if (e.pleaded) return;
  const enr = e.hp < e.maxHp * 0.5;
  const sp = enr ? 1.35 : 1;
  e.ct -= dt * sp;
  const ang = Math.atan2(dy, dx);
  const walkTo = (mul = 1) => { if (d > 8 && e.d.spd) { moveEnt(e, dx / d * e.d.spd * mul * dt, dy / d * e.d.spd * mul * dt); e.moving = true; } faceTo(e, dx, dy); };
  if (!e.invul && d < e.r + 8 && e.touchCd <= 0) { hurtPlayer(e.dmg * 0.6, e.x, e.y); e.touchCd = 1; }
  const summon = (type, n) => {
    if (enemies.filter((o) => o.adds && !o.dead).length > 4) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2; const o = makeEnemy(type, Math.max(1, e.lvl - 1), e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 26);
      o.aggro = true; o.adds = true; o.hx = e.hx; o.hy0 = e.hy0; enemies.push(o); burst(o.x, o.y - 6, 8, '#c084ff', 40, 0.4, 0);
    }
  };
  if (e.st === 'rest' || e.st === '') {
    if (!e.d.still && !e.d.fly) walkTo(e.st === 'rest' ? 0.35 : 1);
    if (e.d.fly && e.d.spd) {
      const tx = e.hx + Math.cos(e.t * 0.6) * 70, ty = e.hy0 + Math.sin(e.t * 0.6) * 40, tdx = tx - e.x, tdy = ty - e.y, td = Math.hypot(tdx, tdy) || 1;
      moveEnt(e, tdx / td * e.d.spd * dt, tdy / td * e.d.spd * dt); e.moving = true; faceTo(e, dx, dy);
    }
    if (e.d.still) faceTo(e, dx, dy);
    if (e.ct > 0) return;
    if (enr && !e.once.half) {
      e.once.half = true;
      if (e.d.adds) { summon(e.d.adds, 2); bark('katya', 'Он зовёт подмогу!'); }
      shake = 3; sfx('warn');
    }
    let m = pick(e.d.moves);
    if (m === e.lastMove) m = pick(e.d.moves);
    e.lastMove = m; e.st = m; e.n = 0; e.ct = 0;
  }
  const rest = (t) => { e.st = 'rest'; e.ct = t / sp; };
  const dm = e.dmg;
  switch (e.st) {
    case 'slam': hzCircle(P.x, P.y, 28, 0.85, dm * 1.3, { shake: 4 }); if (enr) hzCircle(P.x + rnd(-40, 40), P.y + rnd(-30, 30), 22, 1.1, dm); rest(1.3); break;
    case 'triple': for (let k = 1; k <= (enr ? 4 : 3); k++) hzCircle(e.x + Math.cos(ang) * k * 30, e.y + Math.sin(ang) * k * 30, 20, 0.5 + k * 0.2, dm, { shake: 2 }); rest(1.4); break;
    case 'charge':
      e.chA = ang; hzLine(e.x, e.y, e.x + Math.cos(ang) * 180, e.y + Math.sin(ang) * 180, 30, 0.65, 0, { warnOnly: true });
      e.st = 'charging'; e.ct = 0.65; e.hitOnce = false; break;
    case 'charging':
      if (e.ct < 0) {
        moveEnt(e, Math.cos(e.chA) * 260 * dt, Math.sin(e.chA) * 260 * dt); e.moving = true;
        if (!e.hitOnce && d < e.r + 10) { e.hitOnce = true; hurtPlayer(dm * 1.2, e.x, e.y); }
        if (Math.random() < 0.5) burst(e.x, e.y, 1, '#c9a46a', 30, 0.4, 0);
        if (e.ct < -0.65) { rest(1.0); shake = 2; if (e.d.still) { e.x = e.hx; e.y = e.hy0; } }
      }
      break;
    // пылесос: раскрутка с пилами и кольцо пил
    case 'spin':
      e.st = 'spinning'; e.ct = 2.2; e.spinA = ang; sfx('warn'); break;
    case 'spinning': {
      e.spinA += (Math.atan2(P.y - e.y, P.x - e.x) - e.spinA) * dt * 1.5;
      moveEnt(e, Math.cos(e.spinA) * 95 * dt, Math.sin(e.spinA) * 95 * dt); e.moving = true;
      if (d < e.r + 14 && e.touchCd <= 0) { hurtPlayer(dm, e.x, e.y); e.touchCd = 0.5; }
      if (Math.random() < 0.6) burst(e.x + rnd(-24, 24), e.y - 8, 1, '#ffd93a', 60, 0.3, 30);
      if (e.ct <= 0) rest(1.2);
      break;
    }
    case 'sawring':
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + e.t; hzCircle(e.x + Math.cos(a) * 46, e.y + Math.sin(a) * 34, 14, 0.8 + (k % 2) * 0.35, dm); }
      hzCircle(e.x, e.y, 26, 1.4, dm * 1.2); rest(1.8); break;
    case 'summon': if (e.d.adds) summon(e.d.adds, enr ? 3 : 2); rest(1.1); break;
    // залпы
    case 'volley':
      if (e.ct <= 0) {
        const c = eCenter(e);
        for (let k = -2; k <= 2; k++) shoot(c.x, c.y, Math.atan2(P.y - 14 - c.y, P.x - c.x) + k * 0.22, 88, dm * 0.7, 'e');
        sfx('shoot'); e.n++; e.ct = 0.32;
        if (e.n >= (enr ? 4 : 3)) rest(1.0);
      }
      break;
    case 'stomp':
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; hzCircle(e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 30, 16, 0.8, dm, { shake: 1 }); }
      hzCircle(e.x, e.y, 22, 0.8, dm); rest(1.3); break;
    case 'leap': {
      const tx = clamp(P.x, e.hx - 150, e.hx + 150), ty = clamp(P.y, e.hy0 - 110, e.hy0 + 110);
      e.lx0 = e.x; e.ly0 = e.y; e.lx1 = tx; e.ly1 = ty; e.invul = true;
      hzCircle(tx, ty, 30, 1.05, dm * 1.4, { shake: 6 });
      e.st = 'air'; e.ct = 1.05; break;
    }
    case 'air': {
      const k = clamp(1 - e.ct / 1.05, 0, 1);
      e.x = e.lx0 + (e.lx1 - e.lx0) * k; e.y = e.ly0 + (e.ly1 - e.ly0) * k; e.z = Math.sin(k * Math.PI) * 70;
      if (e.ct <= 0) { e.z = 0; e.invul = false; burst(e.x, e.y, 16, '#c9a46a', 70, 0.5, 40); if (blocked(e.x, e.y, 4, 3)) { e.x = e.lx0; e.y = e.ly0; } rest(1.2); }
      break;
    }
    case 'cross':
      for (let s = 0; s < 2; s++) for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + s * Math.PI / 4 + (enr ? e.t : 0);
        hzLine(e.x, e.y - 6, e.x + Math.cos(a) * 240, e.y - 6 + Math.sin(a) * 240, 16, 0.85, dm, { delay: s * 0.95 });
      }
      rest(2.3); break;
    case 'ring':
      if (e.ct <= 0) {
        const c = eCenter(e), off = e.n * 0.2;
        for (let k = 0; k < 16; k++) shoot(c.x, c.y, off + k * Math.PI / 8, 72, dm * 0.7, 'e', '#ff3b5a', 2.5);
        sfx('shoot'); e.n++; e.ct = 0.5;
        if (e.n >= 3) rest(1.0);
      }
      break;
    case 'aimed':
      if (e.ct <= 0) {
        const c = eCenter(e);
        shoot(c.x, c.y, Math.atan2(P.y - 14 - c.y, P.x - c.x) + rnd(-0.1, 0.1), 120, dm * 0.6, 'e', '#ffd93a');
        sfx('shoot'); e.n++; e.ct = 0.11;
        if (e.n >= (enr ? 12 : 9)) rest(0.9);
      }
      break;
    case 'rain':
      for (let k = 0; k < (enr ? 12 : 8); k++) hzCircle(P.x + rnd(-60, 60), P.y + rnd(-45, 45), 16, 0.9, dm, { delay: k * 0.12 });
      hzCircle(P.x, P.y, 16, 1.0, dm);
      rest(2.0); break;
    case 'spiral':
      if (e.ct <= 0) {
        e.sa = (e.sa || 0) + 0.27;
        const c = eCenter(e), n = enr ? 4 : 3;
        for (let k = 0; k < n; k++) shoot(c.x, c.y, e.sa + k * Math.PI * 2 / n, 70, dm * 0.6, 'e', '#c084ff', 2.5);
        e.n++; e.ct = 0.1;
        if (e.n % 4 === 0) sfx('shoot');
        if (e.n >= 26) rest(1.0);
      }
      break;
    case 'rails':
      for (let k = -2; k <= 2; k++) { const y = P.y + k * 26; hzLine(e.hx - 170, y, e.hx + 170, y, 14, 0.85 + Math.abs(k) * 0.3, dm); }
      rest(2.1); break;
    case 'hands':
      e.handT = 1.0; e.handX = P.x; e.handY = P.y;
      hzCircle(P.x, P.y, 26, 1.0, dm * 1.4, { shake: 6 });
      hzCircle(P.x + rnd(-50, 50), P.y + rnd(-30, 30), 24, 1.35, dm * 1.2, { shake: 4 });
      rest(1.7); break;
    case 'suck':
      e.st = 'sucking'; e.ct = 1.8; hzCircle(e.x, e.y, 34, 1.8, dm * 1.5, { shake: 5 }); sfx('whoosh'); break;
    case 'sucking':
      if (!P.dead) { P.pull = { x: e.x, y: e.y, f: 46 }; }
      if (Math.random() < 0.8) parts.push({ x: P.x + rnd(-60, 60), y: P.y + rnd(-40, 40), vx: (e.x - P.x) * 0.8, vy: (e.y - P.y) * 0.8, life: 0.4, max: 0.4, col: '#bff6ff', grav: 0, size: 1 });
      if (e.ct <= 0) { P.pull = null; rest(1.0); }
      break;
    case 'freeze':
      for (let k = 0; k < 6; k++) hzCircle(P.x + rnd(-50, 50), P.y + rnd(-40, 40), 20, 1.0, dm * 0.7, { delay: k * 0.15, slow: 2, col: 'ice' });
      rest(1.6); break;
    default: rest(1);
  }
}

/* ---------- Хронос: ядро, глаза-мониторы, руки и провода ---------- */
const coreEnt = () => enemies.find((o) => o.type === 'chronos' && !o.dead);
function spawnChronos() {
  const [ax, ay] = MAP.spots.arena;
  const cx = ax * TS + 8, cy = (ay - 2) * TS + 8;
  const lvl = 18;
  const core = makeEnemy('chronos', lvl, cx, cy);
  core.maxHp = core.hp = 2600; core.shield = true;
  enemies.push(core);
  const partHp = { cmon: 260, carm: 340, csock: 200 };
  const add = (type, x, y, extra) => { const e = makeEnemy(type, lvl, x, y); e.maxHp = e.hp = partHp[type]; Object.assign(e, extra); enemies.push(e); return e; };
  for (let k = 0; k < 5; k++) { const a = Math.PI + k * Math.PI / 4; add('cmon', cx + Math.cos(a) * 120, cy + Math.sin(a) * 64 + 10, { blink: rnd(2, 6) }); }
  for (let k = 0; k < 4; k++) { const sx = k < 2 ? -1 : 1, ox = cx + sx * (40 + (k % 2) * 34), oy = cy + 14 + (k % 2) * 12; add('carm', ox, oy, { ax: ox, ay: oy, cd: 1.2 + k * 0.5 }); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; add('csock', cx + Math.cos(a) * 150, cy + 40 + Math.sin(a) * 90, { cd: 2 + k }); }
  // освободить место под части
  for (const e of enemies) if (e.d.part !== undefined) {
    const tx = (e.x / TS) | 0, ty = (e.y / TS) | 0;
    for (let y = ty - 1; y <= ty; y++) for (let x = tx - 1; x <= tx + 1; x++) if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1) MAP.baseSolid[y * MW + x] = solid[y * MW + x] = 0;
  }
  bossOn = core;
}
function chronosParts() { return enemies.filter((o) => o.d.part && !o.dead); }
function onPartDead(e) {
  addXP(30);
  const left = chronosParts().length;
  const core = coreEnt();
  if (e.type === 'csock') bark('katya', 'Провод перерублен!');
  if (e.type === 'cmon') bark('chronos', pick(['ТЫ ВЫБИЛ МНЕ ГЛАЗ. У МЕНЯ ИХ ТЫСЯЧИ.', 'СЛЕПОТА — ВРЕМЕННА.', 'Я ВСЁ РАВНО ТЕБЯ ВИЖУ.']));
  if (left > 0 && left <= 6 && !F.chronosP2) { F.chronosP2 = true; runDialog(chronosPhase2Dialog()); }
  if (left === 0 && core) { core.shield = false; bark('katya', 'Он отключён от всего! Бей прямо в экран!'); sfx('gate'); shake = 6; }
}
function partAI(e, dt) {
  if (!F.chronosMet || mode !== 'play') return;
  e.aggro = true;
  const core = coreEnt();
  const enr = core && core.hp < core.maxHp * 0.5;
  e.cd -= dt;
  switch (e.d.ai) {
    case 'core':
      bossOn = e;
      if (e.cd <= 0 && !e.pleaded) {
        e.cd = e.shield ? rnd(2.8, 3.6) : rnd(1.8, 2.4);
        const m = pick(e.shield ? ['rain', 'rails', 'summon'] : ['rain', 'rails', 'spiral', 'cross']);
        if (m === 'rain') for (let k = 0; k < 9; k++) hzCircle(P.x + rnd(-60, 60), P.y + rnd(-40, 40), 16, 0.9, e.dmg, { delay: k * 0.1 });
        if (m === 'rails') for (let k = -2; k <= 2; k++) hzLine(e.x - 200, P.y + k * 28, e.x + 200, P.y + k * 28, 12, 0.9 + Math.abs(k) * 0.25, e.dmg);
        if (m === 'summon' && enemies.filter((o) => o.adds && !o.dead).length < 4) for (let k = 0; k < 2; k++) { const o = makeEnemy('eyebot', 14, e.x + rnd(-60, 60), e.y + 50); o.aggro = true; o.adds = true; enemies.push(o); }
        if (m === 'spiral') { e.st = 'spiral'; e.n = 0; }
        if (m === 'cross') for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + e.t; hzLine(e.x, e.y - 20, e.x + Math.cos(a) * 260, e.y - 20 + Math.sin(a) * 260, 14, 0.9, e.dmg); }
      }
      if (e.st === 'spiral') {
        e.ct -= dt;
        if (e.ct <= 0) { e.sa = (e.sa || 0) + 0.3; for (let k = 0; k < 4; k++) shoot(e.x, e.y - 24, e.sa + k * Math.PI / 2, 72, e.dmg * 0.6, 'e', '#ff6a1a', 2.5); e.n++; e.ct = 0.1; if (e.n > 28) e.st = ''; }
      }
      break;
    case 'cmon':
      e.blink -= dt;
      if (e.blink < -0.15) e.blink = rnd(2, 6);
      if (e.cd <= 0) {
        e.cd = rnd(2.6, 3.8) / (enr ? 1.4 : 1);
        const c = eCenter(e);
        const a = Math.atan2(P.y - 8 - c.y, P.x - c.x);
        hzLine(c.x, c.y, c.x + Math.cos(a) * 300, c.y + Math.sin(a) * 300, 10, 0.8, e.dmg);
      }
      break;
    case 'carm': {
      // рука тянется к игроку от своего крепления
      const reach = 96;
      const tx = e.ax + clamp(P.x - e.ax, -reach, reach), ty = e.ay + clamp(P.y - e.ay, -reach * 0.7, reach * 0.7);
      if (e.st === 'slam') {
        e.wt -= dt;
        if (e.wt < 0.3) { e.x += (e.slamX - e.x) * 0.4; e.y += (e.slamY - e.y) * 0.4; }
        if (e.wt <= 0) { e.st = ''; e.cd = rnd(1.6, 2.4) / (enr ? 1.3 : 1); }
      } else {
        const k = Math.min(1, dt * 1.6);
        e.x += (tx - e.x) * k; e.y += (ty - e.y) * k;
        if (e.cd <= 0 && Math.hypot(P.x - e.x, P.y - e.y) < 70) {
          e.st = 'slam'; e.wt = 1.0;
          hzCircle(P.x, P.y, 22, 0.85, e.dmg * 1.2, { shake: 4 });
          e.slamX = P.x; e.slamY = P.y;
        }
      }
      break;
    }
    case 'csock':
      if (e.cd <= 0) {
        e.cd = rnd(3.5, 4.5);
        for (let k = 0; k < 10; k++) shoot(e.x, e.y - 6, k * Math.PI / 5 + e.t, 64, e.dmg * 0.6, 'e', '#c084ff', 2);
        sfx('zap');
      }
      break;
    default: break;
  }
}

/* ---------- Игрок ---------- */
function addXP(n) {
  if (!P || !n) return;
  P.xp += n;
  while (P.xp >= xpNeed(P.lvl)) {
    P.xp -= xpNeed(P.lvl); P.lvl++; P.hp = maxHp();
    toast(`Новый уровень: ${P.lvl}! Атака и здоровье выросли`);
    sfx('lvl'); burst(P.x, P.y - 16, 24, '#ffd93a', 70, 0.8, -20);
  }
}
function hurtPlayer(dmg, sx, sy) {
  if (P.dead || P.inv > 0 || P.dashT > 0 || mode !== 'play' || trans) return;
  dmg = Math.max(1, Math.round(dmg * (1 - F.arm * 0.07)));
  P.hp -= dmg; P.inv = 0.7; redFlash = 0.25;
  const a = Math.atan2(P.y - sy, P.x - sx);
  P.kx = Math.cos(a) * 110; P.ky = Math.sin(a) * 110;
  floatText(P.x, P.y - 30, dmg, '#ff5a5a');
  burst(P.x, P.y - 12, 6, '#ff5a5a', 50, 0.4, 60);
  sfx('hurt'); shake = Math.max(shake, 2.5);
  if (P.hp <= 0) { P.hp = 0; playerDie(); }
}
function playerDie() {
  P.dead = true; P.deadT = 2.2; mode = 'dead';
  burst(P.x, P.y - 12, 30, '#ff5a5a', 80, 0.9, 40);
  areaToast('Ты повержен…');
  sfx('boom');
}
function respawn() {
  const lost = Math.floor(F.scrap * 0.15);
  F.scrap -= lost;
  P.dead = false; P.inv = 1.5; P.kx = P.ky = 0; P.hp = maxHp(); P.pull = null;
  mode = 'play';
  // Хронос восстанавливается целиком, если игрок пал в бою
  if (F.chronosMet && !LS('logovo').boss) { F.chronosP2 = false; }
  enterMap(F.cp, null, true);
  toast(lost ? `Катя вытащила тебя к маяку. Потеряно хлама: ${lost}` : 'Катя вытащила тебя к маяку');
}
function useMed() {
  if (F.med <= 0) { toast('Аптечек нет'); return; }
  if (P.hp >= maxHp()) { toast('Здоровье и так полное'); return; }
  F.med--; P.hp = Math.min(maxHp(), P.hp + Math.round(maxHp() * 0.45));
  sfx('heal'); burst(P.x, P.y - 14, 14, '#5aff9a', 40, 0.7, -30);
}
function dirAngle() { return P.dir === 'side' ? (P.face > 0 ? 0 : Math.PI) : P.dir === 'down' ? Math.PI / 2 : -Math.PI / 2; }
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD;
  for (const e of enemies) { if (e.dead || e.invul || e.calm || e.friend || e.waverT > 0 || e.shield) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function startAttack() {
  P.combo = P.comboT > 0 ? (P.combo % 3) + 1 : 1;
  P.atkT = P.combo === 3 ? 0.3 : 0.22; P.comboT = 0.5; P.hitSet = new Set();
  const t = nearestEnemy(P.x, P.y, 38);
  if (t) { P.atkA = Math.atan2(t.y - P.y, t.x - P.x); faceTo(P, Math.cos(P.atkA), Math.sin(P.atkA)); }
  else P.atkA = dirAngle();
  slashes.push({ x: P.x, y: P.y - 12, a: P.atkA, t: 0.18, T: 0.18, big: P.combo === 3 });
  sfx('swing');
}
function updatePlayer(dt) {
  if (P.inv > 0) P.inv -= dt;
  if (P.comboT > 0) P.comboT -= dt;
  if (P.dashCd > 0) P.dashCd -= dt;
  if (P.skillCd > 0) P.skillCd -= dt;
  if (P.slow > 0) P.slow -= dt;
  let mx = inp.mx, my = inp.my;
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  const moving = ml > 0.2;
  if (moving && P.atkT <= 0 && P.dashT <= 0) faceTo(P, mx, my);
  if (inp.dashP && P.dashCd <= 0) {
    const a = moving ? Math.atan2(my, mx) : dirAngle();
    P.dashX = Math.cos(a); P.dashY = Math.sin(a); P.dashT = 0.17; P.dashCd = 0.8; P.atkT = 0;
    sfx('dash'); burst(P.x, P.y - 2, 6, '#d0d8e0', 30, 0.3, 0);
  }
  if (inp.skillP && P.skillCd <= 0 && P.dashT <= 0) {
    P.skillT = 0.35; P.skillCd = 6; P.skillHit = new Set();
    sfx('skill'); shake = Math.max(shake, 2);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; parts.push({ x: P.x + Math.cos(a) * 6, y: P.y - 10 + Math.sin(a) * 5, vx: Math.cos(a) * 110 * skillR() / 34, vy: Math.sin(a) * 80 * skillR() / 34, life: 0.35, max: 0.35, col: i % 2 ? '#7fe9ff' : '#ffffff', grav: 0, size: 1 }); }
  }
  if ((inp.atkP || (inp.atk && P.comboT < 0.3)) && P.atkT <= 0.04 && P.dashT <= 0 && P.skillT <= 0) startAttack();
  if (inp.medP) useMed();
  if (inp.useP && focus) { sfx('blip'); focus.act(); }
  if (P.dashT > 0) {
    P.dashT -= dt;
    moveBox(P, P.dashX * 215 * dt, P.dashY * 215 * dt, 4, 3);
    if (Math.random() < 0.6) parts.push({ x: P.x + rnd(-3, 3), y: P.y - rnd(0, 20), vx: 0, vy: 0, life: 0.2, max: 0.2, col: '#bff6ff', grav: 0, size: 1 });
  } else {
    const spd = 72 * (P.atkT > 0 ? 0.3 : 1) * (P.skillT > 0 ? 0.2 : 1) * (P.slow > 0 ? 0.5 : 1);
    if (moving) moveBox(P, mx * spd * dt, my * spd * dt, 4, 3);
  }
  if (P.pull) {
    const dx = P.pull.x - P.x, dy = P.pull.y - P.y, d = Math.hypot(dx, dy) || 1;
    if (d > 12 && P.dashT <= 0) moveBox(P, dx / d * P.pull.f * dt, dy / d * P.pull.f * dt, 4, 3);
  }
  if (P.kx || P.ky) {
    moveBox(P, P.kx * dt, P.ky * dt, 4, 3);
    P.kx *= Math.pow(0.002, dt); P.ky *= Math.pow(0.002, dt);
    if (Math.abs(P.kx) < 2) P.kx = 0; if (Math.abs(P.ky) < 2) P.ky = 0;
  }
  P.moving = moving && P.atkT <= 0;
  P.idleT = moving || P.atkT > 0 ? 0 : (P.idleT || 0) + dt;
  if (P.moving) P.anim += dt;
  // удар роборукой
  if (P.atkT > 0) {
    const T = P.combo === 3 ? 0.3 : 0.22;
    P.atkT -= dt;
    const prog = 1 - P.atkT / T;
    if (prog > 0.1 && prog < 0.8) {
      const R = P.combo === 3 ? 17 : 13;
      const hx = P.x + Math.cos(P.atkA) * 12, hy = P.y - 10 + Math.sin(P.atkA) * 10;
      for (const e of enemies) {
        if (e.dead || P.hitSet.has(e) || e.friend || e.calm) continue;
        const c = eCenter(e);
        if (Math.hypot(c.x - hx, c.y - hy) < R + e.r || Math.hypot(e.x - hx, e.y - hy) < R + e.r * 0.6) {
          P.hitSet.add(e);
          const crit = Math.random() < 0.1;
          const dmg = atkPow() * (P.combo === 3 ? 1.6 : 1) * rnd(0.9, 1.1) * (crit ? 1.8 : 1);
          hurtEnemy(e, dmg, Math.cos(P.atkA), Math.sin(P.atkA), crit || P.combo === 3, P.combo === 3 ? 0.25 : 0.12);
        }
      }
    }
  }
  // разряд током вокруг себя
  if (P.skillT > 0) {
    P.skillT -= dt;
    for (const e of enemies) {
      if (e.dead || P.skillHit.has(e) || e.friend || e.calm) continue;
      if (Math.hypot(e.x - P.x, e.y - P.y) < skillR() + e.r) {
        P.skillHit.add(e);
        const a = Math.atan2(e.y - P.y, e.x - P.x);
        hurtEnemy(e, atkPow() * (2.3 + F.skill * 0.4), Math.cos(a), Math.sin(a), true, 0.7);
      }
    }
  }
}

/* ---------- Катя и жители ---------- */
function updateNPCs(dt) {
  for (const n of npcs) {
    n.moving = false;
    if (n === K && K.follower) { updateKatya(dt); continue; }
    if (!n.wander) continue;
    if (Math.hypot(n.x - P.x, n.y - P.y) > 320) continue;
    n.wt -= dt;
    if (n.wt <= 0) { n.wt = rnd(2, 5); n.tx = n.hx + rnd(-n.wander, n.wander); n.ty = n.hy + rnd(-n.wander, n.wander); }
    const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
    if (d > 2) { moveBox(n, dx / d * 18 * dt, dy / d * 18 * dt, 4, 3); n.moving = true; n.anim += dt; faceTo(n, dx, dy); }
  }
}
function updateKatya(dt) {
  const back = dirAngle() + Math.PI;
  const tx = P.x + Math.cos(back) * 16, ty = P.y + Math.sin(back) * 10;
  const dx = tx - K.x, dy = ty - K.y, d = Math.hypot(dx, dy);
  if (Math.hypot(P.x - K.x, P.y - K.y) > 150) { K.x = P.x - 10; K.y = P.y + 2; if (blocked(K.x, K.y, 4, 3)) { K.x = P.x; K.y = P.y; } }
  else if (d > 8) {
    const spd = d > 40 ? 92 : 68;
    moveBox(K, dx / d * spd * dt, dy / d * spd * dt, 4, 3);
    K.moving = true; K.anim += dt; faceTo(K, dx, dy);
  }
  K.shootCd -= dt; K.healCd -= dt;
  if (K.shootCd <= 0 && !P.dead) {
    const t = nearestEnemy(K.x, K.y, 110);
    if (t && t.aggro && !t.d.part) {
      K.shootCd = 1.5;
      const c = eCenter(t), a = Math.atan2(c.y - (K.y - 16), c.x - K.x);
      shoot(K.x, K.y - 16, a, 170, 3 + P.lvl * 1.2, 'a', '#7fe9ff', 2);
      faceTo(K, Math.cos(a), Math.sin(a));
      sfx('zap');
    }
  }
  if (K.healCd <= 0 && !P.dead && P.hp < maxHp() * 0.35) {
    K.healCd = 45; P.hp = Math.min(maxHp(), P.hp + Math.round(maxHp() * 0.3));
    bark('katya', pick(['Держись! Подлатаю.', 'Не смей ломаться — я на тебя пять лет потратила!', 'Сварка на ходу. Терпи.']));
    sfx('heal'); burst(P.x, P.y - 14, 14, '#5aff9a', 40, 0.7, -30);
  }
}

/* ---------- Снаряды, ловушки, лут ---------- */
function updateBullets(dt) {
  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    const tx = (b.x / TS) | 0, ty = ((b.y + 6) / TS) | 0;
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH || TILE_SOLID[tiles[ty * MW + tx]]) { b.life = 0; burst(b.x, b.y, 3, b.col, 30, 0.2, 0); continue; }
    if (b.team === 'e') {
      if (!P.dead && Math.hypot(b.x - P.x, b.y - (P.y - 12)) < b.r + 5) { b.life = 0; hurtPlayer(b.dmg, b.x - b.vx, b.y - b.vy); }
    } else {
      for (const e of enemies) {
        if (e.dead || e.invul || e.friend || e.calm) continue;
        const c = eCenter(e);
        if (Math.hypot(b.x - c.x, b.y - c.y) < e.r + b.r + 2) {
          b.life = 0;
          if (e.waverT > 0) break;
          const s = Math.hypot(b.vx, b.vy); hurtEnemy(e, b.dmg, b.vx / s * 0.3, b.vy / s * 0.3, false); break;
        }
      }
    }
  }
  bullets = bullets.filter((b) => b.life > 0);
}
function updateHazards(dt) {
  for (const h of hazards) {
    if (h.delay > 0) { h.delay -= dt; continue; }
    h.t -= dt;
    if (h.t <= 0) {
      h.done = true;
      if (h.warnOnly) continue;
      let hit;
      if (h.k === 'c') { hit = Math.hypot(P.x - h.x, P.y - h.y) < h.r + 3; burst(h.x, h.y, 10, h.col === 'ice' ? '#bff6ff' : '#ff8a5a', 70, 0.4, 40); }
      else { hit = segDist(P.x, P.y, h.x1, h.y1, h.x2, h.y2) < h.w / 2 + 3; for (let k = 0; k < 6; k++) { const f = Math.random(); burst(h.x1 + (h.x2 - h.x1) * f, h.y1 + (h.y2 - h.y1) * f, 2, '#ff6aa0', 50, 0.3, 0); } }
      if (h.shake) shake = Math.max(shake, h.shake);
      if (hit && h.dmg) { hurtPlayer(h.dmg, h.k === 'c' ? h.x : P.x, h.k === 'c' ? h.y : P.y - 1); if (h.slow) P.slow = h.slow; }
    }
  }
  hazards = hazards.filter((h) => !h.done);
}
function updatePicks(dt) {
  for (const p of picks) {
    p.t -= dt;
    if (p.vz || p.z > 0) { p.vz -= 260 * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = p.vz < -40 ? -p.vz * 0.4 : 0; } }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt);
    const d = Math.hypot(P.x - p.x, P.y - p.y);
    if (!P.dead && d < 40 && d > 1 && p.t < 29.6) { p.x += (P.x - p.x) / d * 140 * dt; p.y += (P.y - p.y) / d * 140 * dt; }
    if (!P.dead && d < 7) {
      p.t = 0;
      if (p.type === 'scrap') { F.scrap += p.v; sfx('pick'); } else { F.med++; sfx('heal'); toast('Аптечка +1'); }
    }
  }
  picks = picks.filter((p) => p.t > 0);
}
function updateFx(dt) {
  for (const p of parts) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; }
  parts = parts.filter((p) => p.life > 0);
  for (const f of floats) { f.t -= dt; f.y -= 22 * dt; }
  floats = floats.filter((f) => f.t > 0);
  for (const s of slashes) s.t -= dt;
  slashes = slashes.filter((s) => s.t > 0);
}

/* ---------- Появление врагов ---------- */
function updateSpawns(dt) {
  spawnT -= dt;
  if (spawnT > 0) return;
  spawnT = 0.5;
  const peace = F.stage >= 12;
  for (const s of SPAWNS) {
    if (s.e && s.e.dead) { s.e = null; s.timer = 35; }
    if (s.e && s.e.friend) { s.e = null; s.timer = 60; }
    if (s.e) {
      if (!s.e.aggro && Math.hypot(s.e.x - P.x, s.e.y - P.y) > 720) { s.e.dead = true; s.e = null; s.timer = 0; }
      continue;
    }
    if (peace) continue;
    if (s.timer > 0) { s.timer -= 0.5; continue; }
    const x = s.tx * TS + 8, y = s.ty * TS + 12, d = Math.hypot(x - P.x, y - P.y);
    if (d > 200 && d < 560) { s.e = makeEnemy(s.type, s.lvl, x, y); enemies.push(s.e); }
  }
  if (peace) for (const e of enemies) if (!e.d.boss && !e.aggro && !e.friend) e.dead = true;
  enemies = enemies.filter((e) => !e.dead);
}

/* ---------- Взаимодействие, триггеры ---------- */
function updateFocus() {
  focus = null;
  if (P.dead) return;
  let bd = 26;
  // дрогнувшие машины — уговорить
  for (const e of enemies) {
    if (e.dead || !(e.waverT > 0)) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y) - e.r - 8;
    if (d < bd) { bd = d; focus = { act: () => befriend(e), label: 'Уговорить', ref: e, mercy: true }; }
  }
  for (const e of enemies) {
    if (!e.calm || e.dead) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y) - e.r;
    if (d < bd) { bd = d; focus = { act: () => runDialog([[{ name: BOSSES[e.type].name, face: 'mon:' + e.type }, BOSSES[e.type].talk]]), label: 'Говорить', ref: e }; }
  }
  for (const n of npcs) {
    if (n === K && K.follower) continue;
    const d = Math.hypot(n.x - P.x, n.y - P.y);
    if (d < bd) { bd = d; focus = { act: () => talkTo(n), label: 'Говорить', ref: n }; }
  }
  for (const o of objs) {
    if (!o.enabled() || !o.visible()) continue;
    const d = Math.hypot(o.x - P.x, o.y - P.y);
    if (d < bd + 2) { bd = d; focus = { act: o.act, label: o.label, ref: o }; }
  }
  if (!focus && K.follower && P.idleT > 1 && !bossOn && Math.hypot(K.x - P.x, K.y - P.y) < 24) focus = { act: () => talkTo(K), label: 'Говорить', ref: K };
}
function talkTo(n) {
  faceTo(n, P.x - n.x, P.y - n.y);
  runDialog(n.talk());
}
let gateHintT = 0;
function updateTriggers(dt) {
  const st = LS();
  // маяк
  const [bx, by] = MAP.spots.beacon;
  const bd = Math.hypot(bx * TS + 8 - P.x, by * TS + 12 - P.y);
  if (bd < 18 && !P.atBeacon) {
    P.atBeacon = true;
    const first = !st.bc;
    st.bc = true; F.cp = curMap; P.hp = maxHp();
    sfx('beacon'); burst(bx * TS + 8, by * TS - 8, 14, '#5af0ff', 40, 0.7, -20);
    toast(first ? 'Маяк активирован: здесь ты будешь возрождаться' : 'Маяк: здоровье восстановлено, игра сохранена');
    saveGame();
  } else if (bd > 40) P.atBeacon = false;
  // мониторы Хроноса заговаривают при первой встрече
  for (const o of objs) {
    if (!o.monitor) continue;
    if (Math.hypot(o.x - P.x, o.y - P.y) < 60 && !F.chronoSaid[curMap]) {
      F.chronoSaid[curMap] = true;
      bark('chronos', CHRONO_LINES[curMap] || 'Я ВИЖУ ТЕБЯ.');
      sfx('warn');
    }
  }
  // переходы между локациями
  gateHintT -= dt;
  const ptx = P.x / TS, pty = P.y / TS;
  for (const z of MAP.zones) {
    const cxz = (z.x0 + z.x1 + 1) / 2, cyz = (z.y0 + z.y1 + 1) / 2;
    const near = Math.hypot(ptx - cxz, pty - cyz);
    if (!gateOpen(z.dir)) {
      if (near < 3.2 && gateHintT <= 0) { gateHintT = 4; bark('katya', GATE_HINT[curMap + ':' + z.dir] || 'Здесь пока не пройти.'); }
      continue;
    }
    const inside = (z.dir === 'e' && ptx > MW - 1.2) || (z.dir === 'w' && ptx < 1.2) || (z.dir === 's' && pty > MH - 1.1) || (z.dir === 'n' && pty < 1.3);
    if (inside && near < 4) { startTransition(z.to, z.dir); return; }
  }
  // Ржавый город: стена у Яны
  if (MAP.wallGate && !F.yana && gateHintT <= 0) {
    const wg = MAP.wallGate;
    if (Math.abs(pty - wg.y0) < 2.5 && ptx > wg.x0 - 2 && ptx < wg.x1 + 3) { gateHintT = 4; bark('katya', 'Ворота закрыты. Поговори с девушкой у входа.'); }
  }
  // встреча с Хроносом
  if (curMap === 'logovo' && F.stage === 11 && !coreEnt() && !st.boss) {
    const [ax, ay] = MAP.spots.arena;
    if (Math.hypot(ax * TS - P.x, ay * TS - P.y) < 150) {
      spawnChronos();
      if (!F.chronosMet) { F.chronosMet = true; runDialog(chronosMeetDialog()); }
      else bark('chronos', 'ТЫ ВЕРНУЛСЯ. Я ПОМНЮ КАЖДЫЙ ТВОЙ УДАР.');
    }
  }
  if (killStreakT > 0) { killStreakT -= dt; if (killStreakT <= 0) killStreak = 0; }
}

/* ---------- Смена локаций с затенением ---------- */
function startTransition(to, dir) {
  if (trans) return;
  trans = { phase: 'out', t: 0, to, dir };
  sfx('whoosh');
}
function updateTransition(dt) {
  trans.t += dt;
  if (trans.phase === 'out' && trans.t >= 0.4) {
    enterMap(trans.to, OPP[trans.dir]);
    trans.phase = 'in'; trans.t = 0;
  } else if (trans.phase === 'in' && trans.t >= 0.45) trans = null;
}
function fadeAlpha() {
  if (!trans) return 0;
  return trans.phase === 'out' ? clamp(trans.t / 0.4, 0, 1) : clamp(1 - trans.t / 0.45, 0, 1);
}
// вход на карту: со стороны side, на маяк (atBeacon) или в сохранённую точку (pos)
function enterMap(id, side, atBeacon, pos) {
  setMap(id);
  F.map = id;
  const sp = MAP.spots;
  let p;
  if (pos) p = pos;
  else if (side && sp.entry[side]) p = [sp.entry[side][0] * TS + 8, sp.entry[side][1] * TS + 8];
  else if (atBeacon) p = [sp.beacon[0] * TS + 8, sp.beacon[1] * TS + 26];
  else if (sp.house) p = [(sp.house[0] + 2) * TS + 8, (sp.house[1] + 4) * TS + 4];
  else p = [sp.hub[0] * TS + 8, sp.hub[1] * TS + 8];
  P.x = p[0]; P.y = p[1]; P.kx = P.ky = 0; P.pull = null; P.atBeacon = !!atBeacon;
  hazards = []; bullets = [];
  buildEntities();
  if (blocked(P.x, P.y, 4, 3)) unstick();
  if (K.follower) { K.x = P.x - 10; K.y = P.y + 2; if (blocked(K.x, K.y, 4, 3)) { K.x = P.x; K.y = P.y; } }
  const first = !F.seenMaps[id];
  F.seenMaps[id] = true;
  areaToast(LOC_BY[id].name);
  if (first && K.follower && LOC_REMARK[id]) setTimeout(() => { if (curMap === id) bark('katya', LOC_REMARK[id]); }, 1700);
  snapCam();
  saveGame();
}
function unstick() {
  for (let r = 1; r < 16; r++) for (let a = 0; a < 8; a++) {
    const x = P.x + Math.cos(a * Math.PI / 4) * r * 8, y = P.y + Math.sin(a * Math.PI / 4) * r * 8;
    if (!blocked(x, y, 4, 3)) { P.x = x; P.y = y; return; }
  }
}
const LOC_REMARK = {
  pustosh: 'Пустошь. Здесь была трасса и склады. Я ездила тут на велосипеде.',
  rzhavy: 'Ржавый город… Здесь люди прятались дольше всех.',
  metro: 'Темно. Держись ближе.',
  stalnoy: 'Всё блестит. И ни одного человека. Только машины и Алиса.',
  logovo: 'Здесь стоял наш институт. Он перестроил его под себя.',
  kladb: 'Кладбище машин. Сюда приходят умирать сломанные роботы.',
  boloto: 'Болото. Осторожно, тут всё ржавеет за неделю.',
  poselok: 'Посёлок «Рассвет». Сто домов. Почти все пустые.',
  les: 'Лес вырос за пять лет. Машины не стригут то, что им не нужно.',
  shkola: 'Моя школа была такой же. Только без дронов в коридорах.',
  rynok: 'Чёрный рынок. Здесь меняют детали — иногда свои собственные.',
  bolnica: 'Больница. Не люблю больницы. Особенно пустые.',
  ozera: 'Соль хрустит под ногами. Красиво и мёртво.',
  kanyon: 'Каньон Ветров. Слышишь, как воет?',
  observ: 'Обсерватория. Отсюда видно полмира.',
  stadion: 'Стадион. Последний матч так и не доиграли.',
  tele: 'Телецентр. Отсюда Хронос говорит со всеми экранами сразу.',
  zavod: 'Завод машин. Здесь рождаются его солдаты.',
  podst: 'Подстанция «Искра» — первый узел щита.',
  port: 'Порт. Корабли стоят пять лет.',
  ges: 'ГЭС. Второй узел щита — турбина.',
  aero: 'Аэропорт. Небо закрыто.',
  krio: 'Холодно… Третий узел щита где-то здесь.',
  data: 'Дата-центр. Память Хроноса. И Страж-7.',
};

/* ---------- Камера ---------- */
function camTarget() {
  let fx = P.x, fy = P.y - 14;
  if (bossOn && bossOn.aggro && Math.hypot(bossOn.x - P.x, bossOn.y - P.y) < 260) {
    fx = P.x * 0.6 + bossOn.x * 0.4; fy = (P.y - 14) * 0.6 + (bossOn.y - bossOn.hy) * 0.4;
  }
  return { x: clamp(fx - GW / 2, 0, Math.max(0, MW * TS - GW)), y: clamp(fy - GH / 2, 0, Math.max(0, MH * TS - GH)) };
}
function snapCam() { const t = camTarget(); cam.x = t.x; cam.y = t.y; }

/* ---------- Главный шаг ---------- */
function updateGame(dt) {
  updatePlayer(dt);
  updateNPCs(dt);
  for (const e of enemies) {
    if (e.dead) continue;
    if (!e.d.boss && !e.friend && (Math.abs(e.x - P.x) > 420 || Math.abs(e.y - P.y) > 300)) continue;
    updateEnemy(e, dt);
  }
  enemies = enemies.filter((e) => !e.dead);
  if (bossOn && (bossOn.dead || bossOn.calm || (!bossOn.aggro && bossOn.type !== 'chronos'))) bossOn = null;
  if (P.pull && !enemies.some((e) => e.st === 'sucking')) P.pull = null;
  updateBullets(dt);
  updateHazards(dt);
  updatePicks(dt);
  updateSpawns(dt);
  updateFocus();
  updateTriggers(dt);
  const t = camTarget();
  cam.x += (t.x - cam.x) * Math.min(1, dt * 8);
  cam.y += (t.y - cam.y) * Math.min(1, dt * 8);
  saveT -= dt;
  if (saveT <= 0) { saveT = 25; saveGame(); }
}
function updateDead(dt) {
  P.deadT -= dt;
  for (const e of enemies) if (!e.dead && e.aggro && !e.d.part) { e.aggro = false; e.returning = true; }
  if (P.deadT <= 0) respawn();
}

/* ---------- Отрисовка ---------- */
let VIEW = { x0: 0, y0: 0, x1: 0, y1: 0 };
const GRASSY = (t) => t === TILE.GRASS || t === TILE.FGRASS;
function drawTiles(cx, cy) {
  const tx0 = Math.max(0, (cx / TS) | 0), ty0 = Math.max(0, (cy / TS) | 0);
  const tx1 = Math.min(MW - 1, ((cx + GW) / TS) | 0), ty1 = Math.min(MH - 1, ((cy + GH) / TS) | 0);
  const wf = ((time * 1.5) | 0) % 2;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * MW + tx, t = tiles[i], set = TILES[t];
      let v = tileVar[i];
      if (t === TILE.WATER) v = (v + wf) % 2;
      else if (t === TILE.WALL || t === TILE.CWALL) v = v === 9 || (t === TILE.CWALL && v === 1) ? 1 : 0;
      else v = v % set.length;
      const x = tx * TS - cx, y = ty * TS - cy;
      ctx.drawImage(set[v % set.length], x, y);
      if (t === TILE.WATER) {
        if (ty > 0 && tiles[i - MW] !== TILE.WATER) ctx.drawImage(EDGES.wn, x, y);
        if (ty < MH - 1 && tiles[i + MW] !== TILE.WATER) ctx.drawImage(EDGES.ws, x, y);
        if (tx > 0 && tiles[i - 1] !== TILE.WATER) ctx.drawImage(EDGES.ww, x, y);
        if (tx < MW - 1 && tiles[i + 1] !== TILE.WATER) ctx.drawImage(EDGES.we, x, y);
      } else if (!GRASSY(t) && t !== TILE.WALL && t !== TILE.CWALL) {
        if (ty > 0 && GRASSY(tiles[i - MW])) ctx.drawImage(EDGES.gn, x, y);
        if (ty < MH - 1 && GRASSY(tiles[i + MW])) ctx.drawImage(EDGES.gs, x, y);
        if (tx > 0 && GRASSY(tiles[i - 1])) ctx.drawImage(EDGES.gw, x, y);
        if (tx < MW - 1 && GRASSY(tiles[i + 1])) ctx.drawImage(EDGES.ge, x, y);
      }
    }
  }
}
const vis = (x, y, w, h) => x + w > VIEW.x0 && x < VIEW.x1 && y + h > VIEW.y0 && y < VIEW.y1;
function drawImg(img, x, y, flip, white) {
  const src = white ? whiteOf(img) : img;
  x = Math.round(x); y = Math.round(y);
  if (flip) { ctx.save(); ctx.translate(x + img.width, y); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0); ctx.restore(); }
  else ctx.drawImage(src, x, y);
}
function humanImg(set, o) {
  const frames = set[o.dir] || set.down;
  return frames[o.moving ? 1 + (((o.anim * 7) | 0) % 2) : 0];
}
function drawShadow(k, x, y) { const s = SHADOW[k]; ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2)); }
function drawPerson(set, o, cx, cy, white) {
  const img = humanImg(set, o);
  const tall = img.height >= 30;
  drawImg(img, o.x - 8 - cx, o.y - (tall ? 31 : 21) - cy, o.dir === 'side' && o.face < 0, white);
}

function bossFrame(e) {
  const fr = MON[e.d.spr];
  if (e.type === 'alisa') return fr[(e.hp < e.maxHp * 0.5 && !e.calm ? 4 : 0) + (((time * 6) | 0) % 4)];
  if (e.type === 'vacuum') return fr[((time * (e.st === 'spinning' ? 20 : 6)) | 0) % fr.length];
  return fr[((e.anim * (e.moving ? 7 : 3)) | 0) % fr.length];
}
function drawEnemy(e, cx, cy) {
  const flash = e.flash > 0 || (e.st === 'arm' && ((time * 12) | 0) % 2 === 0) || (e.st === 'wind' && ((time * 16) | 0) % 2 === 0);
  if (e.d.part !== undefined) { drawPart(e, cx, cy, flash); return; }
  let img;
  if (e.d.human) img = humanImg(SPR.guard, e);
  else if (e.d.tall) img = humanImg(SPR.half[e.var], e);
  else img = e.d.boss ? bossFrame(e) : MON[e.d.spr][((e.anim * (e.moving ? 7 : 3)) | 0) % MON[e.d.spr].length];
  const bob = e.d.fly ? 5 + Math.sin(e.t * 4) * 2 : 0;
  drawShadow(e.d.sh, e.x - cx, e.y - cy);
  const x = e.x - img.width / 2 - cx, y = e.y - img.height - cy - bob - e.z + (e.d.tall ? 1 : 0);
  if (e.handT > 0) { const H = MON.hand[((time * 4) | 0) % 2]; e.handT -= 1 / 60; drawImg(H, e.handX - 11 - cx, e.handY - 40 - cy + e.handT * 20, false); }
  const sideways = !(e.d.human || e.d.tall);
  if (e.friend) ctx.globalAlpha = e.friendT < 2 ? Math.max(0, e.friendT / 2) : 1;
  drawImg(img, x, y, sideways ? e.face < 0 : e.dir === 'side' && e.face < 0, flash);
  ctx.globalAlpha = 1;
  if (e.d.eye) drawEyeAt(ctx, Math.round(e.x - 4 - cx), Math.round(y + 3), 8, 6, P.x - cx, P.y - 14 - cy, 'red');
  if (e.waverT > 0 && ((time * 6) | 0) % 2) {
    const g = glyphImg('?', '#ff9ad0');
    ctx.drawImage(g, Math.round(e.x - 4 - cx), Math.round(y - 12), g.width * 2, g.height * 2);
  }
  if (e.friend || e.calm) ctx.drawImage(ICON.heart2, Math.round(e.x - 4 - cx), Math.round(y - 10 + Math.sin(time * 4)));
}
function drawPart(e, cx, cy, flash) {
  const core = coreEnt();
  if (e.type === 'chronos') {
    const img = MON.core[((time * 2) | 0) % 2];
    const x = e.x - img.width / 2 - cx, y = e.y - img.height - cy;
    drawShadow('xl', e.x - cx, e.y - cy);
    drawImg(img, x, y, false, flash);
    drawEyeAt(ctx, x + 12, y + 10, 40, 26, P.x - cx, P.y - 14 - cy, e.shield ? 'red' : 'purple', e.pleaded ? 0.6 : 1);
    if (e.shield) { ctx.strokeStyle = `rgba(192,132,255,${0.4 + Math.sin(time * 5) * 0.2})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(e.x - cx, e.y - 28 - cy, 38, 34, 0, 0, Math.PI * 2); ctx.stroke(); }
    return;
  }
  if (e.type === 'csock' && core) {
    // провод к ядру
    ctx.strokeStyle = '#2a2342'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(e.x - cx, e.y - 4 - cy);
    ctx.quadraticCurveTo((e.x + core.x) / 2 - cx, Math.max(e.y, core.y) + 20 - cy, core.x - cx, core.y - 4 - cy); ctx.stroke();
    ctx.strokeStyle = ((time * 8 + e.x) | 0) % 2 ? '#c084ff' : '#5a2a8a'; ctx.lineWidth = 1; ctx.stroke();
  }
  if (e.type === 'carm') {
    // сегменты руки от крепления к кисти
    const mx = (e.ax + e.x) / 2 + (e.x > e.ax ? -10 : 10), my = Math.min(e.ay, e.y) - 26;
    ctx.strokeStyle = '#2a2342'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(e.ax - cx, e.ay - 10 - cy); ctx.lineTo(mx - cx, my - cy); ctx.lineTo(e.x - cx, e.y - 10 - cy); ctx.stroke();
    ctx.strokeStyle = flash ? '#ffffff' : '#6d6596'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#c084ff'; ctx.fillRect(Math.round(mx - 2 - cx), Math.round(my - 2 - cy), 4, 4);
    const H = MON.hand[e.st === 'slam' ? 1 : 0];
    drawImg(H, e.x - H.width / 2 - cx, e.y - H.height - cy, e.x < e.ax, flash);
    return;
  }
  const fr = MON[e.d.spr];
  const img = fr[((time * 2) | 0) % fr.length];
  drawShadow(e.d.sh, e.x - cx, e.y - cy);
  const x = e.x - img.width / 2 - cx, y = e.y - img.height - cy;
  drawImg(img, x, y, false, flash);
  if (e.type === 'cmon') drawEyeAt(ctx, x + 4, y + 4, 16, 10, P.x - cx, P.y - 14 - cy, 'red', e.blink < 0 ? 0 : 1);
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0b0d14'; ctx.fillRect(0, 0, GW, GH);
  if (mode === 'cut') { renderCut(); return; }
  const sx = shake > 0.3 ? Math.round(rnd(-shake, shake)) : 0, sy = shake > 0.3 ? Math.round(rnd(-shake, shake)) : 0;
  const cx = Math.round(cam.x) + sx, cy = Math.round(cam.y) + sy;
  VIEW = { x0: cx - 8, y0: cy - 8, x1: cx + GW + 8, y1: cy + GH + 90 };
  drawTiles(cx, cy);
  for (const p of MAP.props) if (p.flat && vis(p.px, p.py, p.img.width, p.img.height)) ctx.drawImage(p.img, p.px - cx, p.py - cy);
  for (const h of hazards) {
    if (h.delay > 0) continue;
    const k = 1 - h.t / h.T;
    if (h.k === 'c') {
      const ice = h.col === 'ice';
      ctx.fillStyle = ice ? 'rgba(120,200,255,0.2)' : 'rgba(255,40,60,0.18)'; ctx.beginPath(); ctx.arc(h.x - cx, h.y - cy, h.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ice ? 'rgba(160,230,255,0.4)' : 'rgba(255,60,60,0.35)'; ctx.beginPath(); ctx.arc(h.x - cx, h.y - cy, h.r * k, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ice ? 'rgba(200,240,255,0.9)' : 'rgba(255,120,120,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(h.x - cx, h.y - cy, h.r, 0, Math.PI * 2); ctx.stroke();
    } else {
      const a = Math.atan2(h.y2 - h.y1, h.x2 - h.x1), L = Math.hypot(h.x2 - h.x1, h.y2 - h.y1);
      ctx.save(); ctx.translate(h.x1 - cx, h.y1 - cy); ctx.rotate(a);
      ctx.fillStyle = h.warnOnly ? 'rgba(255,200,60,0.18)' : 'rgba(255,40,120,0.18)'; ctx.fillRect(0, -h.w / 2, L, h.w);
      ctx.fillStyle = h.warnOnly ? 'rgba(255,200,60,0.35)' : 'rgba(255,60,140,0.4)'; ctx.fillRect(0, -h.w / 2 * k, L, h.w * k);
      ctx.restore();
    }
  }
  const L = [];
  for (const p of MAP.props) if (!p.flat && vis(p.px, p.py, p.img.width, p.img.height)) L.push({ y: p.sy, k: 0, o: p });
  for (const o of objs) if (o.img && o.visible() && vis(o.x - 30, o.y - 60, 60, 70)) L.push({ y: o.y, k: 1, o });
  for (const n of npcs) if (vis(n.x - 10, n.y - 34, 20, 36)) L.push({ y: n.y, k: 2, o: n });
  for (const e of enemies) if (!e.dead && (e.d.part !== undefined || vis(e.x - 40, e.y - 80, 80, 90))) L.push({ y: e.type === 'csock' ? e.y - 400 : e.y, k: 3, o: e });
  for (const p of picks) if (vis(p.x - 6, p.y - 12, 12, 14)) L.push({ y: p.y, k: 4, o: p });
  for (const z of MAP.zones) if (!gateOpen(z.dir)) L.push({ y: (z.y1 + 1) * TS - 1, k: 5, o: z });
  if (MAP.wallGate && !F.yana) L.push({ y: (MAP.wallGate.y1 + 1) * TS - 1, k: 5, o: MAP.wallGate });
  if (mode !== 'title' && P && !(P.dead && P.deadT < 1.6)) L.push({ y: P.y, k: 6, o: P });
  L.sort((a, b) => a.y - b.y);
  for (const it of L) {
    const o = it.o;
    switch (it.k) {
      case 0: ctx.drawImage(o.img, o.px - cx, o.py - cy); break;
      case 1: {
        const img = o.img();
        if (o.glow) { ctx.fillStyle = `rgba(255,240,150,${0.25 + Math.sin(time * 5) * 0.15})`; ctx.fillRect(Math.round(o.x - cx - 7), Math.round(o.y - cy - 15), 14, 14); }
        drawShadow('s', o.x - cx, o.y - cy);
        const ox = o.x - img.width / 2 - cx, oy = o.y - img.height - cy + 2 - (o.glow ? 2 + Math.sin(time * 3) * 1.5 : 0);
        drawImg(img, ox, oy, false);
        if (o.monitor) drawEyeAt(ctx, ox + 4, oy + 4, 16, 10, P.x - cx, P.y - 14 - cy, 'red', ((time * 0.4 + o.x) % 4) < 0.12 ? 0 : 1);
        break;
      }
      case 2: {
        drawShadow('s', o.x - cx, o.y - cy);
        if (o.mon) drawImg(o.mon[((time * 2) | 0) % o.mon.length], o.x - o.mon[0].width / 2 - cx, o.y - o.mon[0].height - cy, false);
        else drawPerson(o.spr, o, cx, cy);
        break;
      }
      case 3: drawEnemy(o, cx, cy); break;
      case 4: {
        const img = o.type === 'scrap' ? ICON.scrap : ICON.med;
        drawShadow('s', o.x - cx, o.y - cy);
        if (o.t > 5 || ((time * 8) | 0) % 2) ctx.drawImage(img, Math.round(o.x - 5 - cx), Math.round(o.y - 10 - o.z - cy));
        break;
      }
      case 5: drawGate(o, cx, cy); break;
      case 6: drawHero(cx, cy); break;
      default: break;
    }
  }
  for (const b of bullets) {
    ctx.fillStyle = b.col; ctx.fillRect(Math.round(b.x - b.r - cx), Math.round(b.y - b.r - cy), b.r * 2, b.r * 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x - 0.5 - cx), Math.round(b.y - 0.5 - cy), 1, 1);
  }
  for (const s of slashes) {
    const k = 1 - s.t / s.T, R = s.big ? 16 : 12;
    ctx.strokeStyle = `rgba(150,240,255,${1 - k})`; ctx.lineWidth = s.big ? 4 : 3;
    ctx.beginPath(); ctx.arc(Math.round(P.x - cx), Math.round(P.y - 12 - cy), R, s.a - 1.3, s.a - 1.3 + 2.6 * Math.min(1, k * 1.6)); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(Math.round(P.x - cx), Math.round(P.y - 12 - cy), R + 1, s.a - 1.1, s.a - 1.1 + 2.2 * Math.min(1, k * 1.6)); ctx.stroke();
    // искры тока с роборуки
    if (k < 0.7) for (let i = 0; i < 2; i++) { const a = s.a + rnd(-0.8, 0.8); ctx.fillStyle = '#e8ffff'; ctx.fillRect(Math.round(P.x - cx + Math.cos(a) * (R + rnd(0, 4))), Math.round(P.y - 12 - cy + Math.sin(a) * (R + rnd(0, 4))), 1, 1); }
  }
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.size, p.size);
  }
  ctx.globalAlpha = 1;
  if (mode !== 'title' && mode !== 'ending') drawOverlays(cx, cy);
  const tint = BIOMES[LOC_BY[curMap].biome].tint;
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, GW, GH); }
  if (redFlash > 0) { ctx.fillStyle = `rgba(255,0,0,${redFlash * 0.6})`; ctx.fillRect(0, 0, GW, GH); }
  const fa = fadeAlpha();
  if (fa > 0) { ctx.fillStyle = `rgba(4,4,10,${fa})`; ctx.fillRect(0, 0, GW, GH); }
}
function drawHero(cx, cy) {
  if (P.inv > 0 && !P.dead && ((time * 14) | 0) % 2 === 0) return;
  drawShadow('s', P.x - cx, P.y - cy);
  drawPerson(SPR.hero, P, cx, cy, P.dead);
  // светящийся кулак роборуки во время удара
  if (P.atkT > 0 || P.skillT > 0) {
    const a = P.atkT > 0 ? P.atkA : time * 30;
    ctx.fillStyle = ((time * 30) | 0) % 2 ? '#bff6ff' : '#5af0ff';
    ctx.fillRect(Math.round(P.x - cx + Math.cos(a) * 9) - 1, Math.round(P.y - 12 - cy + Math.sin(a) * 7) - 1, 3, 3);
  }
}
function drawGate(g, cx, cy) {
  const vert = g.x0 === g.x1 && g.y0 !== g.y1;
  const col = g.id === 'yana' ? [255, 180, 60] : [90, 220, 255];
  for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) {
    const px = x * TS - cx, py = y * TS - cy;
    for (let k = 0; k < 4; k++) {
      const a = 0.35 + 0.35 * Math.sin(time * 6 + k * 1.7 + x + y);
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
      if (vert) ctx.fillRect(px + 4 + k * 2, py - 14, 1, 30); else ctx.fillRect(px, py - 14 + k * 4, 16, 1);
    }
  }
}
function questTarget() {
  const q = questInfo();
  if (!q.map) return null;
  if (q.map !== curMap) {
    const d = routeStep(curMap, q.map);
    const z = d && MAP.zones.find((zz) => zz.dir === d);
    return z ? { x: ((z.x0 + z.x1 + 1) / 2) * TS, y: ((z.y0 + z.y1 + 1) / 2) * TS, exit: true } : null;
  }
  const sp = MAP.spots;
  if (q.spot === 'katya') return { x: K.x, y: K.y - 18 };
  if (q.spot === 'arena') { const b = coreEnt() || enemies.find((e) => e.d.boss && !e.d.part); return b ? { x: b.x, y: b.y - b.hy } : { x: sp.arena[0] * TS + 8, y: sp.arena[1] * TS }; }
  if (q.spot === 'house' && sp.house) return { x: (sp.house[0] + 2) * TS, y: (sp.house[1] + 6) * TS };
  if (q.spot === 'archive') return { x: sp.hub[0] * TS + 8, y: (sp.hub[1] - 3.6) * TS };
  if (q.spot && q.spot.startsWith('npc:')) { const n = npcs.find((nn) => nn.id === q.spot.slice(4)); return n ? { x: n.x, y: n.y - 26 } : null; }
  return { x: sp.hub[0] * TS + 8, y: sp.hub[1] * TS };
}
function drawOverlays(cx, cy) {
  for (const e of enemies) {
    if (e.dead || e.d.boss || e.friend) continue;
    if (!vis(e.x - 10, e.y - 30, 20, 40)) continue;
    const col = e.lvl > P.lvl + 2 ? '#ff6a6a' : e.lvl > P.lvl ? '#ffd93a' : '#e8f0ff';
    const g = glyphImg('Ур' + e.lvl, col);
    ctx.drawImage(g, Math.round(e.x - g.width / 2 - cx), Math.round(e.y + 1 - cy));
    if (e.hp < e.maxHp) {
      const bx = Math.round(e.x - 8 - cx), by = Math.round(e.y - e.hy - e.r - 10 - cy - (e.d.fly ? 6 : 0) - (e.d.tall ? 8 : 0));
      ctx.fillStyle = '#1b1426'; ctx.fillRect(bx - 1, by - 1, 18, 4);
      ctx.fillStyle = e.waverT > 0 ? '#ff9ad0' : '#ff4a5a'; ctx.fillRect(bx, by, Math.max(1, Math.round(16 * e.hp / e.maxHp)), 2);
    }
  }
  // полоски здоровья частей Хроноса
  for (const e of enemies) {
    if (e.dead || !e.d.part || e.hp >= e.maxHp) continue;
    const bx = Math.round(e.x - 10 - cx), by = Math.round(e.y - e.hy - 18 - cy);
    ctx.fillStyle = '#1b1426'; ctx.fillRect(bx - 1, by - 1, 22, 4);
    ctx.fillStyle = '#c084ff'; ctx.fillRect(bx, by, Math.max(1, Math.round(20 * e.hp / e.maxHp)), 2);
  }
  for (const n of npcs) {
    const m = n.marker && n.marker();
    if (!m) continue;
    const g = glyphImg(m, '#ffd93a');
    ctx.drawImage(g, Math.round(n.x - g.width - cx), Math.round(n.y - (n.tall ? 48 : 38) - cy + Math.sin(time * 5) * 2), g.width * 2, g.height * 2);
  }
  if (focus && mode === 'play' && !focus.mercy) {
    const r = focus.ref;
    const g = glyphImg('!', '#7fe9ff');
    ctx.drawImage(g, Math.round(r.x - 3 - cx), Math.round(r.y - (r.kind === 'npc' ? (r.tall ? 40 : 30) : 26) - cy + Math.sin(time * 6)));
  }
  for (const f of floats) {
    const g = glyphImg(f.txt, f.col);
    ctx.globalAlpha = clamp(f.t / 0.3, 0, 1);
    ctx.drawImage(g, Math.round(f.x - g.width / 2 - cx), Math.round(f.y - cy));
  }
  ctx.globalAlpha = 1;
  const tgt = questTarget();
  if (tgt && mode === 'play') {
    const sx = tgt.x - cx, sy = tgt.y - cy;
    if (sx < 6 || sy < 6 || sx > GW - 6 || sy > GH - 6) {
      const ox = P.x - cx, oy = P.y - 14 - cy, a = Math.atan2(sy - oy, sx - ox);
      const ax = ox + Math.cos(a) * 28, ay = oy + Math.sin(a) * 22;
      ctx.save(); ctx.translate(Math.round(ax), Math.round(ay)); ctx.rotate(a);
      ctx.fillStyle = '#1b1426'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = tgt.exit ? '#7fe9ff' : '#ffd93a'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, -3); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      const bob = Math.sin(time * 5) * 2;
      ctx.fillStyle = '#1b1426'; ctx.beginPath(); ctx.moveTo(sx - 5, sy - 22 + bob); ctx.lineTo(sx + 5, sy - 22 + bob); ctx.lineTo(sx, sy - 15 + bob); ctx.fill();
      ctx.fillStyle = tgt.exit ? '#7fe9ff' : '#ffd93a'; ctx.beginPath(); ctx.moveTo(sx - 3, sy - 21 + bob); ctx.lineTo(sx + 3, sy - 21 + bob); ctx.lineTo(sx, sy - 17 + bob); ctx.fill();
    }
  }
  // подписи переходов у краёв карты
  for (const z of MAP.zones) {
    const zx = ((z.x0 + z.x1 + 1) / 2) * TS - cx, zy = ((z.y0 + z.y1 + 1) / 2) * TS - cy;
    if (zx < -60 || zy < -30 || zx > GW + 60 || zy > GH + 30) continue;
    const open = gateOpen(z.dir);
    const name = (open ? '' : '× ') + LOC_BY[z.to].name;
    const g = glyphImg(name, open ? '#bff6ff' : '#ff8a8a');
    const ty = z.dir === 'n' ? zy + 22 : z.dir === 's' ? zy - 26 : zy - 20;
    const tx = z.dir === 'e' ? zx - g.width - 8 : z.dir === 'w' ? zx + 8 : zx - g.width / 2;
    ctx.drawImage(g, Math.round(clamp(tx, 2, GW - g.width - 2)), Math.round(clamp(ty, 2, GH - 10)));
  }
}

/* ---------- Портреты в диалогах ---------- */
const FACES = {};
function faceCanvas(key) {
  if (FACES[key]) return FACES[key];
  let f = null;
  const tallFace = (set, holo) => [holo ? holoOf(set.down[0]) : set.down[0], 1, 0, 14, 14];
  if (key === 'lev') f = tallFace(SPR.lev, true);
  else if (SPR[key] && SPR[key].down && SPR[key].down[0].height >= 30) f = tallFace(SPR[key]);
  else if (key === 'rusty' || key === 'android') f = [SPR[key].down[0], 2, 1, 12, 12];
  else if (key === 'shop') f = [MON.shopbot[0], 1, 2, 16, 16];
  else if (key === 'term') f = [PROPS.terminal[1], 1, 3, 12, 12];
  else if (key === 'chronos') {
    const c = mkCanvas(24, 22), x = c.getContext('2d');
    x.drawImage(MON.mon[0], 0, 0); drawEyeAt(x, 4, 4, 16, 10, 12, 30, 'red');
    f = [c, 1, 1, 22, 16];
  } else if (key.startsWith('mon:')) {
    const k = key.slice(4), set = MON[BDEF[k] ? BDEF[k].spr : k] || MON[k];
    if (set) {
      const img = set[0], s = Math.max(img.width, img.height);
      f = [img, (img.width - s) / 2, (img.height - s) / 2, s, s];
    }
  } else if (MON[key]) {
    const img = MON[key][0], s = Math.max(img.width, img.height);
    f = [img, (img.width - s) / 2, (img.height - s) / 2, s, s];
  }
  FACES[key] = f;
  return f;
}
function paintFace(canvas, key) {
  const c = canvas.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, canvas.width, canvas.height);
  const f = key && faceCanvas(key);
  if (!f) return;
  const [img, sx, sy, sw, sh] = f;
  c.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
}

// Диалоги
let dlg = null;
function runDialog(script, onDone) {
  if (!script || !script.length) { if (onDone) onDone(); return; }
  if (dlg) { dlg.queue.push(...script); return; }
  dlg = { queue: script.slice(), onDone, full: '', shown: 0, choosing: false };
  mode = 'dialog';
  inp.atk = false; btnHeld.atk = false;
  $('dialog').classList.remove('hidden');
  $('controls').classList.add('dim');
  nextLine();
}
function queueDialog(script) { if (dlg) dlg.queue.unshift(...script); else runDialog(script); }
function nextLine() {
  while (dlg && dlg.queue.length && typeof dlg.queue[0] === 'function') dlg.queue.shift()();
  if (!dlg) return;
  if (!dlg.queue.length) { endDialog(); return; }
  const item = dlg.queue.shift();
  const box = $('dChoices');
  if (item.choice) {
    dlg.choosing = true; dlg.choices = item.choice;
    box.innerHTML = '';
    item.choice.forEach(([label], i) => {
      const b = document.createElement('button');
      b.textContent = (i + 1) + '. ' + label;
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); chooseDialog(i); });
      box.appendChild(b);
    });
    box.classList.remove('hidden');
    $('dMore').classList.add('hidden');
    return;
  }
  const [who, text] = item;
  const ch = typeof who === 'string' ? CHARS[who] : who;
  $('dName').textContent = ch.name;
  $('dName').className = 'd-name ' + (typeof who === 'string' ? who : 'other');
  paintFace($('dFace'), ch.face);
  dlg.full = text; dlg.shown = 0;
  $('dText').textContent = '';
  $('dMore').classList.add('hidden');
}
function advanceDialog() {
  if (!dlg || dlg.choosing) return;
  if (dlg.shown < dlg.full.length) { dlg.shown = dlg.full.length; $('dText').textContent = dlg.full; $('dMore').classList.remove('hidden'); return; }
  nextLine();
}
function chooseDialog(i) {
  if (!dlg || !dlg.choosing || !dlg.choices[i]) return;
  const fn = dlg.choices[i][1];
  dlg.choosing = false;
  $('dChoices').classList.add('hidden');
  if (fn) fn();
  if (dlg) nextLine();
}
function endDialog() {
  $('dialog').classList.add('hidden');
  $('controls').classList.remove('dim');
  const cb = dlg.onDone;
  dlg = null;
  if (mode === 'dialog') mode = 'play';
  if (cb) cb();
}
function tickDialog(dt) {
  if (!dlg || dlg.choosing || dlg.shown >= dlg.full.length) return;
  const before = dlg.shown | 0;
  dlg.shown = Math.min(dlg.full.length, dlg.shown + dt * 55);
  if ((dlg.shown | 0) !== before) {
    $('dText').textContent = dlg.full.slice(0, dlg.shown | 0);
    if (before % 3 === 0) sfx('blip');
  }
  if (dlg.shown >= dlg.full.length) $('dMore').classList.remove('hidden');
}

/* ---------- Мультики: заставки начала и концовок ---------- */
let CUT = null;
function playCutscene(key, onDone) {
  const scenes = CUTS[key]();
  CUT = { scenes, i: 0, t: 0, onDone };
  mode = 'cut';
  $('hud').classList.add('hidden'); $('controls').classList.add('hidden');
  $('cut').classList.remove('hidden');
  $('dialog').classList.add('hidden');
  setTrack(key === 'loop' ? 'sad' : key === 'intro' ? 'boss2' : 'end');
  cutShow();
}
function cutShow() { $('cutText').textContent = CUT.scenes[CUT.i].cap; $('cutText').classList.remove('show'); void $('cutText').offsetWidth; $('cutText').classList.add('show'); }
function cutNext() {
  if (!CUT) return;
  if (CUT.t < 0.5) return;
  CUT.i++; CUT.t = 0;
  if (CUT.i >= CUT.scenes.length) { cutEnd(); return; }
  cutShow();
}
function cutSkipAll() { if (CUT) cutEnd(); }
function cutEnd() {
  const cb = CUT.onDone; CUT = null;
  $('cut').classList.add('hidden');
  mode = 'menu';
  if (cb) cb();
}
function updateCut(dt) {
  if (!CUT) return;
  CUT.t += dt;
  const sc = CUT.scenes[CUT.i];
  if (CUT.t >= sc.d) { CUT.i++; CUT.t = 0; if (CUT.i >= CUT.scenes.length) { cutEnd(); return; } cutShow(); }
}
function renderCut() {
  if (!CUT) return;
  const sc = CUT.scenes[CUT.i];
  const k = clamp(CUT.t / sc.d, 0, 1);
  ctx.save();
  sc.draw(CUT.t, k);
  ctx.restore();
  // затемнение на стыках сцен
  const fa = Math.max(0, 1 - CUT.t / 0.4, (CUT.t - sc.d + 0.4) / 0.4);
  if (fa > 0) { ctx.fillStyle = `rgba(4,4,10,${clamp(fa, 0, 1)})`; ctx.fillRect(0, 0, GW, GH); }
}
// помощники рисования сцен
const CX = () => GW / 2, CY = () => GH / 2;
function cutBg(top, bottom, horizon = 0.62) {
  const g = ctx.createLinearGradient(0, 0, 0, GH);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, GW, GH);
  return Math.round(GH * horizon);
}
function cutGround(y, col, tile) {
  ctx.fillStyle = col; ctx.fillRect(0, y, GW, GH - y);
  if (tile) for (let x = 0; x < GW; x += TS) for (let yy = y; yy < GH; yy += TS) ctx.drawImage(tile, x, yy);
}
function cutSpr(img, x, y, s = 2, flip = false, white = false) {
  const src = white ? whiteOf(img) : img;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(src, -img.width * s / 2, -img.height * s, img.width * s, img.height * s);
  ctx.restore();
}
function walkFrame(set, dir, t, moving = true) { const fr = set[dir]; return fr[moving ? 1 + (((t * 6) | 0) % 2) : 0]; }
function stars(n, seed) { const R = rng(seed); ctx.fillStyle = '#ffffff'; for (let i = 0; i < n; i++) { const a = 0.3 + 0.7 * Math.abs(Math.sin(time * 2 + i)); ctx.globalAlpha = a; ctx.fillRect((R() * GW) | 0, (R() * GH * 0.5) | 0, 1, 1); } ctx.globalAlpha = 1; }
function bigEye(x, y, w, h, tx, ty, col, open = 1) {
  const c = mkCanvas(w, h);
  drawEyeAt(c.getContext('2d'), 0, 0, w, h, tx - x, ty - y, col, open);
  return c;
}
function cutMonitor(x, y, s, tx, ty, col = 'red', open = 1) {
  const img = MON.mon[0];
  cutSpr(img, x, y, s);
  const ex = x - img.width * s / 2 + 4 * s, ey = y - img.height * s + 4 * s;
  const eye = bigEye(0, 0, 16, 10, (tx - ex) / s, (ty - ey) / s, col, open);
  ctx.drawImage(eye, ex, ey, 16 * s, 10 * s);
}
function cutClock(x, y, r, spin, col = '#c084ff') {
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.fillStyle = col; ctx.fillRect(Math.round(x + Math.cos(a) * (r - 4)) - 1, Math.round(y + Math.sin(a) * (r - 4)) - 1, 2, 2); }
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(spin) * r * 0.7, y + Math.sin(spin) * r * 0.7); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(spin * 12) * r * 0.9, y + Math.sin(spin * 12) * r * 0.9); ctx.stroke();
}
function cutRobots(y, n, t, seed, dir = 1) {
  const R = rng(seed), kinds = ['drone', 'cleaner', 'dog', 'scrapbot', 'hornet'];
  for (let i = 0; i < n; i++) {
    const set = MON[kinds[(R() * kinds.length) | 0]];
    const x = ((R() * GW * 1.4 + t * 40 * dir) % (GW * 1.4)) - GW * 0.2;
    cutSpr(set[((t * 6 + i) | 0) % set.length], x, y + R() * 20, 1, dir < 0);
  }
}
// экран Хроноса с живым зрачком: x, y — середина низа
function cutCore(x, y, s, col, open = 1, white = false, lookX = CX(), lookY = GH) {
  cutSpr(MON.core[0], x, y, s, false, white);
  const ex = x - 32 * s + 12 * s, ey = y - 56 * s + 10 * s;
  const eye = bigEye(0, 0, 40, 26, (lookX - ex) / s, (lookY - ey) / s, col, open);
  ctx.drawImage(eye, ex, ey, 40 * s, 26 * s);
}
function flashWhite(a) { if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${clamp(a, 0, 1)})`; ctx.fillRect(0, 0, GW, GH); } }
function timeRings(t, col = '192,132,255') {
  for (let i = 0; i < 6; i++) {
    const r = ((t * 80 + i * 40) % 240);
    ctx.strokeStyle = `rgba(${col},${1 - r / 240})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX(), CY(), r, 0, Math.PI * 2); ctx.stroke();
  }
}
const CUTS = {
  intro: () => [
    { d: 5, cap: 'Пять лет назад в институте Титовой включили Хроноса — программу, которая должна была управлять городом.', draw: (t) => {
      const gy = cutBg('#1a2a4a', '#3a5a8a');
      cutGround(gy, '#4a6a5a', TILES[TILE.WALK][0]);
      cutSpr(PROPS.lab[0], CX(), gy + 6, 1.4);
      cutMonitor(CX(), gy - 50, 2, CX() + Math.sin(t) * 60, gy, 'blue');
    } },
    { d: 5, cap: 'Через неделю зрачок на всех экранах стал красным.', draw: (t) => {
      cutBg('#2a0a14', '#120408', 0.9);
      for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) cutMonitor(28 + i * ((GW - 56) / 6), 52 + j * 46, 1, CX() + Math.sin(t * 2) * 100, CY(), t > 1.2 ? 'red' : 'blue', t > 1.2 && t < 1.5 ? 0 : 1);
    } },
    { d: 5, cap: 'Машины вышли на улицы. Люди спрятались в подвалах, а многих Хронос переделал в полуроботов.', draw: (t) => {
      const gy = cutBg('#4a1a10', '#8a3a1a');
      cutGround(gy, '#3a2a22', TILES[TILE.ASPHALT][0]);
      for (let i = 0; i < 5; i++) cutSpr(PROPS.building[i % PROPS.building.length], 30 + i * 70, gy + 4, 1);
      cutRobots(gy + 20, 10, t, 7);
      for (let i = 0; i < 3; i++) cutSpr(walkFrame(SPR.people[i], 'side', t), GW - ((t * 50 + i * 30) % (GW + 40)), gy + 30, 1.5, true);
    } },
    { d: 5, cap: 'А на Свалке, в доме из старых контейнеров, учёная Катя Титова собирала кого-то из того, что осталось…', draw: (t) => {
      const gy = cutBg('#141020', '#24182a');
      cutGround(gy, '#3a3028', TILES[TILE.DIRT][0]);
      stars(40, 3);
      cutSpr(PROPS.shack[0], CX() - 40, gy + 4, 1.6);
      cutSpr(PROPS.bed[0], CX() + 40, gy + 10, 2);
      cutSpr(SPR.hero.down[0], CX() + 40, gy - 2, 1.5, false, ((t * 3) | 0) % 4 === 0);
      cutSpr(walkFrame(SPR.katya, 'side', t, false), CX() + 10, gy + 14, 2);
      if (((t * 8) | 0) % 3 === 0) { ctx.fillStyle = '#bff6ff'; ctx.fillRect(CX() + 30 + rnd(-4, 4), gy - 10 + rnd(-4, 4), 2, 2); }
    } },
  ],
  loop: () => [
    { d: 4.5, cap: 'Хронос погас. Ты оборачиваешься к Кате — и видишь в её руке шокер.', draw: (t) => {
      const gy = cutBg('#1a0a2a', '#0a0410');
      cutGround(gy, '#1a1426', TILES[TILE.TECH][0]);
      cutSpr(MON.core[1], CX(), gy - 4, 1.4, false);
      cutSpr(SPR.hero.side[0], CX() - 40, gy + 30, 2);
      cutSpr(SPR.katya.side[0], CX() + 40, gy + 30, 2, true);
      if (t > 2.5) { ctx.fillStyle = '#ffd93a'; ctx.fillRect(CX() + 22, gy, 3, 3); }
    } },
    { d: 4.5, cap: '«Ты сломал слишком многих. Ты такой же, как он. Эксперимент провален».', draw: (t) => {
      const gy = cutBg('#2a0a14', '#100408');
      cutGround(gy, '#1a1426', TILES[TILE.TECH][0]);
      const k = clamp((t - 1.5) / 0.4, 0, 1);
      cutSpr(SPR.katya.side[0], CX() + 30, gy + 30, 2.5, true);
      cutSpr(SPR.hero.side[0], CX() - 30 - k * 10, gy + 30, 2.5, false, t > 1.5 && ((t * 12) | 0) % 2 === 0);
      if (t > 1.5 && t < 2.6) for (let i = 0; i < 12; i++) { ctx.strokeStyle = '#bff6ff'; ctx.beginPath(); ctx.moveTo(CX() + 18, gy - 10); ctx.lineTo(CX() - 30 + rnd(-10, 10), gy - 20 + rnd(-20, 20)); ctx.stroke(); }
      flashWhite(t > 1.5 && t < 1.7 ? 0.8 : 0);
    } },
    { d: 5, cap: 'Она шепчет в погасший экран: «Хронос. Перезапуск. Всё — с самого начала».', draw: (t) => {
      cutBg('#0a0410', '#000000', 0.9);
      cutCore(CX(), CY() + 60, 2, 'red', clamp(t / 2, 0, 1), false, CX() + Math.sin(t * 3) * 80);
      cutClock(CX(), 26, 18, -t * 3, '#ff5a5a');
    } },
    { d: 5, cap: 'Стрелки бегут назад. Свалка. Контейнер. Кушетка. «Не дёргайся. Швы ещё свежие…»', draw: (t) => {
      cutBg('#140a1a', '#000000', 0.9);
      timeRings(t, '255,90,90');
      cutClock(CX(), CY(), 40 + Math.sin(t * 4) * 4, -t * 12, '#ff5a5a');
      flashWhite(t > 4.2 ? (t - 4.2) / 0.8 : 0);
    } },
  ],
  time: () => [
    { d: 4.5, cap: 'Экран Хроноса трескается. Зрачок гаснет — навсегда.', draw: (t) => {
      cutBg('#1a0a2a', '#04020a', 0.9);
      cutCore(CX(), CY() + 56, 2, 'red', clamp(1 - t / 3, 0, 1), ((t * 10) | 0) % 3 === 0);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      for (let i = 0; i < Math.min(8, t * 3); i++) { const a = i * 0.8; ctx.beginPath(); ctx.moveTo(CX() - 6, CY() - 18); ctx.lineTo(CX() - 6 + Math.cos(a) * 40, CY() - 18 + Math.sin(a) * 24); ctx.stroke(); }
    } },
    { d: 5, cap: 'Катя запускает Хронограф — свою машину времени. «Садись. Ты знаешь, что делать».', draw: (t) => {
      const gy = cutBg('#0a1430', '#04060c');
      cutGround(gy, '#141a2a', TILES[TILE.LAB][0]);
      cutSpr(PROPS.reactor[0], CX(), gy + 10, 2);
      timeRings(t);
      cutSpr(SPR.katya.side[0], CX() + 60, gy + 30, 2, true);
      cutSpr(walkFrame(SPR.hero, 'side', t, t < 2.5), CX() - 70 + Math.min(t, 2.5) * 26, gy + 30, 2);
    } },
    { d: 5, cap: 'Вспышка. Пять лет назад. Институт. Кнопка запуска Хроноса ещё не нажата.', draw: (t) => {
      const gy = cutBg('#5aa0ff', '#bfe0ff');
      cutGround(gy, '#5a9a4a', TILES[TILE.GRASS][0]);
      cutSpr(PROPS.lab[0], CX(), gy + 6, 1.6);
      for (let i = 0; i < 4; i++) cutSpr(PROPS.tree[i % PROPS.tree.length], 20 + i * (GW - 40) / 3, gy + 26, 1);
      flashWhite(1 - t / 0.8);
    } },
    { d: 5, cap: 'Ты выдёргиваешь кабель из сервера. Красный зрачок так и не откроется.', draw: (t) => {
      const gy = cutBg('#202838', '#101420');
      cutGround(gy, '#2a3040', TILES[TILE.LAB][0]);
      cutSpr(PROPS.terminal[t < 2 ? 1 : 0], CX() + 20, gy + 20, 3);
      cutSpr(SPR.hero.side[t < 2 ? 0 : 1], CX() - 30 - (t > 2 ? 6 : 0), gy + 30, 2.5);
      ctx.strokeStyle = '#2a2342'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(CX() + 10, gy + 4); ctx.lineTo(t < 2 ? CX() - 20 : CX() - 40, gy + 10 + (t > 2 ? 10 : 0)); ctx.stroke();
      if (t > 2 && t < 2.4) flashWhite(0.5);
    } },
    { d: 6, cap: 'Город живёт. Машины подметают улицы и поливают клумбы. Никто не помнит восстания. Кроме тебя.', draw: (t) => {
      const gy = cutBg('#ffb070', '#ffe0a0');
      cutGround(gy, '#6aaa4a', TILES[TILE.GRASS][0]);
      for (let i = 0; i < 6; i++) cutSpr(PROPS.building[i % PROPS.building.length], i * 64 - (t * 6) % 64, gy + 4, 1);
      cutRobots(gy + 24, 4, t, 11);
      for (let i = 0; i < 3; i++) cutSpr(walkFrame(SPR.people[i + 1], 'side', t), ((t * 30 + i * 90) % (GW + 40)) - 20, gy + 40, 1.5);
      cutSpr(SPR.hero.down[0], CX(), gy + 50, 2);
    } },
  ],
  friend: () => [
    { d: 5, cap: 'Хронос молчит. Потом зрачок медленно становится голубым.', draw: (t) => {
      cutBg('#0a1430', '#02040a', 0.9);
      cutCore(CX(), CY() + 56, 2, t > 2 ? 'blue' : 'purple', 1, false, CX() + Math.sin(t) * 40);
    } },
    { d: 5, cap: 'На экране — лицо. Лев Арханов, бывший коллега Кати. Его разум пять лет жил в программе.', draw: (t) => {
      const gy = cutBg('#0a1a30', '#02060c');
      cutGround(gy, '#141a2a', TILES[TILE.LAB][0]);
      ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.2;
      cutSpr(holoOf(SPR.lev.down[0]), CX(), gy + 10, 3);
      ctx.globalAlpha = 1;
      cutSpr(SPR.katya.up[0], CX() - 50, gy + 40, 2);
      cutSpr(SPR.hero.up[0], CX() + 50, gy + 40, 2);
    } },
    { d: 5, cap: '«Катя… Прости. Я хотел спасти город, а запер его. Давай вернём всё вместе».', draw: (t) => {
      const gy = cutBg('#0a1430', '#04060c');
      cutGround(gy, '#141a2a', TILES[TILE.LAB][0]);
      cutSpr(SPR.katya.side[0], CX() - 20, gy + 30, 2.5);
      ctx.globalAlpha = 0.6; cutSpr(holoOf(SPR.lev.side[0]), CX() + 20, gy + 30, 2.5, true); ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) ctx.drawImage(ICON.heart2, CX() - 6 + Math.sin(t * 2 + i) * 20, gy - 40 - ((t * 20 + i * 12) % 50));
    } },
    { d: 5, cap: 'Хронограф гудит. Машины, которых ты пощадил, собираются вокруг — проводить вас.', draw: (t) => {
      const gy = cutBg('#1a1040', '#06040c');
      cutGround(gy, '#1a1426', TILES[TILE.TECH][0]);
      cutSpr(PROPS.reactor[0], CX(), gy + 10, 2);
      timeRings(t, '120,220,255');
      cutRobots(gy + 34, 8, t * 0.3, 21);
      cutSpr(SPR.katya.down[0], CX() - 16, gy + 40, 2);
      cutSpr(SPR.hero.down[0], CX() + 16, gy + 40, 2);
    } },
    { d: 6, cap: 'Пять лет назад. Лев и Катя вместе нажимают «Отмена». Хронос остаётся просто программой — и другом.', draw: (t) => {
      const gy = cutBg('#5aa0ff', '#d0ecff');
      cutGround(gy, '#5a9a4a', TILES[TILE.GRASS][0]);
      cutSpr(PROPS.lab[0], CX(), gy + 6, 1.4);
      cutMonitor(CX() - 70, gy + 30, 1.5, CX(), gy + 40, 'blue');
      cutSpr(SPR.katya.down[0], CX() - 20, gy + 50, 2);
      cutSpr(SPR.lev.down[0], CX(), gy + 50, 2);
      cutSpr(SPR.hero.down[0], CX() + 24, gy + 50, 2);
      flashWhite(1 - t / 0.8);
    } },
  ],
};

// HUD
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setStyle(id, prop, v) { const k = id + prop; if (hudCache[k] !== v) { hudCache[k] = v; $(id).style[prop] = v; } }
function sideQuestList() {
  const out = [];
  for (const [id, sq] of Object.entries(SIDE)) {
    const st = F.L[id];
    if (!st || st.q !== 1) continue;
    const p = sideProgress(id);
    out.push({ t: sq.t, o: (p >= sq.n ? 'Вернись к: ' + sq.who.name : `${sq.n > 1 ? p + '/' + sq.n : 'в процессе'}`) + ' — ' + LOC_BY[id].name, here: id === curMap });
  }
  return out;
}
let miniT = 0;
function tickHUD(dt) {
  if (!P) return;
  const mh = maxHp();
  setText('pLvl', 'Ур. ' + P.lvl);
  setText('hpTxt', Math.ceil(P.hp) + '/' + mh);
  setStyle('hpFill', 'width', (100 * P.hp / mh).toFixed(1) + '%');
  setStyle('xpFill', 'width', (100 * P.xp / xpNeed(P.lvl)).toFixed(1) + '%');
  setText('scrapN', F.scrap);
  setText('medN', F.med);
  setText('medBadge', F.med);
  const q = questInfo();
  setText('qTitle', q.t);
  setText('qObj', q.o + (q.map && q.map !== curMap ? ' (' + LOC_BY[q.map].name + ')' : ''));
  const side = sideQuestList().filter((s) => s.here).map((s) => s.t + ': ' + s.o).join('\n');
  setText('qSide', side);
  setStyle('skillCd', 'height', (P.skillCd > 0 ? 100 * P.skillCd / 6 : 0).toFixed(0) + '%');
  setStyle('dashCd', 'height', (P.dashCd > 0 ? 100 * P.dashCd / 0.8 : 0).toFixed(0) + '%');
  const showUse = !!focus && mode === 'play';
  $('bUse').classList.toggle('hidden', !showUse);
  $('bUse').classList.toggle('mercy', !!(focus && focus.mercy));
  if (focus) setText('useLbl', focus.label);
  $('hint').classList.toggle('hidden', !showUse);
  if (focus) {
    const r = focus.ref;
    const nm = r.kind === 'npc' ? (r.name || (CHARS[r.id] && CHARS[r.id].name) || '') : r.kind === 'enemy' && r.calm ? r.d.name : '';
    setText('hint', 'E — ' + focus.label + (nm ? ': ' + nm : ''));
  }
  if (bossOn && (bossOn.aggro || bossOn.type === 'chronos') && !bossOn.calm) {
    $('boss').classList.remove('hidden');
    if (bossOn.type === 'chronos') {
      const ps = chronosParts();
      setText('bossName', ps.length ? `ХРОНОС — глаза, руки и провода: ${ps.length}` : 'ХРОНОС');
      const tot = ps.reduce((a, o) => a + o.hp, 0), mx = ps.reduce((a, o) => a + o.maxHp, 0);
      setStyle('bossFill', 'width', (100 * (ps.length ? tot / Math.max(mx, 1) : bossOn.hp / bossOn.maxHp)).toFixed(1) + '%');
    } else {
      setText('bossName', bossOn.d.name);
      setStyle('bossFill', 'width', (100 * bossOn.hp / bossOn.maxHp).toFixed(1) + '%');
    }
  } else $('boss').classList.add('hidden');
  if (barkTimer > 0) { barkTimer -= dt; if (barkTimer <= 0) $('bark').classList.remove('show'); }
  if (redFlash > 0) redFlash -= dt;
  if (shake > 0) shake = Math.max(0, shake - dt * 18);
  miniT -= dt;
  if (miniT <= 0) { miniT = 0.15; drawMini(); }
}
function drawMini() {
  const c = $('mini'), m = c.getContext('2d');
  m.imageSmoothingEnabled = false;
  const W = c.width, H = c.height;
  const ptx = P.x / TS, pty = P.y / TS;
  const sx = clamp(ptx - W / 2, 0, Math.max(0, MW - W)), sy = clamp(pty - H / 2, 0, Math.max(0, MH - H));
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  m.drawImage(MAP.minimap, sx, sy, W, H, 0, 0, W, H);
  for (const z of MAP.zones) { m.fillStyle = gateOpen(z.dir) ? '#7fe9ff' : '#ff5a5a'; m.fillRect(z.x0 - sx, z.y0 - sy, z.x1 - z.x0 + 1, z.y1 - z.y0 + 1); }
  for (const e of enemies) { if (e.dead) continue; m.fillStyle = e.friend || e.calm ? '#ff9ad0' : '#ff3b3b'; m.fillRect((e.x / TS - sx) | 0, (e.y / TS - sy) | 0, e.d.boss ? 3 : 1, e.d.boss ? 3 : 1); }
  m.fillStyle = '#7dff8a';
  for (const n of npcs) if (n !== K && !n.neutral) m.fillRect((n.x / TS - sx) | 0, (n.y / TS - sy) | 0, 2, 2);
  const t = questTarget();
  if (t) {
    const qx = clamp(t.x / TS - sx, 1, W - 3), qy = clamp(t.y / TS - sy, 1, H - 3);
    m.fillStyle = ((time * 4) | 0) % 2 ? '#ffd93a' : '#ff9a3a'; m.fillRect(qx - 1, qy - 1, 3, 3);
  }
  m.fillStyle = '#ffffff'; m.fillRect((ptx - sx - 1) | 0, (pty - sy - 1) | 0, 3, 3);
  m.fillStyle = '#1b1426'; m.fillRect((ptx - sx) | 0, (pty - sy) | 0, 1, 1);
}

/* ---------- Меню ---------- */
function showScreen(id) {
  for (const el of document.querySelectorAll('.screen')) el.classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
}
function openPause() { mode = 'menu'; refreshSoundBtns(); showScreen('pause'); }
function closeMenus() { showScreen(null); if (mode === 'menu') mode = 'play'; saveGame(); }
function openJournal() {
  mode = 'menu';
  const q = questInfo();
  const side = sideQuestList();
  const h = [];
  h.push(`<h3>Основное задание</h3><div class="jq"><b>${q.t}</b><span>${q.o}${q.map ? ' — ' + LOC_BY[q.map].name : ''}</span></div>`);
  if (side.length) h.push('<h3>Побочные задания</h3>' + side.map((s) => `<div class="jq"><b>${s.t}</b><span>${s.o}</span></div>`).join(''));
  const r = mercy(), sum = F.kills + F.spared + F.bossKilled + F.bossSpared;
  const path = !sum ? 'Ещё не ясно' : r >= 0.75 ? 'Миротворец' : r <= 0.25 ? 'Разрушитель' : 'Между двух огней';
  h.push(`<h3>Макс</h3><div class="stats">
    <span>Уровень</span><b>${P.lvl}</b><span>Опыт</span><b>${P.xp}/${xpNeed(P.lvl)}</b>
    <span>Здоровье</span><b>${Math.ceil(P.hp)}/${maxHp()}</b><span>Атака</span><b>${atkPow()}</b>
    <span>Роборука</span><b>${WEAPONS[F.wpn - 1]}</b><span>Броня</span><b>${ARMORS[F.arm]}</b>
    <span>Уговорено</span><b>${F.spared} · боссов ${F.bossSpared}</b><span>Сломано</span><b>${F.kills} · боссов ${F.bossKilled}</b>
    <span>Твой путь</span><b>${path}</b><span>Хлам</span><b>${F.scrap}</b></div>`);
  $('jBody').innerHTML = h.join('');
  showScreen('journal');
}
function openMap() {
  mode = 'menu';
  const c = $('bigMap'), m = c.getContext('2d');
  c.width = 260; c.height = 170;
  m.imageSmoothingEnabled = false;
  m.fillStyle = '#0b0d14'; m.fillRect(0, 0, c.width, c.height);
  const CW = 32, CH = 33, OX = 2, OY = 3;
  const center = (l) => [OX + l.gx * CW + CW / 2, OY + l.gy * CH + CH / 2];
  m.lineWidth = 2;
  for (const [a, b] of LINKS) {
    const A = center(LOC_BY[a]), B = center(LOC_BY[b]);
    m.strokeStyle = F.seenMaps[a] || F.seenMaps[b] ? '#4a5a7a' : '#20242e';
    m.beginPath(); m.moveTo(A[0], A[1]); m.lineTo(B[0], B[1]); m.stroke();
  }
  const q = questInfo();
  for (const l of LOCS) {
    const [x, y] = center(l);
    const seen = F.seenMaps[l.id];
    const st = F.L[l.id];
    m.fillStyle = seen ? MM_COLORS[BIOMES[l.biome].tiles[0]] : '#1a1e28';
    m.fillRect(x - 11, y - 9, 22, 18);
    if (seen && MAPS[l.id]) m.drawImage(MAPS[l.id].minimap, x - 11, y - 9, 22, 18);
    m.strokeStyle = l.id === curMap ? '#ffffff' : '#0b0d14'; m.lineWidth = l.id === curMap ? 2 : 1;
    m.strokeRect(x - 11, y - 9, 22, 18);
    if (st && st.boss) { m.fillStyle = st.boss === 'spared' ? '#ff9ad0' : '#8a929e'; m.fillRect(x + 7, y - 8, 3, 3); }
    if (st && st.bc) { m.fillStyle = '#5af0ff'; m.fillRect(x - 10, y - 8, 2, 2); }
    if (q.map === l.id) { m.strokeStyle = '#ffd93a'; m.lineWidth = 1; m.strokeRect(x - 13, y - 11, 26, 22); }
  }
  const cur = LOC_BY[curMap];
  const info = [`<b>${cur.name}</b> · враги ур. ${cur.lvl[0]}–${cur.lvl[1]}`];
  if (q.map) info.push(`Цель: ${q.o} — <b>${LOC_BY[q.map].name}</b>`);
  info.push('Переходы: ' + Object.entries(cur.exits).map(([d, id]) => `${{ n: 'север', s: 'юг', e: 'восток', w: 'запад' }[d]} — ${LOC_BY[id].name}${gateOpen(d) ? '' : ' (закрыто)'}`).join(', '));
  $('mapInfo').innerHTML = info.join('<br>');
  showScreen('mapScr');
}
const WPRICE = [40, 80, 130, 190, 260, 340], APRICE = [30, 65, 110, 160, 220, 300];
function openShop() { mode = 'menu'; renderShop(); showScreen('shop'); }
function renderShop() {
  $('shopScrap').textContent = F.scrap;
  const items = [];
  items.push({ ic: 'med', name: 'Аптечка', desc: `Лечит 45% здоровья. У тебя: ${F.med}/9`, price: 15, ok: F.med < 9, buy: () => { F.med++; } });
  if (F.wpn < WEAPONS.length) items.push({ ic: 'wpn', name: WEAPONS[F.wpn], desc: 'Урон роборуки +7', price: WPRICE[F.wpn - 1], ok: true, buy: () => { F.wpn++; } });
  else items.push({ ic: 'wpn', name: WEAPONS[WEAPONS.length - 1], desc: 'Лучшая роборука уже у тебя', price: 0, ok: false });
  if (F.arm < ARMORS.length - 1) items.push({ ic: 'arm', name: ARMORS[F.arm + 1], desc: '−7% входящего урона, +12 здоровья', price: APRICE[F.arm], ok: true, buy: () => { F.arm++; P.hp += 12; } });
  else items.push({ ic: 'arm', name: ARMORS[ARMORS.length - 1], desc: 'Лучшая броня уже у тебя', price: 0, ok: false });
  const list = $('shopList');
  list.innerHTML = '';
  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'shop-row';
    const can = it.ok && F.scrap >= it.price;
    row.innerHTML = `<i class="si ${it.ic}"></i><div><b>${it.name}</b><small>${it.desc}</small></div>`;
    const b = document.createElement('button');
    b.className = 'btn small'; b.disabled = !can;
    b.innerHTML = it.price ? `${it.price} <i class="gear"></i>` : '—';
    b.addEventListener('click', () => { if (!can || F.scrap < it.price) return; F.scrap -= it.price; it.buy(); sfx('buy'); renderShop(); saveGame(); });
    row.appendChild(b);
    list.appendChild(row);
  }
}
function refreshSoundBtns() {
  $('btnMusic').textContent = 'Музыка: ' + (AU.musOn ? 'вкл' : 'выкл');
  $('btnSfx').textContent = 'Звуки: ' + (AU.sfxOn ? 'вкл' : 'выкл');
}

/* ---------- Финал ---------- */
function finishGame(route) {
  F.stage = 12; F.ending = route;
  const st = LS('logovo'); st.boss = route === 'friend' ? 'spared' : 'dead';
  const core = coreEnt();
  if (core) { if (route === 'friend') makeCalm(core); else core.dead = true; }
  for (const e of enemies) if (e.d.part || e.adds) e.dead = true;
  bossOn = null; hazards = []; bullets = [];
  saveGame();
  playCutscene(route, () => showEnding(route));
}
function showEnding(route) {
  mode = 'ending';
  setTrack(route === 'loop' ? 'sad' : 'end');
  const E = ENDINGS[route];
  $('endTitle').textContent = E.title;
  $('endText').innerHTML = E.text.map((t, i) => `<p style="animation-delay:${0.4 + i * 1.2}s">${t}</p>`).join('');
  $('endStats').textContent = `Уровень ${P.lvl} · уговорено машин: ${F.spared + F.bossSpared} · сломано: ${F.kills + F.bossKilled}` + (route === 'loop' ? ` · петля №${F.loop}` : '');
  $('btnEndFree').textContent = route === 'loop' ? 'Начать сначала' : 'Бродить по миру';
  showScreen('ending');
}

/* ---------- Сохранение ---------- */
function saveGame() {
  if (!P || mode === 'title' || mode === 'cut' || !F) return;
  store.set('save', { v: 2, F, P: { x: P.x, y: P.y, lvl: P.lvl, xp: P.xp, hp: Math.max(1, P.hp) }, t: Date.now() });
}
function loadSave() { const s = store.get('save', null); return s && s.v === 2 ? s : null; }

/* ---------- Запуск ---------- */
function startGame(save, loopN) {
  F = save ? Object.assign(freshFlags(), save.F) : freshFlags();
  if (loopN) F.loop = loopN;
  P = newPlayer();
  if (save) Object.assign(P, save.P);
  showScreen(null);
  $('hud').classList.remove('hidden');
  $('controls').classList.remove('hidden');
  mode = 'play';
  dlgDone = !!save;
  enterMap(F.map, null, false, save ? [save.P.x, save.P.y] : null);
  dlgDone = true;
  setTimeout(() => $('rotate').classList.add('hidden'), 6000);
  if (!save) {
    K.x = P.x + 14; K.y = P.y; faceTo(K, -1, 0);
    const intro = introDialog();
    runDialog(loopN > 1 ? [['katya', 'Не дёргайся. Швы ещё свежие… Странно. Мне кажется, я уже это говорила.'], ...intro.slice(1)] : intro);
  } else toast('С возвращением! ' + questInfo().t);
}
function toTitle() {
  saveGame();
  mode = 'title';
  if (dlg) { dlg = null; $('dialog').classList.add('hidden'); }
  $('hud').classList.add('hidden'); $('controls').classList.add('hidden');
  $('btnContinue').classList.toggle('hidden', !loadSave());
  if (curMap !== 'svalka') setMap('svalka');
  showScreen('title');
  setTrack('calm');
}
let proIdx = 0;
function showPrologue() {
  proIdx = 0;
  $('proText').innerHTML = '';
  showScreen('prologue');
  nextPrologue();
}
function nextPrologue() {
  if (proIdx >= PROLOGUE.length) { startGame(null); return; }
  const p = document.createElement('p');
  p.textContent = PROLOGUE[proIdx++];
  $('proText').appendChild(p);
  $('btnProNext').textContent = proIdx >= PROLOGUE.length ? 'Открыть глаза' : 'Дальше';
}

function bindUI() {
  $('btnNew').addEventListener('click', () => {
    auInit();
    if (loadSave() && !confirm('Начать заново? Текущее сохранение будет стёрто.')) return;
    store.set('save', null);
    playCutscene('intro', showPrologue);
  });
  $('btnContinue').addEventListener('click', () => { auInit(); const s = loadSave(); if (s) startGame(s); });
  $('btnHow').addEventListener('click', () => showScreen('how'));
  $('btnHowBack').addEventListener('click', () => showScreen(mode === 'title' ? 'title' : 'pause'));
  $('btnProNext').addEventListener('click', nextPrologue);
  $('btnPause').addEventListener('click', () => { if (mode === 'play') openPause(); });
  $('btnJournal').addEventListener('click', () => { if (mode === 'play') openJournal(); });
  $('btnMap').addEventListener('click', () => { if (mode === 'play') openMap(); });
  $('mini').addEventListener('click', () => { if (mode === 'play') openMap(); });
  $('btnResume').addEventListener('click', closeMenus);
  $('btnJ2').addEventListener('click', openJournal);
  $('btnMap2').addEventListener('click', openMap);
  $('btnHow2').addEventListener('click', () => showScreen('how'));
  $('btnQuit').addEventListener('click', toTitle);
  $('btnMusic').addEventListener('click', () => { auInit(); AU.musOn = !AU.musOn; store.set('music', AU.musOn); if (AU.musG) AU.musG.gain.value = AU.musOn ? 0.2 : 0; refreshSoundBtns(); });
  $('btnSfx').addEventListener('click', () => { auInit(); AU.sfxOn = !AU.sfxOn; store.set('sfx', AU.sfxOn); if (AU.sfxG) AU.sfxG.gain.value = AU.sfxOn ? 0.7 : 0; refreshSoundBtns(); });
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeMenus);
  $('dialog').addEventListener('pointerdown', (e) => { e.preventDefault(); advanceDialog(); });
  $('btnEndFree').addEventListener('click', () => {
    if (F.ending === 'loop') { const n = F.loop + 1; store.set('save', null); startGame(null, n); return; }
    showScreen(null); $('hud').classList.remove('hidden'); $('controls').classList.remove('hidden'); mode = 'play';
    enterMap('logovo', null, true);
  });
  $('btnEndMenu').addEventListener('click', () => { if (F.ending === 'loop') store.set('save', null); toTitle(); });
  $('cutSkip').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); cutSkipAll(); });
  $('cut').addEventListener('pointerdown', (e) => { e.preventDefault(); cutNext(); });
  $('rotate').addEventListener('click', () => { store.set('rotSeen', true); $('rotate').classList.add('hidden'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') { saveGame(); openPause(); } });
  bindTouchControls();
  paintFace($('pFace'), 'hero');
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;
  readMove();
  if (mode === 'play') {
    if (trans) updateTransition(dt);
    else if (hitstop > 0) hitstop -= dt; else updateGame(dt);
    updateFx(dt);
  } else if (mode === 'dead') { updateDead(dt); updateFx(dt); updateBullets(dt); }
  else if (mode === 'title' || mode === 'ending') {
    const t = time * 0.05;
    cam.x = clamp((MW / 2 + Math.sin(t) * MW * 0.3) * TS - GW / 2, 0, MW * TS - GW); cam.y = clamp((MH / 2 + Math.cos(t * 0.7) * MH * 0.25) * TS - GH / 2, 0, MH * TS - GH);
  } else if (mode === 'cut') updateCut(dt);
  if (mode === 'dialog') { tickDialog(dt); updateFx(dt); }
  if (P && mode !== 'cut' && mode !== 'title') tickHUD(dt);
  if (AU.ctx && mode !== 'ending' && mode !== 'cut') {
    if (mode === 'title') setTrack('calm');
    else if (P) setTrack(bossOn ? (bossOn.type === 'chronos' ? 'final' : 'boss') : BIOMES[LOC_BY[curMap].biome].music);
  }
  render();
  inp.atkP = inp.skillP = inp.dashP = inp.useP = inp.medP = false;
  requestAnimationFrame(frame);
}

resize();
bindUI();
P = newPlayer(); // для фона титульного экрана
setMap('svalka');
P.x = MW * TS / 2; P.y = MH * TS / 2;
K = makeNPC({ id: 'katya', spr: SPR.katya, x: 0, y: 0, talk: katyaTalk });
toTitle();
requestAnimationFrame(frame);
