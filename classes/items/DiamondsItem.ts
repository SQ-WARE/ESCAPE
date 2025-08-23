import BaseValuableItem, { type ValuableItemOverrides } from './BaseValuableItem';

export interface DiamondsItemOptions extends ValuableItemOverrides {
  // No additional options needed for diamonds
}

export default class DiamondsItem extends BaseValuableItem {
  static override readonly id = 'diamonds';
  static override readonly name = 'Diamonds';
  static override readonly description = 'Brilliant cut diamonds of exceptional clarity and carat weight. Among the most valuable items in the world.';
  static override readonly iconImageUri = 'icons/diamonds.png';
  static override readonly dropModelUri = 'models/items/diamonds.glb';
  static override readonly heldModelUri = 'models/items/diamonds.glb';
  static override readonly dropModelScale = 0.25;
  static override readonly heldModelScale = 0.25;
  static override readonly rarity = 'legendary' as const;
  static override readonly stackable = true;

  constructor(options: DiamondsItemOptions = {}) {
    super(options);
  }

  public override clone(overrides?: ValuableItemOverrides): DiamondsItem {
    return new DiamondsItem({
      quantity: this.quantity,
      ...overrides,
    });
  }
}
