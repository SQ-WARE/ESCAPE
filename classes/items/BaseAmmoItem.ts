import BaseItem, { type ItemOverrides, type ItemRarity } from './BaseItem';

export enum AmmoType {
  PISTOL = 'pistol',
  RIFLE = 'rifle', 
  SHOTGUN = 'shotgun',
  SNIPER = 'sniper'
}

export type AmmoOverrides = {
  quantity?: number;
  ammoType?: AmmoType;
} & ItemOverrides;

export default abstract class BaseAmmoItem extends BaseItem {
  static readonly ammoType: AmmoType;
  static readonly maxStackSize: number = 100;

  protected _ammoQuantity: number;

  public constructor(overrides?: AmmoOverrides) {
    super(overrides);
    this._ammoQuantity = overrides?.quantity ?? 1;
  }

  static override create(overrides?: AmmoOverrides): BaseAmmoItem {
    const ItemClass = this as any;
    return new ItemClass(overrides);
  }

  public override get quantity(): number { 
    return this._ammoQuantity; 
  }

  public override set quantity(value: number) {
    this._ammoQuantity = Math.max(0, Math.min(value, this.maxStackSize));
  }

  public get ammoType(): AmmoType { 
    return (this.constructor as typeof BaseAmmoItem).ammoType; 
  }

  public get maxStackSize(): number { 
    return (this.constructor as typeof BaseAmmoItem).maxStackSize; 
  }

  public override get stackable(): boolean {
    return true;
  }

  public override adjustQuantity(delta: number): void {
    const next = (this._ammoQuantity ?? 0) + (delta ?? 0);
    this._ammoQuantity = Math.max(0, Math.min(next, this.maxStackSize));
  }

  public canStackWith(other: BaseItem): boolean {
    return other instanceof BaseAmmoItem && 
           other.ammoType === this.ammoType && 
           other.quantity < other.maxStackSize;
  }

  public addToStack(amount: number): number {
    const canAdd = Math.min(amount, this.maxStackSize - this._ammoQuantity);
    this._ammoQuantity += canAdd;
    return amount - canAdd;
  }

  public removeFromStack(amount: number): number {
    const canRemove = Math.min(amount, this._ammoQuantity);
    this._ammoQuantity -= canRemove;
    return canRemove;
  }

  public override useMouseLeft(): void {
    // Ammo items can't be used directly
  }

  public override useMouseRight(): void {
    // Ammo items can't be used directly
  }

  static override readonly defaultRelativePositionAsChild = { x: 0, y: 0, z: 0 };
  static override readonly defaultRelativeRotationAsChild = { x: 0, y: 0, z: 0, w: 1 };
} 