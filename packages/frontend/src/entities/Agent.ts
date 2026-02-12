import Phaser from 'phaser';
import type { Agent as AgentData, AgentState } from '../../../../shared/types';

const TILE_SIZE = 32;

export class Agent extends Phaser.GameObjects.Container {
  public data: AgentData;
  private sprite: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private stateIndicator: Phaser.GameObjects.Graphics;
  private currentState: AgentState;

  constructor(scene: Phaser.Scene, agentData: AgentData) {
    super(scene, agentData.x * TILE_SIZE, agentData.y * TILE_SIZE);

    this.data = agentData;
    this.currentState = agentData.state;

    // Create programmatic sprite
    this.sprite = this.createAgentSprite(scene);
    this.add(this.sprite);

    // Create name label
    this.nameText = scene.add.text(0, -20, agentData.name, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 }
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.add(this.nameText);

    // State indicator (small icon)
    this.stateIndicator = scene.add.graphics();
    this.add(this.stateIndicator);
    this.updateStateIndicator();

    scene.add.existing(this);
    this.setInteractive(new Phaser.Geom.Rectangle(-16, -16, 32, 32), Phaser.Geom.Rectangle.Contains);
  }

  private createAgentSprite(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
    const graphics = scene.add.graphics();

    // Generate unique color based on agent ID
    const hue = this.hashCode(this.data.id) % 360;
    const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.7, 0.9);
    const hexColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

    // Draw a simple character (32x32 pixel art style)
    // Head
    graphics.fillStyle(hexColor, 1);
    graphics.fillCircle(0, -8, 6);

    // Body
    graphics.fillRect(-4, 0, 8, 12);

    // Arms
    graphics.fillRect(-8, 2, 4, 8);
    graphics.fillRect(4, 2, 4, 8);

    // Legs
    graphics.fillRect(-4, 12, 3, 8);
    graphics.fillRect(1, 12, 3, 8);

    // Eyes
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(-2, -8, 1);
    graphics.fillCircle(2, -8, 1);

    return graphics;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  updateState(newState: AgentState) {
    this.currentState = newState;
    this.updateStateIndicator();
  }

  private updateStateIndicator() {
    this.stateIndicator.clear();

    let color: number;
    let symbol: string;

    switch (this.currentState) {
      case 'idle':
        color = 0x888888;
        symbol = 'Ë';
        break;
      case 'typing':
        color = 0x00ff00;
        symbol = '(';
        break;
      case 'walking':
        color = 0xffaa00;
        symbol = '’';
        break;
      case 'talking':
        color = 0x00aaff;
        symbol = '=¬';
        break;
    }

    // Draw a small colored circle
    this.stateIndicator.fillStyle(color, 1);
    this.stateIndicator.fillCircle(12, -12, 4);
  }

  moveTo(x: number, y: number, onComplete?: () => void) {
    this.updateState('walking');

    this.scene.tweens.add({
      targets: this,
      x: x * TILE_SIZE,
      y: y * TILE_SIZE,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        this.updateState('idle');
        onComplete?.();
      }
    });
  }

  showMessage(text: string) {
    // Create a speech bubble
    const bubble = this.scene.add.container(this.x, this.y - 40);

    const bubbleText = this.scene.add.text(0, 0, text, {
      fontSize: '12px',
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: { x: 8, y: 4 },
      wordWrap: { width: 150 }
    });
    bubbleText.setOrigin(0.5, 0.5);

    bubble.add(bubbleText);
    this.scene.add.existing(bubble);

    // Fade out after 3 seconds
    this.scene.tweens.add({
      targets: bubble,
      alpha: 0,
      duration: 500,
      delay: 2500,
      onComplete: () => {
        bubble.destroy();
      }
    });
  }
}
