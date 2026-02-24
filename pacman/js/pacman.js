// ============================================================================
// pacman.js — Pac-Man Canvas (look clásico tipo arcade + salida de fantasmas)
// Ajuste pedido: usar canvas fijo 680x600 (sin resize responsivo)
// ============================================================================

const canvas = document.getElementById("pac");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const statusEl = document.getElementById("status");

const overlay = document.getElementById("overlay");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const modalBtn = document.getElementById("modalBtn");

const btnPause = document.getElementById("btnPause");
const btnReset = document.getElementById("btnReset");

// --------- Maze (28x31) ---------
const MAZE_W = 28;
const MAZE_H = 31;

const RAW = [
  "1111111111111111111111111111",
  "1222222222222112222222222221",
  "1211112111112112111112111121",
  "1311112111112112111112111131",
  "1211112111112112111112111121",
  "1222222222222222222222222221",
  "1211112112111111112112111121",
  "1211112112111111112112111121",
  "1222222112222112222112222221",
  "1111112111112112111112111111",
  "0000012111112112111112100000",
  "0000012112222222222112100000",
  "1111112112111DD1112112111111",
  "0000002222100000012222000000",
  "1111112112100000012112111111",
  "0000012112111111112112100000",
  "0000012112222222222112100000",
  "1111112112111111112112111111",
  "1222222222222112222222222221",
  "1211112111112112111112111121",
  "1312222222222222222222222131",
  "1211112112111111112112111121",
  "1222222112222112222112222221",
  "1111112111112112111112111111",
  "0000012111112112111112100000",
  "0000012112222222222112100000",
  "0000012112111111112112100000",
  "1222222222222112222222222221",
  "1211111111112112111111111121",
  "1222222222222222222222222221",
  "1111111111111111111111111111"
];

// 1 muro, 2 punto, 3 pellet, 4 compuerta
function parseMaze() {
  const grid = [];
  for (let y = 0; y < MAZE_H; y++) {
    const row = [];
    for (let x = 0; x < MAZE_W; x++) {
      const ch = RAW[y][x] || "0";
      if (ch === "1") row.push(1);
      else if (ch === "2") row.push(2);
      else if (ch === "3") row.push(3);
      else if (ch === "D") row.push(4);
      else row.push(0);
    }
    grid.push(row);
  }
  return grid;
}

let state = null;

function newGame() {
  state = {
    grid: parseMaze(),
    score: 0,
    lives: 3,
    paused: false,
    over: false,

    // Pac-Man inicia en esquina (abajo-izquierda) y NO se mueve hasta input
    pac: {
      x: 1,
      y: MAZE_H - 2,
      dir: { x: 0, y: 0 },
      next: { x: 0, y: 0 },
      mouth: 0,
      started: false
    },

    // compuerta fantasmas
    ghostGateOpen: false,
    ghostGateTimer: 4.0,

    ghosts: [
      { x: 13, y: 14, dir: { x: 0, y: -1 }, color: "#ff3b3b", scared: 0 },
      { x: 14, y: 14, dir: { x: 0, y: -1 }, color: "#ff7ad9", scared: 0 },
      { x: 12, y: 14, dir: { x: 0, y: -1 }, color: "#61e9ff", scared: 0 },
      { x: 15, y: 14, dir: { x: 0, y: -1 }, color: "#ffb74a", scared: 0 }
    ],

    last: 0,
    acc: 0,
    stepTime: 1 / 10,

    // Tamaño fijo del tablero: se ajusta al <canvas width height>
    boardW: canvas.width,   // 680
    boardH: canvas.height   // 600
  };

  hideOverlay();
  updateHUD("Listo");
}

function updateHUD(statusText) {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  statusEl.textContent =
    statusText ??
    (state.over ? "Game Over" : state.paused ? "Pausa" : "Jugando");
}

function showOverlay(title, html, btnText) {
  overlay.classList.remove("hidden");
  modalTitle.textContent = title;
  modalText.innerHTML = html;
  modalBtn.textContent = btnText;
}
function hideOverlay() {
  overlay.classList.add("hidden");
}

