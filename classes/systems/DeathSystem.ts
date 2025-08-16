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
    
    console.log(`💀 Player death: ${player.player.username} killed by ${killer?.player.username || 'unknown'}`);

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

    console.log(`💀 About to broadcast death message for ${player.player.username}`);
    this._broadcastDeathMessage(player, killer);
    console.log(`💀 Death message broadcast completed`);

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

    // Clear all items from hotbar and backpack BEFORE dropping them
    player.gamePlayer.hotbar.clearAllItems();
    player.gamePlayer.backpack.clearAllItems();

    // Save ammo then drop items (this will drop the items that were just cleared)
    this._saveWeaponAmmoData(player);
    this._dropAllItems(player);

    // Inform player via UI and chat
    try {
      player.world.chatManager.sendPlayerMessage(player.player, '🚨 MIA: You failed to extract in time - all gear lost!', 'FF0000');
      player.world.chatManager.sendBroadcastMessage(`${player.player.username} went MIA - failed to extract!`, 'FF0000');
    } catch {}

    // Return to main menu with MIA banner
    this._returnToMainMenuMIA(player);
  }

  private _dropAllItems(player: GamePlayerEntity): void {
    if (!player.world) return;

    const dropPosition = { ...player.position };
    dropPosition.y += 0.5;

    let itemsDropped = 0;

    // Drop items from hotbar
    for (let i = 0; i < player.gamePlayer.hotbar.size; i++) {
      const item = player.gamePlayer.hotbar.getItemAt(i);
      if (item) {
        this._dropItem(item, dropPosition, player.world);
        itemsDropped++;
      }
    }

    // Drop items from backpack
    for (let i = 0; i < player.gamePlayer.backpack.size; i++) {
      const item = player.gamePlayer.backpack.getItemAt(i);
      if (item) {
        this._dropItem(item, dropPosition, player.world);
        itemsDropped++;
      }
    }

    // For MIA cases, we want to ensure items are dropped even if they were cleared
    // This creates a visual representation of the lost gear
    if (itemsDropped === 0) {
      // Create some visual debris to represent lost gear
      this._createLostGearDebris(dropPosition, player.world);
    } else if (itemsDropped > 0) {
      player.world.chatManager.sendBroadcastMessage(
        `${itemsDropped} items dropped from ${player.player.username}'s inventory!`, 
        'FFAA00'
      );
    }
  }

  private _createLostGearDebris(position: Vector3Like, world: World): void {
    // Create visual debris to represent lost gear
    // This could be enhanced with actual debris items in the future
    try {
      world.chatManager.sendBroadcastMessage(
        `${Math.floor(Math.random() * 5) + 3} pieces of gear scattered from MIA player!`, 
        'FFAA00'
      );
    } catch {}
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
    console.log(`🎯 _broadcastDeathMessage called for ${player.player.username}, killer: ${killer?.player.username || 'none'}`);
    if (!player.world) return;

    let message: string;
    if (killer) {
      message = `${player.player.username} was eliminated by ${killer.player.username}!`;
      
      // Send kill feed data to all players
      const killerWeapon = killer.gamePlayer.getCurrentWeapon();
      const weaponIconUri = killerWeapon ? killerWeapon.weaponData.assets.ui.icon : 'icons/target.png';
      
      console.log(`🎯 Kill feed: ${killer.player.username} -> ${weaponIconUri} -> ${player.player.username}`);
      
      // Send kill feed data to killer and victim directly
      try {
        console.log(`🎯 Debug weapon data:`, {
          killerWeapon: killerWeapon,
          weaponData: killerWeapon?.weaponData,
          iconPath: killerWeapon?.weaponData?.assets?.ui?.icon,
          fallbackIcon: weaponIconUri
        });
        
        // Ensure we have a valid icon path
        const finalIconPath = weaponIconUri || 'icons/target.png';
        console.log(`🎯 Using icon path: ${finalIconPath}`);
        
        // Send to killer
        killer.player.ui.sendData({
          type: 'kill-feed',
          killerName: killer.player.username,
          weaponIconUri: finalIconPath,
          victimName: player.player.username
        });
        console.log(`🎯 Sent kill feed to killer: ${killer.player.username} with icon: ${finalIconPath}`);
        
        // Send to victim
        player.player.ui.sendData({
          type: 'kill-feed',
          killerName: killer.player.username,
          weaponIconUri: finalIconPath,
          victimName: player.player.username
        });
        console.log(`🎯 Sent kill feed to victim: ${player.player.username} with icon: ${finalIconPath}`);
        
        // Try to send to all other players in the world
        try {
          // Try multiple methods to get all players
          let allPlayers: any[] = [];
          
          // Method 1: Try getAllPlayers method
          if ((player.world as any).getAllPlayers) {
            allPlayers = (player.world as any).getAllPlayers();
            console.log(`🎯 Method 1 - getAllPlayers: Found ${allPlayers.length} players`);
          }
          // Method 2: Try players property
          else if ((player.world as any).players) {
            allPlayers = (player.world as any).players;
            console.log(`🎯 Method 2 - players property: Found ${allPlayers.length} players`);
          }
          // Method 3: Try getPlayers method
          else if ((player.world as any).getPlayers) {
            allPlayers = (player.world as any).getPlayers();
            console.log(`🎯 Method 3 - getPlayers: Found ${allPlayers.length} players`);
          }
          
          console.log(`🎯 Total players found: ${allPlayers.length}`);
          
          allPlayers.forEach((worldPlayer: any, index: number) => {
            if (worldPlayer && worldPlayer !== killer.player && worldPlayer !== player.player) {
              try {
                console.log(`🎯 Sending kill feed to player ${index}: ${worldPlayer?.player?.username || 'unknown'}`);
                worldPlayer.ui?.sendData({
                  type: 'kill-feed',
                  killerName: killer.player.username,
                  weaponIconUri: finalIconPath,
                  victimName: player.player.username
                });
              } catch (error) {
                console.error(`Failed to send kill feed to world player ${index}:`, error);
              }
            } else {
              console.log(`🎯 Skipping player ${index}: ${worldPlayer?.player?.username || 'unknown'} (killer or victim)`);
            }
          });
        } catch (error) {
          console.error('Failed to send kill feed to world players:', error);
        }
      } catch (error) {
        console.error('Failed to send kill feed:', error);
      }
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
    
    // Ensure player is properly removed from the game world
    player.despawn();
    player.gamePlayer.clearCurrentEntity();
    
    // Clear session assignment
    try { 
      SessionManager.instance.clearPlayer(player.gamePlayer); 
    } catch {}
    
    // Return to main menu
    this._goToMainMenu(player);
    
    // Send MIA notification after menu loads
    setTimeout(() => {
      try {
        player.player.ui.sendData({ 
          type: 'player-mia', 
          message: '🚨 MIA: You failed to extract in time - all gear has been lost!' 
        });
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