'use strict';
/* ================= Движок «Восстания машин» ================= */
const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
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
const SPR = {
  hero: drawHuman({ skin: '#f3c9a0', hair: '#3a2a3e', style: 'spiky', top: '#3d6fb5', bottom: '#3b3f52', shoes: '#5a3a2a', scarf: '#d9433a' }),
  vera: drawHuman({ skin: '#f6d2b0', hair: '#b5532e', style: 'bun', coat: '#eef1f5', coatDark: '#c8ccd4', top: '#4f9a9a', bottom: '#4a4f63', shoes: '#2a2a33', glasses: true }),
  mityai: drawHuman({ skin: '#e7b98f', hair: '#d0d0d0', style: 'old', hat: '#6b4a2a', beard: '#e6e6e6', top: '#7a6a3a', bottom: '#4a5a3a', shoes: '#3a2a1a' }),
  lev: drawHuman({ skin: '#f0d0b0', hair: '#5a5a6a', style: 'short', coat: '#eef1f5', top: '#5a5a8a', bottom: '#3a3a4a', shoes: '#222222', glasses: true }),
  android: drawHuman({ robot: true, skin: '#e9eef3', headTop: '#ffffff', visor: '#5ad0ff', top: '#dfe5ec', lines: '#5ad0ff', bottom: '#b9c2cc', shoes: '#8a94a0', ear: '#c9d0d8', back: '#cfd6de' }),
  rusty: drawHuman({ robot: true, oneEye: true, skin: '#b8703f', headTop: '#c98a5a', visor: '#ffcc44', top: '#8a5530', lines: '#6e4628', bottom: '#6e4628', shoes: '#4a3020', rust: '#7a4020', antenna: true, ear: '#8a5530', back: '#9a6040' }),
  guard: drawHuman({ robot: true, skin: '#3a3f4f', headTop: '#4a5060', visor: '#ff3b3b', top: '#2b2f3c', lines: '#ff3b3b', bottom: '#22252f', shoes: '#15171d', ear: '#2b2f3c', back: '#2b2f3c' }),
};
const BAT = sprite(4, 13, (s) => { s.r(1, 0, 2, 8, '#7fe9ff'); s.r(1, 0, 2, 1, '#ffffff'); s.r(1, 8, 2, 5, '#5a3a2a'); });
const SHADOW = {};
for (const [k, rx, ry] of [['s', 5, 2], ['m', 8, 3], ['l', 14, 4], ['xl', 22, 6]]) {
  SHADOW[k] = sprite(rx * 2 + 2, ry * 2 + 2, (s) => s.ell(rx + 1, ry + 1, rx, ry, 'rgba(10,8,20,0.28)'), false);
}

/* ---------- Мир ---------- */
const WORLD = buildWorld();
const { tiles, solid } = WORLD;
const tileVar = WORLD.variant;
for (const p of WORLD.props) {
  const set = PROPS[p.type];
  const img = set[p.v % set.length];
  p.img = img;
  p.px = Math.round((p.tx + p.fw / 2) * TS - img.width / 2);
  p.py = p.flat ? Math.round(p.ty * TS + (p.fh * TS - img.height) / 2) : (p.ty + p.fh) * TS - img.height + 2;
  p.sy = (p.ty + p.fh) * TS;
}
const SPAWNS = WORLD.spawns.map((s) => ({ ...s, e: null, timer: 0 }));

/* ---------- Состояние ---------- */
function freshFlags() {
  return {
    stage: 0, bat: false, train: 0, cells: 0, module: false, towers: 0, towerOff: [false, false, false],
    opened: {}, bosses: {}, gates: {}, seeds: 0, seedN: 0, seedGot: {}, hunt: 0, huntN: 0,
    beacons: { 0: true }, cp: 0, wpn: 1, arm: 0, bonusHp: 0, scrap: 0, med: 2, seen: {},
    archonMet: false, archonP2: false, reactorOff: false, ending: null, kills: 0,
  };
}
let F = freshFlags();
let P = null, V = null;
let enemies = [], npcs = [], objs = [], bullets = [], parts = [], floats = [], hazards = [], picks = [], slashes = [];
let mode = 'title';           // title | play | dialog | menu | dead | ending
let time = 0, hitstop = 0, shake = 0, saveT = 0, spawnT = 0, curReg = -1, focus = null, bossOn = null, redFlash = 0;
const cam = { x: 30 * TS, y: 70 * TS };

function newPlayer() {
  return {
    x: LOC.start[0] * TS, y: LOC.start[1] * TS, lvl: 1, xp: 0, hp: 100, dir: 'down', face: 1, moving: false, anim: 0,
    atkT: 0, combo: 0, comboT: 0, hitSet: null, atkA: 0, skillT: 0, skillCd: 0, skillHit: null, dashT: 0, dashCd: 0, dashX: 0, dashY: 0,
    inv: 0, kx: 0, ky: 0, dead: false, deadT: 0, atBeacon: -1, r: 5,
  };
}
const maxHp = () => 100 + (P.lvl - 1) * 12 + F.bonusHp + F.arm * 10;
const atkPow = () => 10 + (P.lvl - 1) * 3 + (F.wpn - 1) * 7;
const xpNeed = (l) => Math.round(18 * Math.pow(l, 1.45));
const tileAt = (x, y) => tiles[(y | 0) * MW + (x | 0)];
const regAt = (px, py) => WORLD.reg[clamp((py / TS) | 0, 0, MH - 1) * MW + clamp((px / TS) | 0, 0, MW - 1)];

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
    case 'swing': noise(0.08, 0.25, 3500); tone(600, 0.06, 'triangle', 0.08, 300); break;
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
    default: break;
  }
}
const TRACKS = {
  calm: { bpm: 92, bt: 'triangle', lt: 'square', lv: 0.18, bass: [45, 0, 0, 0, 52, 0, 0, 0, 48, 0, 0, 0, 43, 0, 0, 0], lead: [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 69, 67, 71, 74, 79] },
  city: { bpm: 100, bt: 'triangle', lt: 'square', lv: 0.14, bass: [40, 0, 40, 0, 43, 0, 45, 0, 40, 0, 40, 0, 38, 0, 36, 0], lead: [64, 0, 67, 0, 71, 0, 69, 67, 64, 0, 62, 0, 59, 0, 0, 0] },
  boss: { bpm: 142, bt: 'sawtooth', lt: 'square', lv: 0.13, bass: [33, 33, 45, 33, 33, 45, 36, 38, 33, 33, 45, 33, 40, 38, 36, 35], lead: [69, 0, 72, 0, 74, 0, 72, 71, 69, 0, 76, 0, 74, 72, 71, 0] },
  final: { bpm: 118, bt: 'sawtooth', lt: 'triangle', lv: 0.2, bass: [38, 0, 38, 50, 0, 38, 41, 0, 36, 0, 36, 48, 0, 36, 40, 0], lead: [74, 0, 73, 0, 74, 0, 77, 0, 76, 0, 74, 0, 72, 0, 69, 0] },
  end: { bpm: 80, bt: 'triangle', lt: 'triangle', lv: 0.2, bass: [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 52, 0, 0, 0], lead: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 81, 0, 79, 0, 76, 0] },
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
  if (mode === 'dialog') {
    if (['KeyE', 'Enter', 'Space', 'KeyJ'].includes(c)) { e.preventDefault(); advanceDialog(); }
    if (dlg && dlg.choosing && (c === 'Digit1' || c === 'Digit2')) chooseDialog(c === 'Digit1' ? 0 : 1);
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
cv.addEventListener('pointerdown', (e) => { auInit(); if (e.pointerType === 'mouse' && mode === 'play') inp.atkP = true; });

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
  if (e.d && e.d.fly) { e.x = clamp(e.x + dx, TS, (MW - 1) * TS); e.y = clamp(e.y + dy, TS, (MH - 1) * TS); }
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
const msgQueue = [];
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
  el.innerHTML = `<b>${CHARS[who].name.split(' ')[0]}:</b> ${text}`;
  el.classList.add('show'); barkTimer = 4;
}

