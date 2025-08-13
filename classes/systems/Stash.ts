import type { Player } from 'hytopia';
import type BaseItem from '../items/BaseItem';
import ItemInventory from './ItemInventory';

const STASH_SIZE = 90; // 10 rows of 9 slots for large storage
const STASH_GRID_WIDTH = 9;

export default class Stash extends ItemInventory {
  private _owner: Player;

  public constructor(owner: Player) {
    super(STASH_SIZE, STASH_GRID_WIDTH, 'stash');
    this._owner = owner;
  }

  protected override onSlotChanged(position: number, item: BaseItem | null): void {
    this.syncUIUpdate(this._owner, position, item);
    // Note: We don't auto-save stash changes to persistence immediately
    // Stash is persistent storage that doesn't get cleared on death
  }

  /**
   * Save stash data to persistence
   */
  public saveToPersistence(): void {
    // This will be called when the player explicitly saves or when they deploy
    // Stash data should persist between deaths
  }

  /**
   * Load stash data from persistence
   */
  public loadFromPersistence(): void {
    // Load stash data when player joins
    // This should be called from GamePlayer.load()
  }
} 