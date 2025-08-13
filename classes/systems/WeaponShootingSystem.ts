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
    this._performRaycast(parent);
    return true;
  }

  public getShootOriginDirection(parent: GamePlayerEntity): { origin: Vector3Like, direction: Vector3Like } {
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
      const damageResult = DamageSystem.instance.applyDamage(
        hitEntity,
        this._damage,
        hitDirection,
        parent
      );
      
      this._uiSystem.playHitmarker(parent, damageResult.damageDealt > 0, damageResult.targetKilled);
    }
  }

  private _handleEnvironmentHit(hitPoint: Vector3Like, hitDirection: Vector3Like, parent: GamePlayerEntity): void {
    this._uiSystem.playEnvironmentHitSound(parent);
  }

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
} 