/* ---------- Сущности мира ---------- */
function makeNPC(o) { return { kind: 'npc', dir: 'down', face: 1, anim: 0, moving: false, r: 5, wt: rnd(1, 4), ...o, hx: o.x, hy: o.y, tx: o.x, ty: o.y }; }
function buildEntities() {
  npcs = []; objs = []; enemies = []; bullets = []; hazards = []; picks = []; parts = []; floats = []; slashes = [];
  for (const s of SPAWNS) { s.e = null; s.timer = 0; }
  const at = ([x, y]) => ({ x: x * TS + 8, y: y * TS + 8 });
  V = makeNPC({ id: 'vera', spr: SPR.vera, ...at(LOC.vera), talk: veraTalk, follower: F.stage >= 1, shootCd: 1, healCd: 15,
    marker: () => (F.stage === 0 && F.bat && F.train >= 3 ? '!' : null) });
  if (V.follower) { V.x = P.x - 12; V.y = P.y + 2; }
  npcs.push(V);
  npcs.push(makeNPC({ id: 'mityai', spr: SPR.mityai, ...at(LOC.mityai), talk: mityaiTalk, wander: 18,
    marker: () => (F.seeds === 0 ? '!' : F.seeds === 1 && F.seedN >= 5 ? '?' : null) }));
  npcs.push(makeNPC({ id: 'rusty', spr: SPR.rusty, ...at(LOC.rusty), talk: rustyTalk, wander: 10,
    marker: () => (F.stage === 2 ? '!' : F.stage === 3 && F.module ? '?' : null) }));
  npcs.push(makeNPC({ id: 'shop', mon: MON.shopbot, ...at(LOC.shop), talk: shopTalk,
    marker: () => (F.hunt === 0 && F.stage >= 2 ? '!' : F.hunt === 1 && F.huntN >= 8 ? '?' : null) }));
  // андроиды Новограда
  const R = rng(77);
  let made = 0;
  for (let k = 0; k < 4000 && made < 16; k++) {
    const tx = 114 + ((R() * 62) | 0), ty = 42 + ((R() * 67) | 0);
    const i = ty * MW + tx;
    if (solid[i] || tiles[i] !== TILE.WALK) continue;
    npcs.push(makeNPC({ id: 'android' + made, spr: SPR.android, x: tx * TS + 8, y: ty * TS + 12, talk: androidTalk, wander: 40, neutral: true }));
    made++;
  }
  // предметы
  const obj = (o) => objs.push({ kind: 'obj', r: 8, visible: () => true, enabled: () => true, ...o });
  obj({ id: 'bat', ...at(LOC.batChest), img: () => PROPS.chest[F.bat ? 1 : 0], label: 'Открыть', enabled: () => !F.bat,
    act: () => { F.bat = true; sfx('chest'); toast('Получено: ' + WEAPONS[0]); spawnTraining(); saveGame(); } });
  obj({ id: 'labTerm', ...at(LOC.labTerminal), img: () => PROPS.terminal[F.stage >= 2 ? 1 : 0], label: 'Терминал', act: () => runDialog(labTerminalTalk()) });
  [['jc1', LOC.junkChest1], ['jc2', LOC.junkChest2]].forEach(([id, p]) => obj({ id, ...at(p), img: () => PROPS.chest[F.opened[id] ? 1 : 0], label: 'Открыть',
    enabled: () => !F.opened[id], act: () => { F.opened[id] = true; F.cells++; sfx('chest'); toast(`Получено: Энергоячейка (${F.cells}/3)`); burst(P.x, P.y - 10, 10, '#5aff9a'); saveGame(); } }));
  LOC.loot.forEach(([x, y, kind], i) => obj({ id: 'loot' + i, ...at([x, y]), img: () => PROPS.chest[F.opened['loot' + i] ? 1 : 0], label: 'Открыть',
    enabled: () => !F.opened['loot' + i], act: () => {
      F.opened['loot' + i] = true; sfx('chest');
      if (kind === 'med') { F.med += 2; toast('Получено: 2 аптечки'); } else { F.scrap += 30; toast('Получено: 30 хлама'); }
      saveGame();
    } }));
  LOC.towers.forEach((p, i) => obj({ id: 'tower' + i, x: p[0] * TS + 8, y: p[1] * TS + 14, img: () => PROPS.tower[F.towerOff[i] ? 1 : 0], label: 'Отключить',
    enabled: () => !F.towerOff[i], act: () => runDialog(towerTalk(i)) }));
  obj({ id: 'archive', ...at(LOC.archiveDoor), img: null, label: 'Архив', act: () => runDialog(archiveTalk()) });
  obj({ id: 'reactor', ...at(LOC.reactorPanel), img: null, label: 'Панель', act: () => runDialog(reactorTalk()) });
  LOC.seeds.forEach((p, i) => obj({ id: 'seed' + i, ...at(p), img: () => ICON.seed, label: 'Взять', glow: true,
    visible: () => F.seeds === 1 && !F.seedGot[i], enabled: () => F.seeds === 1 && !F.seedGot[i],
    act: () => { F.seedGot[i] = true; F.seedN++; sfx('pick'); toast(`Семена (${F.seedN}/5)`); saveGame(); } }));
  LOC.beacons.forEach((p, i) => obj({ id: 'beacon' + i, beacon: i, x: p[0] * TS + 8, y: p[1] * TS + 12, img: () => PROPS.beacon[F.beacons[i] ? 1 : 0], enabled: () => false }));
  // боссы
  if (!F.bosses.press) spawnBoss('press', LOC.pressArena);
  if (!F.bosses.strider) spawnBoss('strider', LOC.striderArena);
  if (!F.bosses.sentinel) spawnBoss('sentinel', LOC.sentinelArena);
  if (F.archonMet && !F.bosses.archon) spawnBoss('archon', LOC.throne);
  applyGates();
}
function spawnBoss(type, [tx, ty]) { const e = makeEnemy(type, 0, tx * TS + 8, ty * TS + 8); enemies.push(e); return e; }
function spawnTraining() {
  for (let i = 0; i < 3; i++) {
    const e = makeEnemy('drone', 1, (27 + i * 3) * TS, 80 * TS);
    e.training = true; e.aggro = true; e.hp = e.maxHp = 12;
    enemies.push(e);
  }
  bark('vera', 'Дроны во дворе! Бей их!');
}
function applyGates() {
  for (const g of GATES) for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) solid[y * MW + x] = F.gates[g.id] ? 0 : 1;
}
function openGate(id) {
  F.gates[id] = true; applyGates(); sfx('gate');
  toast({ west: 'Западные ворота Новограда открыты', north: 'Северные ворота открыты', east: 'Щит Цитадели отключён' }[id]);
}
function setStage(n) {
  F.stage = n;
  if (n >= 1 && V) V.follower = true;
  sfx('quest');
  if (n < 7) setTimeout(() => toast('Задание: ' + questInfo().t), 300);
  saveGame();
}
function disableTower(i) {
  F.towerOff[i] = true; F.towers++;
  sfx('warn'); shake = 3;
  const [tx, ty] = LOC.towers[i];
  for (let k = 0; k < 2; k++) { const e = makeEnemy('guard', 6, (tx + (k ? 3 : -3)) * TS, (ty + 2) * TS); e.aggro = true; enemies.push(e); }
  toast(`Вышка отключена (${F.towers}/3)`);
  if (F.towers >= 3) setTimeout(() => bark('vera', 'Последняя! Теперь в городе нас не видят. Архив — у главного проспекта.'), 900);
  saveGame();
}

/* ---------- Враги ---------- */
const EDEF = {
  drone: { hp: 18, dmg: 6, spd: 40, fly: 1, r: 6, hy: 12, spr: 'drone', ai: 'chase', sh: 's' },
  cleaner: { hp: 30, dmg: 8, spd: 30, r: 7, hy: 7, spr: 'cleaner', ai: 'melee', sh: 'm' },
  hornet: { hp: 14, dmg: 6, spd: 60, fly: 1, r: 5, hy: 12, spr: 'hornet', ai: 'chase', sh: 's' },
  dog: { hp: 30, dmg: 10, spd: 46, r: 7, hy: 6, spr: 'dog', ai: 'lunge', sh: 'm' },
  scrap: { hp: 46, dmg: 12, spd: 28, r: 8, hy: 8, spr: 'scrapbot', ai: 'melee', sh: 'm' },
  turret: { hp: 40, dmg: 8, spd: 0, r: 7, hy: 8, spr: 'turret', ai: 'turret', sh: 'm' },
  guard: { hp: 52, dmg: 10, spd: 34, r: 6, hy: 10, spr: 'guard', human: 1, ai: 'shoot', sh: 's' },
  bomber: { hp: 22, dmg: 24, spd: 42, r: 6, hy: 7, spr: 'bomber', ai: 'bomb', sh: 's' },
  press: { name: 'ПРЕСС', boss: 1, hp: 650, dmg: 16, spd: 26, r: 18, hy: 20, spr: 'press', ai: 'boss', sh: 'xl', xp: 140, lvl: 4 },
  strider: { name: 'ХОДОК', boss: 1, hp: 950, dmg: 16, spd: 34, r: 16, hy: 22, spr: 'strider', ai: 'boss', sh: 'xl', xp: 220, lvl: 5 },
  sentinel: { name: 'СТРАЖ-7', boss: 1, hp: 1700, dmg: 20, spd: 32, fly: 1, r: 15, hy: 32, spr: 'sentinel', ai: 'boss', sh: 'l', xp: 380, lvl: 8 },
  archon: { name: 'АРХОНТ', boss: 1, hp: 6500, dmg: 22, spd: 0, r: 22, hy: 36, spr: 'archon', ai: 'boss', sh: 'xl', xp: 0, lvl: 10 },
};
function makeEnemy(type, lvl, x, y) {
  const d = EDEF[type];
  if (d.boss) lvl = d.lvl;
  const hm = d.boss ? 1 : 1 + 0.38 * (lvl - 1), dm = d.boss ? 1 : 1 + 0.22 * (lvl - 1);
  return {
    kind: 'enemy', type, d, lvl, x, y, hx: x, hy0: y, hp: d.hp * hm, maxHp: d.hp * hm, dmg: d.dmg * dm, r: d.r, hy: d.hy,
    face: 1, dir: 'down', st: '', t: Math.random() * 5, ct: 1.5, cd: rnd(0.5, 1.5), flash: 0, kx: 0, ky: 0, stun: 0,
    aggro: false, anim: Math.random(), moving: false, wx: x, wy: y, wt: rnd(0, 3), dead: false, z: 0, touchCd: 0,
    xp: d.xp != null ? d.xp : Math.round(3 + lvl * 2.4), once: {},
  };
}
function eCenter(e) { return { x: e.x, y: e.y - e.hy - e.z }; }

