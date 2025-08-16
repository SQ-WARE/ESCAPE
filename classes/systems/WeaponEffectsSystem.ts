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

  private _impactSpark?: ImpactSparkEntity;
  private readonly _muzzleColor: { r: number; g: number; b: number };
  private readonly _muzzleBaseIntensity: number;

  constructor(weaponData: WeaponData, weaponEntity: any) {
    this._weaponData = weaponData;
    this._weaponEntity = weaponEntity;

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
      const origin = this._computeMuzzleWorldPosition(parent);
      const { direction } = this._getShootOriginDirection(parent);

      // Perform a long-distance raycast purely for visuals so the tracer travels until it actually hits something
      const tracerMaxDistance = 4096;
      const rc = parent.world?.simulation.raycast(origin, direction, tracerMaxDistance, { filterExcludeRigidBody: parent.rawRigidBody });
      const hitFound = !!rc?.hitPoint;
      const endPoint = (rc?.hitPoint as any) ?? {
        x: origin.x + direction.x * tracerMaxDistance,
        y: origin.y + direction.y * tracerMaxDistance,
        z: origin.z + direction.z * tracerMaxDistance,
      };

      const tracer = new BulletTracerEntity(origin, direction, {
        modelUri: 'models/projectiles/bullet.glb',
        modelScale: 1,
        speed: 360,
        endPoint,
      });
      tracer.spawn(parent.world, origin);

      // Spawn or refresh an impact spark at the exact endpoint (slightly offset along normal dir)
      if (hitFound) {
        const sparkPos = {
          x: endPoint.x - direction.x * 0.02,
          y: endPoint.y - direction.y * 0.02,
          z: endPoint.z - direction.z * 0.02,
        };
        try {
          if (!this._impactSpark || !this._impactSpark.isSpawned) {
            this._impactSpark = new ImpactSparkEntity({
              color: this._muzzleColor,
              intensity: Math.max(1.5, Math.min(6, Math.round(this._muzzleBaseIntensity * 0.25))),
              lifetimeMs: 120,
            });
            this._impactSpark.spawn(parent.world, sparkPos);
          } else {
            this._impactSpark.refresh(
              sparkPos,
              this._muzzleColor,
              Math.max(1.5, Math.min(6, Math.round(this._muzzleBaseIntensity * 0.25))),
              120
            );
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
      const { direction } = this._getShootOriginDirection(parent);
      
      const impulse = {
        x: -direction.x * recoilForce,
        y: 0,
        z: -direction.z * recoilForce,
      };
      
      parent.applyImpulse(impulse);
      
      const weaponRecoil = this._weaponData.stats.recoil;
      parent.recoilSystem.applyRecoil(weaponRecoil, true);
      
      console.log(`🔫 Weapon: ${this._weaponData.name}, Recoil: ${weaponRecoil}, Force: ${recoilForce.toFixed(2)}, Impulse:`, impulse);
    } catch (error) {
      console.warn('Failed to apply weapon recoil:', error);
    }
  }

  private _getShootOriginDirection(parent: GamePlayerEntity): { origin: Vector3Like, direction: Vector3Like } {
    if (!parent) {
      return { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } };
    }

    const { x, y, z } = parent.position;
    const cameraYOffset = parent.player.camera.offset.y;
    const direction = parent.player.camera.facingDirection;
    
    return {
      origin: { x, y: y + cameraYOffset, z },
      direction
    };
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

  private _computeMuzzleWorldPosition(parent: GamePlayerEntity): Vector3Like {
    const { position: local } = this._weaponEntity.getMuzzleFlashPositionRotation();
    const base = {
      x: parent.position.x,
      y: parent.position.y + (parent.player.camera.offset?.y ?? 0),
      z: parent.position.z,
    };
    
    // Use actual camera direction vectors for proper vertical alignment
    const f = parent.player.camera.facingDirection;
    const fLen = Math.hypot(f.x, f.y, f.z) || 1;
    const forward = { x: f.x / fLen, y: f.y / fLen, z: f.z / fLen };
    
    // Handle edge case when looking straight up or down
    const upThreshold = 0.99; // Threshold for "straight up/down"
    const absY = Math.abs(forward.y);
    
    let right: Vector3Like;
    let up: Vector3Like;
    
    if (absY > upThreshold) {
      // Looking nearly straight up or down - use a fallback coordinate system
      if (forward.y > 0) {
        // Looking up - use world forward as right, world right as up
        right = { x: 0, y: 0, z: 1 };
        up = { x: 1, y: 0, z: 0 };
      } else {
        // Looking down - use world forward as right, world left as up
        right = { x: 0, y: 0, z: 1 };
        up = { x: -1, y: 0, z: 0 };
      }
    } else {
      // Normal case - calculate coordinate system
      const worldUp = { x: 0, y: 1, z: 0 };
      right = {
        x: forward.y * worldUp.z - forward.z * worldUp.y,
        y: forward.z * worldUp.x - forward.x * worldUp.z,
        z: forward.x * worldUp.y - forward.y * worldUp.x
      };
      
      // Normalize right vector
      const rightLen = Math.hypot(right.x, right.y, right.z) || 1;
      right.x /= rightLen;
      right.y /= rightLen;
      right.z /= rightLen;
      
      // Calculate up vector as cross product of right and forward
      up = {
        x: right.y * forward.z - right.z * forward.y,
        y: right.z * forward.x - right.x * forward.z,
        z: right.x * forward.y - right.y * forward.x
      };
    }

    // Transform local -> world (weapon local axes aligned to camera basis)
    let world = {
      x: base.x + right.x * local.x + up.x * local.y + forward.x * local.z,
      y: base.y + right.y * local.x + up.y * local.y + forward.y * local.z,
      z: base.z + right.z * local.x + up.z * local.y + forward.z * local.z,
    };

    // Small rightward nudge for visual alignment with typical right-hand weapons
    world = this._offsetRight(parent, world, 0.12);
    return world;
  }

  // Removed light occlusion/raycast helpers and jitter

  private _offsetRight(parent: GamePlayerEntity, pos: Vector3Like, amount: number): Vector3Like {
    // Compute right vector from camera facing; use proper 3D direction
    const f = parent.player.camera.facingDirection;
    const len = Math.hypot(f.x, f.y, f.z) || 1;
    const forward = { x: f.x / len, y: f.y / len, z: f.z / len };
    
    // Handle edge case when looking straight up or down
    const upThreshold = 0.99;
    const absY = Math.abs(forward.y);
    
    let right: Vector3Like;
    
    if (absY > upThreshold) {
      // Looking nearly straight up or down - use fallback right vector
      right = { x: 0, y: 0, z: 1 };
    } else {
      // Normal case - calculate right vector
      const worldUp = { x: 0, y: 1, z: 0 };
      right = {
        x: forward.y * worldUp.z - forward.z * worldUp.y,
        y: forward.z * worldUp.x - forward.x * worldUp.z,
        z: forward.x * worldUp.y - forward.y * worldUp.x
      };
      
      // Normalize right vector
      const rightLen = Math.hypot(right.x, right.y, right.z) || 1;
      right.x /= rightLen;
      right.y /= rightLen;
      right.z /= rightLen;
    }
    
    return {
      x: pos.x + right.x * amount,
      y: pos.y + right.y * amount,
      z: pos.z + right.z * amount,
    };
  }



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