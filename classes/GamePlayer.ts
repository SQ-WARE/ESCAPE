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

import WeaponItem from './weapons/items/WeaponItem';

import PistolAmmoItem from './items/ammo/PistolAmmoItem';
import MedkitItem from './items/MedkitItem';

import WeaponEntity from './weapons/entities/WeaponEntity';
import { WeaponFactory } from './weapons/WeaponFactory';
import PlayerStatsSystem from './systems/PlayerStatsSystem';
import WeaponProgressionSystem from './systems/WeaponProgressionSystem';
import ProgressionSystem from './systems/ProgressionSystem';
import SessionManager from './systems/SessionManager';
import AchievementSystem from './systems/AchievementSystem';
import { MarketUIHandler } from './systems/MarketUIHandler';
import { ProgressionUIHandler } from './systems/ProgressionUIHandler';
import { InventoryUIHandler } from './systems/InventoryUIHandler';
import { WeaponUIHandler } from './systems/WeaponUIHandler';
import { CurrencyHandler } from './systems/CurrencyHandler';
import { PersistenceHandler } from './systems/PersistenceHandler';

// Note: Items are now automatically registered through the ItemFactory system

interface PlayerPersistedData extends Record<string, unknown> {
  backpack: SerializedItemInventoryData;
  hotbar: SerializedItemInventoryData;
  stash: Record<string, number>;
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
  private _isInMenu: boolean = true;
  private _isDestroyed: boolean = false;
  private _isCrateOpen: boolean = false;
  private _isDeploying: boolean = false;
  private _pendingDeploy: boolean = false;
  private _partySystemLoaded: boolean = false;
  private _cachedPartySystem: any = null;
  
  // UI Handlers
  private _marketUIHandler: MarketUIHandler;
  private _progressionUIHandler: ProgressionUIHandler;
  private _inventoryUIHandler: InventoryUIHandler;
  private _weaponUIHandler: WeaponUIHandler;
  private _currencyHandler: CurrencyHandler;
  private _persistenceHandler: PersistenceHandler;

