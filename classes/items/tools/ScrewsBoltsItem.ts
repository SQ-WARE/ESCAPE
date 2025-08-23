import BaseItem from '../BaseItem';

export default class ScrewsBoltsItem extends BaseItem {
  constructor(quantity: number = 1) {
    super({
      id: 'screws_bolts',
      name: 'Screws & Bolts',
      description: 'Assorted hardware for repairs and modifications to equipment and weapons',
      category: 'tool',
      rarity: 'common',
      iconImageUri: 'icons/screws_bolts.png',
      maxQuantity: 50,
      stackable: true,
      buyPrice: 20,
      sellPrice: 10,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): ScrewsBoltsItem {
    return new ScrewsBoltsItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Used for weapon modifications or repairs
    console.log(`${player.name} used screws & bolts for equipment maintenance!`);
    return true;
  }
}
