import BaseItem, { type ItemOverrides } from './BaseItem';
import GamePlayerEntity from '../GamePlayerEntity';

export type ConsumableOverrides = {
  consumeAnimations?: string[];
  consumeCooldownMs?: number;
  consumeRequiresDamaged?: boolean;
  consumeTimeMs?: number;
  audioUri?: string;
} & ItemOverrides;

export default abstract class BaseConsumableItem extends BaseItem {
  // Required static properties that consumable subclasses MUST implement
  static readonly consumeCooldownMs: number;
  
  // Optional static properties with defaults
  static readonly consumeAnimations: string[] = ['consume-upper'];
  static readonly consumeRequiresDamaged: boolean = false;
  static readonly consumeTimeMs: number = 1000; // Default 1 second use time
  static readonly audioUri?: string = undefined;
  static readonly statsHeader: string = 'When consumed:';

  // Simple factory method
  static override create(overrides?: ConsumableOverrides): BaseConsumableItem {
    const ItemClass = this as any;
    return new ItemClass(overrides);
  }

  // Instance properties (delegate to static or use overrides)
  public get consumeAnimations(): string[] { 
    return this._consumeAnimations ?? (this.constructor as typeof BaseConsumableItem).consumeAnimations; 
  }
  public get consumeCooldownMs(): number { 
    return this._consumeCooldownMs ?? (this.constructor as typeof BaseConsumableItem).consumeCooldownMs; 
  }
  public get consumeRequiresDamaged(): boolean { 
    return this._consumeRequiresDamaged ?? (this.constructor as typeof BaseConsumableItem).consumeRequiresDamaged; 
  }
  public get consumeTimeMs(): number { 
    return this._consumeTimeMs ?? (this.constructor as typeof BaseConsumableItem).consumeTimeMs; 
  }
  public get audioUri(): string | undefined { 
    return this._audioUri ?? (this.constructor as typeof BaseConsumableItem).audioUri; 
  }

  // Instance-specific properties that can be overridden
  private readonly _consumeAnimations?: string[];
  private readonly _consumeCooldownMs?: number;
  private readonly _consumeRequiresDamaged?: boolean;
  private readonly _consumeTimeMs?: number;
  private readonly _audioUri?: string;
  private _lastConsumeTimeMs: number = 0;
  private _isUsing: boolean = false;
  private _useStartTime: number = 0;
  private _useTimeout?: NodeJS.Timeout;

  public constructor(overrides?: ConsumableOverrides) {
    super(overrides);
    
    this._consumeAnimations = overrides?.consumeAnimations;
    this._consumeCooldownMs = overrides?.consumeCooldownMs;
    this._consumeRequiresDamaged = overrides?.consumeRequiresDamaged;
    this._consumeTimeMs = overrides?.consumeTimeMs;
    this._audioUri = overrides?.audioUri;
  }

  public override clone(overrides?: ConsumableOverrides): BaseConsumableItem {
    const ConsumableClass = this.constructor as any;
    return new ConsumableClass({
      quantity: this.quantity,
      consumeAnimations: this._consumeAnimations,
      consumeCooldownMs: this._consumeCooldownMs,
      consumeRequiresDamaged: this._consumeRequiresDamaged,
      consumeTimeMs: this._consumeTimeMs,
      audioUri: this._audioUri,
      ...overrides,
    });
  }

  public consume(): void {
    if (!this.entity?.parent) return;

    const now = performance.now();

    if (now - this._lastConsumeTimeMs < this.consumeCooldownMs) {
      return;
    }
    
    const gamePlayerEntity = this.entity.parent as GamePlayerEntity;

    if (this.consumeRequiresDamaged && gamePlayerEntity.health >= gamePlayerEntity.maxHealth) {
      return;
    }

    // Check if item has quantity
    if (this.quantity <= 0) {
      gamePlayerEntity.player.ui.sendData({
        type: 'notification',
        message: 'No items remaining!',
        color: 'FF0000'
      });
      return;
    }

    // Start using the consumable
    this._isUsing = true;
    this._useStartTime = performance.now();

    // Play use sound if available
    if (this.audioUri && gamePlayerEntity.world) {
      const { Audio } = require('hytopia');
      const useAudio = new Audio({
        uri: this.audioUri,
        loop: false,
        volume: 0.7,
      });
      useAudio.play(gamePlayerEntity.world, true);
    }

    // Send UI data to show consumable usage
    gamePlayerEntity.player.ui.sendData({
      type: 'consumable-use',
      isUsing: true,
      useTimeMs: this.consumeTimeMs,
      progress: 0
    });

    // Set timeout to complete consumption
    this._useTimeout = setTimeout(() => {
      this._completeConsumption(gamePlayerEntity);
    }, this.consumeTimeMs);

    this._lastConsumeTimeMs = now;
    gamePlayerEntity.startModelOneshotAnimations(this.consumeAnimations);
  }

  public cancelUse(playerEntity: GamePlayerEntity): void {
    if (!this._isUsing) {
      return;
    }

    this._isUsing = false;
    
    if (this._useTimeout) {
      clearTimeout(this._useTimeout);
      this._useTimeout = undefined;
    }

    // Send UI data to hide consumable usage
    playerEntity.player.ui.sendData({
      type: 'consumable-use',
      isUsing: false,
      progress: 0
    });
  }

  private _completeConsumption(playerEntity: GamePlayerEntity): void {
    if (!this._isUsing) {
      return;
    }

    this._isUsing = false;
    this._useTimeout = undefined;

    // Apply the consumable effects
    this.applyEffects(playerEntity);

    // Consume the item
    this.adjustQuantity(-1);
    
    // Remove from inventory if quantity reaches 0
    if (this.quantity <= 0) {
      // Find and remove from hotbar
      const hotbar = playerEntity.gamePlayer.hotbar;
      const itemPosition = hotbar.getItemPosition(this);
      if (itemPosition !== null) {
        hotbar.removeItem(itemPosition);
        hotbar.syncUI(playerEntity.player);
      }
      
      // Also check backpack
      const backpack = playerEntity.gamePlayer.backpack;
      const backpackPosition = backpack.getItemPosition(this);
      if (backpackPosition !== null) {
        backpack.removeItem(backpackPosition);
        backpack.syncUI(playerEntity.player);
      }
    }

    // Send UI data to hide consumable usage
    playerEntity.player.ui.sendData({
      type: 'consumable-use',
      isUsing: false,
      progress: 100
    });
  }

  protected applyEffects(playerEntity: GamePlayerEntity): void {
    // Override in subclasses to apply specific effects (healing, buffs, etc.)
  }

  public get isUsing(): boolean {
    return this._isUsing;
  }

  public get useProgress(): number {
    if (!this._isUsing) {
      return 0;
    }

    const elapsed = performance.now() - this._useStartTime;
    return Math.min(100, (elapsed / this.consumeTimeMs) * 100);
  }

  public update(playerEntity: GamePlayerEntity): void {
    // Update progress for UI
    if (this._isUsing) {
      const progress = this.useProgress;
      playerEntity.player.ui.sendData({
        type: 'consumable-use',
        isUsing: true,
        useTimeMs: this.consumeTimeMs,
        progress: progress
      });
    }
  }

  public override useMouseLeft(): void {
    this.consume();
  }
}
