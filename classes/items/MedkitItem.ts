import { Audio } from 'hytopia';
import BaseItem, { type ItemOverrides } from './BaseItem';
import GamePlayerEntity from '../GamePlayerEntity';

export interface MedkitItemOptions extends ItemOverrides {
  healAmount?: number;
  useTimeMs?: number;
  audioUri?: string;
}

export default class MedkitItem extends BaseItem {
  static override readonly id = 'medkit';
  static override readonly name = 'Medkit';
  static override readonly description = 'A medical kit that heals wounds';
  static override readonly iconImageUri = 'icons/medkit.png';
  static override readonly dropModelUri = 'models/items/medkit.glb';
  static override readonly heldModelUri = 'models/items/medkit.glb';
  static override readonly stackable = true;

  public readonly healAmount: number;
  public readonly useTimeMs: number;
  
  private readonly _useAudio: Audio;
  private _isUsing: boolean = false;
  private _useStartTime: number = 0;
  private _useTimeout?: NodeJS.Timeout;

  constructor(options: MedkitItemOptions = {}) {
    super(options);

    this.healAmount = options.healAmount ?? 60; // Simplified healing amount
    this.useTimeMs = options.useTimeMs ?? 3000; // 3 seconds
    
    this._useAudio = new Audio({
      uri: options.audioUri ?? 'audio/sfx/sfx/medpack-consume.mp3',
      loop: false,
      volume: 0.7,
    });
  }

  public use(player: GamePlayerEntity): boolean {
    if (this._isUsing) {
      return false; // Already using
    }

    if (player.health >= player.maxHealth) {
      // Player is already at full health
      player.player.ui.sendData({
        type: 'notification',
        message: 'Already at full health!',
        color: 'FF0000'
      });
      return false;
    }

    // Check if medkit has quantity
    if (this.quantity <= 0) {
      player.player.ui.sendData({
        type: 'notification',
        message: 'No medkits remaining!',
        color: 'FF0000'
      });
      return false;
    }

    // Start using the medkit
    this._isUsing = true;
    this._useStartTime = performance.now();

    // Pause auto-healing to prevent conflicts
    player.healthSystem.pauseAutoHealing();

    // Slow player movement while healing
    player.movementSystem.setHealingState(true);

    // Play use sound
    if (player.world) {
      this._useAudio.play(player.world, true);
    }

    // Send UI data to show medkit usage
    player.player.ui.sendData({
      type: 'medkit-use',
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
    
    // Resume auto-healing
    player.healthSystem.resumeAutoHealing();
    
    // Restore normal movement speed
    player.movementSystem.setHealingState(false);
    
    if (this._useTimeout) {
      clearTimeout(this._useTimeout);
      this._useTimeout = undefined;
    }

    // Send UI data to hide medkit usage
    player.player.ui.sendData({
      type: 'medkit-use',
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

    // Resume auto-healing
    player.healthSystem.resumeAutoHealing();

    // Restore normal movement speed
    player.movementSystem.setHealingState(false);

    // Calculate actual heal amount (don't overheal)
    const actualHealAmount = Math.min(this.healAmount, player.maxHealth - player.health);
    
    // Apply healing through HealthSystem
    player.healthSystem.heal(actualHealAmount);

    // Activate healing bonus
    player.healthSystem.activateHealingBonus();

    // Consume the medkit
    this.adjustQuantity(-1);
    
    // Remove from inventory if quantity reaches 0
    if (this.quantity <= 0) {
      // Find and remove from hotbar
      const hotbar = player.gamePlayer.hotbar;
      const medkitPosition = hotbar.getItemPosition(this);
      if (medkitPosition !== null) {
        hotbar.removeItem(medkitPosition);
        hotbar.syncUI(player.player);
      }
      
      // Also check backpack
      const backpack = player.gamePlayer.backpack;
      const backpackPosition = backpack.getItemPosition(this);
      if (backpackPosition !== null) {
        backpack.removeItem(backpackPosition);
        backpack.syncUI(player.player);
      }
    }

    // Send UI data to hide medkit usage and show heal effect
    player.player.ui.sendData({
      type: 'medkit-use',
      isUsing: false,
      progress: 100
    });

    // Send healing completion effect
    player.player.ui.sendData({
      type: 'healing-complete',
      healAmount: actualHealAmount
    });

    player.player.ui.sendData({
      type: 'notification',
      message: `Healed ${actualHealAmount} health! + Enhanced regeneration!`,
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
        type: 'medkit-use',
        isUsing: true,
        useTimeMs: this.useTimeMs,
        progress: progress
      });
    }
  }
} 