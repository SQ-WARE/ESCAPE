import {
  Audio,
  type Vector3Like,
} from 'hytopia';

import type { WeaponData } from '../weapons/data/WeaponData';
import GamePlayerEntity from '../GamePlayerEntity';
import GamePlayer from '../GamePlayer';
import WeaponItem from '../weapons/items/WeaponItem';

export default class WeaponReloadSystem {
  private readonly _weaponData: WeaponData;
  private readonly _maxAmmo: number;
  private readonly _reloadTime: number;
  private readonly _ammoType: string;

  public ammo: number;
  private _reloading: boolean = false;
  private _reloadProgressInterval: NodeJS.Timeout | undefined;
  private _noAmmoMessageShown: boolean = false;

  private _reloadAudio: Audio;
  private _emptyAudio?: Audio;

  constructor(weaponData: WeaponData, ammo: number = 0) {
    this._weaponData = weaponData;
    this._maxAmmo = weaponData.stats.magazineSize;
    this._reloadTime = weaponData.stats.reloadTime;
    this._ammoType = weaponData.behavior.ammoType;
    this.ammo = ammo;

    this._reloadAudio = new Audio({
      uri: weaponData.assets.audio.reload,
      volume: 0.3,
    });

    if (weaponData.assets.audio.empty) {
      this._emptyAudio = new Audio({
        uri: weaponData.assets.audio.empty,
        volume: 0.2,
      });
    }
  }

  public get isReloading(): boolean {
    return this._reloading;
  }

  public get maxAmmo(): number {
    return this._maxAmmo;
  }

  public get reloadTime(): number {
    return this._reloadTime;
  }

  public get ammoType(): string {
    return this._ammoType;
  }

  public reload(parent: GamePlayerEntity): boolean {
    if (!parent || !parent.world || this._reloading) {
      return false;
    }

    const player = parent.player;
    const gamePlayer = (player as any).gamePlayer || GamePlayer.getOrCreate(player);
    
    if (!gamePlayer) {
      return false;
    }

    // Check if weapon is already full
    if (this.ammo >= this._maxAmmo) {
      player.ui.sendData({
        type: 'reload-error',
        message: 'Weapon is already fully loaded!'
      });
      return false;
    }

    const availableAmmo = this._getAvailableAmmoFromInventory(gamePlayer);
    if (availableAmmo <= 0) {
      if (this._emptyAudio) {
        this._emptyAudio.play(parent.world, true);
      }
      
      player.ui.sendData({
        type: 'reload-error',
        message: `No ${this._getAmmoTypeDisplayName(this._ammoType)} ammo available!`
      });
      return false;
    }

    // Calculate how much ammo we need to reload
    const ammoNeeded = this._maxAmmo - this.ammo;
    const reloadAmount = Math.min(ammoNeeded, availableAmmo);
    
    // Check if we actually need to reload
    if (ammoNeeded <= 0) {
      player.ui.sendData({
        type: 'reload-error',
        message: 'Weapon is already fully loaded!'
      });
      return false;
    }
    
    if (reloadAmount <= 0) {
      player.ui.sendData({
        type: 'reload-error',
        message: 'No ammo available to reload!'
      });
      return false;
    }

    // Only start reloading and play reload audio if we have valid ammo to reload
    this._reloading = true;
    this._reloadAudio.play(parent.world, true);
    
    player.ui.sendData({
      type: 'reload-progress',
      show: true
    });
    
    const startTime = performance.now();
    const reloadDuration = this._reloadTime;
    
    this._reloadProgressInterval = setInterval(() => {
      if (!parent.world) {
        this._hideReloadProgress();
        this._hideReloadProgressUI(parent);
        return;
      }
      
      const elapsed = performance.now() - startTime;
      const progress = Math.min((elapsed / reloadDuration) * 100, 100);
      
      if (progress >= 100) {
        clearInterval(this._reloadProgressInterval);
        this._reloadProgressInterval = undefined;
        
        // Hide reload text
        player.ui.sendData({
          type: 'reload-progress',
          show: false
        });
        
        if (reloadAmount > 0) {
          this._consumeAmmoFromInventory(gamePlayer, reloadAmount);
          this.ammo += reloadAmount; // Add to existing ammo instead of replacing
          this._saveAmmoData(gamePlayer);
          this._noAmmoMessageShown = false;
          
          player.ui.sendData({
            type: 'reload-success',
            message: `Reloaded with ${reloadAmount} rounds (${this.ammo}/${this._maxAmmo})`
          });
          
          // Force UI update after reload completion
          player.ui.sendData({
            type: 'ammo-indicator',
            show: true,
            ammo: this.ammo,
            maxAmmo: this._maxAmmo,
            totalAmmo: this._getAvailableAmmoFromInventory(gamePlayer),
            ammoType: this._ammoType,
            reloading: false,
          });
        } else {
          // No ammo was reloaded, but we still completed the reload animation
          player.ui.sendData({
            type: 'reload-error',
            message: 'No ammo available to reload!'
          });
        }
        
        this._reloading = false;
        this._hideReloadProgress();
        this._hideReloadProgressUI(parent);
        this.hideReloadPrompt(parent);
      }
    }, 16);

    return true;
  }

