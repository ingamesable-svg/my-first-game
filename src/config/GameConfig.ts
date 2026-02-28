/**
 * Phaser game configuration and constants
 */

import Phaser from 'phaser';

export const BASKET_CONFIG = {
  width: 90,
  height: 22,
  yFraction: 0.88, // 88% down the screen
};

export const CANVAS_COLOR = '#0a0a2e';

export const PHASER_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: CANVAS_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 420,
    height: 780,
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { x: 0, y: 0 },
    },
  },
  input: {
    touch: {
      target: window,
    },
  },
  scene: [],
};

/**
 * Game balance tweaks
 */
export const GAME_BALANCE = {
  comboTimeWindow: 1800, // ms — time to extend combo chain
  comboMultiplierMin: 3, // x3 combo shows multiplier
  invincibilityDuration: 500, // ms after life loss
  screenshakeDuration: 250, // ms
  screenshakeIntensity: 4, // pixels

  // Powerup durations
  magnetDuration: 5000, // ms
  timeFreezeDuration: 4000, // ms
  shieldDuration: 0, // duration is "one hit"
  multiplierDuration: 10000, // ms

  // Basket physics
  basketMaxTilt: 10, // degrees
  basketTiltReturnSpeed: 0.1, // per frame
  basketCatchSquishScale: 0.7, // Y scale
  basketCatchAnimDuration: 150, // ms

  // Audio / Haptics
  pitchIncreasePerCombo: 0.15, // semitone offset per combo level

  // Particle spawning
  particlesPerCatch: 10,
  particlesPerBomb: 16,
};

/**
 * Scene keys
 */
export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  PAUSE: 'PauseScene',
  GAME_OVER: 'GameOverScene',
  SHOP: 'ShopScene',
};

/**
 * Depth/z-index levels for Phaser objects
 */
export const DEPTH = {
  BACKGROUND: 0,
  GAME_OBJECTS: 100,
  PARTICLES: 150,
  UI_HUD: 200,
  PAUSE_OVERLAY: 300,
  POPUP: 400,
};
