import BaseItem, { type ItemOverrides } from './BaseItem';

export type ValuableItemOverrides = {
  quantity?: number;
} & ItemOverrides;

export default abstract class BaseValuableItem extends BaseItem {
  static override readonly stackable = true;
  // Rarity can be overridden by subclasses

  constructor(overrides?: ValuableItemOverrides) {
    super(overrides);
  }

  // Valuable items have no use functionality - they're purely for selling
  public override useMouseLeft(): void {
    // No functionality - valuable items are not usable
  }

  public override useMouseRight(): void {
    // No functionality - valuable items are not usable
  }
}
