/**
 * ComboDisplay - Permanent HUD combo counter with ring countdown timer
 *
 * - Hidden when combo < 2
 * - Colour-coded: x2=blue  x3=green  x4=orange  x5=red  x6+=gold
 * - Circular arc shows time remaining in the combo window
 * - Animated in / out
 */

import Phaser from 'phaser';
import { GAME_BALANCE, DEPTH } from '../config/GameConfig';

// Combo level → colour (as Phaser hex int)
const COMBO_COLOURS: Record<number, number> = {
  2: 0x74b9ff, // blue
  3: 0x55efc4, // green
  4: 0xfdcb6e, // orange
  5: 0xff7675, // red
};
const COMBO_COLOUR_MAX = 0xffd93d; // gold for x6+

function comboColour(n: number): number {
  if (n >= 6)               return COMBO_COLOUR_MAX;
  return COMBO_COLOURS[n] ?? 0xffffff;
}

export class ComboDisplay {
  private scene:     Phaser.Scene;
  private gfx!:      Phaser.GameObjects.Graphics;
  private label!:    Phaser.GameObjects.Text;
  private container!: Phaser.GameObjects.Container;

  // State
  private combo       = 0;
  private lastCatchMs = 0;
  private visible     = false;

  // Position (anchored top-right under HUD)
  private cx: number;
  private cy: number;
  private radius = 22;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.cx = scene.cameras.main.width - 44;
    this.cy = 70;
    this.build();
  }

  private build(): void {
    this.gfx = this.scene.add.graphics().setDepth(DEPTH.UI_HUD);

    this.label = this.scene.add.text(this.cx, this.cy, '', {
      font:            'bold 16px Arial',
      color:           '#ffffff',
      stroke:          '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH.UI_HUD).setAlpha(0);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Called whenever an item is caught. */
  onCatch(newCombo: number, timeNowMs: number): void {
    this.combo       = newCombo;
    this.lastCatchMs = timeNowMs;

    if (this.combo >= 2) {
      this.show();
    }
  }

  /** Called when the combo chain breaks. */
  onBreak(): void {
    this.combo = 0;
    this.hide();
  }

  /** Call every frame with current time to animate the ring. */
  update(timeNowMs: number): void {
    if (this.combo < 2) return;

    const elapsed  = timeNowMs - this.lastCatchMs;
    const remaining = Math.max(0, GAME_BALANCE.comboTimeWindow - elapsed);
    const fraction  = remaining / GAME_BALANCE.comboTimeWindow;

    // Auto-hide when window expires
    if (fraction <= 0) {
      this.onBreak();
      return;
    }

    const col = comboColour(this.combo);
    this.drawRing(fraction, col);
    this.label.setText(`x${this.combo}`);
    this.label.setStyle({ color: '#' + col.toString(16).padStart(6, '0') });
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  private drawRing(fraction: number, col: number): void {
    const { cx, cy, radius: r } = this;
    this.gfx.clear();

    // Background ring
    this.gfx.lineStyle(4, 0x333344, 0.7);
    this.gfx.strokeCircle(cx, cy, r);

    // Progress arc (starts from top = -π/2, goes clockwise)
    if (fraction > 0) {
      this.gfx.lineStyle(4, col, 1);
      this.gfx.beginPath();
      this.gfx.arc(
        cx, cy, r,
        Phaser.Math.DegToRad(-90),
        Phaser.Math.DegToRad(-90 + 360 * fraction),
        false,
      );
      this.gfx.strokePath();
    }

    // Centre fill dot
    this.gfx.fillStyle(col, 0.15);
    this.gfx.fillCircle(cx, cy, r - 4);
  }

  private show(): void {
    if (this.visible) return;
    this.visible = true;
    this.scene.tweens.add({
      targets:  this.label,
      alpha:    1,
      duration: 150,
      ease:     'Cubic.easeOut',
    });
  }

  private hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.scene.tweens.add({
      targets:  this.label,
      alpha:    0,
      duration: 200,
      ease:     'Cubic.easeIn',
      onComplete: () => this.gfx.clear(),
    });
  }

  destroy(): void {
    this.gfx.destroy();
    this.label.destroy();
  }
}
