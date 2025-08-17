import { Audio } from 'hytopia';
import BaseItem, { type ItemOverrides } from './BaseItem';
import GamePlayerEntity from '../GamePlayerEntity';

export interface EnergyDrinkItemOptions extends ItemOverrides {
  speedBoostMultiplier?: number;
  durationMs?: number;
  audioUri?: string;
}

export default class EnergyDrinkItem extends BaseItem {
  static override readonly id = 'energy-drink';
  static override readonly name = 'Energy Drink';
  static override readonly description = 'Provides temporary speed boost and stamina regeneration';
  static override readonly iconImageUri = 'icons/energy-drink.png';
  static override readonly dropModelUri = 'models/items/energy-drink.glb';
  static override readonly heldModelUri = 'models/items/energy-drink.glb';
  static override readonly stackable = true;
  static override readonly rarity = 'unusual';

  public readonly speedBoostMultiplier: number;
  public readonly durationMs: number;
  
  private readonly _useAudio: Audio;
  private _isUsing: boolean = false;
  private _useStartTime: number = 0;
  private _useTimeout?: NodeJS.Timeout;
  private _effectTimeout?: NodeJS.Timeout;

  constructor(options: EnergyDrinkItemOptions = {}) {
    super(options);

    this.speedBoostMultiplier = options.speedBoostMultiplier ?? 1.3; // 30% speed boost
    this.durationMs = options.durationMs ?? 15000; // 15 seconds
    
    this._useAudio = new Audio({
      uri: options.audioUri ?? 'audio/sfx/sfx/drink-consume.mp3',
      loop: false,
      volume: 0.6,
    });
  }

  public use(player: GamePlayerEntity): boolean {
    if (this._isUsing) {
      return false; // Already using
    }

    // Check if energy drink has quantity
    if (this.quantity <= 0) {
      player.player.ui.sendData({
        type: 'notification',
        message: 'No energy drinks remaining!',
        color: 'FF0000'
      });
      return false;
    }

    // Start using the energy drink
    this._isUsing = true;
    this._useStartTime = performance.now();

    // Play use sound
    if (player.world) {
      this._useAudio.play(player.world, true);
    }

    // Send UI data to show energy drink usage
    player.player.ui.sendData({
      type: 'energy-drink-use',
      isUsing: true,
      useTimeMs: 2000, // 2 second use time
      progress: 0
    });

    // Set timeout to complete consumption
    this._useTimeout = setTimeout(() => {
      this._completeConsumption(player);
    }, 2000);

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

    // Send UI data to hide energy drink usage
    player.player.ui.sendData({
      type: 'energy-drink-use',
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

    // Apply speed boost
    const originalWalkVelocity = player.movementSystem.getBaseWalkVelocity();
    const originalRunVelocity = player.movementSystem.getBaseRunVelocity();
    
    player.movementSystem.setBaseWalkVelocity(originalWalkVelocity * this.speedBoostMultiplier);
    player.movementSystem.setBaseRunVelocity(originalRunVelocity * this.speedBoostMultiplier);

    // Consume the energy drink
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

    // Set timeout to remove speed boost
    this._effectTimeout = setTimeout(() => {
      player.movementSystem.setBaseWalkVelocity(originalWalkVelocity);
      player.movementSystem.setBaseRunVelocity(originalRunVelocity);
      
      player.player.ui.sendData({
        type: 'notification',
        message: 'Energy drink effect has worn off!',
        color: 'FFAA00'
      });
    }, this.durationMs);

    // Send UI data to hide energy drink usage
    player.player.ui.sendData({
      type: 'energy-drink-use',
      isUsing: false,
      progress: 100
    });

    // Send speed boost effect
    player.player.ui.sendData({
      type: 'speed-boost-active',
      durationMs: this.durationMs,
      multiplier: this.speedBoostMultiplier
    });

    player.player.ui.sendData({
      type: 'notification',
      message: `Speed boost active for ${this.durationMs / 1000}s!`,
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
    return Math.min(100, (elapsed / 2000) * 100); // 2 second use time
  }

  public update(player: GamePlayerEntity): void {
    // Update progress for UI
    if (this._isUsing) {
      const progress = this.useProgress;
      player.player.ui.sendData({
        type: 'energy-drink-use',
        isUsing: true,
        useTimeMs: 2000,
        progress: progress
      });
    }
  }
}