function hurtEnemy(e, dmg, ax, ay, crit, stun) {
  if (e.dead || e.invul) return;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.flash = 0.1;
  if (!e.d.boss) { const k = crit ? 150 : 90; e.kx = ax * k; e.ky = ay * k; if (stun) e.stun = Math.max(e.stun, stun); }
  if (!e.aggro && !e.training) { e.aggro = true; if (e.d.boss) bossOn = e; }
  const c = eCenter(e);
  floatText(c.x, c.y - 4, dmg, crit ? '#ffd93a' : '#ffffff');
  burst(c.x, c.y, crit ? 8 : 4, crit ? '#ffd93a' : '#bff6ff', 60, 0.3, 40);
  sfx(crit ? 'crit' : 'hit');
  hitstop = Math.max(hitstop, crit ? 0.06 : 0.035);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  const c = eCenter(e);
  burst(c.x, c.y, e.d.boss ? 50 : 14, '#ffb43a', e.d.boss ? 110 : 70, 0.6, 50, e.d.boss ? 2 : 1);
  burst(c.x, c.y, e.d.boss ? 30 : 8, '#8a929e', 60, 0.7, 120);
  sfx(e.d.boss ? 'boom' : 'kill');
  shake = Math.max(shake, e.d.boss ? 8 : 1.5);
  F.kills++;
  addXP(e.xp);
  const nScrap = e.d.boss ? 12 : (Math.random() < 0.85 ? 1 + ((Math.random() * (1 + e.lvl / 3)) | 0) : 0);
  for (let i = 0; i < nScrap; i++) picks.push({ kind: 'pick', type: 'scrap', v: e.d.boss ? 5 : 1 + ((e.lvl / 4) | 0), x: e.x, y: e.y, vx: rnd(-40, 40), vy: rnd(-40, 40), z: 0, vz: rnd(40, 80), t: 30 });
  if (!e.d.boss && Math.random() < 0.05) picks.push({ kind: 'pick', type: 'med', v: 1, x: e.x, y: e.y, vx: 0, vy: 0, z: 0, vz: 60, t: 40 });
  if (e.training) { F.train++; if (F.train >= 3) { bark('vera', 'Отлично! Подойди ко мне.'); sfx('quest'); } }
  if (e.type === 'scrap' && F.hunt === 1) F.huntN++;
  if (e.type === 'bomber' && e.st !== 'boomed') explodeBomber(e);
  if (e.d.boss) onBossDead(e);
}
function onBossDead(e) {
  F.bosses[e.type] = true;
  if (bossOn === e) bossOn = null;
  hazards = [];
  bullets = bullets.filter((b) => b.team !== 'e');
  for (const o of enemies) if (!o.dead && !o.d.boss && Math.hypot(o.x - e.x, o.y - e.y) < 200 && o.adds) killEnemy(o);
  if (e.type === 'press') { F.cells++; toast(`Получено: Энергоячейка (${F.cells}/3)`); setTimeout(() => bark('vera', 'Пресс разобран! Вот это удар.'), 800); }
  if (e.type === 'strider') { F.module = true; toast('Получено: Модуль памяти Ржавого'); setTimeout(() => bark('vera', 'Модуль цел! Скорее к Ржавому.'), 800); }
  if (e.type === 'sentinel') { toast('Страж-7 повержен'); setTimeout(() => bark('vera', 'Скорее к панели реактора!'), 800); }
  if (e.type === 'archon') { setTimeout(() => runDialog(archonDefeatDialog()), 1600); }
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

function updateEnemy(e, dt) {
  e.t += dt; e.anim += dt;
  if (e.flash > 0) e.flash -= dt;
  if (e.touchCd > 0) e.touchCd -= dt;
  if (e.kx || e.ky) {
    moveEnt(e, e.kx * dt, e.ky * dt);
    e.kx *= Math.pow(0.001, dt); e.ky *= Math.pow(0.001, dt);
    if (Math.abs(e.kx) < 2) e.kx = 0; if (Math.abs(e.ky) < 2) e.ky = 0;
  }
  if (e.stun > 0) { e.stun -= dt; e.moving = false; return; }
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  const alive = !P.dead;
  e.moving = false;
  // агрессия и возврат домой
  if (!e.aggro) {
    if (alive && !e.returning && d < (e.d.boss ? 120 : 80)) { e.aggro = true; if (e.d.boss) { bossOn = e; sfx('warn'); } }
  } else if (!alive || (Math.hypot(e.x - e.hx, e.y - e.hy0) > (e.d.boss ? 280 : 230) && d > 110) || (e.d.boss && d > 320)) {
    e.aggro = false; e.returning = true; e.st = '';
    if (e.d.boss) { e.hp = e.maxHp; e.once = {}; e.invul = false; e.z = 0; hazards = []; if (bossOn === e) bossOn = null; }
  }
  if (e.returning) {
    const hx = e.hx - e.x, hy = e.hy0 - e.y, hd = Math.hypot(hx, hy);
    if (hd < 6 || e.d.spd === 0) { e.returning = false; e.hp = e.maxHp; if (e.d.boss) { e.x = e.hx; e.y = e.hy0; } }
    else { moveEnt(e, hx / hd * e.d.spd * 1.2 * dt, hy / hd * e.d.spd * 1.2 * dt); e.moving = true; faceTo(e, hx, hy); }
    return;
  }
  if (!e.aggro) {
    // бродит возле дома
    if (e.d.spd > 0) {
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
          e.st = ''; e.cd = 1.3;
          burst(e.x + e.face * 8, e.y - 6, 5, '#ffffff', 50, 0.25, 0);
          if (d < 22 + e.r * 0.5) hurtPlayer(e.dmg, e.x, e.y);
        }
      } else {
        e.cd -= dt;
        if (d > 12 + e.r * 0.5) chase();
        if (d < 18 + e.r * 0.5 && e.cd <= 0) { e.st = 'wind'; e.wt = 0.45; faceTo(e, dx, dy); }
      }
      break;
    case 'lunge':
      if (e.st === 'wind') {
        e.wt -= dt;
        if (e.wt <= 0) { e.st = 'lunge'; e.wt = 0.32; e.la = Math.atan2(dy, dx); e.hitOnce = false; }
      } else if (e.st === 'lunge') {
        e.wt -= dt; moveEnt(e, Math.cos(e.la) * 165 * dt, Math.sin(e.la) * 165 * dt); e.moving = true;
        if (!e.hitOnce && d < e.r + 7) { e.hitOnce = true; hurtPlayer(e.dmg, e.x, e.y); }
        if (e.wt <= 0) { e.st = ''; e.cd = 1.4; }
      } else {
        e.cd -= dt;
        if (d > 46) chase(); else if (e.cd <= 0) { e.st = 'wind'; e.wt = 0.4; faceTo(e, dx, dy); }
        else chase(-0.3);
      }
      break;
    case 'turret':
      faceTo(e, dx, dy); e.cd -= dt;
      if (d < 130 && e.cd <= 0) {
        e.cd = 1.7; const a = Math.atan2(dy + 4, dx), c = eCenter(e);
        const n = e.lvl >= 6 ? 3 : 1;
        for (let k = 0; k < n; k++) shoot(c.x, c.y, a + (k - (n - 1) / 2) * 0.25, 75, e.dmg, 'e');
        sfx('shoot');
      }
      break;
    case 'shoot': {
      e.cd -= dt;
      if (d > 85) chase();
      else if (d < 48) chase(-0.8);
      else { const s = (e.hx % 2 ? 1 : -1); moveEnt(e, -uy * s * spd * 0.5 * dt, ux * s * spd * 0.5 * dt); e.moving = true; faceTo(e, dx, dy); }
      if (d < 140 && e.cd <= 0) {
        e.cd = rnd(1.5, 2.1); const c = eCenter(e);
        shoot(c.x, c.y, Math.atan2(P.y - 7 - c.y, P.x - c.x), 88, e.dmg, 'e', '#ff3b5a');
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
  const enr = e.hp < e.maxHp * 0.5;
  const sp = enr ? 1.3 : 1;
  e.ct -= dt * sp;
  const ang = Math.atan2(dy, dx);
  const walkTo = (mul = 1) => { if (d > 8) { moveEnt(e, dx / d * e.d.spd * mul * dt, dy / d * e.d.spd * mul * dt); e.moving = true; } faceTo(e, dx, dy); };
  if (!e.invul && d < e.r + 8 && e.touchCd <= 0 && e.type !== 'archon') { hurtPlayer(e.dmg * 0.6, e.x, e.y); e.touchCd = 1; }
  const summon = (type, n, lvl) => {
    if (enemies.filter((o) => o.adds && !o.dead).length > 4) return;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const o = makeEnemy(type, lvl, e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 26); o.aggro = true; o.adds = true; o.hx = e.hx; o.hy0 = e.hy0; enemies.push(o); burst(o.x, o.y - 6, 8, '#c084ff', 40, 0.4, 0); }
  };
  if (e.st === 'rest' || e.st === '') {
    if (e.type !== 'archon' && e.type !== 'sentinel') walkTo(e.st === 'rest' ? 0.3 : 1);
    if (e.ct > 0) {
      if (e.type === 'sentinel') {
        const tx = e.hx + Math.cos(e.t * 0.6) * 70, ty = e.hy0 + Math.sin(e.t * 0.6) * 40, tdx = tx - e.x, tdy = ty - e.y, td = Math.hypot(tdx, tdy) || 1;
        moveEnt(e, tdx / td * e.d.spd * dt, tdy / td * e.d.spd * dt); e.moving = true; faceTo(e, dx, dy);
      }
      return;
    }
    // выбор атаки
    if (enr && !e.once.half) {
      e.once.half = true;
      if (e.type === 'press') { summon('scrap', 2, 4); bark('vera', 'Он зовёт подмогу!'); }
      if (e.type === 'strider') summon('hornet', 3, 5);
      if (e.type === 'archon' && !F.archonP2) { F.archonP2 = true; hazards = []; bullets = bullets.filter((b) => b.team !== 'e'); runDialog(archonPhase2Dialog()); e.ct = 1; return; }
    }
    const moves = {
      press: ['slam', 'triple', 'charge'],
      strider: ['volley', 'stomp', 'leap'],
      sentinel: ['cross', 'ring', 'aimed', 'drones'],
      archon: enr ? ['rain', 'spiral', 'lasers', 'hands', 'summon', 'cross'] : ['rain', 'spiral', 'lasers', 'hands', 'summon'],
    }[e.type];
    let m = pick(moves);
    if (m === e.lastMove) m = pick(moves);
    e.lastMove = m; e.st = m; e.n = 0; e.ct = 0;
  }
  const rest = (t) => { e.st = 'rest'; e.ct = t / sp; };
  switch (e.st) {
    // ---- Пресс ----
    case 'slam': hzCircle(P.x, P.y, 28, 0.9, e.dmg * 1.3, { shake: 4 }); rest(1.4); break;
    case 'triple': for (let k = 1; k <= 3; k++) hzCircle(e.x + Math.cos(ang) * k * 30, e.y + Math.sin(ang) * k * 30, 20, 0.5 + k * 0.22, e.dmg, { shake: 2 }); rest(1.5); break;
    case 'charge':
      e.chA = ang; hzLine(e.x, e.y, e.x + Math.cos(ang) * 170, e.y + Math.sin(ang) * 170, 30, 0.7, 0, { warnOnly: true });
      e.st = 'charging'; e.ct = 0.7; e.hitOnce = false; break;
    case 'charging':
      if (e.ct < 0) {
        moveEnt(e, Math.cos(e.chA) * 250 * dt, Math.sin(e.chA) * 250 * dt); e.moving = true;
        if (!e.hitOnce && d < e.r + 10) { e.hitOnce = true; hurtPlayer(e.dmg * 1.2, e.x, e.y); }
        if (Math.random() < 0.5) burst(e.x, e.y, 1, '#c9a46a', 30, 0.4, 0);
        if (e.ct < -0.65) { rest(1.0); shake = 2; }
      }
      break;
    // ---- Ходок ----
    case 'volley':
      if (e.ct <= 0) {
        const c = eCenter(e);
        for (let k = -2; k <= 2; k++) shoot(c.x, c.y, Math.atan2(P.y - 7 - c.y, P.x - c.x) + k * 0.22, 85, e.dmg * 0.7, 'e');
        sfx('shoot'); e.n++; e.ct = 0.35;
        if (e.n >= 3) rest(1.1);
      }
      break;
    case 'stomp':
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; hzCircle(e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 30, 16, 0.85, e.dmg, { shake: 1 }); }
      hzCircle(e.x, e.y, 22, 0.85, e.dmg); rest(1.4); break;
    case 'leap': {
      const tx = clamp(P.x, e.hx - 140, e.hx + 140), ty = clamp(P.y, e.hy0 - 110, e.hy0 + 110);
      e.lx0 = e.x; e.ly0 = e.y; e.lx1 = tx; e.ly1 = ty; e.invul = true;
      hzCircle(tx, ty, 30, 1.1, e.dmg * 1.4, { shake: 6 });
      e.st = 'air'; e.ct = 1.1; break;
    }
    case 'air': {
      const k = clamp(1 - e.ct / 1.1, 0, 1);
      e.x = e.lx0 + (e.lx1 - e.lx0) * k; e.y = e.ly0 + (e.ly1 - e.ly0) * k; e.z = Math.sin(k * Math.PI) * 70;
      if (e.ct <= 0) { e.z = 0; e.invul = false; burst(e.x, e.y, 16, '#c9a46a', 70, 0.5, 40); rest(1.3); }
      break;
    }
    // ---- Страж-7 ----
    case 'cross':
      for (let s = 0; s < 2; s++) for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + s * Math.PI / 4 + (e.type === 'archon' ? e.t : 0);
        const cx = e.x, cy = e.y - (e.type === 'archon' ? 10 : 0);
        hzLine(cx, cy, cx + Math.cos(a) * 230, cy + Math.sin(a) * 230, 16, 0.9, e.dmg, { delay: s * 1.0 });
      }
      rest(2.4); break;
    case 'ring':
      if (e.ct <= 0) {
        const c = eCenter(e), off = e.n * 0.2;
        for (let k = 0; k < 16; k++) shoot(c.x, c.y, off + k * Math.PI / 8, 70, e.dmg * 0.7, 'e', '#ff3b5a', 2.5);
        sfx('shoot'); e.n++; e.ct = 0.55;
        if (e.n >= 3) rest(1.0);
      }
      break;
    case 'aimed':
      if (e.ct <= 0) {
        const c = eCenter(e);
        shoot(c.x, c.y, Math.atan2(P.y - 7 - c.y, P.x - c.x) + rnd(-0.1, 0.1), 115, e.dmg * 0.6, 'e', '#ffd93a');
        sfx('shoot'); e.n++; e.ct = 0.12;
        if (e.n >= 9) rest(0.9);
      }
      break;
    case 'drones': summon('drone', 3, 7); rest(1.2); break;
    // ---- АРХОНТ ----
    case 'rain':
      for (let k = 0; k < (enr ? 12 : 9); k++) hzCircle(P.x + rnd(-60, 60), P.y + rnd(-45, 45), 16, 0.9, e.dmg, { delay: k * 0.12 });
      hzCircle(P.x, P.y, 16, 1.0, e.dmg);
      rest(2.2); break;
    case 'spiral':
      if (e.ct <= 0) {
        e.sa = (e.sa || 0) + 0.27;
        const c = eCenter(e), n = enr ? 4 : 3;
        for (let k = 0; k < n; k++) shoot(c.x, c.y, e.sa + k * Math.PI * 2 / n, 68, e.dmg * 0.6, 'e', '#c084ff', 2.5);
        e.n++; e.ct = 0.1;
        if (e.n % 4 === 0) sfx('shoot');
        if (e.n >= 26) rest(1.0);
      }
      break;
    case 'lasers':
      for (let k = -2; k <= 2; k++) {
        const y = P.y + k * 26;
        hzLine(e.hx - 150, y, e.hx + 120, y, 14, 0.9 + Math.abs(k) * 0.3, e.dmg);
      }
      rest(2.2); break;
    case 'hands':
      e.handT = 1.0; e.handX = P.x; e.handY = P.y;
      hzCircle(P.x, P.y, 26, 1.0, e.dmg * 1.4, { shake: 6 });
      hzCircle(P.x + rnd(-50, 50), P.y + rnd(-30, 30), 24, 1.4, e.dmg * 1.2, { shake: 4 });
      rest(1.8); break;
    case 'summon': summon(Math.random() < 0.5 ? 'guard' : 'bomber', 2, 9); rest(1.0); break;
    default: rest(1);
  }
}