function togglePause(force) {
  if (state.over) return;
  const will = typeof force === "boolean" ? force : !state.paused;
  state.paused = will;
  updateHUD(will ? "Pausa" : "Jugando");
  will
    ? showOverlay("Juego en pausa", "Presiona <b>P</b> para continuar.", "Continuar")
    : hideOverlay();
}

// --------- Tamaños por celda (tablero NO es cuadrado) ---------
function cellPxX() { return state.boardW / MAZE_W; }
function cellPxY() { return state.boardH / MAZE_H; }

// Para que todo se vea uniforme, usamos el menor de ambos para radios/lineWidth,
// pero posicionamos con X/Y reales.
function cellUnit() { return Math.min(cellPxX(), cellPxY()); }

// --------- Helpers ---------
function inBounds(x, y) { return x >= 0 && y >= 0 && x < MAZE_W && y < MAZE_H; }
function tileAt(x, y) { if (!inBounds(x, y)) return 1; return state.grid[y][x]; }

function isWallPac(x, y) {
  const t = tileAt(x, y);
  return (t === 1 || t === 4);
}

function isWallGhost(x, y) {
  const t = tileAt(x, y);
  if (t === 1) return true;
  if (t === 4 && !state.ghostGateOpen) return true;
  return false;
}

// --------- Movimiento ---------
function tryTurnPac() {
  const nx = state.pac.x + state.pac.next.x;
  const ny = state.pac.y + state.pac.next.y;
  if (!isWallPac(nx, ny)) state.pac.dir = { ...state.pac.next };
}

function stepPac() {
  if (!state.pac.started) return;

  tryTurnPac();
  if (state.pac.dir.x === 0 && state.pac.dir.y === 0) return;

  const nx = state.pac.x + state.pac.dir.x;
  const ny = state.pac.y + state.pac.dir.y;
  if (isWallPac(nx, ny)) return;

  state.pac.x = nx;
  state.pac.y = ny;

  const tile = state.grid[ny][nx];
  if (tile === 2) {
    state.grid[ny][nx] = 0;
    state.score += 10;
  } else if (tile === 3) {
    state.grid[ny][nx] = 0;
    state.score += 50;
    for (const g of state.ghosts) g.scared = 6.0;
  }
}

const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

function stepGhost(g) {
  if (g.scared > 0) g.scared = Math.max(0, g.scared - state.stepTime);

  const aheadX = g.x + g.dir.x;
  const aheadY = g.y + g.dir.y;
  const blocked = isWallGhost(aheadX, aheadY);

  let options = [];
  for (const d of DIRS) {
    const tx = g.x + d.x;
    const ty = g.y + d.y;
    if (!isWallGhost(tx, ty)) options.push(d);
  }
  const isJunction = options.length >= 3;

  if (blocked || isJunction) {
    const rev = { x: -g.dir.x, y: -g.dir.y };
    let choices = options.filter(d => !(d.x === rev.x && d.y === rev.y));
    if (choices.length === 0) choices = options;

    if (g.scared > 0) {
      const px = state.pac.x, py = state.pac.y;
      choices.sort((a, b) => {
        const da = (g.x + a.x - px) ** 2 + (g.y + a.y - py) ** 2;
        const db = (g.x + b.x - px) ** 2 + (g.y + b.y - py) ** 2;
        return db - da;
      });
      g.dir = choices[0];
    } else {
      if (Math.random() < 0.75) {
        const px = state.pac.x, py = state.pac.y;
        choices.sort((a, b) => {
          const da = (g.x + a.x - px) ** 2 + (g.y + a.y - py) ** 2;
          const db = (g.x + b.x - px) ** 2 + (g.y + b.y - py) ** 2;
          return da - db;
        });
        g.dir = choices[0];
      } else {
        g.dir = choices[(Math.random() * choices.length) | 0];
      }
    }
  }

  const nx = g.x + g.dir.x;
  const ny = g.y + g.dir.y;
  if (!isWallGhost(nx, ny)) { g.x = nx; g.y = ny; }
}

