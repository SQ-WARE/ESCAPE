import {
  Entity,
  type Vector3Like,
} from 'hytopia';

import type { WeaponData } from '../weapons/data/WeaponData';
import GamePlayerEntity from '../GamePlayerEntity';
import { DamageSystem } from './DamageSystem';
import WeaponUISystem from './WeaponUISystem';

export default class WeaponShootingSystem {
  private readonly _weaponData: WeaponData;
  private readonly _damage: number;
  private readonly _range: number;
  private readonly _fireRate: number;
  private _lastFireTime: number = 0;
  private _uiSystem: WeaponUISystem;
  private _shotsFired: number = 0;
  private _hitsLanded: number = 0;

  constructor(weaponData: WeaponData, uiSystem: WeaponUISystem) {
    this._weaponData = weaponData;
    this._damage = weaponData.stats.damage;
    this._range = weaponData.stats.range;
    this._fireRate = weaponData.stats.fireRate;
    this._uiSystem = uiSystem;
  }

  public canShoot(): boolean {
    const now = performance.now();
    const cooldown = 60000 / this._fireRate;
    return !this._lastFireTime || (now - this._lastFireTime) >= cooldown;
  }

  public shoot(parent: GamePlayerEntity): boolean {
    if (!parent || !parent.world) {
      return false;
    }

    const now = performance.now();
    const cooldown = 60000 / this._fireRate;

    if (this._lastFireTime && now - this._lastFireTime < cooldown) {
      return false;
    }

    this._lastFireTime = now;
    this._shotsFired++;
    this._performRaycast(parent);
    return true;
  }

  // Public getters for weapon stats
  public get damage(): number {
    return this._damage;
  }

  public get range(): number {
    return this._range;
  }

  public get fireRate(): number {
    return this._fireRate;
  }

  public get lastFireTime(): number {
    return this._lastFireTime;
  }

  public getShootOriginDirection(parent: GamePlayerEntity): { origin: Vector3Like, direction: Vector3Like } {
    if (!parent) {
      return { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } };
    }

    const { x, y, z } = parent.position;
    const cameraYOffset = parent.player.camera.offset.y;
    const direction = parent.player.camera.facingDirection;
    
    // Apply spread to the direction based on current recoil
    const spreadDirection = this._applySpreadToDirection(direction, parent);
    
