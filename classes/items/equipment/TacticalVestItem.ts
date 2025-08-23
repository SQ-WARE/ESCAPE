import BaseItem from '../BaseItem';

export default class TacticalVestItem extends BaseItem {
  constructor(quantity: number = 1) {
    super({
      id: 'tactical_vest',
      name: 'Tactical Vest',
      description: 'Bullet-resistant tactical vest with multiple pouches for ammunition and equipment',
      category: 'equipment',
      rarity: 'unusual',
      iconImageUri: 'icons/tactical_vest.png',
      maxQuantity: 1,
      stackable: false,
      buyPrice: 500,
      sellPrice: 250,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): TacticalVestItem {
    return new TacticalVestItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Provide armor protection and ammo storage
    if (player.armorSystem) {
      // Armor protection effect would be implemented here
      console.log(`${player.name} equipped a tactical vest for protection!`);
    }
    return true;
  }
}
