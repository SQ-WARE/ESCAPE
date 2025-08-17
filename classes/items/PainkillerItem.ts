import { Audio } from 'hytopia';
import BaseItem, { type ItemOverrides } from './BaseItem';
import GamePlayerEntity from '../GamePlayerEntity';

export interface PainkillerItemOptions extends ItemOverrides {
  damageReductionPercent?: number;
  durationMs?: number;
  audioUri?: string;
}

export default class PainkillerItem extends BaseItem {
  static override readonly id = 'painkiller';
  static override readonly name = 'Painkillers';
  static override readonly description = 'Reduces incoming damage temporarily';
  static override readonly iconImageUri = 'icons/painkiller.png';
  static override readonly dropModelUri = 'models/items/painkiller.glb';
  static override readonly heldModelUri = 'models/items/painkiller.glb';
  static override readonly stackable = true;
  static override readonly rarity = 'rare';

  public readonly damageReductionPercent: number;
  public readonly durationMs: number;
  
  private readonly _useAudio: Audio;
  private _isUsing: boolean = false;
  private _useStartTime: number = 0;
  private _useTimeout?: NodeJS.Timeout;
  private _effectTimeout?: NodeJS.Timeout;

  constructor(options: PainkillerItemOptions = {}) {
    super(options);

    this.damageReductionPercent = options.damageReductionPercent ?? 25; // 25% damage reduction
    this.durationMs = options.durationMs ?? 20000; // 20 seconds
    
    this._useAudio = new Audio({
      uri: options.audioUri ?? 'audio/sfx/sfx/pill-consume.mp3',
      loop: false,
      volume: 0.4,
    });
  }

  public use(player: GamePlayerEntity): boolean {
    if (this._isUsing) {
      return false; // Already using
    }

    // Check if painkillers have quantity
    if (this.quantity <= 0) {
      player.player.ui.sendData({
        type: 'notification',
        message: 'No painkillers remaining!',
        color: 'FF0000'
      });
      return false;
    }

    // Start using the painkillers
    this._isUsing = true;
    this._useStartTime = performance.now();

    // Play use sound
    if (player.world) {
      this._useAudio.play(player.world, true);
    }

    // Send UI data to show painkiller usage
    player.player.ui.sendData({
      type: 'painkiller-use',
      isUsing: true,
      useTimeMs: 1000, // 1 second use time
      progress: 0
    });

    // Set timeout to complete consumption
    this._useTimeout = setTimeout(() => {
      this._completeConsumption(player);
    }, 1000);

    return true;
  }

  public cancelUse(player: GamePlayerEntity): void {
    if (!this._isUsing) {
      return;
    }

    this._isUsing = false;
    
    if (this._useTimeout) {
      clearTimeout(this._useTimeout);
      this._useTimeout = undefined;
    }

    // Send UI data to hide painkiller usage
    player.player.ui.sendData({
      type: 'painkiller-use',
      isUsing: false,
      progress: 0
    });
  }

  private _completeConsumption(player: GamePlayerEntity): void {
    if (!this._isUsing) {
      return;
    }

    this._isUsing = false;
    this._useTimeout = undefined;

    // Apply damage reduction effect
    // Note: This would need to be implemented in the damage system
    // For now, we'll just show the effect is active
    player.player.ui.sendData({
      type: 'damage-reduction-active',
      durationMs: this.durationMs,
      reductionPercent: this.damageReductionPercent
    });

    // Consume the painkillers
    this.adjustQuantity(-1);
    
    // Remove from inventory if quantity reaches 0
    if (this.quantity <= 0) {
      const hotbar = player.gamePlayer.hotbar;
      const position = hotbar.getItemPosition(this);
      if (position !== null) {
        hotbar.removeItem(position);
        hotbar.syncUI(player.player);
      }
      
      const backpack = player.gamePlayer.backpack;
      const backpackPosition = backpack.getItemPosition(this);
      if (backpackPosition !== null) {
        backpack.removeItem(backpackPosition);
        backpack.syncUI(player.player);
      }
    }

    // Set timeout to remove damage reduction
    this._effectTimeout = setTimeout(() => {
      player.player.ui.sendData({
        type: 'notification',
        message: 'Painkiller effect has worn off!',
        color: 'FFAA00'
      });
    }, this.durationMs);

    // Send UI data to hide painkiller usage
    player.player.ui.sendData({
      type: 'painkiller-use',
      isUsing: false,
      progress: 100
    });

    player.player.ui.sendData({
      type: 'notification',
      message: `Damage reduction active for ${this.durationMs / 1000}s!`,
      color: '00FF00'
    });
  }

  public get isUsing(): boolean {
    return this._isUsing;
  }

  public get useProgress(): number {
    if (!this._isUsing) {
      return 0;
    }

    const elapsed = performance.now() - this._useStartTime;
    return Math.min(100, (elapsed / 1000) * 100); // 1 second use time
  }

  public update(player: GamePlayerEntity): void {
    // Update progress for UI
    if (this._isUsing) {
      const progress = this.useProgress;
      player.player.ui.sendData({
        type: 'painkiller-use',
        isUsing: true,
        useTimeMs: 1000,
        progress: progress
      });
    }
  }
}
