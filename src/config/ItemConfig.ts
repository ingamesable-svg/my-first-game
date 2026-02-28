/**
 * Item type definitions and properties
 * Controls all falling object characteristics
 */

import { ItemDefinition, ItemType } from '../types/GameTypes';

export const ITEM_DEFINITIONS: Record<ItemType, ItemDefinition> = {
  [ItemType.STAR]: {
    type: ItemType.STAR,
    emoji: '⭐',
    points: 10,
    color: '#ffd93d',
    size: 30,
    rarity: 0.75,
  },
  [ItemType.GOLDEN_STAR]: {
    type: ItemType.GOLDEN_STAR,
    emoji: '🌟',
    points: 30,
    color: '#ff9f43',
    size: 36,
    rarity: 0.07,
  },
  [ItemType.BOMB]: {
    type: ItemType.BOMB,
    emoji: '💣',
    points: 0,
    color: '#ff6b6b',
    size: 32,
    rarity: 0.18,
  },
  [ItemType.MAGNET]: {
    type: ItemType.MAGNET,
    emoji: '🧲',
    points: 25,
    color: '#a29bfe',
    size: 28,
    rarity: 0.03,
  },
  [ItemType.TIME_FREEZE]: {
    type: ItemType.TIME_FREEZE,
    emoji: '❄️',
    points: 20,
    color: '#74b9ff',
    size: 28,
    rarity: 0.02,
  },
  [ItemType.SHIELD]: {
    type: ItemType.SHIELD,
    emoji: '🛡️',
    points: 15,
    color: '#fab1a0',
    size: 30,
    rarity: 0.03,
  },
  [ItemType.EXTRA_LIFE]: {
    type: ItemType.EXTRA_LIFE,
    emoji: '❤️',
    points: 0,
    color: '#ff7675',
    size: 32,
    rarity: 0.005,
  },
  [ItemType.MULTIPLIER]: {
    type: ItemType.MULTIPLIER,
    emoji: '⚡',
    points: 0,
    color: '#fdcb6e',
    size: 28,
    rarity: 0.02,
  },
  [ItemType.METEOR]: {
    type: ItemType.METEOR,
    emoji: '☄️',
    points: 50,
    color: '#d63031',
    size: 26,
    rarity: 0.04,
  },
  [ItemType.DECOY]: {
    type: ItemType.DECOY,
    emoji: '⭐',
    points: 0,
    color: '#ffd93d',
    size: 30,
    rarity: 0.02,
  },
  [ItemType.DIAMOND]: {
    type: ItemType.DIAMOND,
    emoji: '💎',
    points: 100,
    color: '#00b894',
    size: 24,
    rarity: 0.001,
  },
};

/**
 * Get item definition by type
 */
export function getItemDefinition(type: ItemType): ItemDefinition {
  return ITEM_DEFINITIONS[type];
}

/**
 * Calculate total rarity weight for normalization
 */
export function getTotalRarityWeight(): number {
  return Object.values(ITEM_DEFINITIONS).reduce((sum, def) => sum + def.rarity, 0);
}
