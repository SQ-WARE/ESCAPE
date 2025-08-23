import BaseConsumableItem from '../BaseConsumableItem';

export default class PainkillersItem extends BaseConsumableItem {
  constructor(quantity: number = 1) {
    super({
      id: 'painkillers',
      name: 'Painkillers',
      description: 'Strong pain relief medication that reduces damage taken and improves combat effectiveness',
      category: 'consumable',
      rarity: 'unusual',
      iconImageUri: 'icons/painkillers.png',
      maxQuantity: 10,
      stackable: true,
      buyPrice: 100,
      sellPrice: 50,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): PainkillersItem {
    return new PainkillersItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Apply damage reduction and pain resistance
    if (player.healthSystem) {
      // Damage reduction effect would be implemented here
      console.log(`${player.name} took painkillers for damage resistance!`);
    }
    return true;
  }
}
