import BaseConsumableItem from '../BaseConsumableItem';

export default class WaterItem extends BaseConsumableItem {
  constructor(quantity: number = 1) {
    super({
      id: 'water',
      name: 'Water Bottle',
      description: 'Clean drinking water essential for hydration and survival in the field',
      category: 'consumable',
      rarity: 'common',
      iconImageUri: 'icons/water.png',
      maxQuantity: 30,
      stackable: true,
      buyPrice: 25,
      sellPrice: 10,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): WaterItem {
    return new WaterItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Restore hydration and minor health
    if (player.healthSystem) {
      // Hydration effect would be implemented here
      console.log(`${player.name} drank water to stay hydrated!`);
    }
    return true;
  }
}