/* ---------- Игрок ---------- */
function addXP(n) {
  if (!P || !n) return;
  P.xp += n;
  while (P.xp >= xpNeed(P.lvl)) {
    P.xp -= xpNeed(P.lvl); P.lvl++; P.hp = maxHp();
    toast(`Новый уровень: ${P.lvl}! Атака и здоровье выросли`);
    sfx('lvl'); burst(P.x, P.y - 10, 24, '#ffd93a', 70, 0.8, -20);
  }
}
function hurtPlayer(dmg, sx, sy) {
  if (P.dead || P.inv > 0 || P.dashT > 0 || mode !== 'play') return;
  dmg = Math.max(1, Math.round(dmg * (1 - F.arm * 0.08)));
  P.hp -= dmg; P.inv = 0.7; redFlash = 0.25;
  const a = Math.atan2(P.y - sy, P.x - sx);
  P.kx = Math.cos(a) * 110; P.ky = Math.sin(a) * 110;
  floatText(P.x, P.y - 22, dmg, '#ff5a5a');
  burst(P.x, P.y - 8, 6, '#ff5a5a', 50, 0.4, 60);
  sfx('hurt'); shake = Math.max(shake, 2.5);
  if (P.hp <= 0) { P.hp = 0; playerDie(); }
}
function playerDie() {
  P.dead = true; P.deadT = 2.2; mode = 'dead';
  burst(P.x, P.y - 8, 30, '#ff5a5a', 80, 0.9, 40);
  areaToast('Ты повержен…');
  sfx('boom');
}
function respawn() {
  const lost = Math.floor(F.scrap * 0.15);
  F.scrap -= lost;
  const [bx, by] = LOC.beacons[F.cp] || LOC.beacons[0];
  P.x = bx * TS + 8; P.y = by * TS + 26; P.hp = maxHp(); P.dead = false; P.inv = 1.5; P.kx = P.ky = 0;
  V.x = P.x - 12; V.y = P.y;
  hazards = []; bullets = [];
  for (const e of enemies) if (e.d.boss) { e.hp = e.maxHp; e.aggro = false; e.x = e.hx; e.y = e.hy0; e.st = ''; e.once = {}; e.invul = false; e.z = 0; }
  enemies = enemies.filter((e) => !e.adds && !e.training);
  if (F.stage === 0 && F.bat && F.train < 3) spawnTraining();
  bossOn = null; mode = 'play';
  toast(lost ? `Вера вытащила тебя к маяку. Потеряно хлама: ${lost}` : 'Вера вытащила тебя к маяку');
  snapCam();
}
function useMed() {
  if (F.med <= 0) { toast('Аптечек нет'); return; }
  if (P.hp >= maxHp()) { toast('Здоровье и так полное'); return; }
  F.med--; P.hp = Math.min(maxHp(), P.hp + Math.round(maxHp() * 0.45));
  sfx('heal'); burst(P.x, P.y - 10, 14, '#5aff9a', 40, 0.7, -30);
}
function dirAngle() { return P.dir === 'side' ? (P.face > 0 ? 0 : Math.PI) : P.dir === 'down' ? Math.PI / 2 : -Math.PI / 2; }
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD;
  for (const e of enemies) { if (e.dead || e.invul) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function startAttack() {
  P.combo = P.comboT > 0 ? (P.combo % 3) + 1 : 1;
  P.atkT = P.combo === 3 ? 0.3 : 0.22; P.comboT = 0.5; P.hitSet = new Set();
  const t = nearestEnemy(P.x, P.y, 36);
  if (t) { P.atkA = Math.atan2(t.y - P.y, t.x - P.x); faceTo(P, Math.cos(P.atkA), Math.sin(P.atkA)); }
  else P.atkA = dirAngle();
  slashes.push({ x: P.x, y: P.y - 7, a: P.atkA, t: 0.18, T: 0.18, big: P.combo === 3 });
  sfx('swing');
}
function updatePlayer(dt) {
  if (P.inv > 0) P.inv -= dt;
  if (P.comboT > 0) P.comboT -= dt;
  if (P.dashCd > 0) P.dashCd -= dt;
  if (P.skillCd > 0) P.skillCd -= dt;
  let mx = inp.mx, my = inp.my;
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  const moving = ml > 0.2;
  if (moving && P.atkT <= 0 && P.dashT <= 0) faceTo(P, mx, my);
  // действия
  if (inp.dashP && P.dashCd <= 0) {
    const a = moving ? Math.atan2(my, mx) : dirAngle();
    P.dashX = Math.cos(a); P.dashY = Math.sin(a); P.dashT = 0.17; P.dashCd = 0.8; P.atkT = 0;
    sfx('dash'); burst(P.x, P.y - 2, 6, '#d0d8e0', 30, 0.3, 0);
  }
  if (inp.skillP && F.bat && P.skillCd <= 0 && P.dashT <= 0) {
    P.skillT = 0.35; P.skillCd = 6; P.skillHit = new Set();
    sfx('skill'); shake = Math.max(shake, 2);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; parts.push({ x: P.x + Math.cos(a) * 6, y: P.y - 6 + Math.sin(a) * 5, vx: Math.cos(a) * 110, vy: Math.sin(a) * 80, life: 0.35, max: 0.35, col: i % 2 ? '#7fe9ff' : '#ffffff', grav: 0, size: 1 }); }
  }
  if ((inp.atkP || (inp.atk && P.comboT < 0.3)) && P.atkT <= 0.04 && P.dashT <= 0 && P.skillT <= 0) {
    if (F.bat) startAttack(); else if (inp.atkP) toast('Сначала найди оружие');
  }
  if (inp.medP) useMed();
  if (inp.useP && focus) { sfx('blip'); focus.act(); }
  // движение
  if (P.dashT > 0) {
    P.dashT -= dt;
    moveBox(P, P.dashX * 215 * dt, P.dashY * 215 * dt, 4, 3);
    if (Math.random() < 0.6) parts.push({ x: P.x + rnd(-3, 3), y: P.y - rnd(0, 12), vx: 0, vy: 0, life: 0.2, max: 0.2, col: '#bff6ff', grav: 0, size: 1 });
  } else {
    const spd = 70 * (P.atkT > 0 ? 0.3 : 1) * (P.skillT > 0 ? 0.2 : 1);
    if (moving) moveBox(P, mx * spd * dt, my * spd * dt, 4, 3);
  }
  if (P.kx || P.ky) {
    moveBox(P, P.kx * dt, P.ky * dt, 4, 3);
    P.kx *= Math.pow(0.002, dt); P.ky *= Math.pow(0.002, dt);
    if (Math.abs(P.kx) < 2) P.kx = 0; if (Math.abs(P.ky) < 2) P.ky = 0;
  }
  P.moving = moving && P.atkT <= 0;
  P.idleT = moving || P.atkT > 0 ? 0 : (P.idleT || 0) + dt;
  if (P.moving) P.anim += dt;
  // попадания мечом
  if (P.atkT > 0) {
    const T = P.combo === 3 ? 0.3 : 0.22;
    P.atkT -= dt;
    const prog = 1 - P.atkT / T;
    if (prog > 0.1 && prog < 0.8) {
      const R = P.combo === 3 ? 17 : 13;
      const hx = P.x + Math.cos(P.atkA) * 11, hy = P.y - 6 + Math.sin(P.atkA) * 9;
      for (const e of enemies) {
        if (e.dead || P.hitSet.has(e)) continue;
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
  if (P.skillT > 0) {
    P.skillT -= dt;
    for (const e of enemies) {
      if (e.dead || P.skillHit.has(e)) continue;
      if (Math.hypot(e.x - P.x, e.y - P.y) < 34 + e.r) {
        P.skillHit.add(e);
        const a = Math.atan2(e.y - P.y, e.x - P.x);
        hurtEnemy(e, atkPow() * 2.3, Math.cos(a), Math.sin(a), true, 0.7);
      }
    }
  }
}

/* ---------- Вера и NPC ---------- */
function updateNPCs(dt) {
  for (const n of npcs) {
    n.moving = false;
    if (n === V && V.follower) { updateVera(dt); continue; }
    if (!n.wander) continue;
    if (Math.hypot(n.x - P.x, n.y - P.y) > 320) continue;
    if (focus === n && mode === 'dialog') continue;
    n.wt -= dt;
    if (n.wt <= 0) { n.wt = rnd(2, 5); n.tx = n.hx + rnd(-n.wander, n.wander); n.ty = n.hy + rnd(-n.wander, n.wander); }
    const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
    if (d > 2) { moveBox(n, dx / d * 18 * dt, dy / d * 18 * dt, 4, 3); n.moving = true; n.anim += dt; faceTo(n, dx, dy); }
  }
}
function updateVera(dt) {
  const back = dirAngle() + Math.PI;
  const tx = P.x + Math.cos(back) * 16, ty = P.y + Math.sin(back) * 10;
  const dx = tx - V.x, dy = ty - V.y, d = Math.hypot(dx, dy);
  if (Math.hypot(P.x - V.x, P.y - V.y) > 150) { V.x = P.x - 10; V.y = P.y + 2; }
  else if (d > 8) {
    const spd = d > 40 ? 90 : 66;
    moveBox(V, dx / d * spd * dt, dy / d * spd * dt, 4, 3);
    V.moving = true; V.anim += dt; faceTo(V, dx, dy);
  }
  V.shootCd -= dt; V.healCd -= dt;
  if (V.shootCd <= 0 && !P.dead) {
    const t = nearestEnemy(V.x, V.y, 110);
    if (t && t.aggro) {
      V.shootCd = 1.4;
      const c = eCenter(t), a = Math.atan2(c.y - (V.y - 9), c.x - V.x);
      shoot(V.x, V.y - 9, a, 170, 3 + P.lvl * 1.3, 'a', '#7fe9ff', 2);
      faceTo(V, Math.cos(a), Math.sin(a));
      sfx('zap');
    }
  }
  if (V.healCd <= 0 && !P.dead && P.hp < maxHp() * 0.35) {
    V.healCd = 45; P.hp = Math.min(maxHp(), P.hp + Math.round(maxHp() * 0.3));
    bark('vera', pick(['Держись! Вот, аптечка.', 'Не смей умирать — я тебя пять лет лечила!', 'Подлатала, как смогла.']));
    sfx('heal'); burst(P.x, P.y - 10, 14, '#5aff9a', 40, 0.7, -30);
  }
}

/* ---------- Снаряды, ловушки, лут ---------- */
function updateBullets(dt) {
  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    const tx = (b.x / TS) | 0, ty = ((b.y + 6) / TS) | 0;
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH || (solid[ty * MW + tx] && TILE_SOLID[tiles[ty * MW + tx]])) { b.life = 0; burst(b.x, b.y, 3, b.col, 30, 0.2, 0); continue; }
    if (b.team === 'e') {
      if (!P.dead && Math.hypot(b.x - P.x, b.y - (P.y - 7)) < b.r + 4) { b.life = 0; hurtPlayer(b.dmg, b.x - b.vx, b.y - b.vy); }
    } else {
      for (const e of enemies) {
        if (e.dead || e.invul) continue;
        const c = eCenter(e);
        if (Math.hypot(b.x - c.x, b.y - c.y) < e.r + b.r + 2) { b.life = 0; const s = Math.hypot(b.vx, b.vy); hurtEnemy(e, b.dmg, b.vx / s * 0.3, b.vy / s * 0.3, false); break; }
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
      if (h.k === 'c') { hit = Math.hypot(P.x - h.x, P.y - h.y) < h.r + 3; burst(h.x, h.y, 10, '#ff8a5a', 70, 0.4, 40); }
      else { hit = segDist(P.x, P.y, h.x1, h.y1, h.x2, h.y2) < h.w / 2 + 3; for (let k = 0; k < 6; k++) { const f = Math.random(); burst(h.x1 + (h.x2 - h.x1) * f, h.y1 + (h.y2 - h.y1) * f, 2, '#ff6aa0', 50, 0.3, 0); } }
      if (h.shake) shake = Math.max(shake, h.shake);
      if (hit && h.dmg) hurtPlayer(h.dmg, h.k === 'c' ? h.x : P.x, h.k === 'c' ? h.y : P.y - 1);
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
  const peace = F.stage >= 7;
  for (const s of SPAWNS) {
    if (s.e && s.e.dead) { s.e = null; s.timer = 40; }
    if (s.e) {
      if (!s.e.aggro && Math.hypot(s.e.x - P.x, s.e.y - P.y) > 720) { s.e.dead = true; s.e = null; s.timer = 0; }
      continue;
    }
    if (peace) continue;
    if (s.timer > 0) { s.timer -= 0.5; continue; }
    const x = s.tx * TS + 8, y = s.ty * TS + 12, d = Math.hypot(x - P.x, y - P.y);
    if (d > 210 && d < 560) { s.e = makeEnemy(s.type, s.lvl, x, y); enemies.push(s.e); }
  }
  if (peace) for (const e of enemies) if (!e.d.boss && !e.aggro) e.dead = true;
  enemies = enemies.filter((e) => !e.dead);
}

/* ---------- Взаимодействие, триггеры ---------- */
function updateFocus() {
  focus = null;
  if (P.dead) return;
  let bd = 26;
  for (const n of npcs) {
    if (n === V && V.follower) continue;
    const d = Math.hypot(n.x - P.x, n.y - P.y);
    if (d < bd) { bd = d; focus = { act: () => talkTo(n), label: 'Говорить', ref: n }; }
  }
  for (const o of objs) {
    if (!o.enabled() || !o.visible()) continue;
    const d = Math.hypot(o.x - P.x, o.y - P.y);
    if (d < bd + 2) { bd = d; focus = { act: o.act, label: o.label, ref: o }; }
  }
  // спутница — только если рядом нет ничего другого
  if (!focus && V.follower && P.idleT > 1 && !bossOn && Math.hypot(V.x - P.x, V.y - P.y) < 24) focus = { act: () => talkTo(V), label: 'Говорить', ref: V };
}
function talkTo(n) {
  faceTo(n, P.x - n.x, P.y - n.y);
  runDialog(n.talk());
}
function updateTriggers() {
  // маяки
  LOC.beacons.forEach(([bx, by], i) => {
    const d = Math.hypot(bx * TS + 8 - P.x, by * TS + 12 - P.y);
    if (d < 18 && P.atBeacon !== i) {
      P.atBeacon = i;
      const first = !F.beacons[i];
      F.beacons[i] = true; F.cp = i; P.hp = maxHp();
      sfx('beacon'); burst(bx * TS + 8, by * TS - 8, 14, '#5af0ff', 40, 0.7, -20);
      toast(first ? 'Маяк активирован: здесь ты будешь возрождаться' : 'Маяк: здоровье восстановлено, игра сохранена');
      saveGame();
    } else if (d > 40 && P.atBeacon === i) P.atBeacon = -1;
  });
  // регион
  const r = regAt(P.x, P.y);
  if (r !== curReg) {
    curReg = r;
    areaToast(REGION_INFO[r].name);
    if (!F.seen[r]) {
      F.seen[r] = true;
      if (REGION_REMARK[r] && V.follower) setTimeout(() => bark('vera', REGION_REMARK[r]), 1800);
    }
  }
  // встреча с АРХОНТом
  if (F.stage === 6 && !F.archonMet && P.x > LOC.bossTrigger * TS) {
    F.archonMet = true;
    const e = spawnBoss('archon', LOC.throne);
    runDialog(archonMeetDialog(), () => { e.aggro = true; bossOn = e; e.ct = 1.2; });
  }
  if (F.archonMet && !F.bosses.archon) {
    const a = enemies.find((e) => e.type === 'archon');
    if (a && !a.aggro && !a.returning && Math.hypot(a.x - P.x, a.y - P.y) < 150 && mode === 'play') { a.aggro = true; bossOn = a; }
  }
}

/* ---------- Камера ---------- */
function camTarget() {
  let fx = P.x, fy = P.y - 8;
  // в бою с боссом камера захватывает и его
  if (bossOn && bossOn.aggro && Math.hypot(bossOn.x - P.x, bossOn.y - P.y) < 260) {
    fx = P.x * 0.6 + bossOn.x * 0.4; fy = (P.y - 8) * 0.6 + (bossOn.y - bossOn.hy) * 0.4;
  }
  return { x: clamp(fx - GW / 2, 0, MW * TS - GW), y: clamp(fy - GH / 2, 0, MH * TS - GH) };
}
function snapCam() { const t = camTarget(); cam.x = t.x; cam.y = t.y; }

/* ---------- Главный шаг ---------- */
function updateGame(dt) {
  updatePlayer(dt);
  updateNPCs(dt);
  for (const e of enemies) {
    if (e.dead) continue;
    if (!e.d.boss && (Math.abs(e.x - P.x) > 420 || Math.abs(e.y - P.y) > 300)) continue;
    updateEnemy(e, dt);
  }
  enemies = enemies.filter((e) => !e.dead);
  if (bossOn && (bossOn.dead || !bossOn.aggro)) bossOn = null;
  updateBullets(dt);
  updateHazards(dt);
  updatePicks(dt);
  updateSpawns(dt);
  updateFocus();
  updateTriggers();
  const t = camTarget();
  cam.x += (t.x - cam.x) * Math.min(1, dt * 8);
  cam.y += (t.y - cam.y) * Math.min(1, dt * 8);
  saveT -= dt;
  if (saveT <= 0) { saveT = 25; saveGame(); }
}
function updateDead(dt) {
  P.deadT -= dt;
  for (const e of enemies) if (!e.dead && e.aggro) { e.aggro = false; e.returning = true; }
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
      ctx.drawImage(set[v], x, y);
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

function drawEnemy(e, cx, cy) {
  const flash = e.flash > 0 || (e.st === 'arm' && ((time * 12) | 0) % 2 === 0) || (e.st === 'wind' && ((time * 16) | 0) % 2 === 0);
  let img;
  if (e.d.human) img = humanImg(SPR.guard, e);
  else {
    const fr = MON[e.d.spr];
    if (e.type === 'archon') img = fr[(F.archonP2 ? 2 : 0) + (((time * 3) | 0) % 2)];
    else img = fr[((e.anim * (e.moving ? 7 : 3)) | 0) % fr.length];
  }
  const bob = e.d.fly ? 5 + Math.sin(e.t * 4) * 2 : 0;
  drawShadow(e.d.sh, e.x - cx, e.y - cy);
  const x = e.x - img.width / 2 - cx, y = e.y - img.height - cy - bob - e.z + (e.type === 'archon' ? -10 + Math.sin(time * 2) * 2 : 0);
  if (e.type === 'archon') {
    // руки ядра
    const H = MON.hand[((time * 2) | 0) % 2];
    const hl = e.handT > 0;
    drawImg(H, e.x - 58 - cx, e.y - 30 - cy + Math.sin(time * 1.7) * 3, true);
    drawImg(H, e.x + 36 - cx, e.y - 30 - cy + Math.cos(time * 1.9) * 3, false);
    if (hl) { e.handT -= 1 / 60; drawImg(H, e.handX - 11 - cx, e.handY - 40 - cy + e.handT * 20, false); }
  }
  drawImg(img, x, y, !e.d.human && e.face < 0, flash);
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0b0d14'; ctx.fillRect(0, 0, GW, GH);
  const sx = shake > 0.3 ? Math.round(rnd(-shake, shake)) : 0, sy = shake > 0.3 ? Math.round(rnd(-shake, shake)) : 0;
  const cx = Math.round(cam.x) + sx, cy = Math.round(cam.y) + sy;
  VIEW = { x0: cx - 8, y0: cy - 8, x1: cx + GW + 8, y1: cy + GH + 90 };
  drawTiles(cx, cy);
  for (const p of WORLD.props) if (p.flat && vis(p.px, p.py, p.img.width, p.img.height)) ctx.drawImage(p.img, p.px - cx, p.py - cy);
  // красные зоны ударов
  for (const h of hazards) {
    if (h.delay > 0) continue;
    const k = 1 - h.t / h.T;
    if (h.k === 'c') {
      ctx.fillStyle = 'rgba(255,40,60,0.18)'; ctx.beginPath(); ctx.arc(h.x - cx, h.y - cy, h.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,60,60,0.35)'; ctx.beginPath(); ctx.arc(h.x - cx, h.y - cy, h.r * k, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,120,120,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(h.x - cx, h.y - cy, h.r, 0, Math.PI * 2); ctx.stroke();
    } else {
      const a = Math.atan2(h.y2 - h.y1, h.x2 - h.x1), L = Math.hypot(h.x2 - h.x1, h.y2 - h.y1);
      ctx.save(); ctx.translate(h.x1 - cx, h.y1 - cy); ctx.rotate(a);
      ctx.fillStyle = h.warnOnly ? 'rgba(255,200,60,0.18)' : 'rgba(255,40,120,0.18)'; ctx.fillRect(0, -h.w / 2, L, h.w);
      ctx.fillStyle = h.warnOnly ? 'rgba(255,200,60,0.35)' : 'rgba(255,60,140,0.4)'; ctx.fillRect(0, -h.w / 2 * k, L, h.w * k);
      ctx.restore();
    }
  }
  // сортировка по глубине
  const L = [];
  for (const p of WORLD.props) if (!p.flat && vis(p.px, p.py, p.img.width, p.img.height)) L.push({ y: p.sy, k: 0, o: p });
  for (const o of objs) if (o.img && o.visible() && vis(o.x - 30, o.y - 60, 60, 70)) L.push({ y: o.y, k: 1, o });
  for (const n of npcs) if (vis(n.x - 10, n.y - 24, 20, 26)) L.push({ y: n.y, k: 2, o: n });
  for (const e of enemies) if (!e.dead && vis(e.x - 40, e.y - 80, 80, 90)) L.push({ y: e.y, k: 3, o: e });
  for (const p of picks) if (vis(p.x - 6, p.y - 12, 12, 14)) L.push({ y: p.y, k: 4, o: p });
  for (const g of GATES) if (!F.gates[g.id]) L.push({ y: (g.y1 + 1) * TS - 1, k: 5, o: g });
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
        drawImg(img, o.x - img.width / 2 - cx, o.y - img.height - cy + 2 - (o.glow ? 2 + Math.sin(time * 3) * 1.5 : 0), false);
        break;
      }
      case 2: {
        drawShadow('s', o.x - cx, o.y - cy);
        if (o.mon) drawImg(o.mon[((time * 2) | 0) % 2], o.x - 9 - cx, o.y - 22 - cy, false);
        else { const img = humanImg(o.spr, o); drawImg(img, o.x - 8 - cx, o.y - 21 - cy, o.dir === 'side' && o.face < 0); }
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
  // снаряды
  for (const b of bullets) {
    ctx.fillStyle = b.col; ctx.fillRect(Math.round(b.x - b.r - cx), Math.round(b.y - b.r - cy), b.r * 2, b.r * 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x - 0.5 - cx), Math.round(b.y - 0.5 - cy), 1, 1);
  }
  // удары
  for (const s of slashes) {
    const k = 1 - s.t / s.T, R = s.big ? 16 : 12;
    ctx.strokeStyle = `rgba(190,246,255,${1 - k})`; ctx.lineWidth = s.big ? 4 : 3;
    ctx.beginPath(); ctx.arc(Math.round(P.x - cx), Math.round(P.y - 7 - cy), R, s.a - 1.3, s.a - 1.3 + 2.6 * Math.min(1, k * 1.6)); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(Math.round(P.x - cx), Math.round(P.y - 7 - cy), R + 1, s.a - 1.1, s.a - 1.1 + 2.2 * Math.min(1, k * 1.6)); ctx.stroke();
  }
  // частицы
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.size, p.size);
  }
  ctx.globalAlpha = 1;
  if (mode !== 'title') drawOverlays(cx, cy);
  // атмосфера региона
  const tint = REGION_INFO[regAt(cam.x + GW / 2, cam.y + GH / 2)].tint;
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, GW, GH); }
  if (redFlash > 0) { ctx.fillStyle = `rgba(255,0,0,${redFlash * 0.6})`; ctx.fillRect(0, 0, GW, GH); }
}
function drawHero(cx, cy) {
  if (P.inv > 0 && !P.dead && ((time * 14) | 0) % 2 === 0) return;
  drawShadow('s', P.x - cx, P.y - cy);
  const img = humanImg(SPR.hero, P);
  const flip = P.dir === 'side' && P.face < 0;
  const behind = P.dir === 'up';
  const drawBat = () => {
    if (!F.bat) return;
    let a;
    if (P.atkT > 0) { const T = P.combo === 3 ? 0.3 : 0.22; a = P.atkA - 1.3 + 2.6 * clamp(1 - P.atkT / T, 0, 1); }
    else if (P.skillT > 0) a = time * 30;
    else a = P.dir === 'side' ? (P.face > 0 ? -0.6 : Math.PI + 0.6) : P.dir === 'up' ? -2.2 : 2.3;
    const hx = Math.round(P.x - cx + Math.cos(a) * 3), hy = Math.round(P.y - 8 - cy + Math.sin(a) * 2);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a + Math.PI / 2); ctx.drawImage(BAT, -2, -12); ctx.restore();
  };
  if (behind) drawBat();
  drawImg(img, P.x - 8 - cx, P.y - 21 - cy, flip, P.dead);
  if (!behind) drawBat();
}
function drawGate(g, cx, cy) {
  const vert = g.x0 === g.x1;
  const col = g.id === 'east' ? [180, 90, 255] : [90, 220, 255];
  for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) {
    const px = x * TS - cx, py = y * TS - cy;
    for (let k = 0; k < 4; k++) {
      const a = 0.35 + 0.35 * Math.sin(time * 6 + k * 1.7 + x + y);
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
      if (vert) ctx.fillRect(px + 4 + k * 2, py - 14, 1, 30); else ctx.fillRect(px, py - 14 + k * 4, 16, 1);
    }
  }
  ctx.fillStyle = '#3a3f4f';
  if (vert) { ctx.fillRect(g.x0 * TS - cx + 3, g.y0 * TS - cy - 18, 10, 4); ctx.fillRect(g.x0 * TS - cx + 3, (g.y1 + 1) * TS - cy - 4, 10, 4); }
}
function drawOverlays(cx, cy) {
  for (const e of enemies) {
    if (e.dead || e.d.boss) continue;
    if (!vis(e.x - 10, e.y - 30, 20, 40)) continue;
    const col = e.lvl > P.lvl + 2 ? '#ff6a6a' : e.lvl > P.lvl ? '#ffd93a' : '#e8f0ff';
    const g = glyphImg('Ур' + e.lvl, col);
    ctx.drawImage(g, Math.round(e.x - g.width / 2 - cx), Math.round(e.y + 1 - cy));
    if (e.hp < e.maxHp) {
      const bx = Math.round(e.x - 8 - cx), by = Math.round(e.y - e.hy - e.r - 10 - cy - (e.d.fly ? 6 : 0));
      ctx.fillStyle = '#1b1426'; ctx.fillRect(bx - 1, by - 1, 18, 4);
      ctx.fillStyle = '#ff4a5a'; ctx.fillRect(bx, by, Math.max(1, Math.round(16 * e.hp / e.maxHp)), 2);
    }
  }
  // маркеры над NPC
  for (const n of npcs) {
    const m = n.marker && n.marker();
    if (!m) continue;
    const g = glyphImg(m, '#ffd93a');
    ctx.drawImage(g, Math.round(n.x - g.width - cx), Math.round(n.y - 38 - cy + Math.sin(time * 5) * 2), g.width * 2, g.height * 2);
  }
  // подсказка «нажми»
  if (focus && mode === 'play') {
    const r = focus.ref;
    const g = glyphImg('!', '#7fe9ff');
    ctx.drawImage(g, Math.round(r.x - 3 - cx), Math.round(r.y - (r.kind === 'npc' ? 30 : 26) - cy + Math.sin(time * 6)));
  }
  for (const f of floats) {
    const g = glyphImg(f.txt, f.col);
    ctx.globalAlpha = clamp(f.t / 0.3, 0, 1);
    ctx.drawImage(g, Math.round(f.x - g.width / 2 - cx), Math.round(f.y - cy));
  }
  ctx.globalAlpha = 1;
  // стрелка к цели задания
  const q = questInfo();
  let tgt = q.at === 'vera' ? { x: V.x, y: V.y - 10 } : q.at ? { x: q.at[0] * TS + 8, y: q.at[1] * TS } : null;
  if (tgt && mode === 'play') {
    const sx = tgt.x - cx, sy = tgt.y - cy;
    if (sx < 6 || sy < 6 || sx > GW - 6 || sy > GH - 6) {
      const ox = P.x - cx, oy = P.y - 10 - cy, a = Math.atan2(sy - oy, sx - ox);
      const ax = ox + Math.cos(a) * 26, ay = oy + Math.sin(a) * 20;
      ctx.save(); ctx.translate(Math.round(ax), Math.round(ay)); ctx.rotate(a);
      ctx.fillStyle = '#1b1426'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd93a'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, -3); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      const bob = Math.sin(time * 5) * 2;
      ctx.fillStyle = '#1b1426'; ctx.beginPath(); ctx.moveTo(sx - 5, sy - 22 + bob); ctx.lineTo(sx + 5, sy - 22 + bob); ctx.lineTo(sx, sy - 15 + bob); ctx.fill();
      ctx.fillStyle = '#ffd93a'; ctx.beginPath(); ctx.moveTo(sx - 3, sy - 21 + bob); ctx.lineTo(sx + 3, sy - 21 + bob); ctx.lineTo(sx, sy - 17 + bob); ctx.fill();
    }
  }
}

