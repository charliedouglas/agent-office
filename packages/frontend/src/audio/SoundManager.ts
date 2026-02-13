/**
 * SoundManager - Synthesizes retro 8-bit style sounds using Web Audio API
 * All sounds are procedurally generated with oscillators - no audio files needed
 */
export class SoundManager {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private enabled: boolean = true;
  private volume: number = 0.3; // Start at 30% to be subtle
  private ambientOscillator: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Play a keyboard clacking sound (short click with slight pitch variation)
   * Enhanced with more realistic pitch randomization
   */
  playTypingSound() {
    if (!this.enabled) return;

    const now = this.audioContext.currentTime;

    // Create a short noise burst for the mechanical click
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Square wave for that retro 8-bit keyboard feel
    osc.type = 'square';
    // Enhanced random pitch variation for more realistic typing (700-1300 Hz)
    // Each keystroke has a unique character
    const basePitch = 900 + (Math.random() - 0.5) * 600;
    osc.frequency.value = basePitch;

    // Slightly randomize volume too (0.03-0.06)
    const volume = 0.03 + Math.random() * 0.03;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Play a soft footstep sound (low thump)
   */
  playFootstep() {
    if (!this.enabled) return;

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Low frequency for footsteps
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Play a notification chime (pleasant ascending notes)
   * Used for general notifications
   */
  playNotificationChime() {
    if (!this.enabled) return;

    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25]; // C5, E5 - pleasant interval

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'triangle'; // Softer than square
      osc.frequency.value = freq;

      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  /**
   * Play a pleasant chime when a new agent joins the office
   * Warm, welcoming three-note ascending melody
   */
  playAgentJoinedChime() {
    if (!this.enabled) return;

    const now = this.audioContext.currentTime;
    // D5, F#5, A5 - D major triad, warm and welcoming
    const notes = [587.33, 739.99, 880.00];

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine'; // Pure sine wave for warmth
      osc.frequency.value = freq;

      const startTime = now + i * 0.12; // Slightly slower for elegance
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  /**
   * Play a subtle conflict warning sound
   * Two quick descending tones to indicate something needs attention
   */
  playConflictWarning() {
    if (!this.enabled) return;

    const now = this.audioContext.currentTime;
    // G4 to D4 - descending perfect fifth, creates subtle tension
    const notes = [392.00, 293.66];

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'triangle'; // Slightly sharper for attention
      osc.frequency.value = freq;

      const startTime = now + i * 0.08; // Quick succession
      gain.gain.setValueAtTime(0.09, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  /**
   * Play a soft task complete sound
   * Gentle ascending three-note melody that feels satisfying but not intrusive
   */
  playTaskCompleteChime() {
    if (!this.enabled) return;

    const now = this.audioContext.currentTime;
    // E5, G5, B5 - E minor pentatonic, soft and pleasant
    const notes = [659.25, 783.99, 987.77];

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine'; // Pure sine for softness
      osc.frequency.value = freq;

      const startTime = now + i * 0.09; // Gentle pacing
      gain.gain.setValueAtTime(0.07, startTime); // Quieter than before
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  /**
   * Start a very subtle ambient background hum
   * Lowered volume to be less intrusive
   */
  startAmbientHum() {
    if (!this.enabled || this.ambientOscillator) return;

    const now = this.audioContext.currentTime;

    // Create a very low, quiet hum
    this.ambientOscillator = this.audioContext.createOscillator();
    this.ambientGain = this.audioContext.createGain();

    this.ambientOscillator.type = 'sine';
    this.ambientOscillator.frequency.value = 60; // Very low hum (60 Hz)

    // Even quieter than before - should be almost subliminal
    this.ambientGain.gain.setValueAtTime(0, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.008, now + 2); // Reduced from 0.015 to 0.008

    this.ambientOscillator.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    this.ambientOscillator.start(now);
  }

  /**
   * Stop the ambient background hum
   */
  stopAmbientHum() {
    if (!this.ambientOscillator || !this.ambientGain) return;

    const now = this.audioContext.currentTime;

    // Fade out over 1 second
    this.ambientGain.gain.linearRampToValueAtTime(0, now + 1);

    this.ambientOscillator.stop(now + 1);
    this.ambientOscillator = null;
    this.ambientGain = null;
  }

  /**
   * Toggle sound on/off
   */
  toggleMute() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopAmbientHum();
    }
    return this.enabled;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.value = this.volume;
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Check if sound is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Resume audio context (needed for browsers that suspend on page load)
   */
  async resume() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}
