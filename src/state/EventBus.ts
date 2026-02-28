/**
 * Typed event-driven pub/sub system for cross-system communication
 * Prevents tight coupling between game systems
 */

export type EventCallback<T = any> = (data: T) => void;

interface EventListener<T = any> {
  callback: EventCallback<T>;
  once: boolean;
}

export class EventBus {
  private events: Map<string, EventListener<any>[]> = new Map();

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push({ callback, once: false });
  }

  /**
   * Subscribe to an event, fires only once then auto-unsubscribe
   */
  once<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push({ callback, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.events.has(event)) return;
    const listeners = this.events.get(event)!;
    const index = listeners.findIndex(l => l.callback === callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T = any>(event: string, data?: T): void {
    if (!this.events.has(event)) return;
    const listeners = this.events.get(event)!;
    const toRemove: number[] = [];

    listeners.forEach((listener, index) => {
      listener.callback(data);
      if (listener.once) {
        toRemove.push(index);
      }
    });

    // Remove 'once' listeners in reverse order to maintain indices
    toRemove.reverse().forEach(index => {
      listeners.splice(index, 1);
    });
  }

  /**
   * Remove all listeners for an event
   */
  clear(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

// Global event bus instance
export const eventBus = new EventBus();

/**
 * Define all game events as constants to avoid string typos
 */
export const GameEvents = {
  // Game state
  GAME_STARTED: 'game:started',
  GAME_PAUSED: 'game:paused',
  GAME_RESUMED: 'game:resumed',
  GAME_OVER: 'game:over',

  // Items
  ITEM_SPAWNED: 'item:spawned',
  ITEM_CAUGHT: 'item:caught',
  ITEM_MISSED: 'item:missed',

  // Combo
  COMBO_UPDATED: 'combo:updated',
  COMBO_BROKEN: 'combo:broken',

  // Score
  SCORE_UPDATED: 'score:updated',
  SCORE_MILESTONE_HIT: 'score:milestone',
  NEW_BEST_SCORE: 'score:new-best',

  // Lives
  LIFE_LOST: 'life:lost',
  LIFE_RESTORED: 'life:restored',

  // Difficulty
  DIFFICULTY_PHASE_CHANGED: 'difficulty:phase-changed',

  // Powerups
  POWERUP_COLLECTED: 'powerup:collected',
  POWERUP_EXPIRED: 'powerup:expired',

  // Achievements
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',

  // Audio
  PLAY_SFX: 'audio:play-sfx',
  STOP_MUSIC: 'audio:stop-music',

  // UI
  UPDATE_HUD: 'ui:update-hud',
  SHOW_NOTIFICATION: 'ui:show-notification',
};

/**
 * Event data interfaces (optional but recommended for type safety)
 */
export interface ItemCaughtData {
  type: string;
  x: number;
  y: number;
  points: number;
}

export interface ComboUpdatedData {
  combo: number;
  multiplier: number;
  timeRemaining: number; // ms
}

export interface DifficultyPhaseChangedData {
  phase: string;
  fallSpeed: number;
  spawnRate: number;
}

export interface PowerupCollectedData {
  type: string;
  duration: number;
}

export interface AchievementUnlockedData {
  id: string;
  name: string;
}
