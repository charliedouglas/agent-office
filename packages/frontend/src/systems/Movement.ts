import EasyStar from 'easystarjs';

export class MovementSystem {
  private easystar: EasyStar.js;
  private grid: number[][];
  private gridWidth: number;
  private gridHeight: number;

  constructor(gridWidth: number, gridHeight: number) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.easystar = new EasyStar.js();

    // Create a walkable grid (0 = walkable, 1 = blocked)
    this.grid = [];
    for (let y = 0; y < gridHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < gridWidth; x++) {
        row.push(0); // All tiles walkable by default
      }
      this.grid.push(row);
    }

    this.easystar.setGrid(this.grid);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();
    this.easystar.disableCornerCutting();
  }

  setWalkable(x: number, y: number, walkable: boolean) {
    if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
      this.grid[y][x] = walkable ? 0 : 1;
      this.easystar.setGrid(this.grid);
    }
  }

  findPath(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    callback: (path: { x: number; y: number }[] | null) => void
  ) {
    this.easystar.findPath(fromX, fromY, toX, toY, (path) => {
      callback(path);
    });
    this.easystar.calculate();
  }
}
