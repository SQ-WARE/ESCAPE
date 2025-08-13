import {
  Light,
  LightType,
  type Vector3Like,
} from 'hytopia';

import type { WeaponData } from '../weapons/data/WeaponData';
import GamePlayerEntity from '../GamePlayerEntity';

export default class WeaponEffectsSystem {
  private readonly _weaponData: WeaponData;
  private readonly _range: number;
  private readonly _weaponEntity: any;

  private _muzzleFlashLight?: Light;
  private _muzzleFlashTimeout?: NodeJS.Timeout;
  private _shotSpotLight?: Light;
  private _shotSpotTimeout?: NodeJS.Timeout;
  private _shotSpotFadeTimeout?: NodeJS.Timeout;
  private _lastShotLightTimeMs = 0;
  private _shotLightThrottleMs: number;
  private readonly _muzzleColor: { r: number; g: number; b: number };
  private readonly _muzzleBaseIntensity: number;
  private readonly _idleLightPos: Vector3Like = { x: 0, y: -4096, z: 0 };

  constructor(weaponData: WeaponData, weaponEntity: any) {
    this._weaponData = weaponData;
    this._range = weaponData.stats.range;
    this._weaponEntity = weaponEntity;

    const fireRate = weaponData.stats.fireRate || 600; // RPM
    // Throttle creation of expensive spot lights based on weapon RoF
    const estimatedIntervalMs = Math.max(40, Math.min(200, Math.round(60000 / fireRate)));
    this._shotLightThrottleMs = Math.max(100, Math.min(160, estimatedIntervalMs));

    // Cache muzzle color/intensity (constant per weapon)
    this._muzzleColor = this._getMuzzleFlashColor();
    this._muzzleBaseIntensity = this._getMuzzleFlashIntensity();
  }

  public createMuzzleFlash(parent: GamePlayerEntity): void {
    if (!parent || !parent.world || !this._weaponEntity) return;

    try {
      const worldPosition = this._computeMuzzleWorldPosition(parent);
      // Compute a tiny "bounce" position (toward shooter and slightly up) to fake light bounce
      const f = parent.player.camera.facingDirection;
      const fLen = Math.hypot(f.x, f.y, f.z) || 1;
      const nF = { x: f.x / fLen, y: f.y / fLen, z: f.z / fLen };
      const bouncePosition = {
        x: worldPosition.x - nF.x * 0.18,
        y: worldPosition.y + 0.06,
        z: worldPosition.z - nF.z * 0.18,
      };

      // Reuse a single point light for muzzle flash to reduce light churn
      if (!this._muzzleFlashLight) {
        this._muzzleFlashLight = new Light({
          position: this._idleLightPos,
          color: this._muzzleColor,
          intensity: 0,
        });
        this._muzzleFlashLight.spawn(parent.world);
      } else {
        try { this._muzzleFlashLight.setPosition(worldPosition); } catch {}
      }

      // Brighter initial pop with reduced ceiling, then quick fake-bounce and falloff
      const envScale = this._getEnvironmentIntensityScale(parent);
      const suppressedScale = this._isSuppressedWeapon() ? 0.55 : 1.0;
      const peak = Math.max(3, Math.min(10, this._muzzleBaseIntensity * (0.85 + this._jitter(0.10))) ) * envScale * suppressedScale;
      try {
        this._muzzleFlashLight.setPosition(worldPosition);
        this._muzzleFlashLight.setIntensity(peak);
      } catch {}

      // Brief bounce flash near the shooter to simulate indirect light
      setTimeout(() => {
        try {
          this._muzzleFlashLight?.setPosition(bouncePosition);
          const bounce = Math.max(1, Math.min(5, Math.round(peak * 0.35)));
          this._muzzleFlashLight?.setIntensity(bounce);
        } catch {}
      }, 8);

      // Return to muzzle position with a low tail intensity for a couple of milliseconds
      setTimeout(() => {
        try {
          this._muzzleFlashLight?.setPosition(worldPosition);
          this._muzzleFlashLight?.setIntensity(Math.max(1, Math.min(4, Math.round(peak * 0.25))));
        } catch {}
      }, 16);

      if (this._muzzleFlashTimeout) { clearTimeout(this._muzzleFlashTimeout); }
      const lifetime = Math.max(8, Math.round(this._getMuzzleFlashLifetimeMs() * (this._isSuppressedWeapon() ? 0.7 : 1)));
      this._muzzleFlashTimeout = setTimeout(() => {
        try { this._muzzleFlashLight?.setIntensity(0); } catch {}
        try { this._muzzleFlashLight?.setPosition(this._idleLightPos); } catch {}
      }, lifetime);
    } catch (error) {
      console.warn('Failed to create muzzle flash effect:', error);
    }
  }

