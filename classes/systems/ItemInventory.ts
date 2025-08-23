import type { Player } from 'hytopia';
import type BaseItem from '../items/BaseItem';

export type SerializedItem = {
  position: number;
  itemId: string;
  quantity?: number;
  ammo?: number;
};

export type SerializedItemInventoryData = {
  items: SerializedItem[];
};

export default class ItemInventory {
  private _gridWidth: number;
  private _itemPositions: Map<BaseItem, number> = new Map();
  private _positionItems: Map<number, BaseItem> = new Map();
  private _size: number;
  private _tag: string;
  private _cachedRarityColors: any = null;

  public constructor(size: number, gridWidth: number, tag: string) {
    if (size <= 0 || gridWidth <= 0) {
      throw new Error('Size and gridWidth must be positive numbers');
    }
    this._size = size;
    this._gridWidth = gridWidth;
    this._tag = tag;
  }

  public get gridWidth(): number { return this._gridWidth; }
  public get items(): MapIterator<BaseItem> { return this._positionItems.values(); }
  public get isFull(): boolean { return this._itemPositions.size >= this._size; }
  public get rows(): number { return Math.ceil(this._size / this._gridWidth); }
  public get size(): number { return this._size; }
  public get tag(): string { return this._tag; }
  public get totalEmptySlots(): number { return this._size - this._itemPositions.size; }

  public addItem(item: BaseItem, position?: number): boolean {
    if (!item) {
      return false;
    }
    
    if (this._itemPositions.has(item)) {
      return false;
    }
    
    if (item.quantity <= 0 || item.quantity > 999999) {
      return false;
    }
    
    // Only auto-merge when no explicit target position is provided
    if (item.stackable && (position === undefined || position === null)) {
      // First pass: try exact class/name merge (legacy path)
      for (const existingItem of this._itemPositions.keys()) {
        if (
          existingItem.constructor === item.constructor && 
          existingItem.name === item.name && 
          existingItem.stackable
        ) {
          existingItem.adjustQuantity(item.quantity);
          this.onSlotChanged(this._itemPositions.get(existingItem)!, existingItem);
          return true;
        }
      }
      // Second pass: ammo-aware merge using canStackWith/addToStack
      for (const existingItem of this._itemPositions.keys()) {
        if (typeof (existingItem as any).canStackWith === 'function' && (existingItem as any).canStackWith(item)) {
          const leftover = (existingItem as any).addToStack(item.quantity);
          this.onSlotChanged(this._itemPositions.get(existingItem)!, existingItem);
          if (leftover <= 0) {
            return true;
          } else {
            // Update carried item quantity and continue placing leftover in a new slot
            (item as any).quantity = leftover;
            break;
          }
        }
      }
    }
    
    const targetPosition = position ?? this._findEmptyPosition();
    
    if (targetPosition < 0 || targetPosition >= this._size) {
      return false;
    }
    
    if (this._positionItems.has(targetPosition)) {
      return false;
    }
    
    this._itemPositions.set(item, targetPosition);
    this._positionItems.set(targetPosition, item);
    this.onSlotChanged(targetPosition, item);
    return true;
  }

  public adjustItemQuantity(position: number, quantity: number): boolean {
    if (position < 0 || position >= this._size) {
      return false;
    }
    
    const item = this._positionItems.get(position);
    if (!item || !item.stackable) {
      return false;
    }
    
    const newQuantity = item.quantity + quantity;
    if (newQuantity <= 0) {
      this.removeItem(position);
      return true;
    }
    
    if (newQuantity > 999999) {
      return false;
    }
    
    item.adjustQuantity(quantity);
    this.onSlotChanged(position, item);
    return true;
  }

  public adjustItemQuantityByReference(item: BaseItem, quantity: number): boolean {
    const position = this._itemPositions.get(item);
    if (position === undefined) {
      return false;
    }
    return this.adjustItemQuantity(position, quantity);
  }

  public coordinatesToPosition(x: number, y: number): number | null {
    if (x < 0 || x >= this._gridWidth || y < 0 || y >= this.rows) {
      return null;
    }
    return y * this._gridWidth + x;
  }

  public expandSize(newSize: number): boolean {
    if (newSize <= this._size) {
      return false;
    }
    this._size = newSize;
    return true;
  }

  public getItemAt(position: number): BaseItem | null {
    return this._positionItems.get(position) ?? null;
  }

