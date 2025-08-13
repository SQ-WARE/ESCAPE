import BaseAmmoItem, { AmmoType } from '../BaseAmmoItem';
import type { ItemRarity } from '../BaseItem';

export default class SniperAmmoItem extends BaseAmmoItem {
  static override readonly id: string = 'sniper_ammo';
  static override readonly name: string = '12.7×108mm';
  static override readonly iconImageUri: string = 'icons/12.7mm.png';
  static override readonly description: string = 'Sniper ammunition including 12.7×108mm. Precision long-range cartridges for sniper rifles.';
  static override readonly rarity: ItemRarity = 'unusual';
  static override readonly ammoType: AmmoType = AmmoType.SNIPER;
  static override readonly maxStackSize: number = 100;
} 