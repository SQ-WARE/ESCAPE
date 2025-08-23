import BaseValuableItem, { type ValuableItemOverrides } from './BaseValuableItem';

export interface GoldBarItemOptions extends ValuableItemOverrides {
  // No additional options needed for gold bars
}

export default class GoldBarItem extends BaseValuableItem {
  static override readonly id = 'gold_bar';
  static override readonly name = 'Gold Bar';
  static override readonly description = 'A solid gold bar of high purity. Extremely valuable and sought after by traders.';
  static override readonly iconImageUri = 'icons/gold_bar.png';
  static override readonly dropModelUri = 'models/items/gold_bar.glb';
  static override readonly heldModelUri = 'models/items/gold_bar.glb';
  static override readonly dropModelScale = 0.3;
  static override readonly heldModelScale = 0.3;
  static override readonly rarity = 'epic' as const;
  static override readonly stackable = true;

  constructor(options: GoldBarItemOptions = {}) {
    super(options);
  }

  public override clone(overrides?: ValuableItemOverrides): GoldBarItem {
    return new GoldBarItem({
      quantity: this.quantity,
      ...overrides,
    });
  }
}
