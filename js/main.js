// ============================================================================
// main.js — Snake 2D (Neon Tech + Start Screen) — SIN IMÁGENES (Canvas Neon)
// ----------------------------------------------------------------------------
// + EXTRA:
//   - Música mientras juegas (bgm)
//   - SFX cuando pierdes (game over)
//   - Guardar y mostrar puntuación más alta (localStorage)
// ============================================================================

// ---------------------- Configuración general ----------------------
const GRID = 20;              // 20x20
const BASE_SIZE = 600;        // tablero lógico
const GROW_PER_FOOD = 1;

const SPEEDS = [8, 8, 10, 10, 14, 14, 16, 16, 18, 20];
function foodTTL(level) { return Math.max(3, 9 - level); }
function obstaclesFor(level) { return Math.min(level - 1, 12); }

// ---------------------- DOM ----------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const tint = document.getElementById('tint');
const tctx = tint.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const levelEl = document.getElementById('level');
const speedEl = document.getElementById('speed');
const foodTimerEl = document.getElementById('foodTimer');

const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');

const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalBtn = document.getElementById('modalBtn');

// Start Screen
const startScreen = document.getElementById('startScreen');
const btnPlay = document.getElementById('btnPlay');
const btnHow = document.getElementById('btnHow');

// Audios (deben existir en el HTML)
const bgm = document.getElementById('bgm');
const sfxGameOver = document.getElementById('sfxGameOver');

// ---------------------- High Score (localStorage) ----------------------
const HS_KEY = 'snake2d_highscore';

function getHighScore() {
  return Number(localStorage.getItem(HS_KEY) || 0);
}
function setHighScore(val) {
  localStorage.setItem(HS_KEY, String(val));
}
function updateHighScore() {
  if (!highScoreEl) return;
  highScoreEl.textContent = String(getHighScore());
}
function tryUpdateHighScore() {
  const hs = getHighScore();
  if (state && state.score > hs) {
    setHighScore(state.score);
    updateHighScore();
  }
}

// ---------------------- Audio helpers ----------------------
// Nota: Muchos navegadores requieren interacción del usuario para iniciar audio.
async function playBgm() {
  if (!bgm) return;
  try {
    bgm.volume = 0.35;
    await bgm.play();
  } catch {
    // Autoplay bloqueado: se reintenta al presionar JUGAR o al despausar
  }
}
function pauseBgm() {
  if (!bgm) return;
  bgm.pause();
}
function stopBgm() {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}
function playGameOverSfx() {
  if (!sfxGameOver) return;
  try {
    sfxGameOver.currentTime = 0;
    sfxGameOver.volume = 0.9;
    sfxGameOver.play();
  } catch {}
}

// ---------------------- Estado ----------------------
let state = null;
let lastTime = 0;
let accumulator = 0;

// ---------------------- Canvas sizing (HiDPI + responsivo) ----------------------
function getCssBoardSize() {
  const rect = canvas.getBoundingClientRect();
  const size = Math.max(260, Math.min(BASE_SIZE, Math.floor(rect.width || BASE_SIZE)));
  return size;
}

function setupCanvasHiDPI() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssSize = getCssBoardSize();

  // GAME
  canvas.style.width = cssSize + 'px';
  canvas.style.height = cssSize + 'px';
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // TINT
  tint.style.width = cssSize + 'px';
  tint.style.height = cssSize + 'px';
  tint.width = Math.round(cssSize * dpr);
  tint.height = Math.round(cssSize * dpr);
  tctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  state.boardPx = cssSize;
}

function cellPx() {
  return state.boardPx / GRID;
}

function clampBoardSizeOnResize() {
  if (!state) return;
  setupCanvasHiDPI();
  drawTint();
}

// ---------------------- Utilidades ----------------------
function randomCell() { return { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 }; }
function cellsEqual(a, b) { return a.x === b.x && a.y === b.y; }
function cellInSnake(c) { return state.snake.some((s) => cellsEqual(s, c)); }
function cellInObstacles(c) { return state.obstacles.some((o) => cellsEqual(o, c)); }
function freeRandomCell() {
  let c;
  do { c = randomCell(); } while (cellInSnake(c) || cellInObstacles(c));
  return c;
}
function cellCenter(c) {
  const CP = cellPx();
  return { cx: c.x * CP + CP / 2, cy: c.y * CP + CP / 2 };
}

