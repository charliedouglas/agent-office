import Phaser from 'phaser';
import { OfficeScene } from './scenes/OfficeScene';
import { UIScene } from './scenes/UIScene';

function startGame() {
  const container = document.getElementById('game-container');
  console.log('Container element:', container);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: container || 'game-container',
    backgroundColor: '#1a1a1a',
    pixelArt: true,
    scene: [OfficeScene, UIScene],
    dom: {
      createContainer: true
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };

  try {
    const game = new Phaser.Game(config);
    console.log('Agent Office started successfully');
  } catch (e) {
    console.error('Failed to start Phaser:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  startGame();
}
