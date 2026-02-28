/**
 * GameScene - Phase 3
 *
 * Phase 3 additions on top of Phase 2:
 *  ✦ 8 item types spawned: Star, Golden Star, Bomb, Meteor, Decoy, Diamond,
 *      + 5 powerup pickups (Magnet, Time Freeze, Shield, Multiplier, Extra Life)
 *  ✦ PowerupSystem: timed powerup state with expiry
 *  ✦ PowerupHUD: left-side pill bars showing active powerup countdowns
 *  ✦ Magnet: catchable items drift toward basket while active
 *  ✦ Time Freeze: all items move at 18% speed while active (visual slowdown)
 *  ✦ Shield: absorbs next bomb hit; shows pulsing cyan ring around basket
 *  ✦ Multiplier: doubles all catch points for 10 seconds
 *  ✦ Extra Life: instant +1 life (max 5)
 *  ✦ Decoy: looks like a star — breaks combo and costs a life when caught
 *  ✦ Meteor: fast-falling high-value item (1.6× speed)
 *  ✦ Diamond: rare high-value item (100 pts)
 *  ✦ itemsCaught counter now properly tracked and sent to GameOverScene
 */

import Phaser from 'phaser';
import {
  SCENE_KEYS, BASKET_CONFIG, GAME_BALANCE, DEPTH,
} from '../config/GameConfig';
import { ITEM_DEFINITIONS }                      from '../config/ItemConfig';
import { getPhaseForTime, didPhaseChange,
         getPhaseDisplayName, DIFFICULTY_PHASES } from '../config/DifficultyConfig';
import { ItemType, PowerupType,
         DifficultyPhaseConfig }                 from '../types/GameTypes';
import { storageService }                        from '../services/StorageService';
import { audioService }                          from '../services/AudioService';
import { backgroundMusicService }                from '../services/BackgroundMusicService';
import { hapticSystem }                          from '../systems/HapticSystem';
import { PowerupSystem }                         from '../systems/PowerupSystem';
import { ComboDisplay }                          from '../ui/ComboDisplay';
import { PowerupHUD }                            from '../ui/PowerupHUD';
import { GameOverData }                          from './GameOverScene';

// ─── Internal types ────────────────────────────────────────────────────────────

interface FallingItem {
  textObj:       Phaser.GameObjects.Text;
  type:          ItemType;
  speed:         number;
  rotationSpeed: number;
  color:         number;
  points:        number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  color: number;
  radius: number;
}

interface ScorePopup {
  textObj: Phaser.GameObjects.Text;
}

interface BgStar {
  x: number; y: number;
  r: number; a: number; da: number;
}

const SCORE_MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000];

// ─── Scene ────────────────────────────────────────────────────────────────────

export class GameScene extends Phaser.Scene {

  // ── Graphics layers ──────────────────────────────────────────────────────
  private bgGfx!:       Phaser.GameObjects.Graphics;
  private particleGfx!: Phaser.GameObjects.Graphics;
  private basketGfx!:   Phaser.GameObjects.Graphics;
  private shieldGfx!:   Phaser.GameObjects.Graphics;
  private nearMissGfx!: Phaser.GameObjects.Graphics;

  // ── Overlay / flash ──────────────────────────────────────────────────────
  private flashRect!:   Phaser.GameObjects.Rectangle;

  // ── HUD ──────────────────────────────────────────────────────────────────
  private scoreText!:    Phaser.GameObjects.Text;
  private livesText!:    Phaser.GameObjects.Text;
  private bestText!:     Phaser.GameObjects.Text;
  private comboDisplay!: ComboDisplay;
  private powerupHUD!:   PowerupHUD;

  // ── Game state ────────────────────────────────────────────────────────────
  private score            = 0;
  private lives            = 3;
  private combo            = 0;
  private lastComboMs      = 0;
  private elapsed          = 0;
  private gameOver         = false;
  private invincible       = false;
  private nextMilestoneIdx = 0;
  private itemsCaught      = 0;

