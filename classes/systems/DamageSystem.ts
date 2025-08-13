import { type Vector3Like, type World } from 'hytopia';
import GamePlayerEntity from '../GamePlayerEntity';

export interface DamageResult {
  damageDealt: number;
  targetKilled: boolean;
  targetHealth: number;
  targetMaxHealth: number;
}

export class DamageSystem {
  private static _instance: DamageSystem | undefined;

  public static get instance(): DamageSystem {
    if (!this._instance) {
      this._instance = new DamageSystem();
    }
    return this._instance;
  }

  private constructor() {}

  public applyDamage(
    target: GamePlayerEntity, 
    damage: number, 
    direction?: Vector3Like,
    source?: GamePlayerEntity
  ): DamageResult {
    if (!target.canTakeDamage()) {
      return {
        damageDealt: 0,
        targetKilled: false,
        targetHealth: target.health,
        targetMaxHealth: target.maxHealth
      };
    }

    if (source && target === source) {
      return {
        damageDealt: 0,
        targetKilled: false,
        targetHealth: target.health,
        targetMaxHealth: target.maxHealth
      };
    }

    const previousHealth = target.health;
    // Track last source to attribute kills/xp
    if (source) {
      try { target.lastDamageSource = source; } catch {}
    }
    target.takeDamage(damage, direction);
    const damageDealt = previousHealth - target.health;
    const targetKilled = target.health <= 0;

    return {
      damageDealt,
      targetKilled,
      targetHealth: target.health,
      targetMaxHealth: target.maxHealth
    };
  }

  public calculateDamageWithVariance(baseDamage: number, variance: number = 0.1): number {
    const min = Math.floor(baseDamage * (1 - variance));
    const max = Math.floor(baseDamage * (1 + variance));
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  public canDamageEntity(entity: any): boolean {
    return entity instanceof GamePlayerEntity && entity.canTakeDamage();
  }

  public getHitLocationMultiplier(hitLocation: 'head' | 'body' | 'limbs'): number {
    switch (hitLocation) {
      case 'head':
        return 2.0;
      case 'body':
        return 1.0;
      case 'limbs':
        return 0.7;
      default:
        return 1.0;
    }
  }
} 