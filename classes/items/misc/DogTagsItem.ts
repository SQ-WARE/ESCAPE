import BaseItem from '../BaseItem';

export default class DogTagsItem extends BaseItem {
  constructor(quantity: number = 1) {
    super({
      id: 'dog_tags',
      name: 'Dog Tags',
      description: 'Military identification tags containing soldier information and serial numbers',
      category: 'misc',
      rarity: 'common',
      iconImageUri: 'icons/dog_tags.png',
      maxQuantity: 10,
      stackable: true,
      buyPrice: 15,
      sellPrice: 5,
      quantity
    });
  }

  public static create(options: { quantity?: number } = {}): DogTagsItem {
    return new DogTagsItem(options.quantity || 1);
  }

  public use(player: any): boolean {
    // Identification or quest item
    console.log(`${player.name} examined the dog tags for identification!`);
    return true;
  }
}
