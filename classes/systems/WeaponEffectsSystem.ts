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
        modelScale: 0.35,
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
      // Apply physical recoil (impulse)
      const recoilForce = this._calculateRecoilForce();
      const { direction } = this._getShootOriginDirection(parent);
      const impulse = {
        x: -direction.x * recoilForce,
        y: 0,
        z: -direction.z * recoilForce,
      };
      
      parent.applyImpulse(impulse);
      
      // Apply crosshair recoil
      const weaponRecoil = this._weaponData.stats.recoil;
      parent.recoilSystem.applyRecoil(weaponRecoil, true);
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



  // No light cleanup needed



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
    const f = parent.player.camera.facingDirection;
    // Normalize forward projected onto XZ plane
    const fLen = Math.hypot(f.x, f.z) || 1;
    const forward = { x: f.x / fLen, y: 0, z: f.z / fLen };
    const right = { x: forward.z, y: 0, z: -forward.x };
    const up = { x: 0, y: 1, z: 0 };

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
    // Compute right vector from camera facing; project to XZ plane
    const f = parent.player.camera.facingDirection;
    const len = Math.hypot(f.x, f.z) || 1;
    const right = { x: f.z / len, y: 0, z: -f.x / len };
    return {
      x: pos.x + right.x * amount,
      y: pos.y + right.y * amount,
      z: pos.z + right.z * amount,
    };
  }



  private _calculateRecoilForce(): number {
    const baseForce = this._weaponData.stats.damage * 0.067;
    
    let categoryMultiplier = 1.0;
    switch (this._weaponData.category) {
      case 'pistol':
        categoryMultiplier = 0.77;
        break;
      case 'smg':
        categoryMultiplier = 0.77;
        break;
      case 'rifle':
        categoryMultiplier = 1.33;
        break;
      case 'sniper':
        categoryMultiplier = 1.8;
        break;
      default:
        categoryMultiplier = 1.0;
    }
    
    const finalForce = baseForce * categoryMultiplier;
    return Math.max(0.67, Math.min(5.3, finalForce));
  }

  // Removed suppression/environment helpers used only for lights

  public cleanup(): void {
    // No-op: lights removed
  }
} 