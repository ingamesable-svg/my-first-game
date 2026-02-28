/**
 * Core game type definitions and interfaces
 */

export enum GameStateType {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

export enum ItemType {
  STAR = 'STAR',
  GOLDEN_STAR = 'GOLDEN_STAR',
  BOMB = 'BOMB',
  MAGNET = 'MAGNET',
  TIME_FREEZE = 'TIME_FREEZE',
  SHIELD = 'SHIELD',
  EXTRA_LIFE = 'EXTRA_LIFE',
  MULTIPLIER = 'MULTIPLIER',
  METEOR = 'METEOR',
  DECOY = 'DECOY',
  DIAMOND = 'DIAMOND',
}

export enum PowerupType {
  MAGNET = 'MAGNET',
  TIME_FREEZE = 'TIME_FREEZE',
  SHIELD = 'SHIELD',
  MULTIPLIER = 'MULTIPLIER',
}

export enum DifficultyPhase {
  DAWN = 'DAWN',        // 0-20s
  RISING = 'RISING',    // 20-60s
  STORM = 'STORM',      // 60-120s
  TEMPEST = 'TEMPEST',  // 120-210s
  CHAOS = 'CHAOS',      // 210s+
}

export interface ItemDefinition {
  type: ItemType;
  emoji: string;
  points: number;
  color: string;
  size: number;
  rarity: number; // 0-1, spawn weight
}

export interface PlayerStats {
  score: number;
  bestScore: number;
  lives: number;
  combo: number;
  itemsCaught: number;
  bombsDodged: number;
  longestCombo: number;
  survivalTime: number;
  powerupsUsed: number;
}

export interface StoredData {
  version: number; // For migration support
  bestScore: number;
  unlockedSkins: string[];
  achievements: { [key: string]: boolean };
  soundEnabled: boolean;
  hapticEnabled: boolean;
  tutorialCompleted: boolean;
  lastDailyChallengeDate: string;
}

export interface DifficultyPhaseConfig {
  phase: DifficultyPhase;
  startTime: number; // ms
  endTime?: number; // ms, undefined = no upper bound
  fallSpeed: number;
  spawnRate: number; // ms between spawns
  bombChance: number; // 0-1
  newItemIntroduced?: ItemType;
}

export interface BasketConfig {
  width: number;
  height: number;
  yFraction: number; // 0-1, where on screen
}

export interface FallingItemData {
  type: ItemType;
  x: number;
  y: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
}

export interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  radius: number;
}

export interface ScorePopupData {
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
}
