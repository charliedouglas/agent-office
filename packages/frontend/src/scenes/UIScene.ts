import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene', active: true });
  }

  create() {
    // Add title
    const title = this.add.text(10, 10, 'Agent Office', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    // Add status text
    this.statusText = this.add.text(10, 45, 'Connecting to bridge...', {
      fontSize: '14px',
      color: '#aaaaaa'
    });

    // Update status after connection (simulated)
    setTimeout(() => {
      this.statusText.setText('Connected to bridge server');
      this.statusText.setColor('#00ff00');
    }, 2000);
  }
}
