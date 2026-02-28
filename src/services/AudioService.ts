/**
 * AudioService - Procedural sound synthesis via Web Audio API
 *
 * No audio files needed. Every sound is generated from oscillators and
 * noise so the game runs offline and loads instantly.
 *
 * Mobile note: AudioContext must be created (or resumed) inside a user
 * gesture handler. Call AudioService.init() on the "Play" button click.
 */

import { storageService } from './StorageService';

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;

  // ── Boot ──────────────────────────────────────────────────────────────────

  /** Must be called from inside a user-gesture handler (button click/tap). */
  init(): void {
    if (this.ctx) {
      // Already created — just un-suspend if the browser suspended it
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Master volume bus (SFX only — music handled by BackgroundMusicService)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = storageService.isSoundEnabled() ? 1 : 0;
    this.masterGain.connect(this.ctx.destination);

    console.log('[AudioService] Initialized, state:', this.ctx.state);
  }

  setEnabled(on: boolean): void {
    storageService.setSoundEnabled(on);
    if (this.masterGain) this.masterGain.gain.value = on ? 1 : 0;
  }

  isEnabled(): boolean {
    return storageService.isSoundEnabled();
  }

  // ── Internal synth primitives ─────────────────────────────────────────────

  private now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /**
   * Play a simple tone: oscillator → gain envelope → masterGain
   */
  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    peakGain = 0.4,
    attackTime = 0.005,
    delayStart = 0,
  ): void {
    if (!this.ctx) return;
    const t = this.now() + delayStart;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peakGain, t + attackTime);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(env);
    env.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /**
   * Frequency glide: pitch sweeps from freqStart to freqEnd over duration
   */
  private glide(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    peakGain = 0.35,
    delayStart = 0,
  ): void {
    if (!this.ctx) return;
    const t = this.now() + delayStart;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);

    env.gain.setValueAtTime(peakGain, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(env);
    env.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /**
   * White-noise burst (for explosions / impacts)
   */
  private noise(duration: number, peakGain = 0.4, delayStart = 0): void {
    if (!this.ctx) return;
    const t = this.now() + delayStart;

    const bufSize = this.ctx.sampleRate * duration;
    const buffer  = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data    = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    // Low-pass filter to soften the noise
    const filter = this.ctx.createBiquadFilter();
    filter.type            = 'lowpass';
    filter.frequency.value = 600;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(peakGain, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    src.start(t);
    src.stop(t + duration + 0.02);
  }

  // ── Public SFX API ────────────────────────────────────────────────────────

  /**
   * ⭐ Regular star caught.
   * Pitch shifts up slightly with each combo level for musical chaining.
   */
  catchStar(combo = 1): void {
    // Semitone offset per combo level
    const semiOffset = Math.min(combo - 1, 8) * 1.5;
    const freq = midiToHz(76 + semiOffset); // E5 base, rises with combo
    this.tone(freq, 0.12, 'sine', 0.28, 0.004);
    // Harmonic overtone for brightness
    this.tone(freq * 2, 0.08, 'sine', 0.08, 0.004);
  }

  /**
   * 🌟 Golden star caught. Warmer, lower, with a soft reverb shimmer.
   */
  catchGolden(): void {
    this.tone(midiToHz(64), 0.25, 'sine',     0.32, 0.005); // E4
    this.tone(midiToHz(67), 0.20, 'sine',     0.14, 0.005); // G4 harmonic
    this.tone(midiToHz(71), 0.15, 'triangle', 0.06, 0.005); // B4 shimmer
  }

  /**
   * 💣 Bomb explodes / caught.
   */
  bombExplode(): void {
    this.noise(0.18, 0.55);                          // impact noise
    this.glide(180, 60, 0.25, 'sawtooth', 0.30);    // low pitch drop
  }

  /**
   * 💔 One life lost (not from bomb — from missing a star).
   */
  lifeLost(): void {
    this.glide(midiToHz(60), midiToHz(48), 0.3, 'sine', 0.30); // C4 → C3 glide
  }

  /**
   * 💀 All lives gone — game over sting.
   */
  gameOver(): void {
    const notes = [midiToHz(60), midiToHz(57), midiToHz(53)]; // C4 → A3 → F3
    notes.forEach((freq, i) => {
      this.tone(freq, 0.4, 'sine', 0.28, 0.01, i * 0.35);
    });
  }

  /**
   * 🔥 Combo milestone reached (x3, x5, x10…).
   * Ascending arpeggio — more notes and higher pitch at bigger combos.
   */
  comboMilestone(n: number): void {
    const baseNote = 60; // C4
    const noteCount = Math.min(Math.floor(n / 2) + 2, 5);
    const intervals = [0, 4, 7, 12, 16]; // major arpeggio semitone offsets

    for (let i = 0; i < noteCount; i++) {
      this.tone(
        midiToHz(baseNote + intervals[i] + (n > 5 ? 12 : 0)),
        0.18,
        'triangle',
        0.22,
        0.005,
        i * 0.07,
      );
    }
  }

  /**
   * 🏆 New personal best score.
   */
  newBest(): void {
    const notes = [60, 64, 67, 72]; // C4 → E4 → G4 → C5 fanfare
    notes.forEach((note, i) => {
      this.tone(midiToHz(note), 0.3, 'sine',     0.28, 0.01, i * 0.15);
      this.tone(midiToHz(note), 0.3, 'triangle', 0.09, 0.01, i * 0.15);
    });
  }

  /**
   * 🌪️ Difficulty phase changes.
   */
  phaseChange(): void {
    this.noise(0.08, 0.5);                                   // impact crack
    this.glide(120, 200, 0.22, 'sawtooth', 0.35);           // rising low tone
    this.tone(midiToHz(48), 0.4,  'square', 0.12, 0.02);   // bass note
  }

  /**
   * 🛡️ Powerup collected.
   */
  powerupCollect(): void {
    this.glide(midiToHz(60), midiToHz(72), 0.20, 'sine', 0.25); // rising sweep
    this.tone(midiToHz(72), 0.15, 'sine', 0.12, 0.01, 0.18);   // top note accent
  }

  // ── Music (delegated to BackgroundMusicService) ──────────────────────────
  // Background music is now handled by BackgroundMusicService (Tamil ragas).
  // These stubs are kept so any residual call sites don't break.
  setMusicIntensity(_phaseIndex: number): void { /* handled by BackgroundMusicService */ }
}

// Global singleton
export const audioService = new AudioService();