// --------- Colisiones ---------
function handleCollisions() {
  for (const g of state.ghosts) {
    if (g.x === state.pac.x && g.y === state.pac.y) {
      if (g.scared > 0) {
        state.score += 200;
        g.x = 13; g.y = 14; g.dir = { x: 0, y: -1 }; g.scared = 0;
      } else {
        state.lives -= 1;
        if (state.lives <= 0) gameOver();
        else {
          state.pac.x = 1; state.pac.y = MAZE_H - 2;
          state.pac.dir = { x: 0, y: 0 };
          state.pac.next = { x: 0, y: 0 };
          state.pac.started = false;

          const home = [[13, 14], [14, 14], [12, 14], [15, 14]];
          state.ghosts.forEach((gg, i) => {
            gg.x = home[i][0]; gg.y = home[i][1];
            gg.dir = { x: 0, y: -1 }; gg.scared = 0;
          });

          state.ghostGateOpen = false;
          state.ghostGateTimer = 4.0;

          updateHUD("¡Perdiste una vida!");
        }
      }
      break;
    }
  }
}

function remainingDots() {
  let c = 0;
  for (let y = 0; y < MAZE_H; y++) for (let x = 0; x < MAZE_W; x++) {
    if (state.grid[y][x] === 2 || state.grid[y][x] === 3) c++;
  }
  return c;
}

function winCheck() {
  if (remainingDots() === 0) {
    state.over = true;
    showOverlay("¡Ganaste!", `Puntaje: <b>${state.score}</b><br/>Presiona <b>R</b> para reiniciar.`, "Reiniciar");
    updateHUD("Victoria");
  }
}

function gameOver() {
  state.over = true;
  showOverlay("¡Game Over!", `Puntaje: <b>${state.score}</b><br/>Presiona <b>R</b> para reiniciar.`, "Reiniciar");
  updateHUD("Game Over");
}

// --------- Render ---------
function drawBackground() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, state.boardW, state.boardH);
}

function roundRectStroke(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.stroke();
}

