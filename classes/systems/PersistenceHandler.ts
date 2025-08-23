import { Player } from 'hytopia';
import type GamePlayer from '../GamePlayer';
import type { SerializedItemInventoryData } from './ItemInventory';
import PistolAmmoItem from '../items/ammo/PistolAmmoItem';
import { WeaponFactory } from '../weapons/WeaponFactory';

interface PlayerPersistedData extends Record<string, unknown> {
  backpack: SerializedItemInventoryData;
  hotbar: SerializedItemInventoryData;
  stash: Record<string, number>;
  currency?: number;
}

export class PersistenceHandler {
  private gamePlayer: GamePlayer;
  private player: Player;
  private _saveTimeout: NodeJS.Timeout | undefined;
  private _isDestroyed: boolean = false;

  constructor(gamePlayer: GamePlayer) {
    this.gamePlayer = gamePlayer;
    this.player = gamePlayer.player;
  }

  public destroy(): void {
    this._isDestroyed = true;
    
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = undefined;
    }
  }

  public load(): void {
    try {
      const serializedData = this.player.getPersistedData();
      
      if (serializedData) {
        const success = this.loadFromSerializedData(serializedData as PlayerPersistedData);
        if (!success) {
          this.loadDefaultItems();
        }
      } else {
        this.loadDefaultItems();
      }
    } catch (error) {
      // Failed to load player data, using defaults
      this.loadDefaultItems();
    }
  }

  public save(): void {
    if (this._isDestroyed) return;
    
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }
    
    this._saveTimeout = setTimeout(() => {
      if (!this._isDestroyed) {
        try {
          this.player.setPersistedData(this.serialize());
        } catch (error) {
          // Failed to save player data
        }
      }
    }, 500);
  }

  public serialize(): PlayerPersistedData {
    try {
      const data = {
        backpack: this.gamePlayer.backpack.serialize(),
        hotbar: this.gamePlayer.hotbar.serialize(),
        stash: this.gamePlayer.stash.getStashData(),
        currency: this.gamePlayer.currency.getCurrency(),
      };

      return data as PlayerPersistedData;
    } catch (error) {
      return {
        backpack: { items: [] },
        hotbar: { items: [] },
        stash: {},
        currency: this.gamePlayer.currency.getCurrency(),
      } as PlayerPersistedData;
    }
  }

  private loadDefaultItems(): void {
    const startingPistol = WeaponFactory.create('m9_beretta');
    const startingAmmo = PistolAmmoItem.create({ quantity: 50 });
    
    this.gamePlayer.hotbar.addItem(startingPistol);
    this.gamePlayer.hotbar.addItem(startingAmmo);
    this.gamePlayer.hotbar.setSelectedIndex(0);
    // Initialize currency for new players
    this.gamePlayer.currency.setCurrency(this.gamePlayer.currency.getCurrency());
  }

  private loadFromSerializedData(persistedData: PlayerPersistedData): boolean {
    try {
      if (!persistedData || typeof persistedData !== 'object') {
        return false;
      }

      const loadResults = [
        this.loadInventoryData('backpack', persistedData.backpack, this.gamePlayer.backpack),
        this.loadInventoryData('hotbar', persistedData.hotbar, this.gamePlayer.hotbar),
        this.loadInventoryData('stash', persistedData.stash, this.gamePlayer.stash)
      ];

      if (typeof persistedData.currency === 'number') {
        this.gamePlayer.currency.setCurrency(persistedData.currency);
      }

      return loadResults.every(result => result);
    } catch (error) {
      return false;
    }
  }

  private loadInventoryData(name: string, data: any, inventory: any): boolean {
    if (data) {
      try {
        if (name === 'stash' && this.gamePlayer.stash) {
          // Handle stash data as a simple record of itemId -> quantity
          if (typeof data === 'object' && !Array.isArray(data)) {
            this.gamePlayer.stash.loadFromStashData(data);
            return true;
          }
        }
        // For other inventories, use the standard serialized data format
        inventory.loadFromSerializedData(data);
        return true;
      } catch (error) {
        return false;
      }
    } else {
      return false;
    }
  }
}
