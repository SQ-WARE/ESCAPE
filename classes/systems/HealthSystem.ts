import type GamePlayerEntity from '../GamePlayerEntity';
import { DeathSystem } from './DeathSystem';

const BASE_HEALTH = 100;
const HEAL_TICK_RATE_MS = 1000;
const HEAL_AMOUNT_PER_TICK = 1;
const HEALING_BONUS_DURATION_MS = 10000; // 10 seconds of enhanced healing
const HEALING_BONUS_MULTIPLIER = 3; // 3x faster healing during bonus period

export default class HealthSystem {
  private _player: GamePlayerEntity;
  private _healInterval: NodeJS.Timeout | undefined;
  private _isDead: boolean = false;
  private _healingBonusEndTime: number = 0;
  private _isHealingBonusActive: boolean = false;
  private _lastHealthSync: number = 0;
  private _healthSyncInterval: number = 5000; // Sync every 5 seconds

  constructor(player: GamePlayerEntity) {
    this._player = player;
  }

  public initialize(): void {
    this._player.health = BASE_HEALTH;
    this._player.maxHealth = BASE_HEALTH;
    this._isDead = false;
    this._healingBonusEndTime = 0;
    this._isHealingBonusActive = false;
    this._startAutoHealTicker();
    this._updatePlayerUIHealth();
  }

  public takeDamage(damage: number): void {
    if (!this.canTakeDamage()) return;

    this._player.health = Math.max(0, this._player.health - damage);
    this._updatePlayerUIHealth();

    if (this._player.health <= 0) {
      this._die();
    }
  }

  public heal(amount: number): void {
    if (this._isDead) return;
    
    this._player.health = Math.min(this._player.maxHealth, this._player.health + amount);
    this._updatePlayerUIHealth();
  }

  public validateAndCorrectHealth(): void {
    // Ensure health is within valid bounds
    const correctedHealth = Math.max(0, Math.min(this._player.maxHealth, this._player.health));
    
    if (correctedHealth !== this._player.health) {
      this._player.health = correctedHealth;
      this._updatePlayerUIHealth();
    }
    
    // Periodic health sync to ensure client and server stay in sync
    const now = performance.now();
    if (now - this._lastHealthSync > this._healthSyncInterval) {
      this._updatePlayerUIHealth();
      this._lastHealthSync = now;
    }
  }

  public forceUISync(): void {
    this._updatePlayerUIHealth();
  }

  public activateHealingBonus(): void {
    this._healingBonusEndTime = performance.now() + HEALING_BONUS_DURATION_MS;
    this._isHealingBonusActive = true;
    
    // Send UI notification about healing bonus
    this._player.player.ui.sendData({
      type: 'healing-bonus-activated',
      duration: HEALING_BONUS_DURATION_MS,
      multiplier: HEALING_BONUS_MULTIPLIER
    });
    
  }

  public pauseAutoHealing(): void {
    if (this._healInterval) {
      clearInterval(this._healInterval);
      this._healInterval = undefined;
    }
  }

  public resumeAutoHealing(): void {
    if (!this._healInterval && !this._isDead) {
      this._startAutoHealTicker();
    }
  }

  public setHealth(health: number): void {
    this._player.health = Math.max(0, Math.min(this._player.maxHealth, health));
    this._updatePlayerUIHealth();
  }

  public setMaxHealth(maxHealth: number): void {
    this._player.maxHealth = maxHealth;
    if (this._player.health > maxHealth) {
      this._player.health = maxHealth;
    }
    this._updatePlayerUIHealth();
  }

  public canTakeDamage(): boolean {
    return this._player.isSpawned && !!this._player.world && !this._isDead;
  }

  public get isDead(): boolean {
    return this._isDead;
  }

  public get health(): number {
    return this._player.health;
  }

  public get maxHealth(): number {
    return this._player.maxHealth;
  }

  public get healthPercentage(): number {
    return (this._player.health / this._player.maxHealth) * 100;
  }

  public get isHealingBonusActive(): boolean {
    return this._isHealingBonusActive && performance.now() < this._healingBonusEndTime;
  }

  public get healingBonusTimeRemaining(): number {
    if (!this.isHealingBonusActive) return 0;
    return Math.max(0, this._healingBonusEndTime - performance.now());
  }

  public get isCurrentlyHealing(): boolean {
    return this._player.medkitSystem.isUsingMedkit;
  }

  private _die(): void {
    if (this._isDead) return;
    
    this._isDead = true;
    this._stopAutoHealTicker();
    
    // Handle player death
    try {
      DeathSystem.instance.handlePlayerDeath(this._player, this._player.lastDamageSource);
    } catch (error) {
      console.error('Failed to handle player death:', error);
      // Fallback: just return to menu if DeathSystem fails
      this._player.gamePlayer.loadMenu();
    }
  }

  private _updatePlayerUIHealth(): void {
    this._player.player.ui.sendData({
      type: 'health',
      health: this._player.health,
      maxHealth: this._player.maxHealth,
      healingBonusActive: this.isHealingBonusActive,
      healingBonusTimeRemaining: this.healingBonusTimeRemaining
    });
  }

  private _startAutoHealTicker(): void {
    this._healInterval = setInterval(() => {
      // Don't auto-heal if player is currently using a medkit
      if (this.isCurrentlyHealing) {
        return;
      }
      
      if (this._player.health < this._player.maxHealth && !this._isDead) {
        let healAmount = HEAL_AMOUNT_PER_TICK;
        
        // Apply healing bonus if active
        if (this.isHealingBonusActive) {
          healAmount *= HEALING_BONUS_MULTIPLIER;
          
          // Check if bonus period ended
          if (performance.now() >= this._healingBonusEndTime) {
            this._isHealingBonusActive = false;
            this._player.player.ui.sendData({
              type: 'healing-bonus-ended'
            });
        
          }
        }
        
        this.heal(healAmount);
      }
    }, HEAL_TICK_RATE_MS);
  }

  private _stopAutoHealTicker(): void {
    if (this._healInterval) {
      clearInterval(this._healInterval);
      this._healInterval = undefined;
    }
  }

  public cleanup(): void {
    this._stopAutoHealTicker();
  }
} 