// ---------------------- Comida ----------------------
function regenFoodTimer() { state.foodTTL = foodTTL(state.level); state.foodTimer = state.foodTTL; }
function placeFood() { state.food = freeRandomCell(); regenFoodTimer(); }
function tickFoodTimer(dt) { state.foodTimer -= dt; if (state.foodTimer <= 0) placeFood(); }

// ---------------------- Obstáculos ----------------------
function buildObstacles(level) {
  const n = obstaclesFor(level), obs = [];
  for (let i = 0; i < n; i++) {
    let c;
    do { c = randomCell(); }
    while (
      cellInSnake(c) ||
      (state.food && cellsEqual(c, state.food)) ||
      obs.some((o) => cellsEqual(o, c))
    );
    obs.push(c);
  }
  return obs;
}

// ---------------------- Niveles y HUD ----------------------
function levelUpIfNeeded() {
  const newLevel = Math.min(1 + Math.floor(state.score / 30), SPEEDS.length);
  if (newLevel !== state.level) {
    state.level = newLevel;
    state.obstacles = buildObstacles(state.level);
  }
}
function updateHUD() {
  scoreEl.textContent = state.score;
  levelEl.textContent = state.level;
  const cps = SPEEDS[Math.min(state.level - 1, SPEEDS.length - 1)];
  speedEl.textContent = String(cps);
  foodTimerEl.textContent = String(Math.ceil(state.foodTimer));

  updateHighScore();
}

// ---------------------- Start Screen helpers ----------------------
function showStart() { startScreen.classList.remove('hidden'); }
function hideStart() { startScreen.classList.add('hidden'); }

// ---------------------- Inicio de juego ----------------------
function newGame() {
  state = {
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    snake: [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }],
    grow: 0,
    food: { x: 0, y: 0 },
    foodTTL: 8,
    foodTimer: 8,
    score: 0,
    level: 1,
    obstacles: [],
    playing: true,
    over: false,

    started: false,
    paused: true,

    boardPx: BASE_SIZE,
  };

  setupCanvasHiDPI();
  accumulator = 0;

  state.obstacles = buildObstacles(state.level);
  placeFood();
  updateHUD();
  updateHighScore();
  drawTint();
  hideOverlay();

  // En la pantalla de inicio dejamos la música detenida
  stopBgm();
}

// ---------------------- Movimiento ----------------------
function step() {
  const nd = state.nextDir;
  if (!(nd.x === -state.dir.x && nd.y === -state.dir.y)) state.dir = nd;

  const head = state.snake[0];
  const nx = head.x + state.dir.x, ny = head.y + state.dir.y;

  if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) return gameOver();
  const newHead = { x: nx, y: ny };

  if (cellInObstacles(newHead) || state.snake.some((s) => cellsEqual(s, newHead))) return gameOver();

  state.snake.unshift(newHead);

  if (cellsEqual(newHead, state.food)) {
    state.score += 10;
    state.grow += 1;
    levelUpIfNeeded();
    placeFood();
    updateHUD();
  }

  if (state.grow > 0) state.grow--;
  else state.snake.pop();
}

// ---------------------- Estados especiales ----------------------
function gameOver() {
  state.playing = false;
  state.over = true;

  pauseBgm();
  playGameOverSfx();
  tryUpdateHighScore();

  showOverlay(
    '¡Game Over!',
    `Puntaje: <b>${state.score}</b><br/>Máxima: <b>${getHighScore()}</b><br/>Presiona <b>R</b> para reiniciar.`,
    'Reiniciar'
  );
}

function togglePause(force) {
  if (state.over) return;
  const willPause = typeof force === 'boolean' ? force : !state.paused;
  state.paused = willPause;

  if (willPause) pauseBgm();
  else playBgm();

  willPause
    ? showOverlay('Juego en pausa', 'Presiona <b>P</b> para continuar.', 'Continuar')
    : hideOverlay();
}

