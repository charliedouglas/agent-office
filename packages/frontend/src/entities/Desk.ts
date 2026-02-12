import Phaser from 'phaser';

const TILE_SIZE = 32;

export class Desk extends Phaser.GameObjects.Graphics {
  public gridX: number;
  public gridY: number;

  constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
    super(scene);

    this.gridX = gridX;
    this.gridY = gridY;

    this.drawDesk();
    this.setPosition(gridX * TILE_SIZE, gridY * TILE_SIZE);

    scene.add.existing(this);
  }

  private drawDesk() {
    // Desk surface (brown)
    this.fillStyle(0x8B4513, 1);
    this.fillRect(-12, -8, 24, 16);

    // Desk legs
    this.fillStyle(0x654321, 1);
    this.fillRect(-10, 6, 3, 6);
    this.fillRect(7, 6, 3, 6);

    // Computer monitor (simple rectangle)
    this.fillStyle(0x333333, 1);
    this.fillRect(-6, -6, 12, 10);

    // Screen
    this.fillStyle(0x1a4d6d, 1);
    this.fillRect(-5, -5, 10, 8);
  }
}
