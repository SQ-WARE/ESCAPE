import { BaseEntityControllerEvent } from 'hytopia';
import type { EventPayloads } from 'hytopia';
import type GamePlayerEntity from '../GamePlayerEntity';
import MedkitItem from '../items/MedkitItem';
import MedkitEntity from '../items/MedkitEntity';

export default class MedkitSystem {
  private _player: GamePlayerEntity;
  private _currentMedkit: MedkitEntity | null = null;

  constructor(player: GamePlayerEntity) {
    this._player = player;
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    // Listen for right-click input to use medkit
    this._player.playerController.on(BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT, this._onTickWithPlayerInput);
  }

  private _onTickWithPlayerInput = (payload: EventPayloads[BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT]): void => {
    const { input } = payload;

    // Check for right-click to use medkit
    if (input.mr) {
      const wasMedkitUsed = this._handleMedkitUsage();
      
      // Only consume the input if a medkit was actually used
      if (wasMedkitUsed) {
        input.mr = false; // Consume the input
      }
    }

    // Note: Removed movement cancellation - if player is using medkit, movement is already slowed
    // and we want them to be able to move slowly while healing
  }

  private _handleMedkitUsage(): boolean {
    // Don't allow new medkit usage if already using one
    if (this._currentMedkit?.isUsing) {
      this._player.player.ui.sendData({
        type: 'notification',
        message: 'Already using a medkit!',
        color: 'FFAA00'
      });
      return false;
    }

    // Check if player has a medkit in their hotbar
    const selectedItem = this._player.gamePlayer.hotbar.selectedItem;
    
    if (selectedItem instanceof MedkitItem) {
      // Create and equip medkit entity if not already equipped
      if (!this._currentMedkit || !this._currentMedkit.isEquipped) {
        this._equipMedkit(selectedItem);
      }
      
      if (this._currentMedkit && this._currentMedkit.use(this._player)) {
        return true;
      }
    } else {
      return false;
    }
    
    return false;
  }

  private _equipMedkit(medkitItem: MedkitItem): void {
    // Unequip current medkit if any
    if (this._currentMedkit) {
      this._currentMedkit.unequip();
      this._currentMedkit.despawn();
      this._currentMedkit = null;
    }

    // Create new medkit entity
    if (this._player.world) {
      this._currentMedkit = new MedkitEntity({
        medkitItem: medkitItem,
        parent: this._player,
        heldHand: 'right'
      });

      // Spawn and equip the medkit
      this._currentMedkit.spawn(this._player.world, { x: 0, y: 0, z: 0 });
      this._currentMedkit.equip();
    }
  }

  private _cancelMedkitUsage(): void {
    if (this._currentMedkit) {
      this._currentMedkit.cancelUse(this._player);
    }
  }

  public update(): void {
    // Update current medkit if using
    if (this._currentMedkit?.isUsing) {
      this._currentMedkit.update(this._player);
    }
  }

  public cleanup(): void {
    // Cancel any ongoing medkit usage and unequip
    if (this._currentMedkit) {
      if (this._currentMedkit.isUsing) {
        this._currentMedkit.cancelUse(this._player);
      }
      this._currentMedkit.unequip();
      this._currentMedkit.despawn();
    }
    this._currentMedkit = null;
  }

  public get isUsingMedkit(): boolean {
    return this._currentMedkit?.isUsing ?? false;
  }

  public get medkitProgress(): number {
    return this._currentMedkit?.useProgress ?? 0;
  }

  public equipMedkit(medkitItem: MedkitItem): void {
    this._equipMedkit(medkitItem);
  }
} 