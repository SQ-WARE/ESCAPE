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
      console.warn('Failed to create shot visual effects:', error);
    }
  }

  public applyWeaponRecoil(parent: GamePlayerEntity): void {
    if (!parent || !parent.world) return;
    
    try {
      const recoilForce = this._calculateRecoilForce();
      const { direction } = this._shootingSystem?.getShootOriginDirection(parent) || { direction: { x: 0, y: 0, z: 1 } };
      
      const impulse = {
        x: -direction.x * recoilForce,
        y: 0,
        z: -direction.z * recoilForce,
      };
      
      parent.applyImpulse(impulse);
      
      const weaponRecoil = this._weaponData.stats.recoil;
      parent.recoilSystem.applyRecoil(weaponRecoil, true);
      

    } catch (error) {
      console.warn('Failed to apply weapon recoil:', error);
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
    // Enhanced recoil calculation for more noticeable knockback
    const recoilStat = this._weaponData.stats.recoil;
    const damage = this._weaponData.stats.damage;
    
    // Base force from recoil stat (0-100 scale)
    const baseForce = (recoilStat / 100) * 8.0; // Scale 0-100 to 0-8
    
    // Damage multiplier for heavier weapons
    const damageMultiplier = 1.0 + (damage - 20) * 0.02; // +2% per damage point above 20
    
    let categoryMultiplier = 1.0;
    switch (this._weaponData.category) {
      case 'pistol':
        categoryMultiplier = 0.8; // Reduced for pistols
        break;
      case 'smg':
        categoryMultiplier = 0.9; // Slightly reduced for SMGs
        break;
      case 'rifle':
        categoryMultiplier = 1.2; // Enhanced for rifles
        break;
      case 'shotgun':
        categoryMultiplier = 1.5; // Strong knockback for shotguns
        break;
      case 'lmg':
        categoryMultiplier = 1.3; // Heavy LMG knockback
        break;
      case 'sniper':
        categoryMultiplier = 2.0; // Maximum knockback for snipers
        break;
      default:
        categoryMultiplier = 1.0;
    }
    
    const finalForce = baseForce * damageMultiplier * categoryMultiplier;
    
    // Clamp to reasonable range with higher minimum for noticeable effect
    return Math.max(1.0, Math.min(12.0, finalForce));
  }

  // Removed suppression/environment helpers used only for lights

  public cleanup(): void {
    // No-op: lights removed
  }
} 