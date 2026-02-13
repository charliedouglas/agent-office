import Phaser from 'phaser';
import type { Agent as AgentData, AgentState } from '../../../../shared/types';
import type { SoundManager } from '../audio/SoundManager';

const TILE = 32;

// Dynamic team colour assignment (same palette as OfficeScene)
const PALETTE = [0x3b82f6, 0xa855f7, 0x22c55e, 0xf59e0b, 0xef4444, 0x06b6d4, 0xec4899, 0x84cc16];
const teamColorMap = new Map<string, number>();
let colorIdx = 0;
function getTeamColor(team: string): number {
  if (!teamColorMap.has(team)) {
    teamColorMap.set(team, PALETTE[colorIdx % PALETTE.length]);
    colorIdx++;
  }
  return teamColorMap.get(team)!;
}

// Unique skin/hair tones per agent index
const SKIN_TONES = [0xf5d0a9, 0xd4a574, 0x8d5524, 0xffdbac, 0xc68642, 0xf1c27d, 0xe0ac69, 0xa0522d, 0xffd5b4];
const HAIR_COLORS = [0x2c1b0e, 0x4a3728, 0xb5651d, 0xd4a017, 0x8b0000, 0x1a1a2e, 0x654321, 0xc0c0c0, 0xff6347];

export class Agent extends Phaser.GameObjects.Container {
  private agentData: AgentData;
  private agentBody!: Phaser.GameObjects.Graphics;
  private nameLabel!: Phaser.GameObjects.Text;
  private nameLabelBg!: Phaser.GameObjects.Graphics;
  private roleLabel!: Phaser.GameObjects.Text;
  private stateIcon!: Phaser.GameObjects.Text;
  private currentState: AgentState;
  private typingTween: Phaser.Tweens.Tween | null = null;
  private speechBubble: Phaser.GameObjects.Container | null = null;
  private agentIndex: number;
  private clickCallback?: (agent: Agent) => void;
  private soundManager: SoundManager | null = null;
  private typingSoundTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, data: AgentData, soundManager?: SoundManager) {
    super(scene, data.x * TILE, data.y * TILE);
    this.agentData = data;
    this.currentState = data.state;
    this.soundManager = soundManager || null;

    // Derive a stable index from agent id for colour variation
    this.agentIndex = Math.abs(this.hashCode(data.id)) % SKIN_TONES.length;

    this.drawAgent(scene);
    this.drawLabels(scene);
    this.drawStateIcon(scene);

    scene.add.existing(this);
    this.setDepth(10);

    // Enable click interaction
    this.setSize(32, 32);
    this.setInteractive({ useHandCursor: true });

    // Show role on hover
    this.on('pointerover', () => {
      this.roleLabel.setVisible(true);
    });

    this.on('pointerout', () => {
      this.roleLabel.setVisible(false);
    });

    this.on('pointerdown', () => {
      if (this.clickCallback) {
        this.clickCallback(this);
      }
    });

    // Start idle animation
    this.updateState(data.state);
  }

  private drawAgent(scene: Phaser.Scene) {
    const g = scene.add.graphics();
    const skin = SKIN_TONES[this.agentIndex];
    const hair = HAIR_COLORS[this.agentIndex];
    const shirt = getTeamColor(this.agentData.team);

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(0, 16, 14, 4);

    // Legs
    g.fillStyle(0x2a2a3a, 1);
    g.fillRect(-3, 10, 3, 7);
    g.fillRect(1, 10, 3, 7);

    // Body / shirt
    g.fillStyle(shirt, 1);
    g.fillRoundedRect(-6, 0, 12, 12, 2);

    // Arms
    g.fillRect(-8, 2, 3, 8);
    g.fillRect(5, 2, 3, 8);

    // Hands (skin)
    g.fillStyle(skin, 1);
    g.fillCircle(-7, 10, 2);
    g.fillCircle(6, 10, 2);

    // Head (skin)
    g.fillStyle(skin, 1);
    g.fillCircle(0, -5, 6);

    // Hair
    g.fillStyle(hair, 1);
    g.fillRect(-6, -11, 12, 5);
    g.fillRect(-6, -9, 2, 3); // sideburn left
    g.fillRect(4, -9, 2, 3);  // sideburn right

    // Eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-2, -5, 2);
    g.fillCircle(2, -5, 2);
    g.fillStyle(0x222222, 1);
    g.fillCircle(-2, -5, 1);
    g.fillCircle(2, -5, 1);

    // Managers/leads get a tie
    if (/manager|lead|director|head|chief|vp|cto|ceo/i.test(this.agentData.role)) {
      g.fillStyle(0xcc3333, 1);
      g.fillRect(-1, 2, 2, 8);
      g.fillStyle(0xaa2222, 1);
      g.fillRect(-2, 2, 4, 2);
    }

    this.agentBody = g;
    this.add(g);
  }

  private drawLabels(scene: Phaser.Scene) {
    // Name label - bigger and bolder
    this.nameLabel = scene.add.text(0, -18, this.agentData.name, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.nameLabel.setOrigin(0.5, 1);

    // Background for name label - dark semi-transparent
    this.nameLabelBg = scene.add.graphics();
    const padding = 2;
    const bgWidth = this.nameLabel.width + padding * 2;
    const bgHeight = this.nameLabel.height + padding;
    this.nameLabelBg.fillStyle(0x000000, 0.6);
    this.nameLabelBg.fillRoundedRect(
      -bgWidth / 2,
      -18 - bgHeight + padding,
      bgWidth,
      bgHeight,
      2
    );

    this.add(this.nameLabelBg);
    this.add(this.nameLabel);

    // Role label - hidden by default, smaller
    this.roleLabel = scene.add.text(0, 20, this.agentData.role, {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 },
    });
    this.roleLabel.setOrigin(0.5, 0);
    this.roleLabel.setVisible(false); // Hidden by default
    this.add(this.roleLabel);
  }

  private drawStateIcon(scene: Phaser.Scene) {
    this.stateIcon = scene.add.text(10, -14, '', {
      fontSize: '10px',
    });
    this.add(this.stateIcon);
  }

  updateState(newState: AgentState) {
    this.currentState = newState;

    // Clean up old typing animation
    if (this.typingTween) {
      this.typingTween.stop();
      this.typingTween = null;
      this.agentBody.setY(0);
    }

    // Clean up old typing sound timer
    if (this.typingSoundTimer) {
      this.typingSoundTimer.remove();
      this.typingSoundTimer = null;
    }

    switch (newState) {
      case 'idle':
        this.stateIcon.setText('');
        break;
      case 'typing':
        this.stateIcon.setText('⌨️');
        // Subtle bobbing animation
        this.typingTween = this.scene.tweens.add({
          targets: this.agentBody,
          y: -1,
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        // Keyboard clacking sounds at irregular intervals (typing rhythm)
        if (this.soundManager) {
          this.typingSoundTimer = this.scene.time.addEvent({
            delay: 120 + Math.random() * 80, // 120-200ms between keystrokes
            callback: () => {
              this.soundManager?.playTypingSound();
            },
            loop: true,
          });
        }
        break;
      case 'walking':
        this.stateIcon.setText('🚶');
        break;
      case 'talking':
        this.stateIcon.setText('💬');
        break;
    }
  }

  moveToTile(tileX: number, tileY: number, onComplete?: () => void) {
    this.updateState('walking');

    // Play footsteps at regular intervals during walking
    let footstepTimer: Phaser.Time.TimerEvent | null = null;
    if (this.soundManager) {
      footstepTimer = this.scene.time.addEvent({
        delay: 300, // Footstep every 300ms
        callback: () => {
          this.soundManager?.playFootstep();
        },
        loop: true,
      });
    }

    this.scene.tweens.add({
      targets: this,
      x: tileX * TILE,
      y: tileY * TILE,
      duration: 1200,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        if (footstepTimer) {
          footstepTimer.remove();
        }
        this.updateState('idle');
        onComplete?.();
      },
    });
  }

  showMessage(text: string) {
    // Remove existing bubble
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }

    // Play notification chime when message appears
    this.soundManager?.playNotificationChime();

    const bubble = this.scene.add.container(this.x, this.y - 30);
    bubble.setDepth(100);

    // Background
    const maxWidth = 120;
    const padding = 6;
    const bubbleText = this.scene.add.text(0, 0, text, {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#000000',
      wordWrap: { width: maxWidth - padding * 2 },
    });
    bubbleText.setOrigin(0.5, 0.5);

    const bgWidth = Math.min(bubbleText.width + padding * 2, maxWidth);
    const bgHeight = bubbleText.height + padding * 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 4);

    // Little triangle pointer
    bg.fillStyle(0xffffff, 0.95);
    bg.fillTriangle(-3, bgHeight / 2, 3, bgHeight / 2, 0, bgHeight / 2 + 5);

    // Border
    bg.lineStyle(1, 0x888888, 0.5);
    bg.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 4);

    bubble.add(bg);
    bubble.add(bubbleText);

    this.speechBubble = bubble;

    // Float up and fade
    this.scene.tweens.add({
      targets: bubble,
      y: bubble.y - 15,
      alpha: 0,
      duration: 600,
      delay: 2500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        bubble.destroy();
        if (this.speechBubble === bubble) this.speechBubble = null;
      },
    });
  }

  getDeskX(): number { return this.agentData.deskPosition.x; }
  getDeskY(): number { return this.agentData.deskPosition.y; }
  getId(): string { return this.agentData.id; }
  getName(): string { return this.agentData.name; }
  getData(): AgentData { return this.agentData; }

  updateData(newData: Partial<AgentData>) {
    this.agentData = { ...this.agentData, ...newData };
  }

  setClickCallback(callback: (agent: Agent) => void) {
    this.clickCallback = callback;
  }

  leave(onComplete?: () => void) {
    // Clean up typing animation and sounds
    if (this.typingTween) {
      this.typingTween.stop();
      this.typingTween = null;
    }
    if (this.typingSoundTimer) {
      this.typingSoundTimer.remove();
      this.typingSoundTimer = null;
    }

    // Walk towards bottom of screen first
    const exitY = 14; // Near bottom wall
    const walkDuration = 800;

    this.updateState('walking');

    this.scene.tweens.add({
      targets: this,
      y: exitY * TILE,
      duration: walkDuration,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        // Then fade out
        this.scene.tweens.add({
          targets: this,
          alpha: 0,
          duration: 500,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.destroy();
            onComplete?.();
          }
        });
      }
    });
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }
}
