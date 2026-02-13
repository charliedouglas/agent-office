import Phaser from 'phaser';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  container: Phaser.GameObjects.Container;
  createdAt: number;
  dismissTimer?: Phaser.Time.TimerEvent;
}

const TOAST_CONFIG = {
  width: 280,
  height: 60,
  padding: 12,
  spacing: 8,
  maxVisible: 5,
  duration: 5000,
  animDuration: 300,
  startX: 0, // Will be set based on camera width
  startY: 20,
};

const TOAST_COLORS = {
  success: { border: 0x22c55e, icon: '✅' },
  info: { border: 0x3b82f6, icon: 'ℹ️' },
  warning: { border: 0xf59e0b, icon: '⚠️' },
  error: { border: 0xef4444, icon: '❌' },
};

export class ToastManager {
  private scene: Phaser.Scene;
  private toasts: Toast[] = [];
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create main container for all toasts
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10000);
    this.container.setScrollFactor(0); // Fixed to camera
  }

  /**
   * Show a toast notification
   * @param agentName Name of the agent (shown in bold)
   * @param message Toast message text
   * @param type Toast type (affects border color and icon)
   * @param teamColor Optional team color for border (overrides type color)
   */
  show(agentName: string, message: string, type: ToastType = 'info', teamColor?: number) {
    // Remove oldest toast if at max capacity
    if (this.toasts.length >= TOAST_CONFIG.maxVisible) {
      this.dismissToast(this.toasts[0]);
    }

    const toast = this.createToast(agentName, message, type, teamColor);
    this.toasts.push(toast);

    // Reposition all toasts
    this.repositionToasts();

    // Auto-dismiss after duration
    toast.dismissTimer = this.scene.time.delayedCall(TOAST_CONFIG.duration, () => {
      this.dismissToast(toast);
    });
  }

  /**
   * Show a conflict warning toast
   * @param file The file in conflict
   * @param agentNames Names of agents in conflict
   */
  showConflictWarning(file: string, agentNames: string[]) {
    // Remove oldest toast if at max capacity
    if (this.toasts.length >= TOAST_CONFIG.maxVisible) {
      this.dismissToast(this.toasts[0]);
    }

    const shortFile = file.length > 25 ? '...' + file.substring(file.length - 25) : file;
    const toast = this.createToast(
      'FILE CONFLICT',
      `${agentNames.join(', ')} on ${shortFile}`,
      'warning'
    );
    this.toasts.push(toast);

    // Reposition all toasts
    this.repositionToasts();

    // Auto-dismiss after longer duration for warnings
    toast.dismissTimer = this.scene.time.delayedCall(TOAST_CONFIG.duration * 1.5, () => {
      this.dismissToast(toast);
    });
  }

  /**
   * Show a conflict resolved toast
   * @param file The file that was in conflict
   */
  showConflictResolved(file: string) {
    // Remove oldest toast if at max capacity
    if (this.toasts.length >= TOAST_CONFIG.maxVisible) {
      this.dismissToast(this.toasts[0]);
    }

    const shortFile = file.length > 25 ? '...' + file.substring(file.length - 25) : file;
    const toast = this.createToast(
      'CONFLICT RESOLVED',
      shortFile,
      'success'
    );
    this.toasts.push(toast);

    // Reposition all toasts
    this.repositionToasts();

    // Auto-dismiss after duration
    toast.dismissTimer = this.scene.time.delayedCall(TOAST_CONFIG.duration, () => {
      this.dismissToast(toast);
    });
  }

  private createToast(
    agentName: string,
    message: string,
    type: ToastType,
    teamColor?: number
  ): Toast {
    const config = TOAST_COLORS[type];
    const borderColor = teamColor ?? config.border;

    // Get camera dimensions for positioning
    const cam = this.scene.cameras.main;
    const startX = cam.width - TOAST_CONFIG.width - 20;

    // Create container for this toast
    const toastContainer = this.scene.add.container(startX + TOAST_CONFIG.width, TOAST_CONFIG.startY);
    toastContainer.setAlpha(0);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(0, 0, TOAST_CONFIG.width, TOAST_CONFIG.height, 6);

    // Colored left border
    bg.fillStyle(borderColor, 1);
    bg.fillRoundedRect(0, 0, 4, TOAST_CONFIG.height, 6);

    // Border
    bg.lineStyle(1, borderColor, 0.5);
    bg.strokeRoundedRect(0, 0, TOAST_CONFIG.width, TOAST_CONFIG.height, 6);

    toastContainer.add(bg);

    // Icon
    const icon = this.scene.add.text(
      TOAST_CONFIG.padding + 8,
      TOAST_CONFIG.height / 2,
      config.icon,
      {
        fontSize: '16px',
      }
    );
    icon.setOrigin(0, 0.5);
    toastContainer.add(icon);

    // Agent name (bold)
    const nameText = this.scene.add.text(
      TOAST_CONFIG.padding + 30,
      TOAST_CONFIG.padding + 6,
      agentName,
      {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      }
    );
    toastContainer.add(nameText);

    // Message text
    const messageText = this.scene.add.text(
      TOAST_CONFIG.padding + 30,
      TOAST_CONFIG.padding + 20,
      message,
      {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#cccccc',
        wordWrap: { width: TOAST_CONFIG.width - TOAST_CONFIG.padding * 2 - 30 },
      }
    );
    toastContainer.add(messageText);

    // Add to main container
    this.container.add(toastContainer);

    // Slide in from right
    this.scene.tweens.add({
      targets: toastContainer,
      x: startX,
      alpha: 1,
      duration: TOAST_CONFIG.animDuration,
      ease: 'Quad.easeOut',
    });

    // Make interactive for manual dismissal
    const hitArea = new Phaser.Geom.Rectangle(0, 0, TOAST_CONFIG.width, TOAST_CONFIG.height);
    toastContainer.setSize(TOAST_CONFIG.width, TOAST_CONFIG.height);
    toastContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    (toastContainer.input as any).cursor = 'pointer';

    toastContainer.on('pointerdown', () => {
      this.dismissToast({ container: toastContainer, createdAt: Date.now() });
    });

    // Hover effect
    toastContainer.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x252540, 0.98);
      bg.fillRoundedRect(0, 0, TOAST_CONFIG.width, TOAST_CONFIG.height, 6);
      bg.fillStyle(borderColor, 1);
      bg.fillRoundedRect(0, 0, 4, TOAST_CONFIG.height, 6);
      bg.lineStyle(1, borderColor, 0.8);
      bg.strokeRoundedRect(0, 0, TOAST_CONFIG.width, TOAST_CONFIG.height, 6);
    });

    toastContainer.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a1a2e, 0.95);
      bg.fillRoundedRect(0, 0, TOAST_CONFIG.width, TOAST_CONFIG.height, 6);
      bg.fillStyle(borderColor, 1);
      bg.fillRoundedRect(0, 0, 4, TOAST_CONFIG.height, 6);
      bg.lineStyle(1, borderColor, 0.5);
      bg.strokeRoundedRect(0, 0, TOAST_CONFIG.width, TOAST_CONFIG.height, 6);
    });

    return {
      container: toastContainer,
      createdAt: Date.now(),
    };
  }

  private dismissToast(toast: Toast) {
    const index = this.toasts.indexOf(toast);
    if (index === -1) return;

    // Remove from list
    this.toasts.splice(index, 1);

    // Cancel dismiss timer if exists
    if (toast.dismissTimer) {
      toast.dismissTimer.remove();
    }

    // Fade out and slide right
    const cam = this.scene.cameras.main;
    const exitX = cam.width;

    this.scene.tweens.add({
      targets: toast.container,
      x: exitX,
      alpha: 0,
      duration: TOAST_CONFIG.animDuration,
      ease: 'Quad.easeIn',
      onComplete: () => {
        toast.container.destroy();
      },
    });

    // Reposition remaining toasts
    this.repositionToasts();
  }

  private repositionToasts() {
    const cam = this.scene.cameras.main;
    const startX = cam.width - TOAST_CONFIG.width - 20;

    this.toasts.forEach((toast, index) => {
      const targetY = TOAST_CONFIG.startY + (index * (TOAST_CONFIG.height + TOAST_CONFIG.spacing));

      this.scene.tweens.add({
        targets: toast.container,
        y: targetY,
        duration: 200,
        ease: 'Quad.easeOut',
      });
    });
  }

  /**
   * Clear all toasts immediately
   */
  clearAll() {
    this.toasts.forEach(toast => {
      if (toast.dismissTimer) {
        toast.dismissTimer.remove();
      }
      toast.container.destroy();
    });
    this.toasts = [];
  }

  /**
   * Destroy the toast manager
   */
  destroy() {
    this.clearAll();
    this.container.destroy();
  }
}
