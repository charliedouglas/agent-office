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
   */
  playTypingSound() {
    if (!this.enabled) return;

    const now = this.audioContext.currentTime;

    // Create a short noise burst for the mechanical click
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Square wave for that retro 8-bit keyboard feel
    osc.type = 'square';
    // Random pitch variation for each keystroke (800-1200 Hz)
    osc.frequency.value = 800 + Math.random() * 400;

    gain.gain.setValueAtTime(0.05, now);
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
   * Play a task complete chime (short ascending arpeggio)
   */
  playTaskCompleteChime() {
    if (!this.enabled) return;

    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 - major triad

    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  /**
   * Start a very subtle ambient background hum
   */
  startAmbientHum() {
    if (!this.enabled || this.ambientOscillator) return;

    const now = this.audioContext.currentTime;

    // Create a very low, quiet hum
    this.ambientOscillator = this.audioContext.createOscillator();
    this.ambientGain = this.audioContext.createGain();

    this.ambientOscillator.type = 'sine';
    this.ambientOscillator.frequency.value = 60; // Very low hum (60 Hz)

    // Extremely quiet - barely noticeable
    this.ambientGain.gain.setValueAtTime(0, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.015, now + 2); // Fade in over 2 seconds

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
