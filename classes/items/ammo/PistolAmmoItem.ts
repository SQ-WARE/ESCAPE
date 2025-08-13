import BaseAmmoItem, { AmmoType } from '../BaseAmmoItem';
import type { ItemRarity } from '../BaseItem';

export default class PistolAmmoItem extends BaseAmmoItem {
  static override readonly id: string = 'pistol_ammo';
  static override readonly name: string = '9×19mm Parabellum';
  static override readonly iconImageUri: string = 'icons/9mm.png';
  static override readonly description: string = 'Pistol ammunition including 9×19mm Parabellum. Used by pistols and submachine guns.';
  static override readonly rarity: ItemRarity = 'common';
  static override readonly ammoType: AmmoType = AmmoType.PISTOL;
  static override readonly maxStackSize: number = 100;
} 