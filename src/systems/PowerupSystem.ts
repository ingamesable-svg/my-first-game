/**
 * PowerupSystem — tracks active powerups, their durations, and expiry.
 *
 * Usage:
 *   powerupSystem.activate(PowerupType.MAGNET);
 *   powerupSystem.isActive(PowerupType.MAGNET);        // true
 *   const expired = powerupSystem.update(delta);       // call every frame
 *   powerupSystem.deactivate(PowerupType.SHIELD);      // manual (one-hit)
 */

import { PowerupType }  from '../types/GameTypes';
import { GAME_BALANCE } from '../config/GameConfig';

export interface ActivePowerup {
  type:        PowerupType;
  label:       string;
  emoji:       string;
  color:       number;
  /** -1 means one-hit (shield) — never expires via timer */
  totalMs:     number;
  remainingMs: number;
}

// ─── Static metadata per powerup type ────────────────────────────────────────

const META: Record<PowerupType, Omit<ActivePowerup, 'remainingMs' | 'type'>> = {
  [PowerupType.MAGNET]:      { label: 'Magnet',   emoji: '🧲', color: 0xa29bfe, totalMs: GAME_BALANCE.magnetDuration      },
  [PowerupType.TIME_FREEZE]: { label: 'Freeze',   emoji: '❄️', color: 0x74b9ff, totalMs: GAME_BALANCE.timeFreezeDuration   },
  [PowerupType.SHIELD]:      { label: 'Shield',   emoji: '🛡️', color: 0x55efc4, totalMs: -1                                }, // one-hit
  [PowerupType.MULTIPLIER]:  { label: '2× Score', emoji: '⚡', color: 0xfdcb6e, totalMs: GAME_BALANCE.multiplierDuration   },
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class PowerupSystem {
  private active: Map<PowerupType, ActivePowerup> = new Map();

  /** Activate (or refresh) a powerup. */
  activate(type: PowerupType): void {
    const m = META[type];
    this.active.set(type, {
      type,
      label:       m.label,
      emoji:       m.emoji,
      color:       m.color,
      totalMs:     m.totalMs,
      remainingMs: m.totalMs,
    });
  }

  /** Manually deactivate (used for one-hit shield, or force-clear). */
  deactivate(type: PowerupType): void {
    this.active.delete(type);
  }

  isActive(type: PowerupType): boolean {
    return this.active.has(type);
  }

  /** 0 → 1 fraction remaining; always 1 for one-hit powerups. */
  getFraction(type: PowerupType): number {
    const pw = this.active.get(type);
    if (!pw || pw.totalMs < 0) return 1;
    return Math.max(0, pw.remainingMs / pw.totalMs);
  }

  /**
   * Call every frame with delta (ms).
   * Returns array of types that just expired this frame.
   */
  update(delta: number): PowerupType[] {
    const expired: PowerupType[] = [];

    for (const [type, pw] of this.active) {
      if (pw.totalMs < 0) continue;       // one-hit — never timer-expires
      pw.remainingMs -= delta;
      if (pw.remainingMs <= 0) expired.push(type);
    }

    for (const t of expired) this.active.delete(t);
    return expired;
  }

  getActive(): ActivePowerup[] {
    return Array.from(this.active.values());
  }

  clear(): void {
    this.active.clear();
  }
}