  public getItemByClass(itemClass: typeof BaseItem): BaseItem | null {
    for (const [ item ] of this._itemPositions) {
      if (item instanceof itemClass) {
        return item;
      }
    }
    return null;
  }

  public getItemsByClass(itemClass: typeof BaseItem): BaseItem[] {
    const items: BaseItem[] = [];
    for (const [ item ] of this._itemPositions) {
      if (item instanceof itemClass) {
        items.push(item);
      }
    }
    return items;
  }

  public getItemPosition(item: BaseItem): number | null {
    return this._itemPositions.get(item) ?? null;
  }

  public getItemPositionByClass(itemClass: typeof BaseItem): number | null {
    for (const [ item, position ] of this._itemPositions) {
      if (item instanceof itemClass) {
        return position;
      }
    }
    return null;
  }

  public getItemQuantityByClass(itemClass: typeof BaseItem): number {
    let quantity = 0;
    for (const item of this.getItemsByClass(itemClass)) {
      quantity += item.quantity;
    }
    return quantity;
  }

  public getItemQuantityById(itemId: string): number {
    let quantity = 0;
    for (const item of this._positionItems.values()) {
      if (item.id === itemId) {
        quantity += item.quantity;
      }
    }
    return quantity;
  }

  public isEmpty(position: number): boolean {
    return !this._positionItems.has(position);
  }

  public moveItem(fromPosition: number, toPosition: number): boolean {
    if (fromPosition < 0 || fromPosition >= this._size || toPosition < 0 || toPosition >= this._size) {
      return false;
    }
    if (fromPosition === toPosition) {
      return true;
    }
    const itemToMove = this._positionItems.get(fromPosition);
    if (!itemToMove) {
      return false;
    }
    const itemAtDestination = this._positionItems.get(toPosition);
    if (itemAtDestination) {
      this._itemPositions.set(itemToMove, toPosition);
      this._itemPositions.set(itemAtDestination, fromPosition);
      this._positionItems.set(toPosition, itemToMove);
      this._positionItems.set(fromPosition, itemAtDestination);
      this.onSlotChanged(fromPosition, itemAtDestination);
      this.onSlotChanged(toPosition, itemToMove);
    } else {
      this._itemPositions.set(itemToMove, toPosition);
      this._positionItems.delete(fromPosition);
      this._positionItems.set(toPosition, itemToMove);
      this.onSlotChanged(fromPosition, null);
      this.onSlotChanged(toPosition, itemToMove);
    }
    return true;
  }

  public moveItemByReference(item: BaseItem, newPosition: number): boolean {
    const currentPosition = this._itemPositions.get(item);
    if (currentPosition === undefined) {
      return false;
    }
    return this.moveItem(currentPosition, newPosition);
  }

  public removeItem(position: number): BaseItem | null {
    if (position < 0 || position >= this._size) {
      return null;
    }
    const item = this._positionItems.get(position);
    if (!item) {
      return null;
    }
    this._itemPositions.delete(item);
    this._positionItems.delete(position);
    this.onSlotChanged(position, null);
    return item;
  }

  public removeItemByReference(item: BaseItem): boolean {
    const position = this._itemPositions.get(item);
    if (position === undefined) {
      return false;
    }
    return this.removeItem(position) !== null;
  }

  public clearAllItems(): void {
    for (let i = 0; i < this._size; i++) {
      if (this._positionItems.has(i)) {
        this.removeItem(i);
      }
    }
  }

  public async syncUI(player: Player): Promise<void> {
    for (const [ position, item ] of this._positionItems) {
      await this.syncUIUpdate(player, position, item);
    }
  }

  public async syncUIUpdate(player: Player, position: number, item: BaseItem | null): Promise<void> {
    const type = `${this._tag}Update`;
    if (item) {
      // Get rarity color from BaseItem (cached)
      const rarityColor = await this._getRarityColor(item.rarity);
      
      player.ui.sendData({
        position,
        type,
        itemId: item.id,
        name: item.name,
        description: item.description,
        iconImageUri: item.iconImageUri,
        quantity: item.quantity,
        stackable: item.stackable,
        rarity: item.rarity,
        rarityColor: rarityColor
      });
    } else {
      player.ui.sendData({
        position,
        type,
        removed: true,
      });
    }
  }
  
