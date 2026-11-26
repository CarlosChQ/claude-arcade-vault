// Motor de CAÍDA: estado, bucle rAF, caída automática, fijado y líneas de game.js,
// encapsulados en una instancia. No hay globales de módulo mutables: dos montajes seguidos
// no comparten estado. El canvas no pinta HUD, "GAME OVER" ni pantallas de pausa: React
// recibe las estadísticas por onStats/onGameOver.

import { MAX_SCORE } from "@/app/lib/scores";
import { sameExtras, type CreateEngine, type GameStats } from "../engine";
import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLS,
  GHOST_ALPHA,
  H,
  HARD_DROP_POINTS,
  LINE_SCORES,
  LINES_PER_LEVEL,
  MAX_DT_MS,
  NEXT_BLOCK,
  NEXT_GRID,
  NEXT_SIZE,
  PANEL_X,
  PANEL_Y,
  ROWS,
  SOFT_DROP_POINTS,
  W,
  dropIntervalFor,
} from "./constants";
import {
  collide,
  createBlockSprites,
  createBoard,
  drawBlock,
  ghostY,
  merge,
  randomPiece,
  tryRotate,
  clearLines,
  type Board,
  type Piece,
} from "./entities";
import { createKeyboardInput, type Action } from "./input";
import {
  FLASH_GLOW,
  FLASH_MS,
  FRAME_GLOW,
  FRAME_LINE,
  GRID_ALPHA,
  GRID_DOT,
  PALETTE,
  PANEL_GLOW,
  PANEL_LINE,
  WELL_GLOW_ALPHA,
} from "./palette";

type State = "playing" | "gameover";

/** Filas recién completadas y tiempo que le queda al destello, en ms. Solo afecta a draw(). */
type Flash = { rows: number[]; t: number };

const MAX_DPR = 2;

