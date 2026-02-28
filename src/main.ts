/**
 * Main entry point
 * Initializes Phaser game and all scenes
 */

import Phaser from 'phaser';
import { PHASER_CONFIG, SCENE_KEYS } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

// Initialize Capacitor if available (for Android deployment)
// import { App } from '@capacitor/app';
// import { SplashScreen } from '@capacitor/splash-screen';

// async function initCapacitor() {
//   try {
//     SplashScreen.show();
//     App.addListener('backButton', () => {
//       // Handle back button if needed
//     });
//   } catch (error) {
//     console.log('[Main] Capacitor not available (running in browser)');
//   }
// }

console.log('[Main] Initializing Star Catcher v2.0');

// Configure Phaser with all scenes
const config: Phaser.Types.Core.GameConfig = {
  ...PHASER_CONFIG,
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene],
};

// Create the game
const game = new Phaser.Game(config);

// Initialize Capacitor plugins if available
// initCapacitor().then(() => {
//   console.log('[Main] Capacitor initialized');
// });

console.log('[Main] Phaser game created');
