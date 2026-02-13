import Phaser from 'phaser';

const TILE = 32;

export class Desk {
  public x: number;
  public y: number;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number, teamColor: number = 0x666666) {
    const g = scene.add.graphics();
    const px = tileX * TILE;
    const py = tileY * TILE;

    this.x = px;
    this.y = py;
    this.graphics = g;

    // Desk surface (dark wood)
    g.fillStyle(0x5c4033, 1);
    g.fillRect(px - 12, py + 4, 24, 14);

    // Desk top highlight
    g.fillStyle(0x7a5a45, 1);
    g.fillRect(px - 11, py + 5, 22, 3);

    // Monitor (small rectangle on desk)
    g.fillStyle(0x222233, 1);
    g.fillRect(px - 5, py - 2, 10, 8);

    // Screen glow (team colored)
    g.fillStyle(teamColor, 0.7);
    g.fillRect(px - 4, py - 1, 8, 6);

    // Monitor stand
    g.fillStyle(0x444444, 1);
    g.fillRect(px - 1, py + 6, 2, 2);

    // Chair (small circle behind desk)
    g.fillStyle(0x333344, 1);
    g.fillCircle(px, py + 22, 5);
    g.fillStyle(0x444455, 1);
    g.fillCircle(px, py + 22, 3);
  }

  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
    }
  }
}
