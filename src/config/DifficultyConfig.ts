/**
 * Difficulty progression system
 * Defines 5 phases with escalating challenge over time
 */

import { DifficultyPhase, DifficultyPhaseConfig, ItemType } from '../types/GameTypes';

export const DIFFICULTY_PHASES: DifficultyPhaseConfig[] = [
  {
    phase: DifficultyPhase.DAWN,
    startTime: 0,
    endTime: 20000, // 0-20 seconds
    fallSpeed: 1.8,
    spawnRate: 2000,
    bombChance: 0.0,
    newItemIntroduced: undefined,
  },
  {
    phase: DifficultyPhase.RISING,
    startTime: 20000,
    endTime: 60000, // 20-60 seconds
    fallSpeed: 2.8,
    spawnRate: 1400,
    bombChance: 0.12,
    newItemIntroduced: ItemType.BOMB,
  },
  {
    phase: DifficultyPhase.STORM,
    startTime: 60000,
    endTime: 120000, // 60-120 seconds
    fallSpeed: 3.8,
    spawnRate: 1000,
    bombChance: 0.18,
    newItemIntroduced: ItemType.METEOR,
  },
  {
    phase: DifficultyPhase.TEMPEST,
    startTime: 120000,
    endTime: 210000, // 120-210 seconds
    fallSpeed: 5.0,
    spawnRate: 750,
    bombChance: 0.22,
    newItemIntroduced: ItemType.DECOY,
  },
  {
    phase: DifficultyPhase.CHAOS,
    startTime: 210000,
    endTime: undefined, // 210+ seconds, no upper bound
    fallSpeed: 6.5,
    spawnRate: 600,
    bombChance: 0.28,
    newItemIntroduced: undefined,
  },
];

/**
 * Get the phase config for a given elapsed time
 */
export function getPhaseForTime(elapsedMs: number): DifficultyPhaseConfig {
  const phase = DIFFICULTY_PHASES.find(p => {
    const afterStart = elapsedMs >= p.startTime;
    const beforeEnd = p.endTime ? elapsedMs < p.endTime : true;
    return afterStart && beforeEnd;
  });

  return phase || DIFFICULTY_PHASES[DIFFICULTY_PHASES.length - 1];
}

/**
 * Get the next phase transition time
 */
export function getNextPhaseTime(currentPhaseConfig: DifficultyPhaseConfig): number | null {
  const currentIndex = DIFFICULTY_PHASES.indexOf(currentPhaseConfig);
  if (currentIndex === -1 || currentIndex === DIFFICULTY_PHASES.length - 1) {
    return null;
  }
  return DIFFICULTY_PHASES[currentIndex + 1].startTime;
}

/**
 * Check if a phase transition occurred
 */
export function didPhaseChange(previousMs: number, currentMs: number): DifficultyPhaseConfig | null {
  const previousPhase = getPhaseForTime(previousMs);
  const currentPhase = getPhaseForTime(currentMs);

  if (previousPhase.phase !== currentPhase.phase) {
    return currentPhase;
  }

  return null;
}

/**
 * Get phase name for display
 */
export function getPhaseDisplayName(phase: DifficultyPhase): string {
  const names: Record<DifficultyPhase, string> = {
    [DifficultyPhase.DAWN]: '🌅 DAWN',
    [DifficultyPhase.RISING]: '📈 RISING',
    [DifficultyPhase.STORM]: '⛈️ STORM',
    [DifficultyPhase.TEMPEST]: '🌪️ TEMPEST',
    [DifficultyPhase.CHAOS]: '💥 CHAOS',
  };
  return names[phase];
}

/**
 * Get phase emoji
 */
export function getPhaseEmoji(phase: DifficultyPhase): string {
  const emojis: Record<DifficultyPhase, string> = {
    [DifficultyPhase.DAWN]: '🌅',
    [DifficultyPhase.RISING]: '📈',
    [DifficultyPhase.STORM]: '⛈️',
    [DifficultyPhase.TEMPEST]: '🌪️',
    [DifficultyPhase.CHAOS]: '💥',
  };
  return emojis[phase];
}

/**
 * Score targets for star rating (1-3 stars based on phase)
 */
export function getScoreTargetForPhase(phase: DifficultyPhase): { oneStar: number; twoStar: number; threeStar: number } {
  const targets: Record<DifficultyPhase, { oneStar: number; twoStar: number; threeStar: number }> = {
    [DifficultyPhase.DAWN]: { oneStar: 50, twoStar: 100, threeStar: 200 },
    [DifficultyPhase.RISING]: { oneStar: 100, twoStar: 300, threeStar: 500 },
    [DifficultyPhase.STORM]: { oneStar: 500, twoStar: 1000, threeStar: 1500 },
    [DifficultyPhase.TEMPEST]: { oneStar: 1500, twoStar: 3000, threeStar: 5000 },
    [DifficultyPhase.CHAOS]: { oneStar: 3000, twoStar: 7500, threeStar: 15000 },
  };
  return targets[phase];
}