  public createShotLight(parent: GamePlayerEntity): void {
    if (!parent || !parent.world || !this._weaponEntity) return;

    try {
      const now = Date.now();
      if (now - this._lastShotLightTimeMs < this._shotLightThrottleMs) {
        return; // throttle to prevent lag on high fire rate weapons
      }
      this._lastShotLightTimeMs = now;
      // Reuse existing spotlight when possible; otherwise create once
      if (!this._shotSpotLight) {
        this._shotSpotLight = new Light({
          type: LightType.SPOTLIGHT,
          position: this._idleLightPos,
          trackedPosition: this._idleLightPos,
          angle: this._getShotLightAngle(),
          penumbra: 0.55,
          color: this._muzzleColor,
          intensity: 1,
        });
        this._shotSpotLight.spawn(parent.world);
      } else {
        // Cancel pending fades/cleanup to extend light for the new shot
        if (this._shotSpotTimeout) { clearTimeout(this._shotSpotTimeout); this._shotSpotTimeout = undefined; }
        if (this._shotSpotFadeTimeout) { clearTimeout(this._shotSpotFadeTimeout); this._shotSpotFadeTimeout = undefined; }
      }

      const origin = this._computeMuzzleWorldPosition(parent);

      const { direction } = this._getShootOriginDirection(parent);
      const maxDistance = this._getShotLightDistance();
      // Clamp to a reasonable range to avoid harsh far hotspots; suppressed weapons shorten further
      const distanceClamp = this._isSuppressedWeapon() ? 0.55 : 0.8;
      const useDistance = Math.max(6, Math.round(maxDistance * distanceClamp));
      const target = {
        x: origin.x + direction.x * useDistance,
        y: origin.y + direction.y * useDistance,
        z: origin.z + direction.z * useDistance,
      };

      const suppressedScale = this._isSuppressedWeapon() ? 0.6 : 1.0;
      const envScale = this._getEnvironmentIntensityScale(parent);
      const angle = Math.max(0.05, this._getShotLightAngle() * (1 + this._jitter(0.05)));
      const intensity = Math.max(3, Math.min(12, Math.round(this._muzzleBaseIntensity * (0.6 + this._jitter(0.05)) * envScale * suppressedScale)));

      // No wall checks or occlusion probing; let light project naturally
      this._shotSpotLight.setPosition(origin);
      this._shotSpotLight.setTrackedPosition(target);
      this._shotSpotLight.setAngle(angle);

      // Slight soften of hotspot by briefly offsetting tracked target a hair to the side
      this._shotSpotLight.setIntensity(intensity);
      setTimeout(() => {
        try {
          const side = { x: -direction.z * 0.15, y: 0, z: direction.x * 0.15 };
          this._shotSpotLight?.setTrackedPosition({ x: target.x + side.x, y: target.y + side.y, z: target.z + side.z });
        } catch {}
      }, 6);

      // Optional micro bounce for shot light: briefly widen cone and reduce intensity, then restore
      setTimeout(() => {
        try {
          this._shotSpotLight?.setAngle(Math.max(0.05, angle * 1.08));
          this._shotSpotLight?.setIntensity(Math.max(3, Math.round(intensity * 0.7)));
        } catch {}
      }, 10);
      setTimeout(() => {
        try {
          this._shotSpotLight?.setAngle(angle);
          this._shotSpotLight?.setIntensity(Math.max(2, Math.round(intensity * 0.5)));
        } catch {}
      }, 22);

      // Schedule a single fade to 0 near the end; engine interpolates values
      const lifetime = Math.max(12, Math.round(this._getShotLightLifetimeMs() * (this._isSuppressedWeapon() ? 0.75 : 1)));
      this._shotSpotFadeTimeout = setTimeout(() => {
        try { this._shotSpotLight?.setIntensity(0); } catch {}
      }, Math.max(1, lifetime - 30));
      this._shotSpotTimeout = setTimeout(() => {
        try { this._shotSpotLight?.setIntensity(0); } catch {}
        try { this._shotSpotLight?.setPosition(this._idleLightPos); } catch {}
        try { this._shotSpotLight?.setTrackedPosition(this._idleLightPos); } catch {}
      }, lifetime);
    } catch (error) {
      console.warn('Failed to create shot light:', error);
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



  private _cleanupMuzzleFlash(): void {
    try {
      if (this._muzzleFlashLight) {
        this._muzzleFlashLight.despawn();
        this._muzzleFlashLight = undefined;
      }
      if (this._muzzleFlashTimeout) {
        clearTimeout(this._muzzleFlashTimeout);
        this._muzzleFlashTimeout = undefined;
      }
    } catch (error) {
      console.warn('Failed to cleanup muzzle flash:', error);
    }
  }

  private _cleanupShotLight(): void {
    try {
      if (this._shotSpotLight) {
        this._shotSpotLight.despawn();
        this._shotSpotLight = undefined;
      }
      if (this._shotSpotTimeout) {
        clearTimeout(this._shotSpotTimeout);
        this._shotSpotTimeout = undefined;
      }
    } catch (error) {
      console.warn('Failed to cleanup shot light:', error);
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

  private _getMuzzleFlashLifetimeMs(): number {
    switch (this._weaponData.category) {
      case 'pistol': return 26;
      case 'smg': return 30;
      case 'rifle': return 42;
      case 'shotgun': return 48;
      case 'lmg': return 42;
      case 'sniper': return 58;
      default: return 40;
    }
  }

  private _getShotLightLifetimeMs(): number {
    // Brief corridor illumination; heavier weapons keep it on slightly longer
    switch (this._weaponData.category) {
      case 'pistol': return 38;
      case 'smg': return 42;
      case 'rifle': return 60;
      case 'shotgun': return 68;
      case 'lmg': return 60;
      case 'sniper': return 85;
      default: return 60;
    }
  }

  private _getShotLightAngle(): number {
    // Narrower beams for rifles/snipers, wider for shotguns/SMGs
    const degToRad = (d: number) => (d * Math.PI) / 180;
    switch (this._weaponData.category) {
      case 'pistol': return degToRad(14);
      case 'smg': return degToRad(16);
      case 'rifle': return degToRad(10);
      case 'shotgun': return degToRad(20);
      case 'lmg': return degToRad(12);
      case 'sniper': return degToRad(8);
      default: return degToRad(14);
    }
  }

  private _getShotLightDistance(): number {
    // Approximate useful corridor illumination distance
    const base = Math.max(15, Math.min(60, this._range * 0.25));
    switch (this._weaponData.category) {
      case 'pistol': return base;
      case 'smg': return base + 5;
      case 'rifle': return base + 15;
      case 'shotgun': return base - 5;
      case 'lmg': return base + 10;
      case 'sniper': return base + 25;
      default: return base;
    }
  }

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

  // Removed occlusion/raycast helpers per design: lights should project without surface checks

  private _normalize(v: Vector3Like): Vector3Like {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private _jitter(scale: number): number {
    return (Math.random() * 2 - 1) * scale; // -scale..+scale
  }

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

  private _isSuppressedWeapon(): boolean {
    try {
      const id = (this._weaponData?.id || '').toLowerCase();
      return id.includes('mp5sd') || id.includes('sd') || id.includes('suppress') || id.includes('silenc');
    } catch { return false; }
  }

  private _getEnvironmentIntensityScale(parent: GamePlayerEntity): number {
    try {
      const sun = (parent.world as any).directionalLightPosition as { x: number; y: number; z: number } | undefined;
      if (!sun) return 0.9; // default slightly reduced for outdoors
      // Very simple heuristic: if camera y is much lower than sun height and we are likely under cover, boost a bit
      const camY = parent.position.y + (parent.player.camera.offset?.y ?? 0);
      const shadeBoost = camY < (sun.y * 0.2) ? 1.1 : 1.0;
      return Math.max(0.6, Math.min(1.1, shadeBoost));
    } catch { return 1.0; }
  }

  public cleanup(): void {
    this._cleanupMuzzleFlash();
  }
} 