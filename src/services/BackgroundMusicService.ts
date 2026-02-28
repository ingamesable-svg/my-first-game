/**
 * BackgroundMusicService — Procedural Tamil Carnatic Music Engine  v3
 *
 * Plucked-string synthesis (Karplus-Strong style) — sounds like a real Veena,
 * NOT like electronic beeps. Tanpura drone strikes strings periodically instead
 * of buzzing continuously. 100% copyright-free, zero audio files needed.
 *
 * Five ragas, rotating each session via localStorage.
 */

const SESSION_KEY = 'sc-raga-session';

interface Raga {
  name:        string;
  tamilName:   string;
  description: string;
  notes:       number[];
  tonic:       number;
  beatMs:      number;
}

const RAGAS: Raga[] = [
  {
    name: 'Kalyani', tamilName: 'கல்யாணி',
    description: 'Evening raga — bright and auspicious',
    notes: [0, 2, 4, 6, 7, 9, 11, 12], tonic: 48, beatMs: 1800,
  },
  {
    name: 'Shankarabharanam', tamilName: 'சங்கராபரணம்',
    description: 'Morning raga — majestic and complete',
    notes: [0, 2, 4, 5, 7, 9, 11, 12], tonic: 48, beatMs: 1600,
  },
  {
    name: 'Bhairavi', tamilName: 'பைரவி',
    description: 'Morning raga — devotional and gentle',
    notes: [0, 1, 3, 5, 7, 8, 10, 12], tonic: 48, beatMs: 2000,
  },
  {
    name: 'Kharaharapriya', tamilName: 'கரஹரப்பிரியா',
    description: 'Versatile raga — expressive and rich',
    notes: [0, 2, 3, 5, 7, 9, 10, 12], tonic: 48, beatMs: 1700,
  },
  {
    name: 'Hamsadhwani', tamilName: 'ஹம்ஸத்வனி',
    description: 'Auspicious raga — playful and vibrant',
    notes: [0, 2, 4, 7, 11, 12], tonic: 50, beatMs: 1500,
  },
];

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class BackgroundMusicService {
  private ctx:        AudioContext | null = null;
  private masterGain: GainNode    | null = null;
  private reverbGain: GainNode    | null = null;

  private tanpuraIntervalId: ReturnType<typeof setInterval>  | null = null;
  private phraseTimeoutId:   ReturnType<typeof setTimeout>   | null = null;
  private tanpuraOscNodes:   OscillatorNode[] = [];
  private playing = false;
  private tanpuraBeat = 0;

  private currentRaga!: Raga;

  // ── Boot ──────────────────────────────────────────────────────────────────

  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // Shared reverb using a simple feedback delay
    const delay    = this.ctx.createDelay(0.6);
    const fbGain   = this.ctx.createGain();
    const reverbLP = this.ctx.createBiquadFilter();
    delay.delayTime.value = 0.35;
    fbGain.gain.value     = 0.3;
    reverbLP.type            = 'lowpass';
    reverbLP.frequency.value = 2000;
    delay.connect(fbGain);
    fbGain.connect(reverbLP);
    reverbLP.connect(delay);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0;
    this.reverbGain.connect(delay);
    this.reverbGain.connect(this.ctx.destination); // wet + dry

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(delay); // also send dry signal into reverb
  }

  // ── Session ───────────────────────────────────────────────────────────────

  startSession(): void {
    if (!this.ctx || !this.masterGain) return;

    // CRITICAL on iOS: context may be suspended after scene transition
    if (this.ctx.state === 'suspended') this.ctx.resume();

    if (this.playing) this.stop();

    const stored = parseInt(localStorage.getItem(SESSION_KEY) ?? '0', 10);
    const idx    = stored % RAGAS.length;
    localStorage.setItem(SESSION_KEY, String(idx + 1));

    this.currentRaga = RAGAS[idx];
    this.playing     = true;
    this.tanpuraBeat = 0;

    console.log(`[Music] ♪ Raga ${this.currentRaga.name} — ${this.currentRaga.tamilName}`);

    // Fade in to 0.75 so it's clearly audible
    const t = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(0, t);
    this.masterGain.gain.linearRampToValueAtTime(0.75, t + 3);

    if (this.reverbGain) {
      this.reverbGain.gain.cancelScheduledValues(t);
      this.reverbGain.gain.setValueAtTime(0, t);
      this.reverbGain.gain.linearRampToValueAtTime(0.25, t + 3);
    }

    this.startTanpura();
    this.schedulePhrase(2000); // first melody phrase after 2 s
  }

  stop(): void {
    this.playing = false;

    if (this.tanpuraIntervalId !== null) {
      clearInterval(this.tanpuraIntervalId);
      this.tanpuraIntervalId = null;
    }
    if (this.phraseTimeoutId !== null) {
      clearTimeout(this.phraseTimeoutId);
      this.phraseTimeoutId = null;
    }

    // Stop sustained tanpura oscillators
    for (const osc of this.tanpuraOscNodes) {
      try { osc.stop(); } catch (_) { /* already stopped */ }
    }
    this.tanpuraOscNodes = [];

    if (this.ctx && this.masterGain) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(0, t + 2);
      if (this.reverbGain) {
        this.reverbGain.gain.cancelScheduledValues(t);
        this.reverbGain.gain.setValueAtTime(this.reverbGain.gain.value, t);
        this.reverbGain.gain.linearRampToValueAtTime(0, t + 2);
      }
    }
  }

  getCurrentRagaInfo(): { name: string; tamilName: string; description: string } | null {
    return this.currentRaga ?? null;
  }

  // ── Tanpura — periodic plucked drone ─────────────────────────────────────

  /**
   * A real tanpura player plucks strings in a slow, repeating cycle:
   *   Pa  →  Sa(low)  →  Sa  →  Sa(high)
   * Each pluck rings out naturally. This sounds WAY better than a continuous buzz.
   */
  private startTanpura(): void {
    const { tonic } = this.currentRaga;

    // The four tanpura strings in cycle order
    const stringCycle: Array<[number, number]> = [
      [tonic + 7,  0.18],  // Pa  (fifth)
      [tonic - 12, 0.14],  // Low Sa
      [tonic,      0.20],  // Sa  (tonic) — slightly louder
      [tonic,      0.16],  // Sa  (repeat)
    ];

    // Pluck the first string immediately, then cycle every ~1.8 s
    this.pluckTanpuraString(stringCycle[0][0], stringCycle[0][1]);
    this.tanpuraBeat = 1;

    this.tanpuraIntervalId = setInterval(() => {
      if (!this.playing) return;
      const [midi, gain] = stringCycle[this.tanpuraBeat % stringCycle.length];
      this.pluckTanpuraString(midi, gain);
      this.tanpuraBeat++;
    }, 1800);
  }

  /**
   * Pluck a single tanpura string:
   * White-noise initial transient + sustained sine = plucked string character
   */
  private pluckTanpuraString(midi: number, peakGain: number): void {
    if (!this.ctx || !this.masterGain) return;
    const hz = midiToHz(midi);
    const t  = this.ctx.currentTime;

    // ── Transient click (noise, 8 ms) — gives the "pluck" character
    const noiseLen = Math.round(this.ctx.sampleRate * 0.008);
    const noiseBuf = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) noiseData[i] = (Math.random() * 2 - 1) * 0.5;

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const noiseLP = this.ctx.createBiquadFilter();
    noiseLP.type            = 'bandpass';
    noiseLP.frequency.value = hz;
    noiseLP.Q.value         = 3;

    const noiseEnv = this.ctx.createGain();
    noiseEnv.gain.setValueAtTime(peakGain * 0.6, t);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noiseSrc.connect(noiseLP);
    noiseLP.connect(noiseEnv);
    noiseEnv.connect(this.masterGain);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.05);

    // ── Sustained sine ring (the string vibrating)
    const osc = this.ctx.createOscillator();
    osc.type            = 'sine';
    osc.frequency.value = hz;
    osc.detune.value    = (Math.random() - 0.5) * 5;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peakGain * 0.5, t + 0.01);
    env.gain.exponentialRampToValueAtTime(peakGain * 0.25, t + 0.4);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.7);
  }

  // ── Melodic improvisation ─────────────────────────────────────────────────

  private schedulePhrase(delayMs: number): void {
    if (!this.playing) return;
    this.phraseTimeoutId = setTimeout(() => {
      if (!this.playing) return;
      this.playPhrase();
    }, delayMs);
  }

  private playPhrase(): void {
    if (!this.ctx || !this.playing) return;

    const { notes, tonic, beatMs } = this.currentRaga;

    const phraseLen  = 4 + Math.floor(Math.random() * 4);
    const octaveBase = tonic + (Math.random() < 0.35 ? 12 : 0);

    const startIdx   = Math.floor(Math.random() * Math.max(1, notes.length - phraseLen));
    const ascending  = notes.slice(startIdx, startIdx + phraseLen);
    const descending = [...ascending].reverse().slice(1);

    const d = Math.random();
    let phrase: number[];
    if (d < 0.4)      phrase = ascending;
    else if (d < 0.7) phrase = descending;
    else              phrase = [...ascending, ...descending.slice(1)];

    const midiNotes = phrase.map(offset => octaveBase + offset);

    let tOffset = 0;
    for (const midi of midiNotes) {
      const duration = beatMs * (0.8 + Math.random() * 0.5);
      this.pluckMelodyNote(midi, this.ctx!.currentTime + tOffset / 1000, duration / 1000);
      tOffset += beatMs * (0.9 + Math.random() * 0.25);
    }

    // Rest between phrases: 1.5–3 beats
    const phraseDuration = tOffset + beatMs * (1.5 + Math.random() * 1.5);
    this.schedulePhrase(phraseDuration);
  }

  /**
   * Plucked-string melody note (Veena style):
   *  — Sharp percussive attack via bandpass-filtered noise burst  (1 ms)
   *  — Sustained harmonic body via two detuned sines              (long)
   *  — Gamaka (pitch ornament): glide from slightly below target
   *  — Tail fades naturally — sounds like a real plucked string
   */
  private pluckMelodyNote(midi: number, startTime: number, durationSec: number): void {
    if (!this.ctx || !this.masterGain) return;

    const baseHz   = midiToHz(midi);
    const peakGain = 0.22 + Math.random() * 0.08;

    // ── Pluck transient (noise burst through bandpass, 5 ms) ─────────────
    const clickLen  = Math.round(this.ctx.sampleRate * 0.005);
    const clickBuf  = this.ctx.createBuffer(1, clickLen, this.ctx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickLen; i++) clickData[i] = Math.random() * 2 - 1;

    const clickSrc = this.ctx.createBufferSource();
    clickSrc.buffer = clickBuf;

    const clickBP = this.ctx.createBiquadFilter();
    clickBP.type            = 'bandpass';
    clickBP.frequency.value = baseHz;
    clickBP.Q.value         = 4;

    const clickEnv = this.ctx.createGain();
    clickEnv.gain.setValueAtTime(peakGain * 1.2, startTime);
    clickEnv.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);

    clickSrc.connect(clickBP);
    clickBP.connect(clickEnv);
    clickEnv.connect(this.masterGain);
    clickSrc.start(startTime);
    clickSrc.stop(startTime + 0.03);

    // ── Fundamental — gamaka glide up from -0.7 semitones ────────────────
    const osc1 = this.ctx.createOscillator();
    const env1 = this.ctx.createGain();
    osc1.type  = 'sine';
    osc1.frequency.setValueAtTime(midiToHz(midi - 0.7), startTime);
    osc1.frequency.exponentialRampToValueAtTime(baseHz, startTime + 0.06);

    env1.gain.setValueAtTime(0, startTime);
    env1.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);           // 10 ms attack
    env1.gain.exponentialRampToValueAtTime(peakGain * 0.5, startTime + durationSec * 0.25);
    env1.gain.exponentialRampToValueAtTime(0.0001,          startTime + durationSec);

    osc1.connect(env1);
    env1.connect(this.masterGain);
    osc1.start(startTime);
    osc1.stop(startTime + durationSec + 0.1);

    // ── Detuned copy (+8 cents) — gives warmth/chorus ────────────────────
    const osc2 = this.ctx.createOscillator();
    const env2 = this.ctx.createGain();
    osc2.type         = 'sine';
    osc2.frequency.value = baseHz;
    osc2.detune.value    = 8;

    env2.gain.setValueAtTime(0, startTime);
    env2.gain.linearRampToValueAtTime(peakGain * 0.35, startTime + 0.015);
    env2.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec * 0.6);

    osc2.connect(env2);
    env2.connect(this.masterGain);
    osc2.start(startTime);
    osc2.stop(startTime + durationSec * 0.6);

    // ── 2nd harmonic (adds brightness, low volume) ────────────────────────
    const osc3 = this.ctx.createOscillator();
    const env3 = this.ctx.createGain();
    osc3.type            = 'sine';
    osc3.frequency.value = baseHz * 2;

    env3.gain.setValueAtTime(0, startTime);
    env3.gain.linearRampToValueAtTime(peakGain * 0.15, startTime + 0.01);
    env3.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec * 0.3);

    osc3.connect(env3);
    env3.connect(this.masterGain);
    osc3.start(startTime);
    osc3.stop(startTime + durationSec * 0.3);
  }
}

// Global singleton
export const backgroundMusicService = new BackgroundMusicService();
