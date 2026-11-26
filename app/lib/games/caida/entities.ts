// Tablero y piezas de CAÍDA, portados de references/started-games/03-tetris/game.js.
// Cambios respecto al original: cada función recibe el tablero o la pieza en lugar de leer
// globales, `clearLines` devuelve las filas borradas (para el destello) en lugar de tocar el
// HUD, y `drawBlock` pinta en píxeles lógicos un sprite de tubo de neón de PIECE_COLORS.

import { COLS, KICKS, PIECE_COUNT, PIECES, ROWS, type PieceType, type Shape } from "./constants";
import { BLOCK_FILL_ALPHA, BLOCK_GLOW, BLOCK_LINE, HIGHLIGHT_H, PALETTE, PIECE_COLORS } from "./palette";

/** ROWS × COLS: 0 = vacía, 1–8 = índice de color de la pieza que la ocupa. */
export type Board = number[][];

export type Piece = { type: PieceType; shape: Shape; x: number; y: number };

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

/** Pieza aleatoria: sorteo puro e independiente entre las 8, sin bolsa. */
export function randomPiece(): Piece {
  const type = (Math.floor(Math.random() * PIECE_COUNT) + 1) as PieceType;
  const shape = (PIECES[type] as Shape).map((row) => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

/** ¿La forma, colocada en (ox, oy), se sale del tablero o pisa un bloque fijado? */
export function collide(board: Board, shape: Shape, ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

/** Rotación horaria: transponer e invertir filas. */
export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

/** Rota la pieza con wall kicks [0, −1, 1, −2, 2]. Devuelve si pudo rotar. */
export function tryRotate(board: Board, piece: Piece): boolean {
  const rotated = rotateCW(piece.shape);
  for (const kick of KICKS) {
    if (!collide(board, rotated, piece.x + kick, piece.y)) {
      piece.shape = rotated;
      piece.x += kick;
      return true;
    }
  }
  return false;
}

/** Fija la pieza en el tablero. */
export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c]) board[piece.y + r][piece.x + c] = piece.shape[r][c];
}

/**
 * Borra las filas completas y mete filas vacías arriba, como la referencia.
 * Devuelve los índices que tenían esas filas antes de borrarlas (para pintar el destello).
 */
export function clearLines(board: Board): number[] {
  const full: number[] = [];
  for (let r = 0; r < ROWS; r++) if (board[r].every((v) => v !== 0)) full.push(r);
  // De abajo arriba, para que los índices pendientes sigan siendo válidos.
  for (let i = full.length - 1; i >= 0; i--) board.splice(full[i], 1);
  for (let i = 0; i < full.length; i++) board.unshift(new Array<number>(COLS).fill(0));
  return full;
}

/** Fila en la que aterrizaría la pieza si cayera ahora. */
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}

/**
 * Sprites de bloque por color y tamaño, con el halo ya pintado: `shadowBlur` en cada uno de
 * los ~200 bloques por frame sería caro. La caché es de cada motor (no global de módulo) y se
 * rellena la primera vez que se pide cada combinación.
 */
export type BlockSprites = {
  get(colorIndex: number, size: number): HTMLCanvasElement | null;
  /** Margen alrededor del bloque que ocupa el halo, en px lógicos. */
  pad: number;
};

export function createBlockSprites(dpr: number): BlockSprites {
  const pad = BLOCK_GLOW + BLOCK_LINE;
  const cache = new Map<string, HTMLCanvasElement>();

  function render(color: string, size: number): HTMLCanvasElement {
    const sprite = document.createElement("canvas");
    sprite.width = Math.ceil((size + pad * 2) * dpr);
    sprite.height = sprite.width;
    const c = sprite.getContext("2d");
    if (!c) return sprite;
    c.scale(dpr, dpr);
    c.translate(pad, pad);

    const inset = 2; // separación entre tubos vecinos
    const x = inset;
    const w = size - inset * 2;

    // Relleno translúcido del tubo.
    c.globalAlpha = BLOCK_FILL_ALPHA;
    c.fillStyle = color;
    c.fillRect(x, x, w, w);

    // Contorno con halo: es lo que sobrevive a las scanlines.
    c.globalAlpha = 1;
    c.shadowColor = color;
    c.shadowBlur = BLOCK_GLOW;
    c.strokeStyle = color;
    c.lineWidth = BLOCK_LINE;
    c.strokeRect(x + BLOCK_LINE / 2, x + BLOCK_LINE / 2, w - BLOCK_LINE, w - BLOCK_LINE);

    // Reflejo de cristal en el borde superior, sin halo.
    c.shadowBlur = 0;
    c.fillStyle = PALETTE.highlight;
    c.fillRect(x + BLOCK_LINE, x + BLOCK_LINE, w - BLOCK_LINE * 2, HIGHLIGHT_H);
    return sprite;
  }

  return {
    pad,
    get(colorIndex, size) {
      const color = PIECE_COLORS[colorIndex];
      if (!color) return null;
      const key = `${colorIndex}:${size}`;
      let sprite = cache.get(key);
      if (!sprite) {
        sprite = render(color, size);
        cache.set(key, sprite);
      }
      return sprite;
    },
  };
}

/** Pinta un bloque de `size` px con su esquina en (px, py), en píxeles lógicos. */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  sprites: BlockSprites,
  px: number,
  py: number,
  colorIndex: number,
  size: number,
  alpha = 1,
): void {
  const sprite = sprites.get(colorIndex, size);
  if (!sprite) return;
  const full = size + sprites.pad * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, px - sprites.pad, py - sprites.pad, full, full);
  ctx.restore();
}
