import {
  type EventPayloads,
  Player,
  PlayerUIEvent,
} from 'hytopia';

import Backpack from './systems/Backpack';
import Hotbar from './systems/Hotbar';
import Stash from './systems/Stash';

import type BaseItem from './items/BaseItem';
import GamePlayerEntity from './GamePlayerEntity';
import ItemInventory, { type SerializedItemInventoryData } from './systems/ItemInventory';
import { ItemRegistry } from './items/ItemRegistry';
import BaseWeaponItem from './items/BaseWeaponItem';
import WeaponItem from './weapons/items/WeaponItem';

import PistolAmmoItem from './items/ammo/PistolAmmoItem';
import RifleAmmoItem from './items/ammo/RifleAmmoItem';
import SniperAmmoItem from './items/ammo/SniperAmmoItem';
import ShotgunAmmoItem from './items/ammo/ShotgunAmmoItem';
import MedkitItem from './items/MedkitItem';

import WeaponEntity from './weapons/entities/WeaponEntity';
import { WeaponFactory } from './weapons/WeaponFactory';
import PlayerStatsSystem from './systems/PlayerStatsSystem';
import WeaponProgressionSystem from './systems/WeaponProgressionSystem';
import SessionManager from './systems/SessionManager';

// Register ammo items
ItemRegistry.registerItem(PistolAmmoItem);
ItemRegistry.registerItem(RifleAmmoItem);
ItemRegistry.registerItem(SniperAmmoItem);
ItemRegistry.registerItem(ShotgunAmmoItem);
ItemRegistry.registerItem(MedkitItem);

interface PlayerPersistedData extends Record<string, unknown> {
  backpack: SerializedItemInventoryData;
  hotbar: SerializedItemInventoryData;
  stash: SerializedItemInventoryData;
  currency?: number;
}

interface MoveItemData {
  from?: string;
  fromType?: string;
  to?: string;
  toType?: string;
  fromIndex: number;
  toIndex: number;
}

interface DropItemData {
  fromType: string;
  fromIndex: number;
}

interface QuickMoveItemData {
  fromType: string;
  fromIndex: number;
}

export default class GamePlayer {
  private static _instances: Map<string, GamePlayer> = new Map();
  
  public readonly player: Player;
  public readonly backpack: Backpack;
  public readonly hotbar: Hotbar;
  public readonly stash: Stash;

  private _currentEntity: GamePlayerEntity | undefined;
  private _isBackpackOpen: boolean = false;
  private _inventoryTransitioning: boolean = false;
  private _saveTimeout: NodeJS.Timeout | undefined;
  private _gun: WeaponEntity | undefined;
  private _isInMenu: boolean = true;
  private _isDestroyed: boolean = false;
  private _isCrateOpen: boolean = false;
	private _isDeploying: boolean = false;
	private _pendingDeploy: boolean = false;

  private constructor(player: Player) {
    this.player = player;
    this.backpack = new Backpack(this);
    this.hotbar = new Hotbar(this);
    this.stash = new Stash(player);

    this.hotbar.onSelectedItemChanged = this._onHotbarSelectedItemChanged;
  }

  // ===== Static Methods =====
  
  public static getOrCreate(player: Player): GamePlayer {
    if (!player?.world) {
      throw new Error('Player is not in a valid world state');
    }
    
    const playerId = this._getPlayerId(player);
    let gamePlayer = this._instances.get(playerId);
    
    if (!gamePlayer) {
      gamePlayer = new GamePlayer(player);
      gamePlayer.load();
      this._instances.set(playerId, gamePlayer);
    }

    return gamePlayer;
  }

  public static remove(player: Player): void {
    if (!player) return;
    
    const playerId = this._getPlayerId(player);
    const gamePlayer = this._instances.get(playerId);
    if (gamePlayer) {
      gamePlayer.destroy();
      this._instances.delete(playerId);
    }
  }

  private static _getPlayerId(player: Player): string {
    return player.id || player.username || 'unknown';
  }

  // ===== Public Methods =====

  public get currentEntity(): GamePlayerEntity | undefined {
    return this._currentEntity;
  }

  public get isBackpackOpen(): boolean {
    return this._isBackpackOpen;
  }

  public get isInMenu(): boolean {
    return this._isInMenu;
  }

  public get isCrateOpen(): boolean {
    return this._isCrateOpen;
  }

