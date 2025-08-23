import BaseConsumableItem from '../BaseConsumableItem';

export default class BandagesItem extends BaseConsumableItem {
  constructor(quantity: number = 1) {
    super({
      id: 'bandages',
      name: 'Bandages',
      description: 'Medical bandages for treating wounds and stopping bleeding',
      category: 'consumable',
      rarity: 'common',
      iconImageUri: 'icons/bandages.png',
      maxQuantity: 25,
      stackable: true,
      buyPrice: 40,
      sellPrice: 20,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): BandagesItem {
    return new BandagesItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Stop bleeding and restore minor health
    if (player.healthSystem) {
      // Bleeding stop and health restoration effect would be implemented here
      console.log(`${player.name} applied bandages to treat wounds!`);
    }
    return true;
  }
}
