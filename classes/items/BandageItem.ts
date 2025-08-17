import { Audio } from 'hytopia';
import BaseItem, { type ItemOverrides } from './BaseItem';
import GamePlayerEntity from '../GamePlayerEntity';

export interface BandageItemOptions extends ItemOverrides {
  healAmount?: number;
  useTimeMs?: number;
  audioUri?: string;
}

export default class BandageItem extends BaseItem {
  static override readonly id = 'bandage';
  static override readonly name = 'Bandage';
  static override readonly description = 'Quick healing for minor wounds';
  static override readonly iconImageUri = 'icons/bandage.png';
  static override readonly dropModelUri = 'models/items/bandage.glb';
  static override readonly heldModelUri = 'models/items/bandage.glb';
  static override readonly stackable = true;
  static override readonly rarity = 'common';

  public readonly healAmount: number;
  public readonly useTimeMs: number;
  
  private readonly _useAudio: Audio;
  private _isUsing: boolean = false;
  private _useStartTime: number = 0;
  private _useTimeout?: NodeJS.Timeout;

  constructor(options: BandageItemOptions = {}) {
    super(options);

    this.healAmount = options.healAmount ?? 25; // Quick but limited healing
    this.useTimeMs = options.useTimeMs ?? 1500; // 1.5 seconds
    
    this._useAudio = new Audio({
      uri: options.audioUri ?? 'audio/sfx/sfx/bandage-apply.mp3',
      loop: false,
      volume: 0.5,
    });
  }

  public use(player: GamePlayerEntity): boolean {
    if (this._isUsing) {
      return false; // Already using
    }

    if (player.health >= player.maxHealth) {
      player.player.ui.sendData({
        type: 'notification',
        message: 'Already at full health!',
        color: 'FF0000'
      });
      return false;
    }

    // Check if bandage has quantity
    if (this.quantity <= 0) {
      player.player.ui.sendData({
        type: 'notification',
        message: 'No bandages remaining!',
        color: 'FF0000'
      });
      return false;
    }

    // Start using the bandage
    this._isUsing = true;
    this._useStartTime = performance.now();

    // Play use sound
    if (player.world) {
      this._useAudio.play(player.world, true);
    }

    // Send UI data to show bandage usage
    player.player.ui.sendData({
      type: 'bandage-use',
      isUsing: true,
      useTimeMs: this.useTimeMs,
      progress: 0
    });

    // Set timeout to complete healing
    this._useTimeout = setTimeout(() => {
      this._completeHealing(player);
    }, this.useTimeMs);

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

    // Send UI data to hide bandage usage
    player.player.ui.sendData({
      type: 'bandage-use',
      isUsing: false,
      progress: 0
    });
  }

  private _completeHealing(player: GamePlayerEntity): void {
    if (!this._isUsing) {
      return;
    }

    this._isUsing = false;
    this._useTimeout = undefined;

    // Calculate actual heal amount (don't overheal)
    const actualHealAmount = Math.min(this.healAmount, player.maxHealth - player.health);
    
    // Apply healing through HealthSystem
    player.healthSystem.heal(actualHealAmount);

    // Consume the bandage
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

    // Send UI data to hide bandage usage
    player.player.ui.sendData({
      type: 'bandage-use',
      isUsing: false,
      progress: 100
    });

    player.player.ui.sendData({
      type: 'notification',
      message: `Healed ${actualHealAmount} health!`,
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
    return Math.min(100, (elapsed / this.useTimeMs) * 100);
  }

  public update(player: GamePlayerEntity): void {
    // Update progress for UI
    if (this._isUsing) {
      const progress = this.useProgress;
      player.player.ui.sendData({
        type: 'bandage-use',
        isUsing: true,
        useTimeMs: this.useTimeMs,
        progress: progress
      });
    }
  }
}
