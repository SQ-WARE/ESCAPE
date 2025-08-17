import BaseItem, { type ItemOverrides } from './BaseItem';

export interface DiamondItemOptions extends ItemOverrides {
  value?: number;
}

export default class DiamondItem extends BaseItem {
  static override readonly id = 'diamond';
  static override readonly name = 'Diamond';
  static override readonly description = 'A precious diamond of exceptional value';
  static override readonly iconImageUri = 'icons/diamond.png';
  static override readonly dropModelUri = 'models/items/diamond.glb';
  static override readonly heldModelUri = 'models/items/diamond.glb';
  static override readonly stackable = true;
  static override readonly rarity = 'legendary';
  static override readonly dropModelTintColor = { r: 185, g: 242, b: 255 }; // Diamond blue

  public readonly value: number;

  constructor(options: DiamondItemOptions = {}) {
    super(options);
    this.value = options.value ?? 5000; // High value of 5000
  }

  public getDisplayValue(): string {
    return `$${this.value.toLocaleString()}`;
  }

  public getTotalValue(): number {
    return this.value * this.quantity;
  }
}