  protected async onSlotChanged(position: number, item: BaseItem | null): Promise<void> {
    // Default implementation does nothing - subclasses can override
  }

  public serialize(): SerializedItemInventoryData {
    const items: SerializedItem[] = [];
    for (const [position, item] of this._positionItems) {
      const serializedItem: SerializedItem = {
        position,
        itemId: item.id,
      };
      if (item.stackable) {
        serializedItem.quantity = item.quantity;
      }
      if ('persistedAmmo' in item && typeof (item as any).persistedAmmo === 'number') {
        const weaponItem = item as any;
        if (weaponItem.persistedAmmo !== undefined) {
          serializedItem.ammo = weaponItem.persistedAmmo;
        }
      }
      items.push(serializedItem);
    }
    return { items };
  }

  public async loadFromSerializedData(serializedItemInventoryData: SerializedItemInventoryData): Promise<boolean> {
    try {
      const { items } = serializedItemInventoryData;
      
      if (!Array.isArray(items)) {
        return false;
      }
      
      this._itemPositions.clear();
      this._positionItems.clear();
      
      for (const itemData of items) {
        if (!this._validateItemData(itemData)) {
          continue;
        }
        
        const { ItemFactory } = await import('../items/ItemFactory');
        const item = ItemFactory.getInstance().createItem(itemData.itemId, { quantity: itemData.quantity });
        if (!item) continue;
        
        if (itemData.position < 0 || itemData.position >= this._size) continue;
        if (this._positionItems.has(itemData.position)) continue;
        
        if (itemData.quantity !== undefined && (itemData.quantity <= 0 || itemData.quantity > 999999)) {
          continue;
        }
        
        if (itemData.ammo !== undefined && 'setPersistedAmmo' in item && typeof (item as any).setPersistedAmmo === 'function') {
          const weaponItem = item as any;
          weaponItem.setPersistedAmmo(itemData.ammo);
        }
        
        this._itemPositions.set(item, itemData.position);
        this._positionItems.set(itemData.position, item);
      }
      
      if (!this.verifyInventoryIntegrity()) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Validate item data during deserialization
  private _validateItemData(itemData: SerializedItem): boolean {
    try {
      const { ItemFactory } = require('../items/ItemFactory');
      if (!ItemFactory.getInstance().isValidItemId(itemData.itemId)) {
        return false;
      }
    } catch {
      return false;
    }
    
    if (itemData.position < 0 || itemData.position >= this._size) {
      return false;
    }
    
    if (itemData.quantity !== undefined) {
      if (itemData.quantity <= 0 || itemData.quantity > 999999) {
        return false;
      }
    }
    
    return true;
  }

  // Verify inventory integrity
  public verifyInventoryIntegrity(): boolean {
    const itemIds = new Set<string>();
    for (const item of this._positionItems.values()) {
      if (itemIds.has(item.id)) {
        return false;
      }
      itemIds.add(item.id);
    }
    
    for (const [position, item] of this._positionItems) {
      if (position < 0 || position >= this._size) {
        return false;
      }
    }
    
    return true;
  }

  private _findEmptyPosition(): number {
    for (let i = 0; i < this._size; i++) {
      if (!this._positionItems.has(i)) {
        return i;
      }
    }
    return -1;
  }

  // Serialize inventory for UI with rarity colors
  public async serializeForUI(): Promise<Array<Record<string, unknown>>> {
    const out: Array<Record<string, unknown>> = [];
    for (let i = 0; i < this._size; i++) {
      const item = this._positionItems.get(i) as BaseItem | null;
      if (!item) continue;
      
      // Get rarity color from BaseItem (cached)
      const rarityColor = await this._getRarityColor(item.rarity);
      
      out.push({
        id: item.id,
        name: item.name,
        description: item.description,
        iconImageUri: item.iconImageUri,
        quantity: item.quantity,
        position: i,
        stackable: item.stackable,
        rarity: item.rarity,
        rarityColor: rarityColor
      });
    }
    return out;
  }

  private async _getRarityColor(rarity: string): Promise<string> {
    // Cache the rarity colors to avoid repeated dynamic imports
    if (!this._cachedRarityColors) {
      const { RARITY_RGB_COLORS } = await import('../items/BaseItem');
      this._cachedRarityColors = RARITY_RGB_COLORS;
    }
    return this._cachedRarityColors[rarity];
  }
} 