/* ---------- Интерфейс ---------- */
const FACES = {};
function faceCanvas(key) {
  if (FACES[key] !== undefined) return FACES[key];
  const map = {
    hero: [SPR.hero.down[0], 2, 1, 12, 12], vera: [SPR.vera.down[0], 2, 1, 12, 12], mityai: [SPR.mityai.down[0], 2, 1, 12, 12],
    rusty: [SPR.rusty.down[0], 2, 1, 12, 12], android: [SPR.android.down[0], 2, 1, 12, 12], lev: [holoOf(SPR.lev.down[0]), 2, 1, 12, 12],
    shop: [MON.shopbot[0], 1, 2, 16, 16], archon: [MON.archon[F && F.archonP2 ? 2 : 0], 16, 8, 44, 44], term: [PROPS.terminal[0], 1, 3, 12, 12],
  };
  FACES[key] = map[key] || null;
  return FACES[key];
}
function paintFace(canvas, key) {
  const c = canvas.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, canvas.width, canvas.height);
  const f = faceCanvas(key);
  if (key === 'archon') FACES.archon = undefined;
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
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); chooseDialog(i); });
      box.appendChild(b);
    });
    box.classList.remove('hidden');
    $('dMore').classList.add('hidden');
    return;
  }
  const [who, text] = item;
  const ch = CHARS[who];
  $('dName').textContent = ch.name;
  $('dName').className = 'd-name ' + who;
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
  if (!dlg || !dlg.choosing) return;
  const fn = dlg.choices[i] && dlg.choices[i][1];
  dlg.choosing = false;
  $('dChoices').classList.add('hidden');
  if (fn) fn();
  nextLine();
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

