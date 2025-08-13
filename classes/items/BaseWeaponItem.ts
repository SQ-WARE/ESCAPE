import BaseItem, { type ItemOverrides } from "./BaseItem";
import type { Vector3Like, QuaternionLike } from 'hytopia';
import { DamageSystem } from '../systems/DamageSystem';

export type BaseWeaponItemAttack = {
  id?: string;
  animations: string[];
  cooldownMs: number;
  damage: number;
  damageDelayMs: number;
  damageVariance?: number;
  knockbackForce?: number;
  reach: number;
  fireRate?: number;
  ammo?: number;
  maxAmmo?: number;
  reloadTimeMs?: number;
}

export type WeaponOverrides = {
  attack?: BaseWeaponItemAttack;
  specialAttack?: BaseWeaponItemAttack;
} & ItemOverrides;

export default abstract class BaseWeaponItem extends BaseItem {
  static readonly attack: BaseWeaponItemAttack;
  static readonly specialAttack?: BaseWeaponItemAttack = undefined;

  static override create(overrides?: WeaponOverrides): BaseWeaponItem {
    const ItemClass = this as any;
    return new ItemClass(overrides);
  }

  static isWeaponItem(item: BaseItem | typeof BaseItem): item is BaseWeaponItem {
    if (typeof item === 'function') {
      return BaseWeaponItem.prototype.isPrototypeOf(item.prototype);
    }
    return item instanceof BaseWeaponItem;
  }

  public get attack(): BaseWeaponItemAttack { 
    return this._attack ?? (this.constructor as typeof BaseWeaponItem).attack; 
  }
  public get specialAttack(): BaseWeaponItemAttack { 
    return this._specialAttack ?? (this.constructor as typeof BaseWeaponItem).specialAttack ?? this.attack; 
  }

  private readonly _attack?: BaseWeaponItemAttack;
  private readonly _specialAttack?: BaseWeaponItemAttack;
  private _attackCooledDownAtMs: number = 0;
  private _specialAttackCooledDownAtMs: number = 0;

  public constructor(overrides?: WeaponOverrides) {
    super(overrides);
    this._attack = overrides?.attack;
    this._specialAttack = overrides?.specialAttack;
  }

  public get canAttack(): boolean { return performance.now() >= this._attackCooledDownAtMs; }
  public get canSpecialAttack(): boolean { return performance.now() >= this._specialAttackCooledDownAtMs; }

  public override clone(overrides?: WeaponOverrides): BaseWeaponItem {
    const WeaponClass = this.constructor as any;
    return new WeaponClass({
      quantity: this.quantity,
      attack: this._attack,
      specialAttack: this._specialAttack,
      ...overrides,
    });
  }

  public override useMouseLeft(): void {
    this.performAttack();
  }

  public override useMouseRight(): void {
    this.performSpecialAttack();
  }

  public performAttack(): void {
    if (!this.entity?.parent || !this.canAttack) {
      return;
    }
    if (this.isGun()) {
      this.performGunAttack();
    } else {
      this.entity.parent.startModelOneshotAnimations(this.attack.animations);
      this.updateAttackCooldown(this.attack.cooldownMs);
      setTimeout(() => this.processAttackDamageTargets(this.attack), this.attack.damageDelayMs);
    }
  }

  public performSpecialAttack(): void {
    if (!this.entity?.parent || !this.canSpecialAttack) {
      return;
    }
    this.entity.parent.startModelOneshotAnimations(this.specialAttack.animations);
    this.updateAttackCooldown(this.specialAttack.damageDelayMs);
    this.updateSpecialAttackCooldown(this.specialAttack.cooldownMs);
    setTimeout(() => this.processAttackDamageTargets(this.specialAttack), this.specialAttack.damageDelayMs);
  }

  protected isGun(): boolean {
    return this.attack.fireRate !== undefined;
  }

  protected performGunAttack(): void {
    this.updateAttackCooldown(this.attack.cooldownMs);
  }

  protected calculateDamageWithVariance(baseDamage: number, variance?: number): number {
    const damageSystem = DamageSystem.instance;
    return damageSystem.calculateDamageWithVariance(baseDamage, variance);
  }

  protected processAttackDamageTargets(attack: BaseWeaponItemAttack): void {
    // This will be implemented by specific weapon types
  }

  protected updateAttackCooldown(attackCooldownMs: number): void {
    this._attackCooledDownAtMs = performance.now() + attackCooldownMs;
  }

  protected updateSpecialAttackCooldown(specialAttackCooldownMs: number): void {
    this._specialAttackCooledDownAtMs = performance.now() + specialAttackCooldownMs;
  }
} 