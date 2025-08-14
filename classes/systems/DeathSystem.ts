import { type Vector3Like, type World, type EventPayloads, PlayerUIEvent } from 'hytopia';
import GamePlayerEntity from '../GamePlayerEntity';
import GamePlayer from '../GamePlayer';
import WeaponItem from '../weapons/items/WeaponItem';
import ProgressionSystem from './ProgressionSystem';
import WeaponProgressionSystem from './WeaponProgressionSystem';
import PlayerStatsSystem from './PlayerStatsSystem';
import SessionManager from './SessionManager';

export interface DeathEvent {
  player: GamePlayerEntity;
  killer?: GamePlayerEntity;
  damageAmount: number;
  deathLocation: Vector3Like;
}

export class DeathSystem {
  private static _instance: DeathSystem | undefined;

  public static get instance(): DeathSystem {
    if (!this._instance) {
      this._instance = new DeathSystem();
    }
    return this._instance;
  }

  private constructor() {}

  public handlePlayerDeath(
    player: GamePlayerEntity, 
    killer?: GamePlayerEntity,
    damageAmount: number = 0
  ): void {
    if (!player.world) return;

    const deathEvent: DeathEvent = {
      player,
      killer,
      damageAmount,
      deathLocation: { ...player.position }
    };

    // Save ammo data to weapon items before dropping them
    this._saveWeaponAmmoData(player);

    this._dropAllItems(player);

    player.gamePlayer.hotbar.clearAllItems();
    player.gamePlayer.backpack.clearAllItems();

    this._broadcastDeathMessage(player, killer);

    // Award XP and update stats
    try {
      if (killer && killer !== player) {
        ProgressionSystem.addKillXP(killer, player);
        // Weapon-specific progression (increment kill with current weapon if any)
        const killerWeapon = killer.gamePlayer.getCurrentWeapon();
        if (killerWeapon) {
          const weaponId = killerWeapon.weaponData.id;
          WeaponProgressionSystem.incrementKill(killer.player, weaponId);
        }
        PlayerStatsSystem.addKill(killer.player);
      }
      ProgressionSystem.addDeathXP(player);
      PlayerStatsSystem.addDeath(player.player);
    } catch {}

    this._returnToMainMenu(player, killer);
  }

  /**
   * Marks the player as MIA due to raid timer expiration.
   * Drops inventory, clears hotbar/backpack, and returns to menu with MIA banner.
   */
  public handleMIA(player: GamePlayerEntity): void {
    if (!player.world) return;

    console.log(`Handling MIA for player ${player.player.username || player.player.id}`);

    // Save ammo then drop items
    this._saveWeaponAmmoData(player);
    this._dropAllItems(player);

    player.gamePlayer.hotbar.clearAllItems();
    player.gamePlayer.backpack.clearAllItems();

    // Inform player via UI and chat
    try {
      player.world.chatManager.sendPlayerMessage(player.player, 'You went M.I.A. — gear lost', 'FF0000');
    } catch {}

    // Return to main menu with MIA banner
    this._returnToMainMenuMIA(player);
  }

  private _dropAllItems(player: GamePlayerEntity): void {
    if (!player.world) return;

    const dropPosition = { ...player.position };
    dropPosition.y += 0.5;

    let itemsDropped = 0;

    for (let i = 0; i < player.gamePlayer.hotbar.size; i++) {
      const item = player.gamePlayer.hotbar.getItemAt(i);
      if (item) {
        this._dropItem(item, dropPosition, player.world);
        itemsDropped++;
      }
    }

    for (let i = 0; i < player.gamePlayer.backpack.size; i++) {
      const item = player.gamePlayer.backpack.getItemAt(i);
      if (item) {
        this._dropItem(item, dropPosition, player.world);
        itemsDropped++;
      }
    }

    if (itemsDropped > 0) {
      player.world.chatManager.sendBroadcastMessage(
        `${itemsDropped} items dropped from ${player.player.username}'s inventory!`, 
        'FFAA00'
      );
    }
  }

  private _saveWeaponAmmoData(player: GamePlayerEntity): void {
    // Save ammo data from equipped weapon to the corresponding weapon item
    const gun = player.gamePlayer.getCurrentWeapon?.();
    if (gun) {
      const ammo = gun.ammo;
      
      // Find the weapon item in hotbar and backpack and save ammo data
      for (let i = 0; i < player.gamePlayer.hotbar.size; i++) {
        const item = player.gamePlayer.hotbar.getItemAt(i);
        if (item instanceof WeaponItem && item.weaponData.id === gun.weaponData.id) {
          item.setPersistedAmmo(ammo);
          break;
        }
      }
      
      for (let i = 0; i < player.gamePlayer.backpack.size; i++) {
        const item = player.gamePlayer.backpack.getItemAt(i);
        if (item instanceof WeaponItem && item.weaponData.id === gun.weaponData.id) {
          item.setPersistedAmmo(ammo);
          break;
        }
      }
    }
  }

  private _dropItem(item: any, basePosition: Vector3Like, world: World): void {
    // Clone with preserved stack quantity/ammo
    const droppedItem = item.clone();
    
    const offsetX = (Math.random() - 0.5) * 2;
    const offsetZ = (Math.random() - 0.5) * 2;
    const dropPos = {
      x: basePosition.x + offsetX,
      y: basePosition.y,
      z: basePosition.z + offsetZ,
    };

    droppedItem.spawnEntityAsEjectedDrop(world, dropPos);
  }

  private _broadcastDeathMessage(player: GamePlayerEntity, killer?: GamePlayerEntity): void {
    if (!player.world) return;

    let message: string;
    if (killer) {
      message = `${player.player.username} was eliminated by ${killer.player.username}!`;
    } else {
      message = `${player.player.username} has been eliminated!`;
    }

    player.world.chatManager.sendBroadcastMessage(message, 'FF0000');
  }

  private _returnToMainMenu(player: GamePlayerEntity, killer?: GamePlayerEntity): void {
    if (!player.world) return;
    const killedBy = killer?.player?.username || player?.lastDamageSource?.player?.username || undefined;
    
    player.despawn();
    player.gamePlayer.clearCurrentEntity();
    try { SessionManager.instance.clearPlayer(player.gamePlayer); } catch {}
    
    this._goToMainMenu(player);

    // After the menu is loaded by GamePlayer, send death banner
    setTimeout(() => {
      try {
        player.player.ui.sendData({
          type: 'player-death',
          message: killedBy ? `You were eliminated by ${killedBy}` : 'You were eliminated',
        });
      } catch {}
    }, 150);
  }

  private _returnToMainMenuMIA(player: GamePlayerEntity): void {
    if (!player.world) return;
    player.despawn();
    player.gamePlayer.clearCurrentEntity();
    try { SessionManager.instance.clearPlayer(player.gamePlayer); } catch {}
    this._goToMainMenu(player);
    setTimeout(() => {
      try {
        player.player.ui.sendData({ type: 'player-mia', message: 'You went M.I.A.' });
      } catch {}
    }, 150);
  }

  private _goToMainMenu(player: GamePlayerEntity): void {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player.player);
      gamePlayer.loadMenu();
    } catch (error) {
      console.error('Error creating GamePlayer for menu return:', error);
      if (player.player.ui) {
        player.player.ui.load('ui/menu.html');
        player.player.ui.lockPointer(false);
      }
    }
  }
} 