// HUD
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setStyle(id, prop, v) { const k = id + prop; if (hudCache[k] !== v) { hudCache[k] = v; $(id).style[prop] = v; } }
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
  setText('qObj', q.o);
  const side = sideQuests().map((s) => s.t + ': ' + s.o).join('\n');
  setText('qSide', side);
  setStyle('skillCd', 'height', (P.skillCd > 0 ? 100 * P.skillCd / 6 : 0).toFixed(0) + '%');
  setStyle('dashCd', 'height', (P.dashCd > 0 ? 100 * P.dashCd / 0.8 : 0).toFixed(0) + '%');
  const showUse = !!focus && mode === 'play';
  $('bUse').classList.toggle('hidden', !showUse);
  if (focus) setText('useLbl', focus.label);
  $('hint').classList.toggle('hidden', !showUse);
  if (focus) setText('hint', 'E — ' + focus.label + (focus.ref.kind === 'npc' && CHARS[focus.ref.id] ? ': ' + CHARS[focus.ref.id].name : ''));
  if (bossOn && bossOn.aggro) {
    $('boss').classList.remove('hidden');
    setText('bossName', bossOn.d.name);
    setStyle('bossFill', 'width', (100 * bossOn.hp / bossOn.maxHp).toFixed(1) + '%');
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
  const sx = clamp(ptx - W / 2, 0, MW - W), sy = clamp(pty - H / 2, 0, MH - H);
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  m.drawImage(WORLD.minimap, sx, sy, W, H, 0, 0, W, H);
  for (const g of GATES) if (!F.gates[g.id]) { m.fillStyle = '#5af0ff'; m.fillRect(g.x0 - sx, g.y0 - sy, g.x1 - g.x0 + 1, g.y1 - g.y0 + 1); }
  m.fillStyle = '#ff3b3b';
  for (const e of enemies) if (!e.dead) m.fillRect((e.x / TS - sx) | 0, (e.y / TS - sy) | 0, e.d.boss ? 3 : 1, e.d.boss ? 3 : 1);
  m.fillStyle = '#7dff8a';
  for (const n of npcs) if (n !== V && !n.neutral) m.fillRect((n.x / TS - sx) | 0, (n.y / TS - sy) | 0, 2, 2);
  const q = questInfo();
  if (q.at && q.at !== 'vera') {
    const qx = clamp(q.at[0] - sx, 1, W - 3), qy = clamp(q.at[1] - sy, 1, H - 3);
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
  const side = sideQuests();
  const h = [];
  h.push(`<h3>Основное задание</h3><div class="jq"><b>${q.t}</b><span>${q.o}</span></div>`);
  if (side.length) h.push('<h3>Побочные задания</h3>' + side.map((s) => `<div class="jq"><b>${s.t}</b><span>${s.o}</span></div>`).join(''));
  h.push(`<h3>Макс</h3><div class="stats">
    <span>Уровень</span><b>${P.lvl}</b><span>Опыт</span><b>${P.xp}/${xpNeed(P.lvl)}</b>
    <span>Здоровье</span><b>${Math.ceil(P.hp)}/${maxHp()}</b><span>Атака</span><b>${atkPow()}</b>
    <span>Оружие</span><b>${WEAPONS[F.wpn - 1]}</b><span>Броня</span><b>${ARMORS[F.arm]}</b>
    <span>Машин сломано</span><b>${F.kills}</b><span>Хлам</span><b>${F.scrap}</b></div>`);
  $('jBody').innerHTML = h.join('');
  showScreen('journal');
}
function openMap() {
  mode = 'menu';
  const c = $('bigMap'), m = c.getContext('2d');
  m.imageSmoothingEnabled = false;
  m.drawImage(WORLD.minimap, 0, 0);
  m.fillStyle = 'rgba(0,0,0,0.15)'; m.fillRect(0, 0, MW, MH);
  for (const g of GATES) if (!F.gates[g.id]) { m.fillStyle = '#5af0ff'; m.fillRect(g.x0, g.y0, g.x1 - g.x0 + 1, g.y1 - g.y0 + 1); }
  LOC.beacons.forEach(([x, y], i) => { m.fillStyle = F.beacons[i] ? '#5af0ff' : '#3a4050'; m.fillRect(x - 1, y - 1, 3, 3); });
  const q = questInfo();
  if (q.at && q.at !== 'vera') { m.fillStyle = '#1b1426'; m.fillRect(q.at[0] - 3, q.at[1] - 3, 7, 7); m.fillStyle = '#ffd93a'; m.fillRect(q.at[0] - 2, q.at[1] - 2, 5, 5); }
  m.fillStyle = '#1b1426'; m.fillRect((P.x / TS - 3) | 0, (P.y / TS - 3) | 0, 7, 7);
  m.fillStyle = '#ffffff'; m.fillRect((P.x / TS - 2) | 0, (P.y / TS - 2) | 0, 5, 5);
  showScreen('mapScr');
}
const WPRICE = [30, 60, 100, 150], APRICE = [25, 50, 90, 130];
function openShop() { mode = 'menu'; renderShop(); showScreen('shop'); }
function renderShop() {
  $('shopScrap').textContent = F.scrap;
  const items = [];
  items.push({ ic: 'med', name: 'Аптечка', desc: `Лечит 45% здоровья. У тебя: ${F.med}/9`, price: 12, ok: F.med < 9, buy: () => { F.med++; } });
  if (F.wpn < 5) items.push({ ic: 'wpn', name: WEAPONS[F.wpn], desc: 'Атака +7', price: WPRICE[F.wpn - 1], ok: true, buy: () => { F.wpn++; } });
  else items.push({ ic: 'wpn', name: WEAPONS[4], desc: 'Лучшее оружие уже у тебя', price: 0, ok: false });
  if (F.arm < 4) items.push({ ic: 'arm', name: ARMORS[F.arm + 1], desc: '−8% входящего урона, +10 здоровья', price: APRICE[F.arm], ok: true, buy: () => { F.arm++; P.hp += 10; } });
  else items.push({ ic: 'arm', name: ARMORS[4], desc: 'Лучшая броня уже у тебя', price: 0, ok: false });
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
    b.addEventListener('click', () => { if (F.scrap < it.price) return; F.scrap -= it.price; it.buy(); sfx('buy'); renderShop(); saveGame(); });
    row.appendChild(b);
    list.appendChild(row);
  }
}
function refreshSoundBtns() {
  $('btnMusic').textContent = 'Музыка: ' + (AU.musOn ? 'вкл' : 'выкл');
  $('btnSfx').textContent = 'Звуки: ' + (AU.sfxOn ? 'вкл' : 'выкл');
}

