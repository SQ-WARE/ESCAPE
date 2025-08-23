import BaseItem from '../BaseItem';

export default class GogglesItem extends BaseItem {
  constructor(quantity: number = 1) {
    super({
      id: 'goggles',
      name: 'Tactical Goggles',
      description: 'Military-grade protective goggles with enhanced vision and ballistic protection',
      category: 'equipment',
      rarity: 'common',
      iconImageUri: 'icons/goggles.png',
      maxQuantity: 1,
      stackable: false,
      buyPrice: 150,
      sellPrice: 75,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): GogglesItem {
    return new GogglesItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Provide eye protection and enhanced vision
    if (player.visionSystem) {
      // Vision enhancement effect would be implemented here
      console.log(`${player.name} equipped tactical goggles for enhanced vision!`);
    }
    return true;
  }
}