    return {
      origin: { x, y: y + cameraYOffset, z },
      direction: spreadDirection
    };
  }

  private _performRaycast(parent: GamePlayerEntity): void {
    if (!parent.world) return;
    
    const { origin, direction } = this.getShootOriginDirection(parent);
    
    const raycastHit = parent.world.simulation.raycast(origin, direction, this._range, {
      filterExcludeRigidBody: parent.rawRigidBody,
    });

    if (raycastHit?.hitEntity) {
      this._handleHitEntity(raycastHit.hitEntity, direction, parent);
    } else if (raycastHit) {
      this._handleEnvironmentHit(raycastHit.hitPoint, direction, parent);
    }
  }

  private _handleHitEntity(hitEntity: Entity, hitDirection: Vector3Like, parent: GamePlayerEntity): void {
    if (hitEntity instanceof GamePlayerEntity) {
      this._hitsLanded++;
      this._updateAccuracyStats(parent);
      
      const damageResult = DamageSystem.instance.applyDamage(
        hitEntity,
        this._damage,
        hitDirection,
        parent
      );
      
      this._uiSystem.playHitmarker(parent, damageResult.damageDealt > 0, damageResult.targetKilled);
      
      // Track weapon kill and headshot if target was killed
      if (damageResult.targetKilled) {
        try {
          const currentWeapon = parent.gamePlayer.getCurrentWeapon();
          const weaponCategory = currentWeapon?.weaponData.category || 'unknown';
          
          // Simple headshot detection based on hit direction (if shooting upward, likely headshot)
          const isHeadshot = hitDirection.y > 0.3; // Rough approximation
          
          // Update player stats with weapon category and headshot info
          const PlayerStatsSystem = require('./PlayerStatsSystem').default;
          PlayerStatsSystem.addKill(parent.player, weaponCategory, isHeadshot);
        } catch {}
      }
    }
  }

  private _handleEnvironmentHit(hitPoint: Vector3Like, hitDirection: Vector3Like, parent: GamePlayerEntity): void {
    this._uiSystem.playEnvironmentHitSound(parent);
  }







  private _applySpreadToDirection(baseDirection: Vector3Like, parent: GamePlayerEntity): Vector3Like {
    try {
      const currentRecoil = parent.recoilSystem.getCurrentRecoil();
      const maxRecoil = parent.recoilSystem.getMaxRecoil();
      const spreadRatio = currentRecoil / maxRecoil;
      const maxSpreadAngle = this._getMaxSpreadAngle();
      
      // Apply movement-based accuracy modifiers
      const accuracyModifier = parent.weaponSystem?.getWeaponAccuracyModifier(parent.gamePlayer.getCurrentWeapon()) || 1.0;
      const spreadModifier = 1.0 / accuracyModifier; // Inverse of accuracy
      
      // Calculate final spread angle with modifiers
      const currentSpreadAngle = maxSpreadAngle * spreadRatio * spreadModifier;
      
      const spreadRadians = (currentSpreadAngle * Math.PI) / 180;
      const randomAngle = Math.random() * 2 * Math.PI;
      const randomDistance = Math.random() * spreadRadians;
      
      const spreadX = Math.cos(randomAngle) * randomDistance;
      const spreadY = Math.sin(randomAngle) * randomDistance;
      
      const length = Math.sqrt(baseDirection.x * baseDirection.x + baseDirection.y * baseDirection.y + baseDirection.z * baseDirection.z);
      if (length === 0) return baseDirection;
      
      const normalizedDir = {
        x: baseDirection.x / length,
        y: baseDirection.y / length,
        z: baseDirection.z / length
      };
      
      let perp1, perp2;
      if (Math.abs(normalizedDir.y) > 0.99) {
        perp1 = { x: 1, y: 0, z: 0 };
        perp2 = { x: 0, y: 0, z: 1 };
      } else {
        perp1 = { x: 0, y: 1, z: 0 };
        perp2 = { x: -normalizedDir.z, y: 0, z: normalizedDir.x };
        const perp2Length = Math.sqrt(perp2.x * perp2.x + perp2.y * perp2.y + perp2.z * perp2.z);
        if (perp2Length > 0) {
          perp2.x /= perp2Length;
          perp2.y /= perp2Length;
          perp2.z /= perp2Length;
        }
      }
      
      const spreadVector = {
        x: perp1.x * spreadX + perp2.x * spreadY,
        y: perp1.y * spreadX + perp2.y * spreadY,
        z: perp1.z * spreadX + perp2.z * spreadY
      };
      
      const finalDirection = {
        x: normalizedDir.x + spreadVector.x,
        y: normalizedDir.y + spreadVector.y,
        z: normalizedDir.z + spreadVector.z
      };
      
      const finalLength = Math.sqrt(
        finalDirection.x * finalDirection.x + 
        finalDirection.y * finalDirection.y + 
        finalDirection.z * finalDirection.z
      );
      
      if (finalLength === 0) return baseDirection;
      
      return {
        x: finalDirection.x / finalLength,
        y: finalDirection.y / finalLength,
        z: finalDirection.z / finalLength
      };
      
    } catch (error) {
      console.warn('Failed to apply spread to direction:', error);
      return baseDirection;
    }
  }

  private _updateAccuracyStats(parent: GamePlayerEntity): void {
    try {
      const accuracy = this._shotsFired > 0 ? Math.floor((this._hitsLanded / this._shotsFired) * 100) : 0;
      const data = (parent.player.getPersistedData?.() as any) || {};
      
      parent.player.setPersistedData({
        ...data,
        accuracy: accuracy
      });
      
      // Check accuracy achievements
      try {
        const AchievementSystem = require('./AchievementSystem').default;
        AchievementSystem.checkAccuracyAchievements(parent.player, accuracy);
      } catch {}
    } catch {}
  }

  private _getMaxSpreadAngle(): number {
    switch (this._weaponData.category) {
      case 'pistol': return 2.0;
      case 'smg': return 3.5;
      case 'rifle': return 2.5;
      case 'shotgun': return 8.0;
      case 'lmg': return 4.0;
      case 'sniper': return 1.0;
      default: return 2.5;
    }
  }
} 