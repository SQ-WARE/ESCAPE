import BaseItem, { type ItemOverrides } from './BaseItem';

export interface GoldBarItemOptions extends ItemOverrides {
  value?: number;
}

export default class GoldBarItem extends BaseItem {
  static override readonly id = 'gold-bar';
  static override readonly name = 'Gold Bar';
  static override readonly description = 'A valuable gold bar worth a significant amount';
  static override readonly iconImageUri = 'icons/gold-bar.png';
  static override readonly dropModelUri = 'models/items/gold-bar.glb';
  static override readonly heldModelUri = 'models/items/gold-bar.glb';
  static override readonly stackable = true;
  static override readonly rarity = 'epic';
  static override readonly dropModelTintColor = { r: 255, g: 215, b: 0 }; // Gold color

  public readonly value: number;

  constructor(options: GoldBarItemOptions = {}) {
    super(options);
    this.value = options.value ?? 1000; // Base value of 1000
  }

  public getDisplayValue(): string {
    return `$${this.value.toLocaleString()}`;
  }

  public getTotalValue(): number {
    return this.value * this.quantity;
  }
}
