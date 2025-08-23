import { Player, PlayerUIEvent, type EventPayloads } from 'hytopia';
import type GamePlayer from '../GamePlayer';
import WeaponEntity from '../weapons/entities/WeaponEntity';
import BaseWeaponItem from '../items/BaseWeaponItem';
import WeaponItem from '../weapons/items/WeaponItem';
import MedkitItem from '../items/MedkitItem';

export class WeaponUIHandler {
  private gamePlayer: GamePlayer;
  private player: Player;
  private _gun: WeaponEntity | undefined;
  private _lastCrosshairState: boolean | null = null;

  constructor(gamePlayer: GamePlayer) {
    this.gamePlayer = gamePlayer;
    this.player = gamePlayer.player;
  }

  public get currentWeapon(): WeaponEntity | undefined {
    return this._gun;
  }

  public set currentWeapon(weapon: WeaponEntity | undefined) {
    this._gun = weapon;
  }

  public handleHotbarSelectionChanged(
    selectedItem: BaseWeaponItem | null, 
    lastItem: BaseWeaponItem | null
  ): void {
    // Notify weapon system about weapon switch to reset crosshair state
    if (this.gamePlayer.currentEntity) {
      this.gamePlayer.currentEntity.weaponSystem.onWeaponSwitch();
    }
    
    if (this._gun) {
      if (lastItem instanceof WeaponItem) {
        this.saveWeaponAmmoData(lastItem, this._gun);
      }
      this._gun.unequip();
      this._gun.despawn();
      this._gun = undefined;
    }
    
    if (this.gamePlayer.currentEntity) {
      this.gamePlayer.currentEntity.medkitSystem.cleanup();
    }
    
    this.hideAmmoIndicator();
    
    if (!selectedItem && this.gamePlayer.currentEntity) {
      this.gamePlayer.currentEntity.weaponSystem.updateWeapon({});
      
      // Only send update if state has changed
      if (this._lastCrosshairState !== false) {
        this._lastCrosshairState = false;
        
        this.player.ui.sendData({
          type: 'crosshair-state',
          canFire: false
        });
      }
    }
    
    if (selectedItem instanceof BaseWeaponItem && this.gamePlayer.currentEntity) {
      this.equipWeapon(selectedItem);
      
      if (this._gun) {
        (this._gun as WeaponEntity).updateFireRateIndicator();
      }
    }
    
    // Handle medkit selection - create and equip medkit entity
    if (selectedItem instanceof MedkitItem && this.gamePlayer.currentEntity) {
      this.gamePlayer.currentEntity.medkitSystem.equipMedkit(selectedItem);
    }
  }

  public spawnHeldItem(): void {
    if (this.gamePlayer.currentEntity && this.gamePlayer.hotbar.selectedItem instanceof BaseWeaponItem) {
      this.equipWeapon(this.gamePlayer.hotbar.selectedItem);
    }
  }

  public updateAmmoIndicator(): void {
    if (this._gun) {
      this._gun.updateAmmoIndicatorUI();
    }
  }

  public hideAmmoIndicator(): void {
    if (!this.player) return;
    
    this.player.ui.sendData({
      type: 'ammo-indicator',
      show: false
    });
    
    this.player.ui.sendData({
      type: 'reload-prompt',
      show: false
    });
  }

  public cleanupWeaponData(): void {
    const containers = [this.gamePlayer.hotbar, this.gamePlayer.backpack];
    
    for (const container of containers) {
      for (let i = 0; i < container.size; i++) {
        const item = container.getItemAt(i);
        if (item instanceof WeaponItem) {
          item.setPersistedAmmo(0);
        }
      }
    }
  }

  public saveWeaponAmmoData(weaponItem: BaseWeaponItem, gun: WeaponEntity): void {
    if (weaponItem instanceof WeaponItem) {
      weaponItem.setPersistedAmmo(gun.ammo);
      this.gamePlayer.save();
    }
  }

  public unequipAndDespawn(): void {
    if (this._gun) {
      try {
        this._gun.unequip();
        this._gun.despawn();
      } catch {}
      this._gun = undefined;
      this.hideAmmoIndicator();
    }
  }

  private equipWeapon(weaponItem: BaseWeaponItem): void {
    if (!this.gamePlayer.currentEntity?.world) return;

    if (weaponItem instanceof WeaponItem) {
      const weaponEntity = new WeaponEntity({
        weaponData: weaponItem.weaponData,
        ammo: weaponItem.persistedAmmo || 0,
      });
      
      this._gun = weaponEntity;
      
      weaponEntity.spawn(
        this.gamePlayer.currentEntity.world, 
        { x: 0, y: 0, z: 0 }, 
        { x: 0, y: 0, z: 0, w: 1 }
      );
      
      const handAnchor = weaponEntity.heldHand === 'left' ? 'hand_left_anchor' : 'hand_right_anchor';
      weaponEntity.setParent(this.gamePlayer.currentEntity, handAnchor);
      
      weaponEntity.setParentAnimations();
      weaponEntity.equip();
      weaponEntity.updateAmmoIndicatorUI();
      
      if (weaponEntity.ammo <= 0) {
        this.player.ui.sendData({
          type: 'reload-prompt',
          show: true,
          message: 'Press R to Reload!'
        });
      }
    }
  }
}