  public getCurrency(): number {
    try {
      const data = (this.player.getPersistedData?.() as any) || {};
      return Math.max(0, Math.floor((data as any)?.currency ?? 0));
    } catch {
      return 0;
    }
  }

  public setCurrency(amount: number): void {
    try {
      this.player.setPersistedData({ currency: Math.max(0, Math.floor(amount)) });
    } catch {}
  }

  public addCurrency(amount: number, reason?: string): void {
    const current = this.getCurrency();
    this.setCurrency(current + Math.floor(amount));
    this._notifyCurrency(`${amount >= 0 ? '+' : ''}${Math.floor(amount)} CR${reason ? ` (${reason})` : ''}`);
  }

  public spendCurrency(amount: number, reason?: string): boolean {
    const current = this.getCurrency();
    const spend = Math.floor(amount);
    if (spend <= 0) return true;
    if (current < spend) return false;
    this.setCurrency(current - spend);
    this._notifyCurrency(`-${spend} CR${reason ? ` (${reason})` : ''}`);
    return true;
  }

  public getCurrentWeapon(): WeaponEntity | undefined {
    return this._gun;
  }

  public clearCurrentEntity(): void {
    this._currentEntity = undefined;
  }

  public destroy(): void {
    if (this._isDestroyed) return;
    
    this._isDestroyed = true;
    
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = undefined;
    }
    
    this._cleanupAllWeaponData();
    
    if (this._currentEntity) {
      this._currentEntity.despawn();
      this._currentEntity = undefined;
    }
    
