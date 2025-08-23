import BaseConsumableItem from '../BaseConsumableItem';

export default class MREItem extends BaseConsumableItem {
  constructor(quantity: number = 1) {
    super({
      id: 'mre',
      name: 'MRE (Meal Ready to Eat)',
      description: 'Self-contained individual field ration providing complete nutrition for extended operations',
      category: 'consumable',
      rarity: 'common',
      iconImageUri: 'icons/mre.png',
      maxQuantity: 15,
      stackable: true,
      buyPrice: 75,
      sellPrice: 35,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): MREItem {
    return new MREItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Restore health and provide long-term sustenance
    if (player.healthSystem) {
      // Health restoration effect would be implemented here
      console.log(`${player.name} consumed an MRE for sustained nutrition!`);
    }
    return true;
  }
}
