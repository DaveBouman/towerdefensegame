import { GRID_CONFIG } from '../config/gridConfig';

/** Column labels across the top of the board (x). */
export const boardColLabel = (col: number): string => String(col);

/** Row letters down the side of the board (y), A = top. */
export const boardRowLabel = (row: number): string =>
    String.fromCharCode(65 + Math.max(0, Math.min(25, row)));

export const BOARD_COL_LABELS: readonly string[] = Array.from(
    { length: GRID_CONFIG.cols },
    (_, col) => boardColLabel(col),
);

export const BOARD_ROW_LABELS: readonly string[] = Array.from(
    { length: GRID_CONFIG.rows },
    (_, row) => boardRowLabel(row),
);
