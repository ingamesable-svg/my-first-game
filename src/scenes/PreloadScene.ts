/**
 * PreloadScene - Loads all game assets before gameplay starts
 * Phase 1: No assets to load yet (using emoji rendering), transitions directly
 * Phase 2+: Will load sprite atlas, audio files here
 */

import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/GameConfig';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload(): void {
    // Phase 1: nothing to preload — emoji rendering requires no assets
    // Phase 2 will add:
    //   this.load.atlas('items', 'assets/sprites/items.png', 'assets/sprites/items.json');
    //   this.load.audio('catch-star', 'assets/audio/sfx/catch-star.ogg');
    //   this.load.audio('music-loop', 'assets/audio/music/theme-loop.ogg');
  }

  create(): void {
    console.log('[PreloadScene] Complete — transitioning to Menu');
    this.scene.start(SCENE_KEYS.MENU);
  }
}