// ---------------------- Fondo tipo tech grid (neón) ----------------------
function drawBackground() {
  const w = state.boardPx, h = state.boardPx;
  const CP = cellPx();

  ctx.fillStyle = '#06111b';
  ctx.fillRect(0, 0, w, h);

  const g1 = ctx.createRadialGradient(w * 0.15, h * 0.15, 20, w * 0.15, h * 0.15, w * 0.9);
  g1.addColorStop(0, 'rgba(124,60,255,0.16)');
  g1.addColorStop(1, 'rgba(124,60,255,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);

  const g2 = ctx.createRadialGradient(w * 0.85, h * 0.25, 20, w * 0.85, h * 0.25, w * 0.9);
  g2.addColorStop(0, 'rgba(0,255,179,0.14)');
  g2.addColorStop(1, 'rgba(0,255,179,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;

  for (let i = 0; i <= GRID; i++) {
    const p = i * CP + 0.5;

    ctx.strokeStyle = 'rgba(0,194,255,0.35)';
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, h); ctx.stroke();

    ctx.strokeStyle = 'rgba(124,60,255,0.25)';
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(w, p); ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.restore();
}

// ---------------------- Efecto neón helper ----------------------
function neonStrokePath(drawPathFn, glowColor, coreColor, glowW, coreW, glowAlpha = 0.9) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = glowAlpha;
  ctx.strokeStyle = glowColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = glowW * 1.6;
  ctx.lineWidth = glowW;
  ctx.beginPath(); drawPathFn(); ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.shadowBlur = coreW * 0.9;
  ctx.strokeStyle = coreColor;
  ctx.shadowColor = coreColor;
  ctx.lineWidth = coreW;
  ctx.beginPath(); drawPathFn(); ctx.stroke();

  ctx.restore();
}

function neonFillCircle(x, y, r, glowColor, coreColor) {
  ctx.save();

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = glowColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = r * 1.4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = coreColor;
  ctx.shadowColor = coreColor;
  ctx.shadowBlur = r * 0.7;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------------------- Obstáculos (neón discreto) ----------------------
function drawObstacles() {
  const CP = cellPx();

  for (const o of state.obstacles) {
    const x = o.x * CP, y = o.y * CP;
    const cx = x + CP / 2, cy = y + CP / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + CP * 0.18, y + CP * 0.18, CP * 0.64, CP * 0.64);

    ctx.shadowColor = 'rgba(0,194,255,0.6)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(0,194,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + CP * 0.20, y + CP * 0.20, CP * 0.60, CP * 0.60);

    neonFillCircle(cx, cy, CP * 0.10, 'rgba(0,255,179,0.8)', 'rgba(0,255,179,0.95)');
    ctx.restore();
  }
}

// ---------------------- Manzana (neón) ----------------------
function drawApple() {
  const CP = cellPx();
  const { cx, cy } = cellCenter(state.food);

  neonFillCircle(cx, cy + 1, CP * 0.28, 'rgba(255,0,102,0.55)', 'rgba(255,72,140,0.92)');

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(cx - CP * 0.18, cy - CP * 0.12, CP * 0.10, CP * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,200,0,0.55)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(255,200,0,0.9)';
  ctx.lineWidth = Math.max(2, CP * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx, cy - CP * 0.26);
  ctx.lineTo(cx + CP * 0.08, cy - CP * 0.36);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0,255,179,0.7)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(0,255,179,0.75)';
  ctx.beginPath();
  ctx.ellipse(cx + CP * 0.30, cy - CP * 0.32, CP * 0.30, CP * 0.18, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------- Serpiente (tubo neón) ----------------------
function drawSnake() {
  const CP = cellPx();
  const pts = state.snake.map(cellCenter);

  const drawPath = () => {
    if (pts.length === 1) {
      ctx.moveTo(pts[0].cx, pts[0].cy);
      ctx.lineTo(pts[0].cx + 0.01, pts[0].cy + 0.01);
      return;
    }
    ctx.moveTo(pts[0].cx, pts[0].cy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].cx, pts[i].cy);
  };

  const coreW = CP * 0.62;
  const glowW = CP * 0.80;

  neonStrokePath(
    drawPath,
    'rgba(0,255,179,0.55)',
    'rgba(0,255,179,0.95)',
    glowW,
    coreW,
    0.9
  );

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.shadowColor = 'rgba(255,255,255,0.25)';
  ctx.shadowBlur = 8;
  ctx.lineWidth = CP * 0.18;
  ctx.beginPath(); drawPath(); ctx.stroke();
  ctx.restore();

  const head = pts[0];
  drawHead(head.cx, head.cy, CP);
}

function drawHead(cx, cy, CP) {
  neonFillCircle(cx, cy, CP * 0.38, 'rgba(124,60,255,0.55)', 'rgba(124,60,255,0.92)');

  const d = state.dir;
  const px = -d.y, py = d.x;

  const f = CP * 0.14;
  const s = CP * 0.10;
  const ex1 = cx + d.x * f + px * s;
  const ey1 = cy + d.y * f + py * s;
  const ex2 = cx + d.x * f - px * s;
  const ey2 = cy + d.y * f - py * s;

  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.65)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(ex1, ey1, CP * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex2, ey2, CP * 0.08, 0, Math.PI * 2); ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#08111a';
  ctx.beginPath(); ctx.arc(ex1 + d.x * 2, ey1 + d.y * 2, CP * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex2 + d.x * 2, ey2 + d.y * 2, CP * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(cx - CP * 0.20, cy - CP * 0.25, CP * 0.18, CP * 0.26, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------- Render ----------------------
function render() {
  ctx.clearRect(0, 0, state.boardPx, state.boardPx);

  drawBackground();
  drawObstacles();
  drawApple();
  drawSnake();

  ctx.save();
  const w = state.boardPx, h = state.boardPx;
  const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---------------------- Capa decorativa (texto en canvas) ----------------------
function drawTint() {
  const w = state.boardPx, h = state.boardPx;

  tctx.clearRect(0, 0, w, h);

  tctx.font = '700 14px system-ui, Arial';
  tctx.textAlign = 'center';

  tctx.fillStyle = 'rgba(0,255,179,0.28)';
  tctx.shadowColor = 'rgba(0,255,179,0.75)';
  tctx.shadowBlur = 14;
  tctx.fillText('', w / 2, h * 0.70);
  tctx.shadowBlur = 0;
}

// ---------------------- Loop principal ----------------------
function loop(ts) {
  if (!state) return;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;

  if (state.started && !state.paused && state.playing) {
    const stepPerSec = SPEEDS[Math.min(state.level - 1, SPEEDS.length - 1)];
    accumulator += dt;
    const stepTime = 1 / stepPerSec;

    while (accumulator >= stepTime) {
      step();
      accumulator -= stepTime;
    }
    tickFoodTimer(dt);
  }

  updateHUD();
  render();
  requestAnimationFrame(loop);
}

// ---------------------- Entradas ----------------------
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();

  if (!state.started) {
    if (k === 'r') {
      newGame();
      showStart();
    }
    return;
  }

  if (k === 'arrowup' || k === 'w') state.nextDir = { x: 0, y: -1 };
  else if (k === 'arrowdown' || k === 's') state.nextDir = { x: 0, y: 1 };
  else if (k === 'arrowleft' || k === 'a') state.nextDir = { x: -1, y: 0 };
  else if (k === 'arrowright' || k === 'd') state.nextDir = { x: 1, y: 0 };
  else if (k === 'p') togglePause();
  else if (k === 'r') {
    newGame();
    showStart();
  }
});

btnPause.addEventListener('click', () => {
  if (!state.started) return;
  togglePause();
});
btnReset.addEventListener('click', () => {
  newGame();
  showStart();
});

modalBtn.addEventListener('click', () => {
  if (state.over) {
    newGame();
    showStart();
  } else {
    hideOverlay();
  }
});

// Start Screen botones
btnPlay.addEventListener('click', async () => {
  hideStart();
  state.started = true;
  state.paused = false;
  hideOverlay();
  await playBgm();
});

btnHow.addEventListener('click', () => {
  showOverlay(
    'Controles',
    'Mover: <b>← ↑ → ↓</b> o <b>W A S D</b><br/>Pausa: <b>P</b><br/>Reiniciar: <b>R</b>',
    'Cerrar'
  );
});

// ---------------------- Overlay ----------------------
function showOverlay(title, html, btnText) {
  overlay.classList.remove('hidden');
  modalTitle.textContent = title;
  modalText.innerHTML = html;
  modalBtn.textContent = btnText;
}
function hideOverlay() { overlay.classList.add('hidden'); }

// ---------------------- Resize (mantener cuadrícula completa) ----------------------
window.addEventListener('resize', () => {
  clampBoardSizeOnResize();
});

// ---------------------- Inicio ----------------------
(function start() {
  newGame();
  showStart();
  requestAnimationFrame((t) => { lastTime = t; requestAnimationFrame(loop); });
})();