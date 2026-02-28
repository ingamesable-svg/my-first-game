/**
 * PowerupHUD — renders a vertical stack of pill bars on the left side
 * of the screen showing each active powerup with a depleting timer bar.
 *
 * Shield (one-hit) shows as a solid pill with no countdown.
 */

import Phaser              from 'phaser';
import { PowerupSystem, ActivePowerup } from '../systems/PowerupSystem';
import { PowerupType }     from '../types/GameTypes';
import { DEPTH }           from '../config/GameConfig';

interface Pill {
  gfx:   Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

const PILL_W  = 88;
const PILL_H  = 18;
const PILL_X  = 10;
const START_Y = 48;   // just below the lives / score row
const GAP     = 24;

export class PowerupHUD {
  private scene:  Phaser.Scene;
  private system: PowerupSystem;
  private pills:  Map<PowerupType, Pill> = new Map();

  constructor(scene: Phaser.Scene, system: PowerupSystem) {
    this.scene  = scene;
    this.system = system;
  }

  /** Call every frame in GameScene.update() */
  update(): void {
    const active    = this.system.getActive();
    const activeSet = new Set(active.map(p => p.type));

    // Destroy pills that have expired
    for (const [type, pill] of this.pills) {
      if (!activeSet.has(type)) {
        pill.gfx.destroy();
        pill.label.destroy();
        this.pills.delete(type);
      }
    }

    // Create / update remaining pills
    active.forEach((pw: ActivePowerup, i: number) => {
      const y    = START_Y + i * GAP;
      const frac = pw.totalMs > 0
        ? Math.max(0, pw.remainingMs / pw.totalMs)
        : 1; // shield: always full

      if (!this.pills.has(pw.type)) {
        const gfx = this.scene.add.graphics().setDepth(DEPTH.UI_HUD);
        const label = this.scene.add
          .text(PILL_X + 6, y, '', { font: 'bold 10px Arial', color: '#ffffff' })
          .setOrigin(0, 0.5)
          .setDepth(DEPTH.UI_HUD + 1);
        this.pills.set(pw.type, { gfx, label });
      }

      const pill = this.pills.get(pw.type)!;
      pill.gfx.clear();

      // Dark background track
      pill.gfx.fillStyle(0x000000, 0.55);
      pill.gfx.fillRoundedRect(PILL_X, y - PILL_H / 2, PILL_W, PILL_H, 4);

      // Coloured fill (depletes left-to-right)
      const fillW = Math.max(6, (PILL_W - 2) * frac);
      pill.gfx.fillStyle(pw.color, 0.9);
      pill.gfx.fillRoundedRect(PILL_X + 1, y - PILL_H / 2 + 1, fillW, PILL_H - 2, 3);

      // Label: emoji + name + remaining seconds (omit for shield)
      const timeStr = pw.totalMs > 0
        ? `  ${Math.ceil(pw.remainingMs / 1000)}s`
        : '';
      pill.label.setText(`${pw.emoji} ${pw.label}${timeStr}`);
    });
  }

  destroy(): void {
    for (const pill of this.pills.values()) {
      pill.gfx.destroy();
      pill.label.destroy();
    }
    this.pills.clear();
  }
}
