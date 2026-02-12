import Phaser from 'phaser';
import type { Task } from '../../../../shared/types';

const TILE = 32;

interface TaskCard {
  task: Task;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  dot?: Phaser.GameObjects.Graphics;
}

// Same palette as OfficeScene for agent colors
const PALETTE = [0x3b82f6, 0xa855f7, 0x22c55e, 0xf59e0b, 0xef4444, 0x06b6d4, 0xec4899, 0x84cc16];
const teamColorMap = new Map<string, number>();
let colorIndex = 0;

function getAgentColor(agentId: string): number {
  if (!teamColorMap.has(agentId)) {
    teamColorMap.set(agentId, PALETTE[colorIndex % PALETTE.length]);
    colorIndex++;
  }
  return teamColorMap.get(agentId)!;
}

export class TaskBoard {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private tasks: Map<string, TaskCard> = new Map();
  private boardX: number;
  private boardY: number;
  private cardWidth = 90;
  private cardHeight = 32;
  private columnWidth = 100;
  private columnGap = 10;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.boardX = x;
    this.boardY = y;
    this.container = scene.add.container(x, y);
    this.container.setDepth(5);

    this.drawBoard();
  }

  private drawBoard() {
    const g = this.scene.add.graphics();

    // Cork board background
    const boardWidth = this.columnWidth * 3 + this.columnGap * 2 + 20;
    const boardHeight = 280;

    g.fillStyle(0xc19a6b, 1); // Cork color
    g.fillRect(-boardWidth / 2, 0, boardWidth, boardHeight);

    // Cork texture (small dots)
    g.fillStyle(0xa68a5c, 0.3);
    for (let i = 0; i < 80; i++) {
      const dx = Math.random() * boardWidth - boardWidth / 2;
      const dy = Math.random() * boardHeight;
      g.fillCircle(dx, dy, 1);
    }

    // Wood frame
    g.lineStyle(8, 0x5c4033, 1);
    g.strokeRect(-boardWidth / 2, 0, boardWidth, boardHeight);

    this.container.add(g);

    // Column headers
    const columns = [
      { title: 'TO DO', x: -this.columnWidth - this.columnGap / 2 },
      { title: 'IN PROGRESS', x: 0 },
      { title: 'DONE', x: this.columnWidth + this.columnGap / 2 }
    ];

    columns.forEach(col => {
      const header = this.scene.add.text(col.x, 10, col.title, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#2a2a2a',
        fontStyle: 'bold'
      });
      header.setOrigin(0.5, 0);
      this.container.add(header);

      // Pin/tack at top of each column
      const pin = this.scene.add.graphics();
      pin.fillStyle(0xcc3333, 1);
      pin.fillCircle(col.x, 5, 3);
      pin.fillStyle(0x888888, 1);
      pin.fillCircle(col.x, 5, 1);
      this.container.add(pin);
    });
  }

  private getColumnX(status: Task['status']): number {
    switch (status) {
      case 'pending': return -this.columnWidth - this.columnGap / 2;
      case 'in_progress': return 0;
      case 'completed': return this.columnWidth + this.columnGap / 2;
    }
  }

  private getNextY(status: Task['status']): number {
    const cardsInColumn = Array.from(this.tasks.values())
      .filter(card => card.task.status === status);
    return 30 + cardsInColumn.length * (this.cardHeight + 8);
  }

  addTask(task: Task) {
    if (this.tasks.has(task.id)) {
      this.updateTask(task);
      return;
    }

    const x = this.getColumnX(task.status);
    const y = this.getNextY(task.status);

    const cardContainer = this.scene.add.container(x, y);
    cardContainer.setDepth(6);

    // Sticky note background
    const bg = this.scene.add.graphics();
    const colors = {
      pending: 0xfff59d,     // Yellow
      in_progress: 0xb3e5fc, // Light blue
      completed: 0xc8e6c9    // Light green
    };
    bg.fillStyle(colors[task.status], 1);
    bg.fillRect(-this.cardWidth / 2, 0, this.cardWidth, this.cardHeight);

    // Shadow
    bg.fillStyle(0x000000, 0.1);
    bg.fillRect(-this.cardWidth / 2 + 2, this.cardHeight, this.cardWidth, 2);

    // Border
    bg.lineStyle(1, 0x888888, 0.3);
    bg.strokeRect(-this.cardWidth / 2, 0, this.cardWidth, this.cardHeight);

    cardContainer.add(bg);

    // Task text
    const text = this.scene.add.text(0, this.cardHeight / 2, task.description, {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#2a2a2a',
      wordWrap: { width: this.cardWidth - 12 },
      align: 'center'
    });
    text.setOrigin(0.5, 0.5);
    cardContainer.add(text);

    // Agent dot for in-progress tasks
    let dot: Phaser.GameObjects.Graphics | undefined;
    if (task.status === 'in_progress') {
      dot = this.scene.add.graphics();
      const color = getAgentColor(task.assignedTo);
      dot.fillStyle(color, 1);
      dot.fillCircle(this.cardWidth / 2 - 6, 6, 4);
      dot.lineStyle(1, 0xffffff, 1);
      dot.strokeCircle(this.cardWidth / 2 - 6, 6, 4);
      cardContainer.add(dot);
    }

    // Interactive
    const hitArea = new Phaser.Geom.Rectangle(-this.cardWidth / 2, 0, this.cardWidth, this.cardHeight);
    cardContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    cardContainer.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(colors[task.status], 1);
      bg.fillRect(-this.cardWidth / 2, 0, this.cardWidth, this.cardHeight);
      bg.lineStyle(2, 0x444444, 0.8);
      bg.strokeRect(-this.cardWidth / 2, 0, this.cardWidth, this.cardHeight);
      this.scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });

    cardContainer.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(colors[task.status], 1);
      bg.fillRect(-this.cardWidth / 2, 0, this.cardWidth, this.cardHeight);
      bg.fillStyle(0x000000, 0.1);
      bg.fillRect(-this.cardWidth / 2 + 2, this.cardHeight, this.cardWidth, 2);
      bg.lineStyle(1, 0x888888, 0.3);
      bg.strokeRect(-this.cardWidth / 2, 0, this.cardWidth, this.cardHeight);
      this.scene.tweens.add({
        targets: cardContainer,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });

    cardContainer.on('pointerdown', () => {
      this.showTaskDetails(task);
    });

    this.container.add(cardContainer);

    this.tasks.set(task.id, {
      task,
      container: cardContainer,
      bg,
      text,
      dot
    });
  }

  updateTask(updatedTask: Task) {
    const card = this.tasks.get(updatedTask.id);
    if (!card) {
      this.addTask(updatedTask);
      return;
    }

    const oldStatus = card.task.status;
    const newStatus = updatedTask.status;

    // Update the card's task data
    card.task = updatedTask;

    if (oldStatus !== newStatus) {
      // Animate completion
      if (newStatus === 'completed') {
        this.animateCompletion(card);
      }

      // Move to new column
      const newX = this.getColumnX(newStatus);
      const newY = this.getNextY(newStatus);

      this.scene.tweens.add({
        targets: card.container,
        x: newX,
        y: newY,
        duration: 400,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          // Update background color
          const colors = {
            pending: 0xfff59d,
            in_progress: 0xb3e5fc,
            completed: 0xc8e6c9
          };
          card.bg.clear();
          card.bg.fillStyle(colors[newStatus], 1);
          card.bg.fillRect(-this.cardWidth / 2, 0, this.cardWidth, this.cardHeight);
          card.bg.fillStyle(0x000000, 0.1);
          card.bg.fillRect(-this.cardWidth / 2 + 2, this.cardHeight, this.cardWidth, 2);
          card.bg.lineStyle(1, 0x888888, 0.3);
          card.bg.strokeRect(-this.cardWidth / 2, 0, this.cardWidth, this.cardHeight);

          // Update agent dot
          if (card.dot) {
            card.dot.destroy();
            card.dot = undefined;
          }
          if (newStatus === 'in_progress') {
            const dot = this.scene.add.graphics();
            const color = getAgentColor(updatedTask.assignedTo);
            dot.fillStyle(color, 1);
            dot.fillCircle(this.cardWidth / 2 - 6, 6, 4);
            dot.lineStyle(1, 0xffffff, 1);
            dot.strokeCircle(this.cardWidth / 2 - 6, 6, 4);
            card.container.add(dot);
            card.dot = dot;
          }
        }
      });
    }

    // Update text
    card.text.setText(updatedTask.description);
  }

  private animateCompletion(card: TaskCard) {
    // Checkmark animation
    const checkmark = this.scene.add.text(
      card.container.x,
      card.container.y + this.cardHeight / 2,
      '✓',
      {
        fontSize: '24px',
        color: '#22c55e',
        fontStyle: 'bold'
      }
    );
    checkmark.setOrigin(0.5, 0.5);
    checkmark.setAlpha(0);
    checkmark.setScale(0);
    this.container.add(checkmark);

    this.scene.tweens.add({
      targets: checkmark,
      alpha: 1,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: checkmark,
          alpha: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 300,
          delay: 400,
          ease: 'Quad.easeIn',
          onComplete: () => checkmark.destroy()
        });
      }
    });

    // Flash effect
    this.scene.tweens.add({
      targets: card.container,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 2
    });
  }

  private showTaskDetails(task: Task) {
    // Create a tooltip/popup
    const popup = this.scene.add.container(this.boardX, this.boardY - 60);
    popup.setDepth(200);

    const popupWidth = 160;
    const popupHeight = 60;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2a2a3a, 0.95);
    bg.fillRoundedRect(-popupWidth / 2, 0, popupWidth, popupHeight, 4);
    bg.lineStyle(2, 0x444466, 1);
    bg.strokeRoundedRect(-popupWidth / 2, 0, popupWidth, popupHeight, 4);
    popup.add(bg);

    const titleText = this.scene.add.text(0, 8, task.description, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: popupWidth - 16 },
      align: 'center'
    });
    titleText.setOrigin(0.5, 0);
    popup.add(titleText);

    const statusText = this.scene.add.text(0, 30, `Status: ${task.status.replace('_', ' ').toUpperCase()}`, {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      align: 'center'
    });
    statusText.setOrigin(0.5, 0);
    popup.add(statusText);

    const assignedText = this.scene.add.text(0, 42, `Assigned: ${task.assignedTo}`, {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      align: 'center'
    });
    assignedText.setOrigin(0.5, 0);
    popup.add(assignedText);

    // Close after delay or on click
    this.scene.time.delayedCall(3000, () => {
      popup.destroy();
    });

    this.scene.input.once('pointerdown', () => {
      popup.destroy();
    });
  }

  clear() {
    this.tasks.forEach(card => card.container.destroy());
    this.tasks.clear();
  }
}
