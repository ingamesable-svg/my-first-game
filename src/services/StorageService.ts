/**
 * Persistent storage layer with type safety and migration support
 * Wraps localStorage with a typed schema
 */

import { StoredData } from '../types/GameTypes';

const STORAGE_KEY = 'star-catcher-data';
const DATA_VERSION = 1;

const DEFAULT_DATA: StoredData = {
  version: DATA_VERSION,
  bestScore: 0,
  unlockedSkins: ['default'],
  achievements: {},
  soundEnabled: true,
  hapticEnabled: true,
  tutorialCompleted: false,
  lastDailyChallengeDate: new Date().toISOString().split('T')[0],
};

export class StorageService {
  private data: StoredData;

  constructor() {
    this.data = this.load();
  }

  /**
   * Load data from localStorage
   */
  private load(): StoredData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { ...DEFAULT_DATA };
      }

      const parsed: StoredData = JSON.parse(stored);

      // Migrate if version mismatch
      if (parsed.version !== DATA_VERSION) {
        return this.migrate(parsed);
      }

      return parsed;
    } catch (error) {
      console.error('[StorageService] Failed to load data:', error);
      return { ...DEFAULT_DATA };
    }
  }

  /**
   * Handle data migrations for version changes
   */
  private migrate(oldData: any): StoredData {
    console.log('[StorageService] Migrating data from version', oldData.version, 'to', DATA_VERSION);

    // Add migration logic here as the game evolves
    // For now, just upgrade version
    return {
      ...DEFAULT_DATA,
      bestScore: oldData.bestScore || 0,
      unlockedSkins: oldData.unlockedSkins || ['default'],
      achievements: oldData.achievements || {},
      soundEnabled: oldData.soundEnabled !== false,
      hapticEnabled: oldData.hapticEnabled !== false,
      tutorialCompleted: oldData.tutorialCompleted || false,
      lastDailyChallengeDate: oldData.lastDailyChallengeDate || new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Save data to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error('[StorageService] Failed to save data:', error);
    }
  }

  // ===== Best Score =====

  getBestScore(): number {
    return this.data.bestScore;
  }

  setBestScore(score: number): void {
    if (score > this.data.bestScore) {
      this.data.bestScore = score;
      this.save();
    }
  }

  // ===== Skins =====

  getUnlockedSkins(): string[] {
    return [...this.data.unlockedSkins];
  }

  unlockSkin(skinId: string): void {
    if (!this.data.unlockedSkins.includes(skinId)) {
      this.data.unlockedSkins.push(skinId);
      this.save();
    }
  }

  hasSkin(skinId: string): boolean {
    return this.data.unlockedSkins.includes(skinId);
  }

  // ===== Achievements =====

  getAchievements(): { [key: string]: boolean } {
    return { ...this.data.achievements };
  }

  unlockAchievement(id: string): boolean {
    if (!this.data.achievements[id]) {
      this.data.achievements[id] = true;
      this.save();
      return true; // Newly unlocked
    }
    return false; // Already unlocked
  }

  hasAchievement(id: string): boolean {
    return this.data.achievements[id] === true;
  }

  // ===== Audio / Haptics Preferences =====

  isSoundEnabled(): boolean {
    return this.data.soundEnabled;
  }

  setSoundEnabled(enabled: boolean): void {
    this.data.soundEnabled = enabled;
    this.save();
  }

  isHapticEnabled(): boolean {
    return this.data.hapticEnabled;
  }

  setHapticEnabled(enabled: boolean): void {
    this.data.hapticEnabled = enabled;
    this.save();
  }

  // ===== Tutorial =====

  isTutorialCompleted(): boolean {
    return this.data.tutorialCompleted;
  }

  completeTutorial(): void {
    this.data.tutorialCompleted = true;
    this.save();
  }

  // ===== Daily Challenge =====

  getLastDailyChallengeDate(): string {
    return this.data.lastDailyChallengeDate;
  }

  updateDailyChallenge(): void {
    this.data.lastDailyChallengeDate = new Date().toISOString().split('T')[0];
    this.save();
  }

  isNewDay(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.data.lastDailyChallengeDate !== today;
  }

  // ===== Full Data Reset (for testing) =====

  reset(): void {
    this.data = { ...DEFAULT_DATA };
    this.save();
  }

  // ===== Direct Access (use sparingly) =====

  getData(): Readonly<StoredData> {
    return { ...this.data };
  }
}

// Global singleton instance
export const storageService = new StorageService();