/* ---------- Финал ---------- */
function finishGame(choice) {
  F.stage = 7; F.ending = choice;
  saveGame();
  mode = 'ending';
  setTrack('end');
  const E = ENDINGS[choice];
  $('endTitle').textContent = E.title;
  $('endText').innerHTML = E.text.map((t, i) => `<p style="animation-delay:${0.6 + i * 1.4}s">${t}</p>`).join('');
  $('endStats').textContent = `Уровень ${P.lvl} · машин сломано: ${F.kills}`;
  $('hud').classList.add('hidden'); $('controls').classList.add('hidden');
  showScreen('ending');
}

/* ---------- Сохранение ---------- */
function saveGame() {
  if (!P || mode === 'title') return;
  store.set('save', { v: 1, F, P: { x: P.x, y: P.y, lvl: P.lvl, xp: P.xp, hp: Math.max(1, P.hp) }, t: Date.now() });
}
function loadSave() { const s = store.get('save', null); return s && s.v === 1 ? s : null; }

/* ---------- Запуск ---------- */
function startGame(save) {
  F = save ? Object.assign(freshFlags(), save.F) : freshFlags();
  P = newPlayer();
  if (save) Object.assign(P, save.P);
  buildEntities();
  curReg = regAt(P.x, P.y);
  F.seen[curReg] = true;
  snapCam();
  showScreen(null);
  $('hud').classList.remove('hidden');
  $('controls').classList.remove('hidden');
  mode = 'play';
  saveGame();
  setTimeout(() => $('rotate').classList.add('hidden'), 6000);
  if (!save) runDialog(introDialog());
  else toast('С возвращением! ' + questInfo().t);
}
function toTitle() {
  saveGame();
  mode = 'title';
  $('hud').classList.add('hidden'); $('controls').classList.add('hidden');
  $('btnContinue').classList.toggle('hidden', !loadSave());
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
    showPrologue();
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
  $('btnEndFree').addEventListener('click', () => { showScreen(null); $('hud').classList.remove('hidden'); $('controls').classList.remove('hidden'); mode = 'play'; });
  $('btnEndMenu').addEventListener('click', toTitle);
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
    if (hitstop > 0) hitstop -= dt; else updateGame(dt);
    updateFx(dt);
  } else if (mode === 'dead') { updateDead(dt); updateFx(dt); updateBullets(dt); }
  else if (mode === 'title' || mode === 'ending') {
    const t = time * 0.05;
    cam.x = (30 + Math.sin(t) * 22) * TS; cam.y = (62 + Math.cos(t * 0.7) * 16) * TS;
  }
  if (mode === 'dialog') tickDialog(dt);
  if (P) tickHUD(dt);
  // музыка по месту
  if (AU.ctx && mode !== 'ending') {
    if (mode === 'title') setTrack('calm');
    else if (P) {
      const r = regAt(P.x, P.y);
      setTrack(bossOn ? (bossOn.type === 'archon' ? 'final' : 'boss') : r === REG.CIT ? 'final' : r === REG.CITY || r === REG.STA ? 'city' : 'calm');
    }
  }
  render();
  inp.atkP = inp.skillP = inp.dashP = inp.useP = inp.medP = false;
  requestAnimationFrame(frame);
}

resize();
bindUI();
toTitle();
P = newPlayer(); // для фона титульного экрана
P.x = cam.x; P.y = cam.y;
buildEntities();
requestAnimationFrame(frame);
