/**
 * HapticSystem - Vibration feedback via the Web Vibration API
 *
 * On Android (Chrome / WebView / Capacitor) this triggers real haptics.
 * On iOS and desktop it silently no-ops (API not supported).
 * Respects the user's haptic preference stored in StorageService.
 */

import { storageService } from '../services/StorageService';

class HapticSystem {
  private supported: boolean;

  constructor() {
    this.supported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    console.log('[HapticSystem] Vibration API supported:', this.supported);
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.supported)                    return;
    if (!storageService.isHapticEnabled())  return;
    try {
      navigator.vibrate(pattern);
    } catch (_) {
      // Some browsers block vibrate in certain contexts — fail silently
    }
  }

  // ── Public event methods ──────────────────────────────────────────────────

  /** ⭐ Regular star caught — light tap */
  catchStar(): void {
    this.vibrate(15);
  }

  /** 🌟 Golden star caught — medium double tap */
  catchGolden(): void {
    this.vibrate([25, 40, 25]);
  }

  /** 💣 Bomb caught / life lost — strong single pulse */
  lifeLost(): void {
    this.vibrate(80);
  }

  /** 🔥 Combo milestone (x3, x5, x10…) — success pattern */
  comboMilestone(): void {
    this.vibrate([20, 30, 20, 30, 40]);
  }

  /** 💀 Game over — triple descending pulse */
  gameOver(): void {
    this.vibrate([80, 60, 60, 50, 40]);
  }

  /** 🌪️ Phase change — sharp medium pulse */
  phaseChange(): void {
    this.vibrate(40);
  }

  /** 🏆 New best score — celebratory rapid pattern */
  newBest(): void {
    this.vibrate([20, 20, 20, 20, 20, 20, 60]);
  }

  /** ⚡ Powerup collected */
  powerupCollect(): void {
    this.vibrate([15, 25, 30]);
  }
}

// Global singleton
export const hapticSystem = new HapticSystem();