function drawWalls() {
  const cx = cellPxX(), cy = cellPxY();
  const CU = cellUnit();

  ctx.save();
  ctx.lineWidth = Math.max(2.6, CU * 0.16);
  ctx.strokeStyle = "#1f3dff";
  ctx.shadowColor = "rgba(31,61,255,0.75)";
  ctx.shadowBlur = 14;

  for (let y = 0; y < MAZE_H; y++) for (let x = 0; x < MAZE_W; x++) {
    if (state.grid[y][x] !== 1) continue;
    const px = x * cx;
    const py = y * cy;
    roundRectStroke(px + 1, py + 1, cx - 2, cy - 2, CU * 0.22);
  }

  // compuerta
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2.0, CU * 0.10);
  ctx.strokeStyle = state.ghostGateOpen ? "rgba(0,0,0,0)" : "#ff7ad9";

  for (let y = 0; y < MAZE_H; y++) for (let x = 0; x < MAZE_W; x++) {
    if (state.grid[y][x] !== 4) continue;
    const px = x * cx;
    const py = y * cy + cy * 0.55;
    ctx.beginPath();
    ctx.moveTo(px + cx * 0.15, py);
    ctx.lineTo(px + cx * 0.85, py);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDots() {
  const cx = cellPxX(), cy = cellPxY();
  const CU = cellUnit();

  for (let y = 0; y < MAZE_H; y++) for (let x = 0; x < MAZE_W; x++) {
    const t = state.grid[y][x];
    if (t !== 2 && t !== 3) continue;

    const px = x * cx, py = y * cy;
    const mx = px + cx / 2;
    const my = py + cy / 2;

    ctx.fillStyle = "#ffd7b0";

    if (t === 2) {
      ctx.beginPath();
      ctx.arc(mx, my, CU * 0.085, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.shadowColor = "rgba(255,215,176,0.85)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(mx, my, CU * 0.20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawPac() {
  const cx = cellPxX(), cy = cellPxY();
  const CU = cellUnit();

  const mx = state.pac.x * cx + cx / 2;
  const my = state.pac.y * cy + cy / 2;

  state.pac.mouth += (state.paused || state.over || !state.pac.started) ? 0 : 0.20;
  const bite = (Math.sin(state.pac.mouth) * 0.35 + 0.45) * (Math.PI / 3);

  let base = 0;
  const dx = state.pac.dir.x, dy = state.pac.dir.y;
  if (dx === 1) base = 0;
  else if (dx === -1) base = Math.PI;
  else if (dy === 1) base = Math.PI / 2;
  else if (dy === -1) base = -Math.PI / 2;

  ctx.save();
  ctx.fillStyle = "#ffd400";
  ctx.shadowColor = "rgba(255,212,0,0.60)";
  ctx.shadowBlur = 14;

  if (!state.pac.started) {
    ctx.beginPath();
    ctx.arc(mx, my, CU * 0.40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.arc(mx, my, CU * 0.40, base + bite, base + (Math.PI * 2 - bite), false);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGhost(g) {
  const cx = cellPxX(), cy = cellPxY();
  const CU = cellUnit();

  const px = g.x * cx, py = g.y * cy;
  const mx = px + cx / 2;
  const my = py + cy / 2;

  const bodyColor = g.scared > 0 ? "#2a62ff" : g.color;

  ctx.save();
  ctx.fillStyle = bodyColor;
  ctx.shadowColor = g.scared > 0 ? "rgba(42,98,255,0.60)" : "rgba(255,255,255,0.10)";
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.arc(mx, my - cy * 0.05, CU * 0.36, Math.PI, 0, false);
  ctx.lineTo(mx + CU * 0.36, my + CU * 0.32);
  ctx.quadraticCurveTo(mx + CU * 0.25, my + CU * 0.42, mx + CU * 0.16, my + CU * 0.32);
  ctx.quadraticCurveTo(mx + CU * 0.07, my + CU * 0.42, mx - CU * 0.02, my + CU * 0.32);
  ctx.quadraticCurveTo(mx - CU * 0.11, my + CU * 0.42, mx - CU * 0.20, my + CU * 0.32);
  ctx.quadraticCurveTo(mx - CU * 0.29, my + CU * 0.42, mx - CU * 0.36, my + CU * 0.32);
  ctx.closePath();
  ctx.fill();

  const eyeOff = CU * 0.11;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(mx - eyeOff, my - CU * 0.05, CU * 0.095, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + eyeOff, my - CU * 0.05, CU * 0.095, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#001326";
  const ex = Math.sign(g.dir.x) * CU * 0.035;
  const ey = Math.sign(g.dir.y) * CU * 0.035;
  ctx.beginPath(); ctx.arc(mx - eyeOff + ex, my - CU * 0.05 + ey, CU * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + eyeOff + ex, my - CU * 0.05 + ey, CU * 0.045, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function render() {
  drawBackground();
  drawWalls();
  drawDots();
  drawPac();
  for (const g of state.ghosts) drawGhost(g);
}

// --------- Loop ---------
function loop(ts) {
  const dt = state.last ? (ts - state.last) / 1000 : 0;
  state.last = ts;

  if (!state.paused && !state.over) {
    if (!state.ghostGateOpen) {
      state.ghostGateTimer = Math.max(0, state.ghostGateTimer - dt);
      if (state.ghostGateTimer <= 0) state.ghostGateOpen = true;
    }

    state.acc += dt;
    while (state.acc >= state.stepTime) {
      stepPac();
      for (const g of state.ghosts) stepGhost(g);
      handleCollisions();
      winCheck();
      state.acc -= state.stepTime;
    }

    updateHUD(state.pac.started ? "Jugando" : "Listo (presiona una dirección)");
  }

  render();
  requestAnimationFrame(loop);
}

// --------- Inputs ---------
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (k === "p") togglePause();
  if (k === "r") { newGame(); return; }
  if (state.paused || state.over) return;

  let next = null;
  if (k === "arrowup" || k === "w") next = { x: 0, y: -1 };
  else if (k === "arrowdown" || k === "s") next = { x: 0, y: 1 };
  else if (k === "arrowleft" || k === "a") next = { x: -1, y: 0 };
  else if (k === "arrowright" || k === "d") next = { x: 1, y: 0 };
  if (!next) return;

  state.pac.next = next;

  if (!state.pac.started) {
    const nx = state.pac.x + next.x;
    const ny = state.pac.y + next.y;
    if (!isWallPac(nx, ny)) {
      state.pac.started = true;
      state.pac.dir = { ...next };
    }
  }
});

btnPause.addEventListener("click", () => togglePause());
btnReset.addEventListener("click", () => newGame());

modalBtn.addEventListener("click", () => {
  if (state.over) newGame();
  else togglePause(false);
});

// --------- Start ---------
newGame();
requestAnimationFrame(loop);