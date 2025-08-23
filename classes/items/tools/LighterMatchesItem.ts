import BaseItem from '../BaseItem';

export default class LighterMatchesItem extends BaseItem {
  constructor(quantity: number = 1) {
    super({
      id: 'lighter_matches',
      name: 'Lighter & Matches',
      description: 'Reliable fire-starting tools essential for survival and tactical operations',
      category: 'tool',
      rarity: 'common',
      iconImageUri: 'icons/lighter_matches.png',
      maxQuantity: 5,
      stackable: true,
      buyPrice: 30,
      sellPrice: 15,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): LighterMatchesItem {
    return new LighterMatchesItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Create fire or light sources
    console.log(`${player.name} used lighter & matches to start a fire!`);
    return true;
  }
}
