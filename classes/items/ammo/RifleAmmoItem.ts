import BaseAmmoItem, { AmmoType } from '../BaseAmmoItem';
import type { ItemRarity } from '../BaseItem';

export default class RifleAmmoItem extends BaseAmmoItem {
  static override readonly id: string = 'rifle_ammo';
  static override readonly name: string = '7.62×39mm';
  static override readonly iconImageUri: string = 'icons/nato_ammo.png';
  static override readonly description: string = 'Rifle ammunition including 7.62×39mm. Used by assault rifles and battle rifles.';
  static override readonly rarity: ItemRarity = 'common';
  static override readonly ammoType: AmmoType = AmmoType.RIFLE;
  static override readonly maxStackSize: number = 100;
} 