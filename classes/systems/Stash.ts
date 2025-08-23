import type { Player } from 'hytopia';
import type BaseItem from '../items/BaseItem';
import ItemInventory from './ItemInventory';

const STASH_SIZE = 90; // 10 rows of 9 slots for large storage
const STASH_GRID_WIDTH = 9;

export default class Stash extends ItemInventory {
  private _owner: Player;
  private _gamePlayer: any; // Reference to GamePlayer instance

  public constructor(owner: Player, gamePlayer?: any) {
    super(STASH_SIZE, STASH_GRID_WIDTH, 'stash');
    this._owner = owner;
    this._gamePlayer = gamePlayer;
  }

  protected override async onSlotChanged(position: number, item: BaseItem | null): Promise<void> {
    await this.syncUIUpdate(this._owner, position, item);
    // Stash changes should trigger a save to persistence
    this._triggerSave();
  }

  /**
   * Trigger a save to persistence when stash changes
   */
  private _triggerSave(): void {
    // This will be called when items are added/removed from stash
    // The actual save is handled by GamePlayer.save()
    try {
      if (this._gamePlayer) {
        this._gamePlayer.save();
      } else {
        // Fallback to getting GamePlayer instance
        const { default: GamePlayer } = require('../GamePlayer');
        const gamePlayer = GamePlayer.getOrCreate(this._owner);
        gamePlayer.save();
      }
    } catch (error) {
      // Failed to trigger save
    }
  }

  /**
   * Get stash data for persistence
   */
  public getStashData(): Record<string, number> {
    const stashData: Record<string, number> = {};
    
    for (let i = 0; i < this.size; i++) {
      const item = this.getItemAt(i);
      if (item) {
        const itemId = item.id;
        stashData[itemId] = (stashData[itemId] || 0) + item.quantity;
      }
    }
    
    return stashData;
  }

  /**
   * Load stash data from persistence
   */
  public loadFromStashData(stashData: Record<string, number>): void {
    // Clear current stash
    this.clearAllItems();
    
    // Load items from stash data
    for (const [itemId, quantity] of Object.entries(stashData)) {
      if (quantity > 0) {
        // Create item and add to stash
        // This will be handled by the item factory
        this._loadItemToStash(itemId, quantity);
      }
    }
  }

  /**
   * Load a specific item to stash
   */
  private _loadItemToStash(itemId: string, quantity: number): void {
    try {
      // Use synchronous import since ItemFactory should already be loaded
      const { ItemFactory } = require('../items/ItemFactory');
      const item = ItemFactory.getInstance().createItem(itemId, { quantity });
      if (item) {
        const success = this.addItem(item);
        if (!success) {
          // Failed to add item to stash - possibly full or invalid
        }
      }
    } catch (error) {
      // Failed to load item to stash - invalid item or factory issue
    }
  }
} 