export const createCaidaEngine: CreateEngine = (canvas, events) => {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("CAÍDA: el navegador no ofrece un contexto 2D de canvas");
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // Buffer escalado por devicePixelRatio; el CSS lo ajusta al 100 % de .crt-screen (4:3).
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Fuente pixel de la plataforma (next/font la expone en --pixel) para la etiqueta del panel.
  const pixelFont = getComputedStyle(canvas).getPropertyValue("--pixel").trim() || "monospace";

  const input = createKeyboardInput();
  const sprites = createBlockSprites(dpr);

  // ── Estado de la partida (por instancia) ─────────────────────────────────
  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = dropIntervalFor(1);
  let dropAccum = 0;
  let flashes: Flash[] = [];
  let state: State = "playing";
  let gameOverEmitted = false;

  // ── Estado del bucle ─────────────────────────────────────────────────────
  let rafId: number | null = null;
  let lastTime: number | null = null; // null → el próximo frame usa dt = 0
  let started = false;
  let paused = false;
  let stopped = false; // FIN o derrota: la partida deja de avanzar
  let destroyed = false;
  let lastStats: GameStats | null = null;

  function addScore(points: number) {
    score = Math.min(MAX_SCORE, score + points);
  }

  /** La siguiente pasa a ser la actual. Si no cabe al aparecer, la partida termina. */
  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) state = "gameover";
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = dropIntervalFor(1);
    dropAccum = 0;
    flashes = [];
    state = "playing";
    gameOverEmitted = false;
    next = randomPiece();
    spawn();
  }

  /** merge + clearLines + aparición de la siguiente, como lockPiece() de la referencia. */
  function lockPiece() {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared.length) {
      lines += cleared.length;
      addScore((LINE_SCORES[cleared.length] ?? 0) * level);
      level = Math.floor(lines / LINES_PER_LEVEL) + 1;
      dropInterval = dropIntervalFor(level);
      flashes.push({ rows: cleared, t: FLASH_MS });
    }
    spawn();
  }

  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(SOFT_DROP_POINTS);
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    const gy = ghostY(board, current);
    addScore((gy - current.y) * HARD_DROP_POINTS);
    current.y = gy;
    lockPiece();
  }

  function apply(action: Action) {
    switch (action) {
      case "left":
        if (!collide(board, current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "right":
        if (!collide(board, current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "rotate":
        tryRotate(board, current);
        break;
      case "softDrop":
        softDrop();
        break;
      case "hardDrop":
        hardDrop();
        break;
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────
  function update(dt: number) {
    // Acciones del teclado desde el último frame, en orden. Tras perder se descartan.
    for (const action of input.drain()) {
      if (state !== "playing") break;
      apply(action);
    }

    flashes.forEach((f) => (f.t -= dt));
    flashes = flashes.filter((f) => f.t > 0);

    if (state !== "playing") return;

    // Caída automática, como loop() de la referencia.
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
  }

  // ── Draw (sin HUD ni overlay) ────────────────────────────────────────────
  const BOARD_W = COLS * BLOCK;
  const BOARD_H = ROWS * BLOCK;

  // Resplandor del fondo del pozo: el violeta de la portada sube desde abajo y se apaga.
  const wellGradient = ctx.createLinearGradient(0, BOARD_Y + BOARD_H, 0, BOARD_Y);
  wellGradient.addColorStop(0, PALETTE.wellGlow);
  wellGradient.addColorStop(0.55, "rgba(42,0,74,0)");

  function drawWell() {
    ctx.save();
    ctx.globalAlpha = WELL_GLOW_ALPHA;
    ctx.fillStyle = wellGradient;
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    ctx.restore();
  }

  /** Puntos en las intersecciones interiores: aguantan las scanlines mejor que las líneas finas. */
  function drawGrid() {
    ctx.save();
    ctx.globalAlpha = GRID_ALPHA;
    ctx.fillStyle = PALETTE.grid;
    for (let c = 1; c < COLS; c++)
      for (let r = 1; r < ROWS; r++)
        ctx.fillRect(BOARD_X + c * BLOCK - GRID_DOT / 2, BOARD_Y + r * BLOCK - GRID_DOT / 2, GRID_DOT, GRID_DOT);
    ctx.restore();
  }

  /** Paredes del pozo: una U abierta por arriba, por donde entran las piezas. */
  function drawWellWalls() {
    const half = FRAME_LINE / 2;
    ctx.save();
    ctx.strokeStyle = PALETTE.frame;
    ctx.lineWidth = FRAME_LINE;
    ctx.shadowColor = PALETTE.frame;
    ctx.shadowBlur = FRAME_GLOW;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(BOARD_X - half, BOARD_Y);
    ctx.lineTo(BOARD_X - half, BOARD_Y + BOARD_H - half);
    ctx.lineTo(BOARD_X + BOARD_W + half, BOARD_Y + BOARD_H - half);
    ctx.lineTo(BOARD_X + BOARD_W + half, BOARD_Y);
    ctx.stroke();
    ctx.restore();
  }

  function drawPiece(piece: Piece, row: number, alpha = 1) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c])
          drawBlock(
            ctx,
            sprites,
            BOARD_X + (piece.x + c) * BLOCK,
            BOARD_Y + (row + r) * BLOCK,
            piece.shape[r][c],
            BLOCK,
            alpha,
          );
  }

  /** Destello de las filas completadas: barra de --ink con halo que se apaga con ease-out. */
  function drawFlashes() {
    ctx.save();
    ctx.fillStyle = PALETTE.flash;
    ctx.shadowColor = PALETTE.flash;
    ctx.shadowBlur = FLASH_GLOW;
    for (const f of flashes) {
      const k = Math.max(0, f.t / FLASH_MS);
      ctx.globalAlpha = k * k; // ease-out: el brillo cae rápido al principio
      for (const r of f.rows) ctx.fillRect(BOARD_X, BOARD_Y + r * BLOCK, BOARD_W, BLOCK);
    }
    ctx.restore();
  }

  /** Panel "SIGUIENTE": la pieza siguiente centrada en una caja de 4×4, como drawNext(). */
  function drawNextPanel() {
    ctx.save();
    ctx.fillStyle = PALETTE.label;
    ctx.font = `12px ${pixelFont}`;
    ctx.textBaseline = "bottom";
    ctx.fillText("SIGUIENTE", PANEL_X, PANEL_Y - 12);

    ctx.strokeStyle = PALETTE.frame;
    ctx.lineWidth = PANEL_LINE;
    ctx.shadowColor = PALETTE.frame;
    ctx.shadowBlur = PANEL_GLOW;
    ctx.strokeRect(PANEL_X, PANEL_Y, NEXT_SIZE, NEXT_SIZE);
    ctx.restore();

    // Centrado por las celdas ocupadas, no por la matriz: la I (4×4 con 3 filas vacías) y la
    // O quedan en el centro de la caja.
    const shape = next.shape;
    let minR = NEXT_GRID, maxR = -1, minC = NEXT_GRID, maxC = -1;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) {
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
    const ox = PANEL_X + (NEXT_SIZE - (maxC - minC + 1) * NEXT_BLOCK) / 2 - minC * NEXT_BLOCK;
    const oy = PANEL_Y + (NEXT_SIZE - (maxR - minR + 1) * NEXT_BLOCK) / 2 - minR * NEXT_BLOCK;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(ctx, sprites, ox + c * NEXT_BLOCK, oy + r * NEXT_BLOCK, shape[r][c], NEXT_BLOCK);
  }

  function draw() {
    ctx.fillStyle = PALETTE.background;
    ctx.fillRect(0, 0, W, H);

    drawWell();
    drawGrid();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, sprites, BOARD_X + c * BLOCK, BOARD_Y + r * BLOCK, board[r][c], BLOCK);
    drawFlashes();

    // Tras perder, la pieza que no cabe no se pinta: el tablero final queda congelado.
    if (state === "playing") {
      drawPiece(current, ghostY(board, current), GHOST_ALPHA);
      drawPiece(current, current.y);
    }

    drawWellWalls();
    drawNextPanel();
  }

  // ── Eventos hacia React ──────────────────────────────────────────────────
  function currentStats(): GameStats {
    return { score, lives: null, level, extras: [{ label: "Líneas", value: String(lines) }] };
  }

  /** Emite onStats solo si algún campo cambió desde la última emisión. */
  function emitStats() {
    const s = currentStats();
    const prev = lastStats;
    if (prev && prev.score === s.score && prev.level === s.level && sameExtras(prev.extras, s.extras)) return;
    lastStats = s;
    events.onStats(s);
  }

  function emitGameOver() {
    if (gameOverEmitted) return;
    gameOverEmitted = true;
    events.onGameOver(score);
  }

  // ── Bucle ────────────────────────────────────────────────────────────────
  function frame(ts: number) {
    rafId = null;
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT_MS);
    lastTime = ts;

    update(dt);
    if (state === "gameover") {
      stopped = true;
      flashes = [];
      syncInput();
    }
    draw();
    emitStats();
    if (state === "gameover") emitGameOver();

    scheduleFrame();
  }

  function shouldRun() {
    return started && !paused && !stopped && !destroyed;
  }

  function scheduleFrame() {
    if (rafId === null && shouldRun()) rafId = requestAnimationFrame(frame);
  }

  function cancelFrame() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /** Listeners puestos solo mientras el bucle corre: un motor en pausa no deja nada en window. */
  function syncInput() {
    if (shouldRun()) input.attach();
    else input.detach();
  }

  initGame();

  return {
    start() {
      if (started || destroyed) return;
      started = true;
      syncInput();
      lastTime = null;
      draw();
      emitStats();
      scheduleFrame();
    },

    pause() {
      if (paused || destroyed) return;
      paused = true;
      cancelFrame();
      syncInput();
    },

    resume() {
      if (!paused || destroyed) return;
      paused = false;
      lastTime = null; // primer frame tras reanudar con dt = 0: la pieza no baja de golpe
      syncInput();
      scheduleFrame();
    },

    end() {
      if (destroyed) return;
      stopped = true;
      cancelFrame();
      state = "gameover";
      flashes = [];
      syncInput();
      draw();
      emitStats();
      emitGameOver();
    },

    restart() {
      if (destroyed) return;
      cancelFrame();
      initGame();
      paused = false;
      stopped = false;
      lastTime = null;
      syncInput();
      draw();
      emitStats();
      scheduleFrame();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelFrame();
      input.detach();
    },
  };
};