    this.player.ui.off(PlayerUIEvent.DATA, this._onPlayerUIData);
    this.player.ui.off(PlayerUIEvent.DATA, this._onMenuUIData);
  }

  public load(): void {
    try {
      const serializedData = this.player.getPersistedData();
      
      if (serializedData) {
        const success = this._loadFromSerializedData(serializedData as PlayerPersistedData);
        if (!success) {
          this._loadDefaultItems();
        }
      } else {
        this._loadDefaultItems();
      }
    } catch (error) {
      console.error('Failed to load player data:', error);
      this._loadDefaultItems();
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
          this.player.setPersistedData(this._serialize());
        } catch (error) {
          console.error('Failed to save player data:', error);
        }
      }
    }, 500);
  }

  public loadMenu(): void {
    this._isInMenu = true;
    this.player.ui.load('ui/menu.html');
    // Ensure only menu handler is active
    this.player.ui.off(PlayerUIEvent.DATA, this._onProgressionUIData);
    this.player.ui.off(PlayerUIEvent.DATA, this._onPlayerUIData);
    this.player.ui.on(PlayerUIEvent.DATA, this._onMenuUIData);
    this.player.ui.lockPointer(false);
    
    this._syncAllUI();
    
    if (this._gun) {
      this._gun.updateAmmoIndicatorUI();
    }
    
    // Create a party for the player if they don't have one
    try {
      const { PartySystem } = require('./systems/PartySystem');
      const partyData = PartySystem.instance.getPartyData(this.player.id);
      if (!partyData) {
        PartySystem.instance.createParty(this.player);
      }
    } catch (error) {
      console.error('Error creating party:', error);
    }
    

    
    this.player.ui.sendData({ type: 'enterMenu' });
  }

  public deploy(): void {
    if (this._currentEntity || !this.player.world) return;
    if (!SessionManager.instance.beforeDeploy(this)) return;

		// If a world transfer was triggered by session selection, wait until it completes.
    try {
      const pid = (this.player as any).id || this.player.username;
      if (SessionManager.instance.isTransferringById(pid)) {
				this._pendingDeploy = true;
				return; // onJoined handler will resume deploy after transfer completes
      }
    } catch {}

		if (this._isDeploying) return;
		this._isDeploying = true;
		this._pendingDeploy = false;

    // Check if player is in a party and handle deployment accordingly
    try {
      const { PartySystem } = require('./systems/PartySystem');
      const partyData = PartySystem.instance.getPartyData(this.player.id);
      
      if (partyData && partyData.members.length > 1) {
        const playerMember = partyData.members.find(member => member.playerId === this.player.id);
        if (playerMember && playerMember.isHost) {
          // Player is party host, deploy entire party
          console.log(`🎯 Party host ${this.player.username} initiating party deployment`);
          const success = PartySystem.instance.initiateDeploy(this.player);
          if (success) {
            this._isDeploying = false;
            return; // Party deployment handled by PartySystem
          } else {
            console.log(`🎯 Party deployment failed for ${this.player.username}`);
          }
        } else if (partyData) {
          // Player is in party but not host, show message
          console.log(`🎯 Non-host player ${this.player.username} tried to deploy party`);
          this.player.ui.sendData({
            type: 'show-message',
            message: 'Only the party host can deploy the group.',
            messageType: 'error'
          });
          this._isDeploying = false;
          return;
        }
      } else if (partyData && partyData.members.length === 1) {
        // Solo player, allow deployment
        console.log(`🎯 Solo player ${this.player.username} deploying`);
      }
    } catch (error) {
      console.error('Error checking party status:', error);
    }

    // Solo deployment
    this._deploySolo();
  }

  /**
   * Deploys a party member (bypasses party checks)
   */
  public deployPartyMember(): void {
    console.log(`🎯 Deploying party member: ${this.player.username}`);
    this._deploySolo();
  }

  private _deploySolo(): void {
    this._isInMenu = false;
    // Ensure menu-related listeners are detached so UI events cannot bring the user back to menu while in-game
    try {
      this.player.ui.off(PlayerUIEvent.DATA, this._onMenuUIData);
      this.player.ui.off(PlayerUIEvent.DATA, this._onProgressionUIData);
      this.player.ui.off(PlayerUIEvent.DATA, this._onStashUIData);
    } catch {}
    const playerEntity = new GamePlayerEntity(this);
    playerEntity.spawn(this.player.world, { x: 31, y: 30, z: 6 });
    
    this.player.camera.setAttachedToEntity(playerEntity);
    this.player.ui.load('ui/index.html');
    this.player.ui.on(PlayerUIEvent.DATA, this._onPlayerUIData);
    this.player.ui.lockPointer(true);
    
    // Ensure HUD is properly initialized for the session
    const sessionId = SessionManager.instance.getPlayerSessionId(this);
    if (sessionId) {
      const secondsLeft = SessionManager.instance.getSecondsLeftForSession(sessionId);
      if (typeof secondsLeft === 'number') {
        const session = SessionManager.instance.getMenuSessionSummaries().find(s => s.id === sessionId);
        if (session) {
          this.player.ui.sendData({ 
            type: 'raid-timer', 
            secondsLeft, 
            totalSeconds: session.durationSeconds, 
            sessionId: session.id, 
            worldHour: session.worldHour, 
            worldMinute: session.worldMinute,
            worldTimeFormatted: session.worldTimeFormatted
          });
        }
      }
    }
    
		this.player.ui.sendData({ type: 'exitMenu' });
		this._isDeploying = false;
  }

	public resumeDeployAfterTransfer(): void {
		if (!this._pendingDeploy) return;
		this.deploy();
	}

  public rejoin(): void {
    if (this._currentEntity) {
      this._currentEntity.despawn();
      this._currentEntity = undefined;
    }

    this.backpack.clearAllItems();
    this.hotbar.clearAllItems();
    this._gun = undefined;

    this.deploy();
  }

  public setCrateOpen(open: boolean): void {
    this._isCrateOpen = !!open;
  }

  /**
   * Called by ExtractionSystem when the player has completed extraction.
   * Moves raid inventory (hotbar + backpack) into stash, saves, and returns to menu.
   */
  public completeExtraction(zoneName: string): void {
    // Persist current weapon ammo to the corresponding inventory item, if any
    try {
      const currentGun = this._gun;
      if (currentGun) {
        const weaponId = currentGun.weaponData.id;
        const ammoToPersist = currentGun.ammo;
        let matchedItem: BaseItem | null = null;
        for (let i = 0; i < this.hotbar.size; i++) {
          const item = this.hotbar.getItemAt(i);
          if (item instanceof WeaponItem && item.weaponData.id === weaponId) {
            matchedItem = item;
            break;
          }
        }
        if (!matchedItem) {
          for (let i = 0; i < this.backpack.size; i++) {
            const item = this.backpack.getItemAt(i);
            if (item instanceof WeaponItem && item.weaponData.id === weaponId) {
              matchedItem = item;
              break;
            }
          }
        }
        if (matchedItem instanceof WeaponItem) {
          matchedItem.setPersistedAmmo(ammoToPersist);
        }
      }
    } catch {}

    // Safely unequip and despawn current weapon entity to avoid animation calls after despawn
    if (this._gun) {
      try {
        this._gun.unequip();
        this._gun.despawn();
      } catch {}
      this._gun = undefined;
      this._hideAmmoIndicator();
    }

    // Keep items in their current containers (hotbar/backpack) on extraction

    // Despawn from world and go to main menu
    if (this._currentEntity) {
      try {
        this._currentEntity.despawn();
      } catch {}
      this._currentEntity = undefined;
    }
    // _gun already cleared above

    // Persist
    this.save();

    // Clear session assignment upon successful extraction
    try { SessionManager.instance.onExtractionSuccess(this); } catch {}

    // Load menu and notify success (slight delay to ensure UI listeners are ready)
    this.loadMenu();
    setTimeout(() => {
      try {
        this.player.ui.sendData({
          type: 'extraction-success',
          zoneName,
          message: 'Successful Extraction',
        });
      } catch {}
    }, 100);
  }

  public dropItem(fromType: string, fromIndex: number): void {
    const container = this._getContainerByType(fromType);
    if (!container || !this._currentEntity?.world) return;
    
    const droppedItem = container.getItemAt(fromIndex);
    if (!droppedItem) return;
    
    if (droppedItem instanceof BaseWeaponItem && this._gun) {
      this._saveWeaponAmmoData(droppedItem, this._gun);
      this._gun.unequip();
      this._gun.despawn();
      this._gun = undefined;
      this._hideAmmoIndicator();
    }
    
    const removedItem = container.removeItem(fromIndex);
    if (!removedItem) return;
    
    removedItem.spawnEntityAsEjectedDrop(
      this._currentEntity.world, 
      this._currentEntity.position, 
      this._currentEntity.directionFromRotation
    );
    
    if (this._gun) {
      this._gun.updateAmmoIndicatorUI();
    }
  }

  public openInventory(): void {
    if (this._isBackpackOpen) return;
    this._handleInventoryAction('open', 'inventory');
  }

  public closeInventory(): void {
    if (!this._isBackpackOpen) return;
    this._handleInventoryAction('close', 'inventory');
  }

  public closeStash(): void {
    // Dedicated stash page now handles closing by returning to menu
    this.loadMenu();
  }

  public openStash(): void {
    if (!this._isInMenu) return;
    this._loadStashUI();
  }

  public serialize(): PlayerPersistedData {
    return this._serialize();
  }

  // ===== Private Methods =====

  private _loadDefaultItems(): void {
    const startingPistol = WeaponFactory.create('m9_beretta');
    const startingAmmo = PistolAmmoItem.create({ quantity: 50 });
    
    this.hotbar.addItem(startingPistol);
    this.hotbar.addItem(startingAmmo);
    this.hotbar.setSelectedIndex(0);
    // Initialize currency for new players
    this.setCurrency(this.getCurrency());
  }

  private _loadFromSerializedData(persistedData: PlayerPersistedData): boolean {
    try {
      if (!persistedData || typeof persistedData !== 'object') {
        console.warn('Invalid persisted data structure, using defaults');
        return false;
      }

      const loadResults = [
        this._loadInventoryData('backpack', persistedData.backpack, this.backpack),
        this._loadInventoryData('hotbar', persistedData.hotbar, this.hotbar),
        this._loadInventoryData('stash', persistedData.stash, this.stash)
      ];

      if (typeof persistedData.currency === 'number') {
        this.setCurrency(persistedData.currency);
      }

      return loadResults.every(result => result);
    } catch (error) {
      console.error('Failed to deserialize GamePlayer data:', error);
      return false;
    }
  }

  private _loadInventoryData(name: string, data: any, inventory: ItemInventory): boolean {
    if (data) {
      try {
        inventory.loadFromSerializedData(data);
        return true;
      } catch (error) {
        console.warn(`Failed to load ${name} data:`, error);
        return false;
      }
    } else {
      console.warn(`No ${name} data found in persisted data`);
      return false;
    }
  }

  private _saveWeaponAmmoData(weaponItem: BaseWeaponItem, gun: WeaponEntity): void {
    if (weaponItem instanceof WeaponItem) {
      weaponItem.setPersistedAmmo(gun.ammo);
      this.save();
    }
  }

  private _hideAmmoIndicator(): void {
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

  private _getContainerByType(type: string): ItemInventory | null {
    switch (type) {
      case 'backpack': return this.backpack;
      case 'hotbar': return this.hotbar;
      case 'stash': return this.stash;
      default: return null;
    }
  }

  private _equipWeapon(weaponItem: BaseWeaponItem): void {
    if (!this._currentEntity?.world) return;

    if (weaponItem instanceof WeaponItem) {
      const weaponEntity = new WeaponEntity({
        weaponData: weaponItem.weaponData,
        ammo: weaponItem.persistedAmmo || 0,
      });
      
      this._gun = weaponEntity;
      
      weaponEntity.spawn(
        this._currentEntity.world, 
        { x: 0, y: 0, z: 0 }, 
        { x: 0, y: 0, z: 0, w: 1 }
      );
      
      const handAnchor = weaponEntity.heldHand === 'left' ? 'hand_left_anchor' : 'hand_right_anchor';
      weaponEntity.setParent(this._currentEntity, handAnchor);
      
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
    } else {
      console.error('Invalid weapon type. Only WeaponItem is supported.');
    }
  }

  private _spawnHeldItem(): void {
    if (this._currentEntity && this.hotbar.selectedItem instanceof BaseWeaponItem) {
      this._equipWeapon(this.hotbar.selectedItem);
    }
  }

  private _onHotbarSelectedItemChanged = (
    selectedItem: BaseItem | null, 
    lastItem: BaseItem | null
  ) => {
    if (this._gun) {
      if (lastItem instanceof BaseWeaponItem) {
        this._saveWeaponAmmoData(lastItem, this._gun);
      }
      this._gun.unequip();
      this._gun.despawn();
      this._gun = undefined;
    }
    
    if (this._currentEntity) {
      this._currentEntity.medkitSystem.cleanup();
    }
    
    this._hideAmmoIndicator();
    
    if (!selectedItem && this._currentEntity) {
      this._currentEntity.weaponSystem.updateWeapon({});
      
      this.player.ui.sendData({
        type: 'crosshair-state',
        canFire: false
      });
    }
    
    if (selectedItem instanceof BaseWeaponItem && this._currentEntity) {
      this._equipWeapon(selectedItem);
      
      if (this._gun) {
        (this._gun as WeaponEntity).updateFireRateIndicator();
      }
    }
    
    // Handle medkit selection - create and equip medkit entity
    if (selectedItem instanceof MedkitItem && this._currentEntity) {
      this._currentEntity.medkitSystem.equipMedkit(selectedItem);
    }
  }

  private _handleMoveItem(data: MoveItemData): void {
    const fromType = data.from || data.fromType;
    const toType = data.to || data.toType;
    const fromIndex = parseInt(data.fromIndex.toString());
    const toIndex = parseInt(data.toIndex.toString());

    if (!fromType || !toType) {
      console.warn('Invalid move item data: missing fromType or toType');
      return;
    }

    // Server-side guard: stash moves are only valid when in menu context
    if ((fromType === 'stash' || toType === 'stash') && !this._isInMenu) {
      console.warn('Blocked stash move outside of menu context');
      return;
    }

    const source = this._getContainerByType(fromType);
    const dest = this._getContainerByType(toType);

    if (!source || !dest) {
      console.warn(`Invalid container types: ${fromType} -> ${toType}`);
      return;
    }

    this._moveInventoryItem(source, dest, fromIndex, toIndex);
  }

  private _handleQuickMoveItem(data: QuickMoveItemData): void {
    const fromType = data.fromType;
    const fromIndex = parseInt(data.fromIndex.toString());

    const source = this._getContainerByType(fromType);
    if (!source) {
      console.warn(`Invalid quick-move source: ${fromType}`);
      return;
    }

    const item = source.getItemAt(fromIndex);
    if (!item) return;

    const allCandidates = this._getQuickMoveTargets(fromType);
    // Enforce stash access only in menu context
    const candidates = this._isInMenu ? allCandidates : allCandidates.filter(t => t !== 'stash');
    const removed = source.removeItem(fromIndex);
    if (!removed) return;

    let placed = false;
    for (const destType of candidates) {
      const dest = this._getContainerByType(destType);
      if (!dest) continue;
      if (dest.addItem(removed)) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Restore to original slot
      source.addItem(removed, fromIndex);
      return;
    }

    if (this._gun) {
      try { this._gun.updateAmmoIndicatorUI(); } catch {}
    }
    this.save();
  }

  private _getQuickMoveTargets(fromType: string): string[] {
    // In-game inventory has only backpack/hotbar; stash UI runs in menu context
    if (fromType === 'backpack') {
      return this._isInMenu ? ['stash', 'hotbar'] : ['hotbar'];
    }
    if (fromType === 'hotbar') {
      return this._isInMenu ? ['stash', 'backpack'] : ['backpack'];
    }
    if (fromType === 'stash') {
      return ['backpack', 'hotbar'];
    }
    return [];
  }

  private _moveInventoryItem(
    source: ItemInventory,
    dest: ItemInventory,
    fromIndex: number,
    toIndex: number,
  ): void {
    const item = source.removeItem(fromIndex);
    if (!item) return;

    // Exact placement only when an explicit toIndex is provided
    const placedExactly = dest.addItem(item, toIndex);
    if (!placedExactly) {
      // Restore to original index if exact destination is not available
      source.addItem(item, fromIndex);
      return;
    }

    if (this._gun) {
      try { this._gun.updateAmmoIndicatorUI(); } catch {}
    }
    this.save();
  }

  private _handleInventoryAction(action: 'open' | 'close', type: 'inventory' | 'stash'): void {
    if (this._inventoryTransitioning) return;
    
    this._inventoryTransitioning = true;
    
    if (action === 'open') {
      this._isBackpackOpen = true;
      this.player.ui.sendData({ type: `show${type.charAt(0).toUpperCase() + type.slice(1)}` });
      
      if (type === 'stash' && !this._isInMenu) {
        this._inventoryTransitioning = false;
        return;
      }
      
      this._syncAllUI();
      
      if (this._gun) {
        this._gun.updateAmmoIndicatorUI();
      }
    } else {
      this._isBackpackOpen = false;
      this.player.ui.sendData({ type: `hide${type.charAt(0).toUpperCase() + type.slice(1)}` });
    }
    
    this._inventoryTransitioning = false;
  }

  private _handleDropItem(data: DropItemData): void {
    const fromIndex = parseInt(data.fromIndex.toString());
    this.dropItem(data.fromType, fromIndex);
  }

  private _syncAllUI(): void {
    this.backpack.syncUI(this.player);
    this.hotbar.syncUI(this.player);
    this.stash.syncUI(this.player);
  }

  private _onMenuUIData = async (event: EventPayloads[PlayerUIEvent.DATA]) => {
    const { data } = event;
    
    switch (data.type) {
      case 'deploy':
        this.deploy();
        break;
      case 'selectSession':
        if (typeof data.sessionId === 'string') {
          try { SessionManager.instance.handleSelectSession(this, data.sessionId); this._sendMenuHud(); } catch {}
        }
        break;
      case 'openStash':
      case 'openProgression':
        // Prevent opening other menus unless currently in menu
        if (!this._isInMenu) return;
        if (data.type === 'openStash') this.openStash();
        else this._loadProgressionUI();
        break;
      case 'rejoin':
        this.rejoin();
        break;
      case 'requestMenuHud':
        this._sendMenuHud();
        this._sendWeaponProgress();
        break;
      case 'openInventory':
        this.openInventory();
        break;
      case 'requestProgressOverview':
        this._sendProgressOverview();
        break;
      case 'closeInventory':
        this.closeInventory();
        break;
      case 'closeStash':
        this.closeStash();
        break;
      case 'moveItem':
        this._handleMoveItem(data as MoveItemData);
        break;
      case 'quickMoveItem':
        this._handleQuickMoveItem(data as QuickMoveItemData);
        break;
      case 'dropItem':
        this._handleDropItem(data as DropItemData);
        break;
      case 'close':
        this.player.ui.off(PlayerUIEvent.DATA, this._onMenuUIData);
        break;
      // Party system events
      case 'send-party-invite':
        if (typeof data.username === 'string') {
          try {
            const { PartySystem } = await import('./systems/PartySystem');
            PartySystem.instance.sendInvite(this.player, data.username);
          } catch (error) {
            console.error('Failed to send party invite:', error);
          }
        }
        break;
      case 'accept-party-invite':
        if (typeof data.inviteId === 'string') {
          try {
            const { PartySystem } = await import('./systems/PartySystem');
            PartySystem.instance.acceptInvite(this.player, data.inviteId);
          } catch (error) {
            console.error('Failed to accept party invite:', error);
          }
        }
        break;
      case 'decline-party-invite':
        if (typeof data.inviteId === 'string') {
          try {
            const { PartySystem } = await import('./systems/PartySystem');
            PartySystem.instance.declineInvite(this.player, data.inviteId);
          } catch (error) {
            console.error('Failed to decline party invite:', error);
          }
        }
        break;
      case 'leave-party':
        try {
          const { PartySystem } = await import('./systems/PartySystem');
          PartySystem.instance.leaveParty(this.player);
        } catch (error) {
          console.error('Failed to leave party:', error);
        }
        break;
      case 'kick-player':
        if (typeof data.username === 'string') {
          try {
            const { PartySystem } = await import('./systems/PartySystem');
            const success = PartySystem.instance.kickPlayer(this.player, data.username);
            if (!success) {
              this.player.ui.sendData({
                type: 'show-message',
                message: 'Failed to kick player. Make sure you are the party host.',
                messageType: 'error'
              });
            }
          } catch (error) {
            console.error('Failed to kick player:', error);
            this.player.ui.sendData({
              type: 'show-message',
              message: 'Failed to kick player.',
              messageType: 'error'
            });
          }
        }
        break;

    }
  }

  private _onPlayerUIData = (event: EventPayloads[PlayerUIEvent.DATA]) => {
    const { data } = event;

    switch (data.type) {
      case 'setSelectedHotbarIndex':
        this.hotbar.setSelectedIndex(data.index);
        break;
      case 'useHotbarItem':
        const selectedItem = this.hotbar.selectedItem;
        if (selectedItem) {
          selectedItem.useMouseLeft();
        }
        break;
      case 'openInventory':
      case 'inventoryOpened':
        this.openInventory();
        break;
      case 'inventoryClosed':
        this.closeInventory();
        break;
      case 'moveItem':
        this._handleMoveItem(data as MoveItemData);
        break;
      case 'quickMoveItem':
        this._handleQuickMoveItem(data as QuickMoveItemData);
        break;
      case 'dropItem':
        this._handleDropItem(data as DropItemData);
        break;
      case 'requestHudSync':
        // Refresh HUD containers on demand (e.g., after closing crate UI)
        this.hotbar.syncUI(this.player);
        this.backpack.syncUI(this.player);
        break;
      case 'requestWeaponHud':
        // Re-send current weapon HUD info
        if (this._gun) {
          try {
            this._gun.updateAmmoIndicatorUI();
            (this._gun as WeaponEntity).updateFireRateIndicator();
          } catch {}
        } else {
          // ensure HUD hides weapon panel cleanly if there is truly no weapon
          this.player.ui.sendData({ type: 'ammo-indicator', show: false });
        }
        break;
    }
  }

  private _loadUI(): void {
    this.player.ui.load('ui/index.html');
    this.player.ui.on(PlayerUIEvent.DATA, this._onPlayerUIData);
    this.player.ui.lockPointer(true);
    this._syncAllUI();
  }

  private _sendMenuHud(): void {
    // Compute level/xp from persisted data progression
    try {
      const data = (this.player.getPersistedData?.() as any) || {};
      const prog = (data as any)?.progression || {};
      const level = Math.max(1, Math.floor(prog.level ?? 1));
      const xp = Math.max(0, Math.floor(prog.xp ?? 0));
      // mirror the curve used in ProgressionSystem
      const xpNext = 100 + 25 * Math.max(0, level - 1);
      const currency = Math.max(0, Math.floor((data as any)?.currency ?? 0));
      const username = this.player.username || this.player.id || 'Player';
      const sessionExtras = SessionManager.instance.getMenuHudExtras(this);
      this.player.ui.sendData({
        type: 'menu-hud',
        username,
        level,
        xp,
        xpNext,
        currency,
        ...sessionExtras,
      });
    } catch {}
  }

  private _sendWeaponProgress(): void {
    try {
      const rows = WeaponProgressionSystem.buildMenuRows(this.player);
      this.player.ui.sendData({ type: 'weapon-progress', rows });
    } catch {}
  }

  private _sendProgressOverview(): void {
    try {
      const data = (this.player.getPersistedData?.() as any) || {};
      const currency = Math.max(0, Math.floor((data as any)?.currency ?? 0));
      const stats = PlayerStatsSystem.get(this.player);
      const weapons = WeaponProgressionSystem.buildMenuRows(this.player);
      this.player.ui.sendData({ type: 'progress-overview', kills: stats.kills, deaths: stats.deaths, currency, weapons });
    } catch {}
  }

  private _loadProgressionUI(): void {
    try {
      this.player.ui.load('ui/progression.html');
      // Ensure only progression handler is active
      this.player.ui.off(PlayerUIEvent.DATA, this._onMenuUIData);
      this.player.ui.off(PlayerUIEvent.DATA, this._onPlayerUIData);
      this.player.ui.on(PlayerUIEvent.DATA, this._onProgressionUIData);
      this.player.ui.lockPointer(false);
      // Proactively send initial data to avoid race where client requests before handler attaches
      setTimeout(() => {
        try {
          if (this._isInMenu) {
            this._sendProgressOverview();
          }
        } catch {}
      }, 120);
    } catch {}
  }

  private _loadStashUI(): void {
    try {
      this.player.ui.load('ui/stash.html');
      // Ensure only stash handler is active
      this.player.ui.off(PlayerUIEvent.DATA, this._onMenuUIData);
      this.player.ui.off(PlayerUIEvent.DATA, this._onPlayerUIData);
      this.player.ui.off(PlayerUIEvent.DATA, this._onProgressionUIData);
      this.player.ui.on(PlayerUIEvent.DATA, this._onStashUIData);
      this.player.ui.lockPointer(false);
      // client will request data via requestStashSync on load
    } catch {}
  }

  private _onStashUIData = (event: EventPayloads[PlayerUIEvent.DATA]) => {
    const { data } = event;
    switch (data.type) {
      case 'requestStashSync':
        this._syncAllUI();
        break;
      case 'moveItem':
        this._handleMoveItem(data as MoveItemData);
        break;
      case 'quickMoveItem':
        this._handleQuickMoveItem(data as QuickMoveItemData);
        break;
      case 'backToMenu':
      case 'closeStash':
        this.loadMenu();
        break;
    }
  }

  private _onProgressionUIData = (event: EventPayloads[PlayerUIEvent.DATA]) => {
    const { data } = event;
    switch (data.type) {
      case 'requestProgressOverview':
        // Ignore if not in menu context
        if (!this._isInMenu) return;
        this._sendProgressOverview();
        break;
      case 'openProgression':
        if (!this._isInMenu) return;
        this._sendWeaponProgress();
        break;
      case 'backToMenu':
        // Only allow back to menu if we are currently in menu state
        if (!this._isInMenu) return;
        this.loadMenu();
        break;
    }
  }

  private _serialize(): PlayerPersistedData {
    try {
      const data = {
        backpack: this.backpack.serialize(),
        hotbar: this.hotbar.serialize(),
        stash: this.stash.serialize(),
        currency: this.getCurrency(),
      };

      if (!data.backpack || !data.hotbar || !data.stash) {
        console.error('Failed to serialize inventory data');
      }

      return data as PlayerPersistedData;
    } catch (error) {
      console.error('Failed to serialize GamePlayer data:', error);
      return {
        backpack: { items: [] },
        hotbar: { items: [] },
        stash: { items: [] },
        currency: this.getCurrency(),
      } as PlayerPersistedData;
    }
  }

  private _cleanupAllWeaponData(): void {
    const containers = [this.hotbar, this.backpack];
    
    for (const container of containers) {
      for (let i = 0; i < container.size; i++) {
        const item = container.getItemAt(i);
        if (item instanceof WeaponItem) {
          item.setPersistedAmmo(0);
        }
      }
    }
  }

  // ===== Event Handlers =====

  public onEntitySpawned(entity: GamePlayerEntity): void {
    this._currentEntity = entity;
    this._loadUI();
    this._hideAmmoIndicator();
    this._spawnHeldItem();
    this.hotbar.syncUI(this.player);
  }

  private _notifyCurrency(message: string): void {
    try {
      this.player.ui.sendData({ type: 'notification', message, color: '00FF00' });
    } catch {}
  }
} 