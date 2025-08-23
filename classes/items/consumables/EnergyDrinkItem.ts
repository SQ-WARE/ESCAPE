import BaseConsumableItem from '../BaseConsumableItem';

export default class EnergyDrinkItem extends BaseConsumableItem {
  constructor(quantity: number = 1) {
    super({
      id: 'energy_drink',
      name: 'Energy Drink',
      description: 'High-caffeine energy drink that provides a temporary boost to stamina and movement speed',
      category: 'consumable',
      rarity: 'common',
      iconImageUri: 'icons/energy_drink.png',
      maxQuantity: 20,
      stackable: true,
      buyPrice: 50,
      sellPrice: 25,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): EnergyDrinkItem {
    return new EnergyDrinkItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Apply stamina and movement speed boost
    if (player.movementSystem) {
      // Temporary boost effect would be implemented here
      console.log(`${player.name} used an energy drink for a stamina boost!`);
    }
    return true;
  }
}
