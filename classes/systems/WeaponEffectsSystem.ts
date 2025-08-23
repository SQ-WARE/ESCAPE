import {
  type Vector3Like,
} from 'hytopia';

import type { WeaponData } from '../weapons/data/WeaponData';
import GamePlayerEntity from '../GamePlayerEntity';
import BulletTracerEntity from '../vfx/BulletTracerEntity';
import ImpactSparkEntity from '../vfx/ImpactSparkEntity';

export default class WeaponEffectsSystem {
  private readonly _weaponData: WeaponData;
  private readonly _weaponEntity: any;
  private _shootingSystem?: any;

  private _impactSpark?: ImpactSparkEntity;
  private readonly _muzzleColor: { r: number; g: number; b: number };
  private readonly _muzzleBaseIntensity: number;

  constructor(weaponData: WeaponData, weaponEntity: any, shootingSystem?: any) {
    this._weaponData = weaponData;
    this._weaponEntity = weaponEntity;
    this._shootingSystem = shootingSystem;

    // Cache muzzle color/intensity (constant per weapon)
    this._muzzleColor = this._getMuzzleFlashColor();
    this._muzzleBaseIntensity = this._getMuzzleFlashIntensity();
  }

  public createMuzzleFlash(parent: GamePlayerEntity): void {
    // Intentionally no-op: muzzle flash disabled
    return;
  }

  public createShotLight(parent: GamePlayerEntity): void {
    if (!parent || !parent.world || !this._weaponEntity) return;

    try {
      // Use the same origin and direction as the shooting system for accurate impact detection
      const { origin, direction } = this._shootingSystem?.getShootOriginDirection(parent) || { 
        origin: { x: 0, y: 0, z: 0 }, 
        direction: { x: 0, y: 0, z: 1 } 
      };

      // Perform raycast for bullet tracer and impact detection
      const maxDistance = 1000;
      const rc = parent.world?.simulation.raycast(origin, direction, maxDistance, { filterExcludeRigidBody: parent.rawRigidBody });
      
      // Determine end point for bullet tracer
      const endPoint = rc?.hitPoint || {
        x: origin.x + direction.x * maxDistance,
        y: origin.y + direction.y * maxDistance,
        z: origin.z + direction.z * maxDistance,
      };

      // Create bullet tracer
      const tracer = new BulletTracerEntity(origin, direction, {
        modelUri: 'models/projectiles/bullet.glb',
        modelScale: 1,
        speed: 360,
        endPoint,
      });
      tracer.spawn(parent.world, origin);
      
      // Create impact spark if we hit something
      if (rc?.hitPoint) {
        const sparkPos = {
          x: rc.hitPoint.x - direction.x * 0.02,
          y: rc.hitPoint.y - direction.y * 0.02,
          z: rc.hitPoint.z - direction.z * 0.02,
        };
        
        try {
          if (!this._impactSpark || !this._impactSpark.isSpawned) {
            this._impactSpark = new ImpactSparkEntity({
              color: this._muzzleColor,
              intensity: 3,
              lifetimeMs: 120,
            });
            this._impactSpark.spawn(parent.world, sparkPos);
          } else {
            this._impactSpark.refresh(sparkPos, this._muzzleColor, 3, 120);
          }
        } catch {}
      }
    } catch (error) {
      // Failed to create shot visual effects
    }
  }

  public applyWeaponRecoil(parent: GamePlayerEntity): void {
    if (!parent || !parent.world) return;
    
    try {
      // Apply recoil system with enhanced movement-based modifiers
      const weaponRecoil = this._weaponData.stats.recoil;
      let recoilModifier = parent.weaponSystem?.getWeaponRecoilModifier(parent.gamePlayer.getCurrentWeapon()) || 1.0;
      
      // Additional recoil reduction for running scenarios
      const isRunning = parent.movementSystem?.isSprinting() || false;
      
      if (isRunning) {
        // Moderate recoil reduction when running
        recoilModifier *= 0.8; // Additional 20% reduction
      }
      
      const modifiedRecoil = weaponRecoil * recoilModifier;
      
      parent.recoilSystem.applyRecoil(modifiedRecoil, true);
      
      // Apply subtle camera bounce
      this._applySubtleCameraBounce(parent);
      
      // Apply knockback to player
      this._applyKnockback(parent);

    } catch (error) {
      // Failed to apply weapon recoil
    }
  }

  private _applySubtleCameraBounce(parent: GamePlayerEntity): void {
    try {
      // Calculate subtle bounce based on weapon stats
      const stats = this._weaponData.stats;
      const recoil = stats.recoil ?? 50;
      const damage = stats.damage ?? 20;
      
      // Very subtle bounce calculation
      let bounceAmount = 0.02 + (recoil * 0.0001) + (damage * 0.00005);
      
      // Reduce bounce based on movement state
      const isRunning = parent.movementSystem?.isSprinting() || false;
      
      if (isRunning) {
        // Further reduce bounce when running
        bounceAmount *= 0.6; // Additional 40% reduction when running
      }
      
      // Apply immediate upward camera bounce
      const currentOffset = parent.player.camera.offset;
      const newOffset = {
        x: currentOffset.x,
        y: currentOffset.y + bounceAmount,
        z: currentOffset.z
      };
      
      parent.player.camera.setOffset(newOffset);
      
      // Reset after a very short delay
      setTimeout(() => {
        try {
          parent.player.camera.setOffset(currentOffset);
        } catch (error) {
          // Failed to reset camera bounce
        }
      }, 50); // 50ms bounce recovery
      
    } catch (error) {
      // Failed to apply camera bounce
    }
  }