  private constructor(player: Player) {
    this.player = player;
    this.backpack = new Backpack(this);
    this.hotbar = new Hotbar(this);
    this.stash = new Stash(player, this);

    // Initialize UI handlers
    this._marketUIHandler = new MarketUIHandler(this);
    this._progressionUIHandler = new ProgressionUIHandler(this);
    this._inventoryUIHandler = new InventoryUIHandler(this);
    this._weaponUIHandler = new WeaponUIHandler(this);
    this._currencyHandler = new CurrencyHandler(this);
    this._persistenceHandler = new PersistenceHandler(this);

    this.hotbar.onSelectedItemChanged = this._onHotbarSelectedItemChanged;
    
    // Initialize achievements for new players
    try {
      AchievementSystem.initialize(this.player);
    } catch {}
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

  // Handler getters
  public get currency() {
    return this._currencyHandler;
  }

  public get weapon() {
    return this._weaponUIHandler;
  }

  public getCurrentWeapon(): WeaponEntity | undefined {
    return this._weaponUIHandler.currentWeapon;
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
    
    // Cleanup UI handlers
    this._marketUIHandler.unload();
    this._progressionUIHandler.unload();
    this._persistenceHandler.destroy();
    
    this._weaponUIHandler.cleanupWeaponData();
    
    if (this._currentEntity) {
      this._currentEntity.despawn();
      this._currentEntity = undefined;
    }
    
    this.player.ui.off(PlayerUIEvent.DATA, this._onPlayerUIData);
    this.player.ui.off(PlayerUIEvent.DATA, this._onMenuUIData);
  }

  public load(): void {
    this._persistenceHandler.load();
  }

  public save(): void {
    this._persistenceHandler.save();
  }

  public loadMenu(): void {
    this._isInMenu = true;
    this.player.ui.load('ui/menu.html');
    // Ensure only menu handler is active

    this.player.ui.off(PlayerUIEvent.DATA, this._onPlayerUIData);
    this.player.ui.on(PlayerUIEvent.DATA, this._onMenuUIData);
    this.player.ui.lockPointer(false);
    
    this._syncAllUI();
    
    this._weaponUIHandler.updateAmmoIndicator();
    
    // Lazy load party system only when needed
    this._ensurePartyExists();
    
    this.player.ui.sendData({ type: 'enterMenu' });
  }

  private _ensurePartyExists(): void {
    // Only load PartySystem when actually needed for party operations
    if (!this._partySystemLoaded) {
      try {
        const { PartySystem } = require('./systems/PartySystem');
        const partyData = PartySystem.instance.getPartyData(this.player.id);
        if (!partyData) {
          PartySystem.instance.createParty(this.player);
        }
        this._partySystemLoaded = true;
      } catch (error) {
        // Error creating party
      }
    }
  }

  private _handlePartyDeployment(): void {
    // Only load PartySystem when actually needed for deployment
    if (!this._partySystemLoaded) {
      this._ensurePartyExists();
    }
    
    try {
      const { PartySystem } = require('./systems/PartySystem');
      const partyData = PartySystem.instance.getPartyData(this.player.id);
      
      if (partyData && partyData.members.length > 1) {
        const playerMember = partyData.members.find((member: any) => member.playerId === this.player.id);
        if (playerMember && playerMember.isHost) {
          // Player is party host, deploy entire party
          const success = PartySystem.instance.initiateDeploy(this.player);
          if (success) {
            this._isDeploying = false;
            return; // Party deployment handled by PartySystem
          } else {
            // Party deployment failed
          }
        } else if (partyData) {
          // Player is in party but not host, show message
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
      }
    } catch (error) {
      // Error checking party status
    }
  }

  private async _getPartySystem(): Promise<any> {
    // Cache the PartySystem import to avoid repeated dynamic imports
    if (!this._cachedPartySystem) {
      const { PartySystem } = await import('./systems/PartySystem');
      this._cachedPartySystem = PartySystem;
    }
    return this._cachedPartySystem;
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

    // Check if player is in a party and handle deployment accordingly (lazy load)
    this._handlePartyDeployment();

    // Solo deployment
    this._deploySolo();
  }

  /**
   * Deploys a party member (bypasses party checks)
   */
  public deployPartyMember(): void {
    this._deploySolo();
  }

  private _deploySolo(): void {
    this._isInMenu = false;
    

    
    // Track raid statistics
    try {
      const data = (this.player.getPersistedData?.() as any) || {};
      const currentRaids = Math.floor((data as any)?.raids ?? 0);
      
      // Update raid count and start time
      this.player.setPersistedData({
        ...data,
        raids: currentRaids + 1,
        raidStartTime: Date.now()
      });
      
      // Check exploration achievements
      const playtime = Math.floor((data as any)?.playtime ?? 0);
      AchievementSystem.checkExplorationAchievements(this.player, currentRaids + 1, playtime);
    } catch {}
    
    // Remove from menu players tracking
    try {
      SessionManager.instance.removeMenuPlayer(this);
    } catch {}
    // Ensure menu-related listeners are detached so UI events cannot bring the user back to menu while in-game
    try {
      this.player.ui.off(PlayerUIEvent.DATA, this._onMenuUIData);
  
  
    } catch {}
    const playerEntity = new GamePlayerEntity(this);
    if (!this.player.world) {
      this._isDeploying = false;
      return;
    }
    playerEntity.spawn(this.player.world, { x: 0, y: 30, z: 0 });
    
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
    
    // Check current stats against achievements immediately when deploying
    try {
      const data = (this.player.getPersistedData?.() as any) || {};
      const kills = Math.floor((data as any)?.kills ?? 0);
      const deaths = Math.floor((data as any)?.deaths ?? 0);
      const accuracy = Math.floor((data as any)?.accuracy ?? 0);
      const progression = ProgressionSystem.get(this.player);
      const level = progression.level;
      const currency = Math.floor((data as any)?.currency ?? 0);
      const extractions = Math.floor((data as any)?.extractions ?? 0);
      const raids = Math.floor((data as any)?.raids ?? 0);
      const playtime = Math.floor((data as any)?.playtime ?? 0);
      const headshots = Math.floor((data as any)?.headshots ?? 0);
      const currentKillStreak = Math.floor((data as any)?.currentKillStreak ?? 0);
      const weaponKills = (data as any)?.weaponKills || {};
      
      // Use comprehensive achievement check to prevent duplicates
      AchievementSystem.checkAllAchievements(this.player, {
        kills,
        deaths,
        accuracy,
        level,
        currency,
        extractions,
        raids,
        playtime,
        headshots,
        currentKillStreak,
        weaponKills
      });
    } catch {}
    
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
    // Track extraction statistics
    try {
      const data = (this.player.getPersistedData?.() as any) || {};
      const currentExtractions = Math.floor((data as any)?.extractions ?? 0);
      const currentRaids = Math.floor((data as any)?.raids ?? 0);
      const raidStartTime = (data as any)?.raidStartTime ?? Date.now();
      
      // Calculate raid time in seconds
      const raidTime = Math.floor((Date.now() - raidStartTime) / 1000);
      
      // Update extraction count and timestamp
      this.player.setPersistedData({
        ...data,
        extractions: currentExtractions + 1,
        lastExtractionTime: Date.now()
      });
      
      // Check achievements with comprehensive method to prevent duplicates
      AchievementSystem.checkAllAchievements(this.player, {
        extractions: currentExtractions + 1,
        raids: currentRaids,
        raidTime
      });
    } catch {}
    // Persist current weapon ammo to the corresponding inventory item, if any
    try {
      const currentGun = this._weaponUIHandler.currentWeapon;
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
    this._weaponUIHandler.unequipAndDespawn();

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
    
    if ('weaponData' in droppedItem && this._weaponUIHandler.currentWeapon) {
      this._weaponUIHandler.saveWeaponAmmoData(droppedItem as any, this._weaponUIHandler.currentWeapon);
      this._weaponUIHandler.unequipAndDespawn();
    }
    
    const removedItem = container.removeItem(fromIndex);
    if (!removedItem) return;
    
    removedItem.spawnEntityAsEjectedDrop(
      this._currentEntity.world, 
      this._currentEntity.position, 
      this._currentEntity.directionFromRotation
    );
    
    this._weaponUIHandler.updateAmmoIndicator();
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
    return this._persistenceHandler.serialize();
  }

  // ===== Private Methods =====





  private _getContainerByType(type: string): ItemInventory | null {
    switch (type) {
      case 'backpack': return this.backpack;
      case 'hotbar': return this.hotbar;
      case 'stash': return this.stash;
      default: return null;
    }
  }





  private _onHotbarSelectedItemChanged = (
    selectedItem: BaseItem | null, 
    lastItem: BaseItem | null
  ) => {
    this._weaponUIHandler.handleHotbarSelectionChanged(
      selectedItem && 'weaponData' in selectedItem ? selectedItem as any : null,
      lastItem && 'weaponData' in lastItem ? lastItem as any : null
    );
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
      
      this._weaponUIHandler.updateAmmoIndicator();
    } else {
      this._isBackpackOpen = false;
      this.player.ui.sendData({ type: `hide${type.charAt(0).toUpperCase() + type.slice(1)}` });
    }
    
    this._inventoryTransitioning = false;
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
        // Prevent opening other menus unless currently in menu
        if (!this._isInMenu) return;
        this.openStash();
        break;
      case 'openCareer':
        // Prevent opening other menus unless currently in menu
        if (!this._isInMenu) return;
        this._progressionUIHandler.load();
        break;
      case 'openMarket':
        // Prevent opening other menus unless currently in menu
        if (!this._isInMenu) return;
        this._marketUIHandler.load();
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
        this._progressionUIHandler.sendProgressOverview();
        break;

      case 'closeInventory':
        this.closeInventory();
        break;
      case 'closeStash':
        this.closeStash();
        break;
      case 'moveItem':
        this._inventoryUIHandler.handleMoveItem(data as MoveItemData);
        break;
      case 'quickMoveItem':
        this._inventoryUIHandler.handleQuickMoveItem(data as QuickMoveItemData);
        break;
      case 'dropItem':
        this._inventoryUIHandler.handleDropItem(data as DropItemData);
        break;
      case 'close':
        this.player.ui.off(PlayerUIEvent.DATA, this._onMenuUIData);
        break;
      // Party system events
      case 'send-party-invite':
        if (typeof data.username === 'string') {
          try {
            const PartySystem = await this._getPartySystem();
            PartySystem.instance.sendInvite(this.player, data.username);
          } catch (error) {
            console.error('Failed to send party invite:', error);
          }
        }
        break;
      case 'accept-party-invite':
        if (typeof data.inviteId === 'string') {
          try {
            const PartySystem = await this._getPartySystem();
            PartySystem.instance.acceptInvite(this.player, data.inviteId);
          } catch (error) {
            // Failed to accept party invite
          }
        }
        break;
      case 'decline-party-invite':
        if (typeof data.inviteId === 'string') {
          try {
            const PartySystem = await this._getPartySystem();
            PartySystem.instance.declineInvite(this.player, data.inviteId);
          } catch (error) {
            // Failed to decline party invite
          }
        }
        break;
      case 'leave-party':
        try {
          const PartySystem = await this._getPartySystem();
          PartySystem.instance.leaveParty(this.player);
        } catch (error) {
          // Failed to leave party
        }
        break;
      case 'kick-player':
        if (typeof data.username === 'string') {
          try {
            const PartySystem = await this._getPartySystem();
            const success = PartySystem.instance.kickPlayer(this.player, data.username);
            if (!success) {
              this.player.ui.sendData({
                type: 'show-message',
                message: 'Failed to kick player. Make sure you are the party host.',
                messageType: 'error'
              });
            }
          } catch (error) {
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
        this._inventoryUIHandler.handleMoveItem(data as MoveItemData);
        break;
      case 'quickMoveItem':
        this._inventoryUIHandler.handleQuickMoveItem(data as QuickMoveItemData);
        break;
      case 'dropItem':
        this._inventoryUIHandler.handleDropItem(data as DropItemData);
        break;
      case 'requestHudSync':
        // Refresh HUD containers on demand (e.g., after closing crate UI)
        this.hotbar.syncUI(this.player);
        this.backpack.syncUI(this.player);
        break;
      case 'requestWeaponHud':
        // Re-send current weapon HUD info
        this._weaponUIHandler.updateAmmoIndicator();
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
      const currency = Math.max(0, Math.floor(this.currency.getCurrency()));
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





  private _generateActivityFeed(data: any): Array<{icon: string, text: string, time: string}> {
    const activities = [];
    const now = Date.now();
    
    // Add recent achievements
    const recentAchievements = (data as any)?.recentAchievements || [];
    recentAchievements.slice(0, 2).forEach((achievement: any) => {
      activities.push({
        icon: '🏆',
        text: `Achievement: ${achievement.title}`,
        time: this._formatTimeAgo(achievement.unlockedAt)
      });
    });
    
    // Add recent extractions
    const lastExtraction = (data as any)?.lastExtractionTime;
    if (lastExtraction && (now - lastExtraction) < 24 * 60 * 60 * 1000) { // Within 24 hours
      activities.push({
        icon: '✅',
        text: 'Successful Extraction',
        time: this._formatTimeAgo(lastExtraction)
      });
    }
    
    // Add recent level ups
    const lastLevelUp = (data as any)?.lastLevelUpTime;
    if (lastLevelUp && (now - lastLevelUp) < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
      activities.push({
        icon: '⭐',
        text: 'Level Up Achieved',
        time: this._formatTimeAgo(lastLevelUp)
      });
    }
    
    // Add recent kills
    const lastKill = (data as any)?.lastKillTime;
    if (lastKill && (now - lastKill) < 60 * 60 * 1000) { // Within 1 hour
      activities.push({
        icon: '🎯',
        text: 'Enemy Eliminated',
        time: this._formatTimeAgo(lastKill)
      });
    }
    
    // Add weapon mastery progress
    const recentWeaponProgress = (data as any)?.recentWeaponProgress || [];
    recentWeaponProgress.slice(0, 1).forEach((progress: any) => {
      activities.push({
        icon: '🔫',
        text: `${progress.weaponName} Mastery Progress`,
        time: this._formatTimeAgo(progress.timestamp)
      });
    });
    
    // Sort by time (most recent first) and limit to 4 items
    return activities
      .sort((a, b) => this._parseTimeAgo(b.time) - this._parseTimeAgo(a.time))
      .slice(0, 4);
  }

  private _formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  private _parseTimeAgo(timeStr: string): number {
    if (timeStr === 'Just now') return 0;
    if (timeStr.includes('m ago')) return parseInt(timeStr) * 60 * 1000;
    if (timeStr.includes('h ago')) return parseInt(timeStr) * 60 * 60 * 1000;
    if (timeStr.includes('d ago')) return parseInt(timeStr) * 24 * 60 * 60 * 1000;
    return 0;
  }





  private _loadStashUI(): void {
    try {
      this.player.ui.load('ui/stash.html');
      // Ensure only stash handler is active
      this.player.ui.off(PlayerUIEvent.DATA, this._onMenuUIData);
      this.player.ui.off(PlayerUIEvent.DATA, this._onPlayerUIData);
  
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
        this._inventoryUIHandler.handleMoveItem(data as MoveItemData);
        break;
      case 'quickMoveItem':
        this._inventoryUIHandler.handleQuickMoveItem(data as QuickMoveItemData);
        break;
      case 'backToMenu':
      case 'closeStash':
        this.loadMenu();
        break;
    }
  }





  // ===== Event Handlers =====

  public onEntitySpawned(entity: GamePlayerEntity): void {
    this._currentEntity = entity;
    this._loadUI();
    this._weaponUIHandler.hideAmmoIndicator();
    this._weaponUIHandler.spawnHeldItem();
    this.hotbar.syncUI(this.player);
  }


} 