  public cancelReload(parent: GamePlayerEntity): void {
    if (this._reloading) {
      this._reloading = false;
      this._hideReloadProgress();
      this._hideReloadProgressUI(parent);
      this.hideReloadPrompt(parent);
      
      if (parent) {
        parent.player.ui.sendData({
          type: 'reload-cancelled',
          message: 'Reload cancelled'
        });
        
        // Force UI update after reload cancellation
        parent.player.ui.sendData({
          type: 'ammo-indicator',
          show: true,
          ammo: this.ammo,
          maxAmmo: this._maxAmmo,
          totalAmmo: this._getAvailableAmmoFromInventory((parent.player as any).gamePlayer || GamePlayer.getOrCreate(parent.player)),
          ammoType: this._ammoType,
          reloading: false,
        });
      }
    }
  }

  public showReloadPrompt(parent: GamePlayerEntity): void {
    if (parent) {
      parent.player.ui.sendData({
        type: 'reload-prompt',
        show: true
      });
    }
  }

  public hideReloadPrompt(parent: GamePlayerEntity): void {
    if (parent) {
      parent.player.ui.sendData({
        type: 'reload-prompt',
        show: false
      });
    }
  }

  private _hideReloadProgress(): void {
    if (this._reloadProgressInterval) {
      clearInterval(this._reloadProgressInterval);
      this._reloadProgressInterval = undefined;
    }
  }

  private _hideReloadProgressUI(parent: GamePlayerEntity): void {
    if (parent && parent.world) {
      parent.player.ui.sendData({
        type: 'reload-progress',
        show: false
      });
    }
  }

  private _consumeAmmoFromInventory(gamePlayer: any, amount: number): boolean {
    for (let i = 0; i < gamePlayer.hotbar.size; i++) {
      const item = gamePlayer.hotbar.getItemAt(i);
      if (item && this._isAmmoItemForWeapon(item)) {
        const consumed = this._consumeFromAmmoItem(item, amount);
        if (consumed > 0) {
          if (item.quantity <= 0) {
            gamePlayer.hotbar.removeItem(i);
          }
          gamePlayer.hotbar.syncUI(gamePlayer.player);
          return true;
        }
      }
    }

    for (let i = 0; i < gamePlayer.backpack.size; i++) {
      const item = gamePlayer.backpack.getItemAt(i);
      if (item && this._isAmmoItemForWeapon(item)) {
        const consumed = this._consumeFromAmmoItem(item, amount);
        if (consumed > 0) {
          if (item.quantity <= 0) {
            gamePlayer.backpack.removeItem(i);
          }
          gamePlayer.backpack.syncUI(gamePlayer.player);
          return true;
        }
      }
    }

    return false;
  }

  private _isAmmoItemForWeapon(item: any): boolean {
    if (!item) return false;
    
    const isAmmoItem = item.ammoType && 
      item.constructor.name !== 'WeaponItem' && 
      (item.constructor.name === 'PistolAmmoItem' || 
       item.constructor.name === 'RifleAmmoItem' || 
       item.constructor.name === 'SniperAmmoItem' ||
       item.constructor.name === 'ShotgunAmmoItem' ||
       item.name === '9×19mm Parabellum' ||
       item.name === '7.62×39mm' ||
       item.name === '12.7×108mm' ||
       item.name === '12 Gauge Shells');
    
    const hasCorrectAmmoType = item.ammoType === this._ammoType;
    
    return isAmmoItem && hasCorrectAmmoType;
  }

  private _consumeFromAmmoItem(ammoItem: any, amount: number): number {
    if (typeof ammoItem.removeFromStack === 'function') {
      return ammoItem.removeFromStack(amount);
    } else {
      return 0;
    }
  }

  private _getAvailableAmmoFromInventory(gamePlayer: any): number {
    let totalAmmo = 0;

    for (let i = 0; i < gamePlayer.hotbar.size; i++) {
      const item = gamePlayer.hotbar.getItemAt(i);
      if (item && this._isAmmoItemForWeapon(item)) {
        totalAmmo += item.quantity;
      }
    }

    for (let i = 0; i < gamePlayer.backpack.size; i++) {
      const item = gamePlayer.backpack.getItemAt(i);
      if (item && this._isAmmoItemForWeapon(item)) {
        totalAmmo += item.quantity;
      }
    }

    return totalAmmo;
  }

  private _saveAmmoData(gamePlayer: any): void {
    for (let i = 0; i < gamePlayer.hotbar.size; i++) {
      const item = gamePlayer.hotbar.getItemAt(i);
      if (item && item instanceof WeaponItem && item.weaponData.id === this._weaponData.id) {
        item.setPersistedAmmo(this.ammo);
        gamePlayer.save();
        return;
      }
    }

    for (let i = 0; i < gamePlayer.backpack.size; i++) {
      const item = gamePlayer.backpack.getItemAt(i);
      if (item && item instanceof WeaponItem && item.weaponData.id === this._weaponData.id) {
        item.setPersistedAmmo(this.ammo);
        gamePlayer.save();
        return;
      }
    }
  }

  private _getAmmoTypeDisplayName(ammoType: string): string {
    const ammoTypeMap: Record<string, string> = {
      'pistol': '9×19mm Parabellum',
      'rifle': '7.62×39mm',
      'sniper': '12.7×108mm',
      'shotgun': '12 Gauge Shells'
    };
    
    return ammoTypeMap[ammoType] || ammoType;
  }

  public getAvailableAmmoFromInventory(gamePlayer: any): number {
    return this._getAvailableAmmoFromInventory(gamePlayer);
  }

  public cleanup(): void {
    this._hideReloadProgress();
  }
} 