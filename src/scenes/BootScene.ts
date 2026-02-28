/**
 * BootScene - First scene that runs
 * Registers asset keys and initializes the game
 * Transitions to PreloadScene for actual asset loading
 */

import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/GameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    // Load any assets needed for splash screen / preload scene
    // For now, we'll skip this and go straight to PreloadScene
  }

  create(): void {
    console.log('[BootScene] Initialized');

    // Transition to PreloadScene
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
