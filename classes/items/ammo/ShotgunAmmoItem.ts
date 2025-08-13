import BaseAmmoItem, { AmmoType } from '../BaseAmmoItem';
import type { ItemRarity } from '../BaseItem';

export default class ShotgunAmmoItem extends BaseAmmoItem {
  static override readonly id: string = 'shotgun_ammo';
  static override readonly name: string = '12 Gauge Shells';
  static override readonly iconImageUri: string = 'icons/12gauge.png';
  static override readonly description: string = '12 gauge shotgun shells for pump-action and semi-automatic shotguns.';
  static override readonly rarity: ItemRarity = 'common';
  static override readonly ammoType: AmmoType = AmmoType.SHOTGUN;
  static override readonly maxStackSize: number = 100;
} 