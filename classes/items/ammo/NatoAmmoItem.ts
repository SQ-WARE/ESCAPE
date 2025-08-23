import BaseAmmoItem from '../BaseAmmoItem';

export default class NatoAmmoItem extends BaseAmmoItem {
  constructor(quantity: number = 1) {
    super({
      id: 'nato_ammo',
      name: '5.56×45mm NATO',
      description: 'Standard NATO rifle ammunition with high accuracy and penetration',
      category: 'ammo',
      rarity: 'common',
      iconImageUri: 'icons/nato_ammo.png',
      maxQuantity: 999,
      stackable: true,
      buyPrice: 2,
      sellPrice: 1,
      quantity,
      ammoType: 'nato',
      damage: 25,
      penetration: 15
    });
  }

  public static create(options: { quantity?: number } = {}): NatoAmmoItem {
    return new NatoAmmoItem(options.quantity || 1);
  }
}
