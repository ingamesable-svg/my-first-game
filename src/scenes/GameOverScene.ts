/**
 * GameOverScene - Game over screen
 * Shows final score, best score, and play again button
 */

import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH } from '../config/GameConfig';
import { storageService } from '../services/StorageService';

export interface GameOverData {
  score: number;
  survivalTime: number;
  itemsCaught: number;
}

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;
  private survivalTime: number = 0;
  private itemsCaught: number = 0;

  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  init(data: GameOverData): void {
    this.finalScore = data.score;
    this.survivalTime = data.survivalTime;
    this.itemsCaught = data.itemsCaught;

    // Update best score in storage
    storageService.setBestScore(this.finalScore);

    console.log('[GameOverScene] Init with score:', this.finalScore);
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a2e).setDepth(DEPTH.BACKGROUND);

    // Draw background stars
    this.drawBackgroundStars();

    // Game Over Title
    const titleText = this.add.text(width / 2, height * 0.15, '💫', {
      font: '72px Arial',
      color: '#ffd93d',
    });
    titleText.setOrigin(0.5);
    titleText.setDepth(DEPTH.GAME_OBJECTS);

    const gameOverTitle = this.add.text(width / 2, height * 0.25, 'Game Over!', {
      font: '48px Arial Bold',
      color: '#ffd93d',
    });
    gameOverTitle.setOrigin(0.5);
    gameOverTitle.setDepth(DEPTH.GAME_OBJECTS);

    // Score Display
    const scoreLabel = this.add.text(width / 2 - 80, height * 0.4, 'Score', {
      font: '14px Arial',
      color: '#aaaaaa',
    });
    scoreLabel.setOrigin(0.5);
    scoreLabel.setDepth(DEPTH.GAME_OBJECTS);

    const scoreValue = this.add.text(width / 2 - 80, height * 0.48, String(this.finalScore), {
      font: 'bold 48px Arial',
      color: '#ffffff',
    });
    scoreValue.setOrigin(0.5);
    scoreValue.setDepth(DEPTH.GAME_OBJECTS);

    // Best Score Display
    const bestScore = storageService.getBestScore();
    const bestLabel = this.add.text(width / 2 + 80, height * 0.4, 'Best', {
      font: '14px Arial',
      color: '#aaaaaa',
    });
    bestLabel.setOrigin(0.5);
    bestLabel.setDepth(DEPTH.GAME_OBJECTS);

    const bestValue = this.add.text(width / 2 + 80, height * 0.48, String(bestScore), {
      font: 'bold 48px Arial',
      color: '#ffffff',
    });
    bestValue.setOrigin(0.5);
    bestValue.setDepth(DEPTH.GAME_OBJECTS);

    // New Best Banner
    if (this.finalScore === bestScore && this.finalScore > 0) {
      const newBestText = this.add.text(width / 2, height * 0.62, '🎉 NEW BEST! 🎉', {
        font: 'bold 24px Arial',
        color: '#ffd93d',
      });
      newBestText.setOrigin(0.5);
      newBestText.setDepth(DEPTH.GAME_OBJECTS);
    }

    // Stats
    const statsText = this.add.text(
      width / 2,
      height * 0.7,
      `Items Caught: ${this.itemsCaught}\nTime: ${(this.survivalTime / 1000).toFixed(1)}s`,
      {
        font: '14px Arial',
        color: '#aaaaaa',
        align: 'center',
      }
    );
    statsText.setOrigin(0.5);
    statsText.setDepth(DEPTH.GAME_OBJECTS);

    // Play Again Button
    const playAgainButton = this.add.rectangle(width / 2, height * 0.85, 200, 60, 0x6c63ff);
    playAgainButton.setInteractive();
    playAgainButton.setDepth(DEPTH.GAME_OBJECTS);

    const buttonText = this.add.text(width / 2, height * 0.85, 'PLAY AGAIN', {
      font: 'bold 24px Arial',
      color: '#ffffff',
    });
    buttonText.setOrigin(0.5);
    buttonText.setDepth(DEPTH.GAME_OBJECTS);

    playAgainButton.on('pointerover', () => {
      playAgainButton.setFillStyle(0x8a84ff);
    });

    playAgainButton.on('pointerout', () => {
      playAgainButton.setFillStyle(0x6c63ff);
    });

    playAgainButton.on('pointerdown', () => {
      playAgainButton.setScale(0.95);
    });

    playAgainButton.on('pointerup', () => {
      playAgainButton.setScale(1);
      this.restartGame();
    });
  }

  restartGame(): void {
    console.log('[GameOverScene] Restarting game');
    this.scene.start(SCENE_KEYS.GAME);
  }

  drawBackgroundStars(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const starCount = 120;

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 1.5 + 0.3;
      const alpha = Math.random() * 0.6 + 0.2;

      this.add.circle(x, y, r, 0xffffff, alpha).setDepth(DEPTH.BACKGROUND);
    }
  }
}
