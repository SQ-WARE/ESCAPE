import type { WeaponData } from '../data/WeaponData';
import type { BaseWeaponItemAttack } from '../../items/BaseWeaponItem';
import BaseWeaponItem from '../../items/BaseWeaponItem';
import { WeaponRegistry } from '../data/WeaponRegistry';
import type { ItemRarity } from '../../items/BaseItem';

export interface WeaponItemOverrides {
  ammo?: number;
  quantity?: number;
}

export default class WeaponItem extends BaseWeaponItem {
  private readonly _weaponData: WeaponData;
  private _persistedAmmo?: number;

  constructor(weaponData: WeaponData, overrides?: WeaponItemOverrides) {
    super({
      quantity: overrides?.quantity ?? 1,
    });

    this._weaponData = weaponData;
    this._persistedAmmo = overrides?.ammo;
  }

  // Static factory method
  static create(weaponId: string, overrides?: WeaponItemOverrides): WeaponItem {
    const weaponData = WeaponRegistry.get(weaponId);
    
    if (!weaponData) {
      throw new Error(`Weapon with id '${weaponId}' not found`);
    }
    
    return new WeaponItem(weaponData, overrides);
  }

  // Required static properties (delegated to weapon data)
  static readonly id: string = 'weapon_item';
  static readonly name: string = 'Weapon';
  static readonly iconImageUri: string = 'icons/pistol.png';
  static readonly description: string = 'A weapon item';
  static readonly dropModelScale: number = 0.5;
  static readonly dropModelTintColor: any = undefined;
  static readonly heldModelScale: number = 0.5;
  static readonly heldModelTintColor: any = undefined;
  static readonly defaultRelativePositionAsChild: any = { x: -0.025, y: 0, z: -0.15 };
  static readonly defaultRelativeRotationAsChild: any = undefined;

  static readonly stackable: boolean = false;

  // Instance properties (from weapon data)
  public get id(): string {
    return this._weaponData.id;
  }

  public get name(): string {
    return this._weaponData.name;
  }

  public get iconImageUri(): string {
    return this._weaponData.assets.ui.icon;
  }

  public get description(): string {
    return this._weaponData.description;
  }

  public get rarity(): ItemRarity {
    // Convert weapon rarity to item rarity format
    const rarityMap: Record<string, ItemRarity> = {
      'common': 'common',
      'unusual': 'unusual',
      'rare': 'rare',
      'epic': 'epic',
      'legendary': 'legendary'
    };
    return rarityMap[this._weaponData.rarity] || 'common';
  }

  public get stackable(): boolean {
    return false; // Weapons are not stackable
  }

  public get buyPrice(): number {
    return this._weaponData.price;
  }

  public get sellPrice(): number {
    return Math.floor(this._weaponData.price * 0.1); // 10% of buy price
  }

  public get heldModelUri(): string {
    return this._weaponData.assets.models.held;
  }

  public get heldModelScale(): number {
    return this._weaponData?.assets?.models?.scale ?? 0.5;
  }

  public get dropModelUri(): string {
    return this._weaponData?.assets?.models?.dropped ?? this._weaponData?.assets?.models?.held ?? 'models/items/pistol_m9.glb';
  }

  public get dropModelScale(): number {
    return this._weaponData?.assets?.models?.dropScale ?? this._weaponData?.assets?.models?.scale ?? 0.5;
  }

  public get dropModelTintColor(): any {
    return undefined; // Use rarity color instead
  }

  public get defaultRelativeRotationAsChild(): any {
    return this._weaponData.assets.models.rotation;
  }

  public get defaultRelativePositionAsChild(): any {
    return this._weaponData.assets.models.position;
  }

  // Weapon-specific properties
  public get weaponData(): WeaponData {
    return this._weaponData;
  }

  public get category(): string {
    return this._weaponData.category;
  }



  public get stats(): WeaponData['stats'] {
    return this._weaponData.stats;
  }

  public get ammoType(): string {
    return this._weaponData.behavior.ammoType;
  }

  public get scopeZoom(): number | undefined {
    return this._weaponData.behavior.scopeZoom;
  }

  public get specialAbilities(): string[] | undefined {
    return this._weaponData.behavior.specialAbilities;
  }

  public get fireModes(): string[] | undefined {
    return this._weaponData.behavior.fireModes;
  }

  // Attack configuration (converted from weapon data)
  public get attack(): BaseWeaponItemAttack {
    return {
      cooldownMs: Math.floor(60000 / this._weaponData.stats.fireRate), // Convert RPM to cooldown
      damage: this._weaponData.stats.damage,
      damageDelayMs: 50,
      damageVariance: 0.1,
      knockbackForce: this._weaponData.stats.recoil / 10,
      reach: this._weaponData.stats.range,
      fireRate: this._weaponData.stats.fireRate,
      ammo: this._weaponData.stats.magazineSize,
      maxAmmo: this._weaponData.stats.magazineSize,
      reloadTimeMs: this._weaponData.stats.reloadTime,
    };
  }

  // Ammo persistence
  public get persistedAmmo(): number | undefined {
    return this._persistedAmmo;
  }

  public setPersistedAmmo(ammo: number): void {
    this._persistedAmmo = ammo;
  }

  // Override clone to preserve weapon data
  public override clone(overrides?: Partial<WeaponItemOverrides>): WeaponItem {
    return new WeaponItem(this._weaponData, {
      quantity: this.quantity,
      ammo: this._persistedAmmo,
      ...overrides,
    });
  }

  // Override to handle gun-specific behavior
  public override isGun(): boolean {
    return true;
  }

  public override performGunAttack(): void {
    // This will be handled by the WeaponEntity when equipped
    // The item itself doesn't perform attacks, the entity does
  }
} 