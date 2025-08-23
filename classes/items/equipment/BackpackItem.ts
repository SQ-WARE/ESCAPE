import BaseItem from '../BaseItem';

export default class BackpackItem extends BaseItem {
  constructor(quantity: number = 1) {
    super({
      id: 'backpack',
      name: 'Tactical Backpack',
      description: 'Military-grade backpack with multiple compartments for carrying equipment and supplies',
      category: 'equipment',
      rarity: 'common',
      iconImageUri: 'icons/backpack.png',
      maxQuantity: 1,
      stackable: false,
      buyPrice: 200,
      sellPrice: 100,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): BackpackItem {
    return new BackpackItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Increase inventory capacity
    if (player.inventorySystem) {
      // Inventory capacity boost would be implemented here
      console.log(`${player.name} equipped a tactical backpack for increased storage!`);
    }
    return true;
  }
}