  // ── Powerup state ─────────────────────────────────────────────────────────
  private powerupSystem!: PowerupSystem;
  private shielded         = false;  // shield is one-hit — tracked separately

  // ── Basket state ─────────────────────────────────────────────────────────
  private basketX      = 0;
  private basketY      = 0;
  private prevBasketX  = 0;
  private basketTilt   = 0;
  private basketSquish = 1;

  // ── Collections ──────────────────────────────────────────────────────────
  private items:       FallingItem[] = [];
  private particles:   Particle[]    = [];
  private scorePopups: ScorePopup[]  = [];
  private bgStars:     BgStar[]      = [];

  // ── Spawn timing ─────────────────────────────────────────────────────────
  private lastSpawn     = 0;
  private spawnInterval = 2000;
  private fallSpeed     = 1.8;
  private currentPhase!: DifficultyPhaseConfig;
  private phaseIndex    = 0;

  constructor() { super({ key: SCENE_KEYS.GAME }); }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create(): void {
    const { width, height } = this.cameras.main;

    // Reset all state
    this.score            = 0;
    this.lives            = 3;
    this.combo            = 0;
    this.lastComboMs      = 0;
    this.elapsed          = 0;
    this.gameOver         = false;
    this.invincible       = false;
    this.nextMilestoneIdx = 0;
    this.itemsCaught      = 0;
    this.shielded         = false;
    this.lastSpawn        = 0;
    this.items            = [];
    this.particles        = [];
    this.scorePopups      = [];
    this.basketTilt       = 0;
    this.basketSquish     = 1;
    this.phaseIndex       = 0;
    this.currentPhase     = getPhaseForTime(0);
    this.fallSpeed        = this.currentPhase.fallSpeed;
    this.spawnInterval    = this.currentPhase.spawnRate;
    this.basketX          = width / 2;
    this.prevBasketX      = width / 2;
    this.basketY          = height * BASKET_CONFIG.yFraction;

    // ── Layers ────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a2e)
      .setDepth(DEPTH.BACKGROUND);

    this.bgGfx       = this.add.graphics().setDepth(DEPTH.BACKGROUND + 1);
    this.nearMissGfx = this.add.graphics().setDepth(DEPTH.GAME_OBJECTS - 1);
    this.particleGfx = this.add.graphics().setDepth(DEPTH.PARTICLES);
    this.basketGfx   = this.add.graphics().setDepth(DEPTH.PARTICLES + 1);
    this.shieldGfx   = this.add.graphics().setDepth(DEPTH.PARTICLES + 2);

    this.flashRect = this.add
      .rectangle(width / 2, height / 2, width, height, 0xff3c3c, 0)
      .setDepth(DEPTH.POPUP);

    this.initBgStars();
    this.createHUD();
    this.setupInput();

    // Powerup system and HUD (Phase 3)
    this.powerupSystem = new PowerupSystem();
    this.powerupHUD    = new PowerupHUD(this, this.powerupSystem);

    // Start Tamil Carnatic background music
    backgroundMusicService.startSession();
    this.showNowPlayingToast();
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    this.elapsed += delta;

    // ── Phase check ───────────────────────────────────────────────────────
    const newPhase = didPhaseChange(this.elapsed - delta, this.elapsed);
    if (newPhase) {
      const oldIdx      = this.phaseIndex;
      this.phaseIndex   = DIFFICULTY_PHASES.indexOf(newPhase);
      this.currentPhase = newPhase;
      this.fallSpeed    = newPhase.fallSpeed;
      this.spawnInterval = newPhase.spawnRate;
      if (this.phaseIndex > oldIdx) this.onPhaseTransition(newPhase);
    }

    // ── Spawn ─────────────────────────────────────────────────────────────
    if (time - this.lastSpawn > this.spawnInterval) {
      this.spawnItem();
      this.lastSpawn = time;
    }

    // ── Powerup system update ─────────────────────────────────────────────
    const expired = this.powerupSystem.update(delta);
    for (const type of expired) this.onPowerupExpired(type);
    this.powerupHUD.update();

    // ── Magnet: pull catchable items toward basket X ───────────────────────
    if (this.powerupSystem.isActive(PowerupType.MAGNET)) {
      for (const item of this.items) {
        if (
          item.type !== ItemType.BOMB  &&
          item.type !== ItemType.METEOR &&
          item.type !== ItemType.DECOY
        ) {
          const dx = this.basketX - item.textObj.x;
          item.textObj.x += dx * 0.05;
        }
      }
    }

    // ── Basket animation ─────────────────────────────────────────────────
    const vel        = this.basketX - this.prevBasketX;
    this.basketTilt  = Phaser.Math.Linear(this.basketTilt, vel * 0.5, 0.12);
    this.basketSquish = Phaser.Math.Linear(this.basketSquish, 1, 0.15);
    this.prevBasketX = this.basketX;

    // ── Simulate ─────────────────────────────────────────────────────────
    this.updateItems(time);
    this.updateParticles();
    this.comboDisplay.update(time);

    // ── Render ───────────────────────────────────────────────────────────
    this.drawBgStars();
    this.drawNearMissIndicator();
    this.drawParticles();
    this.drawShieldGlow();
    this.drawBasket();
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  private initBgStars(): void {
    const { width, height } = this.cameras.main;
    this.bgStars = [];
    for (let i = 0; i < 120; i++) {
      this.bgStars.push({
        x:  Math.random() * width,
        y:  Math.random() * height,
        r:  Math.random() * 1.5 + 0.3,
        a:  Math.random(),
        da: (Math.random() * 0.01 + 0.003) * (Math.random() < 0.5 ? 1 : -1),
      });
    }
  }

  private createHUD(): void {
    const { width } = this.cameras.main;

    this.scoreText = this.add
      .text(16, 12, 'Score: 0', { font: '18px Arial', color: '#ffffff' })
      .setDepth(DEPTH.UI_HUD);

    this.livesText = this.add
      .text(width / 2, 12, '❤️❤️❤️', { font: '20px Arial' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.UI_HUD);

    this.bestText = this.add
      .text(width - 16, 12, 'Best: ' + storageService.getBestScore(),
            { font: '18px Arial', color: '#ffffff' })
      .setOrigin(1, 0)
      .setDepth(DEPTH.UI_HUD);

    this.comboDisplay = new ComboDisplay(this);
  }

  private setupInput(): void {
    const clamp = (x: number) =>
      Phaser.Math.Clamp(x,
        BASKET_CONFIG.width / 2 + 4,
        this.cameras.main.width - BASKET_CONFIG.width / 2 - 4);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.basketX = clamp(p.x); });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.basketX = clamp(p.x); });
  }

  // ─── Spawn ─────────────────────────────────────────────────────────────────

  private spawnItem(): void {
    const { width } = this.cameras.main;
    const rand      = Math.random();
    let   type: ItemType;

    // Phase-gated item introduction:
    //   Phase 0 DAWN:    Star, GoldenStar only
    //   Phase 1 RISING:  + Bomb, Magnet, ExtraLife
    //   Phase 2 STORM:   + Meteor, Shield, TimeFreeze
    //   Phase 3 TEMPEST: + Decoy, Diamond, Multiplier
    //   Phase 4 CHAOS:   everything at higher rates

    const bombChance     = this.currentPhase.bombChance;
    const powerupChance  = this.phaseIndex >= 1 ? 0.055 : 0;
    const meteorChance   = this.phaseIndex >= 2 ? 0.032 : 0;
    const diamondChance  = this.phaseIndex >= 3 ? 0.008 : 0;
    const decoyChance    = this.phaseIndex >= 3 ? 0.025 : 0;
    const goldenChance   = 0.06;

    let cursor = 0;

    if (rand < (cursor += bombChance)) {
      type = ItemType.BOMB;
    } else if (rand < (cursor += diamondChance)) {
      type = ItemType.DIAMOND;
    } else if (rand < (cursor += decoyChance)) {
      type = ItemType.DECOY;
    } else if (rand < (cursor += powerupChance)) {
      type = this.getRandomPowerup();
    } else if (rand < (cursor += meteorChance)) {
      type = ItemType.METEOR;
    } else if (rand < (cursor += goldenChance)) {
      type = ItemType.GOLDEN_STAR;
    } else {
      type = ItemType.STAR;
    }

    const def        = ITEM_DEFINITIONS[type];
    const x          = Math.random() * (width - 60) + 30;
    // Meteors fall 1.6× faster for a challenge
    const speedScale = type === ItemType.METEOR ? 1.6 : 1.0;
    const speed      = this.fallSpeed * (0.85 + Math.random() * 0.35) * speedScale;
    const rotSpd     = (Math.random() - 0.5) * 3;

    const textObj = this.add.text(x, -30, def.emoji, {
      font: `${def.size}px serif`,
    }).setOrigin(0.5).setDepth(DEPTH.GAME_OBJECTS);

    this.items.push({
      textObj,
      type,
      speed,
      rotationSpeed: rotSpd,
      color:  parseInt(def.color.replace('#', ''), 16),
      points: def.points,
    });
  }

  /** Returns a random powerup appropriate for the current phase. */
  private getRandomPowerup(): ItemType {
    const pool: ItemType[] = [ItemType.MAGNET, ItemType.EXTRA_LIFE];
    if (this.phaseIndex >= 2) pool.push(ItemType.SHIELD, ItemType.TIME_FREEZE);
    if (this.phaseIndex >= 3) pool.push(ItemType.MULTIPLIER);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  private updateItems(time: number): void {
    const { height }  = this.cameras.main;
    const bx          = this.basketX;
    const by          = this.basketY;
    const hw          = BASKET_CONFIG.width / 2;
    const hh          = BASKET_CONFIG.height;

    // Time Freeze: items move at 18% speed
    const speedMult = this.powerupSystem.isActive(PowerupType.TIME_FREEZE) ? 0.18 : 1.0;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.textObj.y     += item.speed * speedMult;
      item.textObj.angle += item.rotationSpeed;

      const ix = item.textObj.x;
      const iy = item.textObj.y;
      const sz = item.textObj.height / 2;

      // Catch check
      if (
        iy + sz > by - hh &&
        iy - sz < by + hh &&
        ix > bx - hw - 10 &&
        ix < bx + hw + 10
      ) {
        this.catchItem(item, time);
        item.textObj.destroy();
        this.items.splice(i, 1);
        continue;
      }

      // Missed — only non-bombs cost a life when missed
      if (iy > height + 40) {
        if (
          item.type !== ItemType.BOMB  &&
          item.type !== ItemType.DECOY &&
          item.type !== ItemType.MAGNET &&
          item.type !== ItemType.TIME_FREEZE &&
          item.type !== ItemType.SHIELD &&
          item.type !== ItemType.MULTIPLIER &&
          item.type !== ItemType.EXTRA_LIFE
        ) {
          this.loseLife(ix, height);
        }
        item.textObj.destroy();
        this.items.splice(i, 1);
      }
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.15;
      p.alpha -= 0.035;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const sp = this.scorePopups[i];
      sp.textObj.y     -= 1.8;
      sp.textObj.alpha -= 0.025;
      if (sp.textObj.alpha <= 0) {
        sp.textObj.destroy();
        this.scorePopups.splice(i, 1);
      }
    }
  }

  // ─── Draw ──────────────────────────────────────────────────────────────────

  private drawBgStars(): void {
    this.bgGfx.clear();
    for (const s of this.bgStars) {
      s.a += s.da;
      if (s.a > 1 || s.a < 0) s.da *= -1;
      this.bgGfx.fillStyle(0xffffff, s.a * 0.8);
      this.bgGfx.fillCircle(s.x, s.y, s.r);
    }
  }

  private drawNearMissIndicator(): void {
    this.nearMissGfx.clear();
    const { height } = this.cameras.main;
    const threshold  = height * 0.15;

    for (const item of this.items) {
      if (item.type === ItemType.BOMB || item.type === ItemType.DECOY) continue;
      const distFromBottom = height - item.textObj.y;
      if (distFromBottom < threshold) {
        const alpha  = 1 - distFromBottom / threshold;
        const pulseA = alpha * (0.5 + 0.5 * Math.sin(this.elapsed * 0.015));

        const ax = item.textObj.x;
        const ay = this.basketY - BASKET_CONFIG.height / 2 - 14;

        this.nearMissGfx.lineStyle(2, 0xffd93d, pulseA);
        this.nearMissGfx.beginPath();
        this.nearMissGfx.moveTo(ax,     ay);
        this.nearMissGfx.lineTo(ax - 7, ay + 10);
        this.nearMissGfx.moveTo(ax,     ay);
        this.nearMissGfx.lineTo(ax + 7, ay + 10);
        this.nearMissGfx.strokePath();

        this.nearMissGfx.fillStyle(0xffd93d, pulseA * 0.4);
        this.nearMissGfx.fillCircle(item.textObj.x, item.textObj.y, 18);
      }
    }
  }

  private drawParticles(): void {
    this.particleGfx.clear();
    for (const p of this.particles) {
      this.particleGfx.fillStyle(p.color, p.alpha);
      this.particleGfx.fillCircle(p.x, p.y, p.radius);
    }
  }

  /** Pulsing cyan ring drawn around the basket when shield is active. */
  private drawShieldGlow(): void {
    this.shieldGfx.clear();
    if (!this.shielded) return;

    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 0.008);
    const bw    = BASKET_CONFIG.width;
    const bh    = BASKET_CONFIG.height;

    this.shieldGfx.setPosition(this.basketX, this.basketY);
    this.shieldGfx.setAngle(this.basketTilt);
    this.shieldGfx.setScale(1, this.basketSquish);

    this.shieldGfx.lineStyle(3, 0x55efc4, 0.4 + pulse * 0.6);
    this.shieldGfx.strokeRoundedRect(
      -bw / 2 - 14, -bh / 2 - 8,
       bw    + 28,   bh    + 16,
      8,
    );
  }

  private drawBasket(): void {
    const bw = BASKET_CONFIG.width;
    const bh = BASKET_CONFIG.height;

    this.basketGfx.setPosition(this.basketX, this.basketY);
    this.basketGfx.setAngle(this.basketTilt);
    this.basketGfx.setScale(1, this.basketSquish);
    this.basketGfx.clear();

    // Glow halo — turns gold at high combos
    const comboRatio = Math.min(this.combo / 10, 1);
    const glowAlpha  = 0.25 + comboRatio * 0.35;
    const glowColor  = this.combo >= 5 ? 0xffd93d : 0x6c63ff;
    this.basketGfx.fillStyle(glowColor, glowAlpha);
    this.basketGfx.fillRoundedRect(-bw / 2 - 8, -bh / 2 - 5, bw + 16, bh + 10, 6);

    // Body (trapezoid)
    this.basketGfx.fillStyle(0x8a84ff, 1);
    this.basketGfx.fillPoints([
      { x: -bw / 2,     y: -bh / 2 },
      { x:  bw / 2,     y: -bh / 2 },
      { x:  bw / 2 - 6, y:  bh / 2 },
      { x: -bw / 2 + 6, y:  bh / 2 },
    ], true, true);

    // Rim
    this.basketGfx.lineStyle(3, 0xffffff, 1);
    this.basketGfx.beginPath();
    this.basketGfx.moveTo(-bw / 2 - 4, -bh / 2);
    this.basketGfx.lineTo( bw / 2 + 4, -bh / 2);
    this.basketGfx.strokePath();
  }

  // ─── Game Logic ────────────────────────────────────────────────────────────

  private catchItem(item: FallingItem, timeMs: number): void {

    // ── Bomb ─────────────────────────────────────────────────────────────
    if (item.type === ItemType.BOMB) {
      if (this.shielded) {
        // Shield absorbs the blast
        this.shielded = false;
        this.powerupSystem.deactivate(PowerupType.SHIELD);
        this.spawnParticles(item.textObj.x, item.textObj.y, 0x55efc4, 14);
        this.spawnScorePopup(item.textObj.x, item.textObj.y, '🛡️ BLOCKED!');
        audioService.powerupCollect();
      } else {
        this.loseLife(item.textObj.x, item.textObj.y);
        this.spawnParticles(item.textObj.x, item.textObj.y, 0xff6b6b, 12);
        audioService.bombExplode();
        hapticSystem.lifeLost();
      }
      return;
    }

    // ── Decoy (looks like ⭐ but punishes) ───────────────────────────────
    if (item.type === ItemType.DECOY) {
      this.combo = 0;
      this.comboDisplay.onBreak();
      this.loseLife(item.textObj.x, item.textObj.y);
      this.spawnParticles(item.textObj.x, item.textObj.y, 0xff6b6b, 8);
      this.spawnScorePopup(item.textObj.x, item.textObj.y, '💀 DECOY!');
      audioService.bombExplode();
      hapticSystem.lifeLost();
      return;
    }

    // ── Powerup pickups ───────────────────────────────────────────────────
    switch (item.type) {
      case ItemType.MAGNET:
        this.powerupSystem.activate(PowerupType.MAGNET);
        this.spawnScorePopup(item.textObj.x, item.textObj.y, '🧲 MAGNET!');
        this.spawnParticles(item.textObj.x, item.textObj.y, 0xa29bfe, 12);
        audioService.powerupCollect();
        hapticSystem.powerupCollect();
        return;

      case ItemType.TIME_FREEZE:
        this.powerupSystem.activate(PowerupType.TIME_FREEZE);
        this.spawnScorePopup(item.textObj.x, item.textObj.y, '❄️ FREEZE!');
        this.spawnParticles(item.textObj.x, item.textObj.y, 0x74b9ff, 12);
        audioService.powerupCollect();
        hapticSystem.powerupCollect();
        return;

      case ItemType.SHIELD:
        this.shielded = true;
        this.powerupSystem.activate(PowerupType.SHIELD);
        this.spawnScorePopup(item.textObj.x, item.textObj.y, '🛡️ SHIELD!');
        this.spawnParticles(item.textObj.x, item.textObj.y, 0x55efc4, 12);
        audioService.powerupCollect();
        hapticSystem.powerupCollect();
        return;

      case ItemType.MULTIPLIER:
        this.powerupSystem.activate(PowerupType.MULTIPLIER);
        this.spawnScorePopup(item.textObj.x, item.textObj.y, '⚡ 2× SCORE!');
        this.spawnParticles(item.textObj.x, item.textObj.y, 0xfdcb6e, 12);
        audioService.powerupCollect();
        hapticSystem.powerupCollect();
        return;

      case ItemType.EXTRA_LIFE:
        this.lives = Math.min(this.lives + 1, 5);
        this.updateLivesDisplay();
        this.spawnScorePopup(item.textObj.x, item.textObj.y, '❤️ +1 LIFE!');
        this.spawnParticles(item.textObj.x, item.textObj.y, 0xff7675, 14);
        audioService.powerupCollect();
        hapticSystem.powerupCollect();
        return;

      default:
        break;
    }

    // ── Scoring items (Star, Golden Star, Meteor, Diamond) ────────────────
    this.itemsCaught++;

    const isChain = timeMs - this.lastComboMs < GAME_BALANCE.comboTimeWindow;
    this.combo    = isChain ? this.combo + 1 : 1;
    this.lastComboMs = timeMs;
    this.comboDisplay.onCatch(this.combo, timeMs);

    const comboMult = this.combo >= GAME_BALANCE.comboMultiplierMin ? this.combo : 1;
    const scoreMult = this.powerupSystem.isActive(PowerupType.MULTIPLIER) ? 2 : 1;
    const points    = item.points * comboMult * scoreMult;
    this.score     += points;

    this.spawnParticles(item.textObj.x, item.textObj.y, item.color, 10);
    const popupLabel = scoreMult > 1 ? `+${points} ⚡` : `+${points}`;
    this.spawnScorePopup(item.textObj.x, item.textObj.y, popupLabel);
    this.scoreText.setText('Score: ' + this.score);

    this.basketSquish = GAME_BALANCE.basketCatchSquishScale;

    if (this.combo >= GAME_BALANCE.comboMultiplierMin) {
      this.showComboFlash(this.combo);
      audioService.comboMilestone(this.combo);
      hapticSystem.comboMilestone();
    } else {
      if (item.type === ItemType.GOLDEN_STAR) {
        audioService.catchGolden();
        hapticSystem.catchGolden();
      } else {
        audioService.catchStar(this.combo);
        hapticSystem.catchStar();
      }
    }

    // Score milestones
    while (
      this.nextMilestoneIdx < SCORE_MILESTONES.length &&
      this.score >= SCORE_MILESTONES[this.nextMilestoneIdx]
    ) {
      this.celebrateMilestone(SCORE_MILESTONES[this.nextMilestoneIdx]);
      this.nextMilestoneIdx++;
    }
  }

  private loseLife(x: number, y: number): void {
    if (this.invincible || this.gameOver) return;

    this.lives--;
    this.combo = 0;
    this.comboDisplay.onBreak();
    this.spawnParticles(x, y, 0xff6b6b, 16);
    this.updateLivesDisplay();

    // Red flash
    this.flashRect.setAlpha(0.4);
    this.tweens.add({
      targets: this.flashRect, alpha: 0,
      duration: 300, ease: 'Linear',
    });

    this.cameras.main.shake(GAME_BALANCE.screenshakeDuration, 0.008);

    if (this.lives > 0) {
      this.invincible = true;
      const blink = this.time.addEvent({
        delay: 80, loop: true,
        callback: () => {
          this.basketGfx.setAlpha(this.basketGfx.alpha > 0.5 ? 0.2 : 1);
        },
      });
      this.time.delayedCall(GAME_BALANCE.invincibilityDuration, () => {
        blink.remove();
        this.basketGfx.setAlpha(1);
        this.invincible = false;
      });

      audioService.lifeLost();
      hapticSystem.lifeLost();
    }

    if (this.lives <= 0) {
      this.time.delayedCall(350, () => this.endGame());
    }
  }

  /** Sync livesText with this.lives (handles up to 5 hearts). */
  private updateLivesDisplay(): void {
    if (this.lives === 0) {
      this.livesText.setText('💀');
      return;
    }
    const filled = '❤️'.repeat(Math.max(0, this.lives));
    const empty  = '🖤'.repeat(Math.max(0, 3 - Math.min(this.lives, 3)));
    this.livesText.setText(filled + empty);
  }

  /** Called when a timed powerup timer runs out. */
  private onPowerupExpired(type: PowerupType): void {
    if (type === PowerupType.SHIELD) this.shielded = false;
    // Future: show "expired" flash for each type
  }

  // ─── Visual Feedback ───────────────────────────────────────────────────────

  private showComboFlash(n: number): void {
    const { width, height } = this.cameras.main;
    const colours: Record<number, string> = {
      3: '#74b9ff', 4: '#55efc4', 5: '#fdcb6e', 6: '#ff7675',
    };
    const col = n >= 7 ? '#ffd93d' : (colours[n] ?? '#74b9ff');

    const text = this.add.text(
      width / 2, height * 0.28,
      `🔥 x${n} COMBO!`,
      {
        font: 'bold 38px Arial',
        color: col,
        stroke: '#000000',
        strokeThickness: 4,
      },
    ).setOrigin(0.5).setDepth(DEPTH.POPUP);

    this.tweens.add({
      targets: text,
      alpha: 0, y: height * 0.21,
      duration: 900, ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private celebrateMilestone(pts: number): void {
    const { width, height } = this.cameras.main;

    const banner = this.add.text(
      width / 2, height * 0.5,
      `🎉 ${pts} POINTS! 🎉`,
      {
        font: 'bold 32px Arial',
        color: '#ffd93d',
        stroke: '#000000',
        strokeThickness: 4,
      },
    ).setOrigin(0.5).setDepth(DEPTH.POPUP).setAlpha(0);

    this.tweens.add({
      targets: banner, alpha: 1,
      duration: 200, ease: 'Cubic.easeOut',
      yoyo: true, hold: 800,
      onComplete: () => banner.destroy(),
    });

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const spd   = 4 + Math.random() * 4;
      this.particles.push({
        x: width / 2, y: height * 0.5,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 3,
        alpha: 1, color: 0xffd93d,
        radius: Math.random() * 5 + 3,
      });
    }
  }

  private onPhaseTransition(phase: DifficultyPhaseConfig): void {
    const { width, height } = this.cameras.main;
    const name = getPhaseDisplayName(phase.phase);

    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(DEPTH.POPUP - 1);

    const banner = this.add.text(
      width / 2, height / 2, name,
      {
        font: 'bold 44px Arial',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      },
    ).setOrigin(0.5).setAlpha(0).setDepth(DEPTH.POPUP);

    this.tweens.add({
      targets: overlay, alpha: 0.55,
      duration: 250, ease: 'Linear',
      yoyo: true, hold: 900,
      onComplete: () => overlay.destroy(),
    });

    this.tweens.add({
      targets: banner, alpha: 1,
      duration: 250, ease: 'Cubic.easeOut',
      yoyo: true, hold: 900,
      onComplete: () => banner.destroy(),
    });

    audioService.phaseChange();
    audioService.setMusicIntensity(this.phaseIndex);
    hapticSystem.phaseChange();
  }

  // ─── Particles & Popups ────────────────────────────────────────────────────

  private spawnParticles(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = Math.random() * 4 + 1.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 2,
        alpha: 1, color,
        radius: Math.random() * 4 + 2,
      });
    }
  }

  private spawnScorePopup(x: number, y: number, text: string): void {
    const textObj = this.add.text(x, y, text, {
      font: 'bold 22px Arial',
      color: '#ffd93d',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(DEPTH.POPUP);

    this.scorePopups.push({ textObj });
  }

  // ─── Now Playing toast ────────────────────────────────────────────────────

  private showNowPlayingToast(): void {
    const info = backgroundMusicService.getCurrentRagaInfo();
    if (!info) return;

    const { width, height } = this.cameras.main;

    const bg = this.add
      .rectangle(width / 2, height * 0.94, 300, 36, 0x000000, 0.55)
      .setDepth(DEPTH.POPUP);

    const label = this.add.text(
      width / 2, height * 0.94,
      `♪  ${info.tamilName}  ·  ${info.name}`,
      { font: '13px Arial', color: '#e0d5c0' },
    ).setOrigin(0.5).setDepth(DEPTH.POPUP);

    const targets = [bg, label];
    this.tweens.add({
      targets, alpha: { from: 0, to: 1 },
      duration: 600, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets, alpha: 0,
          delay: 3000, duration: 800, ease: 'Cubic.easeIn',
          onComplete: () => { bg.destroy(); label.destroy(); },
        });
      },
    });
  }

  // ─── End Game ──────────────────────────────────────────────────────────────

  private endGame(): void {
    this.gameOver = true;

    const isNewBest = this.score > storageService.getBestScore();
    storageService.setBestScore(this.score);

    audioService.gameOver();
    hapticSystem.gameOver();
    backgroundMusicService.stop();

    if (isNewBest && this.score > 0) {
      audioService.newBest();
      hapticSystem.newBest();
    }

    // Clean up
    for (const item of this.items)       item.textObj.destroy();
    for (const sp   of this.scorePopups) sp.textObj.destroy();
    this.comboDisplay.destroy();
    this.powerupHUD.destroy();
    this.powerupSystem.clear();
    this.items       = [];
    this.scorePopups = [];

    const data: GameOverData = {
      score:        this.score,
      survivalTime: this.elapsed,
      itemsCaught:  this.itemsCaught,
    };

    this.scene.start(SCENE_KEYS.GAME_OVER, data);
  }
}
