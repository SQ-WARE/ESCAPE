import BaseItem from '../BaseItem';

export default class SmokeGrenadeItem extends BaseItem {
  constructor(quantity: number = 1) {
    super({
      id: 'smoke_grenade',
      name: 'Smoke Grenade',
      description: 'Tactical smoke grenade for concealment, signaling, and area denial',
      category: 'weapon',
      rarity: 'unusual',
      iconImageUri: 'icons/smoke_grenade.png',
      maxQuantity: 15,
      stackable: true,
      buyPrice: 150,
      sellPrice: 75,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): SmokeGrenadeItem {
    return new SmokeGrenadeItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Deploy smoke for concealment
    console.log(`${player.name} deployed a smoke grenade for concealment!`);
    return true;
  }
}
