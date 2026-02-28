/**
 * MenuScene - Main menu and start screen
 * Phase 2: Initialises AudioService on first user gesture (Play button)
 */

import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH } from '../config/GameConfig';
import { storageService }    from '../services/StorageService';
import { audioService }             from '../services/AudioService';
import { backgroundMusicService }  from '../services/BackgroundMusicService';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: SCENE_KEYS.MENU }); }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a2e)
      .setDepth(DEPTH.BACKGROUND);

    this.drawBackgroundStars();

    // ── Title ──────────────────────────────────────────────────────────────
    this.add.text(width / 2, height * 0.22, '⭐', { font: '72px serif' })
      .setOrigin(0.5).setDepth(DEPTH.GAME_OBJECTS);

    this.add.text(width / 2, height * 0.33, 'Star Catcher', {
      font: 'bold 44px Arial', color: '#ffd93d',
    }).setOrigin(0.5).setDepth(DEPTH.GAME_OBJECTS);

    // ── Instructions ──────────────────────────────────────────────────────
    this.add.text(
      width / 2, height * 0.48,
      'Slide to move the basket.\nCatch ⭐ stars · avoid 💣 bombs!',
      { font: '15px Arial', color: '#aaaaaa', align: 'center', lineSpacing: 6 },
    ).setOrigin(0.5).setDepth(DEPTH.GAME_OBJECTS);

    // ── Best score ─────────────────────────────────────────────────────────
    const best = storageService.getBestScore();
    this.add.text(width / 2, height * 0.63,
      best > 0 ? `BEST: ${best}` : '',
      { font: 'bold 22px Arial', color: '#ffffff' },
    ).setOrigin(0.5).setDepth(DEPTH.GAME_OBJECTS);

    // ── Play button ────────────────────────────────────────────────────────
    const btnBg = this.add
      .rectangle(width / 2, height * 0.77, 210, 60, 0x6c63ff)
      .setInteractive().setDepth(DEPTH.GAME_OBJECTS);

    this.add.text(width / 2, height * 0.77, 'PLAY NOW', {
      font: 'bold 24px Arial', color: '#ffffff',
    }).setOrigin(0.5).setDepth(DEPTH.GAME_OBJECTS);

    btnBg.on('pointerover',  () => btnBg.setFillStyle(0x9088ff));
    btnBg.on('pointerout',   () => btnBg.setFillStyle(0x6c63ff));
    btnBg.on('pointerdown',  () => btnBg.setScale(0.96));
    btnBg.on('pointerup',    () => {
      btnBg.setScale(1);
      // *** AudioContext must be created inside a user gesture ***
      audioService.init();
      backgroundMusicService.init();  // unlock AudioContext for music
      this.scene.start(SCENE_KEYS.GAME);
    });
  }

  private drawBackgroundStars(): void {
    const { width, height } = this.cameras.main;
    for (let i = 0; i < 120; i++) {
      this.add.circle(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 1.5 + 0.3,
        0xffffff,
        Math.random() * 0.6 + 0.2,
      ).setDepth(DEPTH.BACKGROUND + 1);
    }
  }
}
