import BaseItem from '../BaseItem';

export default class FragGrenadeItem extends BaseItem {
  constructor(quantity: number = 1) {
    super({
      id: 'frag_grenade',
      name: 'Fragmentation Grenade',
      description: 'High-explosive fragmentation grenade for area denial and enemy suppression',
      category: 'weapon',
      rarity: 'rare',
      iconImageUri: 'icons/frag_grenade.png',
      maxQuantity: 10,
      stackable: true,
      buyPrice: 300,
      sellPrice: 150,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): FragGrenadeItem {
    return new FragGrenadeItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Throw grenade for area damage
    console.log(`${player.name} threw a fragmentation grenade!`);
    return true;
  }
}
