import { Player, PlayerUIEvent, type EventPayloads } from 'hytopia';
import type GamePlayer from '../GamePlayer';
import type ItemInventory from './ItemInventory';

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

export class InventoryUIHandler {
  private gamePlayer: GamePlayer;
  private player: Player;
  
  // Rate limiting for inventory operations
  private inventoryActionCooldowns: Map<string, number> = new Map();
  private readonly INVENTORY_COOLDOWN_MS = 100;

  constructor(gamePlayer: GamePlayer) {
    this.gamePlayer = gamePlayer;
    this.player = gamePlayer.player;
  }

  public handleMoveItem(data: MoveItemData): void {
    // Rate limiting check
    if (!this.checkRateLimit('moveItem')) {
      return;
    }

    // Validate request data
    if (!this.validateMoveRequest(data)) {
      return;
    }

    const fromType = data.from || data.fromType;
    const toType = data.to || data.toType;
    const fromIndex = parseInt(data.fromIndex.toString());
    const toIndex = parseInt(data.toIndex.toString());

    // Type guard to ensure fromType and toType are defined
    if (!fromType || !toType) {
      return;
    }

    // Server-side guard: stash moves are only valid when in menu context
    if ((fromType === 'stash' || toType === 'stash') && !this.validateStashAccess()) {
      return;
    }

    const source = this.getContainerByType(fromType);
    const dest = this.getContainerByType(toType);

    if (!source || !dest) {
      return;
    }

    this.moveInventoryItem(source, dest, fromIndex, toIndex);
  }

  public handleQuickMoveItem(data: QuickMoveItemData): void {
    const fromType = data.fromType;
    const fromIndex = parseInt(data.fromIndex.toString());

    const source = this.getContainerByType(fromType);
    if (!source) {
      return;
    }

    const item = source.getItemAt(fromIndex);
    if (!item) return;

    const allCandidates = this.getQuickMoveTargets(fromType);
    // Enforce stash access only in menu context
    const candidates = this.gamePlayer.isInMenu ? allCandidates : allCandidates.filter(t => t !== 'stash');
    const removed = source.removeItem(fromIndex);
    if (!removed) return;

    let placed = false;
    for (const destType of candidates) {
      const dest = this.getContainerByType(destType);
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

    const currentWeapon = this.gamePlayer.getCurrentWeapon();
    if (currentWeapon) {
      try { currentWeapon.updateAmmoIndicatorUI(); } catch {}
    }
    this.gamePlayer.save();
  }

  public handleDropItem(data: DropItemData): void {
    const fromIndex = parseInt(data.fromIndex.toString());
    this.gamePlayer.dropItem(data.fromType, fromIndex);
  }

  private getContainerByType(type: string): ItemInventory | null {
    switch (type) {
      case 'backpack': return this.gamePlayer.backpack;
      case 'hotbar': return this.gamePlayer.hotbar;
      case 'stash': return this.gamePlayer.stash;
      default: return null;
    }
  }

  private getQuickMoveTargets(fromType: string): string[] {
    // In-game inventory has only backpack/hotbar; stash UI runs in menu context
    if (fromType === 'backpack') {
      return this.gamePlayer.isInMenu ? ['stash', 'hotbar'] : ['hotbar'];
    }
    if (fromType === 'hotbar') {
      return this.gamePlayer.isInMenu ? ['stash', 'backpack'] : ['backpack'];
    }
    if (fromType === 'stash') {
      return ['backpack', 'hotbar'];
    }
    return [];
  }

  // Rate limiting check
  private checkRateLimit(action: string): boolean {
    const now = Date.now();
    const lastAction = this.inventoryActionCooldowns.get(action) || 0;
    
    if (now - lastAction < this.INVENTORY_COOLDOWN_MS) {
      return false;
    }
    
    this.inventoryActionCooldowns.set(action, now);
    return true;
  }

  // Validate move request data
  private validateMoveRequest(data: MoveItemData): boolean {
    const validContainers = ['backpack', 'hotbar', 'stash'];
    const fromType = data.from || data.fromType;
    const toType = data.to || data.toType;
    
    if (!fromType || !toType || !validContainers.includes(fromType) || !validContainers.includes(toType)) {
      return false;
    }
    
    const source = this.getContainerByType(fromType);
    const dest = this.getContainerByType(toType);
    if (!source || !dest) return false;
    
    const fromIndex = parseInt(data.fromIndex.toString());
    const toIndex = parseInt(data.toIndex.toString());
    
    if (isNaN(fromIndex) || fromIndex < 0 || fromIndex >= source.size) return false;
    if (isNaN(toIndex) || toIndex < 0 || toIndex >= dest.size) return false;
    
    const item = source.getItemAt(fromIndex);
    if (!item) return false;
    
    return true;
  }

  // Validate stash access
  private validateStashAccess(): boolean {
    if (!this.gamePlayer.isInMenu) return false;
    
    const currentEntity = this.gamePlayer.currentEntity;
    if (currentEntity && !currentEntity.isDead) {
      return false;
    }
    
    return true;
  }

  private moveInventoryItem(
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

    const currentWeapon = this.gamePlayer.getCurrentWeapon();
    if (currentWeapon) {
      try { currentWeapon.updateAmmoIndicatorUI(); } catch {}
    }
    this.gamePlayer.save();
  }
}