  private _applyKnockback(parent: GamePlayerEntity): void {
    try {
      // Calculate knockback force
      let knockbackForce = this._calculateRecoilForce();
      
      // Reduce knockback based on movement state
      const isRunning = parent.movementSystem?.isSprinting() || false;
      
      if (isRunning) {
        // Further reduce knockback when running
        knockbackForce *= 0.7; // Additional 30% reduction when running
      }
      
      // Get player's facing direction for knockback direction
      const direction = parent.player.camera.facingDirection;
      
      // Apply backward knockback (opposite to facing direction)
      const impulse = {
        x: -direction.x * knockbackForce,
        y: 0, // No vertical knockback
        z: -direction.z * knockbackForce
      };
      
      // Apply the impulse to the player
      parent.applyImpulse(impulse);
      
    } catch (error) {
      // Failed to apply knockback
    }
  }

  private _getMuzzleFlashColor(): { r: number, g: number, b: number } {
    switch (this._weaponData.category) {
      case 'pistol':
        return { r: 255, g: 205, b: 120 };
      case 'smg':
        return { r: 255, g: 190, b: 95 };
      case 'rifle':
        return { r: 255, g: 170, b: 70 };
      case 'shotgun':
        return { r: 255, g: 165, b: 60 };
      case 'lmg':
        return { r: 255, g: 175, b: 75 };
      case 'sniper':
        return { r: 255, g: 150, b: 55 };
      default:
        return { r: 255, g: 200, b: 100 };
    }
  }

  private _getMuzzleFlashIntensity(): number {
    const stats = this._weaponData.stats;
    const damage = stats.damage ?? 20;
    const penetration = stats.penetration ?? 50;
    const recoil = stats.recoil ?? 50;
    const fireRate = stats.fireRate ?? 600; // RPM

    // Base energy proxy from weapon power (reduced to avoid over-bright)
    const base = 5 + damage * 0.15 + penetration * 0.08 + recoil * 0.05;

    // Category multipliers
    let cat = 1.0;
    switch (this._weaponData.category) {
      case 'pistol':
        cat = 0.75; break;
      case 'smg':
        cat = 0.9; break;
      case 'rifle':
        cat = 1.2; break;
      case 'shotgun':
        cat = 1.6; break;
      case 'lmg':
        cat = 1.5; break;
      case 'sniper':
        cat = 1.8; break;
      default:
        cat = 1.0;
    }

    // Fire rate factor: very fast rate slightly reduces per-shot flash, slower boosts
    let rate = 1.0;
    if (fireRate >= 800) rate = 0.9;
    else if (fireRate <= 400) rate = 1.1;

    const intensity = base * cat * rate;
    // Clamp to a lower range to reduce GPU load
    return Math.max(8, Math.min(24, Math.round(intensity)));
  }

  // Removed muzzle flash lifetime helper

  // Removed shot light helpers



  // Removed light occlusion/raycast helpers and jitter





  private _calculateRecoilForce(): number {
    // Subtle knockback calculation
    const recoilStat = this._weaponData.stats.recoil;
    const damage = this._weaponData.stats.damage;
    
    // Base force from recoil stat (0-100 scale) - reduced for subtlety
    const baseForce = (recoilStat / 100) * 3.0; // Scale 0-100 to 0-3 (reduced from 8.0)
    
    // Damage multiplier for heavier weapons
    const damageMultiplier = 1.0 + (damage - 20) * 0.01; // +1% per damage point above 20 (reduced from 2%)
    
    let categoryMultiplier = 1.0;
    switch (this._weaponData.category) {
      case 'pistol':
        categoryMultiplier = 0.6; // Reduced for pistols
        break;
      case 'smg':
        categoryMultiplier = 0.7; // Slightly reduced for SMGs
        break;
      case 'rifle':
        categoryMultiplier = 1.0; // Standard for rifles
        break;
      case 'shotgun':
        categoryMultiplier = 1.3; // Moderate knockback for shotguns
        break;
      case 'lmg':
        categoryMultiplier = 1.1; // Slight LMG knockback
        break;
      case 'sniper':
        categoryMultiplier = 1.5; // Moderate knockback for snipers
        break;
      default:
        categoryMultiplier = 1.0;
    }
    
    const finalForce = baseForce * damageMultiplier * categoryMultiplier;
    
    // Clamp to subtle range
    return Math.max(0.5, Math.min(6.0, finalForce));
  }





  // Removed suppression/environment helpers used only for lights

  public cleanup(): void {
    // No-op: lights removed
  }
} 