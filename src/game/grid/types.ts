export interface GridConfig {
    cols: number;
    rows: number;
    tileSize: number;
}

export interface GridPosition {
    col: number;
    row: number;
}

export interface WorldPosition {
    x: number;
    y: number;
}

export interface GridPixelSize {
    width: number;
    height: number;
}
