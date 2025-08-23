import type GamePlayer from '../GamePlayer';
import type BaseItem from '../items/BaseItem';
import ItemInventory from './ItemInventory';

const BACKPACK_SIZE = 27;
const BACKPACK_GRID_WIDTH = 9;

export default class Backpack extends ItemInventory {
  private _owner: GamePlayer;

  public constructor(owner: GamePlayer) {
    super(BACKPACK_SIZE, BACKPACK_GRID_WIDTH, 'backpack');
    this._owner = owner;
  }

  protected override async onSlotChanged(position: number, item: BaseItem | null): Promise<void> {
    await this.syncUIUpdate(this._owner.player, position, item);
    this._owner.save(); // Auto-save when backpack changes
  }
} 